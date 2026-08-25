# Today responsive, accessibility, usability, and visual sub-gate

**Task:** `WL-1307`  
**Completed:** 2026-08-26  
**Outcome:** The dedicated Today sub-gate passes with no open P0 or P1 Today finding. Five
deterministic Chromium baselines reproduce, the primary attendance actions precede secondary
calculation and balance detail at every width, automated axe/reflow/focus/state evidence is green,
and VoiceOver was exercised in both Chrome for Testing and Safari.

## Scope and authority

This task validates and hardens the completed `WL-1301`–`WL-1306` Today slice. It changes only the
Today summary's responsive task order, its browser gate, five new current-phase screenshots, and
project evidence. It adds no attendance calculation, transition, ledger, permission, API, database,
migration, production type, dependency, or version change.

PostgreSQL, the Today service, and the accepted contracts remain authoritative. The reference at
`docs/references/phase-13/today-redesign-reference.png` governs hierarchy only. Its contradictory
sample arithmetic, 15-minute session, and 5:00 PM finish are not copied.

## Finding resolved during the gate

| ID | Before | Severity | Resolution | Evidence |
|---|---|---:|---|---|
| `UXR-1307-01` | At 320 CSS pixels, the clock actions followed the complete progress and posted-balance sections, so the first actionable task fell below secondary facts and outside the initial viewport. | P1 | Grouped status and its actions as one semantic task column. Narrow source order is now status → actions → progress → posted balance; wide layout keeps actions with status beside the other zones. | Five current screenshots; ten-width reflow test; explicit source-order, first-viewport, overflow, and 44×44 target assertions. |

No other production change was needed. The action labels, mutation behavior, focus recovery, query
ownership, and API contract remain unchanged.

## Responsive and visual evidence

The capture freezes browser time and API evidence at `2026-08-11T10:45:00Z` (12:45 PM in
Europe/Berlin). The fixture contains the coherent 9:00 clock-in, 10:45 break, 11:15 resume, 3h15
recorded work, 30-minute break, 15-minute approved correction effect, 3h30 credited time, 8-hour
expectation, 4h30 remaining, 5:15 PM estimate, and +6h20 posted balance through August 10. The
correction effect is separately disclosed; recorded work and credited time are not conflated.

The opt-in capture command is:

```text
WORKLEDGER_E2E_PORT=4177 WORKLEDGER_ASSERT_PHASE_13_TODAY_GATE=1 pnpm --config.verify-deps-before-run=warn exec playwright test apps/web/e2e/application-shell.spec.ts --project=chromium --grep "passes the WL-1307 Today"
```

Environment: macOS 26.5.2 build 25F84, Node 24.18.0, pnpm 11.20.0, Playwright 1.61.1, Chrome for
Testing 149.0.7827.55. The update run passed once; independent comparison runs then passed without
snapshot-update mode.

| Viewport | Full-page file | Raster size | SHA-256 |
|---|---|---:|---|
| 1440×900 | `today-gate-1440x900-chromium-darwin.png` | 1440×1708 | `7731a7db716022b496f2e987282e88f78c0d8878b853173e361579748ff0a278` |
| 1024×720 | `today-gate-1024x720-chromium-darwin.png` | 1024×2152 | `b29fa81182f485c13e3886a2a8250aa4a5764755828da25f66cc1dfd21eb2aa1` |
| 768×1024 | `today-gate-768x1024-chromium-darwin.png` | 768×2052 | `6ae0a0a4b98be640d2417734cdfd6f826cfcde23c6f817dfd2d741b3689d3141` |
| 390×844 | `today-gate-390x844-chromium-darwin.png` | 390×2928 | `f87da0dc93813c7b47e1b9939dc8d8c03f2160cc2d0f8b1fdb79b1a35c0a37f6` |
| 320×568 | `today-gate-320x568-chromium-darwin.png` | 320×3320 | `c591a74bdd29b0c653b5b6a328f7040be7d1eae4c5445479ae9bfde6ed6ad83d` |

Manual original-resolution inspection found no impossible values, clipping, lost signs or units,
or page-level horizontal overflow. At narrow widths, the action pair appears immediately after
current status and before progress. Timeline time/description associations and calculation row
associations remain intact. The 1440 layout preserves the reference's three-zone hierarchy without
merging provisional progress with posted balance. Warnings do not dominate the no-attention
fixture, and the route-heading focus ring remains a heading treatment rather than an input-like
box.

The same gate also checks 640×450 as a 200-percent-zoom reflow equivalent and 844×390 landscape.
The existing ten-width Today reflow case spans 320, 360, 390, 430, 640, 768, 1024, 1280, 1440, and
1920 CSS pixels. A separate 320 case exercises the long holiday label; this gate exercises a long
fictional account name and the full recovery copy inside the narrow navigation shell. None creates
page or dialog horizontal overflow.

The historical Phase 12 images remain untouched. Their Today image predates the cumulative Phase
13 hierarchy and is no longer the current Today acceptance image. The three small cross-route
Phase 12 raster differences remain assigned to `WL-1312`; they are not relabelled as Today passes.

## Accessibility evidence

| Requirement | Evidence and result |
|---|---|
| Landmarks and H1 | Exactly one `main` and one level-one `Today` heading; route load focuses the H1. |
| Heading order | Runtime heading-level sequence has no skipped level; the calculation heading appears after its native disclosure. |
| Keyboard | Start break, Clock out, the calculation disclosure, active-break confirmation, correction recovery, retry, and navigation drawer have automated keyboard coverage. |
| Focus | Route, mutation success, stale/other-device state, permission/session loss, dialog close, dependency error, correction error summary, and success recovery each have explicit focus assertions. |
| Live feedback | Static attention is silent; pending/success/recovery status is polite; a newly introduced blocker is assertive once; unchanged refreshes and the running interval do not announce repeatedly. |
| Names and descriptions | Clock actions are named buttons; progress exposes credited/expected detail; calculation uses a named native disclosure and captioned table; errors and recovery links use visible text. |
| Zoom/reflow | 640 CSS pixels with the desktop layout represents 200-percent zoom from 1280; no page overflow and the primary action remains visible. |
| Text spacing | WCAG text-spacing overrides at 320 preserve the action, finish explanation, and page width. |
| Forced colors | The existing Today forced-colors case verifies visible text, nontransparent control boundary, and focus outline. |
| Reduced motion | The gate computes `animation-name: none`, `transform: none`, and a 0.001-second transition for the primary action. |
| Touch | Existing mobile-context automation activates the primary attendance action by touch and verifies a 44×44 minimum target. |
| Automated rules | Axe passes at 1440 and 320 in the current gate, plus the existing critical state and recovery cases. |
| Status without color | Working, provisional, posted-through, blocking effect, warning status, pending/success/error, and recovery outcome all have text. |

Measured normal-color contrast ratios are 16.42:1 for primary text on white, 15.29:1 on the main
surface, 7.74:1 for muted text on white, 7.21:1 for muted text on the main surface, 9.94:1 for the
action color on white, 8.47:1 on its subtle surface, 6.03:1 for the focus color on white, 5.62:1 on
the main surface, and 3.93:1 for the strong boundary on white. The ordinary 1.74:1 decorative
border is not the sole identifier for any control, focus state, or status. Axe independently checks
rendered foreground/background contrast at the widest and narrowest current viewports.

### Announcement and timer matrix

| Event | Channel | Expected content and noise limit | Evidence |
|---|---|---|---|
| Route ready | Route focus, not live alert | `Today` heading is focused; static warning cards do not assert themselves. | Current gate and attention component tests |
| Clock mutation pending | Polite status | One concise in-progress message; controls expose pending/disabled state. | Attendance state/component tests |
| Confirmed success | Polite status plus focus recovery | Action and resulting state/time; focus moves to current status. | Full clock-sequence browser test |
| Known no-effect or conflict | Polite/actionable recovery | Explains no effect or refreshed authoritative state; no duplicate success. | Mutation integration/browser tests |
| Lost response/dependency failure | Actionable alert/recovery | Safe explanation, optional request reference, and retry; no guessed result. | Recovery component/browser tests |
| New blocker after mount | Assertive alert once | Server-owned blocker title and explanation. | Attention component test |
| Static or unchanged warning | No assertive announcement | Visible warning remains readable but does not repeat on load/refresh. | Current warning step and component test |
| Other-tab/device update | Polite status | Current state only; stale focused action is not silently substituted. | Visibility-change browser tests |
| Permission/session loss | Focused route state | Neutral denial/session recovery and protected cache removal. | Browser state matrix |
| Running interval | None per tick | The timer is sighted text only; no per-second live region exists. | Source inspection and component tests |

## Manual assistive-technology review

The review used macOS VoiceOver with the deterministic local Today fixture. VoiceOver was restored
to its original off state after the checks.

| Setup | Tasks and observed result |
|---|---|
| VoiceOver + Chrome for Testing 149.0.7827.55 | Confirmed the route H1, Working H2, current interval and since value, named Start break and Clock out buttons, described progress indicator, timeline event text, and native calculation disclosure in the browser accessibility tree. Tab order from route focus was Start break → Clock out → Calculation details. Activating the disclosure preserved focus and exposed the captioned table, row/column headers, expected/credited sources, correction contribution, and signed provisional result. A deliberately unsupported mock mutation exposed the actionable error and returned focus to Working. |
| VoiceOver + Safari 26.5.2 | Confirmed the same route and primary-action order in a secondary browser. Safari exposed the calculation summary's off/on state, and keyboard activation revealed the named source table and all source/result rows without losing focus. |

The automation surface exposes VoiceOver navigation, accessibility roles/names/states, and browser
focus but not a transcript of synthesized speech. Exact utterance wording is therefore not claimed.
The live-region copy and urgency behavior above are asserted at DOM/component/browser level while
VoiceOver supplies the manual role, name, state, order, and focus check. This is bounded evidence,
not a whole-product WCAG conformance statement or an iOS/Android screen-reader claim.

## Usability script

Using the first viewport without coaching, the deterministic screen answers the required questions
from the summary before secondary evidence:

1. **Am I clocked in?** `Working` under `Current status`.
2. **When did the current session start?** `Since 11:15 AM`; current interval `1h 30m`.
3. **How much have I worked today?** `Worked today 3h 15m`.
4. **How much scheduled work remains?** `Remaining today 4h 30m`.
5. **What can I do next?** `Start break` and `Clock out`, immediately after status.
6. **Is there a real problem requiring action?** No attention section in the ordinary fixture. The
   warning fixture says `Does not block submission` and links to balance history.

Task evidence:

| Task | Evidence | Result |
|---|---|---|
| Start break → Resume work → Clock out | Deterministic complete clock-sequence browser scenario, keyboard state/focus assertions, and touch primary-action scenario | Passed |
| Add a missed entry | Historical daily-record recovery opens the exact correction target | Passed in `WL-1306` browser/component coverage |
| Request a correction | Canonical correction form preserves values after recoverable errors and focuses error/success results | Passed in `WL-1306` browser/component coverage |
| Open calculation details | Keyboard and VoiceOver checks in Chrome and Safari; current screenshot gate leaves the disclosure open | Passed |

No wrong click, terminology ambiguity, focus trap, or recovery dead end was observed in the bounded
deterministic review. `UXR-1307-01` was the only gate-blocking issue found and was fixed before the
final captures.

## Privacy and security review

- Screenshots and transport use fictional, purpose-limited DTOs. Inspection found no sickness
  detail, tokens, request/ledger identifiers, decision reasons, or operational metadata.
- Today URLs contain no sensitive state. Local storage stays empty; the test rejects employee
  names, email addresses, sickness text, and flexible-time prose in browser storage.
- Static warning recovery remains a real same-origin link to the authorized balance ledger. The
  browser does not infer authorization from its presence.
- The responsive source-order change does not change server permissions, clock idempotency,
  immutable events, audit history, or cache ownership.

## Open lower-priority evidence and boundaries

There is no open P0 or P1 Today issue. Remaining items do not block this sub-gate:

- `D-502` still calls for the broader exact retail browser/assistive-technology matrix at the final
  cross-route gate. This task supplies real VoiceOver evidence in two browsers but not iOS
  VoiceOver, TalkBack, NVDA, or JAWS.
- Exact partial-day work-versus-absence overlap, calculation-to-ledger mismatch, and break-duration
  warnings still lack accepted repository/domain facts. Today correctly does not invent them.
- The PostgreSQL-backed correction-history case remains locally unavailable until the test database
  service is available.
- The three preserved non-Today Phase 12 raster drifts remain `WL-1312` work.

## Verification

The exact `pnpm verify` workflow passed under Node 24.18.0 and pnpm 11.20.0 with
`verify-deps-before-run=warn`; no dependency install, purge, registry refresh, manifest, or lockfile
change was allowed.

- Runtime configuration, reproducible OpenAPI, formatting, ESLint, the 289-source/1,515-import
  boundary contract, CSS ownership, strict TypeScript, workspace graph, and phase/version contract
  passed.
- All 37 tooling tests and all 368 unit/component tests passed.
- All 13 available integration tests passed. Another 45 PostgreSQL-dependent tests were skipped
  because no test database URL was configured.
- Playwright passed 37 scenarios across the configured browser matrix. The separate `WL-1305`
  opt-in capture remained skipped.
- The dedicated `WL-1307` snapshot update run passed once. Multiple independent comparison runs,
  including the final post-budget-refactor run, passed without update mode.
- The production build and all eight public-root imports passed. Measured output is 370,228 bytes
  for the largest JavaScript asset, 897,411 total JavaScript bytes, 242,647 gzip JavaScript bytes,
  and 49,961 CSS bytes. No budget was raised.
- `pnpm run phase:check` reports 13 completed phase gates and version 0.13.0. `git diff --check`
  passed after the final project-memory update.

The required unchanged `pnpm run test:visual` command remains non-green historical evidence: 28
scenarios passed, one opt-in capture skipped, and four Phase 12 snapshot comparisons failed.
Approvals, My Time, and Employees retain their existing approximately one-percent raster drift;
the Today image is the deliberately preserved pre-Phase-13 hierarchy. No Phase 12 image was updated
or deleted. The current `WL-1307` Today comparison is green, and the remaining cross-route visual
closure stays assigned to `WL-1312`.
