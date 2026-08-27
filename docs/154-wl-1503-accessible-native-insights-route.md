# WL-1503 Accessible Native Insights Route

**Task:** `WL-1503`
**Date:** 2026-08-27
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`
**Runtime changes:** One employee API endpoint and one lazy employee route

## Outcome

WorkLedger now exposes the four deterministic employee Insights through an authenticated API and a
localized `/insights` route. Native WorkLedger facts remain the first and authoritative result.
The optional generated explanation area is visibly disabled and does not affect the deterministic
workflow.

The page uses the existing WorkLedger shell, panels, status badges, alerts, buttons, form controls,
focus patterns, and semantic tokens. It adds no provider, model, dependency, migration, write
action, audit event, or persistence path.

## API transport

`POST /v1/insights/run` accepts the strict employee Insight request contract. The route requires a
same origin request, an active authenticated session, and a valid CSRF token before it calls the
existing Insight Service. Every response uses the standard safe envelope and successful results
set `Cache-Control: private, no-store`.

The OpenAPI document includes the endpoint and its typed success, authentication, authorization,
validation, rate limit, and dependency failure responses. Integration evidence covers missing
authentication, wrong origin, missing CSRF, unknown input, successful self scoped output, protected
identifier omission, and current permission loss.

## Employee route

The employee navigation now includes Insights. The route is lazy loaded and guarded by the
employee area loader. Opening the route or restoring a safe URL never runs an Insight. A user must
choose or confirm one of the four supported questions and submit the form.

The URL stores only allowlisted question and date context. Duplicate, unknown, malformed, or
mismatched parameters are removed. Results, facts, source references, limitations, questions, and
provider content remain in request memory only and are cleared when the selected question or
period changes.

The native result presents the selected period, capture time, self scope, typed facts, qualifiers,
freshness boundaries, material limitations, source areas, and bounded native actions. Posted,
projected, provisional, incomplete, reserved, restricted, and unavailable evidence remains visible
in text. Source references never become identifiers in URLs. Monthly sources use a safe month
focused My Time destination because the native contract does not expose a monthly period ID.

## Accessibility

The route uses a normal heading hierarchy, visible labels and descriptions, field linked errors,
and a focusable error summary. Pending and completed requests use one concise polite status region.
Successful results do not move focus unexpectedly and provide a direct link to the result heading.

Native links are real links and the submit control is a real button. Status is never communicated
by color alone. Component axe checks and browser evidence cover keyboard use, validation focus,
320 pixel reflow, forced colors, reduced motion, and touch sized controls. Visual inspection of the
captured 320 pixel result found and corrected one compressed form layout before completion.

English, German, and Spanish catalogs contain the complete route, form, state, fact, limitation,
source, action, error, privacy, and provider disabled copy. The catalog contract verifies matching
keys and interpolation parameters in all three locales.

## Security and data

The server reloads and authorizes the current employee scope for every run. The browser cannot
select another employee or workspace. The route does not persist results in browser storage and
does not place source aliases or protected identifiers in the address. Session expiry clears
protected client memory before sign in. Permission loss returns a safe denied state.

No raw punch event, request note, sickness detail, policy detail, database identifier, or free form
question is rendered or transported by this task. The API validation response does not echo unknown
input. No Insight payload is added to application logs.

## Verification

The formatting, lint, type, unit, component, environment independent integration, PostgreSQL,
browser, and production build gates pass. Unit and component verification passes 422 tests across
53 files. The repository tooling gate passes 54 tests. The broad integration command passes 13
tests while 48 PostgreSQL opted tests remain skipped by that command.

The canonical PostgreSQL suite passes 28 tests across 15 files with one intentional historical
skip. The browser suite passes 48 tests with one intentional historical screenshot skip. The new
browser scenario verifies request only execution, 320 pixel reflow, forced colors, reduced motion,
and axe results.

The production build emits the Insights contract and page as separate lazy chunks. The accepted
application budget is now 942,000 raw JavaScript bytes plus the existing 96,000 byte
internationalization runtime allowance. The measured non locale application is 1,033,671 raw bytes
and 266,392 gzip bytes. Locale chunks remain separately bounded at 378,378 raw bytes and 102,258
gzip bytes total.

## Remaining work

`WL-1504` owns bounded contextual entry points from Today, My Time, My Balances, Requests, and
Reports, plus the complete Insights foundation subgate. Provider, tool registry, manager, report
builder, HR, system, and MCP work remains blocked by the roadmap gates.
