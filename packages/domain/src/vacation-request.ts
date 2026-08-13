import { Temporal } from '@js-temporal/polyfill';

import {
  resolveSchedule,
  type ScheduleResolutionError,
  type ScheduleAssignment,
} from './schedule-policy.js';
import { parseNonNegativeMinutes, type NonNegativeMinutes } from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { compareLocalDates, type LocalDate } from './shared/temporal.js';

export type AbsenceCoverageKind = 'FIRST_HALF' | 'FULL_DAY' | 'MINUTE_INTERVAL' | 'SECOND_HALF';

export type FullDayAbsenceCoverage = Readonly<{
  entitlementMinutes: NonNegativeMinutes;
  holiday: boolean;
  kind: 'FULL_DAY';
  localDate: LocalDate;
  scheduledMinutes: NonNegativeMinutes;
}>;

export type PartialDayAbsenceCoverage = Readonly<{
  endsAtMinute?: number;
  entitlementMinutes: NonNegativeMinutes;
  holiday: boolean;
  kind: Exclude<AbsenceCoverageKind, 'FULL_DAY'>;
  localDate: LocalDate;
  scheduledMinutes: NonNegativeMinutes;
  startsAtMinute?: number;
}>;

export type AbsenceRequestCoverage = FullDayAbsenceCoverage | PartialDayAbsenceCoverage;

export type FullDayAbsenceCalculation = Readonly<{
  coverage: readonly FullDayAbsenceCoverage[];
  entitlementMinutes: NonNegativeMinutes;
}>;

export type AbsenceRequestCalculation = Readonly<{
  coverage: readonly AbsenceRequestCoverage[];
  entitlementMinutes: NonNegativeMinutes;
}>;

export type FullDayAbsenceCalculationInput = Readonly<{
  endDate: LocalDate;
  holidayDates: readonly LocalDate[];
  scheduleAssignments: readonly ScheduleAssignment[];
  startDate: LocalDate;
}>;

export type AbsenceRequestCoverageInput =
  | Readonly<{ endDate: LocalDate; kind: 'FULL_DAY'; startDate: LocalDate }>
  | Readonly<{ kind: 'FIRST_HALF' | 'SECOND_HALF'; localDate: LocalDate }>
  | Readonly<{
      endsAtMinute: number;
      kind: 'MINUTE_INTERVAL';
      localDate: LocalDate;
      startsAtMinute: number;
    }>;

export type AbsenceRequestCalculationInput = Readonly<{
  coverage: AbsenceRequestCoverageInput;
  holidayDates: readonly LocalDate[];
  scheduleAssignments: readonly ScheduleAssignment[];
}>;

export type FullDayAbsenceCalculationError =
  | DomainError<'ABSENCE_COVERAGE_INVALID'>
  | DomainError<'VACATION_DATE_RANGE_INVALID'>
  | DomainError<'VACATION_DATE_RANGE_TOO_LARGE'>
  | ScheduleResolutionError;

const MAXIMUM_ABSENCE_REQUEST_DAYS = 366;
const ABSENCE_COVERAGE_INVALID = Object.freeze({ code: 'ABSENCE_COVERAGE_INVALID' } as const);
const VACATION_DATE_RANGE_INVALID = Object.freeze({ code: 'VACATION_DATE_RANGE_INVALID' } as const);
const VACATION_DATE_RANGE_TOO_LARGE = Object.freeze({
  code: 'VACATION_DATE_RANGE_TOO_LARGE',
} as const);

/**
 * Expands a full-day vacation range into immutable date coverage. Holidays and zero-hour days
 * remain visible coverage but consume no entitlement, as required by the absence policy.
 */
export function calculateVacationRequest(
  input: FullDayAbsenceCalculationInput,
): Result<FullDayAbsenceCalculation, FullDayAbsenceCalculationError> {
  return calculateFullDayAbsenceRequest(input);
}

/** Expands a schedule-aware full-day range for any compatible absence workflow. */
export function calculateFullDayAbsenceRequest(
  input: FullDayAbsenceCalculationInput,
): Result<FullDayAbsenceCalculation, FullDayAbsenceCalculationError> {
  const calculation = calculateAbsenceRequest({
    coverage: { endDate: input.endDate, kind: 'FULL_DAY', startDate: input.startDate },
    holidayDates: input.holidayDates,
    scheduleAssignments: input.scheduleAssignments,
  });
  if (!calculation.ok) return calculation;

  return success(
    Object.freeze({
      coverage: calculation.value.coverage as readonly FullDayAbsenceCoverage[],
      entitlementMinutes: calculation.value.entitlementMinutes,
    }),
  );
}

/**
 * Resolves one full-date range or one partial-day coverage segment to its immutable schedule-aware
 * representation. Half-day portions are obligation portions, never clock-time labels.
 */
export function calculateAbsenceRequest(
  input: AbsenceRequestCalculationInput,
): Result<AbsenceRequestCalculation, FullDayAbsenceCalculationError> {
  if (input.coverage.kind === 'FULL_DAY') {
    return calculateFullDayCoverage(input.coverage, input.holidayDates, input.scheduleAssignments);
  }

  const schedule = resolveSchedule(input.scheduleAssignments, input.coverage.localDate);
  if (!schedule.ok) return schedule;
  const holiday = new Set(input.holidayDates).has(input.coverage.localDate);
  const scheduledMinutes = schedule.value.scheduledMinutes;
  const entitlementMinutes = resolvePartialEntitlement(input.coverage, scheduledMinutes, holiday);
  if (entitlementMinutes === null) return failure(ABSENCE_COVERAGE_INVALID);

  const coverage = Object.freeze({
    ...(input.coverage.kind === 'MINUTE_INTERVAL'
      ? {
          endsAtMinute: input.coverage.endsAtMinute,
          startsAtMinute: input.coverage.startsAtMinute,
        }
      : {}),
    entitlementMinutes,
    holiday,
    kind: input.coverage.kind,
    localDate: input.coverage.localDate,
    scheduledMinutes,
  }) as PartialDayAbsenceCoverage;
  return success(Object.freeze({ coverage: Object.freeze([coverage]), entitlementMinutes }));
}

function calculateFullDayCoverage(
  coverageInput: Extract<AbsenceRequestCoverageInput, { kind: 'FULL_DAY' }>,
  holidayDates: readonly LocalDate[],
  scheduleAssignments: readonly ScheduleAssignment[],
): Result<AbsenceRequestCalculation, FullDayAbsenceCalculationError> {
  if (compareLocalDates(coverageInput.startDate, coverageInput.endDate) > 0) {
    return failure(VACATION_DATE_RANGE_INVALID);
  }

  const holidays = new Set(holidayDates);
  const coverage: FullDayAbsenceCoverage[] = [];
  let total = 0;
  let date = Temporal.PlainDate.from(coverageInput.startDate);
  const end = Temporal.PlainDate.from(coverageInput.endDate);

  while (Temporal.PlainDate.compare(date, end) <= 0) {
    if (coverage.length === MAXIMUM_ABSENCE_REQUEST_DAYS) {
      return failure(VACATION_DATE_RANGE_TOO_LARGE);
    }
    const localDate = date.toString() as LocalDate;
    const schedule = resolveSchedule(scheduleAssignments, localDate);
    if (!schedule.ok) return schedule;

    const holiday = holidays.has(localDate);
    const parsedEntitlementMinutes = parseNonNegativeMinutes(
      holiday ? 0 : schedule.value.scheduledMinutes,
    );
    if (!parsedEntitlementMinutes.ok) return failure(ABSENCE_COVERAGE_INVALID);

    coverage.push(
      Object.freeze({
        entitlementMinutes: parsedEntitlementMinutes.value,
        holiday,
        kind: 'FULL_DAY',
        localDate,
        scheduledMinutes: schedule.value.scheduledMinutes,
      }),
    );
    total += parsedEntitlementMinutes.value;
    date = date.add({ days: 1 });
  }

  const entitlementMinutes = parseNonNegativeMinutes(total);
  if (!entitlementMinutes.ok) return failure(ABSENCE_COVERAGE_INVALID);
  return success(
    Object.freeze({
      coverage: Object.freeze(coverage),
      entitlementMinutes: entitlementMinutes.value,
    }),
  );
}

function resolvePartialEntitlement(
  coverage: Exclude<AbsenceRequestCoverageInput, { kind: 'FULL_DAY' }>,
  scheduledMinutes: NonNegativeMinutes,
  holiday: boolean,
): NonNegativeMinutes | null {
  if (coverage.kind === 'FIRST_HALF') {
    return asNonNegativeMinutes(holiday ? 0 : Math.floor(scheduledMinutes / 2));
  }
  if (coverage.kind === 'SECOND_HALF') {
    return asNonNegativeMinutes(holiday ? 0 : scheduledMinutes - Math.floor(scheduledMinutes / 2));
  }
  if (coverage.kind !== 'MINUTE_INTERVAL') return null;

  if (
    !Number.isSafeInteger(coverage.startsAtMinute) ||
    !Number.isSafeInteger(coverage.endsAtMinute) ||
    coverage.startsAtMinute < 0 ||
    coverage.startsAtMinute > 1_439 ||
    coverage.endsAtMinute < 1 ||
    coverage.endsAtMinute > 1_440 ||
    coverage.startsAtMinute >= coverage.endsAtMinute
  ) {
    return null;
  }
  const elapsedMinutes = coverage.endsAtMinute - coverage.startsAtMinute;
  if (scheduledMinutes > 0 && elapsedMinutes > scheduledMinutes) return null;
  return asNonNegativeMinutes(holiday || scheduledMinutes === 0 ? 0 : elapsedMinutes);
}

function asNonNegativeMinutes(value: number): NonNegativeMinutes | null {
  const parsed = parseNonNegativeMinutes(value);
  return parsed.ok ? parsed.value : null;
}
