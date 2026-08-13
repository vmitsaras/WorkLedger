# Leave Entitlement Ledger and My Balances

**Task:** `WL-601`

## Outcome

WorkLedger now derives leave entitlement balances from append-only, source-keyed ledger entries.
The existing self-only time read model includes the leave portion of My Balances, showing each
entitlement account's available, reserved, and projected minutes plus a paginated source-entry
explanation.

## Ledger contract

The domain-owned entry types are `ALLOCATION`, `PENDING_RESERVATION`, `RESERVATION_RELEASE`,
`APPROVED_DEDUCTION`, `CANCELLATION_RESTORATION`, `CARRYOVER`, `EXPIRY`, and
`MANUAL_ADJUSTMENT`. They are signed integer-minute facts:

```text
available minutes = final-balance entries
reserved minutes = -reservation-dimension entries
projected remaining = available minutes - reserved minutes
```

The calculator rejects duplicate entry identities, repeated type/source transitions, cross-account
scope, and invalid signs. A reservation can make projected remaining negative; it does not change
available minutes. The later request workflow is responsible for deciding whether an ordinary
manager can approve a negative balance.

The persistence migration renames the pre-WL-601 placeholder enum values to the accepted domain
terms, adds `CARRYOVER`, and expands unique source identity to employee, entitlement account,
entry type, and source. Existing records are converted before the enum is recreated. Entries
remain protected by the established immutable-record trigger.

## Read model and privacy

`GET /v1/me/time` remains self-only, returns `Cache-Control: private, no-store`, and does not
expose employee, organization, source, or absence-type identifiers. It now includes a `leave`
section containing only the owner-visible account name, integer-minute balance breakdown, and
source-entry type/effect/date/resulting balances.

`/my-balances` renders that section as labelled description lists and a semantic ordered list.
It explains the available/reserved/projected relationship in text, supports the same bounded URL
pagination as the flexible-time ledger, and provides explicit empty/loading/error states through
the existing route boundary. No leave details are placed in URLs or browser persistence.

## Deliberate boundaries

This slice creates the ledger foundation and read surface only. It does not create entitlement
allocations in the UI, absence requests, decisions, absence effects, negative-balance overrides,
or cancellations. Those state transitions remain owned by `WL-602`, `WL-603`, and `WL-606`.

## Evidence

- Domain unit tests cover allocation/reservation/approval/restoration sequences, negative projected
  balances, source uniqueness, scope isolation, and invalid signs.
- Repository integration tests prove a concurrent duplicate reservation produces one persisted
  source effect.
- Migration, deterministic seed, self-only API, component, and axe tests cover the persisted
  terminology, balance calculation, minimized DTO, and accessible source-entry presentation.
