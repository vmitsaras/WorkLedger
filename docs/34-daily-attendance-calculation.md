# Daily Attendance Calculation

**Task:** `WL-205`

**Outcome:** Complete. `packages/domain` now computes an immutable daily minute breakdown from
effective schedule/policy configuration, already-attributed work intervals, and explicit effective
source amounts.

## Scope

`calculateDailyAttendance(input)` resolves exactly one weekly schedule and time policy for the
target local date. It calculates:

```text
expected = scheduled - holiday expected reduction - absence expected reduction
worked   = sum(non-overlapping work interval elapsed minutes)
credited = worked + absence credit + approved adjustment
balance  = credited - expected
```

All values remain integer minutes. Worked, expected, and credited values cannot be negative;
balance and approved adjustment may be signed. Valid zero-duration work intervals contribute zero.
Work interval order in the source array is irrelevant, but positive overlap returns
`ATTENDANCE_OVERLAP`; a negative interval returns `ATTENDANCE_INVALID_EVENT_ORDER`; a non-minute
instant returns `ATTENDANCE_INVALID_EVENT_PRECISION`.

Effective holiday, absence, and approved-adjustment values are explicit already-authorized inputs
to this arithmetic layer. This task does not create a holiday record, absence effect, correction,
adjustment, ledger entry, calculation status, warning, or posting effect. A source set that would
make expected or credited minutes negative returns `POLICY_CONFIGURATION_INVALID` rather than
silently clamping a value.

## Boundary with later tasks

Input work intervals must already be attributed to the target local date. `WL-206` owns splitting
overnight intervals and DST/date-boundary attribution. `WL-207` owns constructing effective paid
or unpaid absence inputs, `WL-208` owns ledger totals, and `WL-209` owns calculation status,
warnings, and blockers.

No persistence, API, UI, live clock, timezone conversion, source fingerprint, audit, or user data
store is introduced. The calculator consumes supplied immutable values and returns a frozen result.

## Evidence

Focused tests cover the normal 480-minute day, positive and negative flexible time, holiday
expected reduction while preserving worked credit, effective absence/adjustment arithmetic,
overlap, negative intervals, invalid reduction/credit source sets, and schedule configuration gaps.
