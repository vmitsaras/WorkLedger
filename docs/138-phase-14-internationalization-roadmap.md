# Phase 14 Internationalization and Multilingual Product Roadmap

**Status:** Active; `WL-1400` through `WL-1402` complete; `WL-1403` next
**Tasks:** `WL-1400` through `WL-1410`
**Dependency:** Completed Phase 13 gate `WL-1313` at workspace version `0.14.0`
**Gate version:** `0.15.0`

## 1. Outcome

Phase 14 makes WorkLedger coherent and usable in British English, German, and Spanish across every
user-facing application and generated-output surface. The phase must preserve the product's
existing domain, authorization, privacy, accessibility, audit, timezone, immutable-history, and
self-hosting contracts. Translation is presentation work; it does not authorize localized domain
codes, jurisdiction-specific policy behavior, or duplicated sources of truth.

This document began as the roadmap and implementation handoff. `WL-1400` accepted ADR 0013 and
recorded the route and output audit, risk register, API prose boundary, and glossary structure.
`WL-1401` has now established the typed locale contract, private i18n package, local catalogs,
formatters, React/React Aria synchronization, automated catalog checks, and separate locale-chunk
budgets. `WL-1402` adds authoritative account and invitation locale persistence, the bounded
signed-out device preference, accessible selectors, and immediate switching with rollback.
`D-508` resolved the measured non-catalog conflict through a separately named and tested Phase 14
runtime allowance that anticipates activation of the already-pinned translation engine.

## 2. Locked product and architecture instructions

### Locales and precedence

- Supported production locales are exactly `en-GB`, `de-DE`, and `es-ES`.
- `en-GB` is the source and runtime fallback locale.
- German and Spanish cannot ship without documented fluent-human review.
- An authenticated account's saved locale is authoritative.
- Signed-out pages use a non-sensitive device preference, then the first supported match from the
  browser language list, then `en-GB`.
- Existing accounts migrate to `en-GB`. Employee and technical-account invitation flows select an
  initial locale and default to `en-GB`; the account owner may change it later.
- A protected route must load the account locale before mounting the authenticated shell. A locale
  change must not reset the current route, safe URL state, form state, or focus.

### Ownership and package boundaries

- Add one internal `@workledger/i18n` package only after `WL-1400` accepts the supporting ADR. It
  owns typed catalogs, locale resolution, message rendering, and locale-aware formatting shared by
  web and API output surfaces.
- Pin currently supported stable `i18next` and `react-i18next` releases during `WL-1401`. Beta,
  canary, release-candidate, runtime CDN, and translation-SaaS dependencies are prohibited.
- Keep `@workledger/ui` independent of the translation library. Shared components receive labels,
  titles, descriptions, and fallback actions from their caller rather than importing application
  catalogs.
- Keep domain and database packages free of UI language. Contracts may expose supported locale
  values and bounded message descriptors, but not translated domain rules.
- Store catalogs in the repository and load only the resolved locale. No runtime catalog download,
  translation telemetry, or second remote source of truth is permitted.

### Message and formatting contract

- The server continues to select Today attention severity, action, destination, and recovery
  meaning. Replace server-authored display prose with bounded typed message descriptors and safe
  parameters; do not make the browser infer meaning from values or generic status codes.
- Apply the same descriptor boundary to API and field errors, report catalog presentation,
  notifications, and structured browser/platform summaries where current DTOs carry English prose.
- Render dates, times, numbers, lists, and integer-minute durations with the resolved locale and the
  authoritative domain timezone. Do not introduce JavaScript `Date` arithmetic or floating-point
  hours.
- Synchronize React, React Aria, document title, `<html lang>`, and `<html dir>` before displaying a
  changed locale. Keep direction handling wired even though the three shipped locales are LTR.
- Never interpolate untrusted HTML. Organization, employee, team, schedule, holiday, absence-type,
  and reason text remains user-authored content and must be rendered verbatim through safe text
  bindings.

## 3. Required scope

- Shared UI defaults, page and route titles, focus targets, navigation, authentication, profile,
  validation, error summaries, dialogs, status labels, accessible names, descriptions, and live
  announcements.
- Employee Today, attendance, time, balances, records, corrections, requests, absences, calendars,
  notifications, and monthly-review workflows.
- Manager Approval inbox/detail, Team status/calendar, filters, decisions, and recovery states.
- HR employee/team administration, time/absence/holiday settings, reports, domain audit, and dense
  data surfaces.
- System account/session administration, operations, and technical audit presentation.
- Monthly print, report clipboard summaries, CSV headings and status values, in-app notifications,
  invitation and password-reset communication, and optional notification email.
- Loading, empty, stale, success, warning, permission-denied, session-expired, offline, and
  dependency-error states for every translated workflow family.

CSV dates remain ISO date values and durations remain integer minutes. Localized headings and enum
labels must still pass the existing formula-neutralization, row/byte limit, authorization,
purpose-minimization, filename, and audit contracts. OpenAPI descriptions, logs, audit codes,
internal exceptions, and identifiers remain language-neutral or technical English and are not
presented as translated product UI.

## 4. Deferred and excluded scope

- RTL production content or an additional shipped locale.
- Translation of the README, public repository documentation, or a future portfolio site.
- External translation-management platforms or runtime catalog administration.
- User-authored translation overrides, arbitrary rich-text translations, or custom organization
  dictionaries.
- Per-employee timezone display, jurisdiction-specific legal policy, payroll, or localized domain
  behavior.
- Translation of organization-entered names, notes, reasons, or historical free text.

Any addition to the supported locale list or expansion into RTL requires a later accepted decision
and its own content, layout, accessibility, output, and operational evidence.

## 5. Ordered task roadmap

| ID | Outcome | Dependency | Required evidence |
|---|---|---|---|
| `WL-1400` | Complete the user-facing copy/output inventory and accept the locale, message-ownership, formatting, catalog, and bundle ADR. | `WL-1313` | Canonical route/output inventory, API prose map, glossary structure, risks, and accepted ADR. |
| `WL-1401` | Establish the typed local i18n foundation and explicit locale loading/resolution contract. | `WL-1400` | Key typing, initialization, fallback, direction, unsupported-locale, and bundle tests. |
| `WL-1402` | Persist and expose per-account locale choice with a bounded signed-out preference and accessible controls. | `WL-1401` | Migration, self-context, invitation, CSRF, authorization, cache, focus, and failure evidence. |
| `WL-1403` | Make user-facing API presentation descriptor-driven and language-neutral. | `WL-1401`, `WL-1402` | Contract/OpenAPI and integration evidence for attention, errors, reports, notifications, and device summaries. |
| `WL-1404` | Translate the shared UI, authentication, shell, route, navigation, profile, dialog, validation, and announcement foundation. | `WL-1402`, `WL-1403` | Shared component, route-title, focus, language-switch, and accessibility tests in all locales. |
| `WL-1405` | Translate every employee workflow and required state. | `WL-1404` | Critical employee flows, formatting, plural, recovery, component, and browser evidence. |
| `WL-1406` | Translate every manager, HR, and system workflow and required state. | `WL-1404` | Cross-role filter, table/list, decision, administration, audit, error, and responsive evidence. |
| `WL-1407` | Localize generated and outbound user-facing output. | `WL-1402`–`WL-1404` | Print, clipboard, CSV, notification, invitation, reset, email, privacy, and security tests. |
| `WL-1408` | Complete, validate, and human-review all three catalogs. | `WL-1405`–`WL-1407` | Key/interpolation/plural parity, pseudo-locale evidence, glossary approval, and one fluent reviewer per non-English locale. |
| `WL-1409` | Complete the multilingual product-quality and upgrade gate. | `WL-1408` | Cross-role integration, visual, accessibility, usability, security, migration, and no-mixed-language evidence. |
| `WL-1410` | Sign the Phase 14 gate and advance the workspace to `0.15.0`. | `WL-1409` | Clean full quality gate and synchronized roadmap, status, evidence, operations, and manifests. |

## 6. Security, privacy, and data instructions

- Locale mutation is authenticated, same-origin, current-account-only, allowlisted, and
  CSRF-protected. It grants no domain permission and cannot alter another account.
- Locale is a non-sensitive display preference. Device persistence is allowed, but it must not
  contain identity, role, request, employee, or workflow data.
- A preference change is not a domain or security decision and does not create domain/security
  audit noise. Ordinary request IDs, safe error mapping, no-store account responses, and redacted
  operational logging still apply.
- Notification and email translation uses the authoritative recipient account locale. Report CSV
  uses the current authorized actor locale after export permission and scope are re-evaluated.
- Translation keys, parameters, logs, URLs, browser storage, and output must not reveal sickness
  classification, notes, decision reasons, entitlement detail, or protected identifiers beyond the
  already authorized surface.
- Missing or invalid database locale values are integrity failures; unsupported signed-out device
  values are discarded and resolved through the documented fallback order.

## 7. Accessibility and content-review instructions

- Language switching keeps focus on the initiating control and announces success or failure once.
- Route changes retain the established title and focused-`h1` contract in the resolved language.
- React Aria internal strings and locale-sensitive behavior use the same resolved locale as product
  copy.
- German and Spanish must pass keyboard completeness, focus visibility/order, live-region
  behavior, text spacing, 200% zoom, 320 CSS-pixel reflow, forced colors, reduced motion, touch
  targets, and representative screen-reader review.
- Use a non-production pseudo-locale to expose clipped, concatenated, hard-coded, and
  interpolation-fragile content. The pseudo-locale is never accepted in storage or production API
  contracts.
- One fluent reviewer for German and one for Spanish must approve the terminology glossary,
  attendance and flexible-time concepts, absence privacy language, approvals, errors, destructive
  actions, and critical workflow instructions before `WL-1408` completes.

## 8. Automated and manual gate

- Add an `i18n:check` command during implementation to enforce supported locales, key parity,
  interpolation parameters, plural forms, descriptor coverage, and prohibited hard-coded
  user-facing JSX/ARIA text.
- Keep the existing English suite and add German and Spanish critical-flow coverage for sign-in,
  Today clocking, requests, approval decisions, administration, reports/CSV, notifications, and
  locale changes.
- Verify signed-out detection, account override, sign-in/sign-out, refresh, multi-device
  persistence, invalid preference recovery, and failed-save behavior.
- Verify localized invitation, password-reset, notification-email, print, clipboard, and CSV output
  while preserving existing security and data-shape invariants.
- Preserve the 910,000-byte raw and 246,000-byte gzip application baseline and enforce `D-508`'s
  separate 55,000-byte raw and 18,000-byte gzip internationalization-runtime allowance. Keep the
  existing largest-chunk and CSS ceilings. Budget each locale chunk at no more than 150 KiB raw
  and 50 KiB gzip, with no more than 450 KiB raw and 150 KiB gzip across the three locale chunks.
  Split catalogs instead of eagerly bundling them.
- Before `WL-1410`, run the complete repository quality gate specified by `AGENTS.md`, record exact
  results, and retain any environment-dependent residual without converting it into a pass.

## 9. Phase 14 release gate

- [ ] Every canonical route, role, state, and user-facing output has catalog coverage.
- [ ] `en-GB`, `de-DE`, and `es-ES` have matching keys, interpolation parameters, and plural forms.
- [ ] German and Spanish have dated fluent-human terminology and privacy review.
- [ ] Account and signed-out locale precedence works across sign-in, sign-out, refresh, and devices.
- [ ] Protected routes do not flash a prior or device locale before the account locale is applied.
- [ ] Document title, `lang`, `dir`, React, and React Aria remain synchronized.
- [ ] Locale-aware formatting uses authoritative timezone facts and integer-minute semantics.
- [ ] Today attention, errors, reports, notifications, and device summaries are descriptor-driven.
- [ ] Print, clipboard, CSV, notification, invitation, reset, and email output preserve existing
  authorization, privacy, formula-neutralization, and data-minimization rules.
- [ ] Keyboard, screen-reader, zoom/reflow, forced-colors, reduced-motion, responsive, visual,
  usability, security, migration, and upgrade evidence passes for all shipped locales.
- [ ] No mixed-language workflow or open P0/P1 defect remains.
- [ ] The complete repository quality gate passes and documentation is current.
- [ ] `WL-1410` alone advances every workspace manifest from `0.14.0` to `0.15.0`.

## 10. Current state and next action

`WL-1400` through `WL-1403` are complete. ADR 0013 is accepted and amended by the resolved `D-508`.
The canonical inventory and risk register are in
`docs/139-phase-14-internationalization-architecture-audit.md`, and the translation-review structure
is in `docs/140-phase-14-translation-glossary.md`. The executable runtime foundation and measured
bundle evidence are in `docs/141-shared-i18n-foundation.md`. Account, invitation, and device locale
evidence is in `docs/142-account-locale-preferences.md`.

`WL-1404` is complete. The shared shell, canonical route titles, route-state boundaries,
authentication, Profile, shared validation, dialogs, pagination controls, and shell announcements
now use typed local catalogs while preserving established focus and recovery contracts. Profile
session instants use the authoritative organization timezone supplied by the minimized self-profile
contract. See `docs/144-shared-shell-route-i18n.md`. `WL-1405` is next and owns employee workflow
translation.
