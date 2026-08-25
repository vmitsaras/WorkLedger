# Authoritative Today display contract

**Task:** `WL-1301`  
**Completed:** 2026-08-25  
**Outcome:** Today now has one strict server-owned snapshot for attendance state, current-interval
timing, current-day arithmetic, posted flexible-time evidence, estimated completion, attention, and
immutable timeline events.

## Scope

This slice establishes the data and selection contract used by the existing Today presentation. It
does not implement the revised information architecture owned by `WL-1302`, the complete state
stories owned by `WL-1303`, or the final metric hierarchy owned by `WL-1304`.

The browser does not join Today with My Time, calculate a balance, infer action availability, or
turn the current provisional difference into flexible-time debt. The API composes the complete
display snapshot and validates it before serialization.

## Snapshot and freshness boundary

`GET /v1/me/attendance/today` now composes its result inside one PostgreSQL `REPEATABLE READ`
transaction after applying both `ATTENDANCE_READ` and `TIME_BALANCE_READ` to the current employee.

The response distinguishes two trusted instants:

- `snapshotCapturedAt` is the exact server instant that bounds the database composition.
- `asOf` is that instant floored to a whole minute. Punch reconstruction, open work/break
  intervals, elapsed minutes, and current-day arithmetic use this minute-aligned instant.

The organization-local `localDate` and IANA `timeZone` are derived from `asOf` with Temporal. The
calculation never uses a browser clock or JavaScript `Date` arithmetic.

Posted flexible-time evidence is calculated from ledger entries whose effective date is no later
than the previous organization-local date and whose `postedAt` is no later than
`snapshotCapturedAt`. `postedThroughDate` is the latest effective date among those included rows;
it is `null` when the bounded ledger is empty. It does not claim that every earlier date has a
daily posting.

## Typed display values

The strict Today contract now supplies:

- current attendance state, revision, valid commands, and availability for all four commands;
- the current open interval's `activeSince` and `activeElapsedMinutes`, or two null values while
  off work;
- a nullable provisional calculation with one named source set for schedule, holiday reduction,
  absence reduction, worked time, break time, absence credit, and approved adjustment;
- `expectedMinutesToday`, `creditedMinutesToday`, `provisionalDifferenceMinutes`, and
  `remainingExpectedMinutes` derived from that source set;
- a reliable `estimatedFinishAt` only while working with a complete calculation and remaining
  expected minutes, otherwise one explicit unavailable reason;
- `postedFlexBalanceMinutes` and `postedThroughDate` from the bounded ledger snapshot;
- structured attention items with code, reason, severity, blocking effect, affected date, recovery
  action, and source; and
- current-local-date immutable punch events in recorded order with the existing truncation signal.

`isPeriodPostedOrLocked` is constrained to `false` for Today. The current date remains
`PROVISIONAL` or `INCOMPLETE`; it is never represented as final, posted, or locked.

## Reconciliation invariants

The response schema rejects a Today object unless all of these relationships hold:

1. Available command rows contain every command exactly once and reconcile in order with
   `validActions`.
2. Active start and active elapsed values are paired and reconcile with the off-work state.
3. Expected minutes equal scheduled minutes minus holiday and absence reductions.
4. Credited minutes equal worked minutes plus absence credit and approved adjustment.
5. The provisional difference equals credited minus expected, and remaining expected minutes equal
   the non-negative expected shortfall.
6. Exactly one of estimated finish or an unavailable reason is present.
7. Attention codes are unique. Blocker metadata is fixed by blocker code, and flexible-time
   threshold warnings must identify `POSTED_FLEX_BALANCE` as their source.

The selector removes any legacy threshold signal based on the current provisional difference and
re-evaluates positive or negative thresholds only against the posted flexible-time balance. A
negative provisional Today difference with a positive posted balance therefore does not create a
debt warning.

## Browser ownership

TanStack Query continues to own the protected no-store response in memory. Cache ordering now
prefers, in order, the greater attendance revision, later `asOf`, and later `snapshotCapturedAt`.
An older response from the same calculation minute cannot overwrite a newer capture.

The shared browser fixture is purpose-minimized and internally coherent: its three timeline events,
30-minute break, 195 worked minutes, 90-minute active interval, 285 remaining expected minutes,
estimated finish, negative provisional difference, and positive posted balance all describe the
same snapshot.

## Accessibility and security

The contract preserves semantic state names and textual attention metadata, so status, blocking,
and source meaning do not depend on color. The existing route retains real buttons, logical focus,
ordered timeline semantics, and native calculation disclosure while later Phase 13 tasks revise
the presentation.

The transport still excludes employee and organization identifiers, actor data, command IDs,
absence subtype and sickness detail, correction reasons, raw policy configuration, and ledger row
identifiers. Responses remain `private, no-store`. Ledger reads use the same employee-target
authorization boundary as My Time and are never exposed as raw entries in Today.

## Evidence and remaining source gaps

Contract tests reject inconsistent arithmetic, command availability, attention metadata, and
over-broad identity fields. Domain and selector tests cover working, off-work, break, multi-session,
paid-absence, approved-adjustment, unresolved-correction, missing-calculation, effective schedule,
overnight, DST, provisional-versus-posted, threshold, and estimated-finish cases. API integration
evidence covers the real repeatable-read composition and posted-through semantics. Component tests
cover the coherent shared fixture and same-minute cache ordering.

Exact partial-day work-versus-absence overlap and calculation-to-ledger source mismatch still need
dedicated repository facts. Today continues to avoid guessing those two signals. Their eventual
implementation must preserve the contract above and may not infer sensitive absence detail from
minute totals.

The strict client-side reconciliation schema and structured Today fields add 5,513 uncompressed
and 1,544 gzip JavaScript bytes relative to the `WL-1300` baseline. The enforced total JavaScript
budgets were deliberately adjusted by less than 1.3 percent to 895,000 uncompressed and 243,000
gzip bytes; the built result remains below both limits. No package or browser-owned calculation was
added.
