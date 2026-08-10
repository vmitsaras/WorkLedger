import {
  parseInstant,
  reconstructAttendance,
  type AttendanceReconstructionError,
  type DomainError,
  type PunchEvent,
  type PunchEventType,
  type Result,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function expectFailureCode<T, E extends DomainError>(result: Result<T, E>, code: E['code']): void {
  expect(result).toEqual({ error: { code }, ok: false });
}

function event(eventSequence: number, occurredAt: string, type: PunchEventType): PunchEvent {
  return Object.freeze({
    eventSequence,
    occurredAt: expectSuccess(parseInstant(occurredAt)),
    type,
  });
}

test('reconstructs no events as an off-work state with no sessions', () => {
  expect(expectSuccess(reconstructAttendance([]))).toEqual({
    currentState: 'OFF_WORK',
    orderedEvents: [],
    sessions: [],
  });
});

test('reconstructs a normal completed session into break-free work and break intervals', () => {
  const clockIn = event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN');
  const breakStart = event(2, '2026-02-03T10:00:00Z', 'BREAK_START');
  const breakEnd = event(3, '2026-02-03T10:30:00Z', 'BREAK_END');
  const clockOut = event(4, '2026-02-03T14:30:00Z', 'CLOCK_OUT');

  const reconstruction = expectSuccess(
    reconstructAttendance([clockOut, breakEnd, clockIn, breakStart]),
  );

  expect(reconstruction.currentState).toBe('OFF_WORK');
  expect(reconstruction.orderedEvents).toEqual([clockIn, breakStart, breakEnd, clockOut]);
  expect(reconstruction.sessions).toEqual([
    {
      breakIntervals: [
        {
          endedAt: '2026-02-03T10:30:00Z',
          endEvent: breakEnd,
          startedAt: '2026-02-03T10:00:00Z',
          startEvent: breakStart,
        },
      ],
      clockInEvent: clockIn,
      clockOutEvent: clockOut,
      openInterval: null,
      workIntervals: [
        {
          endedAt: '2026-02-03T10:00:00Z',
          endEvent: breakStart,
          startedAt: '2026-02-03T06:00:00Z',
          startEvent: clockIn,
        },
        {
          endedAt: '2026-02-03T14:30:00Z',
          endEvent: clockOut,
          startedAt: '2026-02-03T10:30:00Z',
          startEvent: breakEnd,
        },
      ],
    },
  ]);
  expect(Object.isFrozen(reconstruction)).toBe(true);
  expect(Object.isFrozen(reconstruction.orderedEvents)).toBe(true);
  expect(Object.isFrozen(reconstruction.sessions)).toBe(true);
  expect(Object.isFrozen(reconstruction.sessions[0])).toBe(true);
});

test('reconstructs separate completed sessions without treating them as breaks', () => {
  const reconstruction = expectSuccess(
    reconstructAttendance([
      event(1, '2026-02-03T05:30:00Z', 'CLOCK_IN'),
      event(2, '2026-02-03T08:00:00Z', 'CLOCK_OUT'),
      event(3, '2026-02-03T09:00:00Z', 'CLOCK_IN'),
      event(4, '2026-02-03T11:00:00Z', 'CLOCK_OUT'),
      event(5, '2026-02-03T14:00:00Z', 'CLOCK_IN'),
      event(6, '2026-02-03T17:00:00Z', 'CLOCK_OUT'),
    ]),
  );

  expect(reconstruction.currentState).toBe('OFF_WORK');
  expect(reconstruction.sessions).toHaveLength(3);
  expect(reconstruction.sessions.map((session) => session.breakIntervals)).toEqual([[], [], []]);
  expect(reconstruction.sessions.map((session) => session.workIntervals)).toHaveLength(3);
  expect(reconstruction.sessions.map((session) => session.workIntervals)).toEqual([
    [
      expect.objectContaining({
        endedAt: '2026-02-03T08:00:00Z',
        startedAt: '2026-02-03T05:30:00Z',
      }),
    ],
    [
      expect.objectContaining({
        endedAt: '2026-02-03T11:00:00Z',
        startedAt: '2026-02-03T09:00:00Z',
      }),
    ],
    [
      expect.objectContaining({
        endedAt: '2026-02-03T17:00:00Z',
        startedAt: '2026-02-03T14:00:00Z',
      }),
    ],
  ]);
});

test('closes an active break before clock-out without inventing work after the break', () => {
  const reconstruction = expectSuccess(
    reconstructAttendance([
      event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN'),
      event(2, '2026-02-03T10:00:00Z', 'BREAK_START'),
      event(3, '2026-02-03T10:20:00Z', 'BREAK_END'),
      event(4, '2026-02-03T10:20:00Z', 'CLOCK_OUT'),
    ]),
  );

  expect(reconstruction.sessions[0]).toMatchObject({
    breakIntervals: [
      {
        endedAt: '2026-02-03T10:20:00Z',
        startedAt: '2026-02-03T10:00:00Z',
      },
    ],
    workIntervals: [
      {
        endedAt: '2026-02-03T10:00:00Z',
        startedAt: '2026-02-03T06:00:00Z',
      },
      {
        endedAt: '2026-02-03T10:20:00Z',
        startedAt: '2026-02-03T10:20:00Z',
      },
    ],
  });
});

test.each([
  {
    events: [
      event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN'),
      event(2, '2026-02-03T10:00:00Z', 'BREAK_START'),
    ],
    expectedState: 'ON_BREAK',
    openType: 'BREAK',
    startedAt: '2026-02-03T10:00:00Z',
  },
  {
    events: [event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN')],
    expectedState: 'WORKING',
    openType: 'WORK',
    startedAt: '2026-02-03T06:00:00Z',
  },
] as const)(
  'preserves the valid incomplete $expectedState session and its open $openType interval',
  ({ events, expectedState, openType, startedAt }) => {
    const reconstruction = expectSuccess(reconstructAttendance(events));
    const session = reconstruction.sessions[0];

    expect(reconstruction.currentState).toBe(expectedState);
    expect(session?.clockOutEvent).toBeNull();
    expect(session?.openInterval).toMatchObject({ startedAt, type: openType });
  },
);

test.each([
  [
    [event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN'), event(1, '2026-02-03T10:00:00Z', 'CLOCK_OUT')],
    'ATTENDANCE_INVALID_EVENT_ORDER',
  ],
  [
    [event(2, '2026-02-03T06:00:00Z', 'CLOCK_IN'), event(1, '2026-02-03T10:00:00Z', 'CLOCK_OUT')],
    'ATTENDANCE_INVALID_EVENT_ORDER',
  ],
  [
    [event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN'), event(2, '2026-02-03T05:59:00Z', 'CLOCK_OUT')],
    'ATTENDANCE_INVALID_EVENT_ORDER',
  ],
  [[event(1, '2026-02-03T06:00:00Z', 'BREAK_START')], 'ATTENDANCE_INVALID_EVENT_ORDER'],
] as const satisfies readonly [readonly PunchEvent[], AttendanceReconstructionError['code']][])(
  'rejects corrupt ordered-event input with %s',
  (events, code) => {
    expectFailureCode(reconstructAttendance(events), code);
  },
);

test('rejects a non-minute-aligned occurrence instant and permits a zero-duration session', () => {
  const minuteAligned = event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN');
  const nonMinuteAligned = event(2, '2026-02-03T06:00:30Z', 'CLOCK_OUT');

  expectFailureCode(
    reconstructAttendance([minuteAligned, nonMinuteAligned]),
    'ATTENDANCE_INVALID_EVENT_PRECISION',
  );

  const zeroDuration = expectSuccess(
    reconstructAttendance([
      event(1, '2026-02-03T06:00:00Z', 'CLOCK_IN'),
      event(2, '2026-02-03T06:00:00Z', 'CLOCK_OUT'),
    ]),
  );
  expect(zeroDuration.sessions[0]?.workIntervals[0]).toMatchObject({
    endedAt: '2026-02-03T06:00:00Z',
    startedAt: '2026-02-03T06:00:00Z',
  });
});
