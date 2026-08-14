import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  apiErrorEnvelopeSchema,
  approvalInboxEnvelopeSchema,
  approvalInboxQuerySchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { createApprovalInboxService, parseApprovalInboxIdentity } from './inbox-service.js';

export function registerApprovalInboxRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createApprovalInboxService(database);

  api.get(
    '/v1/approvals',
    {
      schema: {
        description:
          'Returns one purpose-minimized, current-scope approval inbox. Authorization and self-exclusion are applied before broad workflow-category, generic status, current-team, affected-date, sort, count, and pagination operations. Absence subtype, sickness classification, reasons, entitlement values, and source records are excluded.',
        operationId: 'getApprovalInbox',
        querystring: approvalInboxQuerySchema,
        response: {
          200: approvalInboxEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get the scoped approval inbox',
        tags: ['Approvals'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = parseInstant(now());
      if (!at.ok) {
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      }
      const data = await service.list(
        parseApprovalInboxIdentity(session.userId),
        request.query,
        at.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
