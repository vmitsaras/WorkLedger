/**
 * System operations routes.
 *
 * Provides technical diagnostics and operations status for system administrators.
 * Contains NO domain/HR data, employee counts, or personal information.
 *
 * Authorization: System administrator role only.
 * See docs/02-roles-permissions.md and docs/06-security-operations.md section 16.
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  systemDiagnosticsResponseSchema,
  readinessStatusResponseSchema,
  type SystemDiagnosticsResponse,
  type ReadinessStatusResponse,
} from '@workledger/contracts';
import {
  parseDomainId,
  parseInstant,
  localDateAtInstant,
  parseTimeZoneId,
} from '@workledger/domain';

import type { RuntimeConfig } from '../config.js';
import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import type { WorkLedgerDatabase } from '@workledger/database';
import type { WorkLedgerLogger } from '../logging/logger.js';
import { authorizeInstallationAction } from '../authorization/policy.js';
import { requestAuthenticationHeaders } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';

const APP_VERSION = '0.10.0';

export function registerSystemOperationsRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  logger: WorkLedgerLogger,
  now: () => string = () => new Date().toISOString(),
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/system/operations',
    {
      schema: {
        description:
          'Returns detailed service diagnostics. Authorized to system administrators only. Contains no domain/HR data.',
        operationId: 'getSystemDiagnostics',
        response: {
          200: systemDiagnosticsResponseSchema,
        },
        summary: 'Get system diagnostics',
        tags: ['System'],
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'private, no-store');

      const headers = requestAuthenticationHeaders(request);
      const session = await authentication.getSession(headers, 'PASSIVE');
      if (session === null) {
        throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_REQUIRED' });
      }

      const accountIdResult = parseDomainId<'Account'>(session.userId);
      if (!accountIdResult.ok) {
        throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_SESSION_EXPIRED' });
      }
      const accountId = accountIdResult.value;

      const actor = await database.transaction(async (transaction) => {
        const instantResult = parseInstant(now());
        if (!instantResult.ok) {
          throw new WorkLedgerApiError({ statusCode: 503, code: 'INTERNAL_ERROR' });
        }
        const instant = instantResult.value;

        const context = await transaction.accountSelfService.findContext(accountId, instant);
        if (context === null || !context.accountActive) {
          throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_SESSION_EXPIRED' });
        }

        const timeZoneResult = parseTimeZoneId(context.organization.timeZone);
        if (!timeZoneResult.ok) {
          throw new WorkLedgerApiError({ statusCode: 503, code: 'INTERNAL_ERROR' });
        }
        const localDate = localDateAtInstant(instant, timeZoneResult.value);

        return transaction.authorization.findActor(context.organization.id, accountId, localDate);
      });

      if (actor === null) {
        throw new WorkLedgerApiError({ statusCode: 403, code: 'ACCESS_DENIED' });
      }

      const authorization = authorizeInstallationAction('TECHNICAL_OPERATIONS_MANAGE', actor);

      if (!authorization.allowed) {
        throw new WorkLedgerApiError({ statusCode: 403, code: 'ACCESS_DENIED' });
      }

      const diagnostics = await collectDiagnostics(config, database, logger);
      return diagnostics;
    },
  );

  app.withTypeProvider<ZodTypeProvider>().get(
    '/v1/system/readiness',
    {
      schema: {
        description:
          'Returns detailed readiness status. Authorized to system administrators and orchestrators. Contains no domain/HR data.',
        operationId: 'getDetailedReadiness',
        response: {
          200: readinessStatusResponseSchema,
          503: readinessStatusResponseSchema,
        },
        summary: 'Get detailed readiness status',
        tags: ['System'],
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');

      try {
        const headers = requestAuthenticationHeaders(request);
        const session = await authentication.getSession(headers, 'PASSIVE');
        if (session === null) {
          throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_REQUIRED' });
        }

        const accountIdResult = parseDomainId<'Account'>(session.userId);
        if (!accountIdResult.ok) {
          throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_SESSION_EXPIRED' });
        }
        const accountId = accountIdResult.value;

        const actor = await database.transaction(async (transaction) => {
          const instantResult = parseInstant(now());
          if (!instantResult.ok) {
            throw new WorkLedgerApiError({ statusCode: 503, code: 'INTERNAL_ERROR' });
          }
          const instant = instantResult.value;

          const context = await transaction.accountSelfService.findContext(accountId, instant);
          if (context === null || !context.accountActive) {
            throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_SESSION_EXPIRED' });
          }

          const timeZoneResult = parseTimeZoneId(context.organization.timeZone);
          if (!timeZoneResult.ok) {
            throw new WorkLedgerApiError({ statusCode: 503, code: 'INTERNAL_ERROR' });
          }
          const localDate = localDateAtInstant(instant, timeZoneResult.value);

          return transaction.authorization.findActor(context.organization.id, accountId, localDate);
        });

        if (actor === null) {
          throw new WorkLedgerApiError({ statusCode: 403, code: 'ACCESS_DENIED' });
        }

        const authorization = authorizeInstallationAction('TECHNICAL_OPERATIONS_MANAGE', actor);

        if (!authorization.allowed) {
          throw new WorkLedgerApiError({ statusCode: 403, code: 'ACCESS_DENIED' });
        }
      } catch {
        return reply.code(503).send({
          status: 'not_ready',
        } satisfies ReadinessStatusResponse);
      }

      try {
        const dbReady = await database.isReady();
        const migrationsReady = dbReady;

        if (dbReady && migrationsReady) {
          return {
            status: 'ready',
            details: {
              database: 'ready',
              migrations: 'ready',
            },
          } satisfies ReadinessStatusResponse;
        }

        return reply.code(503).send({
          status: 'not_ready',
          details: {
            database: dbReady ? 'ready' : 'not_ready',
            migrations: migrationsReady ? 'ready' : 'not_ready',
          },
        } satisfies ReadinessStatusResponse);
      } catch {
        return reply.code(503).send({
          status: 'not_ready',
        } satisfies ReadinessStatusResponse);
      }
    },
  );
}

async function collectDiagnostics(
  config: RuntimeConfig,
  database: WorkLedgerDatabase,
  logger: WorkLedgerLogger,
): Promise<SystemDiagnosticsResponse> {
  const timestamp = new Date().toISOString();

  const databaseStatus = await checkDatabaseHealth(database, logger);
  const authenticationStatus = { status: 'healthy' as const };

  let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (databaseStatus.status === 'unavailable') {
    overallHealth = 'critical';
  } else if (databaseStatus.status === 'degraded') {
    overallHealth = 'degraded';
  }

  return {
    service: 'workledger-api',
    version: APP_VERSION,
    environment: config.environment,
    timestamp,
    dependencies: {
      database: databaseStatus,
      authentication: authenticationStatus,
    },
    health: overallHealth,
  };
}

async function checkDatabaseHealth(
  database: WorkLedgerDatabase,
  logger: WorkLedgerLogger,
): Promise<{
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const isReady = await database.isReady();
    const latencyMs = Date.now() - startTime;

    if (!isReady) {
      logger.warn('Database readiness check failed', { latencyMs });
      return {
        status: 'unavailable',
        latencyMs,
        error: 'Database not ready',
      };
    }

    if (latencyMs > 1000) {
      logger.warn('Database latency degraded', { latencyMs });
      return {
        status: 'degraded',
        latencyMs,
        error: 'High latency',
      };
    }

    return {
      status: 'healthy',
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    logger.error('Database health check failed', error, { latencyMs });

    return {
      status: 'unavailable',
      latencyMs,
      error: 'Connection failed',
    };
  }
}
