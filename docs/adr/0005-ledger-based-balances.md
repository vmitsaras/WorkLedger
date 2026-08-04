# ADR 0005 — Ledger-Based Time and Leave Balances

**Status:** Accepted

## Context

A mutable `currentBalance` field cannot explain carryover, cancellation, correction, or administrative adjustment reliably.

## Decision

Represent flexible-time and leave balances through append-only ledger entries with source, effective date, amount, and reason. Cached totals may exist as projections but are not the unexplained source of truth.

## Consequences

- Balances are auditable and recalculable.
- Cancellations and corrections become reversing/adjusting entries.
- Query/report projections need careful consistency and transactions.
