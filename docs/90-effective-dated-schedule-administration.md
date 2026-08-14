# Effective-Dated Schedule Administration

**Task:** `WL-902`

**Status:** Complete

## Scope

`WL-902` adds organization-HR administration for immutable weekly schedule versions and
effective-dated employee schedule assignments. `/settings/time` owns schedule-version creation and
history. `/employees/:employeeId` shows the schedule effective today, preserved assignment history,
current or future employment coverage gaps, and the effective-date change control.

Time-policy rules and policy assignment remain `WL-903`. This slice does not recalculate historical
daily or monthly records, rewrite approved snapshots, or add an ordinary route for past-dated
schedule correction.

## Immutable weekly schedule versions

A weekly schedule stores seven explicit integer minute values from `0` through `1,440`. Zero is a
deliberate non-working day. Creating a schedule with a new name produces version 1; reusing the
exact name with different weekday minutes creates the next version. An identical repeat returns
`SCHEDULE_VERSION_NO_CHANGE` rather than manufacturing an indistinguishable version.

Version selection is serialized by locking the organization row, while the existing unique
organization/name/version constraint is the final concurrent-write guard. Earlier versions remain
visible and assignable so every historical employee assignment continues to resolve to the exact
schedule it originally referenced. Creating a version never changes employee assignments.

The Phase 3 `weekly_schedules` and `schedule_assignments` tables already provide organization
scope, minute bounds, immutable version references, valid half-open ranges, cross-organization
foreign keys, and non-overlap exclusion constraints. No migration is required for this slice.

## Effective assignments and coverage

Schedule assignment ranges are half-open. An ordinary HR change may begin on the current
organization-local date or a future date. It closes only the assignment effective at that boundary
and inserts the selected immutable schedule version; an already scheduled later boundary remains
unchanged and becomes the new row's end.

The service evaluates the prospective complete assignment history before writing. Every current
and future date inside an employee employment period must remain covered. A future initial
assignment for an employee who is already employed is therefore rejected because it would leave a
gap before the new boundary. Intervals between distinct employment periods do not require schedule
coverage. Past dates, duplicate boundaries, no-effect transitions, overlaps, invalid employment
dates, and organization-mismatched schedule versions return structured conflicts.

Existing rows and approved history are never edited except to close the current or future row at
the new adjacent boundary. Locked-period and historical correction behavior remains outside this
ordinary administration flow.

## Authorization, transaction, and audit

Reads and mutations require an active authenticated account and current organization-HR
authorization. Assignment mutation uses the existing employee-configuration permission and is
prohibited against the actor's own employee record. The web omits privileged schedule controls on
self records, while the API remains authoritative.

Mutations require the canonical same origin and session CSRF token. Version creation and assignment
changes execute in serializable transactions. The assignment transaction re-resolves actor scope,
locks the active employee, validates organization ownership, plans the transition, validates
employment coverage, closes/inserts rows, and appends audit evidence atomically.

Audit facts record only the actor, organization, action, target, occurrence/request identifiers,
schedule version number or assignment effective date, and the assigned state. Schedule names,
weekday arrays, employee names, and complete form payloads are not copied into audit facts.

## Accessibility and interaction

The time-settings form uses visible labels for the name and every weekday, an explicit seven-day
fieldset, integer-minute guidance, a live entered weekly total, inline errors, and a linked focused
error summary. Success remains visible and states clearly that employee assignments did not change.
Version cards identify latest versus historical state in text and present every weekday plus the
weekly total without relying on color.

Employee detail exposes current schedule, explicit no-schedule and coverage-gap states, weekly
total, effective dates, and semantic ordered history. The change control uses labelled native
select/date controls, an organization-local minimum date, disabled pending state, persistent
results, and focus recovery at a missing field. All information remains available in document
order on narrow screens, and privileged self-controls are absent.

## Evidence

- Pure domain tests cover current/future coverage gaps and intentionally uncovered intervals
  between separate employment periods.
- PostgreSQL/API integration covers version 1/version 2 history, identical-version denial,
  organization scoping, current-gap reporting, future-initial gap denial, adjacent assignment
  replacement, preserved prior rows, privileged self-denial, cross-organization rejection, and
  minimized atomic audit evidence.
- Component tests cover latest/historical textual state, weekly totals, coverage warnings,
  privileged self-control omission, focused linked validation, request shape, and axe checks.
- Chromium covers schedule assignment in the employee workflow plus schedule-version creation,
  CSRF transport, focused validation recovery, persistent success, and axe checks.
- The generated OpenAPI 3.1 artifact contains all four strict administration endpoints and their
  request/response/error schemas.

## Remaining work

`WL-903` owns immutable time-policy versions, effective assignments, and policy-impact preview.
Historical or locked-period schedule adjustments beyond the ordinary current/future administration
boundary require a later explicit workflow. The full cross-browser, assistive-technology,
forced-colors, performance/concurrency, and production-security matrices remain Phase 10 work;
automated accessibility checks do not establish WCAG conformance.
