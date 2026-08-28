# WL-1509 Deterministic Manager Insights

**Task:** `WL-1509`  
**Status:** In implementation  
**Decision:** ADR 0014 and `docs/160-wl-1508g-phase-15-deterministic-continuation.md`

## Contract

Manager Insights are two date-scoped, read-only native results: `manager-action-summary` and
`team-coverage`. They run only in the Manager workspace and derive every result inside a
repeatable-read transaction after resolving the current account, active employee capability,
organization timezone, current actor, and current direct-report scope.

The action summary exposes only the factual number of action-required Approval inbox records in
the manager's current report scope. Team coverage exposes only total and neutral `WORKING`,
`ON_BREAK`, `UNAVAILABLE`, `OFF_WORK`, and unresolved-record counts. It never returns employee
identifiers, names, absence type, sickness subtype, notes, reasons, entitlement, or workflow-item
identifiers. `UNAVAILABLE` retains the existing neutral Team status meaning.

Both purposes require the requested local date to equal the captured organization-local date;
another date returns a typed unavailable fact and material limitation rather than inventing a
historical attendance or coverage state. Sources and native actions are constrained respectively
to the existing Approval inbox and Team status routes.

## Explicit non-goals

There are no provider calls, model interpretation, recommendation, staffing judgement, approval
decision, write, audit event, stored query, or persistent result. HR scope does not substitute for
the Manager workspace, and former managers lose access on the next request.
