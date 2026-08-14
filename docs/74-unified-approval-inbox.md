# Unified approval inbox

**Task:** `WL-700`

## Outcome

`/approvals` is now one scoped, paginated inbox for correction, absence, and absence-cancellation
work. It replaces the correction-only list without removing the existing correction decision and
application flow: eligible managers can follow a correction row to the manager review route while
`WL-701` owns the consolidated type-neutral detail and decision experience.

Monthly-period rows are not represented yet. Their source workflow begins in Phase 8, and `WL-802`
owns adding them after the monthly decision-authority conflict in `D-402` is resolved.

## Query and status contract

`GET /v1/approvals` accepts only the following strict URL/query state:

| State | Values and semantics |
|---|---|
| `status` | `ACTION_REQUIRED` by default, `WAITING_ON_EMPLOYEE`, `COMPLETED`, or query-only `ALL` |
| `type` | Broad non-sensitive workflow category `CORRECTION`, `ABSENCE`, `CANCELLATION`, or `ALL`; never an absence subtype |
| `team` | Opaque UUID for the employee's current team at the organization-local query date; a filter, never an authorization grant |
| `from`, `to` | Optional paired inclusive affected-date overlap window, in order and no longer than 366 calendar days |
| `sort`, `direction` | Allowlisted `SUBMITTED_AT`, `AFFECTED_DATE`, or `EMPLOYEE`, with `ASC` or default `DESC` |
| `page`, `limit` | Server-side page `1`–`10000`; page size `10`–`50`, default `20` |

Filtering, counting, sorting, and pagination are deterministic. Submitted time, broad category, and
opaque item ID provide stable tie-breakers. A requested page beyond the current result set returns
normally and the web route replaces it with the last valid page.

The normalized list status is intentionally separate from source workflow states:

| Source workflow | Normalized inbox status |
|---|---|
| Submitted correction; approved correction not yet applied | `ACTION_REQUIRED` |
| Submitted approval-required absence; reported acknowledgement workflow | `ACTION_REQUIRED` |
| Pending absence cancellation | `ACTION_REQUIRED` |
| Any changes-requested source | `WAITING_ON_EMPLOYEE` |
| Applied correction and terminal/non-actionable absence or cancellation states | `COMPLETED` |

## Authorization and privacy

The API authenticates an active account and resolves current roles, employee capability, direct
manager assignment, and organization-local date inside one transaction. A manager sees only
active current direct reports. HR has organization scope even without an employee link. When HR
does have an employee link, their own rows are removed before filters, totals, sorting, and
pagination; a system-administrator role alone grants no inbox access.

Each source branch applies organization and actor scope before entering the unified query. The row,
total, and authorized team-option statements share one repeatable-read snapshot, so concurrent
workflow or assignment changes cannot mix snapshots inside one response.

The strict list DTO includes only an opaque item ID, broad category, generic status, employee
display name, affected-date bounds, submission instant, current team when present, and version. It
excludes employee IDs, absence subtype and sickness classification, reasons, notes, events,
entitlement values, raw source status, and source records. Protected success and error responses
are `private, no-store`; invalid or unknown query values return a safe `422` without reflection.

## Interface and accessibility

React Router owns the validated, shareable URL. TanStack Query owns memory-only server data and
retains the prior authorized page during a page fetch so the focused pagination control does not
unmount. Search-only navigation does not refocus the route heading; browser back/forward restores
the remembered control.

The route provides labelled native filters, a visible applied-filter summary and clear action, a
linked date-range error, named loading and updating states, distinct empty and filtered-empty
states, safe permission and dependency recovery, and a captioned native table with textual status,
workflow, dates, team, and actions. The table exposes its active sort direction. On narrow layouts,
filters use a labelled native disclosure while the table scrolls inside a named focusable region;
the page itself does not require horizontal scrolling.

Session expiry clears in-memory query and credential-adjacent state, redirects to sign-in, focuses
the sign-in heading, and announces the expiry once. A permission loss renders a focused safe route
state without a result count, request target, or approval detail.

## Evidence

- Contract tests cover defaults, strictness, bounds, Gregorian date-range validation, and rejected
  sensitive list fields.
- PostgreSQL/API integration covers manager and HR scope, former/unrelated/self exclusion,
  organization-wide HR without an employee link, system-role denial, all filters, two-page global
  pagination, no-store caching, and privacy-field absence.
- Component tests cover URL restoration, validation, focus retention, loading/empty/error,
  permission/session recovery, manager/HR action presentation, table semantics, privacy, and axe.
- Playwright covers keyboard filtering and pagination, browser-back restoration, narrow disclosure,
  320 px reflow, the contained table scroll region, and axe in a real Chromium browser.
