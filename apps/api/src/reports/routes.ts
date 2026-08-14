import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  reportCatalogEnvelopeSchema,
  reportKeySchema,
  reportQuerySchema,
  reportResultEnvelopeSchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { createReportService, parseReportIdentity } from './report-service.js';

export function registerReportRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createReportService(database);

  api.get(
    '/v1/reports',
    {
      schema: {
        description:
          'Returns only report definitions allowed by the current self, direct-report, or organization-HR scope plus the organization-local default date range. System-administrator authority alone grants no report access.',
        operationId: 'getReportCatalog',
        response: {
          200: reportCatalogEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get the authorized report catalog',
        tags: ['Reports'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await service.catalog(
        parseReportIdentity(session.userId),
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/reports/:reportKey',
    {
      schema: {
        description:
          'Runs one allow-listed, purpose-minimized report. Current self/direct-report/organization scope is applied before the inclusive date range, totals, sorting, count, and bounded pagination. URLs and responses exclude absence subtype, sickness classification, notes, reasons, entitlement details outside the leave report, and person-identifying search text.',
        operationId: 'runReport',
        params: z.strictObject({ reportKey: reportKeySchema }),
        querystring: reportQuerySchema,
        response: {
          200: reportResultEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Run an authorized report',
        tags: ['Reports'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await service.run(
        parseReportIdentity(session.userId),
        request.params.reportKey,
        request.query,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

function requireInstant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  return parsed.value;
}
