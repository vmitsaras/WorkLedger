# Post-lock Correction Adjustments

**Task:** `WL-803`

**Status:** Complete

## Scope

`WL-803` implements the correction-specific post-lock path. An employee may submit a correction
against a daily record in a locked month; the request references the exact latest approved monthly
snapshot instead of reopening the period or mutating its source projection. An eligible current
manager or organization HR reviewer decides the request through the existing non-self correction
authority.

Locked absence cancellation remains outside this task's correction-specific dependency and
acceptance boundary. The ordinary cancellation endpoint continues to return
`PERIOD_ADJUSTMENT_REQUIRED` for locked coverage; the broader locked-cancellation domain contract
must be implemented before the relevant phase/release gate can claim it.

## Atomic approval and persistence

Migration `0018` links a correction request to its locked snapshot and completes the existing
post-lock adjustment table with correction request, decision, applied interpretation, ordered
adjustment version, previous/current worked minutes, reversal, and creation evidence. Unique source
and snapshot/version keys prevent duplicate application. Legacy scaffold rows remain valid, while
new application records must satisfy the complete linkage and signed-delta reconciliation checks.

Approval of a linked locked request runs in one retry-bounded serializable transaction. It:

- rechecks current reviewer authority, non-self access, request state/version, locked period, and
  exact latest approved snapshot;
- reads the approved baseline row and its ordered adjustment chain;
- writes one approved applied interpretation and one linked adjustment record, including a
  zero-minute adjustment;
- appends a uniquely sourced `POST_LOCK_ADJUSTMENT` time-account entry only when the signed delta
  is nonzero;
- links an exact compensating adjustment to the prior nonzero adjustment when it is a reversal; and
- writes minimized audit and generic notification evidence before commit.

The raw punches, daily projection, monthly snapshot JSON/fingerprint, and persisted locked-period
state are unchanged. Concurrent or repeated decisions cannot commit a second effect.

## Approved and adjusted views

The monthly response continues to expose the immutable `approvedRecord`. A separate `postLockView`
starts from that record and applies the ordered chain per local date. It reports original closing
balance, cumulative signed delta, adjusted closing balance, current view version, and each linked
adjustment. The service reconciles the adjusted closing value to the posted ledger before returning
the response.

The monthly page labels the original approved record and current adjusted view separately. The
adjustment history uses a captioned native table inside a named keyboard-scrollable region and
provides textual zero-delta and reversal labels. Correction submission and approval screens explain
when approval applies immediately as a post-lock adjustment; state and outcome are never conveyed
by color alone.

## Security and privacy

Authorization remains API-enforced and transaction-local. Self-approval, system-administrator
domain fallback, unrelated/former manager access, stale versions, changed snapshot identity, and
ordinary locked-source mutation remain denied. Free-text correction reasons stay in restricted
workflow/adjustment storage and do not enter the public monthly view, generic notification, or
audit facts. The adjusted DTO exposes only the identifiers and minute evidence needed to explain
and reconcile the chain; it contains no absence classification, sickness context, entitlement
balance, actor details, or reviewer reason.

## Evidence

- Strict contract and schema tests cover application-mode discrimination, minimized adjusted-view
  serialization, complete linkage, zero delta, ordering, and immutability constraints.
- PostgreSQL/API integration proves exact-snapshot linkage, automatic approval application, an
  unchanged daily projection and snapshot, nonzero ledger reconciliation, zero-delta evidence,
  linked reversal, atomic audit/notification records, and one winner under concurrent approval.
- Monthly integration proves baseline `615`, adjusted `628`, and compensated `615` views while the
  approved record stays unchanged.
- Component/axe coverage verifies immediate post-lock approval messaging and the semantic,
  keyboard-scrollable adjusted-view comparison.
- The repository-wide unit/component, PostgreSQL integration, Chromium, OpenAPI, lint, type,
  formatting, boundary, and production-build gates pass.
