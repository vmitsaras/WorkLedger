import type {
  AdministrationActionResult,
  CreateScheduleVersionAdminRequest,
  EmployeeScheduleAdminDetail,
  ReplaceScheduleAssignmentAdminRequest,
  TimeSettingsAdminDetail,
} from '@workledger/contracts';
import {
  findEffectiveAssignmentGaps,
  localDateAtInstant,
  parseNonNegativeMinutes,
  parseTimeZoneId,
  planEffectiveAssignmentTransition,
  type DomainId,
  type EffectiveAssignmentRecord,
  type EffectiveAssignmentTransition,
  type Instant,
  type LocalDate,
  type Weekday,
} from '@workledger/domain';
import type {
  AdministrationEmployeeScheduleRecord,
  AdministrationScheduleAssignmentRecord,
  AuthorizationActorRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { authorizeEmployeeTarget, authorizeInstallationAction } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type TimeAdministrationIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  fresh: boolean;
}>;

export function createTimeAdministrationService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async createScheduleVersion(
      identity: TimeAdministrationIdentity,
      input: CreateScheduleVersionAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const { actor, context } = await requireOrganizationConfiguration(
            transaction,
            identity,
            at,
          );
          const schedule = await transaction.administration.createScheduleVersion({
            name: input.name,
            organizationId: context.organization.id,
            scheduledMinutes: mapScheduledMinutes(input.scheduledMinutes),
          });
          if (schedule === null) {
            throw new WorkLedgerApiError({ code: 'SCHEDULE_VERSION_NO_CHANGE', statusCode: 409 });
          }
          await transaction.audit.appendDomain({
            actionCode: 'SCHEDULE_VERSION_CREATED',
            actor: hrAuditActor(actor),
            facts: { version: schedule.version },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: null,
            targetId: schedule.id,
            targetKind: 'CONFIGURATION',
          });
          return actionResult('SCHEDULE_VERSION_CREATED', schedule.id, at);
        }, serializableRetry);
      } catch (error) {
        throw mapScheduleDatabaseError(error);
      }
    },

    async getEmployeeSchedule(
      identity: TimeAdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      at: Instant,
    ): Promise<EmployeeScheduleAdminDetail> {
      return database.transaction(async (transaction) => {
        const { actor, context, localDate } = await requireEmployeeConfiguration(
          transaction,
          identity,
          employeeId,
          at,
          'EMPLOYEE_PROFILE_READ',
        );
        const record = await transaction.administration.findEmployeeSchedule(
          context.organization.id,
          employeeId,
        );
        if (record === null) {
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
        }
        return mapEmployeeSchedule(record, employeeId, localDate, actor.employeeId !== employeeId);
      });
    },

    async getTimeSettings(
      identity: TimeAdministrationIdentity,
      at: Instant,
    ): Promise<TimeSettingsAdminDetail> {
      return database.transaction(async (transaction) => {
        const { context } = await requireOrganizationConfiguration(transaction, identity, at);
        return Object.freeze({
          scheduleVersions: [
            ...(await transaction.administration.listScheduleVersions(context.organization.id)),
          ],
        });
      });
    },

    async replaceScheduleAssignment(
      identity: TimeAdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      input: ReplaceScheduleAssignmentAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const { actor, context, localDate } = await requireEmployeeConfiguration(
            transaction,
            identity,
            employeeId,
            at,
            'EMPLOYEE_CONFIGURATION_ASSIGN',
          );
          const record = await transaction.administration.findEmployeeSchedule(
            context.organization.id,
            employeeId,
          );
          if (record === null) {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
          }
          if (
            record.employeeStatus !== 'ACTIVE' ||
            !record.employmentHistory.some((period) =>
              contains(period, input.effectiveFrom as LocalDate),
            )
          ) {
            throw new WorkLedgerApiError({ code: 'EMPLOYEE_STATE_CONFLICT', statusCode: 409 });
          }
          const history = effectiveHistory(employeeId, record.history);
          const transition = planEffectiveAssignmentTransition(
            history,
            employeeId,
            localDate,
            input.effectiveFrom as LocalDate,
            input.scheduleId,
          );
          if (!transition.ok) throw assignmentPlanningError(transition.error.code);
          const prospective = applyTransition(history, employeeId, transition.value);
          const gaps = findEffectiveAssignmentGaps(
            prospective,
            employeeId,
            record.employmentHistory,
            localDate,
          );
          if (!gaps.ok) {
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          }
          if (gaps.value.length > 0) {
            throw new WorkLedgerApiError({ code: 'SCHEDULE_NOT_ASSIGNED', statusCode: 409 });
          }
          const assignmentId = await transaction.administration.applyScheduleAssignmentTransition({
            employeeId,
            organizationId: context.organization.id,
            transition: transition.value,
          });
          if (assignmentId === null) {
            throw new WorkLedgerApiError({ code: 'SCHEDULE_VERSION_CONFLICT', statusCode: 409 });
          }
          await transaction.audit.appendDomain({
            actionCode: 'SCHEDULE_ASSIGNMENT_CHANGED',
            actor: hrAuditActor(actor),
            facts: { effectiveDate: input.effectiveFrom as LocalDate, nextStatus: 'ASSIGNED' },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: employeeId,
            targetId: assignmentId,
            targetKind: 'ASSIGNMENT',
          });
          return actionResult('SCHEDULE_ASSIGNMENT_CHANGED', assignmentId, at);
        }, serializableRetry);
      } catch (error) {
        throw mapScheduleDatabaseError(error);
      }
    },
  });
}

async function requireContext(
  transaction: WorkLedgerTransaction,
  identity: TimeAdministrationIdentity,
  at: Instant,
) {
  const context = await transaction.accountSelfService.findContext(identity.accountId, at);
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

async function requireOrganizationConfiguration(
  transaction: WorkLedgerTransaction,
  identity: TimeAdministrationIdentity,
  at: Instant,
) {
  const context = await requireContext(transaction, identity, at);
  const localDate = organizationLocalDate(at, context.organization.timeZone);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    identity.accountId,
    localDate,
  );
  if (
    actor === null ||
    !authorizeInstallationAction('ORGANIZATION_CONFIGURATION_MANAGE', actor).allowed
  ) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  return { actor, context, localDate } as const;
}

async function requireEmployeeConfiguration(
  transaction: WorkLedgerTransaction,
  identity: TimeAdministrationIdentity,
  employeeId: DomainId<'Employee'>,
  at: Instant,
  action: 'EMPLOYEE_CONFIGURATION_ASSIGN' | 'EMPLOYEE_PROFILE_READ',
) {
  const context = await requireContext(transaction, identity, at);
  const localDate = organizationLocalDate(at, context.organization.timeZone);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    identity.accountId,
    localDate,
  );
  if (actor === null) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  const decision = authorizeEmployeeTarget({
    action,
    actor,
    isCurrentManager: false,
    sessionFresh: identity.fresh,
    targetEmployeeId: employeeId,
    targetOrganizationId: context.organization.id,
  });
  if (!decision.allowed) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return { actor, context, localDate } as const;
}

function mapEmployeeSchedule(
  record: AdministrationEmployeeScheduleRecord,
  employeeId: DomainId<'Employee'>,
  localDate: LocalDate,
  privilegedActionsAllowed: boolean,
): EmployeeScheduleAdminDetail {
  const history = effectiveHistory(employeeId, record.history);
  const gaps = findEffectiveAssignmentGaps(
    history,
    employeeId,
    record.employmentHistory,
    localDate,
  );
  if (!gaps.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return Object.freeze({
    asOfLocalDate: localDate,
    assignableSchedules: [...record.schedules],
    coverageGaps: [...gaps.value],
    currentAssignment: record.history.find((assignment) => contains(assignment, localDate)) ?? null,
    history: [...record.history],
    privilegedActionsAllowed,
  });
}

function effectiveHistory(
  employeeId: DomainId<'Employee'>,
  history: readonly AdministrationScheduleAssignmentRecord[],
): readonly EffectiveAssignmentRecord[] {
  return history.map((assignment) => ({
    endsOn: assignment.endsOn,
    id: assignment.id,
    startsOn: assignment.startsOn,
    subjectId: employeeId,
    targetId: assignment.schedule.id,
  }));
}

function applyTransition(
  history: readonly EffectiveAssignmentRecord[],
  employeeId: DomainId<'Employee'>,
  transition: EffectiveAssignmentTransition,
): readonly EffectiveAssignmentRecord[] {
  const next = history.map((assignment) =>
    assignment.id === transition.closeAssignmentId
      ? Object.freeze({ ...assignment, endsOn: transition.effectiveFrom })
      : assignment,
  );
  if (transition.insert !== null) {
    next.push(
      Object.freeze({
        endsOn: transition.insert.endsOn,
        id: `prospective:${transition.effectiveFrom}`,
        startsOn: transition.effectiveFrom,
        subjectId: employeeId,
        targetId: transition.insert.targetId,
      }),
    );
  }
  return Object.freeze(next);
}

function mapScheduledMinutes(
  input: CreateScheduleVersionAdminRequest['scheduledMinutes'],
): Readonly<Record<Weekday, ReturnType<typeof parseMinutes>>> {
  return Object.freeze({
    FRIDAY: parseMinutes(input.FRIDAY),
    MONDAY: parseMinutes(input.MONDAY),
    SATURDAY: parseMinutes(input.SATURDAY),
    SUNDAY: parseMinutes(input.SUNDAY),
    THURSDAY: parseMinutes(input.THURSDAY),
    TUESDAY: parseMinutes(input.TUESDAY),
    WEDNESDAY: parseMinutes(input.WEDNESDAY),
  });
}

function parseMinutes(value: number) {
  const parsed = parseNonNegativeMinutes(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.value;
}

function contains(
  range: Readonly<{ endsOn: LocalDate | null; startsOn: LocalDate }>,
  localDate: LocalDate,
) {
  return range.startsOn <= localDate && (range.endsOn === null || localDate < range.endsOn);
}

function organizationLocalDate(at: Instant, timeZoneValue: string): LocalDate {
  const timeZone = parseTimeZoneId(timeZoneValue);
  if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return localDateAtInstant(at, timeZone.value);
}

function assignmentPlanningError(
  code:
    | 'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST'
    | 'EFFECTIVE_ASSIGNMENT_HISTORY_INVALID'
    | 'EFFECTIVE_ASSIGNMENT_NO_CHANGE'
    | 'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT',
) {
  if (
    code === 'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST' ||
    code === 'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT'
  ) {
    return new WorkLedgerApiError({ code: 'ASSIGNMENT_EFFECTIVE_DATE_INVALID', statusCode: 409 });
  }
  return new WorkLedgerApiError({
    code:
      code === 'EFFECTIVE_ASSIGNMENT_NO_CHANGE' ? 'ASSIGNMENT_STATE_CONFLICT' : 'INTERNAL_ERROR',
    statusCode: code === 'EFFECTIVE_ASSIGNMENT_NO_CHANGE' ? 409 : 503,
  });
}

function actionResult(
  action: AdministrationActionResult['action'],
  targetId: string,
  occurredAt: Instant,
): AdministrationActionResult {
  return Object.freeze({ action, occurredAt, targetId });
}

function hrAuditActor(actor: AuthorizationActorRecord) {
  return Object.freeze({
    accountId: actor.accountId,
    kind: 'ACCOUNT' as const,
    role: 'HR_ADMINISTRATOR' as const,
  });
}

function mapScheduleDatabaseError(error: unknown): Error {
  const candidate = databaseError(error);
  if (
    candidate?.code === '23505' &&
    candidate.constraint === 'weekly_schedules_organization_name_version_uidx'
  ) {
    return new WorkLedgerApiError({ code: 'SCHEDULE_VERSION_CONFLICT', statusCode: 409 });
  }
  if (candidate?.code === '23P01' && candidate.constraint === 'schedule_assignments_no_overlap') {
    return new WorkLedgerApiError({ code: 'SCHEDULE_ASSIGNMENT_OVERLAP', statusCode: 409 });
  }
  return error instanceof Error
    ? error
    : new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}

function databaseError(
  error: unknown,
): Readonly<{ code?: string; constraint?: string }> | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth += 1) {
    const value = current as { cause?: unknown; code?: unknown; constraint?: unknown };
    if (typeof value.code === 'string') {
      return {
        code: value.code,
        ...(typeof value.constraint === 'string' ? { constraint: value.constraint } : {}),
      };
    }
    current = value.cause;
  }
  return undefined;
}

const serializableRetry = Object.freeze({
  isolationLevel: 'serializable' as const,
  retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' as const },
});
