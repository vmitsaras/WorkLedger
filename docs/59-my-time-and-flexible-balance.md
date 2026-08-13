# My Time and Flexible-Time Balance

**Task:** `WL-500`

**Status:** Implementation in review; database-enabled integration verification is pending a local
PostgreSQL test service.

## Scope

`GET /v1/me/time` serves the authenticated employee's selected ISO week or calendar month and the
flexible-time portion of My Balances. The read model is limited to non-sensitive URL state:

- `date` — required ISO local reference date;
- `view` — `WEEK` or `MONTH`;
- `page` and `limit` — bounded ledger pagination (`1`–`10,000` and `10`–`50`).

The response contains the canonical period bounds, one record slot for every date in the selected
period, summary counts, a paginated list of posted ledger explanations, and a balance summary. It
does not expose employee, organization, actor, source, policy, absence, correction, or ledger IDs.

## Posted versus projected flexible time

The posted balance is derived exclusively with `calculateTimeAccountLedger` from append-only
entries through the selected period end. Each displayed entry carries its signed minutes, effective
date, explanation code, entry type, posting instant, and balance after the entry.

Eligible projected minutes are the signed balances of complete daily projections through the same
period end whose projection ID is not already the semantic source of a posted ledger entry:

```text
projected balance = posted balance + eligible unposted complete projections
```

This is deliberately not a second source of truth. Daily projections remain replaceable query
caches, while the ledger remains authoritative. Provisional and incomplete projections are never
included in either total; the selected period lists incomplete dates explicitly.

## Authorization and privacy

The endpoint requires an active session, active employee capability, current organization scope,
and `TIME_BALANCE_READ` authorization for the employee themself. It sends `Cache-Control: private,
no-store`. A denied or inactive employee receives the established safe authorization response
without time-record values.

## User interface and accessibility

`/my-time` and `/my-balances` replace their Phase 4 placeholders. They use React Router search
parameters for all shareable state and TanStack Query for the corresponding server read.

- The period form has a visible date label and native week/month buttons with pressed state.
- My Time exposes a captioned semantic table for every date slot, including explicit `no record`,
  provisional, incomplete, and complete textual status.
- The balance area uses labelled description-list values and states why posted and projected totals
  differ.
- Ledger explanations are an ordered list, with named previous/next pagination controls.
- Loading, recovery, and permission-denied paths keep the route heading stable, allowing router
  navigation focus to remain on the visible `h1` while data changes.

`WL-501` owns daily event/session/break detail. `WL-502` owns richer structured warning and
missing-entry actions. Leave balances remain deferred to `WL-601`.

## Evidence

- Domain tests cover ISO week/month boundaries and leap-day calendar increments without `Date`
  arithmetic.
- Component and axe coverage exercises URL-owned My Time state, separate posted/projected values,
  incomplete-date explanation, the daily table, and ledger presentation.
- API integration coverage seeds posted and unposted complete projections plus an incomplete
  projection, then verifies the distinct totals, privacy-minimized DTO, cache policy, and period
  bounds. It is currently skipped because `WORKLEDGER_TEST_DATABASE_URL` is not configured and the
  local Docker daemon is unavailable.
- The OpenAPI 3.1 artifact is regenerated from the same Zod contract at
  `openapi/workledger.openapi.json`.
