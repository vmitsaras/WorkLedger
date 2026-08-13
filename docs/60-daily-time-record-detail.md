# Daily Time-Record Detail

**Task:** `WL-501`

**Status:** Complete.

## Scope

`GET /v1/me/time-records/:recordId` and `/time-records/:recordId` provide an employee with one
authorized daily projection and its attendance explanation. The route is reached from the linked
date in My Time; the opaque projection ID is not a business identifier or source of authority.

The response contains only:

- the organization-local date, IANA timezone, and calculation status;
- integer-minute expected, worked, break, absence-credit, adjustment, credited, and balance
  amounts when the source can be reconstructed;
- that local date's immutable attendance events in their recorded sequence; and
- reconstructed work and break intervals split at the organization-local midnight boundary.

It excludes employee, organization, actor, source fingerprint, correction, policy, and absence-type
identifiers. In particular, absence credit is a minute total; it never discloses a private absence
category or sickness detail.

## Reconstruction and overnight behavior

The API reads the employee's immutable punch history through the requested local date boundary,
reconstructs sessions through the framework-independent domain engine, and then uses
`splitAttendanceIntervalAtLocalMidnight` to select just the requested local-date segments.
Durations are calculated from exact instants in integer minutes, not from formatted wall-clock
times. This preserves spring-forward/fall-back elapsed time and allows the UI to display the UTC
offset for every event and interval endpoint.

Each returned session explicitly declares whether it continues from the previous local date or into
the next local date. The page presents this text alongside semantic ordered session, interval, and
event lists, so an overnight clock-in is understandable even though the clock-in event belongs to
the preceding local date.

If attendance reconstruction fails, the endpoint exposes only that day's minimized event list,
marks the record incomplete, and withholds calculation details rather than presenting an invented
session or final amount.

## Authorization and cache boundary

The endpoint requires an active session, active employee capability, current organization scope,
and self-only `ATTENDANCE_READ` authorization inside the database transaction. The projection
lookup is scoped by both organization and employee. Invalid, absent, or out-of-scope record IDs
produce the established safe not-found response; denied employee capability produces the
established authorization response. Responses send `Cache-Control: private, no-store`.

No mutation, recalculation, audit write, correction workflow, manager/HR record view, or absence
workflow is introduced by this slice. Those remain owned by `WL-502` through `WL-505` and later
absence work.

## User interface and accessibility

The employee route has one stable page heading and explicit loading, unavailable/not-found, and
permission-denied states. It uses:

- semantic description lists for calculation amounts;
- ordered lists for sessions and immutable event order;
- textual status for complete/incomplete state, with a `status` announcement only for the meaningful
  incomplete warning;
- visible UTC offsets to distinguish repeated local times; and
- a real link back to My Time and real date links from the captioned My Time summary table.

No state relies on color. The affected component tests include axe checks for complete and incomplete
overnight views.

## Evidence

- Strict composite TypeScript succeeds across the affected domain, contract, database, API, and web
  workspaces.
- The full unit/component suite passes 157 tests, including 20 application-shell tests that verify a
  complete daily calculation/session/event list and an incomplete, previous-date-continuing
  overnight slice.
- The full PostgreSQL/API integration suite passes 23 tests across 14 files, including the
  minimized completed daily-record DTO, reconstructed work/break intervals, cache policy, and
  invalid-record `404` behavior.
- The Chromium suite passes all 12 scenarios, and the Vite production build plus public-workspace
  import check succeeds. The existing main-chunk-size advisory remains owned by `WL-1001`.
