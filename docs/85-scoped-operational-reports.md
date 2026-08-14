# Scoped Operational Reports

**Task:** `WL-804`

**Status:** Complete

## Scope

`WL-804` replaces the reports placeholder with an authorized catalog and five purpose-specific
read models: monthly time, flexible time, leave balances, missing records, and pending approvals.
The original slice is read-only. `WL-805` subsequently added CSV, print, and clipboard behavior on
top of these purpose-minimized sources; see `docs/86-safe-report-portability.md`.

`GET /v1/reports` returns only report definitions allowed for the current actor plus the
organization-local current-month default range. `GET /v1/reports/:reportKey` accepts an inclusive
date range of at most 366 calendar days, bounded pagination, an allow-listed sort and direction,
and an optional opaque employee target. Names, email addresses, absence subtype, sickness
classification, reasons, notes, entitlement values, and free-text person search never enter report
URLs.

## Authorization and query boundary

The API resolves the active account, current employee capability, roles, and effective manager
assignment inside a repeatable-read transaction. Employee report scope is `SELF`; a manager with
self capability receives `SELF_AND_REPORTS`; manager-only pending approvals use `REPORTS`; and HR
receives `ORGANIZATION`. System-administrator capability alone grants no report access.

The authorized employee set is fixed before the date range, report-specific filtering, totals,
sorting, count, and pagination. General collection requests simply omit unauthorized rows. When a
request explicitly supplies an opaque employee ID, the target is checked against that authorized
set first and an unrelated target returns `403 ACCESS_DENIED` as required by `EX-044`; mixed or
partial fulfillment is not possible. Pending approvals continue to exclude the actor's own items.
Report queries are bounded to 500 authorized employees and 366 dates for the MVP deployment scale.

## Report semantics

- Monthly time groups persisted monthly periods and daily projections by employee and month. It
  totals expected, worked, credited, balance, incomplete-record count, and the signed post-lock
  adjustment chain; any incomplete row marks the result partial.
- Flexible time derives opening, in-range change, and closing balances only from append-only
  time-account entries.
- Leave balances derive opening available, in-range available change, closing available, current
  reservation, and projected remaining minutes from the leave ledger. Sickness accounts are
  deliberately excluded from the generic report.
- Missing records list persisted daily projections whose status is `INCOMPLETE`, including their
  non-sensitive blocker/warning codes and minute context. Entirely absent daily projections remain
  monthly-readiness blockers rather than invented report rows.
- Pending approvals reuse the unified approval-inbox source with `ACTION_REQUIRED` status and expose
  only broad workflow category, affected dates, submitted time, version, and review destination.

Every summary is calculated over the complete matching authorized result, not the current page.
Rows omit employee IDs, source identifiers, absence classification, medical context, notes,
reasons, reviewer history, and entitlement detail outside the generic leave-account totals.
Responses are strict, serialized, and `private, no-store`.

## User experience and accessibility

`/reports` presents the server-authorized catalog. `/reports/:reportKey` owns date, sort, direction,
page, and optional opaque-target state in the URL, redirects malformed state to safe canonical
defaults, and preserves valid state across refresh and browser navigation. The detail view provides:

- visible labelled native date/select controls with linked validation errors;
- an applied-filter summary and explicit permission-scope statement;
- semantic description-list totals and textual partial/empty/loading/error/refresh states;
- native captioned tables with row/column headers and `aria-sort` on the active column;
- a named, keyboard-focusable horizontal-scroll region that contains narrow-screen overflow;
- real links to restricted monthly-period or approval destinations, which reauthorize on entry; and
- named pagination with full-result counts and no color-only status.

Employees, managers, and HR receive one deduplicated Reports navigation entry in the first eligible
area. A technical-only account receives neither navigation nor API access.

## Evidence

- Strict contract tests cover defaults, leap-year-inclusive range bounds, reversed/oversized
  ranges, optional opaque targets, unknown query rejection, and protected-field rejection.
- PostgreSQL/API integration proves self, current-manager, HR, system-denial, explicit unrelated
  target denial, full-set totals, monthly partial state, missing records, generic leave privacy,
  pending-approval self exclusion, invalid sort handling, and no-store responses.
- Component/axe tests cover authorized catalog discovery, canonical links, full-result totals,
  partial context, semantic sorting/table structure, validation, loading, empty, dependency retry,
  and privacy-safe controls.
- Chromium coverage completes catalog-to-report navigation and URL filtering at 390 px, verifies a
  keyboard-focusable contained table, checks privacy fields, and runs axe.
- The OpenAPI 3.1 artifact is regenerated from the report contracts.

## Remaining work

`WL-805` is complete and reauthorizes CSV, print, and clipboard actions against these minimized
scope semantics. `WL-806` owns the Phase 8 gate review. The existing locked absence-cancellation
adjustment gap remains outside this reporting slice and must be closed before the applicable phase
or release gate.
