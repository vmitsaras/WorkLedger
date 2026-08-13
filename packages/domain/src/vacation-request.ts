import { Temporal } from '@js-temporal/polyfill';

import {
  resolveSchedule,
  type ScheduleResolutionError,
  type ScheduleAssignment,
} from './schedule-policy.js';
import { parseNonNegativeMinutes, type NonNegativeMinutes } from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { compareLocalDates, type LocalDate } from './shared/temporal.js';

export type VacationRequestCoverage = Readonly<{
  entitlementMinutes: NonNegativeMinutes;
  holiday: boolean;
  kind: 'FULL_DAY';
  localDate: LocalDate;
  scheduledMinutes: NonNegativeMinutes;
}>;

export type VacationRequestCalculation = Readonly<{
  coverage: readonly VacationRequestCoverage[];
  entitlementMinutes: NonNegativeMinutes;
}>;

export type VacationRequestCalculationInput = Readonly<{
  endDate: LocalDate;
  holidayDates: readonly LocalDate[];
  scheduleAssignments: readonly ScheduleAssignment[];
  startDate: LocalDate;
}>;

export type VacationRequestCalculationError =
  | DomainError<'VACATION_DATE_RANGE_INVALID'>
  | DomainError<'VACATION_DATE_RANGE_TOO_LARGE'>
  | ScheduleResolutionError;

const MAXIMUM_VACATION_REQUEST_DAYS = 366;
const VACATION_DATE_RANGE_INVALID = Object.freeze({ code: 'VACATION_DATE_RANGE_INVALID' } as const);
const VACATION_DATE_RANGE_TOO_LARGE = Object.freeze({
  code: 'VACATION_DATE_RANGE_TOO_LARGE',
} as const);

/**
 * Expands a full-day vacation range into immutable date coverage. Holidays and zero-hour days
 * remain visible coverage but consume no entitlement, as required by the absence policy.
 */
export function calculateVacationRequest(
  input: VacationRequestCalculationInput,
): Result<VacationRequestCalculation, VacationRequestCalculationError> {
  if (compareLocalDates(input.startDate, input.endDate) > 0) {
    return failure(VACATION_DATE_RANGE_INVALID);
  }

  const holidays = new Set(input.holidayDates);
  const coverage: VacationRequestCoverage[] = [];
  let total = 0;
  let date = Temporal.PlainDate.from(input.startDate);
  const end = Temporal.PlainDate.from(input.endDate);

  while (Temporal.PlainDate.compare(date, end) <= 0) {
    if (coverage.length === MAXIMUM_VACATION_REQUEST_DAYS) {
      return failure(VACATION_DATE_RANGE_TOO_LARGE);
    }
    const localDate = date.toString() as LocalDate;
    const schedule = resolveSchedule(input.scheduleAssignments, localDate);
    if (!schedule.ok) return schedule;

    const holiday = holidays.has(localDate);
    const entitlementMinutes = holiday ? 0 : schedule.value.scheduledMinutes;
    const parsedEntitlementMinutes = parseNonNegativeMinutes(entitlementMinutes);
    if (!parsedEntitlementMinutes.ok) return failure(VACATION_DATE_RANGE_INVALID);

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
  if (!entitlementMinutes.ok) return failure(VACATION_DATE_RANGE_INVALID);
  return success(
    Object.freeze({
      coverage: Object.freeze(coverage),
      entitlementMinutes: entitlementMinutes.value,
    }),
  );
}
