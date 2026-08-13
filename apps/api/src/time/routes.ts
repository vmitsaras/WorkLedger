import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  dailyTimeRecordEnvelopeSchema,
  myTimeEnvelopeSchema,
  myTimeQuerySchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  createDailyTimeService,
  parseDailyProjectionId,
  parseDailyTimeIdentity,
} from './daily-time-service.js';
import { createMyTimeService, parseMyTimeIdentity } from './my-time-service.js';

export type TimeApiClock = () => string;

export function registerMyTimeRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: TimeApiClock = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const myTimeService = createMyTimeService(database);
  const dailyTimeService = createDailyTimeService(database);

  api.get(
    '/v1/me/time',
    {
      schema: {
        description:
          'Returns the authorized current employee week or month time-record summary and an explainable, paginated flexible-time ledger. Posted ledger facts and eligible unposted projections remain separate.',
        operationId: 'getCurrentEmployeeTime',
        querystring: myTimeQuerySchema,
        response: {
          200: myTimeEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get current employee time records and flexible-time balance',
        tags: ['Time records'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = requireInstant(now());
      const data = await myTimeService.getMyTime(
        parseMyTimeIdentity(session.userId, session.fresh),
        request.query,
        at,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );

  api.get(
    '/v1/me/time-records/:recordId',
    {
      schema: {
        description:
          'Returns one authorized current-employee daily record with an immutable event list and organization-local work/break intervals. It does not expose absence type, source IDs, or correction workflow data.',
        operationId: 'getCurrentEmployeeDailyTimeRecord',
        params: z.strictObject({ recordId: z.string().min(1).max(128) }),
        response: {
          200: dailyTimeRecordEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          404: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get current employee daily time record',
        tags: ['Time records'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = requireInstant(now());
      const data = await dailyTimeService.getDailyRecord(
        parseDailyTimeIdentity(session.userId, session.fresh),
        parseDailyProjectionId(request.params.recordId),
        at,
      );
      reply.header('cache-control', 'private, no-store');
      return { data, meta: { requestId: request.id } };
    },
  );
}

function requireInstant(value: string) {
  const instant = parseInstant(value);
  if (!instant.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return instant.value;
}
