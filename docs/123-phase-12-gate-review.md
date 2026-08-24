# Phase 12 Gate Review: Workflow UX and Product Polish

**Gate task:** `WL-1206` Pass the visual regression, usability, accessibility, and UI release gate.  
**Completed:** 2026-08-25  
**Version advance:** `0.12.0` to `0.13.0`

## Scope and boundary

Phase 12 applies the Quiet Ledger foundation to employee, manager, HR, report, audit, and system
workflows. This gate verifies the resulting route and state system, establishes deterministic
Chromium visual baselines for representative archetypes, and records the remaining manual
assistive technology boundary. It does not change a database, domain rule, authorization contract,
API DTO, dependency, production deployment, or the deferred portfolio site.

## Gate criteria

| Criterion | Status | Evidence |
|---|---|---|
| Canonical routes contain no stale milestone placeholder, sensitive subtype URL, or missing required workflow state | **Pass** | The route inventory and router tests cover all 31 canonical patterns. Requests and approvals remain type neutral, the former sickness route is absent, and both audit audiences have separate implemented projections. |
| Representative employee, manager, HR, and system workflows are keyboard complete and understandable at desktop, mobile, and 320 CSS px reflow | **Pass** | Component and Playwright flows cover route focus, filters, disclosures, forms, dialogs, mutations, calendars, tables, record lists, recovery, and 320, 390, 1024, and 1440 px layouts. |
| Dense tables retain task critical context and actions with an explicit narrow strategy | **Pass** | Independent records become complete labelled lists below 48 rem. Intrinsically two dimensional report, audit, and calendar data remains in named focusable local scroll regions with visible guidance and no page overflow. |
| Loading, empty, stale, success, warning, permission denied, and error behavior uses consistent shared patterns | **Pass** | `WL-1205` completed shared alert, route state, action, focus, announcement, and recovery adoption. The full component and E2E suites retain those state contracts. |
| Automated accessibility, visual regression, and usability checks pass, with manual assistive technology evidence or an explicit residual | **Pass** | Axe, semantic assertions, keyboard and focus flows, forced colors, reduced motion, touch targets, reflow, cross engine smoke, 19 deterministic snapshots, and the explicit `D-502` residual below. |
| Every workspace manifest advances to `0.13.0` | **Pass** | Root plus `apps/api`, `apps/web`, `packages/config`, `packages/contracts`, `packages/database`, `packages/domain`, `packages/test-utils`, and `packages/ui`; `pnpm run phase:check` reports thirteen sequential gates. |

## Visual regression evidence

`pnpm run test:visual` uses Playwright `1.61.1`, deterministic mocked transport, disabled
animations, normalized page scroll, and full page Chromium captures. The stored macOS Chromium
baseline contains 19 snapshots:

- Today at 320, 390, and 1440 px.
- My Time, personal calendar agenda, personal calendar grid, and request detail.
- Approval inbox at 320, 390, and 1440 px plus approval detail at 320 px.
- Team status at 390 and 1024 px plus Team Calendar agenda and grid states.
- Employee administration at 320 and 1440 px plus Technical Audit default and expanded detail
  states at 320 px.

Comparable Phase 11 and Phase 12 Today and Approvals captures were reviewed before the baseline was
accepted. The Phase 12 versions improve task order, warning prominence, narrow record completeness,
and disclosure of supporting detail. The remaining current surfaces were inspected directly.
There were no blocking, major, minor, focus visibility, clipping, page overflow, color only, or
missing action regressions. Local horizontal overflow remains intentional only for intrinsically
two dimensional calendars and audit evidence.

The baselines are operating system specific raster evidence and are not part of the cross engine
CI matrix. They must not be regenerated for a changed image until the change is confirmed as
intentional and keyboard, focus, responsive, contrast, and reduced motion evidence still passes.
The normal `pnpm run test:e2e` suite remains the cross engine behavioral authority.

## Accessibility and usability

Automated evidence covers semantic landmarks and headings, labelled native controls, React Aria
dialogs and drawers, route and result focus, validation summaries, dynamic announcement roles,
keyboard completion, touch targets, 320 px reflow, text wrapping, local overflow containment,
forced colors, reduced motion, and axe checks. Chromium exercises complete flows. Firefox, WebKit,
mobile Chromium, and mobile WebKit exercise the browser matrix smoke route.

Real VoiceOver, NVDA, and TalkBack pairing was not available in this environment. `D-502` is
therefore dispositioned as an explicit residual, not silently presented as a conformance result.
WorkLedger makes no exact retail browser version warranty and no manual screen reader or WCAG
conformance claim from this gate. Real assistive technology pairing remains required before a
public support matrix or conformance statement is published.

## Verification

Before the checkbox and version transition, `pnpm run verify` passed at `0.12.0`:

```text
Runtime configuration and reproducible OpenAPI passed
Formatting, ESLint, 284 file and 1,497 import boundaries, and CSS ownership passed
Strict TypeScript passed
37 tooling tests passed
343 unit and component tests across 44 files passed
13 integration tests passed, with 45 PostgreSQL dependent tests skipped because no test URL was configured
34 Playwright scenarios passed across Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit
Production and workspace build passed
Bundle budget passed at 359,302 largest JavaScript bytes, 886,485 total JavaScript bytes,
239,296 gzip JavaScript bytes, and 46,859 CSS bytes
```

`pnpm run test:visual` then passed all 29 Chromium flows and reproduced all 19 stored snapshots.

After the manifest transition, the managed `pnpm` wrapper attempted an unnecessary dependency
refresh, could not reach registry metadata, and aborted before changing `node_modules`. Direct
local equivalents then confirmed the thirteen gate and nine manifest contract, formatting, ESLint,
source and CSS boundaries, strict TypeScript, 32 focused repository contract tests, runtime
configuration, reproducible OpenAPI, production build, bundle budget, public imports, all 29 visual
flows and 19 snapshots, and `git diff --check` against `0.13.0`. The complete pre transition
`pnpm run verify` remains the authoritative full suite result.

## Security and data

All visual fixtures use deterministic fictional data and mocked purpose limited responses.
Snapshots contain no production data, secret, raw token, sickness detail, opaque internal account
or request identifier, IP address, user agent, or unrestricted technical payload. Type neutral URLs,
separate HR and technical audit audiences, current scope, non self actions, no store responses, and
protected in memory state remain unchanged.

## Accepted residuals and Phase 13 handoff

- `UI-014` is closed through the stored systematic visual baseline and `pnpm run test:visual`.
- `UI-015` is closed through canonical route assertions, implemented request and technical audit
  surfaces, and the new visual gate.
- `D-502` is dispositioned with the explicit real assistive technology and exact retail browser
  residual described above.
- The ignored Phase 11 and Phase 12 review captures remain local evidence. The tracked snapshots
  are the deterministic regression source.
- The temporary Astro backup remains noncanonical. `WL-1300` owns the explicit Phase 13 site
  scaffold or adoption decision.

## Versioning

Completing `WL-1206` is the thirteenth zero indexed phase gate. The internal workspace milestone is
`0.13.0`. It authorizes no commit, tag, package publication, container release, deployment, or
supported browser claim.
