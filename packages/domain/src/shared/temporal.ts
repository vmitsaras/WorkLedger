import { Temporal } from '@js-temporal/polyfill';

import { failure, success, type DomainError, type Result } from './result.js';

declare const instantBrand: unique symbol;
declare const localDateBrand: unique symbol;
declare const timeZoneIdBrand: unique symbol;

export type Instant = string & {
  readonly [instantBrand]: 'Instant';
};

export type LocalDate = string & {
  readonly [localDateBrand]: 'LocalDate';
};

export type TimeZoneId = string & {
  readonly [timeZoneIdBrand]: 'TimeZoneId';
};

export type InvalidInstantError = DomainError<'INVALID_INSTANT'>;
export type InvalidLocalDateError = DomainError<'INVALID_LOCAL_DATE'>;
export type InvalidTimeZoneIdError = DomainError<'INVALID_TIME_ZONE_ID'>;

export type LocalDateInstantBounds = Readonly<{
  endsAt: Instant;
  startsAt: Instant;
}>;

const INVALID_INSTANT = Object.freeze({ code: 'INVALID_INSTANT' } as const);
const INVALID_LOCAL_DATE = Object.freeze({ code: 'INVALID_LOCAL_DATE' } as const);
const INVALID_TIME_ZONE_ID = Object.freeze({ code: 'INVALID_TIME_ZONE_ID' } as const);
const ISO_LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ZONE_REFERENCE_INSTANT = Temporal.Instant.from('2000-01-01T00:00:00Z');

export function parseInstant(input: unknown): Result<Instant, InvalidInstantError> {
  if (typeof input !== 'string') {
    return failure(INVALID_INSTANT);
  }

  try {
    return success(Temporal.Instant.from(input).toString() as Instant);
  } catch {
    return failure(INVALID_INSTANT);
  }
}

export function parseLocalDate(input: unknown): Result<LocalDate, InvalidLocalDateError> {
  if (typeof input !== 'string' || !ISO_LOCAL_DATE_PATTERN.test(input)) {
    return failure(INVALID_LOCAL_DATE);
  }

  try {
    const localDate = Temporal.PlainDate.from(input);
    if (localDate.calendarId !== 'iso8601') {
      return failure(INVALID_LOCAL_DATE);
    }

    return success(localDate.toString() as LocalDate);
  } catch {
    return failure(INVALID_LOCAL_DATE);
  }
}

export function parseTimeZoneId(input: unknown): Result<TimeZoneId, InvalidTimeZoneIdError> {
  if (typeof input !== 'string' || input.startsWith('+') || input.startsWith('-')) {
    return failure(INVALID_TIME_ZONE_ID);
  }

  try {
    const timeZoneId = TIME_ZONE_REFERENCE_INSTANT.toZonedDateTimeISO(input).timeZoneId;
    return success(timeZoneId as TimeZoneId);
  } catch {
    return failure(INVALID_TIME_ZONE_ID);
  }
}

export function localDateAtInstant(instant: Instant, timeZone: TimeZoneId): LocalDate {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(timeZone)
    .toPlainDate()
    .toString() as LocalDate;
}

export function floorInstantToMinute(instant: Instant): Instant {
  return Temporal.Instant.from(instant)
    .round({
      roundingMode: 'floor',
      smallestUnit: 'minute',
    })
    .toString() as Instant;
}

export function compareInstants(left: Instant, right: Instant): -1 | 0 | 1 {
  return Temporal.Instant.compare(left, right);
}

export function localDateInstantBounds(
  localDate: LocalDate,
  timeZone: TimeZoneId,
): LocalDateInstantBounds {
  const startsAt = Temporal.PlainDate.from(localDate).toZonedDateTime(timeZone).toInstant();
  const endsAt = Temporal.PlainDate.from(localDate)
    .add({ days: 1 })
    .toZonedDateTime(timeZone)
    .toInstant();
  return Object.freeze({
    endsAt: endsAt.toString() as Instant,
    startsAt: startsAt.toString() as Instant,
  });
}

export function compareLocalDates(left: LocalDate, right: LocalDate): -1 | 0 | 1 {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Returns an organization-local calendar date shifted by whole calendar days. */
export function addLocalDateDays(localDate: LocalDate, days: number): LocalDate {
  return Temporal.PlainDate.from(localDate).add({ days }).toString() as LocalDate;
}

/** Returns the ISO Monday that starts the week containing the supplied local date. */
export function startOfLocalWeek(localDate: LocalDate): LocalDate {
  const date = Temporal.PlainDate.from(localDate);
  return date.subtract({ days: date.dayOfWeek - 1 }).toString() as LocalDate;
}

/** Returns the first day of the calendar month containing the supplied local date. */
export function startOfLocalMonth(localDate: LocalDate): LocalDate {
  const date = Temporal.PlainDate.from(localDate);
  return date.with({ day: 1 }).toString() as LocalDate;
}

/** Calculates exact whole-minute elapsed time from two already trusted instants. */
export function elapsedMinutesBetweenInstants(startsAt: Instant, endsAt: Instant): number {
  const elapsedNanoseconds =
    Temporal.Instant.from(endsAt).epochNanoseconds -
    Temporal.Instant.from(startsAt).epochNanoseconds;
  if (elapsedNanoseconds < 0n || elapsedNanoseconds % 60_000_000_000n !== 0n) {
    throw new Error('Expected ordered minute-aligned instants.');
  }
  return Number(elapsedNanoseconds / 60_000_000_000n);
}
