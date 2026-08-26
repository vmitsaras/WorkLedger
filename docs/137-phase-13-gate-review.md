# Phase 13 Gate Review: Attendance Clarity and Operational Trust

**Gate task:** `WL-1313` Pass the Phase 13 release gate.  
**Completed:** 2026-08-26  
**Version advance:** `0.13.0` to `0.14.0`  
**Outcome:** Pass. All 14 Phase 13 tasks are complete, the current available repository and visual
gates are green, and no P0 or P1 UX defect remains open in the bounded Phase 13 audit.

## Scope and boundary

Phase 13 establishes one authoritative Today display contract, rebuilds the attendance hierarchy
and recovery experience, improves Approval inbox, Team status, Employees, and Teams, normalizes
cross-route presentation, and promotes the cumulative UI to a deterministic 19-image comparison
suite.

This gate reconciles completed evidence and advances the internal workspace version. It does not
change a domain calculation, attendance transition, permission, privacy rule, API contract,
database query or schema, migration, dependency, lockfile, deployment, or publication state. The
portfolio presentation work remains an unnumbered draft.

## Signed release checklist

| Criterion | Status | Evidence |
| --- | --- | --- |
| Today values share one coherent server snapshot and reconcile | **Pass** | `docs/125-today-authoritative-display-contract.md` fixes the capture, calculation, attendance revision, and posted-through boundaries; selector, contract, unit, integration, and browser evidence remains green. |
| A first-time employee can identify state, start, worked time, remaining time, next action, and real problems in the primary view | **Pass** | `docs/126-today-information-architecture-visual-hierarchy.md` and `docs/131-today-responsive-accessibility-usability-visual-gate.md` record the stable status, action, progress, balance, and attention task order at 1440 through 320 CSS pixels. |
| An in-progress day is not shown as posted flexible-time debt | **Pass** | `docs/128-today-metric-hierarchy.md` separates the neutral provisional result from dated posted ledger evidence and tests overtime and incomplete states. |
| Posted flexible time is dated and separated from current progress | **Pass** | The Today display contract provides an explicit posted-through date or no-entry state, and the responsive hierarchy preserves the separate semantic zone. |
| Every emitted attention item is actionable, dated where relevant, and classifies submission effect | **Pass** | `docs/130-today-actionable-attention-recovery.md` records the server-owned metadata, compatible recovery actions, correction handoff, focus, and failure behavior. |
| Clock actions cover duplicate, stale, network-loss, two-tab/device, and session-expiry behavior | **Pass** | `docs/127-today-attendance-state-feedback-recovery.md`, integration tests, component tests, and Playwright cover the full state and recovery matrix without optimistic attendance claims. |
| Today passes keyboard, bounded screen-reader, zoom/reflow, forced-colors, reduced-motion, and mobile checks | **Pass** | `WL-1307` records keyboard and axe automation, 200%-equivalent and 320-pixel reflow, text spacing, touch, forced colors, reduced motion, and bounded VoiceOver checks in Chrome for Testing and Safari. |
| Approval inbox defaults to actionable work and keeps secondary filters subordinate | **Pass** | `docs/132-approval-inbox-triage.md` records the needs-review default, compact Queue view, responsive complete records, URL restoration, and permission/privacy regressions. |
| Team and administration records expose clear next actions on narrow screens | **Pass** | `docs/133-team-status-workspace.md` and `docs/134-employee-team-administration.md` record actionable complete list records, wide tables, private search, route separation, and 320-pixel evidence. |
| Horizontal-scroll guidance and keyboard stops exist only for measured overflow | **Pass** | `docs/135-cross-route-presentation-normalization.md` records fit → overflow → fit component evidence and responsive browser assertions. |
| Automated and manual visual, usability, accessibility, and regression gates pass | **Pass** | `docs/136-cross-route-regression-accessibility-usability-gate.md` records the story/state matrix, 19-image manifest, axe/keyboard/focus/reflow evidence, manual original-resolution review, and no open P0/P1 defect. |
| Project memory, release evidence, and current screenshots are reconciled | **Pass** | `PROJECT_STATUS.md`, `TODO.md`, `docs/07-roadmap.md`, `docs/08-task-board.md`, this release summary, and the README documentation map are current. The `WL-1312` screenshots remain the current suite; historical images were not rewritten. |
| Every workspace manifest advances only after the preceding tasks pass | **Pass** | Root plus `apps/api`, `apps/web`, `packages/config`, `packages/contracts`, `packages/database`, `packages/domain`, `packages/test-utils`, and `packages/ui` are `0.14.0`; the phase guard confirms 14 sequential gates. |

## Verification

The pre-transition quality sequence used the repository-managed Node `24.18.0`, pnpm `11.20.0`,
and Playwright `1.61.1`:

```text
Runtime configuration and reproducible OpenAPI passed
Formatting, ESLint, 296-source/1,552-import boundaries, and CSS ownership passed
Strict TypeScript passed
37 tooling tests passed
376 unit/component tests across 47 files passed
13 available integration tests passed; 45 PostgreSQL-dependent tests skipped
38 Playwright scenarios passed across Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit;
  one opt-in historical capture skipped
Production and workspace build passed
Bundle budget passed at 383,163 largest JavaScript bytes, 909,700 total JavaScript bytes,
  245,304 gzip JavaScript bytes, and 50,131 CSS bytes
```

The combined sandboxed invocation stopped only when the sandbox rejected the Playwright preview
bind on `127.0.0.1:4173`. Running the exact browser step with local-server permission passed, and
the subsequent production build passed separately. This is an environment permission boundary,
not a test failure.

`pnpm run test:visual` then passed 33 Chromium flows with one intentional opt-in historical capture
skip and reproduced all 19 current Phase 13 snapshots without update mode.

Docker is installed, but its daemon was not running during this gate. The integration project
therefore ran its 13 database-independent cases and explicitly skipped the 45 PostgreSQL-dependent
cases because `WORKLEDGER_TEST_DATABASE_URL` was unset. CI remains configured to start PostgreSQL,
run the isolated database lifecycle, and execute the same full gate with that URL. This matches the
recorded local boundary accepted by the Phase 10–12 gates and is not represented as database proof
for this session.

After the transition, exact `pnpm --config.verify-deps-before-run=warn run verify` repeats the
complete available result above at `0.14.0`, including the cross-browser gate and production build.
The `warn` override prevents pnpm's version-only workspace-state refresh heuristic from replacing
the already-valid installed dependency tree; a fresh CI install does not inherit that local state.
The phase guard confirms 14 completed gates and workspace version `0.14.0`.

## Accessibility

The gate preserves semantic structure, keyboard completion, route/result focus, validation
summaries, deliberate announcements, text-plus-boundary status cues, responsive complete records,
conditional local overflow, 44-pixel targets, 320-pixel reflow, forced colors, reduced motion, and
the current axe coverage.

`WL-1307` supplies bounded VoiceOver evidence for Today in Chrome for Testing and Safari. `D-502`
continues to describe the wider exact retail browser, NVDA, VoiceOver, and TalkBack matrix. This
gate does not convert automated checks or the bounded Today review into a whole-product WCAG or
screen-reader conformance statement.

## Security and data

No data contract or production data changed. Screenshots use deterministic fictional fixtures.
Type-neutral request and approval URLs, current-manager/HR scope, non-self approval rules,
purpose-minimized DTOs, no-store protected responses, memory-only transient state, immutable punch
history, and ledger authority remain unchanged. The release documents contain no secret, token,
raw account/session identifier, sickness detail, or production person data.

## Versioning and release meaning

Completing `WL-1313` is the fourteenth zero-indexed phase gate. All nine private manifests advance
from `0.13.0` to `0.14.0`; no lockfile update is required because workspace versions are not stored
in its importer metadata.

`0.14.0` is an internal milestone only. It authorizes no commit, tag, GitHub release, npm
publication, container publication, deployment, supported-version promise, browser warranty, or
conformance statement.

## Remaining boundaries

- `D-502` remains the explicit broader assistive-technology and retail-browser evidence boundary.
- The PostgreSQL-backed correction-history case and the wider database integration set were not
  executed locally because Docker was unavailable; existing CI and prior database evidence remain
  separate evidence.
- Exact partial-day work-versus-absence overlap, calculation-to-ledger mismatch, and break-duration
  signals require authoritative source facts before they can become new Today attention items.
- The earlier Phase 12 and task-specific Phase 13 screenshots remain immutable historical evidence.
- No later numbered roadmap task is assigned. The portfolio presentation scope remains preserved
  in `docs/drafts/portfolio-presentation.md` pending an explicit scheduling decision.
