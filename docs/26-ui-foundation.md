# WL-106 — React Aria UI foundation

**Outcome:** Complete. WorkLedger now has a browser-rendered React Aria component foundation,
explicit shadcn React Aria registry metadata, Tailwind CSS compilation, WorkLedger design tokens,
visible focus treatments, reduced-motion behavior, and isolated semantic examples for a button,
link, text field, and dialog.

## Scope

This slice adds product-neutral UI infrastructure only. It does not add React Router feature routes,
server state, authentication, attendance behavior, application schema, or production deployment
behavior.

## Foundation ownership

| Area | Owner | Evidence |
|---|---|---|
| React Aria wrappers and variants | `packages/ui` | `Button`, `Link`, `TextField`, and `Dialog` are named public exports |
| Tokens, focus, forced colors, and motion | `packages/ui/src/styles.css` | One explicit `./styles.css` package export |
| Tailwind compilation | `apps/web` | Tailwind Vite plugin, explicit UI source scan, production browser build |
| Isolated preview | `FoundationPreview` composed by `apps/web` | Real Vite page used by component and Chromium tests |
| shadcn base metadata | root `components.json` | Current schema uses `style: "aria-nova"`, which selects the React Aria base |

The explicit stylesheet export is the only addition to the accepted `packages/ui` public surface.
Application code continues to consume UI TypeScript through `@workledger/ui`; no sibling-source or
deep package imports were introduced.

### Phase 11 ownership update

`WL-1102` extends this initial foundation with the authoritative semantic token and CSS ownership
contract in `docs/112-semantic-tokens-css-contract.md`. `packages/ui/src/styles.css` remains the
only `--wl-*` declaration owner and owns the shared component roots added by `WL-1104`;
`apps/web/src/styles.css` owns application composition, deliberate descendants, and scoped legacy
adaptations. The executable `pnpm css:check` boundary rejects undefined classes/tokens, one-off
color-mode drift, and bare app redefinitions of shared roots. Where this earlier foundation
describes the initial token subset, the WL-1102/WL-1104 inventory is authoritative.

The repository boundary scanner now uses pinned `@babel/parser@8.0.4` for TypeScript/TSX module
syntax. The existing `es-module-lexer` cannot parse JSX, and the pinned native TypeScript 7 package
does not expose a compiler parser API. Babel only extracts module specifiers for the existing
boundary rules; it does not replace TypeScript checking or add a runtime dependency.

## Component contract

- `Button` wraps React Aria `Button`, renders button semantics, uses `onPress`, and provides
  `primary`, `secondary`, and `quiet` variants through Class Variance Authority.
- `Link` requires an `href`, so navigation renders an anchor rather than a button made to look like
  a link.
- `TextField` composes React Aria label, description, input, and field-error contexts so visible text
  and programmatic relationships stay synchronized.
- `Dialog` composes `DialogTrigger`, modal overlay, modal, labelled dialog, and a close action.
  React Aria owns Escape behavior, modal containment, initial focus, and trigger focus restoration.

The preview is a foundation story, not a product route. Its copy and actions are deliberately
non-domain examples.

## Design and accessibility tokens

The initial tokens cover neutral surfaces, text, borders, primary actions, links, danger text,
focus, restrained elevation, and two short motion durations. Focus uses a three-pixel outline plus
offset and is driven by React Aria's `data-focus-visible` state. Controls have minimum target sizes,
and field labels/descriptions remain visible.

Forced-colors mode maps borders and focus to system colors. It does not disable forced-color
adjustment to preserve the authored palette. The foundation does not use color as the only source
of component meaning.

## Reduced motion

Normal mode permits only short state transitions and dialog opacity/spatial entrance. Under
`prefers-reduced-motion: reduce`, the motion-duration tokens become `1ms`, dialog animations are
removed, transforms are reset, and interactions remain immediate. There is no global universal
selector that can accidentally accelerate unrelated animation loops.

## shadcn and repository aliases

The current shadcn schema encodes the chosen primitive base in the style name, so
`components.json` uses `aria-nova`. The CLI's `docs ... -b aria` command works and was used to check
the base-specific component contract.

The CLI's `info` command additionally requires source path aliases. ADR `0011` and the executable
boundary check prohibit those aliases because they can bypass package roots. WorkLedger therefore
keeps relative imports inside `packages/ui` and does not weaken the boundary to make `shadcn info`
pass. Future shadcn source additions must request the React Aria base explicitly, be adapted to
local relative imports, and pass the repository boundary scan. `D-007` records this resolved
tooling constraint.

## TypeScript compatibility note

`react-aria-components@1.20.0` currently publishes declarations whose inherited optional DOM
properties conflict with React `19.2.8` types when TypeScript `7.0.2` evaluates dependency
declarations under `exactOptionalPropertyTypes`. `skipLibCheck` is enabled only for the two browser
projects (`packages/ui` and `apps/web`) to isolate that upstream declaration conflict. WorkLedger
source remains fully checked with all other strict options, including exact optional properties.
Remove the override when the upstream declarations become compatible.

## Verification evidence

- `pnpm with 11.20.0 run verify` passed on 2026-08-10 under Node `24.18.0` and pnpm
  `11.20.0`. It covered runtime configuration, formatting, lint, the 37-file/75-import boundary scan,
  strict typecheck, 24 native tooling tests, 14 unit/component tests, integration tests, two Chromium
  E2E tests, the Vite/Tailwind browser build, and all eight typed workspace entries. The opt-in real
  PostgreSQL lifecycle test skipped because `WORKLEDGER_TEST_DATABASE_URL` was not set; database
  behavior is outside this slice.
- The checked-in shadcn configuration passes the current published JSON schema and explicitly
  selects `aria-nova`; `shadcn info` reaches only the documented alias conflict above.
- Unit/component tests cover semantic roles and names, the link destination, the field's connected
  description, keyboard dialog opening, initial dialog focus, Escape closing, focus restoration,
  and axe.
- Chromium E2E uses the real Vite page rather than injected smoke-test HTML and covers the same
  semantic/focus path plus reduced-motion computed styles.
- The Vite production build compiles the Tailwind source and emitted browser assets.
- Desktop and Pixel 5 visual inspection confirmed readable hierarchy, logical wrapping, complete
  controls, and no horizontal clipping.

## Remaining limits

- This foundation is intentionally light-theme-only. A user-selectable theme is not required by
  `WL-106` and must not become a second source of truth.
- Manual screen-reader and Windows forced-colors checks remain part of later feature accessibility
  reviews and the production WCAG gate.
- Router link adaptation, route focus management, form error summaries, and application-shell
  behavior remain owned by their later vertical slices.
