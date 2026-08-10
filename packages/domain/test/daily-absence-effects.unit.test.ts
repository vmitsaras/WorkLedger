import {
  calculateDailyAbsenceEffects,
  calculateDailyAttendance,
  createLocalDateRange,
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  weekdays,
  type DailyAbsenceEffectsError,
  type DailyAttendanceCalculationInput,
  type DailyWorkInterval,
  type DomainError,
  type EffectiveAbsenceEffect,
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

function effect(
  coverage: EffectiveAbsenceEffect['coverage'],
  timeTreatment: EffectiveAbsenceEffect['timeTreatment'],
): EffectiveAbsenceEffect {
  return Object.freeze({ coverage, timeTreatment });
}

function weekdayMinutes(defaultMinutes: number): Record<Weekday, unknown> {
  return Object.fromEntries(weekdays.map((weekday) => [weekday, defaultMinutes])) as Record<
    Weekday,
    unknown
  >;
}

function dailyInput(
  absenceInputs: Readonly<{
    absenceCreditMinutes: ReturnType<typeof minutes>;
    absenceExpectedReductionMinutes: ReturnType<typeof minutes>;
  }>,
): DailyAttendanceCalculationInput {
  const schedule = expectSuccess(
    createWeeklySchedule(
      id<'WorkScheduleVersion'>('absence-effects-schedule'),
      weekdayMinutes(481),
    ),
  );
  const policy = expectSuccess(createTimePolicy(id<'TimePolicyVersion'>('absence-effects-policy')));
  const scheduleAssignment = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('absence-effects-schedule-assignment'),
      expectSuccess(createLocalDateRange(date('2026-02-01'))),
      schedule,
    ),
  );
  const policyAssignment = expectSuccess(
    createPolicyAssignment(
      id<'PolicyAssignment'>('absence-effects-policy-assignment'),
      expectSuccess(createLocalDateRange(date('2026-02-01'))),
      policy,
    ),
  );

  return {
    ...absenceInputs,
    approvedAdjustmentMinutes: signedMinutes(0),
    holidayExpectedReductionMinutes: minutes(0),
    localDate: date('2026-02-03'),
    policyAssignments: [policyAssignment],
    scheduleAssignments: [scheduleAssignment],
    workIntervals: [],
  };
}

test('partitions an odd day between paid and unpaid halves for the daily calculator', () => {
  const absenceInputs = expectSuccess(
    calculateDailyAbsenceEffects({
      baseExpectedMinutes: minutes(481),
      effects: [
        effect({ kind: 'HALF_DAY', portion: 'FIRST_HALF' }, 'CREDIT_COVERED_EXPECTATION'),
        effect({ kind: 'HALF_DAY', portion: 'SECOND_HALF' }, 'REDUCE_COVERED_EXPECTATION'),
      ],
      workIntervals: [],
    }),
  );

  expect(absenceInputs).toEqual({
    absenceCreditMinutes: 240,
    absenceExpectedReductionMinutes: 241,
  });
  expect(Object.isFrozen(absenceInputs)).toBe(true);

  const calculation = expectSuccess(calculateDailyAttendance(dailyInput(absenceInputs)));
  expect(calculation.expectedMinutes).toBe(240);
  expect(calculation.creditedMinutes).toBe(240);
  expect(calculation.dailyBalanceMinutes).toBe(0);
});

test('limits full-day paid credit to the portion not already worked', () => {
  const absenceInputs = expectSuccess(
    calculateDailyAbsenceEffects({
      baseExpectedMinutes: minutes(480),
      effects: [effect({ kind: 'FULL_DAY' }, 'CREDIT_COVERED_EXPECTATION')],
      workIntervals: [interval('2026-02-03T08:00:00Z', '2026-02-03T10:00:00Z')],
    }),
  );

  expect(absenceInputs).toEqual({
    absenceCreditMinutes: 360,
    absenceExpectedReductionMinutes: 0,
  });
});

test('subtracts the exact worked intersection from paid minute coverage', () => {
  const absenceInputs = expectSuccess(
    calculateDailyAbsenceEffects({
      baseExpectedMinutes: minutes(480),
      effects: [
        effect(
          {
            endsAt: instant('2026-02-03T11:00:00Z'),
            kind: 'MINUTES',
            startsAt: instant('2026-02-03T10:00:00Z'),
          },
          'CREDIT_COVERED_EXPECTATION',
        ),
      ],
      workIntervals: [interval('2026-02-03T10:30:00Z', '2026-02-03T11:30:00Z')],
    }),
  );

  expect(absenceInputs).toEqual({
    absenceCreditMinutes: 30,
    absenceExpectedReductionMinutes: 0,
  });
});

test('applies no default absence effect on a holiday or zero-hour date', () => {
  const absenceInputs = expectSuccess(
    calculateDailyAbsenceEffects({
      baseExpectedMinutes: minutes(0),
      effects: [effect({ kind: 'FULL_DAY' }, 'CREDIT_COVERED_EXPECTATION')],
      workIntervals: [],
    }),
  );

  expect(absenceInputs).toEqual({
    absenceCreditMinutes: 0,
    absenceExpectedReductionMinutes: 0,
  });
});

test.each([
  [
    {
      baseExpectedMinutes: minutes(480),
      effects: [
        effect({ kind: 'FULL_DAY' }, 'CREDIT_COVERED_EXPECTATION'),
        effect({ kind: 'HALF_DAY', portion: 'FIRST_HALF' }, 'REDUCE_COVERED_EXPECTATION'),
      ],
      workIntervals: [],
    },
    'ABSENCE_OVERLAP',
  ],
  [
    {
      baseExpectedMinutes: minutes(480),
      effects: [
        effect(
          {
            endsAt: instant('2026-02-03T11:00:00Z'),
            kind: 'MINUTES',
            startsAt: instant('2026-02-03T10:00:00Z'),
          },
          'CREDIT_COVERED_EXPECTATION',
        ),
        effect(
          {
            endsAt: instant('2026-02-03T11:30:00Z'),
            kind: 'MINUTES',
            startsAt: instant('2026-02-03T10:30:00Z'),
          },
          'REDUCE_COVERED_EXPECTATION',
        ),
      ],
      workIntervals: [],
    },
    'ABSENCE_OVERLAP',
  ],
  [
    {
      baseExpectedMinutes: minutes(480),
      effects: [],
      workIntervals: [
        interval('2026-02-03T08:00:00Z', '2026-02-03T10:00:00Z'),
        interval('2026-02-03T09:30:00Z', '2026-02-03T11:00:00Z'),
      ],
    },
    'ATTENDANCE_OVERLAP',
  ],
] as const satisfies readonly [
  Parameters<typeof calculateDailyAbsenceEffects>[0],
  DailyAbsenceEffectsError['code'],
][])('returns a stable error for conflicting coverage or work', (input, code) => {
  expectFailureCode(calculateDailyAbsenceEffects(input), code);
});
