import {
  parseInstant,
  parseLocalDate,
  parseTimeZoneId,
  resolveManualLocalDateTime,
  validateManualAttendanceInterval,
  type AttendanceIntervalBounds,
  type DomainError,
  type ManualAttendanceIntervalError,
  type ManualAttendanceIntervalInput,
  type ManualLocalDateTime,
  type Result,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function expectFailureCode<T, E extends DomainError>(result: Result<T, E>, code: E['code']): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('Expected failure.');
  expect(result.error.code).toBe(code);
}

const athens = expectSuccess(parseTimeZoneId('Europe/Athens'));
const asOf = expectSuccess(parseInstant('2026-11-01T00:00:00Z'));

function local(
  localDate: string,
  localTime: string,
  utcOffset: string | null = null,
): ManualLocalDateTime {
  return Object.freeze({
    localDate: expectSuccess(parseLocalDate(localDate)),
    localTime,
    utcOffset,
  });
}

function interval(
  startsAt: ManualLocalDateTime,
  endsAt: ManualLocalDateTime,
): ManualAttendanceIntervalInput {
  return Object.freeze({ endsAt, startsAt });
}

function instant(value: string) {
  return expectSuccess(parseInstant(value));
}

test('resolves unique minute-precision local time to its one UTC instant', () => {
  expect(expectSuccess(resolveManualLocalDateTime(local('2026-02-03', '10:30'), athens))).toBe(
    '2026-02-03T08:30:00Z',
  );
  expectFailureCode(
    resolveManualLocalDateTime(local('2026-02-03', '10:30:15'), athens),
    'ATTENDANCE_INVALID_EVENT_PRECISION',
  );
});

test('rejects nonexistent local times and makes both repeated-time offsets explicit', () => {
  expectFailureCode(
    resolveManualLocalDateTime(local('2026-03-29', '03:30'), athens),
    'ATTENDANCE_NONEXISTENT_LOCAL_TIME',
  );

  const ambiguous = resolveManualLocalDateTime(local('2026-10-25', '03:30'), athens);
  expectFailureCode(ambiguous, 'ATTENDANCE_AMBIGUOUS_LOCAL_TIME');
  if (!ambiguous.ok) {
    expect(ambiguous.error).toEqual({
      code: 'ATTENDANCE_AMBIGUOUS_LOCAL_TIME',
      validUtcOffsets: ['+02:00', '+03:00'],
    });
  }

  expect(
    expectSuccess(resolveManualLocalDateTime(local('2026-10-25', '03:30', '+02:00'), athens)),
  ).toBe('2026-10-25T01:30:00Z');
  expectFailureCode(
    resolveManualLocalDateTime(local('2026-10-25', '03:30', '+01:00'), athens),
    'ATTENDANCE_AMBIGUOUS_LOCAL_TIME',
  );
});

test('accepts a non-overlapping interval and exact adjacency', () => {
  const existing: readonly AttendanceIntervalBounds[] = [
    Object.freeze({
      endsAt: instant('2026-02-03T10:00:00Z'),
      startsAt: instant('2026-02-03T08:00:00Z'),
    }),
  ];

  const validated = expectSuccess(
    validateManualAttendanceInterval(
      interval(local('2026-02-03', '12:00'), local('2026-02-03', '13:00')),
      athens,
      asOf,
      existing,
    ),
  );
  expect(validated).toEqual({
    endsAt: '2026-02-03T11:00:00Z',
    startsAt: '2026-02-03T10:00:00Z',
  });
  expect(Object.isFrozen(validated)).toBe(true);
});

test.each([
  [interval(local('2026-02-03', '10:30'), local('2026-02-03', '11:30')), 'ATTENDANCE_OVERLAP'],
  [
    interval(local('2026-02-03', '12:00'), local('2026-02-03', '11:59')),
    'ATTENDANCE_INVALID_EVENT_ORDER',
  ],
  [interval(local('2026-11-01', '03:00'), local('2026-11-01', '04:00')), 'ATTENDANCE_FUTURE_EVENT'],
] as const satisfies readonly [
  ManualAttendanceIntervalInput,
  ManualAttendanceIntervalError['code'],
][])('returns a stable code for invalid manual interval input', (input, code) => {
  const existing: readonly AttendanceIntervalBounds[] = [
    Object.freeze({
      endsAt: instant('2026-02-03T10:00:00Z'),
      startsAt: instant('2026-02-03T08:00:00Z'),
    }),
  ];
  expectFailureCode(validateManualAttendanceInterval(input, athens, asOf, existing), code);
});

test('allows zero-duration manual intervals without creating an overlap', () => {
  const validated = expectSuccess(
    validateManualAttendanceInterval(
      interval(local('2026-02-03', '12:00'), local('2026-02-03', '12:00')),
      athens,
      asOf,
      [
        Object.freeze({
          endsAt: instant('2026-02-03T11:00:00Z'),
          startsAt: instant('2026-02-03T08:00:00Z'),
        }),
      ],
    ),
  );

  expect(validated.startsAt).toBe(validated.endsAt);
});
