import { Temporal } from '@js-temporal/polyfill';

import { localDateRangeContains, type LocalDateRange } from './shared/date-range.js';
import { type DomainId } from './shared/identifiers.js';
import { parseNonNegativeMinutes, type NonNegativeMinutes } from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type LocalDate } from './shared/temporal.js';

export const weekdays = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type Weekday = (typeof weekdays)[number];

export type WeeklySchedule = Readonly<{
  id: DomainId<'WorkScheduleVersion'>;
  scheduledMinutes: Readonly<Record<Weekday, NonNegativeMinutes>>;
}>;

export type TimePolicy = Readonly<{
  id: DomainId<'TimePolicyVersion'>;
}>;

export type ScheduleAssignment = Readonly<{
  id: DomainId<'ScheduleAssignment'>;
  effectiveRange: LocalDateRange;
  schedule: WeeklySchedule;
}>;

export type PolicyAssignment = Readonly<{
  id: DomainId<'PolicyAssignment'>;
  effectiveRange: LocalDateRange;
  policy: TimePolicy;
}>;

export type ResolvedSchedule = Readonly<{
  assignment: ScheduleAssignment;
  scheduledMinutes: NonNegativeMinutes;
  weekday: Weekday;
}>;

export type ResolvedPolicy = Readonly<{
  assignment: PolicyAssignment;
}>;

export type EffectiveTimeConfiguration = Readonly<{
  policy: ResolvedPolicy;
  schedule: ResolvedSchedule;
}>;

export type InvalidWeeklyScheduleError = DomainError<'INVALID_WEEKLY_SCHEDULE'>;
export type InvalidTimePolicyError = DomainError<'INVALID_TIME_POLICY'>;
export type InvalidScheduleAssignmentError = DomainError<'INVALID_SCHEDULE_ASSIGNMENT'>;
export type InvalidPolicyAssignmentError = DomainError<'INVALID_POLICY_ASSIGNMENT'>;
export type ScheduleNotAssignedError = DomainError<'SCHEDULE_NOT_ASSIGNED'>;
export type PolicyNotAssignedError = DomainError<'POLICY_NOT_ASSIGNED'>;
export type ScheduleAssignmentOverlapError = DomainError<'SCHEDULE_ASSIGNMENT_OVERLAP'>;
export type PolicyAssignmentOverlapError = DomainError<'POLICY_ASSIGNMENT_OVERLAP'>;

export type ScheduleResolutionError = ScheduleNotAssignedError | ScheduleAssignmentOverlapError;

export type PolicyResolutionError = PolicyNotAssignedError | PolicyAssignmentOverlapError;

export type EffectiveTimeConfigurationError = ScheduleResolutionError | PolicyResolutionError;

const MAX_SCHEDULED_MINUTES_PER_DAY = 1_440;
const INVALID_WEEKLY_SCHEDULE = Object.freeze({ code: 'INVALID_WEEKLY_SCHEDULE' } as const);
const INVALID_TIME_POLICY = Object.freeze({ code: 'INVALID_TIME_POLICY' } as const);
const INVALID_SCHEDULE_ASSIGNMENT = Object.freeze({
  code: 'INVALID_SCHEDULE_ASSIGNMENT',
} as const);
const INVALID_POLICY_ASSIGNMENT = Object.freeze({ code: 'INVALID_POLICY_ASSIGNMENT' } as const);
const SCHEDULE_NOT_ASSIGNED = Object.freeze({ code: 'SCHEDULE_NOT_ASSIGNED' } as const);
const POLICY_NOT_ASSIGNED = Object.freeze({ code: 'POLICY_NOT_ASSIGNED' } as const);
const SCHEDULE_ASSIGNMENT_OVERLAP = Object.freeze({
  code: 'SCHEDULE_ASSIGNMENT_OVERLAP',
} as const);
const POLICY_ASSIGNMENT_OVERLAP = Object.freeze({
  code: 'POLICY_ASSIGNMENT_OVERLAP',
} as const);

export function createWeeklySchedule(
  id: DomainId<'WorkScheduleVersion'>,
  scheduledMinutes: Readonly<Record<Weekday, unknown>>,
): Result<WeeklySchedule, InvalidWeeklyScheduleError> {
  const values = {} as Record<Weekday, NonNegativeMinutes>;

  for (const weekday of weekdays) {
    const minutes = parseNonNegativeMinutes(scheduledMinutes[weekday]);
    if (!minutes.ok || minutes.value > MAX_SCHEDULED_MINUTES_PER_DAY) {
      return failure(INVALID_WEEKLY_SCHEDULE);
    }

    values[weekday] = minutes.value;
  }

  return success(
    Object.freeze({
      id,
      scheduledMinutes: Object.freeze(values),
    }),
  );
}

export function createTimePolicy(
  id: DomainId<'TimePolicyVersion'>,
): Result<TimePolicy, InvalidTimePolicyError> {
  if (id.length === 0) {
    return failure(INVALID_TIME_POLICY);
  }

  return success(Object.freeze({ id }));
}

export function createScheduleAssignment(
  id: DomainId<'ScheduleAssignment'>,
  effectiveRange: LocalDateRange,
  schedule: WeeklySchedule,
): Result<ScheduleAssignment, InvalidScheduleAssignmentError> {
  if (id.length === 0) {
    return failure(INVALID_SCHEDULE_ASSIGNMENT);
  }

  return success(Object.freeze({ id, effectiveRange, schedule }));
}

export function createPolicyAssignment(
  id: DomainId<'PolicyAssignment'>,
  effectiveRange: LocalDateRange,
  policy: TimePolicy,
): Result<PolicyAssignment, InvalidPolicyAssignmentError> {
  if (id.length === 0) {
    return failure(INVALID_POLICY_ASSIGNMENT);
  }

  return success(Object.freeze({ id, effectiveRange, policy }));
}

export function resolveSchedule(
  assignments: readonly ScheduleAssignment[],
  date: LocalDate,
): Result<ResolvedSchedule, ScheduleResolutionError> {
  const matches = assignments.filter((assignment) =>
    localDateRangeContains(assignment.effectiveRange, date),
  );

  if (matches.length === 0) {
    return failure(SCHEDULE_NOT_ASSIGNED);
  }

  if (matches.length > 1) {
    return failure(SCHEDULE_ASSIGNMENT_OVERLAP);
  }

  const assignment = matches[0];
  if (assignment === undefined) {
    return failure(SCHEDULE_NOT_ASSIGNED);
  }

  const weekday = weekdayForLocalDate(date);
  return success(
    Object.freeze({
      assignment,
      scheduledMinutes: assignment.schedule.scheduledMinutes[weekday],
      weekday,
    }),
  );
}

export function resolvePolicy(
  assignments: readonly PolicyAssignment[],
  date: LocalDate,
): Result<ResolvedPolicy, PolicyResolutionError> {
  const matches = assignments.filter((assignment) =>
    localDateRangeContains(assignment.effectiveRange, date),
  );

  if (matches.length === 0) {
    return failure(POLICY_NOT_ASSIGNED);
  }

  if (matches.length > 1) {
    return failure(POLICY_ASSIGNMENT_OVERLAP);
  }

  const assignment = matches[0];
  if (assignment === undefined) {
    return failure(POLICY_NOT_ASSIGNED);
  }

  return success(Object.freeze({ assignment }));
}

export function resolveEffectiveTimeConfiguration(
  scheduleAssignments: readonly ScheduleAssignment[],
  policyAssignments: readonly PolicyAssignment[],
  date: LocalDate,
): Result<EffectiveTimeConfiguration, EffectiveTimeConfigurationError> {
  const schedule = resolveSchedule(scheduleAssignments, date);
  if (!schedule.ok) {
    return schedule;
  }

  const policy = resolvePolicy(policyAssignments, date);
  if (!policy.ok) {
    return policy;
  }

  return success(Object.freeze({ policy: policy.value, schedule: schedule.value }));
}

function weekdayForLocalDate(date: LocalDate): Weekday {
  return weekdays[Temporal.PlainDate.from(date).dayOfWeek - 1] as Weekday;
}
