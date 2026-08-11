import { createHash, randomUUID } from 'node:crypto';

import {
  apiErrorCodeSchema,
  clockInResultSchema,
  type ApiErrorCode,
  type ApiRecoveryContext,
  type ClockInRequest,
  type ClockInResult,
} from '@workledger/contracts';
import {
  compareInstants,
  floorInstantToMinute,
  parseDomainId,
  parseInstant,
  validAttendanceActions,
  validateAttendanceTransition,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  ApplicationRole,
  AttendanceIdempotencyErrorSnapshot,
  AttendanceIdempotencyOutcome,
  AttendanceIdempotencySuccessSnapshot,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type ClockInIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export type ClockInCommand = ClockInRequest &
  Readonly<{
    idempotencyKey: string;
    requestId: DomainId<'Request'>;
    requestedAt: Instant;
  }>;

export type ClockInOperationResult =
  | Readonly<{
      data: ClockInResult;
      idempotentReplay: boolean;
      kind: 'SUCCESS';
    }>
  | Readonly<{
      code: ApiErrorCode;
      context?: ApiRecoveryContext;
      idempotentReplay: boolean;
      kind: 'ERROR';
    }>;

export interface ClockInService {
  authorize(identity: ClockInIdentity, at: Instant): Promise<void>;
  clockIn(identity: ClockInIdentity, command: ClockInCommand): Promise<ClockInOperationResult>;
}

export function createClockInService(
  database: WorkLedgerDatabase,
  now: () => string,
): ClockInService {
  const service: ClockInService = {
    async authorize(identity, at) {
      await database.transaction(async (transaction) => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        requireClockInAuthorization(context, identity);
      });
    },

    async clockIn(identity, command) {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(
              identity.accountId,
              command.requestedAt,
            ),
          );
          requireClockInAuthorization(context, identity);
          const employee = context.employee;
          if (employee === null) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }
          const requestFingerprint = createClockInFingerprint({
            actorAccountId: context.accountId,
            employeeId: employee.id,
            expectedAttendanceRevision: command.expectedAttendanceRevision,
            organizationId: context.organization.id,
          });
          const claim = await transaction.attendanceIdempotency.claim({
            actorAccountId: context.accountId,
            command: 'CLOCK_IN',
            employeeId: employee.id,
            idempotencyKey: command.idempotencyKey,
            organizationId: context.organization.id,
            requestFingerprint,
          });

          if (claim.kind === 'CONFLICT') {
            return Object.freeze({
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              idempotentReplay: false,
              kind: 'ERROR',
            });
          }
          if (claim.kind === 'REPLAY') return replayClockInOutcome(claim);

          await transaction.attendance.ensureHead(context.organization.id, employee.id);
          const head = await transaction.attendance.lockHead(context.organization.id, employee.id);
          if (head === null) throw internalClockInError();

          if (head.attendanceRevision !== command.expectedAttendanceRevision) {
            return completeClockInError(transaction, {
              claimId: claim.recordId,
              code: 'ATTENDANCE_STATE_CHANGED',
              completedAt: requireServiceInstant(now()),
              currentState: head.state,
              requestFingerprint,
              attendanceRevision: head.attendanceRevision,
              validActions: validAttendanceActions(head.state),
            });
          }

          const transition = validateAttendanceTransition(head.state, { command: 'CLOCK_IN' });
          if (!transition.ok) {
            return completeClockInError(transaction, {
              claimId: claim.recordId,
              code: transition.error.code,
              completedAt: requireServiceInstant(now()),
              currentState: head.state,
              requestFingerprint,
              attendanceRevision: head.attendanceRevision,
              validActions: validAttendanceActions(head.state),
            });
          }

          const latestEvent = await transaction.attendance.findLatestPunchEvent(
            context.organization.id,
            employee.id,
          );
          if ((latestEvent?.event.eventSequence ?? 0) !== head.nextEventSequence - 1) {
            throw internalClockInError();
          }
          const parsedOccurrence = parseInstant(now());
          if (!parsedOccurrence.ok) throw internalClockInError();
          const occurredAt = floorInstantToMinute(parsedOccurrence.value);
          if (
            latestEvent !== null &&
            compareInstants(occurredAt, latestEvent.event.occurredAt) < 0
          ) {
            throw internalClockInError();
          }

          const commandId = parseDomainId<'AttendanceCommand'>(randomUUID());
          if (!commandId.ok) throw internalClockInError();
          const storedEvents = await transaction.attendance.appendPunchEvents(
            context.organization.id,
            employee.id,
            transition.value.eventTypes.map((type, index) => ({
              actorEmployeeId: employee.id,
              commandId: commandId.value,
              event: Object.freeze({
                eventSequence: head.nextEventSequence + index,
                occurredAt,
                type,
              }),
            })),
          );
          const advancedHead = await transaction.attendance.advanceHead({
            appendedEventCount: storedEvents.length,
            employeeId: employee.id,
            expectedAttendanceRevision: head.attendanceRevision,
            expectedNextEventSequence: head.nextEventSequence,
            nextState: transition.value.nextState,
            organizationId: context.organization.id,
          });
          if (advancedHead === null || storedEvents.length !== 1) throw internalClockInError();

          await transaction.audit.appendDomain({
            actionCode: 'ATTENDANCE_CLOCK_IN',
            actor: {
              accountId: context.accountId,
              kind: 'ACCOUNT',
              role: attendanceActorRole(context.roles),
            },
            facts: {
              attendanceRevision: advancedHead.attendanceRevision,
              eventCount: storedEvents.length,
              nextStatus: advancedHead.state,
              previousStatus: head.state,
            },
            occurredAt,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: false,
            reasonCode: null,
            requestId: command.requestId,
            restrictedReasonId: null,
            subjectEmployeeId: employee.id,
            targetId: employee.id,
            targetKind: 'ATTENDANCE',
          });

          const outcome: AttendanceIdempotencyOutcome = Object.freeze({
            kind: 'SUCCESS',
            data: Object.freeze({
              attendanceRevision: advancedHead.attendanceRevision,
              command: 'CLOCK_IN',
              createdEvents: Object.freeze(
                storedEvents.map((event) =>
                  Object.freeze({ id: event.id, type: event.event.type }),
                ),
              ),
              occurredAt,
              resultingState: advancedHead.state,
              validActions: Object.freeze([...validAttendanceActions(advancedHead.state)]),
            }),
          });
          if (
            !(await transaction.attendanceIdempotency.complete({
              command: 'CLOCK_IN',
              completedAt: parsedOccurrence.value,
              originalHttpStatus: 200,
              outcome,
              recordId: claim.recordId,
              requestFingerprint,
            }))
          ) {
            throw internalClockInError();
          }

          return successfulClockIn(outcome.data, false);
        },
        {
          isolationLevel: 'serializable',
          retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' },
        },
      );
    },
  };
  return Object.freeze(service);
}

export function parseClockInIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): ClockInIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

export function parseClockInRequestId(value: string): DomainId<'Request'> {
  const requestId = parseDomainId<'Request'>(value);
  if (!requestId.ok) throw internalClockInError();
  return requestId.value;
}

function createClockInFingerprint(
  input: Readonly<{
    actorAccountId: DomainId<'Account'>;
    employeeId: DomainId<'Employee'>;
    expectedAttendanceRevision: number;
    organizationId: DomainId<'Organization'>;
  }>,
): string {
  const canonical = JSON.stringify({
    actorAccountId: input.actorAccountId,
    body: { expectedAttendanceRevision: input.expectedAttendanceRevision },
    command: 'CLOCK_IN',
    employeeId: input.employeeId,
    method: 'POST',
    organizationId: input.organizationId,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

async function completeClockInError(
  transaction: WorkLedgerTransaction,
  input: Readonly<{
    attendanceRevision: number;
    claimId: DomainId<'IdempotencyRecord'>;
    code: string;
    completedAt: Instant;
    currentState: NonNullable<AttendanceIdempotencyErrorSnapshot['currentState']>;
    requestFingerprint: string;
    validActions: NonNullable<AttendanceIdempotencyErrorSnapshot['validActions']>;
  }>,
): Promise<ClockInOperationResult> {
  const error = Object.freeze({
    attendanceRevision: input.attendanceRevision,
    code: input.code,
    currentState: input.currentState,
    validActions: Object.freeze([...input.validActions]),
  });
  const outcome: AttendanceIdempotencyOutcome = Object.freeze({ kind: 'ERROR', error });
  if (
    !(await transaction.attendanceIdempotency.complete({
      command: 'CLOCK_IN',
      completedAt: input.completedAt,
      originalHttpStatus: 409,
      outcome,
      recordId: input.claimId,
      requestFingerprint: input.requestFingerprint,
    }))
  ) {
    throw internalClockInError();
  }
  return failedClockIn(error, false);
}

function replayClockInOutcome(
  claim: Readonly<{
    originalHttpStatus: number;
    outcome: AttendanceIdempotencyOutcome;
  }>,
): ClockInOperationResult {
  if (claim.outcome.kind === 'SUCCESS' && claim.originalHttpStatus === 200) {
    return successfulClockIn(claim.outcome.data, true);
  }
  if (claim.outcome.kind === 'ERROR' && claim.originalHttpStatus === 409) {
    return failedClockIn(claim.outcome.error, true);
  }
  throw internalClockInError();
}

function successfulClockIn(
  snapshot: AttendanceIdempotencySuccessSnapshot,
  idempotentReplay: boolean,
): ClockInOperationResult {
  const result = clockInResultSchema.safeParse(snapshot);
  if (!result.success) throw internalClockInError();
  return Object.freeze({ data: result.data, idempotentReplay, kind: 'SUCCESS' });
}

function failedClockIn(
  snapshot: AttendanceIdempotencyErrorSnapshot,
  idempotentReplay: boolean,
): ClockInOperationResult {
  const parsedCode = apiErrorCodeSchema.safeParse(snapshot.code);
  if (!parsedCode.success) throw internalClockInError();
  return Object.freeze({
    code: parsedCode.data,
    context: Object.freeze({
      ...(snapshot.attendanceRevision === undefined
        ? {}
        : { attendanceRevision: snapshot.attendanceRevision }),
      ...(snapshot.currentState === undefined ? {} : { currentState: snapshot.currentState }),
      ...(snapshot.requiresBreakConfirmation === undefined
        ? {}
        : { requiresBreakConfirmation: snapshot.requiresBreakConfirmation }),
      ...(snapshot.validActions === undefined ? {} : { validActions: [...snapshot.validActions] }),
    }),
    idempotentReplay,
    kind: 'ERROR',
  });
}

function requireActiveEmployeeContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE') {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  return context;
}

function requireClockInAuthorization(
  context: AccountSelfContextRecord,
  identity: ClockInIdentity,
): void {
  const employee = context.employee;
  if (employee === null) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  const authorization = authorizeEmployeeTarget({
    action: 'ATTENDANCE_CLOCK',
    actor: {
      accountActive: context.accountActive,
      accountId: context.accountId,
      employeeCapabilityActive: context.employeeCapabilityActive,
      employeeId: employee.id,
      organizationId: context.organization.id,
      roles: context.roles,
    },
    isCurrentManager: false,
    sessionFresh: identity.sessionFresh,
    targetEmployeeId: employee.id,
    targetOrganizationId: context.organization.id,
  });
  if (!authorization.allowed) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
}

function attendanceActorRole(roles: readonly ApplicationRole[]): ApplicationRole | null {
  return (
    (['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR'] as const).find((role) => roles.includes(role)) ??
    null
  );
}

function internalClockInError(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}

function requireServiceInstant(value: string): Instant {
  const instant = parseInstant(value);
  if (!instant.ok) throw internalClockInError();
  return instant.value;
}
