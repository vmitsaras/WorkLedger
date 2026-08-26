# Cross-route presentation normalization evidence

**Task:** `WL-1311`  
**Completed:** 2026-08-26  
**Outcome:** Authenticated destinations now use one stable lexicon, workflow states use one typed
text-and-tone contract, panels express their selected density, route focus remains visually
proportionate, and table scroll instructions and keyboard stops exist only while overflow exists.

## Scope and authority

This task changes application and shared-UI presentation, component and browser tests, UX
documentation, and project memory. It does not change domain calculations or invariants, API or
database contracts, authorization, sessions, CSRF, privacy minimization, migrations, dependencies,
lockfiles, manifests, workspace versions, publication, deployment, or tags.

React Router remains responsible for route completion, document titles, and destination-heading
focus. TanStack Query and PostgreSQL retain their existing state authority. Status tone and copy do
not alter a workflow state or decide which actions are permitted.

## Canonical destination lexicon

| Area | Destinations |
|---|---|
| My work | Today; My time; My balances; My requests; Calendar; Reports |
| Team | Team status; Approval inbox; Team calendar; Reports |
| People and policy | Employees; Teams; Time settings; Absence settings; Holiday calendars; Domain audit; Reports |
| System | Accounts and sessions; Operations; Technical audit |
| Account utilities | Notifications; Profile |

The lexicon is defined once for every authenticated shell destination and is consumed by the shell
and landing-route title handles. The visible page headings for the formerly inconsistent My
requests, Approval inbox, and Domain audit destinations consume the same source. Eyebrows may still
name a broader workflow family such as Requests or Approvals; they are orientation text, not a
second destination name.

Task-first descriptions were shortened where the prior copy foregrounded implementation detail:

- Approval inbox names the corrections, absence requests, cancellations, and monthly periods that
  need a decision.
- Team status names the observable availability/open-record questions and the follow-up task.
- Employees leads with finding, opening, or adding an employee.
- Teams explains its orientation purpose while retaining the direct-manager access boundary.

## Workflow status presentation

The web adapter exhaustively maps the union of personal-request and monthly-period statuses. It is
used by request history/detail, approval detail, and the monthly report table.

| Tone | Workflow statuses | Meaning in this presentation |
|---|---|---|
| Success | Acknowledged, Applied, Approved, Locked | A completed, accepted, or secured workflow outcome |
| Information | Pending decision, Reported, Submitted | An active workflow state awaiting or recording the next process step |
| Warning | Changes requested, Partially cancelled | A state that needs qualification or further attention |
| Danger | Rejected | A negative terminal decision |
| Neutral | Cancelled, Open, Withdrawn | A non-error state without a success or urgency claim |

Every badge includes its full textual state, border, and marker. Meaning therefore survives color
loss and forced-colors mode. The mapping is presentation-only and does not reinterpret the domain
state machine.

## Focus, density, and overflow contracts

- Route transitions still focus the destination `h1`. The focused heading is shrink-wrapped,
  capped to its container, permitted to wrap, and keeps the product-owned three-pixel focus
  outline. It no longer resembles a full-width form control.
- Comfortable, balanced, and compact panels now apply up to 24, 20, and 16 CSS-pixel token padding
  with correspondingly modest internal gaps. Comfortable and balanced cards retain the established
  16-pixel floor at narrow widths so spacing does not push the primary task below the viewport.
  Density does not reduce control or link target size.
- `DataTable` retains a native captioned table. A `ResizeObserver` compares its scroll width with
  its client width and also observes table-size changes. Only actual overflow adds `role="region"`,
  a region name, `tabindex="0"`, a visible instruction, and an `aria-describedby` relationship.
  Those attributes and the instruction are removed when resizing or content changes make the
  table fit.
- Responsive routes that already transform wide comparison tables into complete semantic lists
  retain that strategy. The conditional wrapper applies only where a genuine two-dimensional
  table remains.

## Accessibility and visual evidence

The shared component test simulates fit, overflow, and return-to-fit transitions and verifies the
region, focus, instruction, and accessible-description lifecycle. Web component tests verify that
non-measured JSDOM tables do not acquire redundant tab stops. Browser coverage verifies real
narrow-to-wide layout measurements on Technical audit and confirms that Team status has no table
region when its wide comparison fits.

Focused Chromium journeys pass for Approval inbox, Team status, combined-role navigation,
personal records/calendar, and employee/team/technical-audit administration. Local ignored
captures were inspected at original resolution for a 320-pixel calendar grid, 320-pixel Technical
audit, and 1440-pixel Employees table. The review found contained local scrolling, discoverable
guidance only where relevant, compact heading focus, and no new page-level overflow or clipped
action. `WL-1312` remains the owner of regenerated deterministic cross-route baselines and the
broader manual accessibility/usability gate.

Current modern-web guidance was checked for accessible route-heading focus, semantic status
messages, and scrollability affordances. The implementation follows the retrieved guidance by
keeping focus visible, preserving native table semantics, exposing off-canvas content through a
named keyboard scroll region, and avoiding unconditional instructions.

## Verification

- Focused shared-UI and web unit/component run: 5 files and 71 tests passed.
- Focused Chromium run: 5 representative journeys passed; a second capture run of 4 visual-review
  journeys also passed.
- Exact `pnpm verify` passes with Node `24.18.0` and pnpm `11.20.0`: runtime configuration,
  reproducible OpenAPI, formatting, lint, 296-source/1,552-import boundaries, CSS ownership, strict
  TypeScript, all 37 tooling tests, and all 376 unit/component tests.
- All 13 available integration tests pass; 45 PostgreSQL-dependent cases remain skipped because no
  test database URL is configured. No data-layer behavior changed in this task.
- The complete Playwright matrix passes 38 scenarios with one opt-in capture skipped, including
  the dedicated Today 320×568 action-priority gate after responsive panel density was applied.
- The production build and all eight public-root workspace imports pass at 383,163 largest
  JavaScript bytes, 909,700 total JavaScript bytes, 245,304 gzip JavaScript bytes, and 50,131 CSS
  bytes.

The presentation adapters add no dependency or stylesheet source. The production measurement is
245,304 gzip JavaScript bytes, 304 bytes above the prior ceiling, so the gzip budget moves narrowly
from 245,000 to 246,000 bytes. Largest-chunk, total-JavaScript, and CSS budgets remain unchanged.
No manifest, lockfile, workspace version, publication, deployment, or tag changed.

## Remaining boundaries

`WL-1312` owns deterministic current cross-route screenshots, the complete state matrix,
integration/browser/accessibility/usability closure, and disposition of the preserved Phase 12
snapshot drift. `WL-1313` owns the Phase 13 release gate and `0.14.0` version transition. This task
does not claim a complete assistive-technology matrix or whole-product WCAG conformance.
