import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  apiErrorEnvelopeSchema,
  submittedVacationRequestEnvelopeSchema,
  submitVacationRequestSchema,
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
  createVacationRequestService,
  parseVacationRequestIdentity,
} from './vacation-request-service.js';

export function registerVacationRequestRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: () => string = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createVacationRequestService(database);
  api.post(
    '/v1/me/vacation-requests',
    {
      schema: {
        body: submitVacationRequestSchema,
        description:
          'Submits a full-day employee vacation request. Every local date remains visible; public holidays and zero-hour dates consume zero entitlement. Pending approval reserves the calculated entitlement but does not change daily time calculations.',
        operationId: 'submitEmployeeVacationRequest',
        response: {
          201: submittedVacationRequestEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Submit a vacation request',
        tags: ['Absence requests'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await service.submit(
        parseVacationRequestIdentity(session.userId, session.fresh),
        request.body,
        at.value,
      );
      reply.code(201).header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
