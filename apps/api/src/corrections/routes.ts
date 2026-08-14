import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  apiErrorEnvelopeSchema,
  submitCorrectionRequestEnvelopeSchema,
  submitCorrectionRequestSchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import type { RuntimeConfig } from '../config.js';
import {
  createCorrectionRequestService,
  parseCorrectionRequestIdentity,
} from './correction-request-service.js';

export function registerCorrectionRequestRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createCorrectionRequestService(database);
  api.post(
    '/v1/me/correction-requests',
    {
      schema: {
        body: submitCorrectionRequestSchema,
        description:
          'Submits an employee-owned proposed work interval for review. Raw attendance events remain immutable. A locked target names its exact approved snapshot and approval later appends a post-lock adjustment.',
        operationId: 'submitEmployeeCorrectionRequest',
        response: {
          201: submitCorrectionRequestEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Submit an ordinary or post-lock correction request',
        tags: ['Correction requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await service.submit(
        parseCorrectionRequestIdentity(session.userId, session.fresh),
        request.body,
        at.value,
      );
      reply.code(201).header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
