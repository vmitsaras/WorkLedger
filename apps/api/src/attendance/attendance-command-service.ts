import { createHash, randomUUID } from 'node:crypto';

import {
  apiErrorCodeSchema,
  attendanceCommandResultSchema,
  type ApiErrorCode,
  type ApiRecoveryContext,
  type AttendanceCommand,
  type AttendanceCommandResult,
} from '@workledger/contracts';
import {
  compareInstants,
  floorInstantToMinute,
  parseDomainId,
  parseInstant,
  validAttendanceActions,
  validateAttendanceTransition,
  type AttendanceCommandInput,
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

export type AttendanceCommandIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export type ExecuteAttendanceCommand = AttendanceCommandInput &
  Readonly<{
    expectedAttendanceRevision: number;
    idempotencyKey: string;
    requestId: DomainId<'Request'>;
    requestedAt: Instant;
  }>;

export type AttendanceCommandOperationResult =
  | Readonly<{
      data: AttendanceCommandResult;
      idempotentReplay: boolean;
      kind: 'SUCCESS';
    }>
  | Readonly<{
      code: ApiErrorCode;
      context?: ApiRecoveryContext;
      idempotentReplay: boolean;
      kind: 'ERROR';
    }>;

export interface AttendanceCommandService {
  authorize(identity: AttendanceCommandIdentity, at: Instant): Promise<void>;
  execute(
    identity: AttendanceCommandIdentity,
    command: ExecuteAttendanceCommand,
  ): Promise<AttendanceCommandOperationResult>;
}

const AUDIT_ACTIONS: Readonly<Record<AttendanceCommand, string>> = Object.freeze({
  CLOCK_IN: 'ATTENDANCE_CLOCK_IN',
  CLOCK_OUT: 'ATTENDANCE_CLOCK_OUT',
  RESUME: 'ATTENDANCE_RESUME',
  START_BREAK: 'ATTENDANCE_START_BREAK',
});

export function createAttendanceCommandService(
  database: WorkLedgerDatabase,
  now: () => string,
): AttendanceCommandService {
  const service: AttendanceCommandService = {
    async authorize(identity, at) {
      await database.transaction(async (transaction) => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        requireAttendanceAuthorization(context, identity);
      });
    },

    async execute(identity, command) {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(
              identity.accountId,
              command.requestedAt,
            ),
          );
          requireAttendanceAuthorization(context, identity);
          const employee = context.employee;
          if (employee === null) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }
          const requestFingerprint = createAttendanceFingerprint({
            actorAccountId: context.accountId,
            command,
            employeeId: employee.id,
            organizationId: context.organization.id,
          });
          const claim = await transaction.attendanceIdempotency.claim({
            actorAccountId: context.accountId,
            command: command.command,
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
          if (claim.kind === 'REPLAY') return replayAttendanceOutcome(claim, command.command);

          await transaction.attendance.ensureHead(context.organization.id, employee.id);
          const head = await transaction.attendance.lockHead(context.organization.id, employee.id);
          if (head === null) throw internalAttendanceError();

          if (head.attendanceRevision !== command.expectedAttendanceRevision) {
            return completeAttendanceError(transaction, {
              attendanceRevision: head.attendanceRevision,
              claimId: claim.recordId,
              code: 'ATTENDANCE_STATE_CHANGED',
              command: command.command,
              completedAt: requireServiceInstant(now()),
              currentState: head.state,
              requestFingerprint,
              validActions: validAttendanceActions(head.state),
            });
          }

          const transition = validateAttendanceTransition(head.state, transitionInput(command));
          if (!transition.ok) {
            return completeAttendanceError(transaction, {
              attendanceRevision: head.attendanceRevision,
              claimId: claim.recordId,
              code: transition.error.code,
              command: command.command,
              completedAt: requireServiceInstant(now()),
              currentState: head.state,
              ...(transition.error.code === 'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED'
                ? { requiresBreakConfirmation: true }
                : {}),
              requestFingerprint,
              validActions: validAttendanceActions(head.state),
            });
          }

          const latestEvent = await transaction.attendance.findLatestPunchEvent(
            context.organization.id,
            employee.id,
          );
          if ((latestEvent?.event.eventSequence ?? 0) !== head.nextEventSequence - 1) {
            throw internalAttendanceError();
          }
          const parsedOccurrence = parseInstant(now());
          if (!parsedOccurrence.ok) throw internalAttendanceError();
          const occurredAt = floorInstantToMinute(parsedOccurrence.value);
          if (
            latestEvent !== null &&
            compareInstants(occurredAt, latestEvent.event.occurredAt) < 0
          ) {
            throw internalAttendanceError();
          }

          const commandId = parseDomainId<'AttendanceCommand'>(randomUUID());
          if (!commandId.ok) throw internalAttendanceError();
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
          if (advancedHead === null || storedEvents.length !== transition.value.eventTypes.length) {
            throw internalAttendanceError();
          }

          await transaction.audit.appendDomain({
            actionCode: AUDIT_ACTIONS[command.command],
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
              command: command.command,
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
              command: command.command,
              completedAt: parsedOccurrence.value,
              originalHttpStatus: 200,
              outcome,
              recordId: claim.recordId,
              requestFingerprint,
            }))
          ) {
            throw internalAttendanceError();
          }

          return successfulAttendance(outcome.data, command.command, false);
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

export function parseAttendanceCommandIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): AttendanceCommandIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

export function parseAttendanceCommandRequestId(value: string): DomainId<'Request'> {
  const requestId = parseDomainId<'Request'>(value);
  if (!requestId.ok) throw internalAttendanceError();
  return requestId.value;
}

function transitionInput(command: ExecuteAttendanceCommand): AttendanceCommandInput {
  return command.command === 'CLOCK_OUT'
    ? Object.freeze({
        command: command.command,
        ...(command.confirmActiveBreak === undefined
          ? {}
          : { confirmActiveBreak: command.confirmActiveBreak }),
      })
    : Object.freeze({ command: command.command });
}

function createAttendanceFingerprint(
  input: Readonly<{
    actorAccountId: DomainId<'Account'>;
    command: ExecuteAttendanceCommand;
    employeeId: DomainId<'Employee'>;
    organizationId: DomainId<'Organization'>;
  }>,
): string {
  const body =
    input.command.command === 'CLOCK_OUT'
      ? {
          confirmActiveBreak: input.command.confirmActiveBreak ?? false,
          expectedAttendanceRevision: input.command.expectedAttendanceRevision,
        }
      : { expectedAttendanceRevision: input.command.expectedAttendanceRevision };
  const canonical = JSON.stringify({
    actorAccountId: input.actorAccountId,
    body,
    command: input.command.command,
    employeeId: input.employeeId,
    method: 'POST',
    organizationId: input.organizationId,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

async function completeAttendanceError(
  transaction: WorkLedgerTransaction,
  input: Readonly<{
    attendanceRevision: number;
    claimId: DomainId<'IdempotencyRecord'>;
    code: string;
    command: AttendanceCommand;
    completedAt: Instant;
    currentState: NonNullable<AttendanceIdempotencyErrorSnapshot['currentState']>;
    requestFingerprint: string;
    requiresBreakConfirmation?: boolean;
    validActions: NonNullable<AttendanceIdempotencyErrorSnapshot['validActions']>;
  }>,
): Promise<AttendanceCommandOperationResult> {
  const error = Object.freeze({
    attendanceRevision: input.attendanceRevision,
    code: input.code,
    currentState: input.currentState,
    ...(input.requiresBreakConfirmation === undefined
      ? {}
      : { requiresBreakConfirmation: input.requiresBreakConfirmation }),
    validActions: Object.freeze([...input.validActions]),
  });
  const outcome: AttendanceIdempotencyOutcome = Object.freeze({ kind: 'ERROR', error });
  if (
    !(await transaction.attendanceIdempotency.complete({
      command: input.command,
      completedAt: input.completedAt,
      originalHttpStatus: 409,
      outcome,
      recordId: input.claimId,
      requestFingerprint: input.requestFingerprint,
    }))
  ) {
    throw internalAttendanceError();
  }
  return failedAttendance(error, false);
}

function replayAttendanceOutcome(
  claim: Readonly<{
    originalHttpStatus: number;
    outcome: AttendanceIdempotencyOutcome;
  }>,
  command: AttendanceCommand,
): AttendanceCommandOperationResult {
  if (claim.outcome.kind === 'SUCCESS' && claim.originalHttpStatus === 200) {
    return successfulAttendance(claim.outcome.data, command, true);
  }
  if (claim.outcome.kind === 'ERROR' && claim.originalHttpStatus === 409) {
    return failedAttendance(claim.outcome.error, true);
  }
  throw internalAttendanceError();
}

function successfulAttendance(
  snapshot: AttendanceIdempotencySuccessSnapshot,
  command: AttendanceCommand,
  idempotentReplay: boolean,
): AttendanceCommandOperationResult {
  const result = attendanceCommandResultSchema.safeParse(snapshot);
  if (!result.success || result.data.command !== command) throw internalAttendanceError();
  return Object.freeze({ data: result.data, idempotentReplay, kind: 'SUCCESS' });
}

function failedAttendance(
  snapshot: AttendanceIdempotencyErrorSnapshot,
  idempotentReplay: boolean,
): AttendanceCommandOperationResult {
  const parsedCode = apiErrorCodeSchema.safeParse(snapshot.code);
  if (!parsedCode.success) throw internalAttendanceError();
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

function requireAttendanceAuthorization(
  context: AccountSelfContextRecord,
  identity: AttendanceCommandIdentity,
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

function internalAttendanceError(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}

function requireServiceInstant(value: string): Instant {
  const instant = parseInstant(value);
  if (!instant.ok) throw internalAttendanceError();
  return instant.value;
}
