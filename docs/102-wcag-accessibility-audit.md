# 102. WCAG 2.2 AA accessibility audit

## Status and boundary

`WL-1002` remains in progress. Automated checks and code-based interaction tests provide strong
regression evidence, but they do not constitute a full WCAG 2.2 AA conformance audit.
`D-502` remains open until released-browser and assistive-technology evidence is completed.

WorkLedger does not currently claim WCAG 2.2 AA conformance.

## Executable and automated evidence

### Automated checks completed

- `@browser-matrix` smoke route baseline with axe and semantic checks in Chromium, desktop Firefox,
  desktop WebKit, mobile Chromium, and mobile WebKit (`apps/web/e2e/browser-matrix.spec.ts`).
- `WL-406` critical-flow Chromium coverage for keyboard flow completion, focus restoration,
  route announcements, forced colors, reduced motion, 320px reflow, touch targets, and equivalent
  calendar/list behavior.
- `WL-705` manager authorization accessibility review covering focus, error linking, and calendar/table
  keyboard behavior.
- `WL-406` and `WL-705` component coverage for live status channels, pending control behavior, and
  keyboard focus recovery.
- End-to-end and component suites that run axe A/AA checks for each route and form surface touched by
  the reviewed slices.
- Browser smoke matrix defined in `playwright.config.ts`, with dedicated projects for the five required
  engines/devices where `@browser-matrix` tests must execute and fail if skipped.

Automated checks detect regressions in the scenarios they exercise. They do not replace real
assistive-technology usability validation in released browsers.

## Manual evidence runbook (required to close WL-1002)

Complete all rows before marking this task done.

| Section | Flow | Required AT/browser check | Evidence fields to capture |
|---|---|---|---|
| A | Sign-in and employee Today | Keyboard-only completion from sign-in through today actions | Tester/date/OS/browser/AT/version, command sequence, announcements, focus transitions, blocker list |
| B | Attendance and recovery | Clock in, start break, resume, confirmed on-break clock-out, stale state, replay, and dependency error recovery | Same as above |
| C | Approval flows | Unified manager inbox filters, sorting, pagination, decision modal, and keyboard-only decisions | Same as above |
| D | Team and calendar | Team status and month/agenda parity; calendar navigation and empty states | Same as above |
| E | HR administration | Employee and settings forms with validation errors, date handling, and preview/submit/retry cycles | Same as above |
| F | Technical admin | System-account and security-only paths (where available) for denial states and destructive controls | Same as above |
| G | Reports and dense views | Paginated report tables, report print/clipboard paths, timeout and error states at narrow widths | Same as above |
| H | Platform-level | 200%, 400% zoom/reflow, text spacing, forced colors, reduced motion, and touch targets | Same as above |

Each completed row must include:

- Tester name
- Exact date
- OS
- Browser and version
- Assistive technology and version
- Flow and issue list
- Issue link (or `none`) and severity

Any blocker must be remediated, then regression-tested.

## Assisted-technology matrix checklist

Mandatory pairing:

1. macOS + Safari + VoiceOver
2. iOS + Safari + VoiceOver
3. Windows + Firefox + NVDA
4. Windows + Chrome/Edge + NVDA
5. Android + Chrome + TalkBack (or approved equivalent)

For each pairing, complete at least the employee, manager, HR, and administrator critical paths for all core
flows in that section.

## WCAG 2.2 A/AA evidence map

The following criterion families require an explicit evidence link before closure:

- 1.1.1 Text Alternatives
- 1.2.x time-based media (if media is used in tested flows)
- 1.3.1 Info and relationships
- 1.3.3 Sensory characteristics
- 1.4.x Distinguishable output, reflow, and color
- 1.4.11 Non-text contrast
- 1.4.12 Text spacing
- 2.1.1 Keyboard
- 2.1.2 No keyboard trap
- 2.1.4 Character key shortcuts
- 2.2.1 Timing adjustable
- 2.2.2 Pause, stop, hide
- 2.2.3 No timing
- 2.3.1 Three flashes
- 2.4.3 Focus order
- 2.4.7 Focus visible
- 2.4.11 Focus not obscured
- 2.5.5 Target size
- 3.2.1 Predictable navigation
- 3.3.1–3.3.3 Error identification, labels, suggestions
- 4.1.2 Name, role, value
- 4.1.3 Status messages

Attach for each criterion:

- test case and route
- AT/browser pair
- screenshot or log reference
- pass/fail/waived status

## Close condition

`WL-1002` can be marked complete only when:

- the manual runbook above is fully recorded in this file,
- all documented blockers are resolved or formally accepted,
- `D-502` is updated with exact supported-browser versions and Temporal/polyfill behavior,
- and automated checks remain green after any follow-up remediation.
