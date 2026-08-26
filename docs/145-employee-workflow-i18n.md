# Employee workflow localization

**Task:** `WL-1405`  
**Status:** Complete  
**Date:** 2026-08-26  
**Workspace version:** `0.14.0`

## Completed scope

Employee-facing workflows now resolve their visible, status, recovery, validation, action,
document-title, accessible-name, and announcement copy from the active typed catalog for `en-GB`,
`de-DE`, and `es-ES`.

- Today covers current attendance, permitted clock actions, optimistic and uncertain outcomes,
  progress, posted balance, timeline, calculation evidence, and actionable attention.
- My time, My balances, and daily records cover filters, navigation, totals, sessions, punch events,
  calculation state, issue recovery, and correction entry points.
- Request history, request selection and detail, vacation, sickness, corrections, and cancellations
  use catalog-backed workflow names, statuses, decisions, fields, validation, recovery, and
  privacy guidance.
- Personal calendar and notifications cover view controls, dates, counts, generic outcomes,
  availability, empty states, and safe recovery.
- Monthly review covers readiness, totals, daily rows, submission/review/lock states, post-lock
  adjustment evidence, decision history, print preparation, and the integrated print view.
- Employee detail-route document titles use the same locale runtime as route headings. Product
  names and user-authored values remain invariant data rather than translated copy.

`WL-1407` still owns CSV, clipboard, notification email, invitation, and password-reset output.
The monthly print view was included here because it is rendered and initiated directly inside the
translated monthly employee workflow.

## Formatting and message ownership

- Typed message keys cover 1,043 catalog messages with exact key, parameter, and plural parity
  across all three production locales.
- Shared locale formatters render date-only values without timezone conversion, instant values
  with an explicit timezone, and signed or unsigned integer-minute durations without floating
  point hours.
- Workflow status, attendance event, request action, attention descriptor, and presentation-code
  maps are exhaustive. UI code does not humanize server enums or infer domain meaning from prose.
- The source-copy checker now governs 20 employee route/component sources, including visible JSX
  and accessible-name attributes.

## Accessibility

- Existing focused route headings, real links and buttons, semantic lists/tables, named regions,
  error summaries, dialog focus restoration, and polite outcome announcements remain intact.
- German and Spanish component coverage verifies Today, request history, personal calendar, and
  monthly review, including document language and axe checks.
- Browser coverage traverses Today, My time, request history, personal calendar, and monthly review
  in German and Spanish and verifies focused headings, critical actions/states, document language,
  and representative axe checks.
- Status and calculation meaning remains available through text and structure rather than color.
  Durations are formatted as complete text units instead of language-fragile string concatenation.

## Security and data

- No authorization, API permission, workflow transition, database schema, migration, audit policy,
  CSRF behavior, or immutable attendance/monthly record changed.
- Sickness and notification presentation remains minimized. Catalog parameters contain only the
  already-authorized values required by each view, and interpolation remains plain text.
- Today, daily records, notifications, and monthly records format instants with their
  server-provided organization timezone. Request list and non-correction request-detail contracts
  do not yet carry an authoritative presentation timezone, so those submission/history instants
  retain the existing client-timezone fallback. Closing that response-contract gap remains part of
  the Phase 14 end-to-end formatting review rather than an inferred timezone change in this slice.

## Bundle contract

The completed production graph measures 985,603 raw and 260,782 gzip bytes of non-catalog
JavaScript. Required employee localization integration exceeded the previous combined raw ceiling
by 5,603 bytes. ADR 0013 and `D-508` therefore extend only the named Phase 14 raw localization
allowance from 70,000 to 76,000 bytes; the preserved 910,000/246,000-byte application baseline,
22,000-byte gzip allowance, largest-chunk, CSS, and locale-catalog limits remain unchanged.

The build emits one independently bounded chunk per production locale. The three catalog chunks
total 187,606 raw and 52,529 gzip bytes, within the existing per-locale and aggregate catalog
budgets.

## Verification

- Catalog, workspace, phase-version, boundary, CSS, formatting, ESLint, and strict TypeScript
  checks pass.
- All 48 tooling tests and all 403 unit/component tests pass. The component run retains existing
  non-failing React `act(...)` warnings.
- All 13 environment-independent integration tests pass; 45 PostgreSQL-dependent tests remain
  skipped because the opt-in database service is unavailable.
- The complete browser gate passes 41 scenarios across Chromium plus Firefox, WebKit, mobile
  Chromium, and mobile WebKit smoke projects, with one intentional opt-in historical-capture skip.
- The production web build, executable bundle budgets, and all workspace public-root imports pass.

## Remaining ownership

- `WL-1406`: manager, HR, and system workflows.
- `WL-1407`: external and generated outputs not integrated into monthly review.
- `WL-1408`: pseudo-locale enforcement and named fluent-human German and Spanish review.
- `WL-1409`: complete cross-role multilingual, responsive, accessibility, security, migration,
  and upgrade evidence, including the remaining request-history timezone contract review.
