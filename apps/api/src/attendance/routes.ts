import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  clockInEnvelopeSchema,
  clockInRequestSchema,
  clockOutEnvelopeSchema,
  clockOutRequestSchema,
  resumeAttendanceEnvelopeSchema,
  resumeAttendanceRequestSchema,
  startBreakEnvelopeSchema,
  startBreakRequestSchema,
  todayAttendanceEnvelopeSchema,
  type AttendanceCommandResult,
  type ClockInResult,
  type ClockOutResult,
  type ResumeAttendanceResult,
  type StartBreakResult,
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
  createAttendanceCommandService,
  parseAttendanceCommandIdentity,
  parseAttendanceCommandRequestId,
  type AttendanceCommandIdentity,
  type AttendanceCommandOperationResult,
} from './attendance-command-service.js';
import { createTodayAttendanceService, parseTodayAttendanceIdentity } from './today-service.js';

export type ApiClock = () => string;

const attendanceMutationHeadersSchema = z.looseObject({
  'idempotency-key': z.string().regex(/^[A-Za-z0-9._~-]{16,128}$/u),
});
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._~-]{16,128}$/u;

type PreparedAttendanceRequest = Readonly<{
  identity: AttendanceCommandIdentity;
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
  const attendanceCommandService = createAttendanceCommandService(database, now);
  const preparedAttendanceRequests = new WeakMap<FastifyRequest, PreparedAttendanceRequest>();
  const prepareAttendanceRequest = async (request: FastifyRequest) => {
    requireSameOrigin(request, config.canonicalOrigin);
    const { headers, session } = await requireRequestSession(request, authentication, 'ACTIVE');
    await requireRequestCsrf(request, authentication, headers);
    const prepared = Object.freeze({
      identity: parseAttendanceCommandIdentity(session.userId, session.fresh),
      requestedAt: requireInstant(now()),
    });
    await attendanceCommandService.authorize(prepared.identity, prepared.requestedAt);
    preparedAttendanceRequests.set(request, prepared);
  };

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
      preValidation: prepareAttendanceRequest,
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
      const prepared = requirePreparedAttendanceRequest(request, preparedAttendanceRequests);
      const result = await attendanceCommandService.execute(prepared.identity, {
        ...request.body,
        command: 'CLOCK_IN',
        idempotencyKey: requireIdempotencyKey(request),
        requestId: parseAttendanceCommandRequestId(request.id),
        requestedAt: prepared.requestedAt,
      });
      const data = requireSuccessfulAttendanceResult(result, 'CLOCK_IN');
      return attendanceSuccessReply(reply, data, result.idempotentReplay, request.id);
    },
  );

  api.post(
    '/v1/me/attendance/start-break',
    {
      preValidation: prepareAttendanceRequest,
      schema: {
        body: startBreakRequestSchema,
        description:
          'Starts a break for the authorized current employee using a required opaque Idempotency-Key header, optimistic attendance revision, trusted server occurrence minute, and atomic audit evidence.',
        headers: attendanceMutationHeadersSchema,
        operationId: 'startBreakForCurrentEmployee',
        response: attendanceMutationResponses(startBreakEnvelopeSchema),
        summary: 'Start break for current employee',
        tags: ['Attendance'],
      },
    },
    async (request, reply) => {
      const prepared = requirePreparedAttendanceRequest(request, preparedAttendanceRequests);
      const result = await attendanceCommandService.execute(prepared.identity, {
        ...request.body,
        command: 'START_BREAK',
        idempotencyKey: requireIdempotencyKey(request),
        requestId: parseAttendanceCommandRequestId(request.id),
        requestedAt: prepared.requestedAt,
      });
      const data = requireSuccessfulAttendanceResult(result, 'START_BREAK');
      return attendanceSuccessReply(reply, data, result.idempotentReplay, request.id);
    },
  );

  api.post(
    '/v1/me/attendance/end-break',
    {
      preValidation: prepareAttendanceRequest,
      schema: {
        body: resumeAttendanceRequestSchema,
        description:
          'Resumes work by ending the authorized current employee break using a required opaque Idempotency-Key header, optimistic attendance revision, trusted server occurrence minute, and atomic audit evidence.',
        headers: attendanceMutationHeadersSchema,
        operationId: 'resumeCurrentEmployeeAttendance',
        response: attendanceMutationResponses(resumeAttendanceEnvelopeSchema),
        summary: 'Resume work for current employee',
        tags: ['Attendance'],
      },
    },
    async (request, reply) => {
      const prepared = requirePreparedAttendanceRequest(request, preparedAttendanceRequests);
      const result = await attendanceCommandService.execute(prepared.identity, {
        ...request.body,
        command: 'RESUME',
        idempotencyKey: requireIdempotencyKey(request),
        requestId: parseAttendanceCommandRequestId(request.id),
        requestedAt: prepared.requestedAt,
      });
      const data = requireSuccessfulAttendanceResult(result, 'RESUME');
      return attendanceSuccessReply(reply, data, result.idempotentReplay, request.id);
    },
  );

  api.post(
    '/v1/me/attendance/clock-out',
    {
      preValidation: prepareAttendanceRequest,
      schema: {
        body: clockOutRequestSchema,
        description:
          'Clocks out the authorized current employee, requiring explicit confirmation while on break and atomically closing that break before clock-out at one trusted server occurrence minute.',
        headers: attendanceMutationHeadersSchema,
        operationId: 'clockOutCurrentEmployee',
        response: attendanceMutationResponses(clockOutEnvelopeSchema),
        summary: 'Clock out current employee',
        tags: ['Attendance'],
      },
    },
    async (request, reply) => {
      const prepared = requirePreparedAttendanceRequest(request, preparedAttendanceRequests);
      const result = await attendanceCommandService.execute(prepared.identity, {
        command: 'CLOCK_OUT',
        ...(request.body.confirmActiveBreak === undefined
          ? {}
          : { confirmActiveBreak: request.body.confirmActiveBreak }),
        expectedAttendanceRevision: request.body.expectedAttendanceRevision,
        idempotencyKey: requireIdempotencyKey(request),
        requestId: parseAttendanceCommandRequestId(request.id),
        requestedAt: prepared.requestedAt,
      });
      const data = requireSuccessfulAttendanceResult(result, 'CLOCK_OUT');
      return attendanceSuccessReply(reply, data, result.idempotentReplay, request.id);
    },
  );
}

function attendanceMutationResponses<Schema extends z.ZodType>(successSchema: Schema) {
  return {
    200: successSchema,
    401: apiErrorEnvelopeSchema,
    403: apiErrorEnvelopeSchema,
    409: apiErrorEnvelopeSchema,
    422: apiErrorEnvelopeSchema,
    503: apiErrorEnvelopeSchema,
  };
}

function requirePreparedAttendanceRequest(
  request: FastifyRequest,
  preparedRequests: WeakMap<FastifyRequest, PreparedAttendanceRequest>,
): PreparedAttendanceRequest {
  const prepared = preparedRequests.get(request);
  preparedRequests.delete(request);
  if (prepared === undefined) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  return prepared;
}

function requireSuccessfulAttendanceResult(
  result: AttendanceCommandOperationResult,
  command: 'CLOCK_IN',
): ClockInResult;
function requireSuccessfulAttendanceResult(
  result: AttendanceCommandOperationResult,
  command: 'START_BREAK',
): StartBreakResult;
function requireSuccessfulAttendanceResult(
  result: AttendanceCommandOperationResult,
  command: 'RESUME',
): ResumeAttendanceResult;
function requireSuccessfulAttendanceResult(
  result: AttendanceCommandOperationResult,
  command: 'CLOCK_OUT',
): ClockOutResult;
function requireSuccessfulAttendanceResult(
  result: AttendanceCommandOperationResult,
  command: AttendanceCommandResult['command'],
): AttendanceCommandResult {
  if (result.kind === 'ERROR') {
    throw new WorkLedgerApiError({
      code: result.code,
      ...(result.context === undefined ? {} : { context: result.context }),
      ...(result.idempotentReplay ? { idempotentReplay: true } : {}),
      statusCode: 409,
    });
  }
  if (result.data.command !== command) {
    throw internalAttendanceRouteError();
  }
  switch (command) {
    case 'CLOCK_IN':
      if (result.data.command !== 'CLOCK_IN') throw internalAttendanceRouteError();
      return result.data;
    case 'START_BREAK':
      if (result.data.command !== 'START_BREAK') throw internalAttendanceRouteError();
      return result.data;
    case 'RESUME':
      if (result.data.command !== 'RESUME') throw internalAttendanceRouteError();
      return result.data;
    case 'CLOCK_OUT':
      if (result.data.command !== 'CLOCK_OUT') throw internalAttendanceRouteError();
      return result.data;
  }
}

function attendanceSuccessReply<Result extends AttendanceCommandResult>(
  reply: FastifyReply,
  data: Result,
  idempotentReplay: boolean,
  requestId: string,
) {
  reply.header('cache-control', 'private, no-store');
  return {
    data,
    meta: {
      ...(idempotentReplay ? { idempotentReplay: true } : {}),
      requestId,
    },
  };
}

function internalAttendanceRouteError(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
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
