# Time-Account Ledger Totals

**Task:** `WL-208`

**Outcome:** Complete. `packages/domain` now derives an employee's posted flexible-time balance
from a stated opening balance and ordered append-only ledger entries, with a source explanation
after every entry.

## Scope

`calculateTimeAccountLedger(input)` accepts one organization/employee scope, a signed opening
balance, and entries in their existing append order. It returns frozen totals:

```text
entry total     = sum(all supplied signed entry amounts)
closing balance = opening balance + entry total
```

Each explanation preserves the entry ID, semantic source key, entry type, explanation code,
effective date, amount, and balance after that entry. The result therefore distinguishes a
previously posted opening balance from the effect of every later entry; it does not expose an
unexplained mutable balance.

The bounded current entry types are `OPENING_BALANCE`, `DAILY_DELTA`,
`DAILY_RECALCULATION_DELTA`, `POST_LOCK_ADJUSTMENT`, and
`MANUAL_ADMINISTRATIVE_ADJUSTMENT`. A signed zero-minute daily entry remains explicit in the
explanation, preserving the required base-posting source evidence.

## Validation and boundaries

- Every supplied entry must match the calculator's organization and employee scope.
- Entry IDs and semantic source keys must each be unique in the supplied ledger slice.
- Totals must remain safe signed integer minutes; invalid total arithmetic returns a stable domain
  error rather than silently truncating or overflowing.
- Entry order is retained exactly as supplied. The calculator does not sort, mutate, merge, or
  replace historical facts.

This module derives posted totals only. It does not decide whether a date is complete/past,
compute daily deltas, append/retry entries, enforce database uniqueness, authorize manual
adjustments, determine post-lock decisions, calculate projections, persist records, or emit audit
events. Those transactional responsibilities remain for later application/database work; `WL-209`
next owns warnings and submission blockers.

## Evidence

Focused unit tests cover a 600-minute opening balance followed by daily, recalculation, post-lock,
and manual adjustment entries; a zero-minute base daily source; duplicate ID/source rejection;
scope mismatch; frozen totals; and immutable entry-type values.
