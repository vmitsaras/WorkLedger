# WL-1102 — Semantic tokens and CSS ownership

**Status:** Implemented on 2026-08-21.  
**Direction:** Quiet Ledger from `docs/111-ui-design-direction.md`.  
**Scope:** Design-token tiers, cascade and stylesheet ownership, shared styling-contract repair,
and executable drift prevention. This task does not build the WL-1104 component expansion or the
WL-1103 runtime company-identity configuration.

## 1. Outcome

WorkLedger now has one authoritative token owner, an explicit cascade order, semantic state
families, shared density and component contracts, and an executable check that rejects unknown
WorkLedger classes and tokens. The web app consumes the package-owned tokens but cannot redeclare
them.

The cleanup also removes the phantom Inter family, ambient page/authentication gradients, inert
`dark:` branches, one-off Tailwind state colors, and the undefined `wl-card` and `text-secondary`
contracts. Existing native controls that have not yet migrated to the local React Aria component
system now use defined compatibility classes rather than invisible style hooks.

## 2. Token inventory

All `--wl-*` declarations live in `packages/ui/src/styles.css`. Media-query overrides for reduced
motion and forced colors remain in that same owner.

| Tier | Representative contracts | Purpose |
|---|---|---|
| Primitive | `--wl-color-*`, `--wl-space-*`, `--wl-radius-*` | Literal color, four-pixel spacing, and shape values. Routes never consume literal colors directly. |
| Semantic | `--wl-surface*`, `--wl-text*`, `--wl-border*`, `--wl-action-*`, `--wl-link*`, `--wl-focus-ring` | Stable product meanings independent of a particular component. Focus remains product-owned. |
| State | `--wl-state-{neutral,info,success,warning,danger}-{text,border,surface}` | Complete textual-state families; status color is paired with visible text and structural boundaries. |
| Component | `--wl-control-*`, `--wl-panel-padding`, `--wl-overlay-scrim`, `--wl-shadow-*` | Shared size, padding, overlay, and bounded elevation contracts. |
| Motion | `--wl-motion-duration-*`, `--wl-motion-ease-standard` | The approved 120–180 ms motion range with owner-level reduced-motion overrides. |
| Density | `--wl-density-{comfortable,balanced,compact}-*` | Route rhythm and container padding; all modes retain the same 44 CSS px control minimum. |

`--wl-danger` remains as a compatibility semantic alias because existing accessible form errors
consume it across many proven call sites. New state containers use the complete `--wl-state-*`
families. Removing the alias belongs to a later component-adoption migration, not a route-by-route
rename in this foundation slice.

## 3. CSS ownership

| Area | Owner | Allowed responsibilities |
|---|---|---|
| Tokens and mode overrides | `packages/ui/src/styles.css` | Every `--wl-*` declaration; light-only scheme; forced-colors mappings; reduced-motion durations. |
| UI primitive base/motion hooks | `packages/ui/src/styles.css` | React Aria control, link, field, dialog, and drawer hooks; package keyframes. |
| Application composition | `apps/web/src/styles.css` | Shell, navigation, panels, alerts, status badges, legacy native-control adapters, application layout helpers, and print. |
| Routes/components | `apps/web/src/**/*.tsx`, `packages/ui/src/**/*.tsx` | Semantic HTML, Tailwind layout/typography utilities, and consumption of defined `var(--wl-*)` values. |

The declared cascade order is:

```css
@layer theme, workledger-tokens, base, workledger-base, components,
  workledger-components, workledger-app, utilities, workledger-preferences;
```

The order lets literal Tailwind utilities intentionally specialize an owned component contract
without specificity escalation, while forced-colors and reduced-motion preference overrides remain
last. Shared selectors use `:where()` where a group should stay easy to override. Logical dimensions
and properties are the default when the relationship should follow writing mode.

The WorkLedger layer names are deliberately flat and hyphenated. Dotted names such as
`workledger.app` create nested sublayers under one `workledger` parent; that parent cannot be
interleaved with Tailwind's `base`, `components`, and `utilities` layers and would allow resets to
override authored component boundaries.

## 4. Route-level exceptions

Routes may use:

- Tailwind utilities for local grid/flex layout, spacing, typography, wrapping, and responsive
  composition;
- arbitrary-value utilities that consume an existing `var(--wl-*)` token;
- transparent/current-color/inherit/initial values where they express ordinary CSS behavior;
- project classes prefixed `wl-` only when the class has an owned stylesheet selector;
- literal `white` and `black` in the print-only contract where print agents require those explicit
  output colors.

Routes may not:

- declare or override a `--wl-*` token;
- introduce raw hex, RGB, HSL, Lab, LCH, Oklab, or Oklch colors;
- use Tailwind palette state utilities such as `bg-red-500`;
- add `dark:` utilities while the product remains deliberately light-only;
- add ambient `linear-gradient()` or `radial-gradient()` backgrounds;
- invent an unowned `wl-*` class or reuse the removed `wl-card`/`text-secondary` contracts.

A future exception requires an accepted direction/ownership update and a corresponding checker
change. A route-local exception is not established merely by making the checker ignore it.

## 5. State, density, and accessibility behavior

Success, warning, and danger presentations now share text, border, surface, and marker roles.
Forced colors maps those roles to system colors and retains real borders; meaning never depends on
background image, shadow, or color alone. Focus uses the separate `--wl-focus-ring` token and
three-pixel outlines.

The Operations route is the reference repair for `UI-003`: every diagnostic term/definition pair
is contained by a valid `dl`, long technical errors wrap in a labelled semantic state treatment,
and healthy/degraded/critical/unavailable values remain visible text next to a decorative marker.
The route continues to expose only its existing safe technical DTO.

The density tier records comfortable, balanced, and compact rhythm without shrinking interactive
targets. Container style queries are not a core dependency because they are newer than the
project's Baseline 2024 target. If contextual density becomes necessary, WL-1104 must use an
explicit semantic attribute/selectors with a complete fallback, then verify nesting and reflow.

## 6. Executable boundary

Run:

```text
pnpm css:check
```

`scripts/check-css-contract.mjs` scans application and UI source and rejects:

- a `var(--wl-*)` use with no package-owned declaration;
- a `wl-*` class use with no owned selector;
- token declarations or the token layer outside the UI stylesheet;
- missing representative contracts from any required token tier;
- raw colors outside the token owner;
- one-off palette utilities, inert dark branches, ambient gradients, and removed legacy classes.

The check runs in `pnpm lint`. Its focused negative/positive tests run in the root `pnpm test`
tooling suite, and the workspace contract requires both the script and command to remain present.

## 7. Verification evidence

Completed on 2026-08-21:

- The CSS checker passes across 59 source files, 84 owned tokens, 44 defined WorkLedger classes,
  and 563 token uses; four focused tooling tests cover current, positive, negative, and missing-tier
  cases.
- Operations component/axe evidence verifies the safe diagnostics DTO, all term/definition
  relationships, textual states, and wrapped error treatment.
- Real-browser desktop and 320 CSS px inspection verified zero page overflow, 44 CSS px controls,
  one-pixel panel/status boundaries, forced-colors `CanvasText`/`Highlight` mappings, and 1 ms
  reduced-motion values. This pass found and corrected dotted cascade-layer nesting before signoff.
- Direct quality gates passed Prettier, ESLint, source boundaries, strict TypeScript, 36 tooling
  tests, 324 unit/component tests, 12 runnable integration tests, all 25 configured Playwright
  scenarios, the production browser build, bundle budget, and workspace public-root import check.
- The canonical wrappers remain blocked before their underlying checks by the pre-existing ignored
  `apps/site/dist/index.html` directory, which is matched as an incomplete workspace project.

## 8. Deferred work

- WL-1103 consumes the reserved identity boundary through `--wl-identity-accent`; its runtime
  organization name/logo/favicon validation and safe fallbacks are documented in
  `docs/113-company-identity-runtime-configuration.md`.
- WL-1104 owns shared React Aria patterns and migration away from the bounded native-control
  compatibility classes.
- WL-1105 owns shell/authentication/route-boundary redesign.
- `UI-002` remains open: `/system/audit` is still a stale placeholder and is owned by WL-1204.
- Cross-route workflow adoption and final visual/manual assistive-technology evidence remain in
  Phase 12.
