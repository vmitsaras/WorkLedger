import {
  compareInstants,
  createLocalDateRange,
  failure,
  localDateRangeContains,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  parseTimeZoneId,
  success,
  type DomainError,
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

test('creates immutable discriminated success and failure results', () => {
  const value = success('accepted');
  const error = Object.freeze({ code: 'REJECTED' } as const);
  const rejected = failure(error);

  expect(value).toEqual({ ok: true, value: 'accepted' });
  expect(rejected).toEqual({ error: { code: 'REJECTED' }, ok: false });
  expect(Object.isFrozen(value)).toBe(true);
  expect(Object.isFrozen(rejected)).toBe(true);
});

test('accepts generator-neutral opaque IDs and rejects unsafe serialized forms', () => {
  const id = expectSuccess(parseDomainId<'Employee'>('employee_01J5Y2C3-4.example'));

  expect(id).toBe('employee_01J5Y2C3-4.example');
  expect(JSON.stringify({ id })).toBe('{"id":"employee_01J5Y2C3-4.example"}');

  for (const invalid of ['', ' employee-1', 'employee 1', 'employee/1', 'a'.repeat(129), 42]) {
    const result = parseDomainId<'Employee'>(invalid);
    expectFailureCode(result, 'INVALID_DOMAIN_ID');
    if (String(invalid).length > 0) {
      expect(JSON.stringify(result)).not.toContain(String(invalid));
    }
  }
});

test('accepts only safe integer minutes and distinguishes signed from non-negative values', () => {
  expect(expectSuccess(parseSignedMinutes(-90))).toBe(-90);
  expect(expectSuccess(parseNonNegativeMinutes(0))).toBe(0);
  expect(expectSuccess(parseNonNegativeMinutes(480))).toBe(480);
  expect(Object.is(expectSuccess(parseSignedMinutes(-0)), -0)).toBe(false);

  for (const invalid of [1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1, '60']) {
    expectFailureCode(parseSignedMinutes(invalid), 'INVALID_SIGNED_MINUTES');
  }

  expectFailureCode(parseNonNegativeMinutes(-1), 'INVALID_NON_NEGATIVE_MINUTES');
  expectFailureCode(parseNonNegativeMinutes(1.5), 'INVALID_NON_NEGATIVE_MINUTES');
});

test('canonicalizes offset instants to UTC without requiring minute alignment', () => {
  const earlier = expectSuccess(parseInstant('2026-08-10T12:34:56+02:00'));
  const later = expectSuccess(parseInstant('2026-08-10T12:34:56.123456789Z'));
  expect(earlier).toBe('2026-08-10T10:34:56Z');
  expect(later).toBe('2026-08-10T12:34:56.123456789Z');
  expect(compareInstants(earlier, later)).toBe(-1);
  expect(compareInstants(later, earlier)).toBe(1);
  expect(compareInstants(later, later)).toBe(0);

  expectFailureCode(parseInstant('2026-08-10T12:34:56'), 'INVALID_INSTANT');
  expectFailureCode(parseInstant('not-an-instant'), 'INVALID_INSTANT');
  expectFailureCode(parseInstant(new Date('2026-08-10T12:34:56Z')), 'INVALID_INSTANT');
});

test('accepts exact ISO local dates and rejects impossible or timestamp-shaped values', () => {
  expect(expectSuccess(parseLocalDate('2024-02-29'))).toBe('2024-02-29');

  for (const invalid of ['2023-02-29', '2026-8-10', '2026-08-10T00:00:00Z', '']) {
    expectFailureCode(parseLocalDate(invalid), 'INVALID_LOCAL_DATE');
  }
});

test('accepts named IANA timezone IDs, normalizes case, and rejects offsets', () => {
  expect(expectSuccess(parseTimeZoneId('Europe/Berlin'))).toBe('Europe/Berlin');
  expect(expectSuccess(parseTimeZoneId('europe/berlin'))).toBe('Europe/Berlin');
  expect(expectSuccess(parseTimeZoneId('Etc/UTC'))).toBe('Etc/UTC');

  expectFailureCode(parseTimeZoneId('+01:00'), 'INVALID_TIME_ZONE_ID');
  expectFailureCode(parseTimeZoneId('Invalid/Zone'), 'INVALID_TIME_ZONE_ID');
  expectFailureCode(parseTimeZoneId(' Europe/Berlin '), 'INVALID_TIME_ZONE_ID');
});

test('constructs immutable half-open and open-ended local-date ranges', () => {
  const validFrom = expectSuccess(parseLocalDate('2026-08-01'));
  const validTo = expectSuccess(parseLocalDate('2026-09-01'));
  const before = expectSuccess(parseLocalDate('2026-07-31'));
  const inside = expectSuccess(parseLocalDate('2026-08-31'));

  const closedRange = expectSuccess(createLocalDateRange(validFrom, validTo));
  const openRange = expectSuccess(createLocalDateRange(validFrom));

  expect(localDateRangeContains(closedRange, before)).toBe(false);
  expect(localDateRangeContains(closedRange, validFrom)).toBe(true);
  expect(localDateRangeContains(closedRange, inside)).toBe(true);
  expect(localDateRangeContains(closedRange, validTo)).toBe(false);
  expect(localDateRangeContains(openRange, validTo)).toBe(true);
  expect(Object.isFrozen(closedRange)).toBe(true);
  expect(JSON.stringify(closedRange)).toBe('{"validFrom":"2026-08-01","validTo":"2026-09-01"}');
  expect(JSON.stringify(openRange)).toBe('{"validFrom":"2026-08-01","validTo":null}');

  expectFailureCode(createLocalDateRange(validFrom, validFrom), 'INVALID_LOCAL_DATE_RANGE');
  expectFailureCode(createLocalDateRange(validTo, validFrom), 'INVALID_LOCAL_DATE_RANGE');
});
