import {
  calculateDailyCalculationSignals,
  calculationBlockerCodes,
  calculationWarningCodes,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  type DailyCalculationSignalsInput,
  type DomainError,
  type Result,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function minutes(value: number) {
  return expectSuccess(parseNonNegativeMinutes(value));
}

function signedMinutes(value: number) {
  return expectSuccess(parseSignedMinutes(value));
}

function input(
  overrides: Partial<DailyCalculationSignalsInput> = {},
): DailyCalculationSignalsInput {
  return {
    attendanceConflictCodes: [],
    dailyBalanceMinutes: signedMinutes(0),
    expectedMinutes: minutes(480),
    flexNegativeThresholdMinutes: null,
    flexPositiveThresholdMinutes: null,
    hasIncompleteAttendance: false,
    hasMissingPolicy: false,
    hasMissingSchedule: false,
    hasSourceLedgerMismatch: false,
    hasUnresolvedApprovalRequiredAbsence: false,
    hasUnresolvedCorrection: false,
    isHoliday: false,
    workedMinutes: minutes(480),
    workDuringAbsence: false,
    ...overrides,
  };
}

test('emits holiday-specific work, absence, and positive-threshold warnings without changing totals', () => {
  const signals = calculateDailyCalculationSignals(
    input({
      dailyBalanceMinutes: signedMinutes(120),
      expectedMinutes: minutes(0),
      flexPositiveThresholdMinutes: minutes(30),
      isHoliday: true,
      workedMinutes: minutes(120),
      workDuringAbsence: true,
    }),
  );

  expect(signals).toEqual({
    submissionBlockers: [],
    warnings: ['WORK_ON_HOLIDAY', 'WORK_DURING_ABSENCE', 'FLEX_POSITIVE_THRESHOLD_EXCEEDED'],
  });
  expect(Object.isFrozen(signals)).toBe(true);
  expect(Object.isFrozen(signals.warnings)).toBe(true);
  expect(Object.isFrozen(signals.submissionBlockers)).toBe(true);
});

test('uses the zero-expected-day warning only when the date is not a holiday', () => {
  const signals = calculateDailyCalculationSignals(
    input({
      dailyBalanceMinutes: signedMinutes(120),
      expectedMinutes: minutes(0),
      workedMinutes: minutes(120),
    }),
  );

  expect(signals).toEqual({
    submissionBlockers: [],
    warnings: ['WORK_ON_ZERO_EXPECTED_DAY'],
  });
});

test('emits a negative threshold warning without clamping the signed balance', () => {
  const signals = calculateDailyCalculationSignals(
    input({
      dailyBalanceMinutes: signedMinutes(-45),
      flexNegativeThresholdMinutes: minutes(30),
      workedMinutes: minutes(435),
    }),
  );

  expect(signals.warnings).toEqual(['FLEX_NEGATIVE_THRESHOLD_EXCEEDED']);
});

test('returns all identified submission blockers in stable order without duplicates', () => {
  const signals = calculateDailyCalculationSignals(
    input({
      attendanceConflictCodes: [
        'ATTENDANCE_INVALID_EVENT_ORDER',
        'ATTENDANCE_OVERLAP',
        'ATTENDANCE_OVERLAP',
      ],
      dailyBalanceMinutes: null,
      expectedMinutes: null,
      hasIncompleteAttendance: true,
      hasMissingPolicy: true,
      hasMissingSchedule: true,
      hasSourceLedgerMismatch: true,
      hasUnresolvedApprovalRequiredAbsence: true,
      hasUnresolvedCorrection: true,
      workedMinutes: null,
    }),
  );

  expect(signals).toEqual({
    submissionBlockers: [
      'ATTENDANCE_INCOMPLETE',
      'ATTENDANCE_OVERLAP',
      'ATTENDANCE_INVALID_EVENT_ORDER',
      'SCHEDULE_NOT_ASSIGNED',
      'POLICY_NOT_ASSIGNED',
      'CORRECTION_UNRESOLVED',
      'ABSENCE_APPROVAL_PENDING',
      'LEDGER_SOURCE_MISMATCH',
    ],
    warnings: [],
  });
});

test('does not infer warnings from unavailable final calculation amounts', () => {
  const signals = calculateDailyCalculationSignals(
    input({
      dailyBalanceMinutes: null,
      expectedMinutes: null,
      workedMinutes: null,
    }),
  );

  expect(signals).toEqual({ submissionBlockers: [], warnings: [] });
});

test('exports immutable canonical warning and blocker-code order', () => {
  expect(calculationWarningCodes).toEqual([
    'WORK_ON_ZERO_EXPECTED_DAY',
    'WORK_ON_HOLIDAY',
    'WORK_DURING_ABSENCE',
    'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
    'FLEX_NEGATIVE_THRESHOLD_EXCEEDED',
  ]);
  expect(calculationBlockerCodes).toEqual([
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
  ]);
  expect(Object.isFrozen(calculationWarningCodes)).toBe(true);
  expect(Object.isFrozen(calculationBlockerCodes)).toBe(true);
});
