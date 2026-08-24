# WL-1104 — Shared UI patterns

**Status:** Implemented on 2026-08-21; route adoption completed on 2026-08-25.

**Scope:** The local `@workledger/ui` package now supplies product-neutral accessible contracts for
recurring actions, forms, panels, statuses, alerts, filters, pagination, native data tables, and
route states. `WL-1205` completed feature-route adoption across the Phase 12 workflow matrix.

## Contracts

| Pattern | Shared contract | Accessibility behavior |
|---|---|---|
| Actions | React Aria `Button` variants for primary, secondary, quiet, and danger actions | Native button semantics, 44 px minimum target, visible focus, disabled state, and non-color-only destructive copy. |
| Forms | React Aria `TextField`; labelled `FilterBar` container | Visible labels, descriptions and errors remain programmatically connected; filters remain an actual form. |
| Panels | `Panel` with comfortable, balanced, or compact density | Semantic `section`/`article` option; density never changes interactive target size. |
| Statuses | `StatusBadge` with a textual label and neutral/info/success/warning/danger tone | State does not rely on color; a visible marker and border survive forced colors. |
| Alerts | `Alert` with labelled `h2`/`h3`, urgency tone, optional static presentation, and a focusable root ref | Dynamic warning/danger results are assertive alerts; dynamic informational/success results use status semantics; persistent page content sets `announce={false}` and remains in normal reading order. |
| Filters/pagination | `FilterBar` and `Pagination` | Clear form/navigation landmarks, visible/reversible controls, and one polite page summary. |
| Tables | `DataTable` native table wrapper | Required caption, ordinary header semantics supplied by callers, keyboard focusable horizontal overflow, an optional region name, and optional visible scroll guidance. |
| Route states | `RouteState` for loading, empty, error, not-found, and permission-denied outcomes | Explicit title, optional valid recovery link, and a polite loading announcement only. |

`apps/web/src/routes/system-operations-page.tsx` was the first feature adoption; `WL-1200` through
`WL-1205` completed adoption across employee, manager, HR, report, audit, and system routes. The
package preview and component tests exercise all new patterns, including keyboard/axe coverage.
The UI package owns every
`--wl-*` token and every shared component root selector. The application stylesheet owns shell and
route composition, deliberate descendants, and scoped legacy adaptations; it may not redefine a
bare shared root such as `.wl-panel` or `.wl-alert`.

`WL-1201` adds `scrollLabel` and `scrollHint` to `DataTable`. Use both when a narrow layout keeps a
genuinely two dimensional table. The label names the focusable scroll region. The visible hint
makes off canvas content discoverable without depending on hover, color, or unsupported scroll
state queries.

## Deliberate boundaries

- A table stays native until a real interaction requires a React Aria grid; no custom keyboard
  model is introduced pre-emptively.
- Route states are bounded content blocks, not route-boundary behavior. React Router continues to
  own titles, focus placement, authorization, and error handling.
- Status tone expresses presentation only. Workflow/domain state, permissions, and calculations
  remain server-authoritative.
- Existing native select/date controls migrate only with their Phase 12 workflows, preserving
  established validation and URL-state behavior while this foundation is adopted.

## Verification

Completed direct checks: package/web strict TypeScript, CSS ownership contract, focused component
tests with axe and keyboard coverage, Prettier, the full TypeScript build, full unit/component
suite, production web build, bundle budget, and `git diff --check`. `WL-1106` subsequently moved
the ignored out-of-phase `apps/site` tree to the recoverable temporary backup recorded in
`docs/116-phase-11-gate-review.md`, so canonical workspace wrappers now pass without adopting the
Astro project early.

**2026-08-25 — WL-1205 cross-route adoption completion**

- Extended `Alert` with a forwarded root ref, an `h2`/`h3` heading choice, and an explicit
  `announce` control. This lets complex-form summaries and mutation outcomes receive focus while
  persistent calculation, policy, and coverage warnings remain semantic without announcing on
  initial render.
- Migrated the remaining canonical route alerts, recovery states, action controls, content panels,
  and table/list guidance to shared contracts. Removed the app-owned legacy alert/action roots and
  two unused route modules after confirming they were not registered or imported.
- Standardized permission, not-found, dependency, loading, empty, and mutation-result treatment.
  Monthly permission and dependency outcomes now update the document title, focus the route
  heading, withhold invalid retry actions, and return focus to the recovered route after retry.
- Component and Chromium coverage verify one announcement for a validation failure, linked field
  errors, 320 px containment, 390 px drawer behavior, forced colors, reduced motion, and axe.
- See `docs/122-cross-route-consistency-recovery-pass.md` for the copy and verification boundary.
