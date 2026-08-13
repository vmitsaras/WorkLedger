# Personal Calendar and Agenda

**Task:** `WL-605`

## Outcome

`/calendar` replaces its placeholder with an employee-owned, organization-local month view. It
contains public holidays and the employee's own active absence coverage, including the current
workflow status and partial-day coverage description. Month selection is URL-owned as the
non-sensitive `month=YYYY-MM` query parameter.

The calendar endpoint is self-only (`PERSONAL_CALENDAR_READ`), authorizes the active employee
inside a transaction, returns `Cache-Control: private, no-store`, and never returns organization or
employee identifiers, team availability, or another employee's data. An employee may see their own
absence type, including sickness; this personal route is not a team, notification, or export
surface.

## Equivalent presentations

The Month grid is a semantic table with a caption and weekday headers. It deliberately has no
custom ARIA-grid keyboard model: there are no per-cell actions. The Agenda list presents the exact
same holiday and absence entries in chronological date groups. Users can switch presentations with
real buttons that expose their selected state, and previous/next month controls keep the visible
month heading announced politely.

Each entry combines textual type/name, coverage, and workflow status, so color is never the only
state indicator. The responsive table keeps its columns coherent via local horizontal containment;
the agenda is the equivalent narrow-screen and screen-reader-friendly alternative.

## Data rules

- A holiday contains its local date and public name.
- An absence contains only the employee-visible type name, local-date segment, coverage unit/minute
  bounds, and current active status.
- Submitted, reported, acknowledged, changes-requested, approved, and partially-cancelled coverage
  is shown. Withdrawn, rejected, and fully cancelled coverage is not presented as current calendar
  coverage.
- The API derives all calendar dates and weekday placement using domain Temporal semantics; the
  browser does not perform `Date` arithmetic.

## Evidence

- Component/axe coverage verifies the semantic month table, agenda equivalent, switch controls, and
  the same holiday/absence strings in both views.
- PostgreSQL API integration verifies scoped holiday/coverage output, minute coverage details,
  no-store caching, and omission of employee/organization identifiers.
