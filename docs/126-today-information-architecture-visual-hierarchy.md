# Today information architecture and visual hierarchy

**Task:** `WL-1302`  
**Completed:** 2026-08-25  
**Outcome:** Today now applies the approved reference hierarchy through one primary task region,
a distinct attendance-action band, a responsive supporting-evidence grid, and a focused route
heading that remains visible without resembling a full-width input.

## Authority and boundary

The canonical reference remains
`docs/references/phase-13/today-redesign-reference.png`. It governs composition only. Quiet Ledger
in `docs/111-ui-design-direction.md`, the token boundary in
`docs/112-semantic-tokens-css-contract.md`, the accessibility contract, and the authoritative
`WL-1301` display snapshot remain higher-fidelity implementation sources.

This slice changes presentation and evidence only. It does not change an API, contract, selector,
calculation, attendance command, valid action, mutation state, timeline event, warning, recovery
destination, authorization rule, or persisted value. In particular:

- the reference's sample duration and finish time are not copied;
- `WL-1303` still owns the complete attendance-state and action-feedback matrix;
- `WL-1304` still owns the final separation of current session, today progress, estimated finish,
  provisional difference, and posted flexible-time balance;
- `WL-1305` still owns timeline and calculation-detail content; and
- `WL-1306` still owns actionable attention and correction recovery.

## Section concept and implementation

The revised surface is an immediate-task region rather than a KPI dashboard. Its order is:

1. organization-local date, route heading, task copy, and freshness;
2. one raised Today region containing current status and the concise provisional summary;
3. one rule-separated footer containing only server-authorized attendance actions plus existing
   recovery or result feedback;
4. attention when present;
5. the immutable Today timeline; and
6. the native calculation disclosure and complete existing explanation.

`TodayAttendanceOverview` still owns the status, summary, controls, recovery, and result
presentation. `TodayPage` now owns only the surrounding support grid. No one-use component or new
dependency was introduced. The implementation reuses `Panel`, `StatusBadge`, `Alert`, `Button`,
the existing controlled dialog, timeline, and native `details` element.

The route consumes only existing `--wl-*` tokens. The application stylesheet adds scoped
composition classes, a container-size breakpoint, the approved card shadow for the primary Today
task region, and rule-based separation. It does not declare a token, raw color, palette utility,
ambient gradient, or unsupported dark-mode branch. The CSS contract reports 71 sources, 85 owned
tokens, 89 defined WorkLedger classes, and 580 token uses.

## Responsive and accessibility behavior

- The summary starts as one complete column. It becomes two columns only when the Today container
  itself reaches 40 rem, independent of the outer device width or the persistent sidebar.
- The support grid uses intrinsic `auto-fit` columns. Three sections fit when attention is present
  and room permits; two sections share the row when no attention exists; narrow layouts preserve
  the same DOM order in one column.
- Attendance controls remain real buttons/forms in their labelled group, retain at least 44 by 44
  CSS pixels, and keep the existing dialog, pending, retry, offline, stale-device, and focus-return
  behavior.
- Timeline and calculation content keep their existing section, ordered-list, description-list,
  and native-disclosure semantics. The page has no CSS ordering, duplicated interactive control,
  or page-level horizontal scrolling.
- The shared route `h1` now shrink-wraps within its grid. Its existing three-pixel product-owned
  focus outline remains, but it no longer spans the content column like an input boundary.
- Forced-colors, reduced-motion, touch, keyboard, axe, and narrow-reflow browser assertions remain
  green. Exact retail screen-reader speech remains the explicit later `WL-1307`/`D-502` manual
  residual rather than a conformance claim.

## Visual comparison evidence

The five `WL-1300` and five `WL-1301` images remain unchanged. `WL-1302` adds a separate set under
`apps/web/e2e/application-shell.spec.ts-snapshots/phase-13/wl1302/`.

| Viewport | Full-page image | SHA-256 |
|---|---|---|
| 1440×900 | `today-audit-1440x900-chromium-darwin.png` (1440×1012) | `791e73bc25f02bebfa2d9c8d94306fb26df2ec1d0609422d7ae92be696adb874` |
| 1024×720 | `today-audit-1024x720-chromium-darwin.png` (1024×1084) | `9b2b427a29d770d03854a389592da1aebb35e766cad4d7d38641ca5b6bb5f2c5` |
| 768×1024 | `today-audit-768x1024-chromium-darwin.png` (768×1086) | `4915cc2f27e6b36548c4882b258894bec992bc580abf48ef1ee77f3fcf405bf8` |
| 390×844 | `today-audit-390x844-chromium-darwin.png` (390×1395) | `8ea72682ce143ebfb9a44886f90f58cb9a9da6d64fde713afee71408aadf0b66` |
| 320×568 | `today-audit-320x568-chromium-darwin.png` (320×1471) | `ad89fcfb77bb792e5e9e19468dcddf7669c2b31c26f0231f5529146da70b7e5d` |

The update run and a separate comparison run both passed. Original-resolution review covered the
approved reference, all five prior `WL-1301` views, and all five current views. The result is an
improvement with no visible blocking or major regression:

- the primary region now has the reference's summary-and-action band structure;
- the valid action pair has a stable, strong location and the provisional value uses less visual
  weight than the current attendance state;
- the timeline and calculation evidence form the reference's lower scan path without changing
  their content;
- the full-page height falls by 310 to 397 CSS pixels across the five comparable `WL-1301` pairs;
- no content is clipped, no page overflows horizontally, and no private value is added; and
- the focused H1 remains obvious but no longer reads as a full-width text field.

The reference and implementation have different canvases and navigation content, so this is a
structure, hierarchy, spacing, state, and responsive comparison rather than a meaningless
pixel-difference score. The reference's future progress, finish, posted-balance, compact timeline,
and calculation-table content remains assigned to `WL-1304` and `WL-1305`.

## Verification

`pnpm --config.verify-deps-before-run=warn verify` passed under Node `24.18.0` and pnpm `11.20.0`:

- runtime configuration, reproducible OpenAPI, formatting, ESLint, 288-file/1,507-import source
  boundaries, CSS ownership, strict TypeScript, workspace, and phase-version checks passed;
- all 37 tooling tests and all 353 unit/component tests passed;
- all 13 available integration tests passed, with 45 PostgreSQL-dependent cases skipped because
  no test database URL was configured;
- 34 Playwright scenarios passed across the configured browser matrix, with the opt-in hierarchy
  scenario skipped in the ordinary gate;
- the focused ten-width Today reflow test and both five-snapshot hierarchy runs passed; and
- the production build and all public-root imports passed at 364,637 largest JavaScript bytes,
  891,820 total JavaScript bytes, 240,872 gzip JavaScript bytes, and 47,693 CSS bytes.

No dependency, manifest, migration, lockfile, OpenAPI artifact, publication, deployment, tag, or
workspace version changed.

## Remaining risks and next task

`AUD-1300-07` is closed by the shrink-wrapped shared heading-focus geometry. The visual-hierarchy
portion of `AUD-1300-08` is closed by the primary task region, action band, reduced provisional
emphasis, and posted-only warning semantics; the final metric hierarchy remains `WL-1304` work.
`AUD-1300-05`, the two missing production source facts, and the real assistive-technology residual
remain open in their assigned tasks.

The next bounded task is `WL-1303`: implement the complete attendance-state matrix and reliable
clock-action feedback and recovery behavior without reopening this layout boundary.
