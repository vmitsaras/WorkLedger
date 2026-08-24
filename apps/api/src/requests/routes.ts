import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  personalRequestDetailEnvelopeSchema,
  personalRequestHistoryEnvelopeSchema,
  personalRequestQuerySchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { createPersonalRequestService, parsePersonalRequestIdentity } from './service.js';

export function registerPersonalRequestRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createPersonalRequestService(database);

  api.get(
    '/v1/me/requests',
    {
      schema: {
        description:
          'Returns the active employee’s paginated correction, absence, and cancellation history. The collection exposes only broad workflow categories and never absence subtype, notes, reasons, entitlement values, or employee identity.',
        operationId: 'getPersonalRequestHistory',
        querystring: personalRequestQuerySchema,
        response: {
          200: personalRequestHistoryEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get personal request history',
        tags: ['Requests'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await service.list(
        parsePersonalRequestIdentity(session.userId, session.fresh),
        request.query,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/me/requests/:requestId',
    {
      schema: {
        description:
          'Returns one employee-owned type-neutral request detail. The authorized response selects correction, absence, or cancellation presentation while preserving source and decision history.',
        operationId: 'getPersonalRequestDetail',
        params: z.strictObject({ requestId: z.uuid() }),
        response: {
          200: personalRequestDetailEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get personal request detail',
        tags: ['Requests'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await service.get(
        parsePersonalRequestIdentity(session.userId, session.fresh),
        request.params.requestId,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

function requireInstant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}
