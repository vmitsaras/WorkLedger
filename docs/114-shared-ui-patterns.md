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
tests exercise all new patterns, including keyboard/axe coverage. The UI package remains the owner
of every `wl-*` selector and token; application routes compose these contracts rather than
declaring new style rules.

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
suite, production web build, bundle budget, and `git diff --check`. The canonical wrappers that
start with `workspace:check` remain blocked by the pre-existing ignored `apps/site/dist/index.html`
artifact; this UI task neither deletes nor adopts it.
