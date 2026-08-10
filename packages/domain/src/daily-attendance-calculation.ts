import { Temporal } from '@js-temporal/polyfill';

import {
  resolveEffectiveTimeConfiguration,
  type EffectiveTimeConfigurationError,
  type PolicyAssignment,
  type ScheduleAssignment,
} from './schedule-policy.js';
import {
  parseNonNegativeMinutes,
  parseSignedMinutes,
  type NonNegativeMinutes,
  type SignedMinutes,
} from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant, type LocalDate } from './shared/temporal.js';

export type DailyWorkInterval = Readonly<{
  endsAt: Instant;
  startsAt: Instant;
}>;

export type DailyAttendanceCalculationInput = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  absenceExpectedReductionMinutes: NonNegativeMinutes;
  approvedAdjustmentMinutes: SignedMinutes;
  holidayExpectedReductionMinutes: NonNegativeMinutes;
  localDate: LocalDate;
  policyAssignments: readonly PolicyAssignment[];
  scheduleAssignments: readonly ScheduleAssignment[];
  workIntervals: readonly DailyWorkInterval[];
}>;

export type DailyAttendanceCalculation = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  absenceExpectedReductionMinutes: NonNegativeMinutes;
  approvedAdjustmentMinutes: SignedMinutes;
  creditedMinutes: NonNegativeMinutes;
  dailyBalanceMinutes: SignedMinutes;
  expectedMinutes: NonNegativeMinutes;
  holidayExpectedReductionMinutes: NonNegativeMinutes;
  scheduledMinutes: NonNegativeMinutes;
  workedMinutes: NonNegativeMinutes;
}>;

export type DailyAttendanceCalculationError =
  | EffectiveTimeConfigurationError
  | DomainError<'ATTENDANCE_INVALID_EVENT_ORDER'>
  | DomainError<'ATTENDANCE_INVALID_EVENT_PRECISION'>
  | DomainError<'ATTENDANCE_OVERLAP'>
  | DomainError<'POLICY_CONFIGURATION_INVALID'>;

const ATTENDANCE_INVALID_EVENT_ORDER = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_ORDER',
} as const);
const ATTENDANCE_INVALID_EVENT_PRECISION = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_PRECISION',
} as const);
const ATTENDANCE_OVERLAP = Object.freeze({ code: 'ATTENDANCE_OVERLAP' } as const);
const POLICY_CONFIGURATION_INVALID = Object.freeze({
  code: 'POLICY_CONFIGURATION_INVALID',
} as const);
const MINUTE_IN_NANOSECONDS = 60_000_000_000n;

/**
 * Calculates one local-date minute breakdown from already attributed work intervals and effective
 * source amounts. Midnight/DST attribution and absence-source construction are separate tasks.
 */
export function calculateDailyAttendance(
  input: DailyAttendanceCalculationInput,
): Result<DailyAttendanceCalculation, DailyAttendanceCalculationError> {
  const configuration = resolveEffectiveTimeConfiguration(
    input.scheduleAssignments,
    input.policyAssignments,
    input.localDate,
  );
  if (!configuration.ok) {
    return configuration;
  }

  const workedMinutes = calculateWorkedMinutes(input.workIntervals);
  if (!workedMinutes.ok) {
    return workedMinutes;
  }

  const {
    absenceCreditMinutes,
    absenceExpectedReductionMinutes,
    approvedAdjustmentMinutes,
    holidayExpectedReductionMinutes,
  } = input;
  const scheduledMinutes = configuration.value.schedule.scheduledMinutes;
  const expectedMinutesValue =
    scheduledMinutes - holidayExpectedReductionMinutes - absenceExpectedReductionMinutes;

  if (expectedMinutesValue < 0) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  const creditedMinutesValue =
    workedMinutes.value + absenceCreditMinutes + approvedAdjustmentMinutes;
  if (creditedMinutesValue < 0) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  const expectedMinutes = asNonNegativeMinutes(expectedMinutesValue);
  const creditedMinutes = asNonNegativeMinutes(creditedMinutesValue);
  if (expectedMinutes === null || creditedMinutes === null) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  const dailyBalanceMinutes = asSignedMinutes(creditedMinutes - expectedMinutes);
  if (dailyBalanceMinutes === null) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  return success(
    Object.freeze({
      absenceCreditMinutes,
      absenceExpectedReductionMinutes,
      approvedAdjustmentMinutes,
      creditedMinutes,
      dailyBalanceMinutes,
      expectedMinutes,
      holidayExpectedReductionMinutes,
      scheduledMinutes,
      workedMinutes: workedMinutes.value,
    }),
  );
}

function calculateWorkedMinutes(
  intervals: readonly DailyWorkInterval[],
): Result<NonNegativeMinutes, DailyAttendanceCalculationError> {
  const resolvedIntervals: Array<
    Readonly<{ endsAt: Temporal.Instant; startsAt: Temporal.Instant }>
  > = [];

  for (const interval of intervals) {
    const startsAt = parseMinuteAlignedInstant(interval.startsAt);
    const endsAt = parseMinuteAlignedInstant(interval.endsAt);
    if (startsAt === null || endsAt === null) {
      return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
    }

    if (Temporal.Instant.compare(endsAt, startsAt) < 0) {
      return failure(ATTENDANCE_INVALID_EVENT_ORDER);
    }

    resolvedIntervals.push(Object.freeze({ endsAt, startsAt }));
  }

  const orderedIntervals = resolvedIntervals.sort(compareIntervalStart);
  let totalNanoseconds = 0n;
  let previousEnd: Temporal.Instant | null = null;

  for (const interval of orderedIntervals) {
    if (previousEnd !== null && Temporal.Instant.compare(interval.startsAt, previousEnd) < 0) {
      return failure(ATTENDANCE_OVERLAP);
    }

    totalNanoseconds += interval.endsAt.epochNanoseconds - interval.startsAt.epochNanoseconds;
    if (previousEnd === null || Temporal.Instant.compare(interval.endsAt, previousEnd) > 0) {
      previousEnd = interval.endsAt;
    }
  }

  if (totalNanoseconds % MINUTE_IN_NANOSECONDS !== 0n) {
    return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
  }

  const workedMinutes = asNonNegativeMinutes(Number(totalNanoseconds / MINUTE_IN_NANOSECONDS));
  if (workedMinutes === null) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  return success(workedMinutes);
}

function compareIntervalStart(
  left: Readonly<{ startsAt: Temporal.Instant }>,
  right: Readonly<{ startsAt: Temporal.Instant }>,
): number {
  return Temporal.Instant.compare(left.startsAt, right.startsAt);
}

function parseMinuteAlignedInstant(instant: Instant): Temporal.Instant | null {
  try {
    const parsed = Temporal.Instant.from(instant);
    return parsed.epochNanoseconds % MINUTE_IN_NANOSECONDS === 0n ? parsed : null;
  } catch {
    return null;
  }
}

function asNonNegativeMinutes(value: number): NonNegativeMinutes | null {
  const parsed = parseNonNegativeMinutes(value);
  return parsed.ok ? parsed.value : null;
}

function asSignedMinutes(value: number): SignedMinutes | null {
  const parsed = parseSignedMinutes(value);
  return parsed.ok ? parsed.value : null;
}
