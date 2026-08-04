# Domain Example and Test Catalog

These examples are planning fixtures. During Phase 2, each case must become an executable test with exact Temporal values, inputs, outputs, and structured warning/error codes.

Unless specified otherwise:

- Organization timezone: `Europe/Athens`.
- Expected day: 8 hours = 480 minutes.
- No rounding.
- Work intervals exclude breaks.
- Daily balance = credited minutes − expected minutes.

## Attendance calculations

### EX-001 — Normal day

- Work 08:00–12:00 and 12:30–16:30.
- Break: 30 minutes.
- Expected: 480.
- Worked/credited: 480.
- Balance: 0.
- Status: complete.

### EX-002 — Positive flexible time

- Work 08:00–12:00 and 12:30–17:10.
- Worked: 520.
- Expected: 480.
- Balance: +40.

### EX-003 — Negative flexible time

- Work 08:15–12:00 and 12:30–16:00.
- Worked: 435.
- Balance: −45.

### EX-004 — Multiple work blocks

- Work 07:30–10:00, 11:00–13:00, 16:00–19:00.
- Worked: 450.
- Balance: −30.
- No intervals overlap.

### EX-005 — Forgotten clock-out

- Clock in 08:00; no clock-out.
- Daily record: incomplete.
- No final credited total until policy-defined provisional display.
- Submission blocker code exists.

### EX-006 — Unmatched break start

- Clock in 08:00; break start 12:00; no break end.
- State: on break/open sequence.
- Record: incomplete.
- Clock-out path requires explicit confirmation/recovery.

### EX-007 — Duplicate clock-in retry

- Same idempotency key submitted twice.
- One punch event.
- Second response equals original result.

### EX-008 — Different-key duplicate clock-in

- Employee is already working.
- Second clock-in with another key returns domain conflict.
- No second event.

### EX-009 — Two-device race

- Desktop and phone submit clock-in concurrently.
- Exactly one transaction succeeds.
- Other returns current `WORKING` state/conflict.

### EX-010 — On-break clock-out

- Work 08:00–12:00; break starts 12:00; user confirms clock-out at 12:20.
- Atomic event sequence closes break and attendance.
- Worked: 240.
- Break: 20.
- No phantom work after break start.

## Schedule and holiday calculations

### EX-011 — Part-time weekday

- Schedule expects 360 minutes on Friday.
- Employee works 360.
- Balance: 0.

### EX-012 — Zero-hour weekday

- Employee is not scheduled Monday.
- No attendance.
- Expected: 0.
- Balance: 0.

### EX-013 — Work on zero-hour weekday

- Expected: 0.
- Employee works 120.
- Credited: 120.
- Flexible-time delta: +120, plus optional policy warning.

### EX-014 — Public holiday

- Normal schedule expects 480.
- Configured holiday applies.
- Expected: 0.
- No attendance.
- Balance: 0.
- Explanation references holiday.

### EX-015 — Schedule changes mid-month

- Old schedule expects 480 through the 14th.
- New schedule expects 360 from the 15th.
- Records resolve the schedule valid on each date.
- Reassigning future dates does not alter earlier approved dates.

### EX-016 — Schedule assignment gap

- No valid schedule exists for the date.
- Structured configuration error/submission blocker.
- Do not assume zero expected time silently.

## Overnight and DST

### EX-017 — Overnight session

- Clock in 22:00, clock out 02:00 next day.
- Split at local midnight.
- Day 1 worked: 120.
- Day 2 worked: 120.
- Source session remains linked.

### EX-018 — Spring-forward elapsed time

- Use explicit instants spanning a local clock jump.
- Elapsed duration is instant difference, not displayed wall-clock subtraction.
- Expected result is documented with the exact transition date in executable test.

### EX-019 — Fall-back elapsed time

- Use explicit instants spanning repeated local hour.
- Elapsed duration counts real elapsed minutes.
- Display includes enough offset/timezone context in detail views when ambiguous.

### EX-020 — Impossible manual local time

- User enters a local time inside a spring-forward gap.
- Validation error identifies the time as nonexistent in the organization timezone.
- No event is saved.

### EX-021 — Ambiguous manual local time

- User enters a repeated fall-back local time.
- API requires explicit disambiguation.
- No silent earlier/later assumption.

## Absence calculations

### EX-022 — Full-day vacation

- Expected: 480.
- No work.
- Approved vacation credits 480.
- Daily balance: 0.
- Vacation ledger deducts the configured equivalent.

### EX-023 — Vacation over weekend

- Request Friday through Monday.
- Saturday/Sunday are non-working days.
- Only scheduled Friday and Monday consume entitlement.

### EX-024 — Vacation containing holiday

- Request covers a configured holiday.
- Holiday has expected 0.
- Holiday consumes 0 entitlement by default.

### EX-025 — Half-day vacation plus work

- Expected: 480.
- Approved absence credit: 240.
- Employee works 240.
- Credited: 480.
- Balance: 0.

### EX-026 — Hourly absence plus excess work

- Expected: 480.
- Approved absence: 60.
- Employee works 450.
- Credited: 510.
- Balance: +30.

### EX-027 — Unpaid leave

- Expected: 480.
- Unpaid leave covers the full day.
- Work credit: 0.
- Recommended policy: neutralize the approved unpaid interval for flexible-time accounting, so effective expected minutes are 0 and daily balance is 0.
- Report unpaid absence separately. Confirm D-304 during Phase 0 because organizations may configure a different policy.

### EX-028 — Sickness privacy

- Employee/authorized HR sees sickness type.
- Team response contains only `Unavailable`.
- No diagnosis field or hidden diagnosis value exists.

### EX-029 — Pending vacation reservation

- Available entitlement: 10 days-equivalent.
- Pending request: 2 days-equivalent.
- Display: available 10, pending 2, projected remaining 8.
- Final deduction occurs on approval.

### EX-030 — Vacation cancellation

- Approved request deducted 2 days-equivalent.
- Approved cancellation creates restoration entry +2.
- Original request remains in history.

### EX-031 — Insufficient balance

- Approval would create a negative vacation balance.
- Default: approval blocked.
- HR override, when implemented, requires reason and audit.

### EX-032 — Overlapping absences

- Vacation overlaps existing sickness/full-day absence.
- Request returns conflict with affected date(s).
- No reservation/deduction is written.

## Corrections and locking

### EX-033 — Approved clock-in correction

- Original clock-in 08:13.
- Proposed 08:00.
- Approval preserves original, applies version/adjustment, recalculates +13 minutes, and appends audit/ledger effects.

### EX-034 — Rejected correction

- Proposed correction is rejected.
- Calculated record remains unchanged.
- Request and decision remain visible.

### EX-035 — Correction in submitted month

- Ordinary mutation is denied or period is returned according to workflow.
- No silent edit.

### EX-036 — Correction after lock

- Approved snapshot remains unchanged.
- Correction creates linked post-lock adjustment.
- Current adjusted view and original approved view are both explainable.

### EX-037 — Policy changed after lock

- New policy effective next month.
- Locked previous month remains reproducible with old policy version.

## Monthly period

### EX-038 — Ready month

- All scheduled days complete or covered.
- No blocking warnings.
- Period state can become ready and submitted.

### EX-039 — Incomplete month

- One missing clock-out.
- Submission blocked with date-specific issue.

### EX-040 — Manager approval and lock

- Authorized manager approves.
- Snapshot and audit decision stored.
- Lock prevents ordinary changes.

### EX-041 — Self-approval attempt

- Manager is also requester/employee for own period.
- Approval denied.

### EX-042 — Former manager access

- Manager assignment ended before request review.
- Access denied unless explicit active delegation exists.

## Reporting and export

### EX-043 — CSV formula injection

- Employee-entered text begins with `=`, `+`, `-`, or `@` in a field exported to CSV.
- Export neutralizes spreadsheet execution.

### EX-044 — Scoped report

- Manager requests report including unrelated employee ID.
- Unauthorized records are not returned and the request behavior is explicit.

### EX-045 — Deactivated employee

- Account cannot sign in.
- Historical records remain in authorized reports and audit history.
