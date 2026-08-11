import { type NonNegativeMinutes, type SignedMinutes } from './shared/minutes.js';

export const calculationWarningCodes = Object.freeze([
  'WORK_ON_ZERO_EXPECTED_DAY',
  'WORK_ON_HOLIDAY',
  'WORK_DURING_ABSENCE',
  'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
  'FLEX_NEGATIVE_THRESHOLD_EXCEEDED',
] as const);

export const calculationBlockerCodes = Object.freeze([
  'ATTENDANCE_INCOMPLETE',
  'ATTENDANCE_OVERLAP',
  'ATTENDANCE_INVALID_EVENT_ORDER',
  'ATTENDANCE_INVALID_EVENT_PRECISION',
  'SCHEDULE_NOT_ASSIGNED',
  'SCHEDULE_ASSIGNMENT_OVERLAP',
  'POLICY_NOT_ASSIGNED',
  'POLICY_ASSIGNMENT_OVERLAP',
  'POLICY_CONFIGURATION_INVALID',
  'CORRECTION_UNRESOLVED',
  'ABSENCE_APPROVAL_PENDING',
  'LEDGER_SOURCE_MISMATCH',
] as const);

export type CalculationWarningCode = (typeof calculationWarningCodes)[number];
export type CalculationBlockerCode = (typeof calculationBlockerCodes)[number];
export type AttendanceCalculationConflictCode = Extract<
  CalculationBlockerCode,
  'ATTENDANCE_OVERLAP' | 'ATTENDANCE_INVALID_EVENT_ORDER' | 'ATTENDANCE_INVALID_EVENT_PRECISION'
>;

export type ConfigurationCalculationConflictCode = Extract<
  CalculationBlockerCode,
  'SCHEDULE_ASSIGNMENT_OVERLAP' | 'POLICY_ASSIGNMENT_OVERLAP' | 'POLICY_CONFIGURATION_INVALID'
>;

export type DailyCalculationSignalsInput = Readonly<{
  attendanceConflictCodes: readonly AttendanceCalculationConflictCode[];
  configurationConflictCodes?: readonly ConfigurationCalculationConflictCode[];
  dailyBalanceMinutes: SignedMinutes | null;
  expectedMinutes: NonNegativeMinutes | null;
  flexNegativeThresholdMinutes: NonNegativeMinutes | null;
  flexPositiveThresholdMinutes: NonNegativeMinutes | null;
  hasIncompleteAttendance: boolean;
  hasMissingPolicy: boolean;
  hasMissingSchedule: boolean;
  hasSourceLedgerMismatch: boolean;
  hasUnresolvedApprovalRequiredAbsence: boolean;
  hasUnresolvedCorrection: boolean;
  isHoliday: boolean;
  workedMinutes: NonNegativeMinutes | null;
  workDuringAbsence: boolean;
}>;

export type DailyCalculationSignals = Readonly<{
  submissionBlockers: readonly CalculationBlockerCode[];
  warnings: readonly CalculationWarningCode[];
}>;

/**
 * Derives stable warning and submission-blocker codes from already identified calculation facts.
 * It does not construct source facts, determine a daily calculation's finality, or mutate state.
 */
export function calculateDailyCalculationSignals(
  input: DailyCalculationSignalsInput,
): DailyCalculationSignals {
  const submissionBlockers = new Set<CalculationBlockerCode>();
  const warnings = new Set<CalculationWarningCode>();

  if (input.hasIncompleteAttendance) {
    submissionBlockers.add('ATTENDANCE_INCOMPLETE');
  }
  for (const conflictCode of input.attendanceConflictCodes) {
    submissionBlockers.add(conflictCode);
  }
  for (const conflictCode of input.configurationConflictCodes ?? []) {
    submissionBlockers.add(conflictCode);
  }
  if (input.hasMissingSchedule) {
    submissionBlockers.add('SCHEDULE_NOT_ASSIGNED');
  }
  if (input.hasMissingPolicy) {
    submissionBlockers.add('POLICY_NOT_ASSIGNED');
  }
  if (input.hasSourceLedgerMismatch) {
    submissionBlockers.add('LEDGER_SOURCE_MISMATCH');
  }
  if (input.hasUnresolvedApprovalRequiredAbsence) {
    submissionBlockers.add('ABSENCE_APPROVAL_PENDING');
  }
  if (input.hasUnresolvedCorrection) {
    submissionBlockers.add('CORRECTION_UNRESOLVED');
  }

  addWorkWarnings(input, warnings);
  addThresholdWarnings(input, warnings);

  return Object.freeze({
    submissionBlockers: Object.freeze(
      calculationBlockerCodes.filter((code) => submissionBlockers.has(code)),
    ),
    warnings: Object.freeze(calculationWarningCodes.filter((code) => warnings.has(code))),
  });
}

function addWorkWarnings(
  input: DailyCalculationSignalsInput,
  warnings: Set<CalculationWarningCode>,
): void {
  if (input.workDuringAbsence) {
    warnings.add('WORK_DURING_ABSENCE');
  }

  if (input.expectedMinutes !== 0 || input.workedMinutes === null || input.workedMinutes === 0) {
    return;
  }

  warnings.add(input.isHoliday ? 'WORK_ON_HOLIDAY' : 'WORK_ON_ZERO_EXPECTED_DAY');
}

function addThresholdWarnings(
  input: DailyCalculationSignalsInput,
  warnings: Set<CalculationWarningCode>,
): void {
  if (
    input.dailyBalanceMinutes !== null &&
    input.flexPositiveThresholdMinutes !== null &&
    input.dailyBalanceMinutes > input.flexPositiveThresholdMinutes
  ) {
    warnings.add('FLEX_POSITIVE_THRESHOLD_EXCEEDED');
  }

  if (
    input.dailyBalanceMinutes !== null &&
    input.flexNegativeThresholdMinutes !== null &&
    input.dailyBalanceMinutes < -input.flexNegativeThresholdMinutes
  ) {
    warnings.add('FLEX_NEGATIVE_THRESHOLD_EXCEEDED');
  }
}
