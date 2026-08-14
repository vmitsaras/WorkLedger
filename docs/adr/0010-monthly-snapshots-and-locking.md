# ADR 0010 — Monthly Snapshots and Locking

**Status:** Accepted; amended 2026-08-14 by `D-402`

## Context

Approved historical periods must not change silently when events, schedules, policies, or calculation code later change.

## Decision

Monthly periods persist `OPEN`, `SUBMITTED`, `CHANGES_REQUESTED`, `APPROVED`, or `LOCKED`; readiness and adjusted-after-lock are derived. Submission freezes ordinary mutation. An explicit eligible non-self reviewer approval creates an immutable, versioned and source-fingerprinted snapshot, while a separate reviewer lock action fixes that exact snapshot without rebuilding it. An eligible reviewer is either the employee's current effective direct manager acting under `CURRENT_MANAGER` authority or an organization HR administrator acting under `ORGANIZATION_HR` authority. The MVP has no automatic lock or unlock mode.

Every decision records the authenticated account and explicit authority. Current-manager authority
requires the effective manager employee identity; organization-HR authority permits an HR-only
account and keeps employee identity optional. A combined manager/HR actor records
`CURRENT_MANAGER` when both paths qualify. Self-action, former-manager scope, delegation,
employee-only authority, and system-administrator authority remain excluded.

The snapshot contains canonical per-date calculation inputs, outputs, source/version references, warning codes, period totals, and included time-account ledger references, together with schema, engine, timezone, actor, cycle, and period-version metadata. It uses neutral absence-effect references and excludes sickness classification, free-text reasons, entitlement balances, and other purpose-incompatible HR detail.

Later approved corrections or cancellations append uniquely source-linked post-lock adjustment records and ledger deltas against the locked snapshot. The original approved view and a baseline-plus-adjustments current view remain independently reproducible.

## Consequences

- Historical reports remain explainable.
- Snapshot schema, calculation-engine versioning, canonical serialization, source fingerprints, and exact ledger reconciliation are required.
- UI must show original approved and current adjusted states clearly.
- Approval and lock apply identical current-scope, non-self, expected-version, source,
  reconciliation, transaction, audit, notification, and concurrency enforcement to both eligible
  authorities.
- Snapshot and decision persistence must follow the account-first actor model; the original
  employee-only approver column is not sufficient for HR-only authority and must be migrated before
  that path is implemented.
- Separate approval and lock adds one deliberate review action but avoids silently equating a reversible pre-lock approval with permanent closure.
