# Manual Attendance Interval Validation

**Task:** `WL-204`

**Outcome:** Complete. `packages/domain` now resolves manually entered/correction-applied local
attendance times against an explicit IANA timezone and validates their canonical interval bounds.

## Scope

`resolveManualLocalDateTime(input, timeZone)` accepts an already-validated local date, a strict
`HH:mm` local time, and an optional explicit UTC offset. It never chooses a daylight-saving
interpretation silently. A skipped local time returns `ATTENDANCE_NONEXISTENT_LOCAL_TIME`; a
repeated local time returns `ATTENDANCE_AMBIGUOUS_LOCAL_TIME` with the safe valid offsets until one
is supplied. A malformed/non-minute time returns `ATTENDANCE_INVALID_EVENT_PRECISION`.

`validateManualAttendanceInterval(input, timeZone, latestAllowedOccurrence, existingIntervals)`
resolves both endpoints and returns frozen UTC interval bounds only when they are non-negative, no
later than the supplied trusted occurrence bound, and non-overlapping with every supplied existing
closed interval.

## Interval rules

- Interval comparisons use canonical instants and half-open semantics: `[start, end)`.
- A later end is required only for positive duration; an equal end is a valid zero-duration
  interval. A negative duration returns `ATTENDANCE_INVALID_EVENT_ORDER`.
- Either endpoint after the supplied trusted bound returns `ATTENDANCE_FUTURE_EVENT`.
- Two positive intervals overlap only when each begins before the other ends. Exact adjacency and
  zero-duration intervals do not overlap.
- A true overlap returns `ATTENDANCE_OVERLAP`; the validator never merges, truncates, or shifts
  intervals to make them fit.

This slice validates input and deterministic interval relationships only. It does not accept an
ordinary clock command, mutate raw events, persist corrections, authorize actors, allocate event
sequence numbers, create applied-correction history, split at local midnight, calculate daily
minutes, update ledgers, or write audit data.

## Evidence

Focused tests cover unique minute-precision resolution, the `Europe/Athens` nonexistent and
ambiguous DST fixtures, valid explicit offset selection, invalid offset rejection, future and
negative bounds, true overlap, exact adjacency, and zero-duration intervals.

The ambiguous local-time result deliberately exposes only valid UTC offsets, not employees,
records, notes, or other protected context. Later API/UI work owns field mapping and accessible
recovery wording.
