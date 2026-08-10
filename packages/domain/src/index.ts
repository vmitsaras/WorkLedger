export const workspacePackage = '@workledger/domain' as const;
export const workspaceDependencies = [] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];

export {
  createLocalDateRange,
  localDateRangeContains,
  type InvalidLocalDateRangeError,
  type LocalDateRange,
} from './shared/date-range.js';
export { parseDomainId, type DomainId, type InvalidDomainIdError } from './shared/identifiers.js';
export {
  parseNonNegativeMinutes,
  parseSignedMinutes,
  type InvalidNonNegativeMinutesError,
  type InvalidSignedMinutesError,
  type NonNegativeMinutes,
  type SignedMinutes,
} from './shared/minutes.js';
export {
  failure,
  success,
  type DomainError,
  type Failure,
  type Result,
  type Success,
} from './shared/result.js';
export {
  compareLocalDates,
  parseInstant,
  parseLocalDate,
  parseTimeZoneId,
  type Instant,
  type InvalidInstantError,
  type InvalidLocalDateError,
  type InvalidTimeZoneIdError,
  type LocalDate,
  type TimeZoneId,
} from './shared/temporal.js';
export {
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  resolveEffectiveTimeConfiguration,
  resolvePolicy,
  resolveSchedule,
  weekdays,
  type EffectiveTimeConfiguration,
  type EffectiveTimeConfigurationError,
  type InvalidPolicyAssignmentError,
  type InvalidScheduleAssignmentError,
  type InvalidTimePolicyError,
  type InvalidWeeklyScheduleError,
  type PolicyAssignment,
  type PolicyAssignmentOverlapError,
  type PolicyNotAssignedError,
  type PolicyResolutionError,
  type ResolvedPolicy,
  type ResolvedSchedule,
  type ScheduleAssignment,
  type ScheduleAssignmentOverlapError,
  type ScheduleNotAssignedError,
  type ScheduleResolutionError,
  type TimePolicy,
  type Weekday,
  type WeeklySchedule,
} from './schedule-policy.js';
