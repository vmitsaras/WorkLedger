# 102. WCAG 2.2 AA accessibility audit

## Status and claim boundary

`WL-1002` remains in progress. Automated checks and code-based interaction tests provide strong
regression evidence, but they do not constitute a full WCAG 2.2 AA conformance audit. WorkLedger does
not currently claim WCAG conformance.

## Executable evidence

- Component and end-to-end suites run axe rules tagged for WCAG A/AA.
- Chromium critical-flow tests cover keyboard operation, focus restoration, route announcements,
  validation, forced colors, reduced motion, 320 CSS-pixel reflow, touch targets, and equivalent
  calendar/list presentations.
- The `@browser-matrix` smoke test now runs the sign-in baseline with axe in desktop Firefox, desktop
  WebKit, mobile Chromium, and mobile WebKit as well as Chromium.
- CI installs Chromium, Firefox, and WebKit so those projects cannot silently be skipped.

These checks detect regressions in the scenarios they exercise. Axe cannot assess every success
criterion, and Playwright browser engines are not substitutes for testing released browsers with real
assistive technologies.

## Manual evidence still required

Before `WL-1002` can be marked complete, record tester, date, operating system, browser and assistive-
technology versions, scenario, result, and issue link for at least:

- VoiceOver with current Safari on macOS and iOS;
- NVDA with current Firefox and Chrome or Edge on Windows;
- keyboard-only completion of employee, manager, HR, and administrator critical flows;
- 200% and 400% zoom/reflow, forced colors, reduced motion, and text-spacing overrides in released
  browsers;
- error identification, status announcements, tables, dialogs, calendars, and timeout/recovery paths;
- a WCAG 2.2 A/AA success-criterion applicability and evidence map.

Any blocker found must be remediated and regression-tested. `D-502` remains open until the exact
supported browser matrix and Temporal/polyfill behavior are revalidated.
