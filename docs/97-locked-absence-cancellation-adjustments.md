# Locked absence-cancellation adjustments

`WL-1000A` implements the resolved `D-504` contract without treating an absence cancellation as an
attendance correction or rewriting an approved monthly record.

## Persistence and transaction contract

Migration `0020` adds immutable `absence_cancellation_snapshot_links` and extends
`post_lock_adjustments` with an absence-cancellation discriminant plus worked, absence-credit,
expected, credited, and balance deltas. Database constraints enforce one link per
cancellation/snapshot, one cancellation adjustment per link/date, organization-consistent source
references, and `balance = credited - expected` reconciliation.

Cancellation submission still rejects `SUBMITTED` or `APPROVED` target months with
`PERIOD_REOPEN_REQUIRED`. For a `LOCKED` target it captures the latest approved snapshot ID and
source fingerprint in the same serializable transaction as the request. Mixed unlocked/locked
coverage is accepted or rejected as one request.

Approval rechecks current non-self authority and expected request version. It verifies the
captured fingerprint and exact absence-effect ID/version against the immutable snapshot, appends
zero-valued successor absence effects, restores only the eligible prior entitlement deduction,
and appends ordered per-date post-lock component adjustments. Each affected snapshot receives one
aggregate time-account entry when its balance delta is nonzero; zero-delta decisions retain linked
adjustment and audit evidence without a zero ledger entry. A conflict rolls back every effect.

## Presentation and privacy

The monthly response uses a strict discriminated adjustment contract. Authorized users see the
immutable approved record separately from the reconciled current view, with textual source,
component, balance, zero-delta, and reversal descriptions. Browser DTOs do not expose absence type,
decision reason, entitlement detail, sickness context, snapshot links, or internal ledger source
identifiers.

## Evidence

- Schema tests cover the new checks, indexes, immutable trigger, and migration journal.
- PostgreSQL migration tests apply the complete chain through `0020`.
- Cancellation integration proves snapshot preservation, exact two-date component deltas, one
  aggregate time-account entry, exact entitlement restoration, audit/notification evidence, and
  stale-replay rollback.
- Contract and component tests prove strict DTO minimization, captioned tabular semantics, textual
  state, narrow-screen containment, and axe coverage.
