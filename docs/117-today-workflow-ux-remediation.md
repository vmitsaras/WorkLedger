# WL-1200 Today workflow UX remediation

**Task:** `WL-1200`  
**Completed:** 2026-08-24  
**Outcome:** Today now follows the Quiet Ledger immediate-task hierarchy while preserving the
accepted attendance, calculation, recovery, authorization, and privacy contracts.

## Scope and boundary

This slice changes the Today presentation and its regression evidence only. It does not add a data
source, calculate a browser-owned total, change a punch event, reorder a timeline, alter a valid
action, weaken idempotency or stale-revision handling, or expand an employee DTO.

All displayed values retain their established sources:

| Value | Source |
|---|---|
| Current state, active start, revision, and valid actions | Authoritative Today attendance response |
| Credited, expected, balance, holiday, blockers, and warnings | Server-provided provisional or incomplete calculation |
| Freshness | Trusted response `asOf` formatted in the response timezone |
| Clock result | Terminal attendance-command response followed by authoritative Today refetch |
| Timeline labels and times | Ordered immutable response events formatted in the response timezone |

## Implemented hierarchy

The ready route now presents:

1. Date, Today heading, short task copy, and estimate freshness.
2. One shared comfortable panel containing current status, the next valid action, and the concise
   credited-minus-expected effect.
3. Persistent mutation result or recovery adjacent to the attendance controls.
4. Calculation blockers before warnings, and all attention before calculation detail or history.
5. One native calculation disclosure containing every source amount and explanation row.
6. The ordered immutable event timeline as supporting evidence.

The top effect uses a textual `Provisional estimate` or `Calculation incomplete` status badge. The
balance is not a celebratory tile, and its copy explicitly says a current-day value is not posted or
locked. The detailed groups no longer repeat each visible row as a second prose equation.

## Interaction and state behavior

- The server-provided first valid action remains the only primary action. Other valid actions use
  the secondary treatment. The control group has an accessible name and uses real forms/buttons.
- Pending labels, duplicate suppression, active-break clock-out confirmation, same-key retry,
  offline non-queueing, reconnect-before-enable, dependency retry, stale-tab convergence, and
  logical status focus are unchanged.
- One user intent still produces at most one live result. Success is persistent and polite; a
  terminal no-effect error remains assertive unless an existing recovery alert already owns that
  urgency.
- A calculation-linked warning opens the native disclosure before following its in-page link. The
  disclosure is keyboard operable, retains its native marker and expanded state, and exposes the
  complete description-list calculation when open.
- At narrow widths the state, valid action, effect, attention, disclosure, and timeline remain in
  one DOM and visual order. At wider widths the established intrinsic Today grid may place state
  and effect beside each other without moving the action after secondary content.

## Accessibility

The route retains one focused `h1`, then current-state and effect `h2` headings, a labelled action
group, native buttons/forms, a React Aria confirmation dialog, textual status families, semantic
description lists, and an ordered timeline. The existing focus transfer after a removed clock
action remains intact. The final browser assertions require 44 by 44 CSS pixel attendance targets,
no page overflow from 320 through 1920 CSS pixels, keyboard disclosure operation, forced-colors
boundaries/focus, touch completion, axe, and attention-before-evidence DOM order.

Automated semantics are not a claim about exact VoiceOver, NVDA, or TalkBack speech. The calibrated
manual assistive-technology matrix remains `D-502` and `WL-1206` work.

## Security and data

No API, database, authentication, authorization, CSRF, cookie, cache, URL, storage, logging, audit,
or export contract changed. Idempotency keys remain memory-only headers. Protected responses remain
in memory and no-store. The browser continues to trust neither its own clock nor a locally derived
attendance effect, and older revisions cannot replace a newer cached view.

## Verification

- `pnpm lint`: ESLint, 278-file/1,435-import boundaries, and the 85-token/88-class CSS contract pass.
- Focused component evidence: all 32 Today/application-shell tests pass, including axe.
- `pnpm test`: all 37 tooling tests and all 334 unit/component tests pass.
- `pnpm test:integration`: 13 available integration tests pass; 45 PostgreSQL-dependent cases are
  skipped because no database service is needed for this presentation-only slice.
- `pnpm test:e2e`: all 31 configured scenarios pass. This includes all 26 Chromium
  application-shell scenarios for the complete attendance sequence, lost-response replay,
  offline/reconnect, stale-device convergence, 320 px disclosure, ten-width reflow, forced colors,
  touch, and shell regressions, plus the configured Firefox, WebKit, mobile Chromium, and mobile
  WebKit smoke matrix.
- `pnpm build`: production build, public-root imports, and bundle budgets pass; final CSS is 49,941
  bytes against the 50,000-byte budget.
- Purpose-minimized visual-review captures are generated on demand under ignored
  `output/playwright/wl1200/` with `WORKLEDGER_CAPTURE_PHASE_12=1`.

## Remaining risk

The release-level manual screen-reader pairings remain open under `D-502`/`WL-1206`. Systematic
deterministic visual regression remains `UI-014`/`WL-1206`. Other employee collection/detail routes
still need the same shared-state and hierarchy adoption in `WL-1201`.
