# Absence cancellation and reversal

`WL-606` implements the cancellation workflow for already-effective absence coverage. It is a
separate, append-only workflow: neither the original absence request, its coverage segments, its
decision, nor its existing effects are deleted or edited.

## Workflow

An employee may request cancellation of all remaining effective coverage, or submit an exact
non-overlapping subset of its original coverage-segment identifiers. The original request must be
`REPORTED`, `ACKNOWLEDGED`, `APPROVED`, or `PARTIALLY_CANCELLED`. Pending cancellation leaves the
original coverage effective.

An eligible current manager or HR administrator other than the subject employee can approve,
reject, or request changes. Employees can withdraw a pending or changes-requested cancellation.
Both source request and cancellation mutations use explicit versions. A stale request, duplicate
target, or completed decision returns a conflict without a partial write.

Approval sets the source request to `PARTIALLY_CANCELLED` when coverage remains and `CANCELLED`
when none remains. It appends a zero-valued later `absence_effects` version for each target, so
daily calculation reads no continuing credit or expected reduction while retaining every earlier
effect version for audit.

## Entitlement reversal

When the source had a prior `APPROVED_DEDUCTION`, approval appends one positive
`CANCELLATION_RESTORATION` leave-entitlement entry keyed by the cancellation identity. The amount
is bounded by the targeted effective entitlement and the original deduction. A cancellation with
no approved deduction, including ordinary reported sickness, creates no artificial entitlement
movement.

Approval, state update, calculation-input replacement, entitlement restoration, and audit record
run in one serializable transaction. A target in a locked monthly period is rejected with
`PERIOD_ADJUSTMENT_REQUIRED`; it must use the later post-lock adjustment workflow.

## API and interface

- `POST /v1/me/absence-requests/:requestId/cancellations` submits an all-remaining cancellation
  when `coverageSegmentIds` is omitted, or an exact subset when it is supplied.
- `POST /v1/me/absence-cancellations/:cancellationId/withdraw` withdraws a pending request.
- `POST /v1/manager/absence-cancellations/:cancellationId/decision` records `APPROVE`, `REJECT`,
  or `REQUEST_CHANGES`; rejection and changes require a reason.

The sickness-report success state includes an accessible cancellation action with a pending state,
plain-language explanation that coverage remains effective while pending, and an asserted error
message for a failed request. It neither requests nor displays medical information.

## Evidence

`apps/api/test/absence-cancellation.integration.test.ts` verifies a partial cancellation,
immutable initial effect/deduction, exact restoration, duplicate-decision safety, and locked-period
routing.
