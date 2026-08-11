import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { apiErrorEnvelopeSchema, todayAttendanceEnvelopeSchema } from '@workledger/contracts';
import { parseInstant } from '@workledger/domain';
import type { WorkLedgerDatabase } from '@workledger/database';

import type { WorkLedgerAuthentication } from '../auth/authentication.js';
import { requireRequestSession } from '../auth/request-session.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { createTodayAttendanceService, parseTodayAttendanceIdentity } from './today-service.js';

export type ApiClock = () => string;

export function registerTodayAttendanceRoutes(
  app: FastifyInstance,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: ApiClock = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const service = createTodayAttendanceService(database);

  api.get(
    '/v1/me/attendance/today',
    {
      schema: {
        description:
          'Returns the authorized current employee attendance state, provisional calculation, warnings, and bounded event timeline for the organization-local current date.',
        operationId: 'getTodayAttendance',
        response: {
          200: todayAttendanceEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Get current employee attendance for today',
        tags: ['Attendance'],
      },
    },
    async (request, reply) => {
      const { session } = await requireRequestSession(request, authentication, 'ACTIVE');
      const at = parseInstant(now());
      if (!at.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      const identity = parseTodayAttendanceIdentity(session.userId, session.fresh);
      const today = await service.getToday(identity, at.value);
      reply.header('cache-control', 'private, no-store');
      return { data: today, meta: { requestId: request.id } };
    },
  );
}
