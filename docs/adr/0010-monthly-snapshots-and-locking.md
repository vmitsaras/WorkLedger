# ADR 0010 — Monthly Snapshots and Locking

**Status:** Accepted concept; exact snapshot schema deferred to Phase 8

## Context

Approved historical periods must not change silently when events, schedules, policies, or calculation code later change.

## Decision

Monthly periods progress through submission, approval, and locking. Approval/locking persists a reproducible versioned snapshot. Later corrections create linked adjustments and do not rewrite the original approved snapshot.

## Consequences

- Historical reports remain explainable.
- Snapshot schema and calculation-engine versioning are required.
- UI must show original approved and current adjusted states clearly.
