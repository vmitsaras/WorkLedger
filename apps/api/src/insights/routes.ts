import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { apiErrorEnvelopeSchema } from '@workledger/contracts';
import {
  employeeInsightTopicRequestSchema,
  employeeInsightTopicResultEnvelopeSchema,
  insightInterpretationRequestSchema,
  insightInterpretationResultEnvelopeSchema,
  hrInsightRequestSchema,
  hrInsightRunResponseEnvelopeSchema,
  insightRequestSchema,
  insightRunResponseEnvelopeSchema,
} from '@workledger/contracts/insights';
import type { EmployeeInsightRequest, InsightRequest } from '@workledger/contracts/insights';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import type { AiProvider } from '../ai/contracts.js';
import {
  requireRequestCsrf,
  requireRequestSession,
  requireSameOrigin,
} from '../auth/request-session.js';
import type { RuntimeConfig } from '../config.js';
import { WorkLedgerApiError } from '../http/errors.js';
import type { WorkLedgerLogger } from '../logging/logger.js';
import { createEmployeeInsightHandlers } from './employee-insight-handlers.js';
import { createEmployeeInsightTopicService } from './employee-insight-topics.js';
import { createInsightService, parseInsightIdentity } from './insight-service.js';
import { createManagerInsightService } from './manager-insight-service.js';
import { createHrInsightService } from './hr-insight-service.js';

export type InsightApiClock = () => string;

export function registerInsightRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  aiProvider: AiProvider,
  _logger: WorkLedgerLogger,
  now: InsightApiClock = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createInsightService(database, createEmployeeInsightHandlers());
  const managerService = createManagerInsightService(database);
  const hrService = createHrInsightService(database);
  const topicService = createEmployeeInsightTopicService(
    service.authorizeTopicSuggestion,
    aiProvider,
    (accountId) => authentication.consumeInsightInterpretationRateLimit(accountId),
  );

  api.post(
    '/v1/insights/hr/run',
    {
      schema: {
        body: hrInsightRequestSchema,
        description:
          'Returns one privacy-suppressed organization aggregate for the current HR workspace. Suppression occurs before any native result or source action is constructed.',
        operationId: 'runHrInsight',
        response: {
          200: hrInsightRunResponseEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Run an HR aggregate Insight',
        tags: ['Insights'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const capturedAt = parseInstant(now());
      if (!capturedAt.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const data = await hrService.run(
        parseInsightIdentity(session.userId, session.fresh),
        request.body,
        capturedAt.value,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/insights/manager/run',
    {
      schema: {
        body: insightRequestSchema,
        description:
          'Returns one current-direct-report deterministic Manager Insight. The server reauthorizes every run and the response is never cached.',
        operationId: 'runManagerInsight',
        response: {
          200: insightRunResponseEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Run a manager Insight',
        tags: ['Insights'],
      },
    },
    async (request, reply) => {
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const capturedAt = parseInstant(now());
      if (!capturedAt.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      if (
        request.body.workspace !== 'MANAGER' ||
        (request.body.kind !== 'manager-action-summary' && request.body.kind !== 'team-coverage')
      ) {
        throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
      }
      const data = await managerService.run(
        parseInsightIdentity(session.userId, session.fresh),
        request.body,
        capturedAt.value,
      );
      reply.header('cache-control', 'private, no-store');
      return {
        data,
        meta: { interpretationAvailability: 'DISABLED' as const, requestId: request.id },
      };
    },
  );

  api.post(
    '/v1/insights/run',
    {
      schema: {
        body: insightRequestSchema,
        description:
          'Returns one current, employee self scoped deterministic Insight. The request is strict, the server reauthorizes every run, and the response is never cached.',
        operationId: 'runEmployeeInsight',
        response: {
          200: insightRunResponseEnvelopeSchema,
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
        requireEmployeeInsightRequest(request.body),
        capturedAt.value,
      );
      reply.header('cache-control', 'private, no-store');
      return {
        data,
        meta: {
          interpretationAvailability: 'DISABLED' as const,
          requestId: request.id,
        },
      };
    },
  );

  api.post(
    '/v1/insights/interpret',
    {
      schema: {
        body: insightInterpretationRequestSchema,
        description:
          'Deferred legacy interpretation. Returns unavailable; English topic suggestions are a separate operation.',
        deprecated: true,
        operationId: 'interpretEmployeeInsight',
        response: {
          200: insightInterpretationResultEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          429: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Interpret an employee Insight',
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

      await service.authorizeTopicSuggestion(
        parseInsightIdentity(session.userId, session.fresh),
        capturedAt.value,
      );
      reply.header('cache-control', 'private, no-store');
      throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
    },
  );

  api.post(
    '/v1/insights/suggest-topic',
    {
      schema: {
        body: employeeInsightTopicRequestSchema,
        description:
          'Suggests one employee Insight topic for an English question. No ledger facts or periods reach the model. The user must confirm the topic and choose a period before running the independent native Insight.',
        operationId: 'suggestEmployeeInsightTopic',
        response: {
          200: employeeInsightTopicResultEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          429: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Suggest an employee Insight topic (English only)',
        tags: ['Insights'],
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'private, no-store');
      requireSameOrigin(request, config.canonicalOrigin);
      const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
      await requireRequestCsrf(request, authentication, headers);
      const capturedAt = parseInstant(now());
      if (!capturedAt.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const controller = new AbortController();
      const cancelProviderWork = () => controller.abort();
      const cancelProviderWorkOnClosedResponse = () => {
        if (!reply.raw.writableEnded) controller.abort();
      };
      request.raw.once('aborted', cancelProviderWork);
      reply.raw.once('close', cancelProviderWorkOnClosedResponse);
      try {
        const data = await topicService.suggest(
          parseInsightIdentity(session.userId, session.fresh),
          request.body,
          capturedAt.value,
          controller.signal,
        );
        reply.header('cache-control', 'private, no-store');
        return { data, meta: { requestId: request.id } };
      } finally {
        request.raw.off('aborted', cancelProviderWork);
        reply.raw.off('close', cancelProviderWorkOnClosedResponse);
      }
    },
  );
}

function requireEmployeeInsightRequest(request: InsightRequest): EmployeeInsightRequest {
  if (request.workspace !== 'EMPLOYEE') {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }
  return request;
}
