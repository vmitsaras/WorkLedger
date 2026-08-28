# WL-1509 Deterministic Manager Insights

**Task:** `WL-1509`
**Status:** Complete
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

## Implementation evidence

The Manager workspace exposes `/team-insights` through its authorized navigation area. The page
accepts only the two strict Manager request contracts, sends them only to
`POST /v1/insights/manager/run`, and reuses the accessible native result presentation without an
interpretation control. English, German, and Spanish catalogs include purpose, fact, limitation,
scope, and privacy copy.

Contract and component tests cover strict request shapes, current direct report scope, the native
Team status action, absence of interpretation UI, explicit request routing, and automated axe
verification. The service keeps authorization, organization local date derivation, current report
queries, and result validation inside one repeatable read transaction. It has no AI provider
dependency and cannot call one.

The lazy Manager route has a bounded 7,000 byte raw and 2,000 byte gzip application allowance.
Locale chunks remain governed by the existing per locale limits.
