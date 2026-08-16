# Domain Audit Explorer

**Task:** `WL-906`

**Status:** Complete

## Scope

`WL-906` replaces the `/audit` placeholder with an organization-HR domain-audit explorer. The collection supports bounded page size, pagination, organization-local occurrence-date range, exact action code, outcome, and target-category filters. Scope is applied in PostgreSQL before filtering, totals, ordering, and pagination.

The technical `/system/audit` surface remains separate and deferred to `WL-1006`. This explorer never merges security, authentication, session, delivery, infrastructure, or operational evidence into the HR domain stream.

## Purpose-specific projection

The API maps append-only domain audit rows to a redacted DTO containing occurrence instant, action and outcome codes, target category and opaque reference, privileged indicator, actor role or trusted system-process reference, safe reason code, and the existing allowlisted fact object.

Actor account IDs, subject employee IDs, organization IDs, request/correlation IDs, and restricted-reason references are omitted. Free-text reasons, sickness data, form bodies, credentials, tokens, URLs, and technical audit facts have no response field. Target references remain opaque source links rather than resolved employee or workflow content.

## Authorization and query integrity

The route resolves the organization from the active authenticated account context and checks the dedicated organization-HR `DOMAIN_AUDIT_READ` installation action in the same transaction as the query. System-administrator capability alone receives no domain-audit access. Responses are private and no-store.

Dates are parsed as date-only values and compared against the event instant in the organization's IANA timezone. Query fields are strict and allowlisted; page size is capped at 50, invalid ranges fail validation, and ordering is stable by descending occurrence instant and event ID.

## Accessibility

Filters use native labelled date, select, and text controls and are owned by the URL. Results use a captioned semantic table inside a keyboard-focusable narrow-screen overflow region. Outcome and privileged state are textual. Each row exposes redacted detail through native `details`/`summary`, and pagination is a named navigation landmark with disabled boundary actions. Loading, empty, count, permission, and route-error states use the established route shell and boundary behavior.

## Evidence and remaining limits

Component evidence covers URL filter ownership, redacted detail, pagination state, and axe. Database/API service integration covers HR organization scope, local-date/action/outcome/target filters, totals before pagination, DTO field omission, and system-only denial when PostgreSQL is available.

Exact-action filtering intentionally avoids exposing an unrestricted action-code catalog. Employee-name filtering, audit export, technical audit, retention/minimization execution, alerting, and production-scale security/performance review remain later work. `WL-907` owns the Phase 9 gate review.
