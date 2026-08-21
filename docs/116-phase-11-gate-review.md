# Phase 11 Gate Review — UI Foundation

**Gate task:** `WL-1106` Pass the UI-foundation phase gate.  
**Completed:** 2026-08-21  
**Version advance:** `0.11.0` → `0.12.0`

---

## Scope and boundary

Phase 11 establishes the Quiet Ledger visual/interaction foundation, semantic-token and shared-
component ownership, validated runtime company identity, and the responsive shell/authentication/
route-boundary system. This gate does not implement Phase 12 workflow redesign, alter a database or
authorization contract, publish a package, create a release, or scaffold the deferred Astro site.

## Workspace unblocking and deferred Astro artifact

Before the gate, `apps/site` contained only ignored pre-Phase-13 Astro artifacts and no tracked
file. The complete tree—including its source, generated output, `.astro` data, and dependencies—was
moved intact to:

```text
/private/tmp/workledger-apps-site-phase11-backup.V4AgyX/apps-site
```

The backup exists, `apps/site` is absent, and `pnpm run workspace:check` accepts the intended root
plus eight projects. The backup is recoverable but temporary. It must not be treated as the
canonical site source or copied back as a workspace until `WL-1300` explicitly scaffolds/adopts the
Astro project.

## Gate criteria

| Criterion | Status | Evidence |
|---|---|---|
| Every canonical route/state has an owner, implementation status, and evidence level | **Pass** | `docs/110-ui-ux-baseline-audit.md` route/state inventory and reconciled issue register; `UI-001`, `UI-002`, `UI-007`, `UI-012`, `UI-014`, and `D-502` retain explicit Phase 12 owners. |
| Quiet Ledger supports calm employee and denser manager/admin surfaces without a generic dashboard template | **Pass** | Approved direction and page archetypes in `docs/111-ui-design-direction.md`; reference surfaces below retain task hierarchy, textual states, thin boundaries, and density-specific composition. |
| Semantic tokens/shared components replace undefined and recurring one-off contracts | **Pass** | `docs/112-semantic-tokens-css-contract.md`, `docs/114-shared-ui-patterns.md`, 85 package-owned tokens, 88 defined classes, and the strengthened checker rejecting bare app redefinitions of shared roots. |
| Company identity is source-edit-free and resilient to missing/invalid assets, forced colors, and zoom/reflow | **Pass** | `docs/113-company-identity-runtime-configuration.md`; browser coverage for long names, broken logo/favicon fallback, decorative image semantics, 320 px reflow, print, and forced colors. |
| Shell/authentication/navigation/boundaries pass responsive, keyboard, zoom/reflow, forced-colors, and reduced-motion checks | **Pass** | `docs/115-shell-authentication-route-boundaries.md`; component/axe and Playwright evidence for drawer focus, shared-route area persistence, long identity/text spacing, measured sticky-header offset, session notices, and focused recoverable boundaries. |
| Every workspace manifest advances to `0.12.0` | **Pass** | Root plus `apps/api`, `apps/web`, `packages/config`, `packages/contracts`, `packages/database`, `packages/domain`, `packages/test-utils`, and `packages/ui`; `pnpm run phase:check` reports twelve sequential gates. |

## Gate defect review and resolution

Three concrete foundation defects were closed before versioning:

1. The mobile drawer owned its own current-work-area state and unmounted it on close. The state now
   lives in `ApplicationShell`, follows area-specific routes, persists across shared Reports,
   Profile, and Notifications routes, is shared by desktop/drawer navigation, and falls back safely
   when the authorized area set changes.
2. The app stylesheet's bare `.wl-alert` rule overrode package tone modifiers. The legacy neutral
   adaptation is now explicitly scoped away from info/success/warning/danger modifiers, the
   redundant app `.wl-panel` root was removed, computed browser colors cover all four tones, and
   `css:check` rejects future bare app redefinitions while accepting descendants/modifiers/scoped
   adaptations.
3. Long identity plus logo, enhanced text spacing, scrolling, and `1024×420` reproduced a
   `0.796875px` header/sidebar collision. A `ResizeObserver` now measures the shell header into an
   app-local CSS property; `4.25rem` remains the CSS fallback. The corrected browser regression
   reports no overlap, clipping, inaccessible utilities, or document overflow.

The API also has one root-manifest-derived and validated `WORKLEDGER_VERSION` source. Startup
logging, default server logging, and system diagnostics consume it; the public diagnostics schema
is unchanged and reports `0.12.0` at this gate.

## Reference-surface evidence

| Surface | Evidence retained at the gate |
|---|---|
| Sign-in | Native form/labels, focused error summary and destination heading, identity fallback, pending/result notices, desktop/mobile/320 capture, browser-matrix axe coverage. |
| Today | Current status/action ordering, calculation/timeline semantics, attendance recovery/convergence, 320–1920 responsive loop, forced colors, touch, keyboard, and three captures. Phase 12 still owns hierarchy/copy redesign. |
| Approvals | Canonical URL state, privacy-neutral category, sortable captioned table, keyboard filters/pagination, narrow overflow region, decision error recovery, axe, and three captures. |
| Employees | Keyboard-complete create/invite/assignment flow with connected errors, purpose-minimized mocked employee data, desktop/mobile/320 captures of the Employees administration entry surface, and axe. |
| Operations | Textual healthy/degraded/unavailable status, valid definitions, wrapped safe technical error, system-only context, no page overflow, axe, and desktop/mobile/320 captures. |
| Shell | Combined-role destination presence, one Reports link, preserved Team state after Reports and drawer remount, desktop/mobile transitions, short-height internal scrolling, long identity/logo/text spacing, forced colors, reduced motion, and three captures. |
| Route boundaries | Real initial-loading fallback, focused permission/not-found/unexpected-error headings, safe recovery actions, no restricted/raw dependency detail, axe, and four captures. |

## Ignored capture manifest

The following purpose-minimized Chromium PNGs were regenerated under ignored
`output/playwright/wl1106/`. They are review evidence, not deterministic pixel assertions:

- Sign-in: `sign-in-desktop-1440x900.png`, `sign-in-mobile-390x844.png`,
  `sign-in-reflow-320x900.png`.
- Today: `today-desktop-1440x900.png`, `today-mobile-390x900.png`,
  `today-reflow-320x900.png`.
- Approvals: `approvals-desktop-1440x900.png`, `approvals-mobile-390x844.png`,
  `approvals-reflow-320x900.png`.
- Employees: `employees-desktop-1440x900.png`, `employees-mobile-390x844.png`,
  `employees-reflow-320x900.png`.
- Operations: `operations-desktop-1440x900.png`, `operations-mobile-390x844.png`,
  `operations-reflow-320x900.png`.
- Shell: `shell-short-desktop-1024x420.png`, `shell-drawer-mobile-390x844.png`,
  `shell-drawer-reflow-320x900.png`.
- Boundaries: `route-boundary-loading-desktop-1280x720.png`,
  `route-boundary-permission-desktop-1440x900.png`,
  `route-boundary-not-found-mobile-390x844.png`, and
  `route-boundary-error-reflow-320x900.png`.

Observed result: no capture showed header/sidebar overlap, document-level horizontal overflow,
clipped primary utilities, color-only state, missing recovery action, or exposed restricted/raw
technical detail. Source, semantic tests, and browser assertions remain authoritative.

## Verification

Pre-transition `pnpm verify` passed at eleven gates and version `0.11.0` after correcting the
boundary-count fixture and reducing the private shell-measurement property without raising the CSS
budget:

```text
Runtime configuration and reproducible OpenAPI ✓
Formatting, ESLint, 277-file/1,428-import boundaries, CSS ownership ✓
Strict TypeScript ✓
37 tooling tests ✓
334 unit/component tests across 44 files ✓
13 integration tests; 45 PostgreSQL-dependent skips ✓
31 Playwright scenarios across Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit ✓
Production/workspace build and bundle budget ✓  CSS 49,982 bytes
```

After the checkbox/version transition, `pnpm verify`, `pnpm run phase:check`, and
`git diff --check` were rerun. The phase guard reports twelve sequential completed gates and all
nine manifests at `0.12.0`.

## Accessibility

Automated evidence covers semantic structure, keyboard completion, route/drawer focus,
announcement-role selection, axe, 320 px reflow, text spacing, forced colors, reduced motion,
touch targets, and cross-engine sign-in smoke. Automated checks do not establish a manual screen-
reader conformance claim. `D-502` remains assigned to `WL-1206` for VoiceOver, NVDA, and TalkBack
pairing evidence or explicit disposition.

## Security / data

This gate changes no database schema, domain invariant, authorization rule, session/CSRF contract,
mutation, export, or sensitive DTO. Navigation area is presentation state only and remains bounded
by server-authorized `SelfContext`. Boundary copy remains non-disclosing. Diagnostic versioning
derives only the public internal milestone from the root manifest and adds no schema field.

## Accepted residuals and Phase 12 handoff

- `UI-001`: the incomplete/type-bearing request route contract remains high priority for `WL-1202`.
- `UI-002`: the Technical Audit placeholder remains high priority for `WL-1204`.
- `UI-007` and `UI-012`: the foundation is complete; workflow-by-workflow shared-pattern and state
  adoption remains in `WL-1200`–`WL-1205`.
- `UI-014`: screenshots remain representative; systematic deterministic visual regression belongs
  to `WL-1206`.
- `D-502`: manual VoiceOver/NVDA/TalkBack evidence remains in `WL-1206`.

The next roadmap task is `WL-1200`: redesign Today attendance, calculation hierarchy, warnings,
recovery, and primary clock-action feedback. The temporary Astro backup is not a Phase 12 input;
the public site remains deferred until `WL-1300`.

## Versioning

Completing `WL-1106` is the twelfth zero-indexed phase gate. The internal workspace milestone is
`0.12.0`. It authorizes no commit, tag, package publication, container release, deployment, or
supported-version promise.
