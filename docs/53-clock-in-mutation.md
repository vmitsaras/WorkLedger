# Clock-In Mutation

**Task:** `WL-402`  
**Completed:** 2026-08-11  
**Outcome:** Complete locally. WorkLedger now applies the ordinary employee `CLOCK_IN` command from
the Today screen through current authorization, strict transport validation, a serializable
idempotent transaction, one immutable punch, one attendance revision, one minimized audit event,
and deliberate accessible browser feedback.

## Transport and authorization boundary

`POST /v1/me/attendance/clock-in` is an authenticated self-service operation. The selected OpenAPI
contract requires:

- same-origin `POST` transport and the session-bound `x-workledger-csrf` header;
- exactly one opaque `Idempotency-Key` header matching `[A-Za-z0-9._~-]{16,128}`; and
- the strict body `{ "expectedAttendanceRevision": <non-negative integer> }`.

The body has no client occurrence instant, employee/organization identifier, command selector, or
unknown extension field. The response contains only the `CLOCK_IN` command, trusted occurrence
instant, resulting state/revision/valid actions, and one opaque created-event identifier/type. It is
`private, no-store` and receives a fresh server request identifier. A matching terminal replay
adds `meta.idempotentReplay: true` without changing the semantic result.

Origin, session, CSRF, active employee capability, and central `ATTENDANCE_CLOCK` authorization are
checked before request validation can create an idempotency claim. The mutation transaction repeats
the active-context and permission decision so a capability change between preflight and commit
cannot authorize a stale operation. Missing, malformed, and duplicated idempotency headers return
their specific safe `422` codes; authorization failures reveal no employee or attendance detail.

## Fingerprint and transaction

The canonical SHA-256 request fingerprint contains the resolved organization, actor account,
employee, `POST` method, `CLOCK_IN` command, and normalized expected revision. It excludes the raw
idempotency key, session/cookie/CSRF material, request identifier, transport time, and server
occurrence instant. Raw keys and fingerprints have no audit, URL, browser-persistence, analytics, or
normal logging path.

One `SERIALIZABLE` database-only transaction performs the authoritative command:

1. re-resolve and authorize the active self context;
2. claim or load the protected organization/account/key record;
3. replay an exact terminal fingerprint or reject changed reuse without rerunning state validation;
4. ensure and lock the employee attendance head;
5. reject a stale revision or invalid `CLOCK_IN` state and complete that deterministic error for
   the key;
6. verify the head and latest immutable event sequence agree;
7. observe and floor the trusted server instant once, rejecting clock regression before any effect;
8. append one `CLOCK_IN` punch and advance the head to `WORKING` with one revision increment;
9. append one `ATTENDANCE_CLOCK_IN` domain audit event with actor-at-action, prior/next state,
   event count, revision, subject, occurrence instant, and request correlation; and
10. complete the semantic success snapshot and commit all effects together.

The database transaction retry classifier now follows bounded wrapped `cause` chains so Drizzle's
wrapped PostgreSQL `40001`/`40P01` errors remain eligible for the already accepted database-only
retry policy. This is required for concurrent serializable `ON CONFLICT` arbitration: one matching
request commits and the retried follower loads the terminal replay. External-effect callbacks still
cannot enable this retry mode.

Stale revision and invalid current-state conflicts persist only a bounded terminal error snapshot;
they create no punch, revision change, or attendance audit event. Dependency/internal failure and
server-clock regression roll back the claim with every attempted effect, allowing a safe same-key
retry. Replays never create another audit event.

## Today interaction and accessibility

The `OFF_WORK` Today state renders a semantic form with a native React Aria button labelled
`Clock in`. Submission creates one in-memory UUID intent key, changes the visible button text to
`Clocking in…`, disables repeat activation in the current tab, and leaves the authoritative Today
state unchanged while pending. The client stores neither the key nor protected query data in
persistent browser storage.

Success renders one persistent polite status such as “Clocked in at 11:30 AM.” and refetches the
authoritative Today query before enabling another intent. When the updated state removes the prior
clock-in control, focus moves to the programmatically focusable `Working` heading. A stale-state
conflict renders one safe assertive alert, refetches current state, states that no clock-in was
recorded, and follows the same logical-focus rule when the old action is no longer valid. Request
references are visible only when supplied by a safe API error.

The implementation follows Modern Web Guidance's Baseline 2024 recommendations for a semantic
form/native button, disabling only after valid submission, non-color status meaning, one polite
result region, one assertive actionable error, visible focus, and keyboard/axe verification. It
does not announce transient loading, claim an optimistic state, animate a required transition, or
create duplicate announcements for one intent.

## Verification evidence

- Contract tests accept the minimized success/replay envelope and reject client time and unknown
  response identity fields.
- Domain primitive coverage compares Temporal instants without JavaScript `Date` arithmetic.
- PostgreSQL/API integration proves origin/session/CSRF/header ordering, strict body validation,
  inactive-employee denial, one successful concurrent command plus one replay, changed-fingerprint
  conflict, stale and invalid-action terminal replay, one punch/revision/audit effect, no raw key or
  internal identity disclosure, Today refetch visibility, and rollback on server-clock regression.
- Component tests prove visible pending text, disabled double activation, one request, one polite
  success, one safe stale alert, session-expiry recovery, authoritative refetch, logical focus, and
  axe behavior.
- Chromium proves keyboard submission, protected intent headers, authoritative status focus, one
  visible result, and axe behavior.
- The selected OpenAPI 3.1 artifact marks `Idempotency-Key` required and remains reproducible without
  authentication internals or runtime secrets.

## Deferred ownership

- `WL-403` completes `START_BREAK`, `RESUME`, and `CLOCK_OUT`, including active-break confirmation,
  through the shared boundary documented in `docs/54-attendance-command-sequence.md`.
- `WL-405` owns bounded unknown-result retry, offline/reconnect behavior, polling, and broader
  cross-tab/device coordination. This slice does not queue offline events or automatically retry a
  browser mutation.
- `WL-406` performs the phase-wide manual keyboard, screen-reader, touch, zoom/reflow,
  forced-colors, and reduced-motion review after the full attendance sequence exists.
