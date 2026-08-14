# Privacy-safe team status

`WL-702` replaces the `/team` placeholder with a current, authorization-scoped view for managers.
It combines current attendance, neutral effective absence coverage, current team assignment, and a
generic unresolved-record indicator without turning the route into an employee-detail or absence
inspection surface.

## Authorization and snapshot boundary

`GET /v1/team/status` resolves one trusted server instant and the organization-local date. Inside a
repeatable-read transaction it re-resolves the authenticated actor and applies
`TEAM_AVAILABILITY_READ` before selecting employees. Managers receive active employees whose
current effective direct-manager assignment names them. HR retains the existing organization
scope for future authorized availability consumers; system-administrator capability alone is
denied. The manager `/team` route remains guarded by the `MANAGER` navigation area.

The response is `private, no-store` and contains no employee ID, request ID, absence type,
sickness classification, note, reason, entitlement value, coverage source, or reviewer history.
The member DTO contains only display name, current team name, neutral availability, and one boolean
stating whether an authorized unresolved record exists.

## Current-status projection

Status precedence is deterministic:

1. A current attendance head of `WORKING` is shown as `Working`.
2. A current attendance head of `ON_BREAK` is shown as `On break`.
3. Otherwise, uncancelled effective absence coverage for the organization-local date is shown as
   `Unavailable today`.
4. Otherwise the employee is shown as `Not working`.

Active attendance wins over day-level absence coverage so the list does not claim that a person
who is currently clocked in is unavailable. Obligation-half absence has no authoritative wall-clock
boundary in the MVP schedule model, so the team list deliberately says `Unavailable today` rather
than inventing a current start or end time. `WL-703` owns the equivalent date/coverage calendar and
agenda presentations.

Approved cancellation segments are excluded from availability. The generic `Unresolved record`
indicator covers non-terminal correction, absence, or cancellation records, including an approved
correction still awaiting application, without identifying the workflow category.

## Accessible presentation and refresh

The page uses a route-focused heading, a labelled description-list summary, textual status labels,
and a captioned native table. The table is contained in a named, keyboard-focusable horizontal
scroll region at narrow widths so relationships and source order remain intact. Empty, loading,
permission, dependency, and refresh states remain visible without noisy loading announcements.

TanStack Query refreshes the read model every 30 seconds only while the page is foregrounded and
also refetches after reconnect or window focus. The browser formats the server-provided instant and
totals but does not infer authorization, availability, or unresolved-record state.

## Evidence

Contract tests reject protected fields. Live PostgreSQL integration covers current and former
manager scope, HR organization scope, technical-admin denial, attendance precedence, neutral
absence projection, approved cancellation, unresolved indicators, no-store caching, and serialized
privacy. Component and Chromium tests cover route focus, table semantics, axe, empty/error recovery,
employee-only denial, narrow contained scrolling, reduced motion, and absence-subtype omission.
