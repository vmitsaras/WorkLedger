# WL-1312 cross-route regression, accessibility, and usability gate

**Date:** 2026-08-26  
**Scope:** Authenticated Today, My time, Approval inbox, approval detail, Team status, Employees,
Teams, shared route states, and the application shell  
**Outcome:** The bounded Phase 13 cross-route gate passes with no open P0 or P1 UX defect. A new
19-image macOS Chromium baseline replaces the Phase 12 baseline as the current `pnpm test:visual`
comparison target. Historical Phase 12 and task-specific Phase 13 images remain unchanged.

## 1. Gate boundary

`WL-1312` verifies the cumulative UI delivered by `WL-1301` through `WL-1311`. It does not change a
domain rule, workflow state, permission, API contract, database query, or security boundary. The
gate checks that the current implementation remains deterministic and that its visible hierarchy,
responsive behavior, focus behavior, status semantics, recovery states, and private-data boundary
remain consistent across representative employee, manager, and HR surfaces.

This is a bounded product audit, not a whole-product WCAG conformance statement. Automated axe,
DOM assertions, keyboard automation, screenshot review, and the prior bounded Today VoiceOver pass
remain distinct evidence. The broader exact retail assistive-technology matrix remains `D-502`.

## 2. Deterministic story and state matrix

| Family | States and transitions covered | Primary evidence |
| --- | --- | --- |
| Application entry | Initial session check, authenticated landing, sign-in recovery, session expiry, and current-session revocation | `application-shell.spec.ts`; `application-shell.component.test.tsx` |
| Shared route boundaries | Top-level dependency failure, retry, permission denial, not found, route dependency error, focused heading, and purpose-minimized copy | `application-shell.spec.ts` route-boundary scenarios |
| Today attendance | Off work, working, on break, pending action, success, active-break confirmation, duplicate retry, stale revision, lost response, offline refusal, reconnect, other-device refresh, permission loss, session expiry, dependency failure, incomplete calculation, attention, timeline, and correction evidence | `application-shell.spec.ts`; `application-shell.component.test.tsx`; `today-attention.component.test.tsx` |
| Approval inbox | Needs-review default, waiting-on-employee view, complete/empty results, expanded secondary filters, URL restoration, pagination, narrow record list, wide table, permission loss, and session expiry | `application-shell.spec.ts`; `approval-inbox.component.test.tsx` |
| Approval detail | Validation error summary, decision reason, keyboard progression, forced colors, reduced motion, successful decision, state-valid action removal, and local table overflow | `application-shell.spec.ts`; `approval-detail.component.test.tsx` |
| Team status | All availability filters, open-record filter, privacy-safe current availability, actionable and no-action rows, narrow list, wide table, empty results, dependency recovery, URL rejection, and history restoration | `application-shell.spec.ts`; `team-status.component.test.tsx` |
| Personal records | Weekly time records, complete and incomplete rows, posted/projected balance separation, agenda-first calendar, deliberate grid selection, and local calendar overflow | `application-shell.spec.ts`; application-shell component coverage |
| Employee administration | Private-body search, generic URL state, narrow complete record, wide comparison table, explicit open-record action, pagination, and separate Teams navigation | `application-shell.spec.ts`; `administration.component.test.tsx` |
| Team administration | Create form, active/inactive filter, disabled deactivation with explanation, narrow complete record, wide comparison table, and preserved assignment-history copy | `application-shell.spec.ts`; administration component and API integration coverage |
| Shared presentation | Canonical destination labels, exhaustive workflow-status presentation, shrink-wrapped route focus, responsive panel density, and fit/overflow/fit table semantics | `presentation.unit.test.ts`; `ui-primitives.component.test.tsx`; `application-shell.spec.ts` |

The browser scenarios assert route focus, keyboard operation, URL state, current permission-safe
copy, responsive list/table switching, 44-by-44-pixel action targets where applicable, no page-level
horizontal overflow, and axe results at representative widths. Component coverage owns states that
would be noisy or misleading as static screenshots, including loading, empty, stale, permission,
session-expiry, and dependency-error variations.

## 3. Current screenshot suite

`pnpm test:visual` now enables `WORKLEDGER_ASSERT_PHASE_13_VISUALS=1` and runs the complete Chromium
application-shell scenario set. The existing task-specific environment switches still reproduce
their historical `WL-1307` through `WL-1310` evidence. The new switch writes or compares only
`phase-13/wl1312`, so earlier evidence is never silently re-baselined.

| Surface | Requested viewports | Images | Review purpose |
| --- | --- | ---: | --- |
| Today | 1440×900, 1024×720, 768×1024, 390×844, 320×568 | 5 | Task order, first action, coherent arithmetic, responsive hierarchy, timeline, and calculation disclosure |
| Approval inbox | 1440×900, 768×1024, 390×844, 320×900 | 4 | Triage-first hierarchy, list/table switch, primary review action, filters, and pagination |
| Approval detail | 320×900 | 1 | Decision outcome, status presentation, restricted detail, and local overflow |
| Team status | 1440×900, 768×1024, 390×844, 320×900 | 4 | Availability filters, complete records, next actions, density, and privacy-safe labels |
| My time | 390×900 | 1 | Focus treatment, balance hierarchy, warning, complete/incomplete records, and ledger evidence |
| Employees | 1440×900, 320×900 | 2 | Private search, explicit record action, responsive list/table presentation, and route separation |
| Teams | 1440×900, 320×900 | 2 | Creation hierarchy, filter, lifecycle explanation, responsive list/table presentation, and disabled action |

All images use mocked same-origin transport, fixed fixture values, local assets, disabled screenshot
animations, explicit viewport sizes, and full-page capture. The comparison run reproduced all 19
files after the update run.

### Snapshot manifest

| Image | Rendered size | SHA-256 |
| --- | ---: | --- |
| `approval-detail-mobile-320x900` | 320×1398 | `842a9b5ac7553fa14a9279f7aa0e2335d43971471285ee6d2168876ec5923fd7` |
| `approval-inbox-1440x900` | 1440×900 | `6290b4a20c906cb49009445d70446858a48fe393aefab9992dee7ebb9cbefb09` |
| `approval-inbox-320x900` | 320×1052 | `fac9b94977cdcd2db764ea721727471a6f80194b048bef3d4a38ed50d7fe7147` |
| `approval-inbox-390x844` | 390×1052 | `6b2d4b4b5c1f9efff7d676e505ac0843bd908f769035f63e4e558d5fa1ae37c8` |
| `approval-inbox-768x1024` | 768×1024 | `05ea20e90e1dd431cbfdbd25ea57b8056b3090880add578a790fbd583522d277` |
| `employees-1440x900` | 1440×900 | `eab0e5383b301a98f3a77232ca33fea649d559c0e9943c7c6303e9be27c36278` |
| `employees-320x900` | 320×1270 | `308290ac4eb567913513af40767e1a6e9113a9b7844c05326f0f6cd5255d8e25` |
| `my-time-mobile-390x900` | 390×2097 | `20f43808cdfc114f356b9dec8d26f177d0d413644ce4747b5d1c005e29b32dde` |
| `team-status-1440x900` | 1440×1099 | `952a02dfc67345324533fcad33b798c842c6878c02e7e140a634be8e3f062abc` |
| `team-status-320x900` | 320×2101 | `7b58b34bf97206f80a1f1d87e47e23205017f9b148fb7275ec1da05fe1d1b2fd` |
| `team-status-390x844` | 390×2010 | `c3d41c380079dda8e26658b11df6b9e803f191b171bbee348c555f9cbb7fe512` |
| `team-status-768x1024` | 768×1748 | `39586369b11e93d6bc2aa9f2c330f99e3e2f0563940c95d4a1d73e5fda2723b5` |
| `teams-1440x900` | 1440×1206 | `a515b9978e97c4002d70e2be5625ebca3b7088cae53181022facc5c7ece97219` |
| `teams-320x900` | 320×1534 | `18b76f6438aa1fc037892b35f40a17582608cc867abcbca307c55020fa1d969f` |
| `today-gate-1024x720` | 1024×2100 | `ba4545b4785d0f6aec98c81bd8eb96f2d265c9be1ec57416816a6ddf93c43859` |
| `today-gate-1440x900` | 1440×1700 | `2dcc4f056e0a34e63857f641da823287114f530453c06d61c1046c49df7f847b` |
| `today-gate-320x568` | 320×3468 | `c463a881b6e4dda033bfca6ab8c41487a8198cbb236510d1876f8d80463908b4` |
| `today-gate-390x844` | 390×2944 | `80ae57a6733043023f1aaa9e0df111b20e4e7a9e00cc18db69224fcf9b749537` |
| `today-gate-768x1024` | 768×2046 | `3d8e3f4f929876f1521e076688940d9d48293703a9910033acef4df0ef993d29` |

## 4. Historical-drift disposition

The preserved Phase 12 command reported four differences before this task. Each baseline/current/
diff triplet was inspected at original resolution before the new baseline was written.

| Historical pair | Verdict | Evidence and disposition |
| --- | --- | --- |
| Approval detail at 320 | Improved | Shared status casing, panel density, and task-first no-action copy reduced height while retaining the restricted detail and named local scroll region. |
| Today at 320 | Improved | The cumulative Phase 13 hierarchy replaced the misleading provisional-debt presentation with current interval, progress, posted balance, auditable timeline, and calculation evidence. The dedicated `WL-1307` gate already closed its P1 responsive finding. |
| My time at 390 | Acceptable | The visible change is the deliberately shrink-wrapped route-heading focus treatment from `WL-1311`; content and responsive record hierarchy remain stable. |
| Employees at 320 | Improved | Task-first copy, private-body search, explicit row action, and the separate Teams destination replace the combined Phase 12 administration surface. |

The later task-specific Phase 13 images also differ where `WL-1311` normalized destination copy,
responsive panel density, and route focus. Those changes were likewise inspected and are now
represented by the `WL-1312` current suite rather than rewriting their historical evidence.

## 5. Accessibility and usability audit

### Automated and interaction evidence

- Axe reports no detected violations in the representative Today, Approval inbox, approval detail,
  Team status, My time, Employees, Teams, route-boundary, authentication, and administration flows.
- Keyboard scenarios cover sign-in, clock actions, active-break confirmation, approval validation
  and decision, filter disclosures, pagination, navigation drawer focus, error recovery, and form
  error summaries.
- Route changes focus the destination `h1`; successful workflow transitions focus their status or
  confirmation summary when appropriate. The focused heading outline shrink-wraps the heading text.
- The Today gate covers ten responsive widths, 200%-zoom-equivalent reflow, landscape reflow, WCAG
  text-spacing overrides, reduced motion, forced colors, and touch input. Its 320×568 check keeps
  the first valid attendance action in the initial viewport.
- Statuses retain visible text, marker, and border; the state is not conveyed through color alone.
- Native table wrappers expose a named keyboard-scrollable region and instructions only when
  measured horizontal overflow exists. Narrow record-list alternatives preserve complete row
  context where the page design intentionally avoids table panning.

### Manual image and task review

All 19 current images were reviewed at original resolution for hierarchy, impossible or
contradictory values, clipping, primary-action visibility, density, focus visibility, status cues,
and private information. No page-level horizontal clipping, hidden task-critical action, input-like
full-width heading focus, color-only workflow state, or misleading current-day debt presentation
was found. Today values reconcile to its one fixed snapshot. Approval, Team, Employees, and Teams
retain the same complete record facts across their list and table modes.

The screenshots contain only fictional test identities and purpose-appropriate fixture data. The
generic approval inbox and Team status images contain no sickness classification, reason, note,
entitlement detail, request identifier, or employee identifier in URL state. The approval-detail
image shows its authorized vacation detail only on the restricted type-neutral record route.

### Manual assistive-technology limit

`WL-1307` already records bounded VoiceOver behavior for the revised Today flow in Chrome for
Testing and Safari. `WL-1312` did not repeat a whole-product screen-reader matrix and therefore does
not claim one. Exact browser/screen-reader/version expansion remains the documented `D-502`
residual, not an open P0 or P1 defect in this bounded gate.

## 6. Verification

The targeted visual workflow used Node `24.18.0`, pnpm `11.20.0`, Playwright `1.61.1`, and the
repository's installed macOS Chromium build.

```text
pnpm test:visual --update-snapshots
  33 passed, 1 opt-in historical capture skipped; 19 WL-1312 images written

pnpm test:visual
  33 passed, 1 opt-in historical capture skipped; all 19 images reproduced
```

The complete repository verification result is recorded in `PROJECT_STATUS.md` with this task's
completion entry.

## 7. Gate decision and remaining boundary

`WL-1312` passes. There is no open P0 or P1 UX defect in the bounded cross-route audit. The current
visual suite is deterministic, and the historical baselines remain available for audit rather than
being overwritten.

`WL-1313` owns the final Phase 13 release checklist, documentation/release-note reconciliation,
workspace version transition to `0.14.0`, and clean-CI decision. It must continue to distinguish the
bounded evidence above from a whole-product assistive-technology conformance claim.
