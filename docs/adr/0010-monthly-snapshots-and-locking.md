# ADR 0010 — Monthly Snapshots and Locking

**Status:** Accepted

## Context

Approved historical periods must not change silently when events, schedules, policies, or calculation code later change.

## Decision

Monthly periods persist `OPEN`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`, or `LOCKED`; readiness and adjusted-after-lock are derived. Submission freezes ordinary mutation. An explicit eligible non-self manager approval creates an immutable, versioned and source-fingerprinted snapshot, while a separate manager lock action fixes that exact snapshot without rebuilding it. The MVP has no automatic lock or unlock mode.

The snapshot contains canonical per-date calculation inputs, outputs, source/version references, warning codes, period totals, and included time-account ledger references, together with schema, engine, timezone, actor, cycle, and period-version metadata. It uses neutral absence-effect references and excludes sickness classification, free-text reasons, entitlement balances, and other purpose-incompatible HR detail.

Later approved corrections or cancellations append uniquely source-linked post-lock adjustment records and ledger deltas against the locked snapshot. The original approved view and a baseline-plus-adjustments current view remain independently reproducible.

## Consequences

- Historical reports remain explainable.
- Snapshot schema, calculation-engine versioning, canonical serialization, source fingerprints, and exact ledger reconciliation are required.
- UI must show original approved and current adjusted states clearly.
- Approval, lock, and adjustment require current scope, self-action, expected-version, transaction, audit, and concurrency enforcement.
- Separate approval and lock adds one deliberate review action but avoids silently equating a reversible pre-lock approval with permanent closure.
