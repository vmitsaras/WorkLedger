# Safe Report Portability

**Task:** `WL-805`

**Status:** Complete

## Scope

`WL-805` adds an authorized CSV export to each `WL-804` operational report, a dedicated printable
monthly record, and an explicit copy-summary action. These are portability views of existing
purpose-minimized data, not new reporting sources. No export, print, or clipboard action occurs
automatically.

## Authorized CSV export

`POST /v1/reports/:reportKey/export` accepts the same strict date, sort, direction, and optional
opaque employee filter as the report screen without client-controlled pagination. It requires an
active session, same-origin request, CSRF token, the report-specific read permission, and
`RECORD_EXPORT`. The service resolves the current account, role, employee capability, and effective
manager assignment again inside one repeatable-read transaction before it fixes self,
current-direct-report, or organization-HR scope and runs the minimized report query. A target that
is no longer authorized returns `403 ACCESS_DENIED`; a prior screen result or downloaded filename
conveys no authority.

The complete matching authorized result is bounded to 100,000 rows and 32 MiB of encoded UTF-8.
The server rejects a result above either bound with `413 REPORT_EXPORT_TOO_LARGE` before writing a
success audit event. It does not retain the generated document. A successful export appends one
purpose-minimized domain audit event with actor account, authority, report action, scope reason,
source row count, time, and request/export identifier. It records neither rows nor filters,
employee names, absence data, clipboard content, or the generated document.

## CSV contract

- Encoding is UTF-8; the media type is `text/csv; charset=utf-8`.
- The delimiter is a comma, records end with CRLF, and the final record is terminated.
- The filename is the non-person-identifying
  `workledger-<report-key>-<from>-to-<to>.csv` pattern.
- Text that is formula-significant after leading whitespace/control inspection receives exactly one
  apostrophe before ordinary CSV quote escaping. This covers `=`, `+`, `-`, `@`, tab, carriage
  return, and line feed while preserving numeric negative minute values as numbers.
- Each report has an explicit column allowlist. Internal employee, period, source, approval, and
  request identifiers; absence subtype; sickness classification; notes; reasons; reviewer comments;
  macros; links; and hidden metadata are absent.
- Successful responses are `private, no-store`, use attachment disposition, and opt out of content
  sniffing.

The report screen states the included and omitted fields before the user exports. It downloads only
after a labelled button action and announces success, formula handling, permission loss, session
loss, oversize rejection, or generic failure without exposing response content.

## Printable monthly record

The monthly-period route offers a labelled print action only after an authorized record loads.
Activating it refetches the monthly record and re-evaluates current authorization. The refreshed
record is synchronously committed to the dedicated print DOM before the browser print dialog opens;
scope or dependency failure leaves the dialog closed and produces a safe alert or status message.

Print media removes application navigation, controls, reviewer history, and the ordinary screen
view. The print view contains the employee display name, month/timezone, workflow/readiness status,
complete-date totals, daily values, approved baseline, and purpose-minimized post-lock delta chain.
It excludes internal IDs, source/snapshot fingerprints, sickness classification, notes, decision
reasons, and reviewer comments. Semantic headings, description lists, captions, row/column headers,
textual status, monochrome borders, and print break rules preserve meaning without color.

## Explicit clipboard behavior

“Copy report summary” refetches the report first and writes only after an explicit labelled action.
The copied plain text contains the visible title, date range, permission-scope label, complete
matching row count, and report summary totals. It never copies result rows, hidden values, internal
identifiers, or HTML/tracking content. Clipboard unavailability, scope/session loss, and write
failure are announced, and failure does not claim that content was copied.

## Evidence

- Contract/unit tests cover strict export input, reversed ranges, unknown pagination fields, the
  formula-prefix matrix, quote order, numeric negatives, CRLF, UTF-8 byte bounds, filenames, row
  bounds, and forbidden identifiers (`EX-043`).
- PostgreSQL/API integration covers Origin/CSRF enforcement, formula-safe hostile employee text,
  exact response headers/body, generation-time current-manager scope loss, strict-input rejection,
  minimized output, and minimized success audit evidence.
- Component tests cover visible included-field explanations, exact export requests and filenames,
  object-URL cleanup, action-time copy refresh, row omission, permission-loss feedback, print
  refresh, refreshed-DOM timing, failure behavior, and print field minimization.
- Chromium coverage downloads the authorized report at 390 px, verifies the strict CSRF-protected
  request and filename, checks no sensitive report values are exposed, and runs axe.

## Remaining work

`WL-806` owns the Phase 8 gate review and its end-to-end close/export/adjust scenario. The existing
locked absence-cancellation adjustment gap and web production chunk-size advisory remain outside
this task and must be assessed at their applicable gate.
