# Sickness Reporting and Privacy Boundary

**Task:** `WL-603`

## Outcome

Employees can report a full-day sickness range through `/requests/sickness`. The form and request
contract accept dates only: there is no field for a diagnosis, symptom, treatment, clinician,
attachment, note, or reason.

Reporting takes effect once, immediately. It creates immutable full-day coverage and effective
absence records with paid credit derived from the employee’s effective schedule; public holidays
remain visible with zero credit. The report does not use an entitlement account or create a leave
ledger entry.

## Policy and timing

The API resolves exactly one active `SICKNESS` type over the full range. It requires the accepted
`REPORT_AND_ACKNOWLEDGE`, `DISABLED` request-note, non-entitlement policy. The start date must be
within that policy’s configured retrospective calendar-day limit (the MVP default is seven) and the
range cannot end after the organization-local current date. Full-day coverage is intentionally the
only supported unit in this slice; `WL-604` owns partial-day/hourly absence.

## Acknowledgement

`POST /v1/manager/sickness-reports/:requestId/acknowledge` is current-scope manager/HR only,
rejects self-action, requires a request version, and creates one `ACKNOWLEDGE` decision while
moving the request from `REPORTED` to `ACKNOWLEDGED`. It returns only the opaque request ID,
status, and next version. It does not append another absence effect, entitlement entry, or daily
calculation input.

The richer manager queue is deferred to Phase 7. Its future DTO must follow this boundary: a
manager may receive identity, `SICKNESS`, coverage, status, and safe actions only. Team, calendar,
generic notification, export, and technical surfaces remain neutral and do not expose sickness.

## Privacy and security

Both mutations are active-user authorized, same-origin and CSRF protected, serializable, and
`Cache-Control: private, no-store`. The API contracts are strict, so unknown medical fields are
rejected without echoing their values. Domain audit facts contain only date/count/version evidence;
they never include sickness classification, range detail, or medical text. No sickness value enters
URL state or browser persistence.

## Accessibility

The date-only form has visible labels, native date fields, a focus-managed error summary, linked
field errors, and a focused confirmation. Its explicit privacy instruction helps prevent accidental
medical-detail submission without asking users to provide it.

## Evidence

- Component and axe coverage verifies the no-medical-detail form and recovery behavior.
- PostgreSQL integration coverage verifies immediate effective credit, zero entitlement, strict
  unknown-field rejection without echoing the attempted value, retrospective enforcement, and
  no-store output.
