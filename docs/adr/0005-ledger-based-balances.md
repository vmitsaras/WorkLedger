# ADR 0005 — Ledger-Based Time and Leave Balances

**Status:** Accepted

## Context

A mutable `currentBalance` field cannot explain carryover, cancellation, correction, or administrative adjustment reliably.

## Decision

Represent flexible-time and leave balances through append-only ledger entries with source, effective date, amount, and reason. Cached totals may exist as projections but are not the unexplained source of truth.

`WL-006` clarifies daily time-account posting: only a complete past date posts one base `DAILY_DELTA`; later unlocked source changes append `DAILY_RECALCULATION_DELTA` differences, and locked changes use post-lock adjustment. Posted and projected balances remain distinct.

`WL-007` clarifies leave entitlement: the canonical unit is integer minutes; pending reservation/release entries affect a separate reservation dimension, while allocation/deduction/restoration/carryover/expiry/adjustment entries affect final available entitlement. Approval releases the exact reservation and appends the exact deduction atomically. Cancellation appends a restoration for no more than the still-effective deducted coverage and never mutates the deduction.

## Consequences

- Balances are auditable and recalculable.
- Cancellations and corrections become reversing/adjusting entries.
- Query/report projections need careful consistency and transactions.
- Zero-balance complete dates still receive one zero-minute base entry so posting identity is explicit and retry-safe.
- Leave projections must label available, pending reserved, and projected remaining separately; they cannot count a reservation as a final deduction.
