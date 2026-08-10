import {
  calculateDailyAttendance,
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  createLocalDateRange,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  weekdays,
  type DailyAttendanceCalculationError,
  type DailyAttendanceCalculationInput,
  type DailyWorkInterval,
  type DomainError,
  type Result,
  type Weekday,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function expectFailureCode<T, E extends DomainError>(result: Result<T, E>, code: E['code']): void {
  expect(result).toEqual({ error: { code }, ok: false });
}

function id<Entity extends string>(value: string) {
  return expectSuccess(parseDomainId<Entity>(value));
}

function minutes(value: number) {
  return expectSuccess(parseNonNegativeMinutes(value));
}

function signedMinutes(value: number) {
  return expectSuccess(parseSignedMinutes(value));
}

function date(value: string) {
  return expectSuccess(parseLocalDate(value));
}

function instant(value: string) {
  return expectSuccess(parseInstant(value));
}

function interval(startsAt: string, endsAt: string): DailyWorkInterval {
  return Object.freeze({ endsAt: instant(endsAt), startsAt: instant(startsAt) });
}

function weekdayMinutes(defaultMinutes: number): Record<Weekday, unknown> {
  return Object.fromEntries(weekdays.map((weekday) => [weekday, defaultMinutes])) as Record<
    Weekday,
    unknown
  >;
}

function baseInput(
  overrides: Partial<DailyAttendanceCalculationInput> = {},
): DailyAttendanceCalculationInput {
  const schedule = expectSuccess(
    createWeeklySchedule(id<'WorkScheduleVersion'>('daily-schedule'), weekdayMinutes(480)),
  );
  const policy = expectSuccess(createTimePolicy(id<'TimePolicyVersion'>('daily-policy')));
  const scheduleAssignment = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('daily-schedule-assignment'),
      expectSuccess(createLocalDateRange(date('2026-02-01'))),
      schedule,
    ),
  );
  const policyAssignment = expectSuccess(
    createPolicyAssignment(
      id<'PolicyAssignment'>('daily-policy-assignment'),
      expectSuccess(createLocalDateRange(date('2026-02-01'))),
      policy,
    ),
  );

  return {
    absenceCreditMinutes: minutes(0),
    absenceExpectedReductionMinutes: minutes(0),
    approvedAdjustmentMinutes: signedMinutes(0),
    holidayExpectedReductionMinutes: minutes(0),
    localDate: date('2026-02-03'),
    policyAssignments: [policyAssignment],
    scheduleAssignments: [scheduleAssignment],
    workIntervals: [],
    ...overrides,
  };
}

test('calculates the normal-day expected, worked, credited, and balance breakdown', () => {
  const calculation = expectSuccess(
    calculateDailyAttendance(
      baseInput({
        workIntervals: [
          interval('2026-02-03T06:00:00Z', '2026-02-03T10:00:00Z'),
          interval('2026-02-03T10:30:00Z', '2026-02-03T14:30:00Z'),
        ],
      }),
    ),
  );

  expect(calculation).toEqual({
    absenceCreditMinutes: 0,
    absenceExpectedReductionMinutes: 0,
    approvedAdjustmentMinutes: 0,
    creditedMinutes: 480,
    dailyBalanceMinutes: 0,
    expectedMinutes: 480,
    holidayExpectedReductionMinutes: 0,
    scheduledMinutes: 480,
    workedMinutes: 480,
  });
  expect(Object.isFrozen(calculation)).toBe(true);
});

test('calculates positive flexible time from multiple non-overlapping work intervals', () => {
  const calculation = expectSuccess(
    calculateDailyAttendance(
      baseInput({
        workIntervals: [
          interval('2026-02-03T06:00:00Z', '2026-02-03T10:00:00Z'),
          interval('2026-02-03T10:30:00Z', '2026-02-03T15:10:00Z'),
        ],
      }),
    ),
  );

  expect(calculation.workedMinutes).toBe(520);
  expect(calculation.creditedMinutes).toBe(520);
  expect(calculation.dailyBalanceMinutes).toBe(40);
});

test('calculates negative flexible time without clamping the signed balance', () => {
  const calculation = expectSuccess(
    calculateDailyAttendance(
      baseInput({
        workIntervals: [
          interval('2026-02-03T06:15:00Z', '2026-02-03T10:00:00Z'),
          interval('2026-02-03T10:30:00Z', '2026-02-03T14:00:00Z'),
        ],
      }),
    ),
  );

  expect(calculation.workedMinutes).toBe(435);
  expect(calculation.creditedMinutes).toBe(435);
  expect(calculation.dailyBalanceMinutes).toBe(-45);
});

test('includes explicit effective source amounts without creating absence or adjustment records', () => {
  const calculation = expectSuccess(
    calculateDailyAttendance(
      baseInput({
        absenceCreditMinutes: minutes(240),
        absenceExpectedReductionMinutes: minutes(120),
        approvedAdjustmentMinutes: signedMinutes(-30),
        workIntervals: [interval('2026-02-03T06:00:00Z', '2026-02-03T08:00:00Z')],
      }),
    ),
  );

  expect(calculation.expectedMinutes).toBe(360);
  expect(calculation.workedMinutes).toBe(120);
  expect(calculation.creditedMinutes).toBe(330);
  expect(calculation.dailyBalanceMinutes).toBe(-30);
});

test('reduces expected minutes for an effective holiday without discarding worked credit', () => {
  const calculation = expectSuccess(
    calculateDailyAttendance(
      baseInput({
        holidayExpectedReductionMinutes: minutes(480),
        workIntervals: [interval('2026-02-03T08:00:00Z', '2026-02-03T10:00:00Z')],
      }),
    ),
  );

  expect(calculation.expectedMinutes).toBe(0);
  expect(calculation.creditedMinutes).toBe(120);
  expect(calculation.dailyBalanceMinutes).toBe(120);
});

test.each([
  [
    baseInput({
      workIntervals: [
        interval('2026-02-03T06:00:00Z', '2026-02-03T10:00:00Z'),
        interval('2026-02-03T09:30:00Z', '2026-02-03T12:00:00Z'),
      ],
    }),
    'ATTENDANCE_OVERLAP',
  ],
  [
    baseInput({
      workIntervals: [interval('2026-02-03T10:00:00Z', '2026-02-03T09:59:00Z')],
    }),
    'ATTENDANCE_INVALID_EVENT_ORDER',
  ],
  [
    baseInput({
      holidayExpectedReductionMinutes: minutes(481),
    }),
    'POLICY_CONFIGURATION_INVALID',
  ],
  [
    baseInput({
      approvedAdjustmentMinutes: signedMinutes(-1),
    }),
    'POLICY_CONFIGURATION_INVALID',
  ],
] as const satisfies readonly [
  DailyAttendanceCalculationInput,
  DailyAttendanceCalculationError['code'],
][])('returns a stable code for an invalid daily source set', (input, code) => {
  expectFailureCode(calculateDailyAttendance(input), code);
});

test('propagates a schedule configuration gap instead of inventing expected minutes', () => {
  expectFailureCode(
    calculateDailyAttendance(baseInput({ scheduleAssignments: [] })),
    'SCHEDULE_NOT_ASSIGNED',
  );
});
