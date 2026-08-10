import { Temporal } from '@js-temporal/polyfill';

import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant, type LocalDate, type TimeZoneId } from './shared/temporal.js';

export type ManualLocalDateTime = Readonly<{
  localDate: LocalDate;
  localTime: string;
  utcOffset: string | null;
}>;

export type ManualAttendanceIntervalInput = Readonly<{
  endsAt: ManualLocalDateTime;
  startsAt: ManualLocalDateTime;
}>;

export type AttendanceIntervalBounds = Readonly<{
  endsAt: Instant;
  startsAt: Instant;
}>;

export type AmbiguousLocalTimeError = Readonly<{
  code: 'ATTENDANCE_AMBIGUOUS_LOCAL_TIME';
  validUtcOffsets: readonly string[];
}>;

export type ManualAttendanceIntervalError =
  | AmbiguousLocalTimeError
  | DomainError<'ATTENDANCE_FUTURE_EVENT'>
  | DomainError<'ATTENDANCE_INVALID_EVENT_ORDER'>
  | DomainError<'ATTENDANCE_INVALID_EVENT_PRECISION'>
  | DomainError<'ATTENDANCE_NONEXISTENT_LOCAL_TIME'>
  | DomainError<'ATTENDANCE_OVERLAP'>;

type ManualLocalDateTimeError =
  | AmbiguousLocalTimeError
  | DomainError<'ATTENDANCE_INVALID_EVENT_PRECISION'>
  | DomainError<'ATTENDANCE_NONEXISTENT_LOCAL_TIME'>;

const ATTENDANCE_FUTURE_EVENT = Object.freeze({ code: 'ATTENDANCE_FUTURE_EVENT' } as const);
const ATTENDANCE_INVALID_EVENT_ORDER = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_ORDER',
} as const);
const ATTENDANCE_INVALID_EVENT_PRECISION = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_PRECISION',
} as const);
const ATTENDANCE_NONEXISTENT_LOCAL_TIME = Object.freeze({
  code: 'ATTENDANCE_NONEXISTENT_LOCAL_TIME',
} as const);
const ATTENDANCE_OVERLAP = Object.freeze({ code: 'ATTENDANCE_OVERLAP' } as const);
const LOCAL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Resolves a manually entered minute-precision local date/time without silently choosing a DST
 * offset. A repeated time requires one of the returned explicit offsets.
 */
export function resolveManualLocalDateTime(
  input: ManualLocalDateTime,
  timeZone: TimeZoneId,
): Result<Instant, ManualLocalDateTimeError> {
  if (!LOCAL_TIME_PATTERN.test(input.localTime)) {
    return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
  }

  let localDateTime: Temporal.PlainDateTime;
  try {
    localDateTime = Temporal.PlainDateTime.from(`${input.localDate}T${input.localTime}`);
  } catch {
    return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
  }

  const earlier = localDateTime.toZonedDateTime(timeZone, { disambiguation: 'earlier' });
  const later = localDateTime.toZonedDateTime(timeZone, { disambiguation: 'later' });
  const earlierMatches = earlier.toPlainDateTime().equals(localDateTime);
  const laterMatches = later.toPlainDateTime().equals(localDateTime);

  if (!earlierMatches || !laterMatches) {
    return failure(ATTENDANCE_NONEXISTENT_LOCAL_TIME);
  }

  const earlierInstant = earlier.toInstant();
  const laterInstant = later.toInstant();
  const candidateOffsets = Object.freeze(
    [...new Set([earlier.offset, later.offset])].sort(),
  ) as readonly string[];

  if (Temporal.Instant.compare(earlierInstant, laterInstant) !== 0) {
    if (input.utcOffset === null || !candidateOffsets.includes(input.utcOffset)) {
      return failure(createAmbiguousLocalTimeError(candidateOffsets));
    }

    return success(
      (input.utcOffset === earlier.offset ? earlierInstant : laterInstant).toString() as Instant,
    );
  }

  if (input.utcOffset !== null && input.utcOffset !== earlier.offset) {
    return failure(createAmbiguousLocalTimeError(candidateOffsets));
  }

  return success(earlierInstant.toString() as Instant);
}

/**
 * Validates a manually entered or correction-applied interval against a supplied trusted instant
 * and existing closed intervals. All comparison semantics are exact and half-open.
 */
export function validateManualAttendanceInterval(
  input: ManualAttendanceIntervalInput,
  timeZone: TimeZoneId,
  latestAllowedOccurrence: Instant,
  existingIntervals: readonly AttendanceIntervalBounds[] = [],
): Result<AttendanceIntervalBounds, ManualAttendanceIntervalError> {
  const startsAt = resolveManualLocalDateTime(input.startsAt, timeZone);
  if (!startsAt.ok) {
    return startsAt;
  }

  const endsAt = resolveManualLocalDateTime(input.endsAt, timeZone);
  if (!endsAt.ok) {
    return endsAt;
  }

  const startInstant = Temporal.Instant.from(startsAt.value);
  const endInstant = Temporal.Instant.from(endsAt.value);
  const latestAllowedInstant = Temporal.Instant.from(latestAllowedOccurrence);

  if (Temporal.Instant.compare(endInstant, startInstant) < 0) {
    return failure(ATTENDANCE_INVALID_EVENT_ORDER);
  }

  if (
    Temporal.Instant.compare(startInstant, latestAllowedInstant) > 0 ||
    Temporal.Instant.compare(endInstant, latestAllowedInstant) > 0
  ) {
    return failure(ATTENDANCE_FUTURE_EVENT);
  }

  const interval = Object.freeze({
    endsAt: endsAt.value,
    startsAt: startsAt.value,
  });

  if (existingIntervals.some((existingInterval) => intervalsOverlap(interval, existingInterval))) {
    return failure(ATTENDANCE_OVERLAP);
  }

  return success(interval);
}

function intervalsOverlap(
  left: AttendanceIntervalBounds,
  right: AttendanceIntervalBounds,
): boolean {
  const leftStart = Temporal.Instant.from(left.startsAt);
  const leftEnd = Temporal.Instant.from(left.endsAt);
  const rightStart = Temporal.Instant.from(right.startsAt);
  const rightEnd = Temporal.Instant.from(right.endsAt);

  if (
    Temporal.Instant.compare(leftEnd, leftStart) <= 0 ||
    Temporal.Instant.compare(rightEnd, rightStart) <= 0
  ) {
    return false;
  }

  return (
    Temporal.Instant.compare(leftStart, rightEnd) < 0 &&
    Temporal.Instant.compare(leftEnd, rightStart) > 0
  );
}

function createAmbiguousLocalTimeError(
  validUtcOffsets: readonly string[],
): AmbiguousLocalTimeError {
  return Object.freeze({
    code: 'ATTENDANCE_AMBIGUOUS_LOCAL_TIME',
    validUtcOffsets,
  });
}
