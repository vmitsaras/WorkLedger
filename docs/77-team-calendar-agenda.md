# Team calendar and agenda

`WL-703` replaces the `/team-calendar` placeholder with equivalent month-grid and agenda
presentations of privacy-safe team availability. The route is available to managers and HR; it is
not an absence-request browser and never exposes absence subtype or medical context.

## Authorization and data boundary

`GET /v1/team/calendar` accepts only an optional `YYYY-MM` month. It resolves one trusted server
instant, the organization time zone, and the current organization-local date inside a
repeatable-read transaction. `TEAM_AVAILABILITY_READ` is applied before coverage is selected:

- managers receive only employees whose current effective direct-manager assignment names them;
- HR receives the organization availability scope;
- employee-only and system-administrator-only accounts are denied.

Scope is intentionally evaluated at request time, not reconstructed historically for each day in
the requested month. The response records that boundary as `scopeAsOfLocalDate`. Current team
assignment is evaluated at the same boundary. A missing current team remains `null` and is shown as
a textual warning; WorkLedger does not guess an assignment.

The strict response includes only employee display name, optional current team name, local date,
neutral `UNAVAILABLE` state, and the minimum coverage shape needed to distinguish full day, first
half, second half, or a minute interval. It excludes employee and request identifiers, absence
type, sickness classification, note, reason, entitlement, decision, and reviewer history. The
response is `private, no-store`. An explicit bounded-result guard fails closed instead of silently
returning a partial month.

## Effective coverage

The read model uses persisted absence effects, rather than pending request labels, and includes the
current effect version for the requested month. Coverage segments removed by an approved
cancellation are excluded. Every surviving absence type is serialized as `UNAVAILABLE`; the
calendar cannot reveal whether the source was vacation, sickness, unpaid leave, or another
configured type.

Coverage wording is textual in both presentations:

- `Unavailable — full day`
- `Unavailable — first half of expected work`
- `Unavailable — second half of expected work`
- `Unavailable — HH:MM–HH:MM`

The obligation-half labels deliberately avoid inventing clock boundaries that do not exist in the
schedule model.

## Equivalent accessible presentations

The wide-screen initial presentation is a captioned native month table. Each real date has a native
selection button with `aria-pressed`; the table is contained in a named, keyboard-focusable
horizontal scroll region. The agenda groups the same entries by date in source order. Its date
buttons use the same selection state and update the same selected-date detail section.

The view switch uses native buttons with `aria-pressed`, not a custom tab or ARIA-grid interaction.
View choice is transient UI state, while the shareable month remains in the URL. Narrow screens
start in the agenda presentation, but users can still choose the month table. Today, selected date,
availability count, neutral status, and missing-team state all have visible text and do not rely on
color. Loading, empty, dependency-error, permission, and no-availability-for-selected-date states
are explicit.

## Evidence

Contract tests reject malformed coverage and protected fields. API integration covers current
manager scope, HR organization scope, technical-admin denial, approved cancellation, invalid
months, no-store caching, and serialized privacy. Component and Chromium coverage checks route
focus, month/agenda information equivalence, keyboard date selection, HR-only navigation, empty
months, missing-team warnings, employee-only denial, narrow agenda-first behavior, reflow, and axe.
