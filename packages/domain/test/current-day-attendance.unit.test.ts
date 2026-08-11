import {
  calculateCurrentDayAttendance,
  createLocalDateRange,
  createPolicyAssignment,
  createScheduleAssignment,
  createTimePolicy,
  createWeeklySchedule,
  floorInstantToMinute,
  localDateInstantBounds,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  parseTimeZoneId,
  weekdays,
  type CurrentDayAttendanceInput,
  type DomainError,
  type PunchEvent,
  type Result,
  type Weekday,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function id<Entity extends string>(value: string) {
  return expectSuccess(parseDomainId<Entity>(value));
}

function instant(value: string) {
  return expectSuccess(parseInstant(value));
}

function localDate(value: string) {
  return expectSuccess(parseLocalDate(value));
}

function minutes(value: number) {
  return expectSuccess(parseNonNegativeMinutes(value));
}

function signedMinutes(value: number) {
  return expectSuccess(parseSignedMinutes(value));
}

const berlin = expectSuccess(parseTimeZoneId('Europe/Berlin'));

function event(eventSequence: number, occurredAt: string, type: PunchEvent['type']): PunchEvent {
  return Object.freeze({ eventSequence, occurredAt: instant(occurredAt), type });
}

function baseInput(overrides: Partial<CurrentDayAttendanceInput> = {}): CurrentDayAttendanceInput {
  const schedule = expectSuccess(
    createWeeklySchedule(
      id<'WorkScheduleVersion'>('current-day-schedule'),
      Object.fromEntries(weekdays.map((weekday) => [weekday, 480])) as Record<Weekday, unknown>,
    ),
  );
  const policy = expectSuccess(createTimePolicy(id<'TimePolicyVersion'>('current-day-policy')));
  const range = expectSuccess(createLocalDateRange(localDate('2026-01-01')));
  const scheduleAssignment = expectSuccess(
    createScheduleAssignment(
      id<'ScheduleAssignment'>('current-day-schedule-assignment'),
      range,
      schedule,
    ),
  );
  const policyAssignment = expectSuccess(
    createPolicyAssignment(id<'PolicyAssignment'>('current-day-policy-assignment'), range, policy),
  );

  return {
    absenceCreditMinutes: minutes(0),
    absenceExpectedReductionMinutes: minutes(0),
    approvedAdjustmentMinutes: signedMinutes(0),
    calculationAsOf: instant('2026-02-03T10:30:00Z'),
    events: [],
    expectedState: 'OFF_WORK',
    flexNegativeThresholdMinutes: minutes(30),
    flexPositiveThresholdMinutes: minutes(30),
    hasSourceLedgerMismatch: false,
    hasUnresolvedApprovalRequiredAbsence: false,
    hasUnresolvedCorrection: false,
    isHoliday: false,
    localDate: localDate('2026-02-03'),
    policyAssignments: [policyAssignment],
    scheduleAssignments: [scheduleAssignment],
    sourceTruncated: false,
    timeZone: berlin,
    workDuringAbsence: false,
    ...overrides,
  };
}

test('builds a provisional working-day estimate with exact break minutes and stable signals', () => {
  const result = calculateCurrentDayAttendance(
    baseInput({
      events: [
        event(1, '2026-02-03T07:00:00Z', 'CLOCK_IN'),
        event(2, '2026-02-03T10:00:00Z', 'BREAK_START'),
        event(3, '2026-02-03T10:15:00Z', 'BREAK_END'),
      ],
      expectedState: 'WORKING',
    }),
  );

  expect(result).toMatchObject({
    activeSince: '2026-02-03T10:15:00Z',
    blockers: [],
    calculationStatus: 'PROVISIONAL',
    estimate: {
      dailyBalanceMinutes: -285,
      breakMinutes: 15,
      creditedMinutes: 195,
      expectedMinutes: 480,
      workedMinutes: 195,
    },
    warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
  });
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result.estimate)).toBe(true);
});

test('attributes an open cross-midnight session and break to the current local date', () => {
  const result = calculateCurrentDayAttendance(
    baseInput({
      calculationAsOf: instant('2026-02-04T00:30:00Z'),
      events: [
        event(1, '2026-02-03T21:00:00Z', 'CLOCK_IN'),
        event(2, '2026-02-04T00:00:00Z', 'BREAK_START'),
      ],
      expectedState: 'ON_BREAK',
      localDate: localDate('2026-02-04'),
    }),
  );

  expect(result.activeSince).toBe('2026-02-04T00:00:00Z');
  expect(result.estimate).toMatchObject({ breakMinutes: 30, workedMinutes: 60 });
});

test('marks missing configuration incomplete without inventing an estimate', () => {
  const result = calculateCurrentDayAttendance(baseInput({ scheduleAssignments: [] }));

  expect(result).toEqual({
    activeSince: null,
    blockers: ['SCHEDULE_NOT_ASSIGNED'],
    calculationStatus: 'INCOMPLETE',
    estimate: null,
    warnings: [],
  });
});

test('preserves a valid current attendance state when configuration blocks the estimate', () => {
  const result = calculateCurrentDayAttendance(
    baseInput({
      events: [event(1, '2026-02-03T07:00:00Z', 'CLOCK_IN')],
      expectedState: 'WORKING',
      scheduleAssignments: [],
    }),
  );

  expect(result.activeSince).toBe('2026-02-03T07:00:00Z');
  expect(result.estimate).toBeNull();
  expect(result.blockers).toEqual(['SCHEDULE_NOT_ASSIGNED']);
});

test('withholds an estimate when the bounded reconstruction source is truncated', () => {
  const result = calculateCurrentDayAttendance(
    baseInput({
      events: [event(1, '2026-02-03T07:00:00Z', 'CLOCK_IN')],
      expectedState: 'WORKING',
      sourceTruncated: true,
    }),
  );

  expect(result).toMatchObject({
    activeSince: '2026-02-03T07:00:00Z',
    blockers: ['ATTENDANCE_INCOMPLETE'],
    calculationStatus: 'INCOMPLETE',
    estimate: null,
  });
});

test('withholds an estimate when the persisted head disagrees with reconstructed source state', () => {
  const result = calculateCurrentDayAttendance(
    baseInput({
      events: [event(1, '2026-02-03T07:00:00Z', 'CLOCK_IN')],
      expectedState: 'OFF_WORK',
    }),
  );

  expect(result.estimate).toBeNull();
  expect(result.blockers).toEqual(['ATTENDANCE_INCOMPLETE', 'ATTENDANCE_INVALID_EVENT_ORDER']);
});

test('uses scheduled minutes as the holiday reduction and reports holiday work once', () => {
  const result = calculateCurrentDayAttendance(
    baseInput({
      calculationAsOf: instant('2026-02-03T08:00:00Z'),
      events: [event(1, '2026-02-03T07:00:00Z', 'CLOCK_IN')],
      expectedState: 'WORKING',
      isHoliday: true,
    }),
  );

  expect(result.estimate).toMatchObject({
    dailyBalanceMinutes: 60,
    expectedMinutes: 0,
    holidayExpectedReductionMinutes: 480,
    workedMinutes: 60,
  });
  expect(result.warnings).toEqual(['WORK_ON_HOLIDAY', 'FLEX_POSITIVE_THRESHOLD_EXCEEDED']);
});

test('derives minute-aligned calculation time and DST-aware local-date bounds', () => {
  expect(floorInstantToMinute(instant('2026-02-03T10:30:59.999Z'))).toBe('2026-02-03T10:30:00Z');
  expect(localDateInstantBounds(localDate('2026-03-29'), berlin)).toEqual({
    endsAt: '2026-03-29T22:00:00Z',
    startsAt: '2026-03-28T23:00:00Z',
  });
});
