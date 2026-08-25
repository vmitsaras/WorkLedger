# Today metric hierarchy

**Task:** `WL-1304`  
**Completed:** 2026-08-25  
**Outcome:** Today now separates the active attendance interval, credited progress toward today's
expectation, estimated completion, provisional daily difference, and accumulated posted
flexible-time balance without deriving a second browser-side source of truth.

## Scope and source contract

This slice is presentation-only. It consumes the authoritative `TodayAttendance` snapshot defined
by `WL-1301`; it does not change attendance transitions, calculation rules, API schemas, database
queries, ledger posting, authorization, or snapshot freshness.

| Visible value | Authoritative snapshot source | Presentation rule |
| --- | --- | --- |
| Current state | `attendance.state` | Names `OFF_WORK`, `WORKING`, or `ON_BREAK` before any metric |
| Current interval | `attendance.activeElapsedMinutes`, `attendance.activeSince` | Describes only the active work interval or active break, never the whole work session |
| Today's credited progress | `calculation.provisional.creditedMinutesToday`, `expectedMinutesToday` | Uses a native progress element when expectation is positive; visible and accessible copy preserve the actual credited total |
| Worked and breaks | `calculation.provisional.calculationSources.workedMinutesToday`, `breakMinutesToday` | Remain separate facts so credited time is not mislabeled as worked time |
| Remaining today | `calculation.remainingExpectedMinutes` | Uses the server-provided credited-progress remainder; the browser does not subtract totals |
| Estimated finish | `calculation.estimatedFinishAt`, `estimatedFinishUnavailableReason` | Shows an organization-timezone instant or the exact unavailable-state explanation |
| Provisional difference | `calculation.provisional.provisionalDifferenceMinutes` | Labels the partial-day result as provisional and does not style it as debt or a posted balance |
| Posted flexible time | `postedFlexBalanceMinutes`, `postedThroughDate` | Names the accumulated posted balance, dates its latest included ledger evidence, and explicitly excludes today |

`activeElapsedMinutes` is the current break-free interval, not a session total. Estimated finish is
shown only when the server provides it and is accompanied by “Assumes no additional break.” The
client maps the typed unavailable reasons to `Start work to estimate`, `Resume work to estimate`,
`Expectation met`, or calculation-unavailable copy without inventing a timestamp.

## Progress and edge-case semantics

The progress element measures credited minutes against expected minutes. Its visual value is capped
at the maximum so an over-expected day remains a valid native progress bar, while
`aria-valuetext` and the adjacent sentence retain the uncapped credited value. A zero-expectation
day renders no progress element because there is no meaningful denominator; it instead states the
credited amount and that no scheduled expectation exists.

An incomplete calculation renders `Progress unavailable`, omits the progress element and all
partial metrics, and directs the user to the blockers below. Posted balance remains available
because it is separately sourced, posted evidence rather than a partial current-day result.

## Semantic and responsive structure

The ready task panel has three labelled sections in stable DOM order:

1. Current status and active interval.
2. Today's provisional progress and supporting metrics.
3. Posted flexible-time balance and posted-through date.

The attendance action group follows all three sections. The layout is one column by default, two
columns at the intermediate container boundary, and three columns at the wide boundary. CSS does
not reorder the sections or actions. Time values use semantic `time` elements, related metrics use
description lists, the progress bar has a stable accessible name and value text, and state is always
conveyed in text rather than color alone.

## Automated evidence

Component coverage verifies the ordinary working state, all five metric meanings, DOM order,
native progress semantics, zero expectation, over-expectation capping with uncapped accessible
copy, incomplete calculation, posted-date absence, and axe results. Chromium coverage verifies the
responsive hierarchy, key values, page-level reflow, and the opt-in five-viewport visual set.

The reproducible visual comparison command is:

```sh
WORKLEDGER_E2E_PORT=4174 WORKLEDGER_ASSERT_PHASE_13_BASELINES=1 pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project chromium --grep @phase13-baseline
```

| Requested viewport | Full-page image | SHA-256 |
| --- | --- | --- |
| 1440×900 | `phase-13/wl1304/today-audit-1440x900-chromium-darwin.png` (1440×1153) | `30b8a11fa187e31cef5b8feee3d2464ab1a04ee10470b5a4a3dfafa58dd28f14` |
| 1024×720 | `phase-13/wl1304/today-audit-1024x720-chromium-darwin.png` (1024×1511) | `282cd46b75f9be07f5f581ba49c2c3ea97802a554f32ca0c27ca8b7932ba7361` |
| 768×1024 | `phase-13/wl1304/today-audit-768x1024-chromium-darwin.png` (768×1493) | `c434ff7a503b5d411d6f7468a32aa7eab194de26df5b42d4c27c1999696906b0` |
| 390×844 | `phase-13/wl1304/today-audit-390x844-chromium-darwin.png` (390×1982) | `9958ed19d86567562da48f86ac07e93816d41ec0fef6be47cfd9204372196820` |
| 320×568 | `phase-13/wl1304/today-audit-320x568-chromium-darwin.png` (320×2220) | `d124a70428d6556d7fe3bd0fc491d66edccb80cdcb858d55fd7d819bbac06453` |

The update run and a separate comparison run passed. The 1440, 1024, and 320 images were inspected
at original resolution; the wide, intermediate, and narrow layouts preserve semantic order, avoid
horizontal clipping, and keep provisional and posted amounts visibly distinct.

## Verification result

The exact `pnpm verify` workflow passed under Node `24.18.0` and pnpm `11.20.0`, with the browser
server moved to port 4174 because an unrelated process already owned the default port. The existing
workspace-state warning was recorded; no dependency install or lockfile change was allowed.

- Runtime configuration, reproducible OpenAPI, formatting, ESLint, strict TypeScript, phase/version
  checks, the 288-file/1,508-import boundary, and the 71-source CSS ownership contract passed.
- All 37 tooling tests and all 360 unit/component tests passed.
- Ordinary integration passed 13 available tests; 45 PostgreSQL-dependent tests were skipped because
  the database fixture was not configured for this presentation-only slice.
- Ordinary Playwright passed 36 scenarios with the opt-in visual scenario skipped. The dedicated
  five-viewport visual update and a separate comparison run each passed.
- The production/public-root build passed at 367,724 largest JavaScript bytes, 894,907 total
  JavaScript bytes, 241,728 gzip JavaScript bytes, and 49,992 CSS bytes without raising a budget.

## Security, data, and residuals

The UI exposes no additional identifiers, sensitive absence data, policy detail, raw ledger rows,
or browser-persisted state. The same authorized no-store Today response supplies every displayed
value. No dependency, lockfile, manifest, migration, or workspace version changed.

`AUD-1300-08` is closed: the provisional daily difference no longer dominates the active session or
resembles accumulated debt. `WL-1305` remains responsible for rebuilding the timeline and
calculation disclosure. Exact retail screen-reader/browser behavior remains the `WL-1307` manual
residual.
