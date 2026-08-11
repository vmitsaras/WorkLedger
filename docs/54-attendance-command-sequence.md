# Attendance Command Sequence

**Task:** `WL-403`  
**Completed:** 2026-08-11  
**Outcome:** Complete locally. WorkLedger now applies start-break, resume, and clock-out from the
Today screen through the same protected transaction boundary as clock-in, including atomic
active-break closure, exact immutable-event order, minimized audit evidence, and accessible
confirmation and result feedback.

## Transport and result contracts

The authenticated self-service attendance command surface now includes:

- `POST /v1/me/attendance/clock-in` for `CLOCK_IN`;
- `POST /v1/me/attendance/start-break` for `START_BREAK`;
- `POST /v1/me/attendance/end-break` for `RESUME`; and
- `POST /v1/me/attendance/clock-out` for `CLOCK_OUT`.

Every route requires the accepted same-origin session, session-bound CSRF token, exactly one valid
`Idempotency-Key`, and a strict non-negative `expectedAttendanceRevision`. Clock-out alone accepts
the optional boolean `confirmActiveBreak`. Omission and `false` are the same canonical intent;
changing the flag under an already claimed key is a fingerprint conflict.

The command-specific success schemas reject substituted commands, states, or event order:

- start-break creates exactly one `BREAK_START` and results in `ON_BREAK`;
- resume creates exactly one `BREAK_END` and results in `WORKING`;
- ordinary clock-out creates exactly one `CLOCK_OUT` and results in `OFF_WORK`; and
- confirmed on-break clock-out creates exactly `BREAK_END` then `CLOCK_OUT`, at one server instant,
  and results in `OFF_WORK`.

Each accepted command increments `attendanceRevision` once even when it creates two events.
Terminal replay returns the original operation snapshot with `meta.idempotentReplay: true` and no
new attendance effect.

## Shared transaction boundary

The former clock-in-only service is now one command service for all four stable domain commands. It
preserves the accepted ordering:

1. verify origin, active session, session CSRF, active employee capability, and
   `ATTENDANCE_CLOCK` authorization before request validation can claim a key;
2. repeat active-context resolution and authorization inside one `SERIALIZABLE` database-only
   transaction;
3. claim the organization/account/key fingerprint or replay/reject its terminal outcome;
4. ensure and lock the employee attendance head, then validate revision, current state, and latest
   immutable event sequence;
5. validate the domain transition, including explicit active-break confirmation;
6. capture and minute-align one trusted server instant after validation, rejecting clock regression;
7. append the transition's exact ordered punch events, advance the head once, and append one
   command-specific domain audit event;
8. complete the minimized terminal success snapshot and commit every effect together.

An unconfirmed on-break clock-out returns terminal
`409 ATTENDANCE_BREAK_CONFIRMATION_REQUIRED` with only the current state, revision, valid actions,
and confirmation requirement. It creates no punch, head revision, or audit event. The deliberate
confirmed action uses a new key because it is a different intent. Cross-command reuse of one key is
also rejected without revealing the original request.

Audit action codes remain explicit: `ATTENDANCE_START_BREAK`, `ATTENDANCE_RESUME`, and
`ATTENDANCE_CLOCK_OUT`. A confirmed on-break clock-out records one audit event with `eventCount: 2`;
it does not misrepresent the two source punches as two employee decisions.

## Today interaction and accessibility

The Today route renders only the actions in the authoritative `validActions` array, in server order.
Each action is a semantic React Aria button; one pending intent disables every attendance control,
shows command-specific text, leaves the current state unchanged, and awaits authoritative query
invalidation/refetch. Success produces one persistent polite status. A safe terminal conflict uses
one assertive alert. Focus moves to the resulting status heading only after the initiating action
has disappeared from the authoritative state.

When clock-out is selected during `ON_BREAK`, a controlled React Aria modal explains that
WorkLedger will close the break and clock out at the same recorded instant. Cancel, Escape, and
dismissal restore focus and create no intent. Confirmation submits `confirmActiveBreak: true`; while
pending, dismissal and both dialog actions are disabled so the outcome is not obscured. The shared
dialog preserves platform focus containment, initial focus, Escape handling, and trigger focus
restoration.

Modern Web Guidance informed this slice's native-button semantics, concise async announcements,
conditional focus movement, and platform modal behavior. The React Aria dialog remains appropriate;
no dialog-invoker polyfill or dependency was added. Browser evidence also exposed a primary-action
contrast boundary, so the shared primary token was darkened while retaining its text label, visible
focus, hover distinction, forced-colors support, and reduced-motion behavior.

## Verification evidence

- Contract tests enforce strict command bodies, command/result correlations, and exact one- or
  two-event response order.
- PostgreSQL/API integration executes the full sequence, proves one stale winner under concurrent
  different-key start-break attempts, rejects cross-command key reuse, normalizes omitted/false
  clock-out confirmation, persists the unconfirmed terminal conflict, and verifies final event,
  revision, replay, and audit order.
- Component tests cover all command controls, visible pending state, authoritative refetch,
  confirmation cancellation, confirmed clock-out, focus behavior, and axe.
- Chromium executes the sequence by keyboard, verifies protected headers and bodies, tests Escape
  restoration and confirmation, waits for the deliberate dialog entry transition before measuring
  settled contrast, and passes axe before and after clock-out.
- The generated OpenAPI 3.1 artifact exposes all four selected mutation operations with the required
  idempotency header and strict command-specific schemas.
- The database-enabled canonical gate passes 24 native checks, 147 unit/component tests,
  21 integration tests, five Chromium scenarios, OpenAPI drift, formatting, lint/boundaries,
  strict TypeScript, and the production build.

## Deferred ownership

- `WL-404` completes the attendance timeline/list and calculation-breakdown experience documented
  in `docs/55-today-timeline-calculation.md`.
- `WL-405` owns bounded unknown-result retry, offline/reconnect handling, polling, and broader
  cross-tab/device refresh. Attendance intents remain memory-only and are never queued offline.
- `WL-406` owns the phase-wide manual keyboard, screen-reader, touch, zoom/reflow, forced-colors,
  and reduced-motion review.
