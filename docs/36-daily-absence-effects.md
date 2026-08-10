# Daily Absence Effects

**Task:** `WL-207`

**Outcome:** Complete. `packages/domain` now converts effective paid, unpaid, and no-time-effect
absence coverage into the explicit source amounts consumed by daily attendance calculation.

## Scope

`calculateDailyAbsenceEffects(input)` accepts the already-resolved base expected minutes (scheduled
minutes after holiday reduction and before absence reductions), same-date work intervals, and
effective absence coverage. It returns frozen values that can be supplied directly to
`calculateDailyAttendance`:

```text
absence credit             = paid covered obligation that is not already credited as work
absence expected reduction = unpaid covered obligation
```

The supported time treatments are `CREDIT_COVERED_EXPECTATION`,
`REDUCE_COVERED_EXPECTATION`, and `NO_TIME_EFFECT`. Coverage is either a full day, the first or
second half of the obligation, or a minute-aligned instant interval. First and second halves are
a deterministic partition: a 481-minute expectation becomes 240 and 241 minutes respectively.

For full-day and half-day paid coverage, credit is capped at the remaining unworked base
expectation. For minute coverage, the calculator subtracts the exact interval intersection with
work, preserving non-overlapping work credit. It does not create the later
`WORK_DURING_ABSENCE` warning; that review outcome remains owned by `WL-209`.

## Validation and boundaries

- Full-day coverage conflicts with any other coverage on the date.
- Duplicate half portions, overlapping minute intervals, and any full/half plus minute mixture
  return `ABSENCE_OVERLAP`.
- Nominal coverage cannot exceed non-zero base expected minutes. Zero-hour and holiday dates
  retain coverage but produce zero default absence credit and expected reduction.
- Invalid work input keeps its attendance meaning: overlapping work returns
  `ATTENDANCE_OVERLAP`; reversed or sub-minute interval bounds return the established attendance
  error codes.

This pure calculation does not construct requests, local-time minute coverage, holiday records,
entitlement deductions, warnings, calculation status, ledgers, persistence, API endpoints, or UI.
The caller supplies only effective, same-date inputs; `WL-206` remains responsible for work-date
attribution and `WL-208` owns time-account postings and totals.

## Evidence

Focused unit tests cover the accepted odd-minute paid/unpaid half-day example and its daily
calculation result, full-day credit capped by worked time, exact paid-minute/work intersection,
holiday/zero-hour behavior, full/half and minute overlap, and invalid overlapping work inputs.
