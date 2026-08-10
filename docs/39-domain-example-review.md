# Phase 2 Domain Example Review

**Task:** `WL-210`

**Outcome:** Complete. The pure-domain evidence is reviewed and every catalog fixture maps either
to direct current evidence or to its scheduled later workflow owner.

## Review result

The Phase 2 package contains pure value, attendance reconstruction, schedule/policy, interval,
daily arithmetic, absence-effect, ledger-total, and calculation-signal behavior. Its unit suite is
appropriate evidence for those deterministic consequences.

However, the accepted catalog also contains application/database workflow fixtures: HTTP
idempotency/replay, transactions and audit writes, authorization, entitlement reservations,
correction and period state machines, snapshots, CSV export, and deactivation. Those models and
test boundaries are scheduled for Phases 3–10 and do not exist in `packages/domain`. Implementing
them solely to complete this Phase 2 task would violate the roadmap and package boundaries.

## Fixture mapping

`Direct` means the stated pure-domain calculation is covered by an executable current unit test.
`Partial` means current tests cover the deterministic input/output consequence, while the fixture's
specified transaction, workflow, or status behavior belongs to a later owner. `Deferred` means the
fixture has no Phase 2 implementation surface and must be tested at the named later owner.

| Catalog fixtures | Coverage | Current evidence or required owner |
|---|---|---|
| EX-001–EX-004 | Direct | `daily-attendance-calculation.unit.test.ts`; `attendance-reconstruction.unit.test.ts` |
| EX-005–EX-006 | Partial | Open session/break reconstruction and `ATTENDANCE_INCOMPLETE` signals are covered; provisional clipping/status assembly belongs to `WL-401` |
| EX-007–EX-009 | Deferred | Idempotency, transaction and stale-device race: `WL-306`, then `WL-402`–`WL-405` |
| EX-010 | Partial | Confirmed on-break transition, reconstruction, and arithmetic are covered; one transaction/audit action belongs to `WL-403` |
| EX-011–EX-016 | Direct | `schedule-policy.unit.test.ts`, `daily-attendance-calculation.unit.test.ts`, `calculation-signals.unit.test.ts` |
| EX-017–EX-021 | Direct | `local-date-interval-splitting.unit.test.ts`; `manual-attendance-interval.unit.test.ts` |
| EX-046 | Deferred | Controlled current-day provisional projection: `WL-401` |
| EX-047 | Partial | Minute-aligned interval arithmetic is covered; trusted occurrence capture belongs to `WL-402`/`WL-403` |
| EX-048–EX-051 | Direct | Reconstruction, daily arithmetic, local-day splitting, DST elapsed-time, and warning tests |
| EX-052–EX-053 | Deferred | Organization configuration, authorization, persistence, and audit: `WL-900`/`WL-905` |
| EX-054–EX-056 | Partial | Append-only balance arithmetic and zero daily source are covered; idempotent posting/audit transaction: `WL-301`, `WL-306`, `WL-505` |
| EX-057 | Direct | `calculation-signals.unit.test.ts` |
| EX-058 | Deferred | Current on-break provisional projection: `WL-401`/`WL-403` |
| EX-059 | Direct | Daily interval overlap and structured blocker signals |
| EX-022, EX-025, EX-027 | Direct | `daily-absence-effects.unit.test.ts` and daily arithmetic integration |
| EX-023–EX-024, EX-026 | Partial | Effective zero-day/minute absence arithmetic is covered; request expansion and entitlement effects: `WL-601`–`WL-604` |
| EX-028–EX-031 | Deferred | Privacy DTOs, reservations, decisions, entitlement ledger: `WL-601`–`WL-603` |
| EX-032, EX-060, EX-065, EX-069–EX-070 | Direct | Absence overlap, odd partition, work-credit cap, exact minute intersection, and warning code |
| EX-061–EX-064, EX-066–EX-068, EX-071–EX-075 | Deferred | Absence workflow/cancellation/local-boundary/authorization/privacy policy: `WL-600`–`WL-607` |
| EX-033–EX-037 | Deferred | Correction workflow, submitted/locked interpretation and persistence: `WL-503`–`WL-505`, `WL-800`–`WL-803` |
| EX-038–EX-042, EX-076–EX-085 | Deferred | Monthly readiness, submission, authorization, snapshot and adjustment workflow: `WL-800`–`WL-803` |
| EX-043–EX-045 | Deferred | CSV export, scoped reporting and deactivation: `WL-804`–`WL-805`, `WL-900` |

## Invariant review

The current pure domain slices preserve the applicable Phase 2 invariants:

- minute values are validated integers; balances are signed and unbounded by warning thresholds;
- interval arithmetic uses instants, explicit IANA timezones, minute precision, and local-midnight
  splitting without a fixed-day-length assumption;
- schedule/policy gaps and overlaps return structured outcomes rather than default values;
- raw punch events remain inputs to immutable reconstruction, while interval and daily outputs are
  derived frozen values;
- effective absence credit avoids duplicate work credit, unpaid coverage reduces expectation, and
  zero-hour/holiday defaults remain zero;
- time-account totals use append-only signed entries with scope and source-key checks;
- warnings and blockers are stable structured codes, with holiday work superseding the generic
  zero-expected-day warning.

The review cannot attest to application transactions, persistence constraints, authorization,
idempotency, audit history, entitlement effects, snapshots, exports, or UI accessibility because
those surfaces are intentionally absent from this phase.

## Accepted resolution

The project accepted the documented review boundary on 2026-08-10: `WL-210` requires executable
evidence for the pure-domain subset plus an explicit mapping for every later workflow fixture.
Deferred fixtures retain their listed implementation owner and require executable evidence when
that owner is reached. This preserves the 85 accepted outcomes without pulling persistence,
authorization, API, export, or UI work ahead of the roadmap.
