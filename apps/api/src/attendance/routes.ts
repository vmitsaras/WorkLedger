import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  clockInEnvelopeSchema,
  clockInRequestSchema,
  todayAttendanceEnvelopeSchema,
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
  createClockInService,
  parseClockInIdentity,
  parseClockInRequestId,
  type ClockInIdentity,
} from './clock-in-service.js';
import { createTodayAttendanceService, parseTodayAttendanceIdentity } from './today-service.js';

export type ApiClock = () => string;

const attendanceMutationHeadersSchema = z.looseObject({
  'idempotency-key': z.string().regex(/^[A-Za-z0-9._~-]{16,128}$/u),
});
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~-]{16,128}$/u;

type PreparedClockInRequest = Readonly<{
  identity: ClockInIdentity;
  requestedAt: ReturnType<typeof requireInstant>;
}>;

export function registerAttendanceRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
  database: WorkLedgerDatabase,
  now: ApiClock = () => new Date().toISOString(),
): void {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const todayService = createTodayAttendanceService(database);
  const clockInService = createClockInService(database, now);
  const preparedClockInRequests = new WeakMap<FastifyRequest, PreparedClockInRequest>();

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
      const at = requireInstant(now());
      const identity = parseTodayAttendanceIdentity(session.userId, session.fresh);
      const today = await todayService.getToday(identity, at);
      reply.header('cache-control', 'private, no-store');
      return { data: today, meta: { requestId: request.id } };
    },
  );

  api.post(
    '/v1/me/attendance/clock-in',
    {
      preValidation: async (request) => {
        requireSameOrigin(request, config.canonicalOrigin);
        const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
        await requireRequestCsrf(request, authentication, headers);
        const prepared = Object.freeze({
          identity: parseClockInIdentity(session.userId, session.fresh),
          requestedAt: requireInstant(now()),
        });
        await clockInService.authorize(prepared.identity, prepared.requestedAt);
        preparedClockInRequests.set(request, prepared);
      },
      schema: {
        body: clockInRequestSchema,
        description:
          'Clocks in the authorized current employee using a required opaque Idempotency-Key header, optimistic attendance revision, trusted server occurrence minute, and atomic audit evidence.',
        headers: attendanceMutationHeadersSchema,
        operationId: 'clockInCurrentEmployee',
        response: {
          200: clockInEnvelopeSchema,
          401: apiErrorEnvelopeSchema,
          403: apiErrorEnvelopeSchema,
          409: apiErrorEnvelopeSchema,
          422: apiErrorEnvelopeSchema,
          503: apiErrorEnvelopeSchema,
        },
        summary: 'Clock in current employee',
        tags: ['Attendance'],
      },
    },
    async (request, reply) => {
      const prepared = preparedClockInRequests.get(request);
      preparedClockInRequests.delete(request);
      if (prepared === undefined) {
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      }
      const result = await clockInService.clockIn(prepared.identity, {
        ...request.body,
        idempotencyKey: requireIdempotencyKey(request),
        requestId: parseClockInRequestId(request.id),
        requestedAt: prepared.requestedAt,
      });
      reply.header('cache-control', 'private, no-store');
      if (result.kind === 'ERROR') {
        throw new WorkLedgerApiError({
          code: result.code,
          ...(result.context === undefined ? {} : { context: result.context }),
          ...(result.idempotentReplay ? { idempotentReplay: true } : {}),
          statusCode: 409,
        });
      }
      return {
        data: result.data,
        meta: {
          ...(result.idempotentReplay ? { idempotentReplay: true } : {}),
          requestId: request.id,
        },
      };
    },
  );
}

function requireInstant(value: string) {
  const instant = parseInstant(value);
  if (!instant.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return instant.value;
}

function requireIdempotencyKey(request: FastifyRequest): string {
  const rawValues: string[] = [];
  for (let index = 0; index < request.raw.rawHeaders.length; index += 2) {
    if (request.raw.rawHeaders[index]?.toLowerCase() === 'idempotency-key') {
      const value = request.raw.rawHeaders[index + 1];
      if (value !== undefined) rawValues.push(value);
    }
  }
  if (rawValues.length === 0) {
    throw new WorkLedgerApiError({ code: 'IDEMPOTENCY_KEY_REQUIRED', statusCode: 422 });
  }
  const value = rawValues[0];
  if (rawValues.length !== 1 || value === undefined || !IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new WorkLedgerApiError({ code: 'IDEMPOTENCY_KEY_INVALID', statusCode: 422 });
  }
  return value;
}
