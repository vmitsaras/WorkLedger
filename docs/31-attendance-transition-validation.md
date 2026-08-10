# Attendance Transition Validation

**Task:** `WL-202`

**Outcome:** Complete. `packages/domain` now validates every ordinary attendance command against
the accepted server-derived `OFF_WORK`, `WORKING`, and `ON_BREAK` state machine. It returns either
the next state and immutable ordered punch-event types or the exact stable conflict code.

## Scope

This is a pure framework-independent transition-validation slice. It exposes the attendance
states, command names, punch-event names, valid action sets, and `validateAttendanceTransition`
from the `@workledger/domain` package root.

It does not reconstruct persisted events, observe a trusted clock, allocate event sequences,
check attendance revisions or idempotency keys, mutate a database, produce audit events, calculate
durations, expose an API, or build UI behavior. Those responsibilities remain with their owning
later tasks.

## Public contract

- `validAttendanceActions(state)` returns the stable action set for the supplied server-derived
  state: `CLOCK_IN` from `OFF_WORK`; `START_BREAK` and `CLOCK_OUT` from `WORKING`; and `RESUME`
  and `CLOCK_OUT` from `ON_BREAK`.
- `validateAttendanceTransition(previousState, input)` accepts a typed ordinary command and
  returns a `Result`.
- A successful result contains `previousState`, `nextState`, and the ordered immutable
  `eventTypes` a later transaction must append.
- Confirmation is available only on the `CLOCK_OUT` command input. `ON_BREAK` clock-out requires
  `confirmActiveBreak: true`, which produces `BREAK_END`, then `CLOCK_OUT`; the normal
  `WORKING` clock-out produces only `CLOCK_OUT`.

The complete matrix is intentionally encoded without array-order fallbacks:

| Current state | Command | Stable outcome |
|---|---|---|
| `OFF_WORK` | `CLOCK_IN` | `WORKING`; `CLOCK_IN` |
| `OFF_WORK` | `START_BREAK` | `ATTENDANCE_NOT_WORKING` |
| `OFF_WORK` | `RESUME` | `ATTENDANCE_NOT_ON_BREAK` |
| `OFF_WORK` | `CLOCK_OUT` | `ATTENDANCE_ALREADY_OFF_WORK` |
| `WORKING` | `CLOCK_IN` | `ATTENDANCE_ALREADY_WORKING` |
| `WORKING` | `START_BREAK` | `ON_BREAK`; `BREAK_START` |
| `WORKING` | `RESUME` | `ATTENDANCE_NOT_ON_BREAK` |
| `WORKING` | `CLOCK_OUT` | `OFF_WORK`; `CLOCK_OUT` |
| `ON_BREAK` | `CLOCK_IN` | `ATTENDANCE_ALREADY_WORKING` |
| `ON_BREAK` | `START_BREAK` | `ATTENDANCE_ALREADY_ON_BREAK` |
| `ON_BREAK` | `RESUME` | `WORKING`; `BREAK_END` |
| `ON_BREAK` | unconfirmed `CLOCK_OUT` | `ATTENDANCE_BREAK_CONFIRMATION_REQUIRED` |
| `ON_BREAK` | confirmed `CLOCK_OUT` | `OFF_WORK`; `BREAK_END`, `CLOCK_OUT` |

## Integrity and boundaries

All returned transition objects, event-type arrays, action arrays, and static errors are frozen.
The validator accepts only a state and typed command input, so it cannot manufacture occurrence
times, revisions, event identities, persistence effects, or audit data. A later authoritative
transaction remains responsible for applying a successful result atomically with the accepted
revision, idempotency, ordering, and clock contracts in `docs/03-domain-rules.md` section 9.

There is no UI or persistence in this task. It therefore creates no direct accessibility
interaction, personal-data collection, storage, logging, network transfer, authorization surface,
or security-sensitive side effect. Stable codes and action sets give later API/UI layers a
machine-readable recovery surface rather than requiring prose interpretation.

## Evidence

Focused unit coverage proves all five successful matrix rows, all seven ordinary invalid rows,
both unconfirmed active-break clock-out forms, exact valid-action sets, ordered event types, and
runtime immutability of returned transition/action values.
