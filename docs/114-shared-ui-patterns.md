# WL-1104 — Shared UI patterns

**Status:** Implemented on 2026-08-21.  
**Scope:** The local `@workledger/ui` package now supplies product-neutral accessible contracts for
recurring actions, forms, panels, statuses, alerts, filters, pagination, native data tables, and
route states. Feature-by-feature adoption remains owned by Phase 12.

## Contracts

| Pattern | Shared contract | Accessibility behavior |
|---|---|---|
| Actions | React Aria `Button` variants for primary, secondary, quiet, and danger actions | Native button semantics, 44 px minimum target, visible focus, disabled state, and non-color-only destructive copy. |
| Forms | React Aria `TextField`; labelled `FilterBar` container | Visible labels, descriptions and errors remain programmatically connected; filters remain an actual form. |
| Panels | `Panel` with comfortable, balanced, or compact density | Semantic `section`/`article` option; density never changes interactive target size. |
| Statuses | `StatusBadge` with a textual label and neutral/info/success/warning/danger tone | State does not rely on color; a visible marker and border survive forced colors. |
| Alerts | `Alert` with labelled heading and role selected by urgency | Warning/danger are assertive alerts; informational/success updates use status semantics. |
| Filters/pagination | `FilterBar` and `Pagination` | Clear form/navigation landmarks, visible/reversible controls, and one polite page summary. |
| Tables | `DataTable` native table wrapper | Required caption, ordinary header semantics supplied by callers, and keyboard-focusable horizontal overflow container. |
| Route states | `RouteState` for loading, empty, error, not-found, and permission-denied outcomes | Explicit title, optional valid recovery link, and a polite loading announcement only. |

`apps/web/src/routes/system-operations-page.tsx` is the first feature adoption: its technical
diagnostic statuses now use the shared textual badge contract. The package preview and component
tests exercise all new patterns, including keyboard/axe coverage. The UI package owns every
`--wl-*` token and every shared component root selector. The application stylesheet owns shell and
route composition, deliberate descendants, and scoped legacy adaptations; it may not redefine a
bare shared root such as `.wl-panel` or `.wl-alert`.

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
