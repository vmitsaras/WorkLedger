# Generic notifications and optional delivery

`WL-704` adds durable, self-scoped notification history for completed approval decisions. The
in-app record is the product guarantee. External email is an optional post-commit adapter and is
never allowed to determine whether an approval decision succeeds.

## Atomic record boundary

Each successful unified approval decision appends one notification in the same serializable
database transaction as the decision, its domain effects, and audit evidence. A uniqueness
constraint covers organization, recipient employee, source kind and identifier, event, and source
version so retrying a stale or already-completed decision cannot create duplicate history.

The schema distinguishes request and monthly-period sources. `WL-802` adds atomic monthly
changes-requested, approved, and locked outcomes under current-manager-or-organization-HR
authority.

Notifications retain the recipient employee and the active linked account, when one exists, for
server-side ownership and delivery. Neither identifier is returned to the browser. Dismissal sets a
timestamp; it does not delete the record or its delivery evidence.

## Privacy-safe content

The browser and optional-delivery DTOs use a small server-owned event vocabulary:

- item approved;
- item not approved;
- changes requested;
- item acknowledged.

Titles, bodies, and email subjects are generic. They omit request kind, absence subtype, sickness
classification, dates, reason, note, entitlement, reviewer, employee, and source identifiers.
Request notifications link to `/requests`; monthly outcomes link to the strict
`/monthly-periods/:periodId` destination. Each destination performs its own current authorization
checks. The notification record is not an authorization grant.

`GET /v1/me/notifications` accepts only bounded page and limit values and returns the authenticated
account's own active-linked employee/account history under `private, no-store`. A foreign dismiss
target returns the same not-found response as a missing record. `POST
/v1/me/notifications/:notificationId/dismiss` requires an active session, same origin, and CSRF.

## Optional delivery and diagnostics

WorkLedger defines a bounded delivery adapter and ships with delivery disabled. No production SMTP
dependency or secret is required for the MVP. When an adapter is configured and the recipient has
an active linked account, delivery runs only after the domain transaction commits. It receives the
generic copy, generic destination, notification identifier, and recipient email.

Delivery is attempted at most twice. Each outcome is appended to
`notification_delivery_attempts` with an attempt number, timestamp, allowlisted failure code, and
delivered/failed status. Adapter exceptions become a generic dependency-failure code. An adapter or
diagnostic-write failure never rolls back or replaces the committed decision and in-app record.
A diagnostic-write failure emits only a fixed privacy-safe operational message, without recipient,
source, reason, or payload data. History therefore distinguishes email not configured, pending,
delivered, and failed while always keeping the in-app outcome available.

## Accessible history behavior

`/notifications` is a persistent semantic history list, not a transient toast, popover, or
auto-disappearing surface. Each item exposes textual record and delivery state, a real link to the
restricted destination, and a native dismissal button. The button remains in the document after
dismissal, changes to a disabled-like retained state, and keeps keyboard focus. One polite status
message announces completed dismissal; loading is represented with `aria-busy` without noisy live
announcements. Empty, loading, refresh, dependency-error, dismissal-error, pagination, and narrow
reflow states are explicit.

## Evidence

Strict contract tests reject protected fields, unsupported filters, inconsistent dismissal state,
and non-allowlisted destinations. PostgreSQL integration proves atomic notification creation for
correction, sickness-report, vacation, and monthly decisions; duplicate prevention after stale decisions;
two persisted failed-delivery attempts; decision success despite delivery failure; self-only list
and dismiss behavior; retained history; and generic serialized content. Component and Chromium
coverage verifies keyboard dismissal, focus retention, live status, failure wording, empty history,
320 px reflow, and axe.
