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

### Sofia Marin — Employee

- Schedule changed mid-month from 8 hours to 6 hours.
- One approved half-day absence plus work.
- Demonstrates effective-dated schedule behavior.

### Daniel Cole — Employee

- Missing clock-out on one day.
- Pending correction request.
- Previous rejected correction for history display.

### Mina Georgiou — Employee

- Sickness record.
- Team views must show only unavailable.
- Authorized HR view may see sickness classification, never diagnosis.

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
- Public holiday.
- Zero-hour Friday.
- Schedule change mid-month.
- Full-day vacation.
- Pending vacation.
- Half-day absence plus work.
- Sickness with privacy-safe team display.
- Approved cancellation restoring balance.
- Open current month.
- Submitted month needing correction.
- Locked previous month.
- Post-lock adjustment.
- Audit events for role change, correction, approval, lock, and export.

## Seed requirements

- Deterministic dates relative to a documented demo anchor or generated fixture clock.
- No real personal data.
- Passwords/secrets are development-only and clearly labelled.
- Production startup never automatically creates demo accounts.
- Demo reset is explicit and unavailable in production mode.
- Seed IDs may be stable for tests but remain opaque in normal UI.
