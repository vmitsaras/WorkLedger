# Today timeline and calculation evidence

**Task:** `WL-1305`  
**Completed:** 2026-08-25  
**Outcome:** Today now explains original attendance events, approved correction effects, every
current-day calculation source, and the provisional result without rewriting punch history or
exposing correction workflow detail.

## Source and reconciliation contract

The Today repository reads applied corrections for the employee and organization-local date
through the exact snapshot capture instant. An approved request is treated as unresolved until its
applied-correction record exists. Punch and correction histories share the existing bounded source
limit, and either history exceeding that bound marks the Today timeline and calculation incomplete.

Current-day arithmetic preserves the immutable raw punches. The service sums each applied
correction's incremental worked-minute change, adds the separate persisted daily-projection
adjustment amount, and supplies the combined approved adjustment to the domain engine. The browser
receives the two evidence categories separately:

| Evidence | Browser source | Rule |
| --- | --- | --- |
| Original events | `timeline[]` | Immutable event IDs, types, and instants remain in repository order |
| Applied correction evidence | `appliedCorrections[]` | Only original and corrected worked-minute totals are exposed |
| Approved correction total | `calculation.provisional.calculationSources.approvedCorrectionMinutes` | Sum of applied correction deltas used by the domain calculation |
| Other approved adjustments | `calculation.provisional.calculationSources.otherApprovedAdjustmentMinutes` | Persisted daily-projection adjustment source, kept distinct from corrections |
| Credited result | `calculation.provisional.creditedMinutesToday` | Server-calculated result after work, absence credit, corrections, and other adjustments |

The browser correction DTO deliberately excludes request, decision, actor, employee, organization,
reason, interpretation, and application identifiers; private reasons and exact correction-detail
timestamps remain outside the Today transport. The tracked OpenAPI artifact reflects this boundary.

## Timeline presentation

The timeline starts with the organization-local date, IANA timezone, source count, and the stable
ordering rule for equal instants. When corrections exist, an `Approved interpretation` ordered list
states how worked time changed. `Original recorded events` then preserves the immutable punch list
with semantic `time` elements, event labels, and plain-language meanings.

An empty history remains explicit. A truncated punch or correction history renders the existing
danger alert and prevents the calculation from appearing complete. The current interval status is
not repeated in the historical list because it already belongs to the authoritative status region.

## Calculation disclosure

The existing native `details` element remains closed by default and keyboard operable. Its semantic
table has a caption, column headers, row headers, and three source groups:

1. Expected time: schedule, public-holiday reduction, absence reduction, and expected total.
2. Credited time: recorded work, excluded breaks, approved corrections, absence credit, other
   approved adjustments, and credited total.
3. Today's result: the provisional credited-minus-expected difference supplied by the server.

Breaks are labelled as already excluded so they are not mistaken for a second subtraction. Signed
correction, adjustment, and difference values include a visible sign. No color is required to
understand source, status, or result.

## Accessibility and responsive evidence

The original history and correction evidence are ordered lists. Timeline times use `time` elements.
The calculation uses native table semantics rather than a visual grid of description lists, and the
native disclosure preserves focus when opened. Existing shared table styles allow long row labels
to wrap while keeping the value column visible.

Component coverage verifies the corrected and original representations, table caption, row
headers, disclosure toggling, signed values, narrow content, and axe results. Chromium coverage
verifies keyboard opening at 320 CSS pixels, no page-level horizontal overflow, semantic hierarchy,
and axe results at the widest and narrowest evidence viewports.

The reproducible visual comparison command is:

```sh
WORKLEDGER_E2E_PORT=4174 WORKLEDGER_ASSERT_PHASE_13_BASELINES=1 pnpm --config.verify-deps-before-run=warn exec playwright test apps/web/e2e/application-shell.spec.ts --grep "captures the WL-1305 Today timeline and calculation evidence"
```

| Requested viewport | Full-page image | SHA-256 |
| --- | --- | --- |
| 1440×900 | `phase-13/wl1305/today-audit-1440x900-chromium-darwin.png` (1440×1797) | `ee33576443ab7b282a34cdab3419cd224d0ef99a545e82bb3ec09bc7958aa9ab` |
| 1024×720 | `phase-13/wl1305/today-audit-1024x720-chromium-darwin.png` (1024×2241) | `39ebe73b29178f2e5c16acc91a22c7eeb4aa4ea55708dd5438d5cfbec2bcd9a3` |
| 768×1024 | `phase-13/wl1305/today-audit-768x1024-chromium-darwin.png` (768×2141) | `55b386791a7162de0e1b7548dd3a1723015fdfc15dc6377f5d7738740d6479bf` |
| 390×844 | `phase-13/wl1305/today-audit-390x844-chromium-darwin.png` (390×2948) | `a31702b2c28fd6c113ac08f40a09793e19d12754dfad9780c3da7b98a1f1e941` |
| 320×568 | `phase-13/wl1305/today-audit-320x568-chromium-darwin.png` (320×3340) | `312cbe8fdd203fb73fd6cc38724d214ea6d12131951913dd102c8c339172b132` |

The update run and a separate comparison run passed. The 1440 and 320 images were inspected at
original resolution. Both preserve the status-first hierarchy, separate corrected and original
evidence, complete calculation values, visible focus, and page containment.

## Verification result

The exact `pnpm verify` workflow passed under Node `24.18.0` and pnpm `11.20.0`. The existing
workspace-state warning was recorded and bypassed with the warning-only pnpm configuration; no
dependency install, purge, registry refresh, manifest, or lockfile change was allowed.

- Runtime configuration, reproducible OpenAPI, formatting, ESLint, strict TypeScript, phase and
  version checks, the 288-file and 1,507-import boundary, and the 71-source CSS ownership contract
  passed.
- All 37 tooling tests and all 361 unit and component tests passed.
- Ordinary integration passed 13 available tests; 45 PostgreSQL-dependent tests were skipped
  because no test database URL was available.
- Ordinary Playwright passed 36 scenarios with the opt-in visual scenario skipped. The dedicated
  five-viewport update and independent comparison runs passed, as did the separate 320-pixel flow.
- The production and public-root build passed at 367,672 largest JavaScript bytes, 894,855 total
  JavaScript bytes, 241,785 gzip JavaScript bytes, and 49,993 CSS bytes without raising a budget.

The phase-version checker was aligned with the accepted roadmap's `WL-1313` Phase 13 gate after the
completed `WL-1305` checkbox exposed its superseded gate identifier. Workspace version `0.13.0`
therefore remains correct until the actual Phase 13 exit gate completes.

The new PostgreSQL correction-history integration case could not run locally. `pnpm db:test`
reached no database and returned `ECONNREFUSED`; `pnpm db:up` then failed because the local Docker
API returned an internal error while accessing the PostgreSQL image. The test is present and the
ordinary suite skips it rather than reporting false execution.

## Security, data, and residuals

Authorization and the repeatable-read transaction boundary are unchanged. Repository queries keep
organization, employee, local-date, and exact-snapshot bounds. No correction reason, decision
reason, actor, workflow identifier, sickness detail, or raw interpretation enters the browser
response, URL, storage, or logs.

No schema migration, dependency, lockfile, manifest, phase version, publication, deployment, tag,
or domain rule changed. `WL-1306` remains responsible for actionable attention and correction
recovery. Exact retail screen-reader and browser verification remains part of `WL-1307`.
