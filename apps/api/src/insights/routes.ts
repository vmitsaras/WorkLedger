import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { apiErrorEnvelopeSchema } from '@workledger/contracts';
import {
  insightNativeResultEnvelopeSchema,
  insightRequestSchema,
} from '@workledger/contracts/insights';
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
import { createEmployeeInsightHandlers } from './employee-insight-handlers.js';
import { createInsightService, parseInsightIdentity } from './insight-service.js';

export type InsightApiClock = () => string;

export function registerInsightRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: InsightApiClock = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createInsightService(database, createEmployeeInsightHandlers());

  api.post(
    '/v1/insights/run',
    {
      schema: {
        body: insightRequestSchema,
        description:
          'Returns one current, employee self scoped deterministic Insight. The request is strict, the server reauthorizes every run, and the response is never cached.',
        operationId: 'runEmployeeInsight',
        response: {
          200: insightNativeResultEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          429: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Run an employee Insight',
        tags: ['Insights'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const capturedAt = parseInstant(now());
      if (!capturedAt.ok) {
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      }
      const data = await service.run(
        parseInsightIdentity(session.userId, session.fresh),
        request.body,
        capturedAt.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}
