# Vacation Request Calculation and Submission

**Task:** `WL-602`

## Outcome

Employees can submit one full-day vacation range from `/requests/new`. The authoritative API expands
the range against effective weekly schedules and public holidays, records the pending request and
its immutable coverage, and reserves the calculated entitlement in the same serializable
transaction.

## Calculation

The request uses two date-only values: inclusive `startDate` and `endDate`. It expands to one
`FULL_DAY` segment per organization-local date (maximum 366 dates). The calculation never uses
browser `Date` arithmetic.

```text
per-date consumption = 0 on a public holiday
                     = scheduled minutes otherwise

request entitlement = sum(per-date consumption)
```

Weekend and other zero-hour dates remain in coverage with zero consumption. This makes the request
auditable and understandable while preserving the accepted absence rule that they neither consume
default entitlement nor change time calculation. The current slice supports only full-day
vacation; half-day and minute-specific coverage remain `WL-604`.

## Submission boundary

`POST /v1/me/vacation-requests` requires an active self employee capability, same origin, and the
session-bound CSRF token. The route has `Cache-Control: private, no-store` and returns no employee,
organization, absence-type, or source identifiers.

One serializable, database-only-retry transaction:

1. resolves one active, compatible Vacation absence-type version for the full range;
2. obtains effective schedules and holidays, then computes coverage and minutes;
3. rejects a conflicting active/pending coverage range before any write;
4. creates the `SUBMITTED` absence request and its `FULL_DAY` coverage segments;
5. appends exactly one `PENDING_RESERVATION` entitlement entry for non-zero consumption; and
6. appends minimized domain-audit evidence.

The public response calls the state `PENDING_APPROVAL`, matching the workflow meaning. The
persisted MVP enum's existing `SUBMITTED` value represents that same pending state.

A request may make projected remaining leave negative. This is intentional: the request remains
reviewable, while the manager/HR decision and negative-balance override rules remain future work.
Submission has no daily absence effect or calculation change.

## Accessibility

The form uses native date controls with visible labels, an error summary that receives focus, and
links to invalid fields. The confirmation moves focus to a status region and lists every covered
date with its exact entitlement effect, including explicit public-holiday and zero-hour notices.
No date, entitlement, or request detail is encoded in the URL.

## Evidence

- Domain tests cover inclusive range expansion and visible zero-consumption weekend/holiday dates.
- API/database integration tests cover CSRF, schedule-aware calculation, reservation persistence,
  negative projected balance, and duplicate-range rejection.
- Component and axe tests cover the validation summary and request form labels.

## Deliberate boundaries

`WL-603` owns sickness reporting, `WL-604` partial-day/hourly coverage, `WL-605` calendar/agenda,
and `WL-606` withdrawal/cancellation and linked reversal. Manager approval, deduction, release,
and negative-balance override are not implemented by this slice.
