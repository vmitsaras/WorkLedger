import { Temporal } from '@js-temporal/polyfill';

import { type DailyWorkInterval } from './daily-attendance-calculation.js';
import { parseNonNegativeMinutes, type NonNegativeMinutes } from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant } from './shared/temporal.js';

export const absenceTimeTreatments = Object.freeze([
  'CREDIT_COVERED_EXPECTATION',
  'REDUCE_COVERED_EXPECTATION',
  'NO_TIME_EFFECT',
] as const);

export type AbsenceTimeTreatment = (typeof absenceTimeTreatments)[number];

export type EffectiveAbsenceCoverage =
  | Readonly<{ kind: 'FULL_DAY' }>
  | Readonly<{ kind: 'HALF_DAY'; portion: 'FIRST_HALF' | 'SECOND_HALF' }>
  | Readonly<{ endsAt: Instant; kind: 'MINUTES'; startsAt: Instant }>;

export type EffectiveAbsenceEffect = Readonly<{
  coverage: EffectiveAbsenceCoverage;
  timeTreatment: AbsenceTimeTreatment;
}>;

export type DailyAbsenceEffectsInput = Readonly<{
  baseExpectedMinutes: NonNegativeMinutes;
  effects: readonly EffectiveAbsenceEffect[];
  workIntervals: readonly DailyWorkInterval[];
}>;

export type DailyAbsenceCalculationInputs = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  absenceExpectedReductionMinutes: NonNegativeMinutes;
}>;

export type DailyAbsenceEffectsError =
  | DomainError<'ABSENCE_COVERAGE_INVALID'>
  | DomainError<'ABSENCE_OVERLAP'>
  | DomainError<'ATTENDANCE_INVALID_EVENT_ORDER'>
  | DomainError<'ATTENDANCE_INVALID_EVENT_PRECISION'>
  | DomainError<'ATTENDANCE_OVERLAP'>;

type ResolvedMinuteInterval = Readonly<{
  endsAt: Temporal.Instant;
  startsAt: Temporal.Instant;
}>;

const ABSENCE_COVERAGE_INVALID = Object.freeze({ code: 'ABSENCE_COVERAGE_INVALID' } as const);
const ABSENCE_OVERLAP = Object.freeze({ code: 'ABSENCE_OVERLAP' } as const);
const ATTENDANCE_INVALID_EVENT_ORDER = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_ORDER',
} as const);
const ATTENDANCE_INVALID_EVENT_PRECISION = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_PRECISION',
} as const);
const ATTENDANCE_OVERLAP = Object.freeze({ code: 'ATTENDANCE_OVERLAP' } as const);
const MINUTE_IN_NANOSECONDS = 60_000_000_000n;

/**
 * Converts effective paid/unpaid absence coverage into the explicit daily-calculation inputs.
 * Coverage construction, workflow, entitlement, and persistence remain outside this function.
 */
export function calculateDailyAbsenceEffects(
  input: DailyAbsenceEffectsInput,
): Result<DailyAbsenceCalculationInputs, DailyAbsenceEffectsError> {
  const workIntervals = resolveIntervals(input.workIntervals, ATTENDANCE_OVERLAP);
  if (!workIntervals.ok) {
    return workIntervals;
  }

  const coverage = validateCoverage(input.effects, input.baseExpectedMinutes);
  if (!coverage.ok) {
    return coverage;
  }

  let quantityCreditMinutes = 0;
  let minuteCreditMinutes = 0;
  let expectedReductionMinutes = 0;

  for (const effect of input.effects) {
    const coverageMinutes = resolveCoverageMinutes(effect.coverage, input.baseExpectedMinutes);
    if (!coverageMinutes.ok) {
      return coverageMinutes;
    }

    if (effect.timeTreatment === 'REDUCE_COVERED_EXPECTATION') {
      expectedReductionMinutes += coverageMinutes.value;
      continue;
    }

    if (effect.timeTreatment !== 'CREDIT_COVERED_EXPECTATION') {
      continue;
    }

    if (effect.coverage.kind === 'MINUTES') {
      const minuteCoverage = resolveIntervals([effect.coverage], ABSENCE_OVERLAP);
      if (!minuteCoverage.ok) {
        return minuteCoverage;
      }

      const workedInsideCoverage = totalIntersectionMinutes(
        minuteCoverage.value[0],
        workIntervals.value,
      );
      minuteCreditMinutes += coverageMinutes.value - workedInsideCoverage;
      continue;
    }

    quantityCreditMinutes += coverageMinutes.value;
  }

  const workedMinutes = totalIntervalMinutes(workIntervals.value);
  const unworkedExpectedMinutes = Math.max(input.baseExpectedMinutes - workedMinutes, 0);
  const absenceCreditMinutes = asNonNegativeMinutes(
    Math.min(quantityCreditMinutes, unworkedExpectedMinutes) + minuteCreditMinutes,
  );
  const absenceExpectedReductionMinutes = asNonNegativeMinutes(expectedReductionMinutes);
  if (absenceCreditMinutes === null || absenceExpectedReductionMinutes === null) {
    return failure(ABSENCE_COVERAGE_INVALID);
  }

  return success(
    Object.freeze({
      absenceCreditMinutes,
      absenceExpectedReductionMinutes,
    }),
  );
}

function validateCoverage(
  effects: readonly EffectiveAbsenceEffect[],
  baseExpectedMinutes: NonNegativeMinutes,
): Result<void, DailyAbsenceEffectsError> {
  let hasFullDay = false;
  let hasFirstHalf = false;
  let hasSecondHalf = false;
  const minuteIntervals: ResolvedMinuteInterval[] = [];
  let coveredMinutes = 0;

  for (const effect of effects) {
    const coverageMinutes = resolveCoverageMinutes(effect.coverage, baseExpectedMinutes);
    if (!coverageMinutes.ok) {
      return coverageMinutes;
    }
    coveredMinutes += coverageMinutes.value;

    if (effect.coverage.kind === 'FULL_DAY') {
      if (hasFullDay || hasFirstHalf || hasSecondHalf || minuteIntervals.length > 0) {
        return failure(ABSENCE_OVERLAP);
      }
      hasFullDay = true;
      continue;
    }

    if (effect.coverage.kind === 'HALF_DAY') {
      if (hasFullDay || minuteIntervals.length > 0) {
        return failure(ABSENCE_OVERLAP);
      }
      if (effect.coverage.portion === 'FIRST_HALF') {
        if (hasFirstHalf) return failure(ABSENCE_OVERLAP);
        hasFirstHalf = true;
      } else {
        if (hasSecondHalf) return failure(ABSENCE_OVERLAP);
        hasSecondHalf = true;
      }
      continue;
    }

    if (hasFullDay || hasFirstHalf || hasSecondHalf) {
      return failure(ABSENCE_OVERLAP);
    }

    const resolvedMinuteInterval = resolveIntervals([effect.coverage], ABSENCE_OVERLAP);
    if (!resolvedMinuteInterval.ok) {
      return resolvedMinuteInterval;
    }
    const minuteInterval = resolvedMinuteInterval.value[0];
    if (minuteInterval === undefined) {
      return failure(ABSENCE_COVERAGE_INVALID);
    }
    minuteIntervals.push(minuteInterval);
  }

  const orderedMinuteIntervals = minuteIntervals.sort(compareIntervalStart);
  for (let index = 1; index < orderedMinuteIntervals.length; index += 1) {
    const previous = orderedMinuteIntervals[index - 1];
    const current = orderedMinuteIntervals[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      Temporal.Instant.compare(current.startsAt, previous.endsAt) < 0
    ) {
      return failure(ABSENCE_OVERLAP);
    }
  }

  if (baseExpectedMinutes > 0 && coveredMinutes > baseExpectedMinutes) {
    return failure(ABSENCE_COVERAGE_INVALID);
  }

  return success(undefined);
}

function resolveCoverageMinutes(
  coverage: EffectiveAbsenceCoverage,
  baseExpectedMinutes: NonNegativeMinutes,
): Result<NonNegativeMinutes, DailyAbsenceEffectsError> {
  if (baseExpectedMinutes === 0) {
    return success(baseExpectedMinutes);
  }

  if (coverage.kind === 'FULL_DAY') {
    return success(baseExpectedMinutes);
  }

  if (coverage.kind === 'HALF_DAY') {
    const firstHalf = Math.floor(baseExpectedMinutes / 2);
    const halfMinutes = asNonNegativeMinutes(
      coverage.portion === 'FIRST_HALF' ? firstHalf : baseExpectedMinutes - firstHalf,
    );
    return halfMinutes === null ? failure(ABSENCE_COVERAGE_INVALID) : success(halfMinutes);
  }

  const minuteInterval = resolveIntervals([coverage], ABSENCE_OVERLAP);
  if (!minuteInterval.ok) {
    return minuteInterval;
  }

  const resolvedMinuteInterval = minuteInterval.value[0];
  if (resolvedMinuteInterval === undefined) {
    return failure(ABSENCE_COVERAGE_INVALID);
  }
  const minutes = asNonNegativeMinutes(intervalMinutes(resolvedMinuteInterval));
  return minutes === null ? failure(ABSENCE_COVERAGE_INVALID) : success(minutes);
}

function resolveIntervals(
  intervals: readonly Readonly<{ endsAt: Instant; startsAt: Instant }>[],
  overlapError: DomainError<'ABSENCE_OVERLAP'> | DomainError<'ATTENDANCE_OVERLAP'>,
): Result<readonly ResolvedMinuteInterval[], DailyAbsenceEffectsError> {
  const resolved: ResolvedMinuteInterval[] = [];

  for (const interval of intervals) {
    const startsAt = parseMinuteAlignedInstant(interval.startsAt);
    const endsAt = parseMinuteAlignedInstant(interval.endsAt);
    if (startsAt === null || endsAt === null) {
      return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
    }
    if (Temporal.Instant.compare(endsAt, startsAt) < 0) {
      return failure(ATTENDANCE_INVALID_EVENT_ORDER);
    }
    resolved.push(Object.freeze({ endsAt, startsAt }));
  }

  const ordered = resolved.sort(compareIntervalStart);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      Temporal.Instant.compare(current.startsAt, previous.endsAt) < 0
    ) {
      return failure(overlapError);
    }
  }

  return success(Object.freeze(ordered));
}

function totalIntersectionMinutes(
  coverage: ResolvedMinuteInterval | undefined,
  workIntervals: readonly ResolvedMinuteInterval[],
): number {
  if (coverage === undefined) return 0;

  return workIntervals.reduce((total, workInterval) => {
    const startsAt =
      Temporal.Instant.compare(coverage.startsAt, workInterval.startsAt) > 0
        ? coverage.startsAt
        : workInterval.startsAt;
    const endsAt =
      Temporal.Instant.compare(coverage.endsAt, workInterval.endsAt) < 0
        ? coverage.endsAt
        : workInterval.endsAt;

    return Temporal.Instant.compare(endsAt, startsAt) > 0
      ? total + intervalMinutes(Object.freeze({ endsAt, startsAt }))
      : total;
  }, 0);
}

function totalIntervalMinutes(intervals: readonly ResolvedMinuteInterval[]): number {
  return intervals.reduce((total, interval) => total + intervalMinutes(interval), 0);
}

function intervalMinutes(interval: ResolvedMinuteInterval): number {
  return Number(
    (interval.endsAt.epochNanoseconds - interval.startsAt.epochNanoseconds) / MINUTE_IN_NANOSECONDS,
  );
}

function compareIntervalStart(left: ResolvedMinuteInterval, right: ResolvedMinuteInterval): number {
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
