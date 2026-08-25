# WorkLedger Phase 13 Handoff

## Phase title

**Phase 13 — Attendance clarity, operational trust, and workflow usability hardening**

## Why this phase exists

Phase 12 produced a structurally sound and visibly accessible implementation, but the current product still exposes several cognitive and operational problems:

- The Today screen can present timestamps and durations that do not reconcile.
- Current attendance, today’s progress, provisional daily difference, and posted flex-time balance are visually mixed together.
- An ordinary in-progress workday can look like a severe negative-balance problem.
- `Needs attention` can describe a condition without offering a direct recovery path.
- Timeline and calculation explanations are verbose in the wrong places and incomplete in the places where employees need proof.
- Approval inbox prioritizes filters before actionable work.
- Team and administration tables identify states but do not consistently expose the next action.
- Navigation and interface copy sometimes describe internal architecture instead of the user’s task.
- Permanent overflow instructions and large focus outlines add noise even when no problem exists.

This phase is not a cosmetic reskin. It is a comprehension, consistency, and trust pass led by the core attendance workflow.

---

# 1. Source-of-truth hierarchy

Use this order whenever sources appear to conflict:

1. Ratified domain rules, permission rules, immutable-history rules, and ledger rules.
2. Server/API data and deterministic domain calculations.
3. Phase 13 acceptance criteria in this handoff.
4. Existing automated tests, after confirming they match ratified rules.
5. `references/today-redesign-reference.png` for layout, grouping, and visual priority.
6. Existing screenshots for inventory and regression context only.

The reference image is **not** authoritative for sample arithmetic. It contains a useful layout direction, but implementation values must come from one coherent server snapshot.

## Canonical coherent Today fixture

Use this fixture for deterministic stories, screenshots, and tests unless an existing seeded scenario is more appropriate:

- Organization timezone: `Europe/Berlin`
- Local date: Tuesday, August 11, 2026
- Snapshot `asOf`: 12:45 PM local time
- Clocked in: 9:00 AM
- Break started: 10:45 AM
- Work resumed: 11:15 AM
- Current attendance state: `WORKING`
- Current session start: 11:15 AM
- Current session duration: 1h 30m
- First work session: 1h 45m
- Second/current work session: 1h 30m
- Worked today: 3h 15m
- Unpaid breaks: 30m
- Expected today: 8h
- Remaining scheduled work: 4h 45m
- Estimated finish: 5:30 PM, only when the system can derive it reliably and the UI states the assumption
- Posted flex-time balance: +6h 20m
- Posted-through date: August 10, 2026
- Provisional difference if the employee clocked out at the snapshot: −4h 45m; show only as secondary calculation detail

Do not display `5:00 PM`, `15m current session`, or any other value that conflicts with the fixture. If the production query uses a different coherent fixture, update every dependent value together.

---

# 2. Phase constraints

## Must preserve

- Immutable attendance events.
- Approved-correction history.
- Ledger-based balances.
- Effective-dated schedules and policies.
- Server-side authorization.
- Existing role/privacy boundaries.
- React Aria as the primitive accessibility foundation.
- Existing design tokens and component ownership boundaries.
- React Router URL state for shareable filters.
- TanStack Query ownership of remote server state.
- Reduced-motion and forced-colors support.

## Must not introduce

- Client-only authoritative time calculations.
- A second UI primitive framework.
- A second icon library.
- New global state without a demonstrated cross-route requirement.
- Decorative real-time animation or continuously announced timers.
- Automatic editing of raw attendance events.
- Confirmation dialogs for normal clock actions.
- Color-only status communication.
- Fake values added solely to match the visual reference.
- Broad domain rewrites unless a demonstrated defect requires one and tests prove the change.

---

# 3. Required implementation order

1. Complete `WL-1300` and `WL-1301` to establish correctness.
2. Complete `WL-1302` through `WL-1306` for the Today vertical slice.
3. Pass `WL-1307` before modifying secondary manager/admin routes.
4. Complete `WL-1308` through `WL-1311`.
5. Complete regression and release work in `WL-1312` and `WL-1313`.

Do not parallelize visual implementation ahead of the display contract. A polished layout containing contradictory numbers fails the phase.

---

# 4. Detailed tasks

## `WL-1300` — Audit Phase 12 and establish deterministic baselines

### Goal

Identify exactly how the current UI derives and presents attendance, balance, warnings, manager workflows, and administration data before changing behavior.

### Instructions

- Read the repository instructions and current project status.
- Locate all routes, components, hooks, query keys, API handlers, DTOs, selectors, domain functions, fixtures, and tests involved in:
  - Today
  - My time and balances
  - Approval inbox
  - Team status
  - Employees and Teams administration
  - Shared navigation, page headings, status badges, tables, overflow helpers, error states, and route focus
- Trace every visible Today value from database/domain output to final formatted text.
- Record whether each value is:
  - authoritative fact
  - derived server value
  - derived client value
  - formatted display only
  - placeholder or seed fixture
- Capture deterministic baseline screenshots at:
  - 1440×900
  - 1024×720
  - 768×1024
  - 390×844
  - 320×568 or the repository’s nearest supported 320 CSS-pixel setup
- Freeze the application clock and seed state for screenshots.
- Register `references/today-redesign-reference.png` in the repository documentation.
- Create a Phase 13 baseline document containing:
  - contradictions
  - misleading labels
  - inaccessible or unverified interactions
  - responsive defects
  - route-specific P0/P1/P2 items
  - source files responsible
- Confirm whether the existing reference screenshots accidentally show impossible combinations of state.

### Do not

- Redesign components during the audit.
- alter domain rules to make screenshots convenient.
- mark Phase 12 regressions as intentional without evidence.

### Acceptance criteria

- Every current Today metric has a traced source.
- Every current warning has a documented trigger.
- Current attendance states and error states are listed.
- Baselines are deterministic and reproducible.
- The next task can be implemented without guessing where calculations occur.

### Evidence

- `docs/ux/phase-13-baseline.md` or repository-equivalent path.
- Screenshot baseline directory.
- Updated `PROJECT_STATUS.md`.
- Task-board status updated.

---

## `WL-1301` — Establish the authoritative Today display contract

### Goal

Make it impossible for the Today screen to combine values from different snapshots or mislabel current-day progress as posted account balance.

### Instructions

Create or formalize a typed Today presentation contract. Reuse existing contracts where possible. Do not move authoritative business calculations into the React route.

The contract must make these concepts explicit:

- `asOfInstant`
- `organizationTimeZone`
- `localWorkDate`
- `attendanceState`
- `currentSessionStartedAt`
- `currentSessionElapsedMinutes`
- `workedMinutesToday`
- `breakMinutesToday`
- `creditedMinutesToday`
- `expectedMinutesToday`
- `remainingExpectedMinutes`
- `provisionalDifferenceMinutes`
- `estimatedFinishAt`, optional with reason when unavailable
- `postedFlexBalanceMinutes`
- `postedThroughDate`
- `timelineEvents`
- `calculationSources`
- `attentionItems`
- `isPeriodPostedOrLocked`
- mutation/action availability and blocking reason

Names may follow repository conventions, but the semantic distinctions must remain.

### Rules

- All values must refer to the same `asOfInstant` and local work date.
- React components must not parse formatted time text to calculate another metric.
- Formatting happens after calculation.
- `workedMinutesToday` and `creditedMinutesToday` must not be used interchangeably.
- Posted account balance must exclude the open day unless the domain explicitly posts it.
- The contract must expose why estimated finish is unavailable rather than returning a fabricated time.
- Attention items must expose severity, blocking state, affected date, concise reason, and allowed recovery action.
- The UI must not infer permissions from button visibility alone.

### Tests

Add contract/selector tests for:

- canonical working fixture
- not-clocked-in day
- on-break day
- completed day
- multiple sessions
- paid absence credit
- manual approved adjustment
- unresolved record
- current-day provisional negative difference with positive posted balance
- negative posted balance crossing a configured threshold
- unavailable estimated finish
- schedule change effective on the current date
- overnight/DST result supplied by the domain

### Acceptance criteria

- Canonical fixture reconciles exactly.
- No visible value can come from an independently sampled client clock.
- A provisional current-day difference cannot trigger a posted-balance warning.
- Contract tests fail when inconsistent fixture values are introduced.

---

## `WL-1302` — Implement the revised Today layout and hierarchy

### Goal

Implement the approved reference’s hierarchy while preserving WorkLedger’s established design system and accessible component foundation.

### Reference use

Use `references/today-redesign-reference.png` for:

- grouping
- order
- relative emphasis
- spacing direction
- desktop composition
- action hierarchy

Do not treat it as:

- pixel-perfect specification
- source of copy truth
- source of arithmetic truth
- permission or domain specification

### Required structure

1. Date eyebrow.
2. `Today` H1 and concise description.
3. One primary summary surface with three semantic zones:
   - Current status
   - Today’s progress
   - Posted flex-time balance
4. State-appropriate primary and secondary clock actions.
5. Tertiary recovery actions:
   - Add missed entry
   - Request correction
   Only display when permitted and meaningful.
6. Secondary content:
   - Needs attention, only when actionable issues exist
   - Today’s timeline
   - Calculation details

### Layout behavior

- Wide desktop: summary zones may use three columns.
- Medium width: use a two-row arrangement without compressed text.
- Small width: stack in this order:
  1. Current status and actions
  2. Today’s progress
  3. Posted flex-time balance
  4. Needs attention
  5. Timeline
  6. Calculation details
- Keep the primary clock action visible in the first mobile viewport where practical without using a permanently obstructive overlay.
- Avoid a page full of equal-weight cards. The attendance summary is primary; calculation details are secondary.
- Use tabular numerals for times and durations.
- Use existing tokens for surfaces, borders, radius, focus, statuses, and spacing.

### H1 focus behavior

- Preserve route-focus management.
- Apply visible treatment only when appropriate for keyboard navigation.
- Do not render a full-width rounded rectangle that resembles a text input.
- Keep the focused heading width close to content width and maintain strong contrast.

### Acceptance criteria

- The first viewport answers the six core employee questions defined in the phase gate.
- The layout resembles the approved hierarchy without copying impossible values.
- No new UI framework or duplicated primitive is introduced.
- Desktop and narrow layouts preserve the same semantic reading order.

---

## `WL-1303` — Implement attendance-state and clock-action behavior

### Goal

Make every attendance state obvious, operable, resistant to duplicate mutations, and recoverable after failure.

### Required states

Provide UI stories, tests, and production behavior for:

- Not working
- Clock-in pending
- Working
- Start-break pending
- On break
- Resume pending
- Clock-out pending
- Workday completed
- Multiple-session completed day
- Previous record unresolved and non-blocking
- Previous record unresolved and blocking, if supported by domain policy
- Stale state or version conflict
- Duplicate/idempotent response
- Network failure after request may have reached server
- Offline before request
- Session expired
- Permission revoked or employee deactivated
- Generic server error

### Action hierarchy

- Not working: `Clock in` primary.
- Working: `Start break` primary; `Clock out` secondary.
- On break: `Resume work` primary; end-workday action secondary only if domain permits it.
- Completed: `Review today` or equivalent; allow another session only if policy permits.
- Blocking unresolved record: recovery action replaces ordinary attendance actions.

### Mutation behavior

- Use server-issued truth after every mutation.
- Send and preserve idempotency keys according to existing API conventions.
- Disable only the affected action group while pending.
- Prevent double activation from pointer, keyboard repeat, retry, or two open tabs.
- After an ambiguous network failure, query server state before inviting the user to retry.
- Handle stale-state conflicts with clear copy and an immediate refresh/reconcile path.
- Do not show success solely in a transient toast; update persistent state.

### Focus and announcements

- Keep focus in the clock-action area after a routine state change.
- Announce one concise result, for example: `Break started at 12:45 PM.`
- Do not place the running duration in a live region.
- Do not re-announce the whole summary card after every minute update.
- Restore focus predictably after dialogs used only for exceptional flows.

### Confirmations

Do not require confirmation for normal clock in, break, resume, or clock out. Use confirmation only for a documented exceptional case, such as ending the workday while on break or resolving an abnormal overnight record.

### Acceptance criteria

- Every valid state exposes only valid actions.
- Every invalid transition is rejected by the server and represented clearly.
- Duplicate and ambiguous requests never create duplicate punch events.
- Keyboard-only completion and failure recovery pass.

---

## `WL-1304` — Clarify daily progress and flex-time semantics

### Goal

Present the employee’s workday in their natural mental model without losing accounting transparency.

### Main display hierarchy

While a workday is open, emphasize:

1. Worked today.
2. Expected today.
3. Remaining scheduled time.
4. Estimated finish, when reliable.
5. Break time.

Display posted flex-time balance separately with an explicit posted-through date.

### Rules

- Do not use the large provisional daily difference as the main metric.
- `−4h 45m` during an open day may appear only in calculation details with conditional wording such as `If you clocked out now` or `Provisional difference`.
- Do not trigger a negative posted-balance warning from the unfinished day alone.
- If the posted balance itself is below a policy threshold, show:
  - posted balance
  - posted-through date
  - configured threshold where policy allows
  - direct link to balance history
- Distinguish `worked`, `break`, `credited`, `expected`, and `remaining`.
- Use employee language on the surface; reserve ledger terminology for details.

### Estimated finish

Show only when:

- the employee is working or on break
- the schedule and remaining expected minutes are known
- unresolved records do not make the result unreliable
- any required future break handling is accounted for or the assumption is stated

Suggested accessible copy:

- `Estimated finish: 5:30 PM`
- description: `Assumes no additional break.`

If the estimate is unreliable, omit it and optionally explain why in details. Never show a plausible-looking fabricated time.

### Progress visualization

- Use a semantic progress component only as a supplement to text.
- Provide an accessible name and current/max values.
- Do not encode overtime, deficit, or completion with color alone.
- Avoid celebratory treatment for working beyond expected hours.

### Acceptance criteria

- A user does not interpret an unfinished normal day as flex-time debt.
- Posted balance remains understandable when today is incomplete.
- Worked and credited values are both available without being conflated.

---

## `WL-1305` — Rebuild timeline and calculation details

### Goal

Provide enough evidence for trust and correction without turning the Today page into technical documentation.

### Timeline requirements

- Use a semantic ordered list or equivalent accessible event structure.
- Show local event time, event label, concise consequence, and status where relevant.
- Mark the current session textually, not with color alone.
- Preserve recorded event order for equal timestamps.
- Expose correction status without overwriting the original event.
- When useful, show derived intervals between events.
- Provide direct but permission-safe entry points for:
  - Add missed entry
  - Request correction
  - View correction history
- Do not provide direct destructive editing of raw punch events.

### Default copy

Keep the intro concise, for example:

- `Tuesday, August 11 · Europe/Berlin`

Move detailed explanations about audit history and identical timestamps to contextual help or the correction workflow.

### Calculation details

Use an actual disclosure with clear expanded/collapsed state. In the expanded region show a semantic table or description structure:

- Work sessions
- Unpaid breaks
- Paid absence credit
- Approved adjustments
- Credited today
- Expected today
- Provisional difference

Rules:

- Summary and detail values must reconcile.
- Negative values include a visible minus sign and accessible wording.
- Do not use a large empty bordered card when collapsed.
- Keep details near the metric they explain.
- Announce disclosure state through native/React Aria behavior, not custom text only.

### Acceptance criteria

- An employee can explain how the displayed result was produced.
- Original and corrected facts remain distinguishable.
- The timeline remains usable at 320 CSS pixels and 200% zoom.

---

## `WL-1306` — Make Needs attention and recovery actionable

### Goal

Show only real, understandable, recoverable issues.

### Attention-item contract

Each item must include:

- stable code
- concise title
- affected date or period when relevant
- plain-language explanation
- severity
- blocking/non-blocking state
- permitted action
- destination or mutation
- status after action

### Supported issue patterns

At minimum test:

- Missing clock-out
- Open or incomplete previous session
- Overlapping or impossible interval awaiting correction
- Correction returned for changes
- Correction rejected with decision available
- Break-policy warning
- Submitted month blocked by incomplete record
- Posted flex-time threshold crossed
- Server calculation temporarily unavailable

### Display rules

- Hide the entire section when there is no issue, unless a small neutral confirmation provides genuine value.
- Do not label a normal in-progress daily difference as a warning.
- Every displayed issue must have a clear CTA such as:
  - `Fix entry`
  - `Review request`
  - `View balance history`
  - `Resolve record`
- Do not expose sensitive absence subtype or medical information in generic attention items.
- Use assertive live announcements only when a new urgent issue appears during the session. Do not announce static warnings assertively on every route load.

### Recovery behavior

- Preserve entered correction data after recoverable API errors.
- Explain when a record cannot be changed because it is submitted, approved, or locked.
- Route locked-period changes through the approved adjustment workflow.
- Return focus to the resolved issue or next logical heading after completion.

### Acceptance criteria

- No attention item is informational dead weight.
- Blocking status is explicit.
- Recovery flows preserve audit and permission rules.

---

## `WL-1307` — Today sub-gate: responsive, accessibility, usability, and visual validation

### Goal

Do not spread the new patterns across the application until the core attendance slice is proven.

### Required viewports

Validate at minimum:

- 1440×900
- 1024×720
- 768×1024
- 390×844
- 320 CSS-pixel width

### Responsive requirements

- No horizontal page scrolling.
- Summary zones stack in semantic order.
- Clock actions remain prominent and meet touch-target requirements.
- Long localized labels and long employee names do not overlap controls.
- Timeline times and descriptions reflow without losing association.
- Calculation rows remain readable without clipping signs or units.
- Sidebar/navigation behavior follows the existing application shell pattern and does not obscure the primary action.

### Accessibility validation

- Semantic landmarks and one clear H1.
- Logical heading order.
- Keyboard operation for every action and disclosure.
- Visible, consistent `:focus-visible` styling.
- Predictable focus after route change, mutation, dialog, error, and recovery.
- Concise live announcements.
- No timer spam.
- Correct labels/descriptions/errors.
- 200% zoom and reflow.
- Forced-colors mode.
- Reduced motion.
- Status not communicated by color alone.
- Automated axe plus manual review with at least one desktop screen reader and one mobile or secondary screen-reader setup documented by the project.

### Usability script

Without coaching, a reviewer must answer within a few seconds:

1. Am I clocked in?
2. When did the current session start?
3. How much have I worked today?
4. How much scheduled work remains?
5. What can I do next?
6. Is there a real problem requiring action?

Then complete:

- Start break
- Resume work
- Clock out
- Add a missed entry
- Request a correction
- Open calculation details

Record confusion, wrong clicks, terminology questions, and recovery failures.

### Visual comparison

Compare against the reference for hierarchy, not pixel identity. Reject regressions where:

- provisional difference becomes dominant
- flex balance merges with today progress
- actions move below secondary details
- warning cards dominate without a real blocking issue
- H1 focus resembles a form field

### Sub-gate

`WL-1307` passes only when no P0 or P1 Today issue remains. Secondary route work may begin afterward.

---

## `WL-1308` — Simplify and prioritize Approval inbox

### Goal

Make manager work visible before advanced filtering controls.

### Instructions

- Default to actionable records, not all records.
- Provide primary views such as:
  - Needs review
  - Waiting
  - Completed
- Include counts when reliable.
- Keep the most common filters visible:
  - workflow type
  - team
  - employee search where useful
- Move date range, sort direction, and less common controls into `More filters` or an equivalent disclosure.
- Preserve filters, sorting, pagination, and primary view in URL state.
- Use `Review` only for actionable records. Use `View` for waiting or completed records.
- Add submitted age or relative urgency without relying on color alone.
- Replace `Page 3 of 3. 25 approvals.` with a range such as `Showing 21–25 of 25`.
- Show horizontal-scroll guidance only when the container actually overflows.
- On narrow screens, either:
  - preserve a carefully prioritized accessible table, or
  - use record cards with the same information and actions
- Keep absence subtype privacy and manager-scope authorization unchanged.

### Acceptance criteria

- Actionable work appears in the first viewport.
- A manager can distinguish needs-review, waiting, and completed records immediately.
- Filter changes are keyboard usable, URL-restorable, and announced without noisy full-page updates.
- Every row exposes the correct action for its state.

---

## `WL-1309` — Improve Team status

### Goal

Turn status summaries and unresolved-record badges into useful navigation and action.

### Instructions

- Make overview counts filter the direct-report list when technically and semantically appropriate.
- Preserve a visible selected-filter state and URL state if the route already uses URL-owned filters.
- Give unresolved records an explicit action or linked destination.
- Make employee identity a standard link when a permitted detail route exists.
- Replace `No current team` with clearer copy such as `Team not assigned` when this reflects an administrative gap.
- Distinguish current availability from record quality.
- Keep unavailable reasons privacy-safe.
- Clarify workspace/navigation naming:
  - workspace: `Manager` or `My team`
  - route: `Team status` or `Overview`
  Avoid `Team` as both workspace and route label.
- Verify former-manager and unrelated-manager access remains denied.

### Acceptance criteria

- Counts are more than decoration.
- Every problem badge leads to a permitted next step.
- Labels describe the user’s task rather than the internal information architecture.

---

## `WL-1310` — Improve employee and team administration

### Goal

Make common administration tasks obvious while keeping historical integrity and dense data readable.

### Employee directory

- Promote `Add employee` to the page-level primary button.
- Add search by supported fields, preferably:
  - name
  - email
  - employee number
  - team
- Keep employment-status filtering.
- Expose a clear row action:
  - linked employee name
  - explicit `View employee`
  - secondary row menu only for genuinely secondary actions
- Preserve pagination and URL state.
- Ensure long names, numbers, roles, and localization reflow.

### Teams

- Move team creation, membership summary, and deactivation to a dedicated Teams route under People administration.
- Do not combine the employee directory and full team administration on one long page.
- Preserve existing constraints that prevent deactivation while current assignments remain.
- Present remediation directly, for example move members or end assignments before deactivation.

### Copy

Replace architecture-oriented prose with task-oriented copy. Examples:

- Instead of `Manage employee lifecycle records without rewriting employment, account, role, or attendance history`, use `Add employees, manage employment details and roles, and deactivate accounts when employment ends.`
- Instead of explaining manager-scope internals on the Teams card, use `Teams organize employees. Manager access is controlled separately through reporting relationships.`

Keep precise historical-integrity details in contextual help or documentation.

### Acceptance criteria

- Primary administration actions are obvious.
- Employee and team tasks have distinct routes.
- Historical records are never deleted or silently rewritten.
- Narrow layouts remain operable without hiding row actions.

---

## `WL-1311` — Normalize cross-route interaction and copy patterns

### Goal

Remove repeated interface noise and make related surfaces behave consistently.

### Navigation

Review role-aware labels. Recommended direction:

- My work
- Manager
- People administration
- System administration

Within Manager:

- Team status
- Approvals
- Team calendar
- Team reports

Within My work:

- Today
- My time
- My balances
- Requests
- Calendar
- My reports

Use repository terminology where already ratified, but remove ambiguous duplicate labels.

### Microcopy

Create or update a small product-language reference covering:

- worked
- credited
- expected
- remaining
- provisional
- posted
- locked
- correction
- unavailable
- needs review
- waiting

Rules:

- Employee surfaces lead with plain language.
- Accounting/domain terms remain available in details.
- Avoid sentences that merely describe what the UI already enforces.
- Avoid legalistic audit explanations in high-frequency screens.
- Keep errors actionable and specific.

### Focus and heading treatment

- Maintain route focus.
- Use `:focus-visible` where appropriate.
- Prevent H1 focus treatment from resembling a text input.
- Verify focus does not disappear in forced colors.

### Tables and overflow

- Remove always-visible `Scroll horizontally...` copy.
- Detect or style overflow accessibly.
- Give scroll regions an accessible name when they require keyboard focus.
- Keep identity and action columns discoverable.
- Use cards on narrow screens only when the semantic relationships remain clear.

### Visual density

- Reduce large empty bordered surfaces.
- Avoid making every section a card of equal priority.
- Keep employee screens spacious and manager/admin data views appropriately dense.
- Preserve clear hit areas and contrast.

### Acceptance criteria

- Equivalent states use equivalent labels, colors, icons, and actions.
- Navigation does not duplicate ambiguous names.
- Technical copy is moved to details without removing necessary transparency.
- Overflow instructions appear only when useful.

---

## `WL-1312` — Complete cross-route regression coverage

### Goal

Prove that remediation did not weaken permissions, domain correctness, accessibility, or operational reliability.

### State/story matrix

Create deterministic stories or equivalent fixtures for all major states of:

- Today
- Approval inbox
- Team status
- Employee directory
- Teams administration
- Shared page heading/focus
- Status badges
- Table overflow
- Loading, empty, permission, session-expired, stale-state, offline, and generic-error surfaces

### Automated coverage

- Unit/selector tests for display contracts.
- API integration tests for mutations and permission scope.
- Component tests for labels, errors, focus, and disclosures.
- Playwright tests for critical workflows.
- axe checks on representative states.
- Deterministic visual screenshots at the required viewports.
- Avoid brittle snapshots of uncontrolled current time; freeze time.

### Critical flows

At minimum:

1. Clock in → break → resume → clock out.
2. Ambiguous network failure followed by server reconciliation.
3. Stale state from another tab/device.
4. Add missed entry and submit correction.
5. Manager opens Needs review, filters, and resolves an actionable item.
6. Manager filters Team status and opens an unresolved record.
7. Administrator searches and opens an employee.
8. Administrator creates a team and encounters a protected deactivation constraint.

### Manual review

- Keyboard-only.
- Screen reader.
- 200% zoom and 320 CSS-pixel reflow.
- Touch target and mobile reachability.
- Forced colors.
- Reduced motion.
- Copy comprehension.

### Acceptance criteria

- No open P0 or P1 UX defect.
- No permission regression.
- No contradiction between summary and detail values.
- Visual differences are reviewed, not blindly accepted.

---

## `WL-1313` — Phase 13 release gate

### Goal

Ship only after correctness, comprehension, accessibility, and documentation evidence are complete.

### Required work

- Run the repository definition of done.
- Run all format, lint, typecheck, unit, integration, component, E2E, accessibility, visual, and build checks.
- Re-run the six-question Today usability script.
- Compare final Today screen with the approved reference and document intentional differences.
- Confirm all visible metrics in final screenshots reconcile.
- Confirm screenshots contain no private or unstable test data.
- Update:
  - `PROJECT_STATUS.md`
  - `TODO.md`
  - `docs/07-roadmap.md`
  - `docs/08-task-board.md`
  - UX/accessibility notes
  - release notes/changelog
  - README screenshots where applicable
  - known limitations
- Mark tasks complete only with linked evidence.
- Bump all workspace manifests from `0.13.0` to `0.14.0` after every gate passes.
- Verify lockfile consistency and clean CI after the version bump.

### Release blockers

Do not release with:

- contradictory times or durations
- current-day provisional deficit presented as posted debt
- non-actionable warning cards
- duplicate punch risk
- unhandled ambiguous network result
- inaccessible clock action
- missing focus recovery
- unauthorized manager/admin data access
- permanent overflow instructions that do not match the actual layout
- unreviewed visual-regression changes

---

# 5. Today page content contract

## Header

- Date eyebrow: localized full date.
- H1: `Today`.
- Description: one concise sentence.

## Current status zone

Display:

- state label
- current session start, when applicable
- current session elapsed time, when applicable

Do not show:

- a misleading current-session timestamp when the value is actually the first clock-in
- a running timer in a live region

## Today zone

Primary:

- worked today

Supporting:

- break time
- expected time
- remaining time
- estimated finish when reliable

## Flex-time zone

Display:

- posted balance
- posted-through date
- note that today is in progress when applicable

Never merge this value with provisional current-day difference.

## Actions

- Primary state action
- Secondary state action
- Missed-entry/correction actions only when permitted

## Needs attention

- Only real actionable items
- Clear CTA
- Explicit blocking state

## Timeline

- Events in recorded order
- Current-session marker
- Correction/history indication
- Compact totals

## Calculation details

- Secondary disclosure
- Reconciled source rows
- Provisional difference at the bottom

---

# 6. Definition of UX success

A new employee should not need to understand ledger terminology to use Today. They should see their current state, take the next valid action, understand how much they have worked, know what remains, and recognize any real issue.

A manager should see work requiring action before filter mechanics.

An administrator should find primary create/search/open actions without reading implementation-oriented explanations.

Accessibility remains a baseline, but this phase treats cognitive clarity and trustworthy data presentation as accessibility requirements as well.
