# WL-1100 UI/UX Baseline Audit

**Completed:** 2026-08-21  
**Scope:** Canonical routes, four role contexts, end-to-end workflow families, required interface states, responsive baselines, and a prioritized remediation register.  
**Evidence level:** Source inspection, existing automated tests, and representative Chromium runtime checks with purpose-minimized mocked responses.  
**Conformance statement:** This is a planning audit, not a new WCAG conformance claim. Manual assistive-technology evidence remains open under `D-502`.

---

## 1. Outcome

WorkLedger has a strong accessible foundation: route focus, keyboard-complete primary workflows,
textual status, forced-colors behavior, reduced-motion handling, focusable dense-table regions, and
no page-level horizontal overflow in the representative 320 CSS px checks. The current interface
is operationally credible, especially on Today, Approvals, employee administration, and sign-in.

The audit also found two release-significant workflow gaps that must be resolved before cosmetic
polish can be considered complete:

1. The employee Requests destination remains a stale placeholder, the canonical request-detail
   route is absent, and sickness is encoded in `/requests/sickness` despite the accepted
   type-neutral URL/privacy contract.
2. `/system/audit` remains a stale `WL-1007` placeholder even though the Phase 10 production gate
   records the technical-audit surface as complete.

The remaining findings primarily concern CSS/component ownership, responsive dense-data
discoverability, shell scale, hierarchy, copy density, and state consistency. They are sequenced
across `WL-1101`–`WL-1206`; `WL-1100` intentionally changes no application behavior.

## 2. Audit frame

### In scope

- The canonical route contract in `docs/05-ux-accessibility.md` and the implemented router.
- Employee, manager, HR administrator, and system administrator navigation contexts.
- Authentication, attendance, records, requests, approvals, monthly closure, reporting,
  administration, settings, audit, and technical-operations workflow families.
- Initial loading, background/stale, empty, success, warning, error, permission-denied, not-found,
  offline, pending, locked/read-only, and conflict/recovery states where relevant.
- Desktop (`1440 × 900`), tablet (`1024 × 768`), mobile (`390 × 844`), and reflow
  (`320 × 900`) representative viewports.
- Forced colors, reduced motion, and WCAG text-spacing overrides on representative high-value
  routes.

### Out of scope

- Implementing the registered fixes.
- Claiming every state was executed against PostgreSQL in this task.
- Replacing the Phase 10 security or WCAG evidence registers.
- Manual VoiceOver, NVDA, or TalkBack pairing.
- Changing product/domain rules, authorization, or data contracts.

### Evidence labels

| Label | Meaning |
|---|---|
| Runtime | The route/state was rendered and inspected in Chromium during WL-1100. |
| Automated | Existing Playwright, component, or unit evidence directly covers the behavior. |
| Source | Implementation and semantics were inspected, but the route/state was not executed in this audit. |
| Gap | The canonical behavior is absent, stale, or contradicted by implementation. |

## 3. Role and responsive baseline

| Context | Representative route | Runtime evidence | Result |
|---|---|---|---|
| Public/authentication | `/sign-in` | Desktop and mobile | Calm, clear form hierarchy; route-focus treatment is prominent but usable. |
| Employee | `/today` | Desktop, mobile, 320 px, forced colors, reduced motion | Primary action and status are clear; no page overflow; calculation content becomes repetitive and long on mobile. |
| Manager | `/approvals` | Desktop, mobile, 320 px, text spacing, navigation drawer | Filters and table remain operable; task action is initially off-canvas in the horizontal table with no visible scroll cue. |
| HR administrator | `/employees` | Desktop and mobile | Functional dense surface; employee and team administration compete in one long route. |
| System administrator | `/system/operations` | Desktop, mobile, 320 px | Diagnostics are readable, but undefined styles and invalid definition-list grouping make the route visibly and semantically inconsistent. |
| Maximum-role stress case | `/today`, `/approvals`, `/employees`, `/system/operations` | Desktop/mobile/reflow | No page overflow; desktop navigation becomes an independently scrolling inventory and hides lower groups below the initial viewport. |

Measured checks:

- At 320 CSS px, representative pages had `documentElement.scrollWidth === clientWidth`.
- Approval results measured `928 px` content inside a `278 px` focusable scroll region.
- Employee results measured `768 px` content inside a `291 px` focusable scroll region.
- The visible Today controls measured `42 px` high, exceeding the WCAG 2.2 AA 24 CSS px target
  minimum; this audit does not claim the optional 44 CSS px enhanced target.
- Forced colors preserved Canvas/CanvasText surfaces, explicit borders, and a visible Highlight
  focus indicator. Reduced-motion overrides reduced the inspected transition duration to zero.
- The approvals page retained page-level reflow under the WCAG text-spacing override. Clipping was
  limited to the intentionally two-dimensional, horizontally scrollable table region.

The captured artifact manifest is in
[`output/playwright/wl1100/README.md`](../output/playwright/wl1100/README.md).

## 4. Canonical route inventory

The status below describes the user-facing route contract, not whether its API/domain internals
exist elsewhere.

| Canonical route | Primary audience | Archetype | Implementation/evidence | Follow-up |
|---|---|---|---|---|
| `/sign-in` | Public | Authentication form | Complete; Runtime + Automated | WL-1105 visual refinement |
| `/forgot-password` | Public | Authentication form | Complete; Source + component coverage | WL-1105 |
| `/reset-password` | Public | Authentication form | Complete; Automated | WL-1105 |
| `/activate-account` | Public | Authentication form | Complete; Automated | WL-1105 |
| `/today` | Employee | Task dashboard | Complete; Runtime + Automated | UI-008 / WL-1200 |
| `/my-time` | Employee | Filtered record collection | Complete; Source + component coverage | UI-005, UI-015 / WL-1201 |
| `/time-records/:recordId` | Employee | Record detail/timeline | Complete; Source + component coverage | WL-1201 |
| `/my-balances` | Employee | Summary/ledger collection | Complete; Source + component coverage | WL-1201 |
| `/requests` | Employee | Request history/hub | **Gap: stale Phase 6 placeholder** | UI-001 / WL-1202 |
| `/requests/new` | Employee | Type-neutral workflow chooser/form | **Partial: routes directly to vacation** | UI-001 / WL-1202 |
| `/requests/:requestId` | Employee | Request detail/history | **Gap: route absent** | UI-001 / WL-1202 |
| `/calendar` | Employee | Calendar + agenda | Complete; Source + component coverage | UI-005 / WL-1201 |
| `/monthly-periods/:periodId` | Employee/manager/HR | Dense review/workflow | Complete; Source + component coverage | WL-1202 |
| `/notifications` | Authenticated roles | Event collection | Complete; Automated | WL-1201 |
| `/profile` | Authenticated roles | Account detail/actions | Complete; Automated | WL-1201 |
| `/team` | Manager | Dense status collection | Complete; Source + component coverage | UI-004 / WL-1203 |
| `/approvals` | Manager/HR | Filtered action queue | Complete; Runtime + Automated | UI-004, UI-016 / WL-1203 |
| `/approvals/:approvalId` | Manager/HR | Decision detail | Complete; Automated | WL-1203 |
| `/team-calendar` | Manager/HR | Calendar + agenda | Complete; Automated | WL-1203 |
| `/employees` | HR | Dense administration index | Complete; Runtime + Automated | UI-009, UI-010 / WL-1204 |
| `/employees/new` | HR | Complex administration form | Complete; Automated | WL-1204 |
| `/employees/:employeeId` | HR | Multi-section administration detail | Complete; Automated/component coverage | WL-1204 |
| `/reports` | Employee/manager/HR | Authorized catalog | Complete; Automated | WL-1204 |
| `/reports/:reportKey` | Employee/manager/HR | Filtered dense report | Complete; Automated | UI-004 / WL-1204 |
| `/settings/time` | HR | Versioned configuration | Complete; Automated | WL-1204 |
| `/settings/absence` | HR | Versioned configuration | Complete; component coverage | WL-1204 |
| `/settings/holidays` | HR | Calendar configuration | Complete; component coverage | WL-1204 |
| `/audit` | HR | Filtered audit explorer | Complete; Source + component coverage | UI-004 / WL-1204 |
| `/system/accounts` | System administrator | Technical account administration | Complete; component/e2e workflow coverage | WL-1204 |
| `/system/operations` | System administrator | Technical diagnostics | Functionally present; Automated; WL-1102 semantic/CSS repair complete | WL-1204 visual adoption |
| `/system/audit` | System administrator | Technical audit explorer | **Gap: stale `WL-1007` placeholder** | UI-002 / WL-1204 |
| Root/not-found/route error | Public/authenticated | Route boundary | Complete; Source + component coverage | WL-1105 |

Non-canonical implemented route: `/requests/sickness`. Its subtype-bearing path conflicts with the
explicit rule that sickness and other sensitive absence types never appear in a route value.

## 5. Workflow and state matrix

| Workflow family | Core states found | Evidence strengths | Missing/inconsistent state work |
|---|---|---|---|
| Authentication/recovery | Signed out, validation error, pending, generic failure, reset/activation grant cleanup, signed-in redirect | Route focus, field errors, memory-only grant cleanup, E2E sign-in/reset/activation | Cross-route visual/state consolidation under WL-1105 |
| Attendance | Clocked out/in, on break, pending, success, stale, duplicate/retry, lost response, offline, multi-device refresh, warning/incomplete | Strongest automated coverage; keyboard, touch, forced colors, 320 px | Content hierarchy and repetition (UI-008) |
| Personal records/balances | Week/month, complete/incomplete, warnings, detail, calculation and ledger summaries | Purpose-minimized explanations and component coverage | Bare versus panel loading/error patterns; two overflow wrappers lack shared scroll-region contract (UI-005, UI-015) |
| Requests/absence/corrections | Vacation, sickness, correction, validation, cancellation services and decision internals exist | Individual form/workflow components exist | No complete request hub/history/detail; subtype URL leaks workflow category (UI-001) |
| Manager approvals | Filtered/unfiltered, empty, pending, decision validation, stale/version conflict, pagination, detail comparison | Keyboard and E2E evidence; type-neutral queue URLs | Narrow-screen table action/context discoverability; default clear-filter prominence (UI-004, UI-016) |
| Calendars | Month navigation, grid, agenda, empty, loading, error | Team calendar narrow default is agenda; text alternative exists | Personal month grid defaults at narrow width and lacks the shared focusable scroll-region wrapper (UI-005) |
| Monthly closure | Draft, blocked, submitted, changes requested, approved, locked, post-lock adjustment, print/copy failure | Detailed state/component and domain evidence | Visual hierarchy and cross-route consistency under WL-1202 |
| Reports | Catalog, filters, pagination, empty, CSV pending/success/error, print/copy | Authorized catalog, URL state, narrow table containment, E2E | Shared dense-table and route-state patterns (UI-004, UI-015) |
| HR administration/settings | Loading, empty, filtered, create/invite, validation, effective-dated versions, constrained deactivate | Realistic complex forms and E2E | Employee/team task collision and unexplained disabled action (UI-009, UI-010) |
| Domain audit | Filters, empty/results, safe detail, pagination | Purpose-minimized source/component evidence | Shared dense table/filter states under WL-1204 |
| System operations/audit | Diagnostics loading/healthy/degraded/error; account/session actions | Runtime diagnostics, valid Operations definition lists/statuses, CSS-contract and component/axe evidence | Technical Audit remains a placeholder (UI-002) |
| Shared shell/boundaries | Role navigation, drawer, route focus/title, permission denied, not found, session expiry | Focus-managed drawer, reduced motion, skip link, route boundaries | Navigation scale and visual treatment (UI-006, UI-007) |

## 6. Prioritized issue register

Severity is impact-based: **High** blocks a required or privacy-safe workflow; **Medium** materially
impairs comprehension, consistency, accessibility robustness, or task efficiency; **Low** is a
bounded polish issue. “Confirmed” means direct source/runtime evidence; “risk” means the issue
requires broader route verification during its owning task.

| ID | Severity | Finding | Status / confidence | Primary owner |
|---|---|---|---|---|
| UI-001 | High | Requests route contract is incomplete and exposes sickness in a subtype-bearing path | Confirmed / high | WL-1202 |
| UI-002 | High | Technical Audit is still a milestone placeholder after its delivery/release gate | Confirmed / high | WL-1204 |
| UI-003 | Medium | System technical routes use undefined styles and invalid definition-list grouping | **Resolved by WL-1102** / high | WL-1204 visual adoption |
| UI-004 | Medium | Dense table actions and later columns are not visually discoverable at narrow width | Confirmed / high | WL-1104, WL-1203, WL-1204 |
| UI-005 | Medium | Horizontal-record and calendar responsive contracts are inconsistent | Confirmed / high | WL-1104, WL-1201 |
| UI-006 | Medium | The shell navigation does not scale cleanly for combined-role or long HR inventories | Confirmed / medium | WL-1105 |
| UI-007 | Medium | Repeated route primitives remain hand-built instead of governed by the local UI system | CSS ownership resolved; component adoption pending / high | WL-1104 |
| UI-008 | Medium | Today repeats the same calculation meaning across labels, values, and narrative formulas | Confirmed / high | WL-1200 |
| UI-009 | Medium | Employee directory and team management compete in one long administration route | Confirmed / medium | WL-1204 |
| UI-010 | Medium | Disabled team deactivation has no adjacent explanation or recovery path | Confirmed / medium | WL-1204 |
| UI-011 | Medium | Organization identity is hard-coded rather than validated runtime configuration | Confirmed / high | WL-1103 |
| UI-012 | Medium | Route loading, empty, warning, and error presentation lacks a shared visual/semantic contract | Confirmed / high | WL-1104, WL-1205 |
| UI-013 | Medium | Task pages often surface implementation/privacy guarantees as primary explanatory copy | Confirmed / medium | WL-1101, WL-1205 |
| UI-014 | Medium | Visual regression and route-state baseline coverage is representative, not systematic | Confirmed / high | WL-1206 |
| UI-015 | Medium | Existing test coverage did not prevent completed-phase placeholders and route-contract drift | Confirmed / high | WL-1202, WL-1204, WL-1206 |
| UI-016 | Low | Approvals presents “Clear approval filters” as a persistent peer action even at defaults | Confirmed / medium | WL-1203 |

## 7. Detailed high-impact findings

### UI-001 — Requests route contract is incomplete and privacy-inconsistent

- **Severity:** High
- **Status/confidence:** Confirmed / high
- **Evidence:** `apps/web/src/app/router.tsx` maps `/requests` to `PlaceholderPage`, maps
  `/requests/new` directly to `VacationRequestPage`, exposes `/requests/sickness`, and defines no
  `/requests/:requestId`. `docs/05-ux-accessibility.md` requires a complete type-neutral hub,
  chooser, and detail route, and explicitly forbids sickness in route values.
- **Affected users/tasks:** Employees reviewing request history, submitting non-vacation work,
  understanding status/history, or cancelling/withdrawing eligible requests.
- **Risk:** A required workflow is fragmented and sickness classification can enter browser
  history, copied URLs, proxy/log metadata, and referrer surfaces. This contradicts the established
  purpose-minimization contract even if the route contains no diagnosis or reason.
- **Standards/principles:** Repository privacy contract; Nielsen match with the real world,
  consistency, visibility of system status, and user control.
- **Remediation direction:** Restore one type-neutral request hub, chooser, and authorized detail
  route. Derive workflow presentation from the authorized response, not a subtype URL. Preserve
  original/corrected history and expose only state-valid actions.
- **Validation:** Route inventory has no subtype path; browser history and network URLs remain
  neutral; owner/non-owner permission tests; history/cancellation/correction state coverage;
  keyboard, error-summary, reflow, and session-expiry tests.
- **Owner:** `WL-1202` with security/privacy regression evidence at `WL-1206`.

### UI-002 — Technical Audit remains a completed-milestone placeholder

- **Severity:** High
- **Status/confidence:** Confirmed / high
- **Evidence:** `apps/web/src/routes/system-audit-page.tsx` describes itself as a placeholder,
  promises implementation in `WL-1007`, and presents no search/results states. The task board and
  Phase 10 gate mark `WL-1006`, `WL-1007`, and the production gate complete; the canonical route
  contract requires limited technical/security audit search.
- **Affected users/tasks:** System administrators investigating authentication, session, security,
  and technical events.
- **Risk:** The interface claims a production milestone that the route does not deliver. Important
  recovery/audit work cannot be performed from the product surface.
- **Standards/principles:** Nielsen visibility of system status, match with expectations, and help
  users diagnose/recover; project operations contract.
- **Remediation direction:** Implement the bounded technical audit explorer against the existing
  role-separated metadata contract, or explicitly remove/defer the product claim and navigation
  until a new accepted decision authorizes that scope change.
- **Validation:** Loading, empty, results, filters, pagination, safe detail, permission denial,
  dependency error, hostile-text, and narrow-table tests; confirm no domain/HR payload enters the
  DTO or interface.
- **Owner:** `WL-1204`; regression gate `WL-1206`.

### UI-003 — System routes bypass the styling and semantic contracts

- **Severity:** Medium
- **Status/confidence:** Resolved by `WL-1102` / high
- **Evidence:** `/system/operations` and `/system/audit` use `wl-card` and `text-secondary`, neither
  of which is defined in the app or UI stylesheet. Operations renders `dt`/`dd` pairs inside plain
  `div` elements without a containing `dl`; runtime inspection confirmed all nine `dt` elements
  lacked a definition-list parent. The route also includes `dark:` utilities while the token layer
  declares `color-scheme: light` only.
- **Affected users/tasks:** System administrators scanning health, dependency failures, and
  recovery guidance; assistive-technology users relying on relationships.
- **Risk:** Technical pages look detached from the rest of the product, secondary text is not
  secondary, and name/value semantics are invalid. This is a credible WCAG 1.3.1 relationship
  failure on the inspected markup.
- **Remediation direction:** Move surfaces, secondary text, definition lists, technical errors, and
  health statuses into governed semantic tokens/components. Use valid `dl` grouping and one
  supported color-mode contract.
- **Validation:** CSS-contract check rejects unknown WorkLedger classes; DOM/axe semantics;
  healthy/degraded/critical/error screenshots in normal and forced colors; 320 px/text-spacing
  checks.
- **Resolution evidence:** `docs/112-semantic-tokens-css-contract.md` owns the token/CSS boundary;
  Operations now groups every term/definition in `dl`, uses text-labelled semantic status families,
  wraps safe technical errors, and has focused component/axe regression evidence. WL-1204 may
  improve the route's compact visual hierarchy without reopening the resolved semantic contract.
- **Owner:** Resolved in `WL-1102`; later visual adoption in `WL-1204`.

### UI-004 — Narrow dense tables hide task-critical context and actions

- **Severity:** Medium
- **Status/confidence:** Confirmed / high
- **Evidence:** The 320 px Approval table is `928 px` wide in a `278 px` scroll region; the Action,
  affected-date, submitted, and team columns start off-canvas. Employee administration similarly
  exposes only the earliest columns initially. The regions are keyboard focusable, retain page
  reflow, and therefore are not recorded as a WCAG 1.4.10 failure; the issue is discoverability and
  task efficiency.
- **Affected users/tasks:** Managers making time-sensitive decisions and HR users finding account,
  role, or employment status on small screens or at high zoom.
- **Risk:** Users may not realize more context/actions exist or must repeatedly pan while losing row
  identity.
- **Remediation direction:** Define table archetypes. Preserve true tables where two-dimensional
  comparison is essential, but add an explicit scroll cue/instruction, sticky identity/action
  columns where safe, or a deliberate compact/card alternative for action queues. Do not duplicate
  conflicting DOM state.
- **Validation:** Keyboard and touch horizontal navigation, 320 px/400% zoom, text spacing, screen
  reader table navigation, long localized-like content, and no obscured sticky content.
- **Owner:** Shared contract in `WL-1104`; adoption in `WL-1203` and `WL-1204`.

### UI-005 — Responsive overflow and calendar behavior are inconsistent

- **Severity:** Medium
- **Status/confidence:** Confirmed / high
- **Evidence:** Nine inspected dense table wrappers use an explicitly named, focusable scroll region;
  `/my-time` and the personal calendar month grid use plain overflow wrappers. The personal
  calendar has an equivalent agenda but defaults to the wide month grid on narrow screens, unlike
  the team calendar's established narrow-screen agenda behavior.
- **Risk:** Keyboard and screen-reader expectations vary by route, and a small-screen user receives
  the least compact calendar representation first.
- **Remediation direction:** Establish one shared overflow-region/table contract and one calendar
  view-selection rule. Preserve user choice in URL or non-sensitive display preference only when
  justified.
- **Validation:** Keyboard focus/scroll, announcement/name, narrow default, agenda equivalence,
  month changes, 320 px, text spacing, and forced colors.
- **Owner:** `WL-1104`, `WL-1201`.

### UI-006 — Shell navigation scale depends on an internal scroll inventory

- **Severity:** Medium
- **Status/confidence:** Confirmed / medium
- **Evidence:** The maximum-role desktop baseline requires independent sidebar scrolling and places
  lower system destinations outside the initial viewport. HR also has a long navigation set; the
  mobile drawer remains focus-managed and usable.
- **Risk:** Less-frequent routes and account actions are easy to miss, and role grouping competes
  with the current task for attention.
- **Remediation direction:** Use the approved information hierarchy to separate primary work,
  administration, and account/technical utilities while keeping destinations stable and visible
  by role. Do not hide access behind hover or create permission ambiguity.
- **Validation:** Every realistic single/combined role set, short/tall viewports, keyboard traversal,
  active-route orientation, drawer focus restoration, zoom, and session-expiry flows.
- **Owner:** `WL-1105`.

### UI-007 — Recurring UI patterns have no enforceable shared owner

- **Severity:** Medium
- **Status/confidence:** CSS ownership resolved; component adoption pending / high
- **Evidence:** The local UI package currently owns a small foundation while routes repeatedly
  hand-build panels, alerts, statuses, filters, pagination, dense tables, loading states, and error
  presentation. App CSS adds a second token subset, and undefined route classes reached production
  gate code.
- **Risk:** Visual and accessibility corrections must be repeated route by route, making drift and
  regression likely.
- **Remediation direction:** In `WL-1102`, define token tiers and CSS ownership. In `WL-1104`, add
  shared patterns only where two or more real call sites justify them; preserve route-specific
  business composition outside the UI package.
- **Validation:** Executable unknown-class/token checks, component state matrices, forced-colors and
  reduced-motion tests, and migration of representative employee/manager/admin call sites.
- **Owner:** `WL-1102`, `WL-1104`.

### UI-008 — Today explanation becomes repetitive on small screens

- **Severity:** Medium
- **Status/confidence:** Confirmed / high
- **Evidence:** Desktop and mobile baselines show each calculation group presenting label/value
  rows plus a full narrative formula that repeats the same terms. At mobile width the calculation
  explanation dominates the route after the primary clock task.
- **Risk:** Users must scan more text to understand the one result that matters, and warning/recovery
  information can be pushed far below the current action.
- **Remediation direction:** Preserve complete explainability while introducing a progressive
  hierarchy: current status/action, today's result and warning, concise formula, then optional
  detail/history. Do not gamify positive balances or hide negative/incomplete states.
- **Validation:** Clocked-out/in/break/complete/incomplete/warning/zero-expected states at supported
  widths, comprehension review, focus order, screen-reader reading order, and no information loss.
- **Owner:** `WL-1200`.

## 8. Cross-cutting directions for the next tasks

### WL-1101 — Visual and interaction direction

- Define calm employee and denser manager/admin page archetypes.
- Set a visible task hierarchy for primary action, status, warning/recovery, supporting detail, and
  audit explanation.
- Define when tables, lists, calendars, definition lists, panels, and progressive disclosure are
  appropriate.
- Separate user task copy from implementation assurances without weakening privacy or domain
  transparency.

### WL-1102 — Tokens and CSS ownership

- Inventory primitive, semantic, component, and state tokens.
- Eliminate undefined `wl-card`/`text-secondary` and the split state-token ownership.
- Decide and enforce the supported color-mode contract; do not retain inert `dark:` branches.
- Add an executable rule for undefined WorkLedger classes/tokens and document the escape hatch.

### WL-1103 — Company identity

- Configure organization display name, optional logo, favicon, and bounded accent through validated
  runtime configuration.
- Provide text and asset fallbacks; never use a logo as the only accessible name.
- Reject unsafe asset types/locations and accents that fail required contrast states.

### WL-1104 — Local UI system

- Add shared components for the repeated patterns proven by this inventory.
- Include complete state matrices for actions, fields/errors, panels, statuses, alerts, dense table
  regions, filters, pagination, and route states.
- Preserve semantic HTML and React Aria behavior rather than wrapping native patterns without need.

### WL-1105 — Shell/auth/boundaries

- Resolve navigation scale and role grouping.
- Retain real links, focus-managed drawer/dialog behavior, route-title/focus behavior, skip link,
  and permission-safe destinations.
- Align loading, not-found, permission-denied, session-expiry, and unexpected-error boundaries.

### WL-1200–WL-1206 — Workflow adoption and gate

- Fix UI-001 and UI-002 before describing the interface as product-polished.
- Apply shared patterns by workflow family instead of doing an unbounded global rewrite.
- Maintain representative screenshots, then add deterministic visual assertions only after the
  direction and tokens stabilize.
- Complete or explicitly disposition the manual AT matrix `D-502` at `WL-1206`.

## 9. Strengths to preserve

- Route changes deliberately move focus and update titles.
- Actions and navigation use real buttons/links with visible keyboard focus.
- Attendance handles retries, duplicate actions, offline behavior, stale tabs, and meaningful live
  results without announcing the timer every second.
- Statuses use text in addition to color.
- Forced colors and reduced motion are explicitly handled.
- Dense table regions are generally named and keyboard focusable.
- Team calendar provides an equivalent agenda and defaults to it on narrow screens.
- Error summaries and linked field errors exist on complex decision/administration forms.
- Approval and report URL filters are bounded and purpose-minimized.
- System authority remains visually and contractually separated from HR/domain authority.

## 10. Completion boundary

`WL-1100` is complete when this inventory, the artifact manifest, roadmap reconciliation, and issue
ownership are recorded. It does not close any UI finding. The next task is `WL-1101`: define and
approve the visual direction, hierarchy, density rules, page archetypes, and interaction principles
using this evidence.

## 11. Verification record

- `pnpm exec prettier --check <changed files>` — passed.
- `pnpm exec eslint . --max-warnings 0` and `node scripts/check-boundaries.mjs` — passed; 266
  source files and 1,380 imports checked.
- `pnpm exec tsc --build --pretty false --force` — passed.
- Tooling scripts — 32 passed, including the reconciled phase-gate sequence.
- Unit/component suite — 323 passed across 44 files.
- Integration suite — 12 passed, 45 database-dependent tests skipped because PostgreSQL was not
  configured.
- Playwright suite — 25 passed across Chromium plus Firefox, WebKit, mobile Chromium, and mobile
  WebKit smoke projects.
- Direct production web build and bundle budget — passed; largest JavaScript asset 357,836 bytes,
  total JavaScript 834,439 bytes, total gzip JavaScript 223,297 bytes, CSS 35,291 bytes.
- Actual canonical phase state — 11 completed gates, all eight accepted workspace manifests at
  `0.11.0`.

The canonical `pnpm format:check` stops before formatting at `workspace:check` because a pre-existing
ignored `apps/site/dist/index.html` creates an unexpected `apps/site` directory without a
`package.json`. The artifact is outside WL-1100 scope and was preserved. Direct equivalents above
passed; repository-wide wrapper commands remain blocked until that ignored artifact is removed or
the portfolio task legitimately adds `apps/site`.
