import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  reportCatalogEnvelopeSchema,
  reportExportRequestSchema,
  reportKeySchema,
  reportQuerySchema,
  reportResultEnvelopeSchema,
} from '@workledger/contracts';
import { parseDomainId, parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { REPORT_CSV_CONTENT_TYPE } from './csv.js';
import { createReportService, parseReportIdentity } from './report-service.js';

export function registerReportRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
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

  api.post(
    '/v1/reports/:reportKey/export',
    {
      schema: {
        body: reportExportRequestSchema,
        description:
          'Generates one bounded UTF-8 comma-delimited CSV after re-evaluating the current self, direct-report, or organization-HR scope. Formula-significant text is prefixed with an apostrophe before ordinary CSV quoting. The response contains no hidden columns, internal identifiers, sickness classification, notes, reasons, or reviewer comments.',
        operationId: 'exportReportCsv',
        params: z.strictObject({ reportKey: reportKeySchema }),
        response: {
          200: {
            description: 'A purpose-minimized formula-safe CSV using CRLF record endings.',
            content: { 'text/csv': { schema: z.string() } },
          },
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          413: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Export an authorized report as CSV',
        tags: ['Reports'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const data = await service.exportCsv(
        parseReportIdentity(session.userId),
        request.params.reportKey,
        request.body,
        requireInstant(now()),
        requireRequestId(request.id),
      );
      reply.header('cache-control', 'private, no-store');
      reply.header('content-disposition', `attachment; filename="${data.filename}"`);
      reply.header('x-content-type-options', 'nosniff');
      reply.type(REPORT_CSV_CONTENT_TYPE);
      return reply.send(data.body);
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

function requireRequestId(value: string) {
  const parsed = parseDomainId<'Request'>(value);
  if (!parsed.ok) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  return parsed.value;
}
