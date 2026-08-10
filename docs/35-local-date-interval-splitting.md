# Local-Date Interval Splitting

**Task:** `WL-206`

**Outcome:** Complete. `packages/domain` now splits a completed work or break interval at every
organization-local midnight using Temporal timezone rules.

## Scope

`splitAttendanceIntervalAtLocalMidnight(sourceInterval, timeZone)` accepts minute-aligned instant
bounds and returns frozen local-date segments. Each segment contains its local date, exact instant
bounds, and the original source-interval reference. It therefore preserves work-session/event
provenance while providing values structurally usable as daily work-interval inputs.

The next boundary is derived from the next local calendar date at `00:00` in the supplied IANA
timezone. It is not calculated by adding 1,440 minutes. Segment elapsed duration is always the
difference between its instants, so a 23-hour spring-forward or 25-hour fall-back local date does
not add, lose, or reinterpret time.

## Rules

- An interval spanning local midnight creates one half-open segment for each local date crossed.
- Work and break intervals use the same splitter; the generic source reference preserves their
  distinct type and source linkage.
- Equal instant bounds are valid zero-duration intervals and belong to the local date of their
  start instant.
- Negative bounds return `ATTENDANCE_INVALID_EVENT_ORDER`; non-minute source precision returns
  `ATTENDANCE_INVALID_EVENT_PRECISION`.

This task does not reconstruct events, infer open intervals, apply absence effects, calculate
daily totals, assign calculation status, post ledgers, persist records, or create API/UI behavior.

## Evidence

Focused tests cover the accepted Athens overnight fixture (two 120-minute segments split at
`22:00Z`), cross-midnight break provenance, spring-forward and fall-back one-hour elapsed
fixtures, zero-duration attribution, and invalid source bounds.
