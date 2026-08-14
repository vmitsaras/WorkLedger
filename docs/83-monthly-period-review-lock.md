# Monthly Period Review and Lock

**Task:** `WL-802`

**Status:** Complete

## Scope

`WL-802` implements the resolved `D-402` reviewer workflow for monthly periods. A current effective
direct manager or organization HR administrator may request changes, approve, and later lock a
period, always non-self. Approval and lock remain separate actions; post-lock correction effects
remain `WL-803` scope.

## Authority and transitions

Every command re-resolves the active account, current organization roles, employee capability,
direct-manager assignment, and self relationship. Current-manager authority takes deterministic
precedence when an actor also has HR. HR-only accounts may act without an employee link; former or
unrelated managers, employees, system administrators, delegated actors, and every self-action are
denied.

The strict transitions are:

- `SUBMITTED` → `CHANGES_REQUESTED`, with a visible reason and invalidated submitted fingerprint;
- `SUBMITTED` → `APPROVED`, with the next numbered immutable approval snapshot;
- `APPROVED` → `CHANGES_REQUESTED`, preserving the prior snapshot as history; and
- `APPROVED` → `LOCKED`, fixing the latest exact snapshot without rebuilding it.

Approval and lock recheck expected workflow version, current source fingerprint, blockers, ledger
reconciliation, and current authority inside one retry-bounded serializable transaction. A source
or version race records no partial snapshot, decision, audit event, notification, or lock.

## Immutable evidence and migration

Migration `0017` changes monthly snapshots to the account-first actor contract, backfills legacy
account/authority/cycle evidence, permits null employee evidence only for HR authority, and adds an
immutable monthly-decision journal. Snapshot and decision uniqueness bind each approval cycle and
workflow version to one append-only fact.

The canonical snapshot contains actor/account authority, organization/employee/period/timezone
identity, schema and calculation-engine versions, exact source and snapshot fingerprints, ordered
daily calculations, effective schedule and policy versions, holiday and absence expected
reductions, neutral absence-effect and applied-correction references, warning codes, period totals,
and ordered ledger entry IDs, amounts, source keys, and fingerprints. Snapshot construction
reconciles scheduled/reduction/expected and absence-effect/credit values before persistence.

Sickness classification, request or reviewer notes, diagnosis, entitlement balances, and protected
source payloads are excluded. The public approved record exposes only the numbered cycle, approved
instant, engine/schema/version evidence, final rows, totals, and fingerprints.

## Inbox, notifications, and interface

The unified approval inbox now includes purpose-minimized `MONTHLY_PERIOD` rows with month bounds,
generic status, current team, and a direct link to `/monthly-periods/:periodId`. Scope and
self-exclusion apply before filters, totals, sorting, and pagination. Reasons and source details
never enter the inbox.

Each successful reviewer command appends one generic in-app notification atomically and links it
to the restricted monthly route. Optional external delivery remains post-commit and cannot roll
back the domain decision. Notification content omits the decision reason, employee details,
absence information, dates, reviewer, and source identifiers.

The monthly page labels `Request changes`, `Approve month`, and `Lock month` distinctly. The changes
reason is visible, required, audience-labelled, and connected to a focused error summary. Stale
responses refetch authoritative state without clearing safe typed reason text. Lock uses an
accessible confirmation that explains permanence, the preserved snapshot, and the post-lock
adjustment path; cancel restores focus without effect. The approved record and reviewer history
remain textual and do not depend on color.

## Evidence

- Pure domain and strict contract tests cover state, reason, version, source, blocker, ledger,
  approval-cycle, and exact-snapshot rules.
- Migration tests prove historical manager actor/cycle backfill and snapshot immutability.
- PostgreSQL/API integration proves manager and HR-only authority, combined-role precedence,
  self/unrelated denial, changed-source and stale-lock no-effect behavior, two approval cycles, one
  final lock without an extra snapshot, atomic audit/notification evidence, generic notification
  history, and privacy-safe sickness-credit snapshot serialization.
- Inbox integration covers monthly type filtering, manager/HR scope, self-exclusion, month bounds,
  current team, pagination, and purpose minimization.
- Component/axe and Chromium coverage verify the reason error path, conflict preservation,
  approved record, permanent-lock confirmation/cancel focus, direct inbox link, keyboard behavior,
  narrow reflow, and accessible semantics.

## Remaining work

`WL-803` implements post-lock request, decision, adjustment-ledger linkage, approved-versus-adjusted
views, zero-delta evidence, concurrency safety, and reversal. No ordinary unlock exists.
