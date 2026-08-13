# Employee Correction Requests

**Task:** `WL-503`

**Status:** Complete.

## Scope and data boundary

An employee starts a correction from their own daily record. The request proposes one replacement
work interval for that local date, with a factual reason. It does not edit a punch event, daily
projection, or flexible-time ledger entry. Review, decision, and any approved applied
interpretation remain `WL-504` and `WL-505` work.

Submission writes a `SUBMITTED` correction request and a minimized domain audit event in the same
database transaction. The persisted original interpretation contains the authorized projection
identity/version, calculation facts, and the record-local immutable event facts. The proposal is a
separate typed interpretation containing only the proposed start and end instants. The free-text
reason is stored with the request but is never added to audit facts or logs.

## Validation and authorization

The route accepts an existing self-owned daily-projection ID, local start/end times, optional UTC
offsets, and a 10–1,000 character reason. Domain interval validation resolves local times with
Temporal semantics, rejects nonexistent or future local times, requires an explicit valid offset
for repeated daylight-saving times, and rejects an invalid ordering.

The API enforces active session, canonical same-origin and CSRF checks before it enters the service.
Inside the transaction it re-resolves the active employee context and grants only the dedicated
self-only `CORRECTION_SUBMIT` action. The scoped projection lookup returns a safe not-found result
for records outside that employee scope. Responses are `private, no-store` and omit employee,
organization, actor, source, and reason values.

## Employee experience and accessibility

Daily record detail contains a real link to `/requests/new?recordId=…`. The correction form shows
the current immutable event facts and worked-time calculation before the proposed interval, so the
comparison is understandable without relying on color. It provides visible labels, in-context
field errors, a keyboard-focusable error summary with links to invalid fields, and clear
daylight-saving offset guidance.

The submit control remains disabled while the mutation is pending. A persistent status message
confirms that the request is awaiting review and that recorded events and calculation are unchanged.
The request is intentionally not available from an editable generic draft or URL-encoded form
state.

## Evidence

- Strict composite TypeScript, repository linting, and the unit/component suite pass.
- Component coverage verifies the accessible form, immutable-facts explanation, error summary,
  field link, and axe scan.
- Database/API integration coverage verifies the complete request write, source snapshot, proposed
  interval, audit event, and immutable punch-event trigger.
