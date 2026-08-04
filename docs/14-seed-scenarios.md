# Realistic Seed Scenarios

The development seed must tell a coherent product story and expose edge cases. Do not use only `John Doe` records with perfect data.

## Organization

- Name: Northstar Studio.
- Timezone: Europe/Athens.
- Locale: English default.
- Monthly periods.
- No rounding.
- Manual breaks with warnings.
- Public holiday calendar with at least one holiday in the sample range.
- Vacation entitlement stored in minutes with reservation-on-submit and deduction-on-approval.
- Half-day coverage uses `FIRST_HALF`/`SECOND_HALF`; default unpaid leave reduces covered expectation.
- Sickness uses report-and-acknowledge, no request note/attachment, and a 7-calendar-day retrospective limit.
- Deterministic calculation anchor week beginning `2026-02-02`; DST fixtures use `2026-03-29` and `2026-10-25` in `Europe/Athens`.

## Accounts and roles

### Emma Reed — Employee

- Full-time Monday–Friday, 8 hours/day.
- Normal attendance history.
- Currently working in one seed state or controlled scenario.
- Positive flexible-time balance.
- Upcoming approved vacation.

### Leon Papas — Employee

- Part-time: Monday–Thursday 6 hours, Friday off.
- Negative balance from one short day.
- Has a pending vacation request crossing a weekend.
- Seed available entitlement is 4,800 minutes; the pending request reserves 960 and projects 3,840 remaining.

### Sofia Marin — Employee

- Schedule changed mid-month from 8 hours to 6 hours.
- One approved `FIRST_HALF` vacation plus work, with exact minute entitlement/credit effects.
- Demonstrates effective-dated schedule behavior.

### Daniel Cole — Employee

- Missing clock-out on one day.
- Pending correction request.
- Previous rejected correction for history display.

### Mina Georgiou — Employee

- Sickness report within the configured retrospective window; acknowledgement adds no second time effect.
- Team views show only neutral `UNAVAILABLE` coverage; generic notifications/logs/exports contain no sickness classification.
- Authorized manager/HR views use minimized purpose-specific DTOs; no diagnosis, request note, or attachment exists.

### Alex Morgan — Manager

- Manages Emma, Leon, Sofia, Daniel, and Mina.
- Pending absence and correction approvals.
- Cannot approve own monthly period.

### Priya Shah — HR administrator

- Can manage employees, schedules, policies, holidays, reports, and privileged adjustments.
- Has one recorded administrative adjustment with reason.

### Sam Rivera — System administrator

- Can manage technical/session configuration.
- Must not receive normal access to HR reports or sickness records.

### Former manager

- Historical approval attribution exists.
- Current access to the former report is denied.

### Deactivated employee

- Employment ended.
- Authentication disabled.
- Historical locked month remains visible to authorized HR.

## Data scenarios

- Normal complete day.
- Positive balance day.
- Negative balance day.
- Multiple sessions in a day.
- Currently on break.
- Forgotten clock-out.
- Overnight session.
- Spring-forward and fall-back sessions with explicit instants/offsets.
- Public holiday.
- Worked time on a public holiday.
- Zero-hour Friday.
- Schedule change mid-month.
- Full-day vacation.
- Pending vacation.
- Half-day absence plus work.
- Sickness with privacy-safe team display.
- Approved cancellation restoring balance.
- Partial vacation cancellation restoring an exact minute subset while preserving the original deduction.
- Approved full-day unpaid leave neutralizing covered expectation with no absence credit.
- Negative projected vacation request that manager cannot approve and non-self HR may override only with a reason.
- One work-during-absence warning demonstrating that entitlement is not silently rewritten.
- Open current month.
- Submitted month needing correction.
- Locked previous month.
- Post-lock adjustment.
- One posted zero-minute daily delta and one unlocked daily recalculation delta.
- Posted and projected balances with one incomplete date excluded from projection.
- Audit events for role change, correction, approval, lock, and export.

## Seed requirements

- Deterministic dates relative to a documented demo anchor or generated fixture clock.
- No real personal data.
- Passwords/secrets are development-only and clearly labelled.
- Production startup never automatically creates demo accounts.
- Demo reset is explicit and unavailable in production mode.
- Seed IDs may be stable for tests but remain opaque in normal UI.
