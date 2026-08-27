# WL-1504 Insights Context and Foundation Gate

**Task:** `WL-1504`  
**Completed:** 2026-08-27  
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`  
**Outcome:** Pass. The deterministic Insights foundation is complete with provider mode disabled.

## Outcome

Today, My Time, My Balances, Requests, and Reports now provide a compact contextual route into
Employee Insights. The handoff carries only an allowlisted source kind and, where the source owns
one, its visible date or date range. The destination names that context, explains its boundary, and
lets the employee remove it before running an Insight.

The deterministic native result remains complete without a model. This task adds no provider,
model, dependency, migration, write action, audit event, persistent result, prompt store,
conversation store, or external egress path.

## Context map

| Source | Context kind | Safe question and period | Availability |
| --- | --- | --- | --- |
| Today | `TODAY` | Today explanation for the authoritative local date | Employee area |
| My Time | `MY_TIME` | Balance change for the returned week or month range | Employee area |
| My Balances | `MY_BALANCES` | Balance change for the returned week or month range | Employee area |
| Requests | `MY_REQUESTS` | No preselected question or period because the route has no single visible period | Employee area |
| Reports | `REPORTS` | Balance change for the authorized catalog default range | Only actors who also have the Employee area |

Each entry uses a real router link. The URL contains only the existing allowlisted Insight kind and
period fields. The source context kind and source references never enter the address. Requests uses
the canonical `/insights` address because inventing a date range from heterogeneous request records
would misstate the visible page scope.

## Memory and lifecycle

The contextual descriptor is copied into one module memory slot only on an ordinary same tab link
activation. The Insights page consumes the pending handoff once. It is not written to local
storage, session storage, logs, audit, or a database.

The descriptor is cleared when it is consumed, explicitly removed, denied by the route guard,
invalidated by an API permission loss, or cleared with session memory. Reload and process loss also
remove it. A modified link activation that opens another tab uses only the safe URL question and
period and does not create stale context in the current tab.

The context request body contains the allowlisted kind, optional period, and an empty bounded source
reference list. It contains no DOM text, rendered HTML, route DTO, protected identifier, request
detail, absence subtype, note, reason, sickness information, or arbitrary prose. The server still
reloads current PostgreSQL authority and computes the native result from its trusted services.

## Accessibility and localization

Every entry point has a visible heading, explanatory copy, and text action. The destination context
is a named region with a definition list for source and period. Removing context moves focus to the
question selector and produces one concise polite status message. Permission loss removes the
context and presents the existing safe denied state.

English, German, and Spanish catalogs own the complete entry and context copy. The existing locale
formatters render dates and ranges. Component axe coverage verifies all five sources, localized
entry copy, removal focus, permission loss, and role isolation. The focused Chromium scenario
verifies keyboard use, 320 pixel reflow, no horizontal page overflow, forced colors, reduced
motion, browser storage absence, request only execution, reload clearing, and axe results. The
reviewed evidence image is
`output/playwright/wl1504/employee-insight-context-reflow-320x800.png`.

## Signed foundation checklist

| Criterion | Status | Evidence |
| --- | --- | --- |
| Exact deterministic facts, periods, sources, freshness, qualifiers, limitations, and actions pass | **Pass** | `docs/152-wl-1501-deterministic-insight-service-contracts.md` and `docs/153-wl-1502-employee-insight-computations.md`; unit, component, and PostgreSQL tests remain green. |
| Current authority and permission loss remain enforced | **Pass** | The service and API suites cover employee self scope, unrelated roles, combined roles, deactivation, and current permission loss. New route and component tests clear transient context on denied access. |
| Native Insights operate with no provider | **Pass** | Provider mode remains absent and disabled. The route produces complete native results and no model request or external network path exists. |
| Contextual entry points are bounded and understandable | **Pass** | All five required routes use the shared entry component; source and optional period are visible, named, removable, and purpose limited. Reports hides the entry from actors without Employee scope. |
| URLs, persistence, logs, audit, and caches remain safe | **Pass** | Only allowlisted question and period fields enter the URL. Context is one shot browser memory and results remain request memory with private no store transport. Browser evidence confirms local and session storage contain no context. |
| Locale and accessibility evidence passes | **Pass** | All three catalogs pass enforcement. Component and browser tests cover semantics, focus, status, keyboard activation, 320 pixel reflow, forced colors, reduced motion, and axe. |
| Complete repository quality gates pass | **Pass** | Formatting, lint, CSS and source boundaries, strict TypeScript, tooling, unit, component, integration, PostgreSQL, Playwright, i18n, production bundle, and workspace build checks are green. |

## Verification

The gate used repository managed Node `24.18.0`, pnpm `11.20.0`, PostgreSQL `18.4`, and Playwright
`1.61.1`.

```text
pnpm format:check
  passed

pnpm lint
  passed; 331 source files and 1,889 imports satisfy the boundary contract

pnpm typecheck
  passed

pnpm test
  54 tooling tests passed
  430 unit and component tests across 53 files passed

pnpm test:integration
  13 environment independent tests passed; 48 database opted tests skipped by design

pnpm db:test
  15 database enabled files passed; 28 tests passed; 1 historical test skipped

pnpm test:e2e
  48 tests passed across the configured browser matrix; 1 opt in historical capture skipped

pnpm build
  i18n, TypeScript, Vite, bundle budget, and nine typed workspace entries passed
```

The production graph remains within every accepted ceiling. It contains 1,037,620 raw and 267,297
gzip JavaScript bytes, 50,520 CSS bytes, and 379,994 raw plus 102,816 gzip locale bytes. The
internationalization runtime consumes 95,620 raw and 12,297 gzip bytes of its separate allowance.

## Gate decision and remaining boundaries

The Insights foundation gate passes. `WL-1500` through `WL-1504` are complete, so `WL-1505` may
begin the employee local AI pilot sequence. This decision does not enable a provider. `WL-1506`
must still prove private endpoint, pinned model, health, failure, cancellation, diagnostic, and
egress controls before any optional Ollama interpretation can run.

Transient source context deliberately does not survive reload or cross tab navigation. Requests
deliberately carries no invented period. The broader retail browser and assistive technology matrix
remains bounded by `D-502`; this evidence is not a whole product conformance claim.
