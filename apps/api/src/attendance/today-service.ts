import type { TodayAttendance } from '@workledger/contracts';
import {
  addLocalDateDays,
  calculateCurrentDayAttendance,
  calculateTimeAccountLedger,
  floorInstantToMinute,
  localDateAtInstant,
  localDateInstantBounds,
  parseDomainId,
  parseSignedMinutes,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { selectTodayAttendanceDisplay } from './today-display.js';

export type TodayAttendanceIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export interface TodayAttendanceService {
  getToday(identity: TodayAttendanceIdentity, at: Instant): Promise<TodayAttendance>;
}

const zeroSignedMinutesResult = parseSignedMinutes(0);
if (!zeroSignedMinutesResult.ok) throw new Error('Zero minutes must be a valid domain value.');
const zeroSignedMinutes = zeroSignedMinutesResult.value;

export function createTodayAttendanceService(database: WorkLedgerDatabase): TodayAttendanceService {
  const service: TodayAttendanceService = {
    async getToday(identity, at) {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const employee = context.employee;
          if (employee === null) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }

          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) {
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          }
          const calculationAsOf = floorInstantToMinute(at);
          const localDate = localDateAtInstant(calculationAsOf, timeZone.value);
          const actor = {
            accountActive: context.accountActive,
            accountId: context.accountId,
            employeeCapabilityActive: context.employeeCapabilityActive,
            employeeId: employee.id,
            organizationId: context.organization.id,
            roles: context.roles,
          } as const;
          const authorizationInput = {
            actor,
            isCurrentManager: false,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: employee.id,
            targetOrganizationId: context.organization.id,
          } as const;
          const attendanceAuthorization = authorizeEmployeeTarget({
            ...authorizationInput,
            action: 'ATTENDANCE_READ',
          });
          const balanceAuthorization = authorizeEmployeeTarget({
            ...authorizationInput,
            action: 'TIME_BALANCE_READ',
          });
          if (!attendanceAuthorization.allowed || !balanceAuthorization.allowed) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }

          const bounds = localDateInstantBounds(localDate, timeZone.value);
          const source = await transaction.todayAttendance.loadSource({
            calculationAsOf,
            dayStartsAt: bounds.startsAt,
            employeeId: employee.id,
            localDate,
            organizationId: context.organization.id,
          });
          const postedThroughBoundary = addLocalDateDays(localDate, -1);
          const ledgerEntries = await transaction.timeAccount.listForEmployeeThroughSnapshot(
            context.organization.id,
            employee.id,
            postedThroughBoundary,
            at,
          );
          const ledger = calculateTimeAccountLedger({
            entries: ledgerEntries,
            openingBalanceMinutes: zeroSignedMinutes,
            organizationId: context.organization.id,
            subjectEmployeeId: employee.id,
          });
          if (!ledger.ok) {
            throw new WorkLedgerApiError({ code: ledger.error.code, statusCode: 503 });
          }
          const attendanceState = source.head?.state ?? 'OFF_WORK';
          const result = calculateCurrentDayAttendance({
            absenceCreditMinutes: source.absenceCreditMinutes,
            absenceExpectedReductionMinutes: source.absenceExpectedReductionMinutes,
            approvedAdjustmentMinutes: source.approvedAdjustmentMinutes,
            calculationAsOf,
            events: source.events.map(({ event }) => event),
            expectedState: attendanceState,
            hasSourceLedgerMismatch: false,
            hasUnresolvedApprovalRequiredAbsence: source.hasUnresolvedApprovalRequiredAbsence,
            hasUnresolvedCorrection: source.hasUnresolvedCorrection,
            isHoliday: source.holiday !== null,
            localDate,
            policyAssignments: source.policyAssignments,
            scheduleAssignments: source.scheduleAssignments,
            sourceTruncated: source.timelineTruncated,
            timeZone: timeZone.value,
            workDuringAbsence: false,
          });

          return selectTodayAttendanceDisplay({
            asOf: calculationAsOf,
            attendanceRevision: source.head?.attendanceRevision ?? 0,
            attendanceState,
            currentDay: result,
            flexNegativeThresholdMinutes: source.flexNegativeThresholdMinutes,
            flexPositiveThresholdMinutes: source.flexPositiveThresholdMinutes,
            holidayName: source.holiday?.name ?? null,
            localDate,
            postedFlexBalanceMinutes: ledger.value.closingBalanceMinutes,
            postedThroughDate: latestEffectiveDate(ledgerEntries),
            snapshotCapturedAt: at,
            timeZone: timeZone.value,
            timeline: source.events
              .filter(
                ({ event }) => localDateAtInstant(event.occurredAt, timeZone.value) === localDate,
              )
              .map(({ event, id }) =>
                Object.freeze({ id, occurredAt: event.occurredAt, type: event.type }),
              ),
            timelineTruncated: source.timelineTruncated,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  };
  return Object.freeze(service);
}

function latestEffectiveDate(
  entries: readonly Readonly<{ effectiveDate: LocalDate }>[],
): LocalDate | null {
  let latest: LocalDate | null = null;
  for (const entry of entries) {
    if (latest === null || entry.effectiveDate > latest) latest = entry.effectiveDate;
  }
  return latest;
}

export function parseTodayAttendanceIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): TodayAttendanceIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value, sessionFresh });
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
