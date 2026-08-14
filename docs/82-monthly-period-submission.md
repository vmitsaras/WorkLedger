# Monthly Period Submission

**Task:** `WL-801`

**Status:** Complete

## Scope

`WL-801` turns the `WL-800` monthly review into a self-only employee submission workflow. It adds
exact warning/source acknowledgement, expected-version concurrency control, atomic submission
evidence, and the employee submission interface. It does not request changes, approve, create an
approval snapshot, lock, or send reviewer outcome notifications; those remain `WL-802` scope.

## Transition contract

`POST /v1/monthly-periods/:periodId/submit` accepts only:

- the expected positive period version; and
- the exact SHA-256 source fingerprint issued by the current authorized monthly review.

The fingerprint covers the calculation sources, assignments, unresolved workflow sources,
employment coverage, and ledger entries, while excluding mutable workflow state and display-only
employee data. It therefore stays stable across the submit transition but changes whenever the
reviewed warning/source set changes.

The pure domain transition accepts `OPEN` or `CHANGES_REQUESTED` only. It distinguishes already
submitted, locked, invalid-state, stale-version, not-ready, ledger-mismatch, and stale-warning
acknowledgement outcomes. A stale source returns
`PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED`; an incomplete month returns `PERIOD_NOT_READY` with only
authorized blocker codes and affected dates. Failure writes no successful audit event or snapshot.

## Persistence, authorization, and freeze

Submission runs in one retry-bounded serializable transaction. It locks the monthly-period row,
rechecks the active account, active employee capability, employee role, self ownership, readiness,
expected version, and acknowledged source, then conditionally changes the period to `SUBMITTED`.
The transaction records the submitting account, submitted instant and fingerprint, increments the
version once, and appends one `MONTHLY_PERIOD_SUBMITTED` domain audit event. Migration `0016` adds
the account and fingerprint columns plus fingerprint-format validation. No approval snapshot is
created.

Server-derived `availableActions` exposes `SUBMIT` only to the owning employee when the exact
projection is ready. Current managers and HR retain `WL-800` read access but never receive the
employee action. Ordinary correction, vacation, sickness, and cancellation entry points query
monthly protection under row locking and their transactional mutation boundaries:
`SUBMITTED`/`APPROVED` coverage
returns `PERIOD_REOPEN_REQUIRED`, while `LOCKED` coverage stays routed to
`PERIOD_ADJUSTMENT_REQUIRED`. Pending cancellation coverage is also a monthly readiness blocker so
it cannot race through review invisibly.

## Accessible interaction

The monthly page separates blockers from warnings and explains that submission freezes ordinary
edits. When warnings exist, the submit button remains unavailable until the employee checks a
visible acknowledgement for the exact current source version. Pending text replaces the action
label without a noisy live timer.

Server conflicts remain in a persistent `role="alert"` summary that receives focus. Source and
version conflicts trigger a no-store refetch and clear the old acknowledgement. On success, the
query cache adopts the returned `SUBMITTED` projection, a polite status message is announced, and
focus moves to the textual Submitted heading. Reviewers, incomplete periods, submitted periods,
and locked periods receive explicit non-action explanations instead of disabled or unauthorized
controls.

## Evidence

- Domain unit tests cover ready `CHANGES_REQUESTED` submission, version increments, exact
  acknowledgement, stale acknowledgement/version, ledger mismatch, and invalid states.
- Strict contract tests reject unknown acknowledgement fields and malformed fingerprints.
- PostgreSQL/API integration proves self-only authorization, blocker context, stale warning and
  version failures, one atomic transition/audit, persisted account/time/fingerprint, no approval
  snapshot, stable source identity, retry no-effect behavior, and ordinary correction freeze.
- Cancellation integration distinguishes reopen-required submitted coverage from the post-lock
  adjustment boundary.
- Component/axe coverage verifies acknowledgement gating, exact request payload, reviewer action
  hiding, conflict refresh, acknowledgement invalidation, persistent error focus, success
  announcement, and Submitted-heading focus.
- OpenAPI is generated from the strict Fastify/Zod request and response contracts.

## Remaining work

`WL-802` adds account-first current-manager/organization-HR changes-requested, approval, snapshot,
notification, and separate lock transitions under resolved `D-402`. `WL-803` implements the actual
post-lock adjustment workflow; `WL-801` only preserves its required boundary.
