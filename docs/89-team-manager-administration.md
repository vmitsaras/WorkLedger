# Team and Manager Administration

**Task:** `WL-901`

**Status:** Complete

## Scope

`WL-901` adds organization-HR administration for the team catalog, effective-dated employee team
membership, and effective-dated direct-manager relationships. It extends `/employees` with the
team catalog and `/employees/:employeeId` with separate current-state and history sections for team
and direct-manager assignments.

This slice does not treat team membership as manager authority. Manager scope continues to come
only from the current effective direct-manager relationship resolved from PostgreSQL for every
request. Schedule, time-policy, absence-type, entitlement, holiday, and audit-explorer
administration remain `WL-902`–`WL-906`.

## Effective assignment model

Team and manager histories use non-overlapping half-open local-date ranges. A change may begin on
the current organization-local date or a future date, closes only the assignment effective at that
boundary, and inserts an adjacent assignment without changing earlier rows. If a later assignment
is already scheduled, a newly inserted assignment ends at that preserved future boundary.

Past-dated changes, same-day replacement of an existing boundary, and no-effect changes return
stable conflicts. PostgreSQL exclusion constraints remain the final concurrency guard. Manager
changes additionally require an active, currently employed employee with an active linked account
and current `MANAGER` role as the selected manager. The complete historical and scheduled manager
graph is checked at every effective start boundary; self-links and direct, indirect, or future
cycles roll the transaction back.

## Team catalog and state

HR can list, create, activate, and deactivate organization-scoped teams. The list presents active
state and the count of currently active, currently employed members. Inactive teams remain in
history but are excluded from new team choices. A team with a current or scheduled assignment
cannot be deactivated, preventing a live or planned assignment from silently pointing at a newly
inactive team. Duplicate names and concurrent state changes return structured conflicts.

The existing Phase 3 tables, organization-scoped foreign keys, half-open range checks, and
non-overlap exclusion constraints already satisfy this slice, so no migration is required.

## Authorization, transactions, and audit

Reads and mutations require an active authenticated account with current organization-HR
authority. Assignment changes are prohibited against the actor's own employee record even when
roles are combined. Every mutation is same-origin and session-CSRF protected; the accepted
security profile does not require repeated freshness for routine team/manager changes because
scope is re-resolved from authoritative data rather than cached in the session.

Assignment planning, row locking, close/insert operations, manager eligibility, whole-graph cycle
validation, and domain audit append occur in one serializable transaction. Team create/state
changes use the same transaction and organization scope. Audit facts contain the actor, action,
organization, target, effective date or state transition, occurrence time, and request identifier;
they do not copy employee names, team names, manager names, or form payloads.

Because authorization resolves the current direct-manager edge on every request, an effective
manager change immediately removes the employee from the former manager's `/team` scope and adds
them to the new manager's scope. Earlier assignment rows remain available for historical
attribution and do not grant present access.

## Accessibility and interaction

The team catalog uses semantic headings, explicit active/inactive text, current-member counts,
labelled creation input, persistent result messages, and named state-change controls. Assigned
teams cannot be deactivated from the current UI, while the API still protects against stale or
scheduled assignment conflicts.

Employee detail presents team and direct-manager histories as separate ordered lists with explicit
date ranges and textual current state. Assignment controls use native labelled selects and date
inputs, organization-local minimum dates, disabled pending actions, persistent success/error
messages, and focused recovery at the missing choice or date. Privileged self-edit controls are
omitted. Route-heading focus, keyboard operation, narrow-screen layout, and automated axe coverage
remain part of the existing application-shell contract.

## Evidence

- Pure domain tests cover adjacent changes, preserved scheduled boundaries, past/no-effect/same-day
  conflicts, and direct, indirect, and future manager-cycle detection.
- PostgreSQL/API integration covers team creation and duplicate denial, effective team and manager
  replacement, preserved prior rows, immediate old/new manager scope, cycle rollback, assigned-team
  deactivation denial, privileged self-assignment denial, and minimized audit evidence.
- Component tests cover textual team state, assigned-team control state, separate current/history
  presentation, privileged self-control omission, validation focus, and axe checks.
- Chromium covers employee creation followed by CSRF-protected effective team and direct-manager
  assignment through labelled keyboard-operable controls.

## Remaining work

`WL-902` owns effective-dated weekly schedule management. Team-catalog pagination beyond the first
bounded page and broader scale measurement remain Phase 10 concerns. The full cross-browser,
assistive-technology, forced-colors, performance, and production security matrices remain owned by
`WL-1000`–`WL-1002`; automated accessibility checks do not establish WCAG conformance.
