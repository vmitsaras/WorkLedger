# Consistent approval decisions

`WL-701` completes the non-self decision path for the Phase 7 approval inbox. Corrections, absence
requests, and absence cancellations now share an authorized detail route and a consistent decision
contract while retaining their distinct domain effects.

## Actor identity and authorization

Every immutable decision stores the authenticated account, an explicit authority, and an optional
employee identity. `CURRENT_MANAGER` requires a current effective direct-manager assignment;
`ORGANIZATION_HR` supports an authorized HR account with or without an employee link. A combined
role still cannot decide its own request. Employee cancellation withdrawal remains `SELF` and
requires the real employee identity.

The API loads the source record inside the transaction, re-evaluates current manager or HR scope,
and authorizes the specific target before returning details or accepting a decision. The generic
inbox remains purpose-minimized; sensitive absence subtype, coverage, entitlement, correction
facts, and reasons appear only after authorization on `/approvals/:approvalId`.

## Shared HTTP contract

- `GET /v1/approvals/:approvalId` returns one discriminated correction, absence, or cancellation
  detail with current status, version, and available actions.
- `POST /v1/approvals/:approvalId/decision` accepts `APPROVE`, `REJECT`, `REQUEST_CHANGES`, or
  `ACKNOWLEDGE` with the expected version. Every outcome except acknowledgement requires a trimmed
  reason of at least ten characters.
- Correction application remains a separate explicit action. Approval alone does not rewrite the
  daily record or balance.
- Responses are `private, no-store`; mutations require an active session, same-origin request, and
  session-bound CSRF token.

## Domain effects

- Correction decisions preserve original punches and snapshots. An approved correction must still
  pass the existing unlocked-period application transaction.
- Approval-required absence approval persists per-segment effects. For entitlement-backed leave it
  releases the pending reservation and appends the final deduction; rejection or changes requested
  releases the reservation without a deduction.
- Managers cannot approve an entitlement result below zero. Eligible non-self HR must select an
  explicit negative-balance override and provide the decision reason.
- Report-and-acknowledge sickness accepts acknowledgement or changes requested, never rejection.
  Acknowledgement stores no invented reason.
- Cancellation approval preserves the request and original effects, appends the next reversal
  effect version, and restores entitlement exactly once.

All writes use serializable transactions with bounded database-only retry. Expected-version checks
make stale tabs and duplicate actions fail without a second decision, effect, ledger transition, or
audit event.

## Accessible interaction and recovery

The detail route uses a route-focused heading, semantic summaries, and a captioned coverage table.
The decision form has a visible reason label and help text, native submit buttons, complete pending
disablement, and no optimistic outcome. Validation, permission, dependency, and conflict feedback
is persistent; validation/conflict feedback receives logical focus. A conflict reloads the current
record before another action. Success is announced once and the inbox/detail queries are
invalidated so the visible state converges on the committed result.

## Migration and evidence

Migration `0014_adorable_piledriver.sql` adds account-first actor columns in stages, backfills
historical decisions using effective account links and authority at the decision instant, rejects
missing or ambiguous history, then restores immutability triggers and final constraints.

Focused evidence covers schema metadata, historical migration backfill, HR-only decisions with a
null employee actor, direct-manager and self-exclusion authorization, sickness acknowledgement,
vacation effects and entitlement arithmetic, cancellation reversal, stale conflicts, component
validation/focus, negative-balance override, and axe checks.
