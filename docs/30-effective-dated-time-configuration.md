# Effective-Dated Time Configuration

**Task:** `WL-201`

**Outcome:** Complete. `packages/domain` now resolves one effective weekly schedule and one
effective time policy for an already-validated local date. It exposes stable configuration failures
for missing and overlapping assignments without guessing a default.

## Scope

This is a pure, framework-independent configuration slice. It creates immutable weekly schedules,
identity-only time-policy versions, and immutable effective-dated assignments; then it resolves
them through the half-open `LocalDateRange` primitive.

The policy version deliberately carries only its stable identity in this slice. Its warning and
calculation rule fields belong to their respective domain tasks; introducing speculative policy
semantics here would create a second policy contract before those rules exist.

It does not implement persistence, authorization, assignment management, attendance,
holiday/absence behavior, daily calculation, warnings, or historical snapshot storage.

## Public model and resolution contract

- `WeeklySchedule` contains exactly seven named weekday values. Each is an integer from `0` to
  `1,440` inclusive. `0` is a valid deliberate zero-hour day.
- `TimePolicy` represents one immutable policy-version identity.
- A `ScheduleAssignment` or `PolicyAssignment` selects exactly one version for its half-open
  effective range: `[validFrom, validTo)`, or `[validFrom, ∞)` when `validTo` is `null`.
- `resolveSchedule` returns the applicable assignment, ISO weekday, and scheduled minutes.
- `resolvePolicy` returns the applicable policy assignment.
- `resolveEffectiveTimeConfiguration` returns both only after both independently resolve.

The resolver is order-independent. It never uses array order to settle bad configuration:

| Situation on target date | Stable result code |
|---|---|
| No schedule assignment applies | `SCHEDULE_NOT_ASSIGNED` |
| More than one schedule assignment applies | `SCHEDULE_ASSIGNMENT_OVERLAP` |
| No policy assignment applies | `POLICY_NOT_ASSIGNED` |
| More than one policy assignment applies | `POLICY_ASSIGNMENT_OVERLAP` |
| Malformed weekday minute configuration | `INVALID_WEEKLY_SCHEDULE` |

`SCHEDULE_NOT_ASSIGNED` and `POLICY_NOT_ASSIGNED` remain configuration failures, not implicit
zero/default values. Later daily calculation and warning/blocker tasks map these structured codes
to incomplete daily-record behavior; this resolver does not create a daily result itself.

## Integrity and history

Schedule and policy objects, weekday records, assignments, and resolver outputs are frozen. A
future effective assignment therefore selects a new version without mutating a prior version. The
later persistence and monthly-snapshot tasks must retain the resolved source/version references;
this in-memory resolver does not claim historical storage or approval-lock protection.

No UI behavior is added, so this task has no direct accessibility interaction. No user data,
database, network, environment, API, logs, or browser storage is accessed.

## Evidence

Focused unit coverage proves:

- all seven weekday values are validated and a Friday value of zero resolves normally;
- adjacent ranges choose the old version before, and the new version at, the exclusive boundary;
- schedule and policy gaps return their exact stable codes;
- schedule and policy overlaps return their exact stable codes regardless of input array order; and
- combined resolution succeeds only when both required assignments apply.
