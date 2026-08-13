import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  apiErrorEnvelopeSchema,
  myTimeEnvelopeSchema,
  myTimeQuerySchema,
} from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
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
}

function requireInstant(value: string) {
  const instant = parseInstant(value);
  if (!instant.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return instant.value;
}
