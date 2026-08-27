# Manager, administration, and system workflow localization

**Task:** `WL-1406`  
**Status:** Complete  
**Date:** 2026-08-27  
**Workspace version:** `0.14.0`

## Completed scope

Manager, HR-administration, and system-administration workflows now resolve visible copy,
document titles, accessible names, validation, states, actions, status feedback, and recovery from
the active typed catalog for `en-GB`, `de-DE`, and `es-ES`.

- Manager coverage includes Approval inbox and detail decisions, Team status, Team calendar,
  report discovery and detail, filters, result summaries, pagination, and report portability
  controls.
- HR coverage includes employee directory and record administration, effective-dated team and
  direct-manager assignments, schedules, time policies, leave entitlements, team administration,
  absence types, public holidays, time settings, and domain audit history.
- System coverage includes accounts, invitations, session administration, operational readiness,
  backup and restore guidance, and redacted technical audit history.
- Bounded presentation-code maps translate approval types and states, attendance punch types,
  entitlement entry types, report warnings, operations states, audit outcomes, roles, known target
  kinds, and known safe-fact labels. Unknown forward-compatible audit identifiers retain the
  existing readable fallback instead of being mistaken for a known translated domain value.
- User-authored names, identifiers, reasons, notes, and other authorized values remain invariant
  data and are interpolated as plain text.

`WL-1407` retains ownership of CSV content, clipboard output, notification email, invitation
delivery, and password-reset communication. This task localizes the on-screen controls that start
or describe those flows, not their generated or recipient-facing output.

## Formatting and message ownership

- Typed parity now covers 1,997 catalog messages across seven namespaces and all three production
  locales. The checker verifies locale, namespace, key, interpolation-parameter, plural, and
  descriptor parity.
- The catalog contract also reads parameter names from typed key declarations and rejects source
  messages that omit those parameters. This prevents a type-safe call site from silently targeting
  an incomplete source message.
- The hard-coded-copy checker now governs 40 route/component sources, including 20 manager, HR,
  system, settings, audit, and report sources added by this task.
- Dates, instants, counts, lists, and integer-minute durations continue through shared
  locale-aware formatters. No JavaScript `Date` arithmetic or floating-point hour calculation was
  introduced.

## Accessibility

- Focused route headings, validation summaries, field-linked errors, semantic regions,
  tables/lists, real links and buttons, keyboard-complete decisions, and polite status feedback
  remain intact.
- Responsive manager, HR, and system coverage verifies the list/table alternatives and horizontal
  containment at 320, 390, and 1440 CSS pixels. The Team calendar keeps an equivalent agenda view
  on narrow screens.
- German and Spanish component tests cover manager approvals, the employee directory, and system
  accounts with document-language and axe assertions.
- German and Spanish browser flows cover responsive approval decisions, HR employee discovery,
  and system operations with focused headings, document language, no page overflow, and
  representative axe checks.
- State meaning remains available in text and structure rather than color alone; redacted audit
  detail and report warnings retain explicit labels.

## Security and data

- No authorization rule, API contract, database schema, migration, transaction, workflow
  transition, immutable record, CSRF behavior, or audit-event policy changed.
- Manager access remains bounded by effective direct-manager assignment. HR and system routes
  retain their separate permission boundaries; translation adds no capability and does not expose
  wider employee or account data.
- Team availability remains neutral and does not expose sickness classification. Technical audit
  facts remain redacted and limited to the already-authorized safe values supplied by the API.
- Report and export controls retain their existing authorization and scope. `WL-1407` owns
  localized generated-output rendering while preserving CSV formula neutralization, privacy, and
  delivery boundaries.

## Bundle contract

The completed production graph measures 1,005,262 raw and 258,138 gzip bytes of non-catalog
JavaScript. Required manager, HR, and system localization adds 19,659 raw bytes to the localized
main chunk compared with `WL-1405`; gzip consumption remains below the prior measured result.
ADR 0013 and `D-508` therefore extend only the named Phase 14 raw localization allowance by a
rounded 20,000 bytes, from 76,000 to 96,000 bytes. The preserved 910,000/246,000-byte application
baseline, 22,000-byte gzip allowance, 500,000-byte largest-chunk limit, 51,000-byte CSS limit, and
locale-catalog limits remain unchanged.

The largest JavaScript chunk is 436,195 bytes and CSS is 50,242 bytes. The three independently
bounded locale chunks total 347,341 raw and 92,891 gzip bytes; the largest locale chunk is 122,434
raw and 32,751 gzip bytes. All application and locale limits pass.

## Verification

- Internationalization, workspace, phase-version, boundary, CSS, formatting, ESLint, strict
  TypeScript, and production/workspace build checks pass.
- All 49 tooling tests and all 407 unit/component tests pass.
- All 13 environment-independent integration tests pass. The 45 PostgreSQL-dependent tests remain
  skipped because the opt-in database service is unavailable in this environment.
- The complete browser gate passes 43 scenarios across Chromium plus Firefox, WebKit, mobile
  Chromium, and mobile WebKit smoke projects, with one intentional opt-in historical-capture skip.
- The production build passes the executable application, i18n-runtime, locale-chunk, CSS, and
  largest-chunk budgets and imports all workspace public roots successfully.

## Remaining ownership

- `WL-1407`: generated and recipient-facing CSV, clipboard, notification email, invitation, and
  password-reset output.
- `WL-1408`: pseudo-locale enforcement plus named fluent-human German and Spanish terminology,
  privacy, and critical-message review.
- `WL-1409`: complete cross-role multilingual, responsive, accessibility, visual, usability,
  security, migration, and upgrade evidence, including the remaining request-history timezone
  contract review.
