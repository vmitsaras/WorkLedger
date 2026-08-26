# Account and device locale preferences

**Task:** `WL-1402`  
**Status:** Complete
**Date:** 2026-08-26  
**Workspace version:** `0.14.0`

## Scope completed

WorkLedger now persists an exact supported locale for every account and offers a separate,
low-sensitivity signed-out preference for the current device.

- `auth_users.locale` is a required `varchar(5)` field with an `en-GB` default and a database
  constraint limited to `en-GB`, `de-DE`, and `es-ES`. Existing accounts therefore upgrade to
  `en-GB` without rewriting other account or domain history.
- Self-context and Profile return the authoritative account locale. A same-origin, session-bound
  CSRF-protected `PUT /v1/me/locale` mutation updates only the current account and accepts no
  account identifier or unsupported value.
- Employee and technical-account creation require an initial invitation locale and default omitted
  values to `en-GB`. Invitation reissue and password-reset sender boundaries receive the account's
  stored locale. Localized email rendering remains owned by `WL-1407`.
- The signed-out selector persists only the allowlisted locale under `workledger.locale`. Invalid
  stored values are removed; unavailable browser storage is non-fatal. Resolution then uses the
  first supported browser-language match and finally `en-GB`.

## Runtime precedence and switching

The web composition root resolves self-context before mounting protected UI. An authenticated
account locale is authoritative even when the same device has a different signed-out preference.
The protected shell does not mount until that account catalog is ready, preventing a flash of the
device or fallback language.

Profile and signed-out language controls switch the local catalog, React Aria locale, and document
`lang`/`dir` immediately. The current route, search state, form state, scroll position, and selector
focus remain intact. One polite status reports the result. If local catalog loading, browser
storage, or the account mutation fails, the runtime and relevant Query cache return to their prior
locale and the selector regains focus.

Sign-out, current-session revocation, and authentication expiry clear protected state before
reactivating the device preference. Failure to load a signed-out catalog never reverses an already
authoritative server sign-out.

## Accessibility and security review

- Every selector has a visible label and description, native keyboard interaction, translated
  option language metadata, and the shared minimum control size.
- Switching does not navigate or remount the protected shell. A deliberately disabled in-flight
  selector restores focus without scrolling when it becomes available again.
- Success and failure use one polite status region; no running or duplicate announcement is added.
- PostgreSQL remains authoritative for authenticated accounts. The device preference contains no
  account, employee, route, request, search, or organization data and never overrides a signed-in
  account.
- Unsupported API input fails strict validation. Unsupported persisted account data is treated as
  an integrity failure rather than silently selecting a different language.
- The locale mutation uses the existing authenticated transaction, origin, CSRF, serialization,
  and no-store contracts. Locale preference changes deliberately create no domain or security
  audit event because they do not change authorization or operational history.

## Verification coverage

Automated evidence covers:

- contract defaults, strict payloads, unsupported locales, and account-ID overreach,
- migration defaults and database allowlist enforcement,
- account persistence, cross-session visibility, current-account authorization, CSRF/origin
  rejection, cache updates, and the no-audit contract,
- employee and technical invitation locale persistence plus invitation/reset sender propagation,
- device storage resolution, invalid-value cleanup, runtime switching, failure rollback, focus
  continuity, document-language synchronization, and axe checks,
- protected-shell startup precedence without a prior-language flash, and
- the generated OpenAPI contract and the existing application/catalog bundle budgets.

The database-enabled implementation run passed 25 PostgreSQL integration tests with one
intentional skip. The final `D-508` completion rerun passes runtime configuration, reproducible
OpenAPI, formatting, lint and boundaries, CSS ownership, strict TypeScript, 48 tooling tests, 394
unit/component tests, 13 environment-independent integration tests, 39 browser tests with one
intentional skip, and the production/workspace build. The final integration rerun skipped 45
PostgreSQL-dependent cases because the local database service was unavailable; the browser command
required permission to bind the existing local Vite server.

The production application compiles, emits only the three expected locale chunks, and keeps the
full i18next/react-i18next engine out of the production graph until `WL-1404`. Under the pinned
toolchain it measures 916,728 bytes raw and 247,840 bytes gzip outside catalogs. This consumes
6,728 raw and 1,840 gzip bytes of `D-508`'s separately named 55,000/18,000-byte Phase 14
internationalization-runtime allowance above the preserved 910,000/246,000-byte application
baseline. Largest-chunk, CSS, and locale-catalog limits remain unchanged.

The allowance was not inferred from only the current feature. A forced production activation of
the already-pinned i18next/react-i18next bridge measured 961,249 bytes raw and 261,327 bytes gzip,
which is 3,751 raw and 2,673 gzip bytes below the combined 965,000/264,000-byte gates. The checker
reports current allowance consumption explicitly and its regression tests link the immutable
baseline, allowance, and combined ceilings. Locale chunks remain the only excluded catalog data;
no application or runtime code was reclassified.

## Remaining ownership

- `WL-1403`: replace user-facing API prose with typed language-neutral presentation descriptors.
- `WL-1404`–`WL-1406`: translate shared, employee, manager, HR, and system UI workflows.
- `WL-1407`: render invitations, password resets, notifications, and generated output in the
  recipient/account locale now carried by their sender boundaries.
- `WL-1408`: complete catalogs, pseudo-locale enforcement, and named fluent-human German and
  Spanish review.
