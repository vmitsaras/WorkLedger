# WL-1502 Employee Insight Computations

**Task:** `WL-1502`
**Date:** 2026-08-27
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`
**Runtime changes:** Four read only Employee Insight handlers and one optional source label

## Outcome

WorkLedger now computes all four provider independent employee Insights from authoritative native
records. `createEmployeeInsightHandlers` supplies the completed handler map to the existing
repeatable read Insight Service. The service still owns current authorization, trusted scope,
timezone, and capture metadata, then validates each completed native result before return.

This task adds no endpoint, page, provider, model, network request, database migration, dependency,
write action, audit event, log content, or persistence path. The product remains complete without
Ollama.

## Balance change

The balance handler reads the append only time account ledger through the requested end date and
trusted capture instant. It returns exact posted opening, period change, and closing minute facts.
Complete daily projections in the requested range contribute only when their source has not already
been posted to the ledger. Posted and projected changes remain separate facts.

Incomplete daily projections are excluded from the projected change and produce an explicit count
and material limitation. The handler does not invent a projected closing balance across dates for
which no complete authoritative projection exists.

## Leave projection

The leave handler reads entries that were posted by the trusted capture instant and are effective
on or before the requested date. It runs the existing entitlement ledger calculator separately for
each configured absence type account. Available, reserved, and projected remaining minutes stay
separate for every account.

Different accounts are not summed because their units may represent different configured policy
meanings. The native source contract therefore permits one bounded optional label containing the
employee authorized account name. Results expose at most 20 account detail groups and mark a
larger result as materially limited. A missing entitlement ledger returns a typed unavailable fact
instead of a fabricated zero balance.

## Submission blockers

The blocker handler loads the employee monthly period, authoritative projection source, and latest
snapshot, then reuses the existing monthly projection function. It returns workflow state, month
completion, readiness, covered and complete date counts, and the current ordered blocker codes.

Blocker evidence maps only to the bounded Monthly review, My time, or My requests destinations.
Request and record identifiers never enter the result. Detail is bounded to 94 blocker facts so
the complete native payload remains within its contract limit. Missing periods and unavailable
workflow states carry explicit unavailable or material limitation evidence.

## Today explanation

The Today handler accepts only the organization local current date at the trusted capture instant.
A different requested date returns a typed unavailable result with a safe Today action. For the
current date, the handler reuses the complete Today attendance pipeline inside the same authorized
transaction.

The result keeps posted flexible time separate from provisional or incomplete current day values.
It exposes the attendance state, calculation status, scheduled, expected, worked, break, absence,
holiday, correction, adjustment, credited, difference, remaining, active elapsed, and estimated
finish facts when their authoritative Today contract supplies them. Attention codes, freshness,
provisional status, incomplete status, and timeline truncation remain explicit. Raw punch events,
domain identifiers, notes, and policy details are omitted.

## Security and data

All four handlers run only after the Employee Insight Service reloads and authorizes the current
active account, employee link, role, employee state, organization, and timezone. The PostgreSQL
integration test proves successful self scoped computation for every kind and proves that a later
permission loss prevents handler execution.

Native payloads contain purpose aliases and bounded configured leave account names only. They do
not contain account, employee, organization, request, ledger entry, daily record, monthly period,
or absence type identifiers. Posted, projected, provisional, incomplete, unavailable, and reserved
evidence stays typed and separate.

## Accessibility

This task has no rendered interface. Facts are structured values with textual state codes, explicit
qualifiers, freshness boundaries, source destinations, material limitations, and named native
actions. `WL-1503` can render the result with normal document structure and visible status text
without deriving meaning from color, animation, or unstructured prose.

## Verification

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`,
`pnpm test:e2e`, `pnpm db:test`, and `pnpm build` pass.

The unit and component gate passes 420 tests across 52 files. The repository tooling gate passes
54 tests. Source boundaries cover 324 files and 1,817 imports without a forbidden edge. The broad
environment independent integration run passes 13 tests while 48 PostgreSQL opted tests remain
skipped by that command.

The canonical PostgreSQL suite passes 28 tests across 15 files with one intentional historical
skip. The new database fixture runs all four handlers against real repositories, verifies exact
Berlin local date behavior and purpose minimized output, and proves denial after current role loss.
The browser suite passes 47 tests with one intentional historical screenshot skip.

The production and workspace build pass. The browser graph remains at the accepted baseline of
435,303 largest chunk bytes, 1,004,370 total raw JavaScript bytes, 258,039 gzip JavaScript bytes,
and 50,242 CSS bytes.

## Remaining work

`WL-1503` owns the same origin endpoint, private no store response, accessible role scoped route,
localized native presentation, and complete loading, empty, unavailable, denied, and error states.
No provider work may begin before the Insights foundation subgate completes through `WL-1504`.
