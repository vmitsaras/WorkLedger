import {
  createLocalDateRange,
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  parseDomainId,
  parseLocalDate,
  resolveEffectiveTimeConfiguration,
  resolvePolicy,
  resolveSchedule,
  weekdays,
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

function date(value: string) {
  return expectSuccess(parseLocalDate(value));
}

function range(validFrom: string, validTo: string | null = null) {
  return expectSuccess(
    createLocalDateRange(date(validFrom), validTo === null ? null : date(validTo)),
  );
}

function weekdayMinutes(
  defaultMinutes: unknown,
  overrides: Partial<Record<Weekday, unknown>> = {},
): Record<Weekday, unknown> {
  return Object.fromEntries(
    weekdays.map((weekday) => [
      weekday,
      Object.hasOwn(overrides, weekday) ? overrides[weekday] : defaultMinutes,
    ]),
  ) as Record<Weekday, unknown>;
}

function schedule(
  idValue: string,
  defaultMinutes = 480,
  overrides: Partial<Record<Weekday, unknown>> = {},
) {
  return expectSuccess(
    createWeeklySchedule(
      id<'WorkScheduleVersion'>(idValue),
      weekdayMinutes(defaultMinutes, overrides),
    ),
  );
}

function policy(idValue: string) {
  return expectSuccess(createTimePolicy(id<'TimePolicyVersion'>(idValue)));
}

test('validates seven weekday schedule values without treating zero as a missing day', () => {
  const weeklySchedule = expectSuccess(
    createWeeklySchedule(
      id<'WorkScheduleVersion'>('schedule-zero-friday'),
      weekdayMinutes(480, { FRIDAY: 0 }),
    ),
  );

  expect(weeklySchedule.scheduledMinutes.FRIDAY).toBe(0);
  expect(Object.isFrozen(weeklySchedule)).toBe(true);
  expect(Object.isFrozen(weeklySchedule.scheduledMinutes)).toBe(true);

  for (const invalid of [undefined, -1, 1.5, 1_441, '480']) {
    expectFailureCode(
      createWeeklySchedule(
        id<'WorkScheduleVersion'>(`schedule-invalid-${String(invalid).replace('.', '-')}`),
        weekdayMinutes(480, { WEDNESDAY: invalid }),
      ),
      'INVALID_WEEKLY_SCHEDULE',
    );
  }
});

test('resolves adjacent half-open schedule assignments at the exact change boundary', () => {
  const oldAssignment = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('schedule-assignment-old'),
      range('2026-04-01', '2026-04-15'),
      schedule('schedule-old', 480),
    ),
  );
  const newAssignment = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('schedule-assignment-new'),
      range('2026-04-15'),
      schedule('schedule-new', 360),
    ),
  );

  const beforeBoundary = expectSuccess(
    resolveSchedule([newAssignment, oldAssignment], date('2026-04-14')),
  );
  const atBoundary = expectSuccess(
    resolveSchedule([oldAssignment, newAssignment], date('2026-04-15')),
  );

  expect(beforeBoundary.assignment.id).toBe('schedule-assignment-old');
  expect(beforeBoundary.scheduledMinutes).toBe(480);
  expect(atBoundary.assignment.id).toBe('schedule-assignment-new');
  expect(atBoundary.scheduledMinutes).toBe(360);
  expect(atBoundary.weekday).toBe('WEDNESDAY');
});

test('returns a stable schedule gap error even when an explicit zero-hour schedule exists elsewhere', () => {
  const zeroHourFriday = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('schedule-assignment-zero-friday'),
      range('2026-02-06', '2026-02-07'),
      schedule('schedule-zero-hour', 480, { FRIDAY: 0 }),
    ),
  );

  expect(
    expectSuccess(resolveSchedule([zeroHourFriday], date('2026-02-06'))).scheduledMinutes,
  ).toBe(0);
  expectFailureCode(resolveSchedule([zeroHourFriday], date('2026-02-07')), 'SCHEDULE_NOT_ASSIGNED');
});

test('returns a stable schedule overlap error instead of choosing by order', () => {
  const first = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('schedule-assignment-first'),
      range('2026-04-01', '2026-05-01'),
      schedule('schedule-first'),
    ),
  );
  const second = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('schedule-assignment-second'),
      range('2026-04-15', '2026-05-15'),
      schedule('schedule-second'),
    ),
  );

  expectFailureCode(
    resolveSchedule([second, first], date('2026-04-15')),
    'SCHEDULE_ASSIGNMENT_OVERLAP',
  );
  expectFailureCode(
    resolveSchedule([first, second], date('2026-04-15')),
    'SCHEDULE_ASSIGNMENT_OVERLAP',
  );
});

test('resolves exactly one policy and makes gaps and overlaps explicit', () => {
  const first = expectSuccess(
    createPolicyAssignment(
      id<'PolicyAssignment'>('policy-assignment-first'),
      range('2026-04-01', '2026-04-15'),
      policy('policy-first'),
    ),
  );
  const second = expectSuccess(
    createPolicyAssignment(
      id<'PolicyAssignment'>('policy-assignment-second'),
      range('2026-04-15', '2026-05-01'),
      policy('policy-second'),
    ),
  );
  const overlap = expectSuccess(
    createPolicyAssignment(
      id<'PolicyAssignment'>('policy-assignment-overlap'),
      range('2026-04-20', '2026-05-15'),
      policy('policy-overlap'),
    ),
  );

  expect(
    expectSuccess(resolvePolicy([second, first], date('2026-04-15'))).assignment.policy.id,
  ).toBe('policy-second');
  expectFailureCode(resolvePolicy([first, second], date('2026-05-01')), 'POLICY_NOT_ASSIGNED');
  expectFailureCode(
    resolvePolicy([first, second, overlap], date('2026-04-20')),
    'POLICY_ASSIGNMENT_OVERLAP',
  );
});

test('resolves a complete configuration only when both schedule and policy assignments apply', () => {
  const scheduleAssignment = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('schedule-assignment-complete'),
      range('2026-02-01'),
      schedule('schedule-complete', 480),
    ),
  );
  const policyAssignment = expectSuccess(
    createPolicyAssignment(
      id<'PolicyAssignment'>('policy-assignment-complete'),
      range('2026-02-01'),
      policy('policy-complete'),
    ),
  );

  const resolved = expectSuccess(
    resolveEffectiveTimeConfiguration([scheduleAssignment], [policyAssignment], date('2026-02-03')),
  );
  expect(resolved.schedule.scheduledMinutes).toBe(480);
  expect(resolved.policy.assignment.policy.id).toBe('policy-complete');

  expectFailureCode(
    resolveEffectiveTimeConfiguration([scheduleAssignment], [], date('2026-02-03')),
    'POLICY_NOT_ASSIGNED',
  );
  expectFailureCode(
    resolveEffectiveTimeConfiguration([], [policyAssignment], date('2026-02-03')),
    'SCHEDULE_NOT_ASSIGNED',
  );
});
