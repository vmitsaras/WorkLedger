/**
 * Retention and user export routes.
 *
 * Provides employee self-service data export per docs/06-security-operations.md section 19.
 * Authorization: Employee role for own exports.
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  userExportRequestSchema,
  userExportMetadataResponseSchema,
  type UserExportRequest,
  type UserExportMetadataResponse,
} from '@workledger/contracts';
import { parseDomainId, parseInstant, localDateAtInstant, parseTimeZoneId } from '@workledger/domain';

import type { RuntimeConfig } from '../config.js';
import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import type { WorkLedgerDatabase } from '@workledger/database';
import { requestAuthenticationHeaders } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { createUserExport } from './user-export.js';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

export function registerRetentionRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/v1/account/exports',
    {
      schema: {
        description:
          'Request a self-service data export. Returns metadata and download URL. Export expires after 24 hours.',
        operationId: 'createUserExport',
        body: userExportRequestSchema,
        response: {
          200: userExportMetadataResponseSchema,
        },
        summary: 'Request user data export',
        tags: ['Account'],
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

      const exportRequest: UserExportRequest = request.body;

      const context = await database.transaction(async (tx) => {
        const instantResult = parseInstant(now());
        if (!instantResult.ok) {
          throw new WorkLedgerApiError({ statusCode: 503, code: 'INTERNAL_ERROR' });
        }
        const instant = instantResult.value;

        const ctx = await tx.accountSelfService.findContext(accountId, instant);
        if (ctx === null || !ctx.accountActive) {
          throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_SESSION_EXPIRED' });
        }

        if (ctx.employee === null) {
          throw new WorkLedgerApiError({ statusCode: 403, code: 'ACCESS_DENIED' });
        }

        return ctx;
      });

      const exportMetadata = await createUserExport(
        database,
        context.employee!.id,
        context.organization.id,
        exportRequest,
      );

      return exportMetadata;
    },
  );

  app.get(
    '/v1/account/exports/:exportId/download',
    {
      schema: {
        description:
          'Download a previously requested data export. Requires the same authenticated employee who requested it. Expires after 24 hours.',
        operationId: 'downloadUserExport',
        params: {
          type: 'object',
          properties: {
            exportId: { type: 'string', format: 'uuid' },
          },
          required: ['exportId'],
        },
        summary: 'Download user data export',
        tags: ['Account'],
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

      const { exportId } = request.params as { exportId: string };

      const exportRecord = await database.transaction(async (tx) => {
        const instantResult = parseInstant(now());
        if (!instantResult.ok) {
          throw new WorkLedgerApiError({ statusCode: 503, code: 'INTERNAL_ERROR' });
        }
        const instant = instantResult.value;

        const context = await tx.accountSelfService.findContext(accountId, instant);
        if (context === null || !context.accountActive || context.employee === null) {
          throw new WorkLedgerApiError({ statusCode: 401, code: 'AUTH_SESSION_EXPIRED' });
        }

        const result = await tx.db.execute<{
          employee_id: string;
          artifact_path: string;
          expires_at: string;
        }>(
          `SELECT employee_id, artifact_path, expires_at 
           FROM user_export_requests 
           WHERE id = $1 AND generated_at IS NOT NULL`,
          [exportId],
        );

        if (result.rows.length === 0) {
          throw new WorkLedgerApiError({ statusCode: 404, code: 'NOT_FOUND' });
        }

        const record = result.rows[0];

        // Verify the export belongs to the current employee
        if (record.employee_id !== context.employee.id) {
          throw new WorkLedgerApiError({ statusCode: 403, code: 'ACCESS_DENIED' });
        }

        // Check expiry
        if (new Date(record.expires_at) < new Date()) {
          throw new WorkLedgerApiError({
            statusCode: 410,
            code: 'RESOURCE_EXPIRED',
          });
        }

        return record;
      });

      try {
        const stats = await stat(exportRecord.artifact_path);
        const stream = createReadStream(exportRecord.artifact_path);

        reply.header('content-type', 'application/zip');
        reply.header('content-disposition', `attachment; filename="workledger-export-${exportId}.zip"`);
        reply.header('content-length', stats.size);

        return reply.send(stream);
      } catch (error) {
        throw new WorkLedgerApiError({ statusCode: 500, code: 'INTERNAL_ERROR' });
      }
    },
  );
}
