import { Temporal } from '@js-temporal/polyfill';

import {
  calculateDailyAttendance,
  type DailyAttendanceCalculation,
  type DailyAttendanceCalculationError,
  type DailyWorkInterval,
} from './daily-attendance-calculation.js';
import {
  calculateDailyCalculationSignals,
  type AttendanceCalculationConflictCode,
  type CalculationBlockerCode,
  type CalculationWarningCode,
  type ConfigurationCalculationConflictCode,
} from './calculation-signals.js';
import {
  reconstructAttendance,
  type PunchEvent,
  type WorkSession,
} from './attendance-reconstruction.js';
import { type AttendanceState } from './attendance-transition.js';
import { splitAttendanceIntervalAtLocalMidnight } from './local-date-interval-splitting.js';
import {
  resolveSchedule,
  type PolicyAssignment,
  type ScheduleAssignment,
} from './schedule-policy.js';
import {
  parseNonNegativeMinutes,
  type NonNegativeMinutes,
  type SignedMinutes,
} from './shared/minutes.js';
import { type Instant, type LocalDate, type TimeZoneId } from './shared/temporal.js';

export type CurrentDayCalculationStatus = 'INCOMPLETE' | 'PROVISIONAL';
export type EstimatedFinishUnavailableReason =
  | 'CALCULATION_UNAVAILABLE'
  | 'CALCULATION_INCOMPLETE'
  | 'NOT_WORKING'
  | 'ON_BREAK'
  | 'NO_REMAINING_EXPECTATION';

export type CurrentDayAttendanceEstimate = DailyAttendanceCalculation &
  Readonly<{ breakMinutes: NonNegativeMinutes }>;

export type CurrentDayAttendanceInput = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  absenceExpectedReductionMinutes: NonNegativeMinutes;
  approvedAdjustmentMinutes: SignedMinutes;
  calculationAsOf: Instant;
  events: readonly PunchEvent[];
  expectedState: AttendanceState;
  hasSourceLedgerMismatch: boolean;
  hasUnresolvedApprovalRequiredAbsence: boolean;
  hasUnresolvedCorrection: boolean;
  isHoliday: boolean;
  localDate: LocalDate;
  policyAssignments: readonly PolicyAssignment[];
  scheduleAssignments: readonly ScheduleAssignment[];
  sourceTruncated: boolean;
  timeZone: TimeZoneId;
  workDuringAbsence: boolean;
}>;

export type CurrentDayAttendance = Readonly<{
  activeElapsedMinutes: NonNegativeMinutes | null;
  activeSince: Instant | null;
  blockers: readonly CalculationBlockerCode[];
  calculationStatus: CurrentDayCalculationStatus;
  estimate: CurrentDayAttendanceEstimate | null;
  estimatedFinishAt: Instant | null;
  estimatedFinishUnavailableReason: EstimatedFinishUnavailableReason | null;
  isPeriodPostedOrLocked: false;
  remainingExpectedMinutes: NonNegativeMinutes | null;
  warnings: readonly CalculationWarningCode[];
}>;

type IntervalKind = 'BREAK' | 'WORK';
type CurrentDayInterval = Readonly<{ endedAt: Instant; kind: IntervalKind; startedAt: Instant }>;

const zeroMinutesResult = parseNonNegativeMinutes(0);
if (!zeroMinutesResult.ok) throw new Error('Zero minutes must be a valid domain value.');
const zeroMinutes = zeroMinutesResult.value;

export function calculateCurrentDayAttendance(
  input: CurrentDayAttendanceInput,
): CurrentDayAttendance {
  const reconstruction = reconstructAttendance(input.events);
  if (!reconstruction.ok) {
    return unavailableResult(input, {
      attendanceConflictCodes: [reconstruction.error.code],
      hasIncompleteAttendance: true,
    });
  }
  if (reconstruction.value.currentState !== input.expectedState) {
    return unavailableResult(input, {
      attendanceConflictCodes: ['ATTENDANCE_INVALID_EVENT_ORDER'],
      hasIncompleteAttendance: true,
    });
  }
  const activeSince = reconstruction.value.sessions.at(-1)?.openInterval?.startedAt ?? null;
  if (input.sourceTruncated) {
    return unavailableResult(input, { activeSince, hasIncompleteAttendance: true });
  }

  const intervals = collectIntervals(reconstruction.value.sessions, input.calculationAsOf);
  if (intervals === null) {
    return unavailableResult(input, {
      attendanceConflictCodes: ['ATTENDANCE_INVALID_EVENT_ORDER'],
      hasIncompleteAttendance: true,
    });
  }
  const dailyIntervals = intervalsForDate(intervals, input.localDate, input.timeZone);
  if (!dailyIntervals.ok) {
    return unavailableResult(input, {
      attendanceConflictCodes: [dailyIntervals.code],
      hasIncompleteAttendance: true,
    });
  }

  const schedule = resolveSchedule(input.scheduleAssignments, input.localDate);
  const holidayExpectedReductionMinutes =
    input.isHoliday && schedule.ok ? schedule.value.scheduledMinutes : zeroMinutes;
  const calculation = calculateDailyAttendance({
    absenceCreditMinutes: input.absenceCreditMinutes,
    absenceExpectedReductionMinutes: input.absenceExpectedReductionMinutes,
    approvedAdjustmentMinutes: input.approvedAdjustmentMinutes,
    holidayExpectedReductionMinutes,
    localDate: input.localDate,
    policyAssignments: input.policyAssignments,
    scheduleAssignments: input.scheduleAssignments,
    workIntervals: dailyIntervals.work.map(asDailyWorkInterval),
  });
  if (!calculation.ok) {
    return unavailableResult(input, {
      activeSince,
      ...calculationFailure(calculation.error),
    });
  }

  const breakMinutes = sumMinutes(dailyIntervals.breaks);
  if (breakMinutes === null) {
    return unavailableResult(input, {
      attendanceConflictCodes: ['ATTENDANCE_INVALID_EVENT_PRECISION'],
      hasIncompleteAttendance: true,
    });
  }
  const baseEstimate = Object.freeze({ ...calculation.value, breakMinutes });
  const signals = calculateSignals(input, {
    attendanceConflictCodes: [],
    configurationConflictCodes: [],
    dailyBalanceMinutes: baseEstimate.dailyBalanceMinutes,
    expectedMinutes: baseEstimate.expectedMinutes,
    hasIncompleteAttendance: input.sourceTruncated,
    hasMissingPolicy: false,
    hasMissingSchedule: false,
    workedMinutes: baseEstimate.workedMinutes,
  });
  const calculationStatus = signals.submissionBlockers.length > 0 ? 'INCOMPLETE' : 'PROVISIONAL';
  const remainingExpectedMinutes = asNonNegativeMinutes(
    Math.max(baseEstimate.expectedMinutes - baseEstimate.creditedMinutes, 0),
  );
  if (remainingExpectedMinutes === null) {
    return unavailableResult(input, {
      activeSince,
      attendanceConflictCodes: ['ATTENDANCE_INVALID_EVENT_PRECISION'],
      hasIncompleteAttendance: true,
    });
  }
  const estimatedFinish = estimateFinish({
    asOf: input.calculationAsOf,
    calculationStatus,
    remainingExpectedMinutes,
    state: input.expectedState,
  });

  return Object.freeze({
    activeElapsedMinutes: activeElapsedMinutes(activeSince, input.calculationAsOf),
    activeSince,
    blockers: signals.submissionBlockers,
    calculationStatus,
    estimate: baseEstimate,
    estimatedFinishAt: estimatedFinish.at,
    estimatedFinishUnavailableReason: estimatedFinish.unavailableReason,
    isPeriodPostedOrLocked: false,
    remainingExpectedMinutes,
    warnings: signals.warnings,
  });
}

function collectIntervals(
  sessions: readonly WorkSession[],
  calculationAsOf: Instant,
): readonly CurrentDayInterval[] | null {
  const intervals: CurrentDayInterval[] = [];
  for (const session of sessions) {
    intervals.push(
      ...session.workIntervals.map((interval) => ({ ...interval, kind: 'WORK' as const })),
      ...session.breakIntervals.map((interval) => ({ ...interval, kind: 'BREAK' as const })),
    );
    if (session.openInterval !== null) {
      if (
        Temporal.Instant.compare(
          Temporal.Instant.from(calculationAsOf),
          Temporal.Instant.from(session.openInterval.startedAt),
        ) < 0
      ) {
        return null;
      }
      intervals.push(
        Object.freeze({
          endedAt: calculationAsOf,
          kind: session.openInterval.type,
          startedAt: session.openInterval.startedAt,
        }),
      );
    }
  }
  return Object.freeze(intervals);
}

function intervalsForDate(
  intervals: readonly CurrentDayInterval[],
  localDate: LocalDate,
  timeZone: TimeZoneId,
):
  | Readonly<{
      breaks: readonly CurrentDayInterval[];
      ok: true;
      work: readonly CurrentDayInterval[];
    }>
  | Readonly<{ code: AttendanceCalculationConflictCode; ok: false }> {
  const work: CurrentDayInterval[] = [];
  const breaks: CurrentDayInterval[] = [];
  for (const interval of intervals) {
    const split = splitAttendanceIntervalAtLocalMidnight(interval, timeZone);
    if (!split.ok) return Object.freeze({ code: split.error.code, ok: false });
    for (const segment of split.value) {
      if (segment.localDate !== localDate) continue;
      const target = interval.kind === 'WORK' ? work : breaks;
      target.push(
        Object.freeze({
          endedAt: segment.endedAt,
          kind: interval.kind,
          startedAt: segment.startedAt,
        }),
      );
    }
  }
  return Object.freeze({ breaks: Object.freeze(breaks), ok: true, work: Object.freeze(work) });
}

function asDailyWorkInterval(interval: CurrentDayInterval): DailyWorkInterval {
  return Object.freeze({ endsAt: interval.endedAt, startsAt: interval.startedAt });
}

function sumMinutes(intervals: readonly CurrentDayInterval[]): NonNegativeMinutes | null {
  let totalNanoseconds = 0n;
  for (const interval of intervals) {
    const startedAt = Temporal.Instant.from(interval.startedAt);
    const endedAt = Temporal.Instant.from(interval.endedAt);
    totalNanoseconds += endedAt.epochNanoseconds - startedAt.epochNanoseconds;
  }
  const minuteNanoseconds = 60_000_000_000n;
  if (totalNanoseconds < 0n || totalNanoseconds % minuteNanoseconds !== 0n) return null;
  const parsed = parseNonNegativeMinutes(Number(totalNanoseconds / minuteNanoseconds));
  return parsed.ok ? parsed.value : null;
}

function calculationFailure(error: DailyAttendanceCalculationError) {
  const attendanceConflictCodes: AttendanceCalculationConflictCode[] = [];
  const configurationConflictCodes: ConfigurationCalculationConflictCode[] = [];
  let hasMissingSchedule = false;
  let hasMissingPolicy = false;
  switch (error.code) {
    case 'ATTENDANCE_INVALID_EVENT_ORDER':
    case 'ATTENDANCE_INVALID_EVENT_PRECISION':
    case 'ATTENDANCE_OVERLAP':
      attendanceConflictCodes.push(error.code);
      break;
    case 'SCHEDULE_NOT_ASSIGNED':
      hasMissingSchedule = true;
      break;
    case 'POLICY_NOT_ASSIGNED':
      hasMissingPolicy = true;
      break;
    case 'SCHEDULE_ASSIGNMENT_OVERLAP':
    case 'POLICY_ASSIGNMENT_OVERLAP':
    case 'POLICY_CONFIGURATION_INVALID':
      configurationConflictCodes.push(error.code);
      break;
  }
  return {
    attendanceConflictCodes,
    configurationConflictCodes,
    hasIncompleteAttendance: attendanceConflictCodes.length > 0,
    hasMissingPolicy,
    hasMissingSchedule,
  } as const;
}

function unavailableResult(
  input: CurrentDayAttendanceInput,
  overrides: Readonly<{
    activeSince?: Instant | null;
    attendanceConflictCodes?: readonly AttendanceCalculationConflictCode[];
    configurationConflictCodes?: readonly ConfigurationCalculationConflictCode[];
    hasIncompleteAttendance?: boolean;
    hasMissingPolicy?: boolean;
    hasMissingSchedule?: boolean;
  }>,
): CurrentDayAttendance {
  const signals = calculateSignals(input, {
    attendanceConflictCodes: overrides.attendanceConflictCodes ?? [],
    configurationConflictCodes: overrides.configurationConflictCodes ?? [],
    dailyBalanceMinutes: null,
    expectedMinutes: null,
    hasIncompleteAttendance: overrides.hasIncompleteAttendance ?? input.sourceTruncated,
    hasMissingPolicy: overrides.hasMissingPolicy ?? false,
    hasMissingSchedule: overrides.hasMissingSchedule ?? false,
    workedMinutes: null,
  });
  return Object.freeze({
    activeElapsedMinutes: activeElapsedMinutes(
      overrides.activeSince ?? null,
      input.calculationAsOf,
    ),
    activeSince: overrides.activeSince ?? null,
    blockers: signals.submissionBlockers,
    calculationStatus: 'INCOMPLETE',
    estimate: null,
    estimatedFinishAt: null,
    estimatedFinishUnavailableReason: 'CALCULATION_UNAVAILABLE',
    isPeriodPostedOrLocked: false,
    remainingExpectedMinutes: null,
    warnings: signals.warnings,
  });
}

function calculateSignals(
  input: CurrentDayAttendanceInput,
  values: Readonly<{
    attendanceConflictCodes: readonly AttendanceCalculationConflictCode[];
    configurationConflictCodes: readonly ConfigurationCalculationConflictCode[];
    dailyBalanceMinutes: SignedMinutes | null;
    expectedMinutes: NonNegativeMinutes | null;
    hasIncompleteAttendance: boolean;
    hasMissingPolicy: boolean;
    hasMissingSchedule: boolean;
    workedMinutes: NonNegativeMinutes | null;
  }>,
) {
  return calculateDailyCalculationSignals({
    attendanceConflictCodes: values.attendanceConflictCodes,
    configurationConflictCodes: values.configurationConflictCodes,
    dailyBalanceMinutes: values.dailyBalanceMinutes,
    expectedMinutes: values.expectedMinutes,
    flexNegativeThresholdMinutes: null,
    flexPositiveThresholdMinutes: null,
    hasIncompleteAttendance: values.hasIncompleteAttendance,
    hasMissingPolicy: values.hasMissingPolicy,
    hasMissingSchedule: values.hasMissingSchedule,
    hasSourceLedgerMismatch: input.hasSourceLedgerMismatch,
    hasUnresolvedApprovalRequiredAbsence: input.hasUnresolvedApprovalRequiredAbsence,
    hasUnresolvedCorrection: input.hasUnresolvedCorrection,
    isHoliday: input.isHoliday,
    workedMinutes: values.workedMinutes,
    workDuringAbsence: input.workDuringAbsence,
  });
}

function activeElapsedMinutes(
  activeSince: Instant | null,
  calculationAsOf: Instant,
): NonNegativeMinutes | null {
  if (activeSince === null) return null;
  const elapsedNanoseconds =
    Temporal.Instant.from(calculationAsOf).epochNanoseconds -
    Temporal.Instant.from(activeSince).epochNanoseconds;
  const minuteNanoseconds = 60_000_000_000n;
  if (elapsedNanoseconds < 0n || elapsedNanoseconds % minuteNanoseconds !== 0n) return null;
  return asNonNegativeMinutes(Number(elapsedNanoseconds / minuteNanoseconds));
}

function asNonNegativeMinutes(value: number): NonNegativeMinutes | null {
  const parsed = parseNonNegativeMinutes(value);
  return parsed.ok ? parsed.value : null;
}

function estimateFinish(
  input: Readonly<{
    asOf: Instant;
    calculationStatus: CurrentDayCalculationStatus;
    remainingExpectedMinutes: NonNegativeMinutes;
    state: AttendanceState;
  }>,
): Readonly<{
  at: Instant | null;
  unavailableReason: EstimatedFinishUnavailableReason | null;
}> {
  if (input.calculationStatus === 'INCOMPLETE') {
    return Object.freeze({ at: null, unavailableReason: 'CALCULATION_INCOMPLETE' });
  }
  if (input.state === 'OFF_WORK') {
    return Object.freeze({ at: null, unavailableReason: 'NOT_WORKING' });
  }
  if (input.state === 'ON_BREAK') {
    return Object.freeze({ at: null, unavailableReason: 'ON_BREAK' });
  }
  if (input.remainingExpectedMinutes === 0) {
    return Object.freeze({ at: null, unavailableReason: 'NO_REMAINING_EXPECTATION' });
  }
  return Object.freeze({
    at: Temporal.Instant.from(input.asOf)
      .add({ minutes: input.remainingExpectedMinutes })
      .toString() as Instant,
    unavailableReason: null,
  });
}
