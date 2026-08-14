import {
  elapsedMinutesBetweenInstants,
  localDateInstantBounds,
  parseDomainId,
  parseLocalDate,
  parseTimeZoneId,
  reconstructAttendance,
  validateManualAttendanceInterval,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';
import type { SubmitCorrectionRequest, SubmittedCorrectionRequest } from '@workledger/contracts';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { assertMonthlyPeriodAllowsOrdinaryMutation } from '../monthly/period-protection.js';

export type CorrectionRequestIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export interface CorrectionRequestService {
  submit(
    identity: CorrectionRequestIdentity,
    input: SubmitCorrectionRequest,
    at: Instant,
  ): Promise<SubmittedCorrectionRequest>;
}

export function createCorrectionRequestService(
  database: WorkLedgerDatabase,
): CorrectionRequestService {
  return Object.freeze({
    async submit(
      identity: CorrectionRequestIdentity,
      input: SubmitCorrectionRequest,
      at: Instant,
    ): Promise<SubmittedCorrectionRequest> {
      return database.transaction(async (transaction) => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const employee = context.employee;
        if (employee === null)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        const authorization = authorizeEmployeeTarget({
          action: 'CORRECTION_SUBMIT',
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
        if (!authorization.allowed)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });

        const projectionId = parseCorrectionRecordId(input.recordId);
        const projection = await transaction.dailyProjections.findForEmployee(
          context.organization.id,
          employee.id,
          projectionId,
        );
        if (projection === null)
          throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
        const monthStart = parseLocalDate(`${projection.localDate.slice(0, 7)}-01`);
        if (!monthStart.ok)
          throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
        const monthlyPeriod = await transaction.monthlyPeriods.findByEmployeeMonth(
          context.organization.id,
          employee.id,
          monthStart.value,
        );
        let lockedMonthlySnapshotId: DomainId<'MonthlySnapshot'> | null = null;
        if (monthlyPeriod?.status === 'LOCKED') {
          const snapshot = await transaction.monthlyPeriods.findLatestSnapshot(
            context.organization.id,
            monthlyPeriod.id,
          );
          if (snapshot === null)
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          lockedMonthlySnapshotId = snapshot.id;
        } else {
          await assertMonthlyPeriodAllowsOrdinaryMutation(
            transaction,
            context.organization.id,
            employee.id,
            projection.localDate,
            projection.localDate,
          );
        }

        const timeZone = parseTimeZoneId(context.organization.timeZone);
        if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
        const proposed = validateManualAttendanceInterval(
          {
            endsAt: {
              localDate: projection.localDate,
              localTime: input.interval.endsAtLocalTime,
              utcOffset: input.interval.endsAtUtcOffset,
            },
            startsAt: {
              localDate: projection.localDate,
              localTime: input.interval.startsAtLocalTime,
              utcOffset: input.interval.startsAtUtcOffset,
            },
          },
          timeZone.value,
          at,
        );
        if (!proposed.ok) throw validationErrorForInterval(proposed.error);

        const bounds = localDateInstantBounds(projection.localDate, timeZone.value);
        const events = await transaction.attendance.listPunchEventsUntil(
          context.organization.id,
          employee.id,
          bounds.endsAt,
        );
        const reconstruction = reconstructAttendance(events.map(({ event }) => event));
        const recordEvents = events
          .filter(
            ({ event }) => event.occurredAt >= bounds.startsAt && event.occurredAt < bounds.endsAt,
          )
          .map(({ event }) =>
            Object.freeze({
              occurredAt: event.occurredAt,
              sequence: event.eventSequence,
              type: event.type,
            }),
          );
        const submitted = await transaction.correctionRequests.submit({
          employeeId: employee.id,
          localDate: projection.localDate,
          lockedMonthlySnapshotId,
          organizationId: context.organization.id,
          originalInterpretation: Object.freeze({
            calculation: Object.freeze({
              balanceMinutes: projection.balanceMinutes,
              breakMinutes: projection.breakMinutes,
              creditedMinutes: projection.creditedMinutes,
              expectedMinutes: projection.expectedMinutes,
              workedMinutes: projection.workedMinutes,
            }),
            events: Object.freeze(recordEvents),
            projectionId: projection.id,
            projectionVersion: projection.projectionVersion,
            reconstructionStatus: reconstruction.ok ? 'VALID' : reconstruction.error.code,
          }),
          proposedInterpretation: Object.freeze({
            endsAt: proposed.value.endsAt,
            kind: 'REPLACE_DAILY_WORK_INTERVAL',
            startsAt: proposed.value.startsAt,
          }),
          reason: input.reason.trim(),
          requestedByEmployeeId: employee.id,
          status: 'SUBMITTED',
          version: 1,
        });
        await transaction.audit.appendDomain({
          actionCode: 'CORRECTION_REQUEST_SUBMITTED',
          actor: {
            accountId: context.accountId,
            kind: 'ACCOUNT',
            role: auditRole(context.roles),
          },
          facts: {
            effectiveDate: projection.localDate,
            sourceCount: recordEvents.length,
            version: submitted.version,
          },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: false,
          reasonCode: 'EMPLOYEE_SUBMITTED',
          requestId: null,
          restrictedReasonId: null,
          subjectEmployeeId: employee.id,
          targetId: submitted.id,
          targetKind: 'CORRECTION_REQUEST',
        });
        return Object.freeze({
          applicationMode:
            lockedMonthlySnapshotId === null
              ? ('ORDINARY_CORRECTION' as const)
              : ('POST_LOCK_ADJUSTMENT' as const),
          id: submitted.id,
          localDate: submitted.localDate,
          proposedDurationMinutes: elapsedMinutesBetweenInstants(
            proposed.value.startsAt,
            proposed.value.endsAt,
          ),
          status: 'SUBMITTED' as const,
          submittedAt: submitted.createdAt,
        });
      });
    },
  });
}

export function parseCorrectionRequestIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): CorrectionRequestIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

function parseCorrectionRecordId(value: string): DomainId<'DailyProjection'> {
  const parsed = parseDomainId<'DailyProjection'>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return parsed.value;
}

function requireActiveEmployeeContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE')
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return context;
}

function validationErrorForInterval(
  error: Readonly<{ code: string; validUtcOffsets?: readonly string[] }>,
) {
  const field = error.code === 'ATTENDANCE_AMBIGUOUS_LOCAL_TIME' ? 'interval' : 'interval';
  const message =
    error.code === 'ATTENDANCE_AMBIGUOUS_LOCAL_TIME'
      ? `Choose a UTC offset for the repeated local time: ${error.validUtcOffsets?.join(' or ') ?? 'available offsets'}.`
      : error.code === 'ATTENDANCE_NONEXISTENT_LOCAL_TIME'
        ? 'This local time does not exist because of a daylight-saving change.'
        : error.code === 'ATTENDANCE_FUTURE_EVENT'
          ? 'The proposed interval cannot be in the future.'
          : error.code === 'ATTENDANCE_INVALID_EVENT_ORDER'
            ? 'The end time must be after the start time.'
            : 'Use valid minute-precision local times.';
  throw new WorkLedgerApiError({
    code: 'VALIDATION_FAILED',
    fields: { [field]: [{ code: 'INVALID_VALUE', message }] },
    statusCode: 422,
  });
}

function auditRole(
  roles: readonly ('EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR')[],
) {
  if (roles.includes('EMPLOYEE')) return 'EMPLOYEE' as const;
  if (roles.includes('MANAGER')) return 'MANAGER' as const;
  if (roles.includes('HR_ADMINISTRATOR')) return 'HR_ADMINISTRATOR' as const;
  return null;
}
