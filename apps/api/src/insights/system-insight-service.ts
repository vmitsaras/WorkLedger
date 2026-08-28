import {
  systemInsightNativeResultSchema,
  systemInsightRequestSchema,
  type SystemInsightNativeResult,
  type SystemInsightRequest,
} from '@workledger/contracts/insights';
import { localDateAtInstant, parseTimeZoneId, type Instant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import { AUTH_SECURITY_PROFILE } from '../auth/authentication.js';
import { authorizeInstallationAction } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { WORKLEDGER_VERSION } from '../version.js';
import type { InsightIdentity } from './insight-service.js';

const SECONDS_PER_MINUTE = 60;

export interface SystemInsightService {
  run(
    identity: InsightIdentity,
    request: SystemInsightRequest,
    capturedAt: Instant,
  ): Promise<SystemInsightNativeResult>;
}

export function createSystemInsightService(
  database: WorkLedgerDatabase,
  mailDeliveryConfigured: boolean,
): SystemInsightService {
  return Object.freeze({
    async run(identity: InsightIdentity, requestInput: SystemInsightRequest, capturedAt: Instant) {
      const request = parseRequest(requestInput);
      await database.transaction(
        async (transaction) => {
          const context = await transaction.accountSelfService.findContext(
            identity.accountId,
            capturedAt,
          );
          if (context === null || !context.accountActive) throw expired();
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw unavailable();
          const actor = await transaction.authorization.findActor(
            context.organization.id,
            context.accountId,
            localDateAtInstant(capturedAt, timeZone.value),
          );
          if (
            actor === null ||
            !authorizeInstallationAction('TECHNICAL_OPERATIONS_MANAGE', actor).allowed
          ) {
            throw denied();
          }
        },
        { isolationLevel: 'repeatable read' },
      );

      const databaseReady = await database.isReady().catch(() => false);
      const sourceCodes = [
        'APPLICATION_MANIFEST',
        'DATABASE_READINESS',
        'HOST_OPERATOR_PROCEDURES',
        'MAIL_ADAPTER_CONFIGURATION',
        'AUTHENTICATION_SECURITY_PROFILE',
      ] as const;
      const result = systemInsightNativeResultSchema.safeParse({
        actions: [
          {
            code: 'OPEN_SYSTEM_OPERATIONS',
            destination: 'SYSTEM_OPERATIONS',
            sourceCodes,
          },
        ],
        facts: [
          {
            code: 'APPLICATION_VERSION',
            source: 'APPLICATION_MANIFEST',
            value: WORKLEDGER_VERSION,
          },
          {
            code: 'SERVICE_HEALTH',
            source: 'DATABASE_READINESS',
            value: databaseReady ? 'HEALTHY' : 'CRITICAL',
          },
          {
            code: 'DATABASE_HEALTH',
            source: 'DATABASE_READINESS',
            value: databaseReady ? 'HEALTHY' : 'UNAVAILABLE',
          },
          {
            code: 'EXPECTED_SCHEMA_STATUS',
            source: 'DATABASE_READINESS',
            value: databaseReady ? 'READY' : 'NOT_READY',
          },
          {
            code: 'BACKUP_MANAGEMENT',
            source: 'HOST_OPERATOR_PROCEDURES',
            value: 'HOST_OPERATOR_MANAGED',
          },
          {
            code: 'MAIL_DELIVERY_CONFIGURATION',
            source: 'MAIL_ADAPTER_CONFIGURATION',
            value: mailDeliveryConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
          },
          {
            code: 'SESSION_IDLE_TIMEOUT_MINUTES',
            source: 'AUTHENTICATION_SECURITY_PROFILE',
            value: AUTH_SECURITY_PROFILE.idleSessionSeconds / SECONDS_PER_MINUTE,
          },
          {
            code: 'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
            source: 'AUTHENTICATION_SECURITY_PROFILE',
            value: AUTH_SECURITY_PROFILE.absoluteSessionSeconds / SECONDS_PER_MINUTE,
          },
          {
            code: 'SESSION_FRESH_WINDOW_MINUTES',
            source: 'AUTHENTICATION_SECURITY_PROFILE',
            value: AUTH_SECURITY_PROFILE.freshSessionSeconds / SECONDS_PER_MINUTE,
          },
          {
            code: 'PERSISTENT_REMEMBER_ME',
            source: 'AUTHENTICATION_SECURITY_PROFILE',
            value: AUTH_SECURITY_PROFILE.persistentRememberMe,
          },
        ],
        freshness: { capturedAt },
        kind: request.kind,
        limitations: [
          {
            code: 'BACKUP_RUNTIME_STATUS_HOST_OWNED',
            material: true,
            source: 'HOST_OPERATOR_PROCEDURES',
          },
        ],
        scope: { kind: 'TECHNICAL_DIAGNOSTICS', workspace: request.workspace },
        sources: sourceCodes.map((code) => ({ code, destination: 'SYSTEM_OPERATIONS' })),
        workspace: request.workspace,
      });
      if (!result.success) throw unavailable();
      return result.data;
    },
  });
}

function parseRequest(input: SystemInsightRequest): SystemInsightRequest {
  const result = systemInsightRequestSchema.safeParse(input);
  if (!result.success) {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }
  return result.data;
}

function expired(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
}

function denied(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}

function unavailable(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
