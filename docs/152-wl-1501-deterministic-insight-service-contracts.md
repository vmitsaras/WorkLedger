# WL-1501 Deterministic Insight Service and Native Result Contracts

**Task:** `WL-1501`
**Date:** 2026-08-27
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`
**Runtime changes:** Typed contracts and an API application service only

## Outcome

WorkLedger now has the provider independent foundation for deterministic employee Insights. The
shared contract accepts one Employee workspace, one allowlisted Insight kind, its exact date,
month, or date range, and optional visible context made only from an allowlisted context kind,
period, and opaque source references. It rejects caller supplied account, employee, organization,
role, prose question, model, and raw filter fields.

The four accepted employee request kinds are `balance-change`, `submission-blockers`,
`leave-projection`, and `today-explanation`. Their calculations remain owned by `WL-1502`. This
task establishes their request and result boundary without inventing any value.

## Native result contract

Every result contains its kind, active workspace, exact scope, period, organization timezone,
trusted capture instant, freshness boundaries, facts, sources, limitations, and native actions.
Facts carry typed Boolean, count, date, instant, integer minute, or enumerated state values. Each
fact also carries explicit evidence qualifiers. Posted, projected, and provisional evidence cannot
share one fact. Suppressed and unavailable facts cannot expose a value.

Source, fact, limitation, freshness, and action references are bounded and checked as one closed
result. Every referenced source must exist in that result. Source kinds map to one allowlisted
native destination, and every active workspace maps to its exact scope kind. Native actions use
typed destinations and bounded periods rather than arbitrary links, fields, or filters.

The runtime schemas live at the explicit `@workledger/contracts/insights` package surface. Root
contract exports remain type only for Insights. This keeps the unused runtime schemas out of the
current browser build and preserves the accepted application bundle baseline.

## Service boundary

`createInsightService` runs inside one repeatable read database transaction. It reloads the current
account, active employee link, roles, employee status, organization, and timezone on every run. It
then applies the existing self scope authorization action or actions for the selected Insight kind.
Only a successful `SELF` decision reaches a registered handler.

Handlers receive the current transaction and a server constructed Employee authority. They return
facts and presentation metadata only. The service itself constructs the kind, workspace, scope,
period, timezone, and trusted capture instant. It validates the complete native result before it
can leave the application service. Missing handlers and invalid handler output fail closed through
the existing safe API error architecture.

## Security and data

The database remains authoritative for current access and stored facts. Combined roles do not
widen an Employee workspace result. A technical only account, an inactive account, an inactive
employee capability, or permission loss cannot invoke a handler. Account, employee, organization,
and role values remain in the server authority and are absent from the native result.

This task adds no endpoint, write action, audit event, log content, provider, network request,
prompt, transcript, browser persistence, database table, migration, dependency, environment
variable, or model configuration.

## Accessibility

This task has no rendered interface. The structured fact values, descriptor codes, explicit
qualifiers, source destinations, material limitations, and native actions give `WL-1503` the data
needed for semantic headings, lists, tables, status text, source links, and named actions without
parsing prose or using color as the only signal.

## Verification

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass. The unit and component run
contains 416 passing tests across 51 files. The repository tooling run contains 54 passing tests.
The source boundary is 321 files and 1,793 imports with no forbidden edge.

`pnpm db:test` passes 27 tests across 14 files with one intentional historical skip. The new
database test proves current scope reload, combined role isolation, technical account denial,
account and employee deactivation, missing handler rejection, invalid result rejection, exact
trusted metadata construction, and protected identifier absence.

`pnpm build` passes every typed workspace entry, internationalization enforcement, the web build,
and the browser budget. The browser graph remains at its accepted baseline of 435,303 largest chunk
bytes, 1,004,370 total raw JavaScript bytes, 258,039 gzip JavaScript bytes, and 50,242 CSS bytes.

The broad `pnpm test:integration` command is not green for unrelated existing tests. Retention,
system operations, and user export fixtures use hyphens in schema labels that the shared fixture
rejects. Approval inbox and clock in also returned unrelated 500 responses during that fully
parallel run. The task specific PostgreSQL test and the canonical isolated database suite pass.
No UI or route changed, so Playwright and OpenAPI output are unchanged and were not rerun.

## Remaining work

`WL-1502` must implement the four deterministic employee computations from authoritative daily
projections, ledgers, monthly periods, requests, and Today sources. `WL-1503` owns the endpoint,
route, no store response behavior, localization, and accessible native presentation. Provider work
remains blocked until the Insights foundation gate passes.
