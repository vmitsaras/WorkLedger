# Attendance Reconstruction

**Task:** `WL-203`

**Outcome:** Complete. `packages/domain` now deterministically rebuilds work sessions, completed
work intervals, completed break intervals, and a valid open interval from immutable punch events.

## Scope

`reconstructAttendance(events)` accepts the source events for one employee and uses
`eventSequence` as its only order key. The input array may be in any storage/retrieval order; the
result exposes the normalized sequence order. Duplicate/non-positive/unsafe sequence values,
occurred-time regression in sequence order, non-minute occurrence precision, and an event that is
illegal for the derived state fail with a structured result instead of a guessed session.

A result contains the current attendance state, normalized event order, and sessions. Each session
retains its clock-in/out source event, separate break-free work and break interval arrays, and an
explicit open work or break interval where the valid sequence has not yet closed. Empty input is
valid `OFF_WORK`; a `WORKING` or `ON_BREAK` ending state is valid but incomplete for a later daily
calculation task.

It does not observe a clock, create events, allocate sequence values, validate revisions or
idempotency, persist/audit anything, resolve manual local time, split intervals at midnight,
calculate durations/minutes, or produce a daily result. Those remain the responsibilities of
later domain and application tasks.

## Rules and stable outcomes

- The only accepted source transition sequence is `CLOCK_IN`, then zero or more
  `BREAK_START`/`BREAK_END` pairs, then `CLOCK_OUT`.
- `BREAK_END` followed by `CLOCK_OUT` at the same occurrence instant is valid and creates a
  zero-duration final work interval. This represents confirmed active-break clock-out without
  inventing work after the break.
- Equal occurrence instants are valid only when distinct increasing event sequences establish
  their order. A later event may never have an earlier occurrence instant.
- Every occurrence instant must be aligned to the start of a UTC minute. No interval rounding is
  applied.
- Invalid state/event order, duplicate sequence values, invalid sequence values, or an occurrence
  regression returns `ATTENDANCE_INVALID_EVENT_ORDER`.
- A non-minute-aligned (or malformed defensive-boundary) occurrence instant returns
  `ATTENDANCE_INVALID_EVENT_PRECISION`.

All result containers, intervals, session arrays, and open intervals are frozen. Source event
objects remain caller-owned immutable facts; their physical identities, organization/employee
ownership, actor, and recorded-time fields remain deferred to the persistence model.

## Evidence

Focused tests cover a normal break-containing session from unordered input, three separate work
sessions, valid incomplete working and on-break states, confirmed active-break clock-out, duplicate
sequence values, invalid event order/state, occurrence-time regression, non-minute precision, and
valid zero-duration sessions.

## Boundary note

`docs/08-task-board.md` is the canonical task board. Its `WL-204` ownership—manual/corrected
interval validation and overlap constraints—supersedes a stale compact-TODO label that described
break/multiple-session calculations. The compact checklist is normalized in this change; this task
already owns normal/multiple/open event reconstruction.
