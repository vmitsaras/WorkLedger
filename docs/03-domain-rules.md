# WorkLedger Domain Rules

## 1. Core concepts

### Punch event

An immutable fact that a clock action occurred at a real instant:

- clock in,
- break start,
- break end,
- clock out.

A correction never erases the original event.

### Work session

A calculated interval during which the employee is working. A day may contain multiple work sessions.

### Break interval

A calculated non-working interval within an attendance sequence.

### Daily record

The calculated result for one employee and one organization-local date.

### Time-account entry

A ledger transaction that changes or explains the flexible-time balance.

### Leave-entitlement entry

A ledger transaction that allocates, reserves, deducts, restores, carries, expires, or adjusts leave.

### Timesheet period

A reviewable and lockable date range, monthly in the MVP.

## 2. Units and time representation

- Durations, expected time, credited time, and balances use integer minutes.
- Event timestamps are real instants.
- The organization has an explicit IANA timezone.
- The applicable organization-local date is calculated from the event instant and timezone.
- Date-only values such as vacation dates are not stored as midnight timestamps.
- Schedule and policy assignments use effective date ranges.
- Do not use floating-point hours for calculations.
- Do not use JavaScript `Date` arithmetic for domain logic.

## 3. Attendance state machine

### States

- `OFF_WORK`
- `WORKING`
- `ON_BREAK`

### Valid transitions

| Current | Action | Next | Notes |
|---|---|---|---|
| `OFF_WORK` | clock in | `WORKING` | Creates immutable event |
| `WORKING` | start break | `ON_BREAK` | Creates immutable event |
| `ON_BREAK` | end break | `WORKING` | Creates immutable event |
| `WORKING` | clock out | `OFF_WORK` | Creates immutable event |
| `ON_BREAK` | clock out | `OFF_WORK` | MVP default: allowed only with explicit confirmation and records break end plus clock out atomically |

All other transitions are domain conflicts.

### Idempotency

- Every client mutation carries an idempotency key.
- Repeating the same key returns the original result.
- A different key that attempts an invalid transition returns a conflict.
- State checks and event writes occur in one transaction.
- The active state belongs to the server, not one browser tab.

## 4. Daily calculation

### Base formula

```text
worked minutes = sum(valid work-session durations)

unpaid break minutes = sum(valid unpaid break durations)

credited minutes = worked minutes
                 + credited paid-absence minutes
                 + approved positive adjustments
                 - approved negative adjustments

daily balance minutes = credited minutes - expected minutes
```

Work-session reconstruction must not double-subtract breaks. Choose one representation and test it explicitly: either sessions already exclude breaks, or a gross span is reduced by breaks. The recommended implementation reconstructs working intervals that already exclude breaks.

### Expected minutes

Expected minutes are resolved from:

1. employee schedule assignment valid on the local date,
2. weekday expectation,
3. organization holiday or closure behavior,
4. approved policy overrides.

A schedule change affects only dates inside its effective range.

### Holidays

MVP default:

- A configured public holiday sets expected minutes to zero for employees who would otherwise be scheduled that day.
- The record explains that the zero expectation came from a holiday.
- Jurisdiction-specific exceptions are configuration, not hardcoded assumptions.

### Rounding

MVP default: no rounding. Preserve minute precision. Rounding requires a later policy decision and separate tests.

### Flexible-time limits

The engine calculates the real delta first. Policy may then expose:

- credited delta,
- overflow warning,
- lower-limit warning.

Do not silently discard time. A future cap policy must preserve the uncredited amount in an explainable record.

### Overtime

Flexible-time delta is not automatically payable or authorized overtime. Formal overtime is outside the MVP.

## 5. Overnight work

- A session may cross local midnight.
- Split calculation intervals at organization-local midnight.
- Preserve the original punch events and source session relationship.
- Attribute each segment to its local date.
- Real elapsed time is based on instants, not wall-clock subtraction.

## 6. Daylight-saving transitions

- Use instant differences for elapsed duration.
- Convert to local date/time through the explicit IANA timezone.
- Test spring-forward and fall-back cases.
- Ambiguous or nonexistent manually entered local times require explicit disambiguation or validation error.

## 7. Incomplete and invalid records

Examples:

- open session after the expected day,
- unmatched break start,
- overlapping manual intervals,
- future event,
- event order conflict,
- missing schedule assignment,
- unresolved correction,
- work overlapping an incompatible full-day absence.

The engine returns structured warnings/errors; the UI must not infer them from prose.

## 8. Corrections

### Required data

- target record or event,
- original value,
- proposed value,
- requester,
- reason,
- submitted timestamp,
- decision and decision maker,
- final applied value,
- resulting balance impact,
- locked-period indicator.

### Rules

- Original events remain immutable.
- Ordinary corrections require approval.
- HR privileged adjustments require a reason and audit event.
- A correction affecting a locked period creates an adjustment linked to that period.
- Reversing a correction creates another recorded action; it does not delete history.

## 9. Absence model

Each absence type configures:

- approval or acknowledgement requirement,
- entitlement deduction,
- expected-time credit,
- allowed duration units,
- request lead/retroactive rules,
- comment requirement,
- attachment permission,
- team-visible label,
- incompatibility with other absence types.

### MVP defaults

| Type | Approval | Entitlement | Time credit | Team display |
|---|---|---|---|---|
| Vacation | Manager approval | Deduct vacation ledger | Credits scheduled expectation | Unavailable |
| Sickness | Report plus manager/HR acknowledgement | No vacation deduction | Policy-configured; default credits expectation | Unavailable |
| Unpaid leave | Manager approval | No vacation deduction | No credit | Unavailable |
| Other | Configurable | Configurable | Configurable | Unavailable or configured neutral label |

### Pending balance

MVP displays:

- available,
- pending/reserved,
- approved used,
- remaining after pending.

Pending reservation does not become a final deduction until approval.

### Cancellation

Cancellation is a workflow, not deletion. Approved cancellation reverses the entitlement effect through a ledger entry and records the decision.

## 10. Monthly period states

- `OPEN`
- `INCOMPLETE`
- `READY_FOR_SUBMISSION`
- `SUBMITTED`
- `CHANGES_REQUESTED`
- `APPROVED`
- `LOCKED`
- `ADJUSTED_AFTER_LOCK`

### Rules

- Submission requires blocking errors to be resolved.
- Warnings may require explicit acknowledgement according to policy.
- The employee cannot mutate ordinary records after submission unless the period is returned.
- Approval records the approving actor and calculated snapshot.
- Locking prevents ordinary changes.
- Post-lock adjustments preserve the approved snapshot and produce a linked delta.

## 11. Ledgers

### Time-account entry types

- opening balance,
- daily delta,
- correction delta,
- post-lock adjustment,
- manual administrative adjustment,
- carryover,
- expiry or write-off when later supported.

### Leave-entitlement entry types

- annual allocation,
- prorated allocation,
- pending reservation,
- reservation release,
- approved deduction,
- cancellation restoration,
- carryover,
- expiry,
- manual adjustment.

Every ledger entry records source, actor or system process, timestamp, effective date, amount, and explanation code.

## 12. Non-negotiable invariants

- No overlapping effective schedule assignments for the same employee and date.
- No overlapping work intervals after accepted corrections.
- No negative duration.
- No self-approval.
- No invisible balance mutation.
- No ordinary edit of a locked period.
- No authorization derived from hidden UI alone.
- No medical diagnosis field.
- No deletion of records required for audit history merely because an account is deactivated.
