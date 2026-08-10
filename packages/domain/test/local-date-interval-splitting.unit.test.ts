import {
  parseInstant,
  parseTimeZoneId,
  splitAttendanceIntervalAtLocalMidnight,
  type DomainError,
  type Instant,
  type Result,
  type SourceAttendanceInterval,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function expectFailureCode<T, E extends DomainError>(result: Result<T, E>, code: E['code']): void {
  expect(result).toEqual({ error: { code }, ok: false });
}

const athens = expectSuccess(parseTimeZoneId('Europe/Athens'));

function instant(value: string): Instant {
  return expectSuccess(parseInstant(value));
}

function interval(
  startedAt: string,
  endedAt: string,
  kind: 'WORK' | 'BREAK' = 'WORK',
): SourceAttendanceInterval & Readonly<{ kind: 'WORK' | 'BREAK' }> {
  return Object.freeze({ endedAt: instant(endedAt), kind, startedAt: instant(startedAt) });
}

test('splits an overnight interval at the actual organization-local midnight', () => {
  const sourceInterval = interval('2026-02-03T20:00:00Z', '2026-02-04T00:00:00Z');
  const segments = expectSuccess(splitAttendanceIntervalAtLocalMidnight(sourceInterval, athens));

  expect(segments).toEqual([
    {
      endedAt: '2026-02-03T22:00:00Z',
      localDate: '2026-02-03',
      sourceInterval,
      startedAt: '2026-02-03T20:00:00Z',
    },
    {
      endedAt: '2026-02-04T00:00:00Z',
      localDate: '2026-02-04',
      sourceInterval,
      startedAt: '2026-02-03T22:00:00Z',
    },
  ]);
  expect(Object.isFrozen(segments)).toBe(true);
  expect(Object.isFrozen(segments[0])).toBe(true);
});

test('keeps break provenance while splitting it across midnight', () => {
  const sourceInterval = interval('2026-02-03T21:30:00Z', '2026-02-03T22:30:00Z', 'BREAK');
  const segments = expectSuccess(splitAttendanceIntervalAtLocalMidnight(sourceInterval, athens));

  expect(segments).toHaveLength(2);
  expect(segments.every((segment) => segment.sourceInterval === sourceInterval)).toBe(true);
  expect(segments.map((segment) => segment.localDate)).toEqual(['2026-02-03', '2026-02-04']);
});

test.each([
  [
    interval('2026-03-29T00:30:00Z', '2026-03-29T01:30:00Z'),
    [
      {
        endedAt: '2026-03-29T01:30:00Z',
        localDate: '2026-03-29',
        startedAt: '2026-03-29T00:30:00Z',
      },
    ],
  ],
  [
    interval('2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'),
    [
      {
        endedAt: '2026-10-25T01:30:00Z',
        localDate: '2026-10-25',
        startedAt: '2026-10-25T00:30:00Z',
      },
    ],
  ],
] as const)(
  'keeps exact elapsed one-hour $0 interval through DST offset changes',
  (sourceInterval, expected) => {
    const segments = expectSuccess(splitAttendanceIntervalAtLocalMidnight(sourceInterval, athens));

    expect(segments).toMatchObject(expected);
  },
);

test('assigns a zero-duration interval to its start local date', () => {
  const sourceInterval = interval('2026-02-03T22:00:00Z', '2026-02-03T22:00:00Z');

  expect(
    expectSuccess(splitAttendanceIntervalAtLocalMidnight(sourceInterval, athens)),
  ).toMatchObject([
    {
      localDate: '2026-02-04',
      sourceInterval,
    },
  ]);
});

test.each([
  [interval('2026-02-03T10:00:00Z', '2026-02-03T09:59:00Z'), 'ATTENDANCE_INVALID_EVENT_ORDER'],
  [interval('2026-02-03T10:00:30Z', '2026-02-03T11:00:00Z'), 'ATTENDANCE_INVALID_EVENT_PRECISION'],
] as const)('returns a stable code for invalid source bounds', (sourceInterval, code) => {
  expectFailureCode(splitAttendanceIntervalAtLocalMidnight(sourceInterval, athens), code);
});
