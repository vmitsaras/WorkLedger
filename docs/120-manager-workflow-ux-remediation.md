# WL-1203 Manager Workflow UX Remediation

**Task:** `WL-1203`

**Status:** Complete on 2026-08-24.

## Scope

This slice applies the Quiet Ledger hierarchy and shared UI contracts to `/team`, `/approvals`,
`/approvals/:approvalId`, and `/team-calendar`. It improves manager comprehension and narrow-screen
operation without changing attendance, approval, absence, correction, authorization, or calendar
data behavior.

The task boundary is presentation and interaction. Existing PostgreSQL records remain
authoritative, TanStack Query retains remote state ownership, React Router search parameters retain
approval filters, sorting, date range, pagination, and calendar month ownership, and no protected
value moves into browser storage.

## Route outcomes

| Route | Immediate task | Narrow strategy | Wider strategy |
|---|---|---|---|
| `/team` | Understand current direct-report availability and unresolved work | Complete semantic record list below 48 rem | Captioned team comparison table |
| `/approvals` | Find, compare, and open the next authorized decision | Complete record list with a visible Review action below 48 rem | Sort-aware captioned queue table |
| `/approvals/:approvalId` | Understand current state and effect before recording one decision | Stacked record, effect, action, then evidence | The same ordered content at a comfortable maximum width |
| `/team-calendar` | Plan around neutral availability while keeping month and date context | Agenda by default until the user chooses another view | Month grid by default, with equivalent agenda available |

Team and Approval list records keep identity, workflow or availability, textual status, current-team
context, dates or unresolved-record state, and the relevant action together. Narrow operation does
not require horizontal panning to discover an off-canvas review control. The wider tables remain
two-dimensional, captioned, and contained by the shared data-table region.

## Filtering and pagination

The Approval filter area always summarizes the applied broad status, workflow category, current
team presence, affected-date range, and sort order. At narrow widths the full form uses native
disclosure. The clear action is absent for the true default state and appears only when a filter or
sort differs from that default.

Filter values remain limited to the existing purpose-minimized contract. No absence subtype,
sickness value, private reason, or employee free-text search enters the URL. Applying filters resets
pagination and preserves focus. Shared pagination now accepts a route-specific navigation label and
optional focus keys, preserving the existing same-path and browser-history focus contract without a
route-local pagination implementation.

## Decision and calendar hierarchy

Approval detail presents the authorized employee and current textual status first. Correction
comparison or absence coverage follows before the valid decision control. Immutable punch events
remain available as trailing evidence after the decision area. Existing action availability,
reason length, negative-balance override, expected version, CSRF, stale-state recovery, correction
application, feedback focus, and authoritative query invalidation are unchanged.

Team Calendar presents selected month and privacy-safe scope time first, followed by an explicit
missing current-team warning when necessary, selected-date detail, then the equivalent agenda or
month grid. The agenda is selected automatically below 48 rem only until the user deliberately
chooses a view. The month grid retains a visible horizontal-scroll instruction and a named,
keyboard-focusable local overflow region; it never creates page-level horizontal overflow.

## Accessibility

The implementation uses shared panels, status badges, alerts, route states, filters, pagination,
buttons, and data tables. Status and warning meaning is textual. Navigation and actions remain real
links and buttons. Route headings keep the existing focus contract, filter and decision errors keep
linked descriptions, mutation results receive logical focus, and decision controls retain forced
colors and reduced-motion evidence.

Component and axe coverage verifies narrow Team and Approval records contain complete task context
without a competing table DOM. Browser coverage verifies 320 and 390 px containment, a 44 px
Approval review target, filter disclosure and focus, pagination focus restoration, wide table
semantics, decision validation and feedback focus, agenda and grid equivalence, local grid overflow,
neutral calendar copy, and the absence of sickness or vacation detail in manager collection views.

Eight ignored screenshots under `output/playwright/wl1203` cover Approval desktop, mobile and 320 px
reflow, mobile Approval detail, Team desktop and mobile, and Team Calendar agenda and grid views.
Manual VoiceOver, NVDA, and TalkBack evidence remains owned by `D-502` and `WL-1206`.

## Security and data

There is no migration, API contract, repository, DTO, authorization, transaction, audit, log, or
cache change. The API continues to resolve current direct-manager or organization-HR scope before
counts and records, excludes self where required, and reauthorizes Approval detail and decisions.

Team views still expose only display name, current team, neutral availability, and generic
unresolved-record state. The Approval queue still exposes broad workflow, status, affected dates,
submitted time, and current team only. Exact absence subtype, entitlement, reason, coverage, and
source evidence remain restricted to an authorized detail response. No new telemetry, export,
attachment, external message, or browser persistence surface was added.

## Verification

- `pnpm format:check` passed after project-memory synchronization.
- `pnpm lint` passed ESLint, 285-file and 1,490-import boundaries, and the 71-source CSS contract.
- `pnpm typecheck` passed strict composite TypeScript.
- `pnpm test` passed 37 tooling tests and 341 unit/component tests across 44 files.
- `pnpm test:integration` passed 13 available tests; 45 PostgreSQL-dependent tests were skipped
  because the integration database was not configured.
- `pnpm test:e2e` passed all 33 configured Playwright scenarios.
- `pnpm build` passed the production and public-import build. The bundle contains 354,316 bytes in
  its largest JavaScript asset, 882,135 total JavaScript bytes, 237,602 gzip JavaScript bytes, and
  49,898 CSS bytes, all within the executable budgets.

## Remaining work

`WL-1204` owns the same hierarchy, state, and dense-responsive adoption for employee
administration, time and absence settings, reports, domain audit, and system administration.
`WL-1205` owns the final cross-route microcopy, motion, state-consistency, and recovery pass.
`WL-1206` owns systematic visual regression, usability review, manual assistive-technology
evidence, and the Phase 12 release gate.
