# Generated and Recipient Output Internationalization

**Task:** `WL-1407`
**Status:** Complete
**Date:** 2026-08-27
**Workspace version:** `0.14.0`

## Scope

WorkLedger now renders monthly print records, clipboard report summaries, CSV exports,
notification email, invitations, and password-reset communication from the typed `output`
namespace in English, German, and Spanish. The API consumes the existing framework-independent
`@workledger/i18n` workspace package. No external runtime package was added.

The monthly print view keeps its existing semantic record structure and uses the current
authenticated browser locale. Clipboard summaries use the same locale and complete translated
line templates so punctuation and word order are catalog owned rather than assembled from labels.

CSV export uses the current authorized actor locale inside the existing repeatable-read export
transaction. Column headings, workflow statuses, issue labels, record completeness, and approval
kinds are localized. Employee names remain verbatim. ISO dates, ISO instants, integer minute
values, CRLF output, authorization scope, and spreadsheet formula neutralization are unchanged.

Notification email and password reset use the authoritative recipient account locale. Invitations
use the stored initial locale selected for the invited account. These messages are plain text and
interpolate only the existing safe recipient name and activation or reset URL boundaries.

## Locale authority

| Output | Locale authority |
|---|---|
| Monthly print | Current authenticated browser locale |
| Clipboard report summary | Current authenticated browser locale |
| CSV export | Current authorized actor account locale |
| Notification email | Recipient account locale |
| Invitation email | Stored initial invitation locale |
| Password-reset email | Authoritative account locale |

## Accessibility

Print headings, captions, tables, lists, status text, and the existing print action remain
semantic and keyboard accessible. Clipboard feedback retains its polite status announcement.
Complete translated messages avoid concatenation that could produce confusing word order or
punctuation. Dates, numbers, and compact durations use the active locale runtime.

## Security and data handling

CSV localization occurs only after the existing authentication and report authorization checks.
Formula neutralization and machine-stable date, instant, and minute fields remain intact.
Notification email stays generic and does not expose sickness, correction, absence, or supporting
record details. Delivery rendering remains within the existing retry and failure-isolation
boundary, so a translation or provider failure cannot roll back the committed domain outcome.

Invitation and password-reset messages contain the existing single-use URL and do not log tokens,
passwords, complete form payloads, or message bodies. Account locale is query-derived for
notification delivery, so no database schema or migration was required.

## Verification

Formatting, ESLint, strict TypeScript, CSS ownership, the 316-source and 1,773-import boundary
contract, 49 tooling tests, and 409 unit and component tests across 50 files pass. The full
integration project passes 13 environment-independent tests and skips 45 PostgreSQL-dependent
tests because the opt-in database service is unavailable. Focused output tests cover German CSV,
German invitation and notification messages, Spanish password reset and clipboard output, formula
neutralization, ISO fields, integer minutes, and privacy-safe delivery payloads.

Catalog enforcement passes for 2,069 messages across three locales and seven namespaces. The
production build passes at 435,303 largest-chunk bytes, 1,004,370 total raw JavaScript bytes,
258,040 gzip JavaScript bytes, and 50,242 CSS bytes outside catalogs. The Phase 14 allowance remains
96,000 raw and 22,000 gzip bytes; current use is 94,370 raw and 12,040 gzip bytes. Locale chunks and
the nine-entry workspace build through eleven public-root edges also pass.

## Remaining work

`WL-1408` owns complete catalog review by named fluent German and Spanish reviewers, remaining
catalog enforcement, and the test-only pseudo-locale. `WL-1409` owns the final multilingual
integration, accessibility, responsive, visual, usability, security, and upgrade evidence.
