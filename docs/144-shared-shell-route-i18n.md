# Shared and authenticated foundation localization

**Task:** `WL-1404`
**Date:** 2026-08-26
**Workspace version:** `0.14.0`

## Completed scope

The shared and authenticated browser foundation now resolves its product and accessibility copy
from the active local catalog for `en-GB`, `de-DE`, and `es-ES`.

- Authentication layout, sign-in, recovery, reset, activation, notices, validation, actions, and
  document titles use typed `auth` messages. Signed-out locale switching renders the exact next
  runtime immediately and restores the previous runtime after persistence failure.
- Profile headings, descriptions, roles, account and employee details, language outcomes, session
  status, device presentation, revoke actions, and announcements use typed `shared` messages.
- The self-profile response now includes the authoritative organization IANA timezone. Session
  instants use the shared locale-and-timezone formatter rather than the browser timezone.
- Shared field-error presentation, form-error summaries, sign-out announcements, pagination
  controls, dialog and drawer close labels, data-table overflow labels, and route-state headings
  no longer synthesize English inside translation-neutral primitives.
- The shared shell, skip link, organization-home accessible name, navigation, canonical route
  titles, startup state, and route boundaries remain catalog backed from the earlier slice.
- Employee, manager, HR, system, and generated-output workflow copy remains assigned to
  `WL-1405`, `WL-1406`, and `WL-1407`.

## Accessibility

- Authentication component evidence covers German and Spanish labels, focused validation
  summaries, localized titles, skip navigation, and axe checks.
- Profile language changes preserve route state and focus while updating visible text, document
  language, document title, React Aria locale, and session presentation together.
- Translation-neutral UI primitives require callers to provide close, pagination, table-region,
  and route-state labels. This prevents inaccessible English defaults from leaking into other
  locales.
- Existing real-link, real-button, dialog naming, focused-heading, polite announcement, and error
  recovery behavior remains intact.

## Security and data

- Locale changes remain current-account-only, CSRF-protected display preferences and create no
  domain or security audit event.
- The new Profile timezone is the existing organization presentation timezone already available to
  authorized account context resolution. It exposes no new identifier, relationship, medical
  detail, session secret, IP address, or raw user agent.
- Catalog interpolation remains plain text. Authorization, session revocation, cache clearing,
  locale rollback, and generic authentication-error behavior are unchanged.

## Bundle contract

The completed shared and authenticated integration measures 974,388 raw and 265,450 gzip bytes of
non-catalog JavaScript under the pinned toolchain. The provisional `D-508` full-engine experiment
did not include this completed integration. ADR 0013 and the executable budget now retain the
910,000/246,000 application baseline while bounding Phase 14 localization runtime and integration
to 70,000 raw and 22,000 gzip bytes. Largest-chunk, CSS, and separately measured locale-catalog
limits are unchanged.

## Verification

- `node scripts/check-i18n.mjs`
- `CI=true pnpm format:check`
- `CI=true pnpm lint`
- `CI=true pnpm typecheck`
- `CI=true pnpm test`
- `CI=true pnpm test:integration`
- `CI=true pnpm test:e2e`
- `CI=true pnpm build`

The catalog contract contains 197 parity-checked messages. The complete local unit/component run
passes 48 tooling tests and 397 Vitest tests, including 17 component files and 125 component cases.
The integration gate passes 13 environment-independent tests and skips 45 PostgreSQL-dependent
tests because the opt-in database is unavailable. The browser gate passes 39 scenarios with one
intentional skip across Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit projects.
