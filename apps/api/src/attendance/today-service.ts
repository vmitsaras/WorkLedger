import type { TodayAttendance } from '@workledger/contracts';
import {
  calculateCurrentDayAttendance,
  floorInstantToMinute,
  localDateAtInstant,
  localDateInstantBounds,
  parseDomainId,
  parseSignedMinutes,
  parseTimeZoneId,
  validAttendanceActions,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

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
      return database.transaction(async (transaction) => {
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
        const authorization = authorizeEmployeeTarget({
          action: 'ATTENDANCE_READ',
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

        const bounds = localDateInstantBounds(localDate, timeZone.value);
        const source = await transaction.todayAttendance.loadSource({
          calculationAsOf,
          dayStartsAt: bounds.startsAt,
          employeeId: employee.id,
          localDate,
          organizationId: context.organization.id,
        });
        const attendanceState = source.head?.state ?? 'OFF_WORK';
        const result = calculateCurrentDayAttendance({
          absenceCreditMinutes: source.absenceCreditMinutes,
          absenceExpectedReductionMinutes: source.absenceExpectedReductionMinutes,
          approvedAdjustmentMinutes: zeroSignedMinutes,
          calculationAsOf,
          events: source.events.map(({ event }) => event),
          expectedState: attendanceState,
          flexNegativeThresholdMinutes: source.flexNegativeThresholdMinutes,
          flexPositiveThresholdMinutes: source.flexPositiveThresholdMinutes,
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

        return Object.freeze({
          asOf: calculationAsOf,
          attendance: Object.freeze({
            activeSince: result.activeSince,
            attendanceRevision: source.head?.attendanceRevision ?? 0,
            state: attendanceState,
            validActions: [...validAttendanceActions(attendanceState)],
          }),
          calculation: Object.freeze({
            blockers: [...result.blockers],
            estimate:
              result.estimate === null
                ? null
                : Object.freeze({
                    absenceCreditMinutes: result.estimate.absenceCreditMinutes,
                    absenceExpectedReductionMinutes:
                      result.estimate.absenceExpectedReductionMinutes,
                    adjustmentMinutes: result.estimate.approvedAdjustmentMinutes,
                    balanceMinutes: result.estimate.dailyBalanceMinutes,
                    breakMinutes: result.estimate.breakMinutes,
                    creditedMinutes: result.estimate.creditedMinutes,
                    expectedMinutes: result.estimate.expectedMinutes,
                    holidayExpectedReductionMinutes:
                      result.estimate.holidayExpectedReductionMinutes,
                    scheduledMinutes: result.estimate.scheduledMinutes,
                    workedMinutes: result.estimate.workedMinutes,
                  }),
            holidayName: source.holiday?.name ?? null,
            status: result.calculationStatus,
            warnings: [...result.warnings],
          }),
          localDate,
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
      });
    },
  };
  return Object.freeze(service);
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
