import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  applyCorrectionEnvelopeSchema,
  applyCorrectionRequestSchema,
  apiErrorEnvelopeSchema,
  correctionDecisionEnvelopeSchema,
  correctionDecisionRequestSchema,
  correctionReviewQueueEnvelopeSchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  createCorrectionReviewService,
  parseCorrectionReviewIdentity,
} from './correction-review-service.js';

export function registerCorrectionReviewRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createCorrectionReviewService(database);
  api.get(
    '/v1/manager/correction-requests',
    {
      schema: {
        operationId: 'getManagerCorrectionReviewQueue',
        response: {
          200: correctionReviewQueueEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get pending scoped correction requests',
        tags: ['Correction requests'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const data = await service.list(
        parseCorrectionReviewIdentity(session.userId, session.fresh),
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data: { items: data }, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/manager/correction-requests/:requestId/decision',
    {
      schema: {
        body: correctionDecisionRequestSchema,
        params: z.strictObject({ requestId: z.string().uuid() }),
        operationId: 'decideManagerCorrectionRequest',
        response: {
          200: correctionDecisionEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          409: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Decide a correction and atomically apply an approved locked adjustment',
        tags: ['Correction requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const data = await service.decide(
        parseCorrectionReviewIdentity(session.userId, session.fresh),
        request.params.requestId,
        request.body,
        requireInstant(now()),
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
  api.post(
    '/v1/manager/correction-requests/:requestId/apply',
    {
      schema: {
        body: applyCorrectionRequestSchema,
        params: z.strictObject({ requestId: z.string().uuid() }),
        operationId: 'applyApprovedCorrectionRequest',
        response: {
          200: applyCorrectionEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          409: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Apply an approved ordinary or legacy post-lock correction',
        tags: ['Correction requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const data = await service.apply(
        parseCorrectionReviewIdentity(session.userId, session.fresh),
        request.params.requestId,
        request.body.expectedVersion,
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
