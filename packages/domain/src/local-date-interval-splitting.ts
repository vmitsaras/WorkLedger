import { Temporal } from '@js-temporal/polyfill';

import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant, type LocalDate, type TimeZoneId } from './shared/temporal.js';

export type SourceAttendanceInterval = Readonly<{
  endedAt: Instant;
  startedAt: Instant;
}>;

export type LocalDateIntervalSegment<TSource extends SourceAttendanceInterval> = Readonly<{
  endedAt: Instant;
  localDate: LocalDate;
  sourceInterval: TSource;
  startedAt: Instant;
}>;

export type LocalDateIntervalSplittingError =
  DomainError<'ATTENDANCE_INVALID_EVENT_ORDER'> | DomainError<'ATTENDANCE_INVALID_EVENT_PRECISION'>;

const ATTENDANCE_INVALID_EVENT_ORDER = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_ORDER',
} as const);
const ATTENDANCE_INVALID_EVENT_PRECISION = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_PRECISION',
} as const);
const MINUTE_IN_NANOSECONDS = 60_000_000_000n;

/**
 * Splits one completed work or break interval at each organization-local midnight. Every segment
 * keeps its original source interval, while its elapsed bounds remain exact instants.
 */
export function splitAttendanceIntervalAtLocalMidnight<TSource extends SourceAttendanceInterval>(
  sourceInterval: TSource,
  timeZone: TimeZoneId,
): Result<readonly LocalDateIntervalSegment<TSource>[], LocalDateIntervalSplittingError> {
  const startedAt = parseMinuteAlignedInstant(sourceInterval.startedAt);
  const endedAt = parseMinuteAlignedInstant(sourceInterval.endedAt);
  if (startedAt === null || endedAt === null) {
    return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
  }

  if (Temporal.Instant.compare(endedAt, startedAt) < 0) {
    return failure(ATTENDANCE_INVALID_EVENT_ORDER);
  }

  if (Temporal.Instant.compare(endedAt, startedAt) === 0) {
    return success(Object.freeze([createSegment(startedAt, endedAt, sourceInterval, timeZone)]));
  }

  const segments: LocalDateIntervalSegment<TSource>[] = [];
  let segmentStart = startedAt;

  while (Temporal.Instant.compare(segmentStart, endedAt) < 0) {
    const nextMidnight = nextLocalMidnight(segmentStart, timeZone);
    if (Temporal.Instant.compare(nextMidnight, segmentStart) <= 0) {
      return failure(ATTENDANCE_INVALID_EVENT_ORDER);
    }

    const segmentEnd = Temporal.Instant.compare(endedAt, nextMidnight) < 0 ? endedAt : nextMidnight;
    segments.push(createSegment(segmentStart, segmentEnd, sourceInterval, timeZone));
    segmentStart = segmentEnd;
  }

  return success(Object.freeze(segments));
}

function parseMinuteAlignedInstant(instant: Instant): Temporal.Instant | null {
  try {
    const parsed = Temporal.Instant.from(instant);
    return parsed.epochNanoseconds % MINUTE_IN_NANOSECONDS === 0n ? parsed : null;
  } catch {
    return null;
  }
}

function nextLocalMidnight(instant: Temporal.Instant, timeZone: TimeZoneId): Temporal.Instant {
  const localDate = instant.toZonedDateTimeISO(timeZone).toPlainDate();
  const nextLocalDate = localDate.add({ days: 1 });

  return Temporal.PlainDateTime.from(`${nextLocalDate}T00:00`)
    .toZonedDateTime(timeZone)
    .toInstant();
}

function createSegment<TSource extends SourceAttendanceInterval>(
  startedAt: Temporal.Instant,
  endedAt: Temporal.Instant,
  sourceInterval: TSource,
  timeZone: TimeZoneId,
): LocalDateIntervalSegment<TSource> {
  return Object.freeze({
    endedAt: endedAt.toString() as Instant,
    localDate: startedAt.toZonedDateTimeISO(timeZone).toPlainDate().toString() as LocalDate,
    sourceInterval,
    startedAt: startedAt.toString() as Instant,
  });
}
