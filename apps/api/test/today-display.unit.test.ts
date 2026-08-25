import {
  parseInstant,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  parseTimeZoneId,
  type CurrentDayAttendance,
  type DomainError,
  type Result,
} from '@workledger/domain';

import {
  selectTodayAttendanceDisplay,
  type TodayDisplaySelectionInput,
} from '../src/attendance/today-display.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

const instant = (value: string) => expectSuccess(parseInstant(value));
const localDate = (value: string) => expectSuccess(parseLocalDate(value));
const minutes = (value: number) => expectSuccess(parseNonNegativeMinutes(value));
const signedMinutes = (value: number) => expectSuccess(parseSignedMinutes(value));
const timeZone = expectSuccess(parseTimeZoneId('Europe/Berlin'));

function currentDay(overrides: Partial<CurrentDayAttendance> = {}): CurrentDayAttendance {
  return {
    activeElapsedMinutes: minutes(90),
    activeSince: instant('2026-08-11T09:15:00Z'),
    blockers: [],
    calculationStatus: 'PROVISIONAL',
    estimate: {
      absenceCreditMinutes: minutes(0),
      absenceExpectedReductionMinutes: minutes(0),
      approvedAdjustmentMinutes: signedMinutes(0),
      breakMinutes: minutes(30),
      creditedMinutes: minutes(195),
      dailyBalanceMinutes: signedMinutes(-285),
      expectedMinutes: minutes(480),
      holidayExpectedReductionMinutes: minutes(0),
      scheduledMinutes: minutes(480),
      workedMinutes: minutes(195),
    },
    estimatedFinishAt: instant('2026-08-11T15:30:00Z'),
    estimatedFinishUnavailableReason: null,
    isPeriodPostedOrLocked: false,
    remainingExpectedMinutes: minutes(285),
    warnings: [],
    ...overrides,
  };
}

function selectToday(
  inputOverrides: Partial<Omit<TodayDisplaySelectionInput, 'currentDay'>> = {},
  currentDayOverrides: Partial<CurrentDayAttendance> = {},
) {
  return selectTodayAttendanceDisplay({
    asOf: instant('2026-08-11T10:45:00Z'),
    attendanceRevision: 3,
    attendanceState: 'WORKING',
    currentDay: currentDay(currentDayOverrides),
    flexNegativeThresholdMinutes: minutes(600),
    flexPositiveThresholdMinutes: minutes(600),
    holidayName: null,
    localDate: localDate('2026-08-11'),
    postedFlexBalanceMinutes: signedMinutes(380),
    postedThroughDate: localDate('2026-08-10'),
    snapshotCapturedAt: instant('2026-08-11T10:45:30Z'),
    timeZone,
    timeline: [
      {
        id: 'punch-1',
        occurredAt: '2026-08-11T07:00:00Z',
        type: 'CLOCK_IN',
      },
      {
        id: 'punch-2',
        occurredAt: '2026-08-11T08:45:00Z',
        type: 'BREAK_START',
      },
      {
        id: 'punch-3',
        occurredAt: '2026-08-11T09:15:00Z',
        type: 'BREAK_END',
      },
    ],
    timelineTruncated: false,
    ...inputOverrides,
  });
}

test('selects one coherent working snapshot without treating a provisional deficit as posted debt', () => {
  const today = selectToday();

  expect(today).toMatchObject({
    asOf: '2026-08-11T10:45:00Z',
    attendance: {
      actionAvailability: [
        { available: false, command: 'CLOCK_IN' },
        { available: true, command: 'START_BREAK' },
        { available: false, command: 'RESUME' },
        { available: true, command: 'CLOCK_OUT' },
      ],
      activeElapsedMinutes: 90,
      activeSince: '2026-08-11T09:15:00Z',
      state: 'WORKING',
    },
    calculation: {
      attentionItems: [],
      estimatedFinishAt: '2026-08-11T15:30:00Z',
      provisional: {
        calculationSources: { breakMinutesToday: 30, workedMinutesToday: 195 },
        creditedMinutesToday: 195,
        expectedMinutesToday: 480,
        provisionalDifferenceMinutes: -285,
      },
      remainingExpectedMinutes: 285,
    },
    postedFlexBalanceMinutes: 380,
    postedThroughDate: '2026-08-10',
    snapshotCapturedAt: '2026-08-11T10:45:30Z',
  });
});

test.each([
  ['OFF_WORK', 'NOT_WORKING', ['CLOCK_IN']],
  ['ON_BREAK', 'ON_BREAK', ['RESUME', 'CLOCK_OUT']],
] as const)(
  'selects %s action availability and an explicit unavailable finish reason',
  (state, unavailableReason, validActions) => {
    const today = selectToday(
      { attendanceState: state },
      {
        activeElapsedMinutes: state === 'OFF_WORK' ? null : minutes(15),
        activeSince: state === 'OFF_WORK' ? null : instant('2026-08-11T10:30:00Z'),
        estimatedFinishAt: null,
        estimatedFinishUnavailableReason: unavailableReason,
      },
    );

    expect(today.attendance.validActions).toEqual(validActions);
    expect(today.calculation.estimatedFinishAt).toBeNull();
    expect(today.calculation.estimatedFinishUnavailableReason).toBe(unavailableReason);
  },
);

test('keeps a completed multi-session day provisional and preserves its immutable timeline', () => {
  const today = selectToday(
    {
      attendanceRevision: 6,
      attendanceState: 'OFF_WORK',
      timeline: [
        { id: 'punch-1', occurredAt: '2026-08-11T07:00:00Z', type: 'CLOCK_IN' },
        { id: 'punch-2', occurredAt: '2026-08-11T08:00:00Z', type: 'CLOCK_OUT' },
        { id: 'punch-3', occurredAt: '2026-08-11T09:00:00Z', type: 'CLOCK_IN' },
        { id: 'punch-4', occurredAt: '2026-08-11T10:45:00Z', type: 'CLOCK_OUT' },
      ],
    },
    {
      activeElapsedMinutes: null,
      activeSince: null,
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'NOT_WORKING',
    },
  );

  expect(today.attendance).toMatchObject({ state: 'OFF_WORK', validActions: ['CLOCK_IN'] });
  expect(today.calculation.isPeriodPostedOrLocked).toBe(false);
  expect(today.timeline.map(({ type }) => type)).toEqual([
    'CLOCK_IN',
    'CLOCK_OUT',
    'CLOCK_IN',
    'CLOCK_OUT',
  ]);
});

test('exposes paid absence and approved adjustment as separate source amounts', () => {
  const estimate = {
    absenceCreditMinutes: minutes(240),
    absenceExpectedReductionMinutes: minutes(240),
    approvedAdjustmentMinutes: signedMinutes(-15),
    breakMinutes: minutes(0),
    creditedMinutes: minutes(285),
    dailyBalanceMinutes: signedMinutes(45),
    expectedMinutes: minutes(240),
    holidayExpectedReductionMinutes: minutes(0),
    scheduledMinutes: minutes(480),
    workedMinutes: minutes(60),
  };
  const today = selectToday(
    {},
    {
      estimate,
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'NO_REMAINING_EXPECTATION',
      remainingExpectedMinutes: minutes(0),
    },
  );

  expect(today.calculation.provisional).toEqual({
    calculationSources: {
      absenceCreditMinutes: 240,
      absenceExpectedReductionMinutes: 240,
      approvedAdjustmentMinutes: -15,
      breakMinutesToday: 0,
      holidayExpectedReductionMinutes: 0,
      scheduledMinutes: 480,
      workedMinutesToday: 60,
    },
    creditedMinutesToday: 285,
    expectedMinutesToday: 240,
    provisionalDifferenceMinutes: 45,
  });
});

test('turns unresolved corrections and unavailable calculations into actionable blockers', () => {
  const unresolved = selectToday(
    {},
    {
      blockers: ['CORRECTION_UNRESOLVED'],
      calculationStatus: 'INCOMPLETE',
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'CALCULATION_INCOMPLETE',
    },
  );
  expect(unresolved.calculation.attentionItems).toEqual([
    expect.objectContaining({
      blocksSubmission: true,
      code: 'CORRECTION_UNRESOLVED',
      recoveryAction: 'REVIEW_REQUESTS',
      severity: 'BLOCKER',
      source: 'CURRENT_DAY_CALCULATION',
    }),
  ]);

  const unavailable = selectToday(
    {},
    {
      blockers: ['SCHEDULE_NOT_ASSIGNED'],
      calculationStatus: 'INCOMPLETE',
      estimate: null,
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'CALCULATION_UNAVAILABLE',
      remainingExpectedMinutes: null,
    },
  );
  expect(unavailable.calculation).toMatchObject({
    estimatedFinishUnavailableReason: 'CALCULATION_UNAVAILABLE',
    provisional: null,
    remainingExpectedMinutes: null,
    status: 'INCOMPLETE',
  });
});

test('sources threshold attention only from the posted flexible-time balance', () => {
  const today = selectToday({
    flexNegativeThresholdMinutes: minutes(300),
    postedFlexBalanceMinutes: signedMinutes(-301),
  });

  expect(today.calculation.attentionItems).toEqual([
    expect.objectContaining({
      blocksSubmission: false,
      code: 'FLEX_NEGATIVE_THRESHOLD_EXCEEDED',
      recoveryAction: 'REVIEW_BALANCE',
      severity: 'WARNING',
      source: 'POSTED_FLEX_BALANCE',
    }),
  ]);
});
