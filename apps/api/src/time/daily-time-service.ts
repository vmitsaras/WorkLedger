import type {
  CalculationBlockerCode,
  DailyTimeAttention,
  DailyTimeRecord,
} from '@workledger/contracts';
import {
  elapsedMinutesBetweenInstants,
  localDateAtInstant,
  localDateInstantBounds,
  parseDomainId,
  parseTimeZoneId,
  reconstructAttendance,
  splitAttendanceIntervalAtLocalMidnight,
  type AttendanceReconstruction,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { normalizeStoredWarningCodes } from './calculation-attention.js';

export type DailyTimeIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface DailyTimeService {
  getDailyRecord(
    identity: DailyTimeIdentity,
    projectionId: DomainId<'DailyProjection'>,
    at: Instant,
  ): Promise<DailyTimeRecord>;
}

export function createDailyTimeService(database: WorkLedgerDatabase): DailyTimeService {
  return Object.freeze({
    async getDailyRecord(
      identity: DailyTimeIdentity,
      projectionId: DomainId<'DailyProjection'>,
      at: Instant,
    ) {
      return database.transaction(async (transaction) => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const employee = context.employee;
        if (employee === null)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        const timeZone = parseTimeZoneId(context.organization.timeZone);
        if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
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
        if (!authorization.allowed)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });

        const projection = await transaction.dailyProjections.findForEmployee(
          context.organization.id,
          employee.id,
          projectionId,
        );
        if (projection === null)
          throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
        const bounds = localDateInstantBounds(projection.localDate, timeZone.value);
        const events = await transaction.attendance.listPunchEventsUntil(
          context.organization.id,
          employee.id,
          bounds.endsAt,
        );
        const reconstruction = reconstructAttendance(events.map(({ event }) => event));
        if (!reconstruction.ok) {
          return Object.freeze({
            attention: Object.freeze({
              blockers: [mapReconstructionBlocker(reconstruction.error.code)],
              warnings: normalizeStoredWarningCodes(projection.warningCodes),
            }),
            calculation: null,
            events: events
              .filter(
                ({ event }) =>
                  localDateAtInstant(event.occurredAt, timeZone.value) === projection.localDate,
              )
              .map(({ event }) =>
                Object.freeze({
                  occurredAt: event.occurredAt,
                  sequence: event.eventSequence,
                  type: event.type,
                }),
              ),
            localDate: projection.localDate,
            sessions: [],
            status: 'INCOMPLETE' as const,
            timeZone: timeZone.value,
          });
        }

        const sessions = reconstruction.value.sessions
          .map((session) => ({
            breaks: splitIntervals(session.breakIntervals, projection.localDate, timeZone.value),
            continuesFromPreviousDate:
              localDateAtInstant(session.clockInEvent.occurredAt, timeZone.value) <
              projection.localDate,
            continuesToNextDate:
              session.clockOutEvent === null ||
              localDateAtInstant(session.clockOutEvent.occurredAt, timeZone.value) >
                projection.localDate,
            workIntervals: splitIntervals(
              session.workIntervals,
              projection.localDate,
              timeZone.value,
            ),
          }))
          .filter((session) => session.breaks.length > 0 || session.workIntervals.length > 0)
          .map((session) => Object.freeze(session));

        return Object.freeze({
          attention: buildDailyAttention(
            projection.warningCodes,
            projection.calculationStatus,
            reconstruction.value,
          ),
          calculation: Object.freeze({
            absenceCreditMinutes: projection.absenceCreditMinutes,
            adjustmentMinutes: projection.adjustmentMinutes,
            balanceMinutes: projection.balanceMinutes,
            breakMinutes: projection.breakMinutes,
            creditedMinutes: projection.creditedMinutes,
            expectedMinutes: projection.expectedMinutes,
            workedMinutes: projection.workedMinutes,
          }),
          events: events
            .filter(
              ({ event }) =>
                localDateAtInstant(event.occurredAt, timeZone.value) === projection.localDate,
            )
            .map(({ event }) =>
              Object.freeze({
                occurredAt: event.occurredAt,
                sequence: event.eventSequence,
                type: event.type,
              }),
            ),
          localDate: projection.localDate,
          sessions,
          status: projection.calculationStatus,
          timeZone: timeZone.value,
        });
      });
    },
  });
}

function buildDailyAttention(
  warningCodes: readonly string[],
  calculationStatus: DailyTimeRecord['status'],
  reconstruction: AttendanceReconstruction,
): DailyTimeAttention {
  const hasOpenSession = reconstruction.sessions.some((session) => session.openInterval !== null);
  const blockers: CalculationBlockerCode[] =
    calculationStatus === 'INCOMPLETE' && hasOpenSession ? ['ATTENDANCE_INCOMPLETE'] : [];
  return Object.freeze({
    blockers,
    warnings: normalizeStoredWarningCodes(warningCodes),
  });
}

function mapReconstructionBlocker(
  code: 'ATTENDANCE_INVALID_EVENT_ORDER' | 'ATTENDANCE_INVALID_EVENT_PRECISION',
): CalculationBlockerCode {
  return code;
}

export function parseDailyTimeIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): DailyTimeIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

export function parseDailyProjectionId(value: string): DomainId<'DailyProjection'> {
  if (!UUID_PATTERN.test(value))
    throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  const projectionId = parseDomainId<'DailyProjection'>(value);
  if (!projectionId.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return projectionId.value;
}

function splitIntervals(
  intervals: readonly Readonly<{ endedAt: Instant; startedAt: Instant }>[],
  localDate: DailyTimeRecord['localDate'],
  timeZone: DailyTimeRecord['timeZone'],
) {
  const parsedTimeZone = parseTimeZoneId(timeZone);
  if (!parsedTimeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return intervals.flatMap((interval) => {
    const segments = splitAttendanceIntervalAtLocalMidnight(interval, parsedTimeZone.value);
    if (!segments.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
    return segments.value
      .filter((segment) => segment.localDate === localDate)
      .map((segment) =>
        Object.freeze({
          durationMinutes: elapsedMinutesBetweenInstants(segment.startedAt, segment.endedAt),
          endsAt: segment.endedAt,
          startsAt: segment.startedAt,
        }),
      );
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
