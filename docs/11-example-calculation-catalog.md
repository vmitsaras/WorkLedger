# Domain Example and Test Catalog

These examples are planning fixtures. During Phase 2, each accepted case must become an executable test with controlled clocks, exact Temporal values, inputs, outputs, and structured warning/error codes.

Phase 0 accepts all 85 single-outcome planning fixtures, `EX-001` through `EX-085`. `WL-006` owns the 35 attendance/calculation cases, `WL-007` owns the 27 absence/entitlement cases, `WL-008` owns the 20 correction/monthly cases, and `WL-003`/`WL-010` own the three reporting/security cases. IDs stay stable even though topic grouping is not numeric. `WL-210` maps every fixture to direct pure-domain evidence or its scheduled later workflow owner; each owner must add executable evidence when its implementation surface exists. Later implementation choices may add detail but cannot turn an accepted outcome back into alternatives silently.

Unless a case overrides it:

- Organization timezone: `Europe/Athens` using the runtime's pinned IANA rule data.
- Target local date for attendance cases: Tuesday, `2026-02-03` (`UTC+02:00`).
- Calculation clock after the target date: `2026-02-04T06:00:00Z`.
- When a case overrides the target date and asserts `COMPLETE`, its controlled calculation clock is 08:00 local on the following date unless another instant is stated.
- Expected day: 480 minutes.
- Punch occurrence instants are whole-minute and tests inject every clock; no test reads the live system clock.
- No interval, daily, policy, or display rounding.
- Work intervals exclude breaks.
- Daily balance = credited minutes − expected minutes.
- A complete fixture has `calculationStatus: COMPLETE`; provisional or incomplete fixtures name their status and do not expose final credited/balance values.

## Attendance calculations

### EX-001 — Normal day

- Events resolve to `06:00Z CLOCK_IN`, `10:00Z BREAK_START`, `10:30Z BREAK_END`, and `14:30Z CLOCK_OUT`.
- Work intervals: 08:00–12:00 and 12:30–16:30 local; break: 30.
- Expected: 480.
- Worked/credited: 480.
- Balance: 0.
- Status: `COMPLETE`.

### EX-002 — Positive flexible time

- Work 08:00–12:00 and 12:30–17:10 local; break: 30.
- Worked: 520.
- Expected: 480.
- Credited: 520.
- Balance: +40.

### EX-003 — Negative flexible time

- Work 08:15–12:00 and 12:30–16:00 local; break: 30.
- Worked: 435.
- Expected: 480.
- Credited: 435.
- Balance: −45.

### EX-004 — Multiple work blocks

- Three complete sessions: 07:30–10:00, 11:00–13:00, and 16:00–19:00 local.
- Worked: 450.
- Expected: 480.
- Credited: 450.
- Balance: −30.
- No intervals overlap.

### EX-005 — Forgotten clock-out

- `CLOCK_IN` occurs at `2026-02-03T06:00:00Z`; no clock-out exists when calculated after the date.
- Active state remains valid `WORKING`; the normal clock-out command may close it on a later local date.
- Status: `INCOMPLETE`; blocker: `ATTENDANCE_INCOMPLETE`.
- Safe estimate clips the open interval at local-day end: `provisionalWorkedMinutes: 960`.
- Final credited/balance values are absent and no daily ledger effect posts.

### EX-006 — Unmatched break start

- `CLOCK_IN` is `06:00Z`; `BREAK_START` is `10:00Z`; no break end exists when calculated after the date.
- State: `ON_BREAK`; sequence is open but valid.
- Status: `INCOMPLETE`; blocker: `ATTENDANCE_INCOMPLETE`.
- Safe estimate: provisional worked 240 and provisional break 720, clipped at local-day end; final credited/balance values are absent.
- Resume closes only the break. Clock-out without `confirmActiveBreak: true` returns `ATTENDANCE_BREAK_CONFIRMATION_REQUIRED` and changes nothing.

### EX-007 — Duplicate clock-in retry

- Initial state is `OFF_WORK`, `attendanceRevision` is `0`, and latest `eventSequence` is `0`.
- At controlled server time `2026-02-03T06:00:00Z`, submit `CLOCK_IN` twice with the same actor, `Idempotency-Key`, normalized body, and `expectedAttendanceRevision: 0`.
- First request appends one `CLOCK_IN` at sequence `1` and `06:00Z`, changes state to `WORKING`, increments the revision to `1`, and appends one attendance audit event.
- Second request returns the same terminal status and semantic operation snapshot with a fresh request ID and `idempotentReplay: true`.
- Final totals: one punch event, one attendance audit event, revision `1`.

### EX-008 — Different-key duplicate clock-in

- Employee is `WORKING` at revision `4`.
- `CLOCK_IN` with a new key and `expectedAttendanceRevision: 4` returns `ATTENDANCE_ALREADY_WORKING`.
- No event or attendance audit is appended, and the revision stays `4`.
- Repeating that exact invalid request with the same key replays its terminal conflict. A later deliberate action uses a new key.
- Each other invalid current-state/action pair is tested from the complete matrix in `docs/03-domain-rules.md` section 9.2 and must return its listed code with no attendance effect.

### EX-009 — Two-device race

- Desktop and phone both read `OFF_WORK` at revision `0`, then submit `CLOCK_IN` concurrently with different keys and `expectedAttendanceRevision: 0`.
- Exactly one transaction appends `CLOCK_IN`, changes state to `WORKING`, and commits revision `1`.
- The losing request returns `409 ATTENDANCE_STATE_CHANGED` with `currentState: WORKING`, `attendanceRevision: 1`, and valid actions `START_BREAK` and `CLOCK_OUT`.
- Final totals: one punch event, one successful-command attendance audit event, revision `1`. Retrying the losing request with its same key replays its stored conflict.

### EX-010 — On-break clock-out

- `CLOCK_IN` is `06:00Z`; `BREAK_START` is `10:00Z`. The employee is `ON_BREAK` at revision `2` with latest sequence `2`.
- An unconfirmed `CLOCK_OUT` at expected revision `2` returns `ATTENDANCE_BREAK_CONFIRMATION_REQUIRED`; it appends no event and does not increment the revision.
- After explicit confirmation, the client uses a new key and submits `confirmActiveBreak: true` with expected revision `2` at controlled time `10:20Z` (12:20 local).
- One transaction appends `BREAK_END` at sequence `3`, then `CLOCK_OUT` at sequence `4`, using the same server occurrence instant for both. It changes state to `OFF_WORK`, increments the revision once to `3`, and appends one attendance audit event referencing both events.
- Worked: 240.
- Break: 20.
- Expected: 480; credited: 240; final balance after the date ends with no later session: −240.
- No phantom work after break start.

## Schedule and holiday calculations

### EX-011 — Part-time weekday

- Target: Friday, `2026-02-06`; schedule expects 360 minutes.
- Employee works 09:00–15:00 local: worked/credited 360.
- Balance: 0.

### EX-012 — Zero-hour weekday

- Target: Friday, `2026-02-06`; the assigned schedule explicitly expects 0 minutes.
- No attendance.
- Expected/worked/credited/balance: 0; status: `COMPLETE` after the date ends.

### EX-013 — Work on zero-hour weekday

- Target: Friday, `2026-02-06`; assigned schedule expects 0 minutes.
- Employee works 10:00–12:00 local: worked/credited 120.
- Expected: 0; balance: +120.
- Structured warning: `WORK_ON_ZERO_EXPECTED_DAY`; the engine does not discard or reclassify the time.

### EX-014 — Public holiday

- Target: Wednesday, `2026-03-25`; normal schedule expects 480 and one configured holiday applies.
- Expected: 0.
- No attendance.
- Worked/credited/balance: 0; status: `COMPLETE` after the date ends.
- Explanation references the holiday source; default absence credit and entitlement consumption are 0.

### EX-015 — Schedule changes mid-month

- Old assignment is valid through `2026-04-14`; that Tuesday expects and receives 480, balance 0.
- New assignment begins `2026-04-15`; that Wednesday expects and receives 360, balance 0.
- The half-open boundary resolves exactly one schedule on each date.
- A later future assignment change leaves both identified historical results unchanged.

### EX-016 — Schedule assignment gap

- Target: Thursday, `2026-04-16`; a policy exists but no schedule assignment covers the date.
- Status: `INCOMPLETE`; blocker: `SCHEDULE_NOT_ASSIGNED`.
- Expected, final credited, and final balance values are absent; no daily ledger effect posts.

## Overnight and DST

### EX-017 — Overnight session

- `CLOCK_IN`: `2026-02-03T20:00:00Z` (22:00 local); `CLOCK_OUT`: `2026-02-04T00:00:00Z` (02:00 local).
- Split instant: `2026-02-03T22:00:00Z`, the start of local `2026-02-04`.
- `2026-02-03`: worked/credited 120, expected 480, balance −360.
- `2026-02-04`: worked/credited 120, expected 480, balance −360.
- With calculation clock `2026-02-05T06:00:00Z`, both daily results are `COMPLETE`; the source session remains linked.

### EX-018 — Spring-forward elapsed time

- Target: Sunday, `2026-03-29`; fixture schedule expects 0.
- `CLOCK_IN`: `2026-03-29T00:30:00Z` = `02:30+02:00`; `CLOCK_OUT`: `2026-03-29T01:30:00Z` = `04:30+03:00`.
- Worked/credited: 60, not 120; expected: 0; balance: +60.
- The local date spans 1380 elapsed minutes. Display includes the changed offsets in detail context.

### EX-019 — Fall-back elapsed time

- Target: Sunday, `2026-10-25`; fixture schedule expects 0.
- `CLOCK_IN`: `2026-10-25T00:30:00Z` = first `03:30+03:00`; `CLOCK_OUT`: `2026-10-25T01:30:00Z` = second `03:30+02:00`.
- Worked/credited: 60; expected: 0; balance: +60.
- The local date spans 1500 elapsed minutes. Detail display includes offset/timezone so identical wall labels are distinguishable.

### EX-020 — Impossible manual local time

- User proposes corrected local time `2026-03-29 03:30` in `Europe/Athens`.
- The local time maps to zero instants and returns `ATTENDANCE_NONEXISTENT_LOCAL_TIME` on the time field.
- No applied correction, interpreted event, calculation revision, ledger effect, or audit decision is committed.

### EX-021 — Ambiguous manual local time

- User proposes corrected local time `2026-10-25 03:30` in `Europe/Athens` without an offset.
- It maps to `2026-10-25T00:30:00Z` at `+03:00` and `2026-10-25T01:30:00Z` at `+02:00`; omission returns `ATTENDANCE_AMBIGUOUS_LOCAL_TIME` with both safe offset choices.
- Choosing `+02:00` resolves exactly to `2026-10-25T01:30:00Z`; choosing an unrelated offset is rejected. The server never silently chooses an occurrence.

## Additional calculation boundaries

### EX-046 — Current working projection

- On current local `2026-02-03`, `CLOCK_IN` is `06:00Z` and controlled `calculationAsOf` is `10:00Z` (12:00 local).
- Status: `PROVISIONAL`; provisional worked/credited 240 and provisional balance −240.
- Final credited/balance fields are absent and no daily ledger effect posts.

### EX-047 — Minute-precision capture

- Trusted clock observation for clock-in is `2026-02-03T06:12:47.900Z`; stored `occurredAt` is `06:12:00Z` while `recordedAt` retains normal precision.
- In this controlled fixture `recordedAt` equals the observation. Clock-out observation/recording is `07:13:05Z`; stored occurrence is `07:13:00Z`.
- Exact worked/credited duration is 61 minutes; expected is 480 and complete balance is −419. No later interval or daily rounding occurs.

### EX-048 — Zero-duration session

- `CLOCK_IN` and `CLOCK_OUT` are consecutive events with the same minute-aligned occurrence instant and different event-sequence values.
- The session is valid and complete with worked/credited 0, expected 480, and balance −480.
- No warning is asserted in this fixture; reconstruction does not invent one minute or reject a non-negative interval.

### EX-049 — Work on a holiday

- On configured holiday `2026-03-25`, the normal schedule is 480 and the employee works 10:00–12:00 local.
- Expected: 0; worked/credited: 120; balance: +120; default holiday absence consumption/credit: 0.
- Warning: `WORK_ON_HOLIDAY`. The result is not automatically payroll or legal overtime.

### EX-050 — Spring-forward day keeps schedule expectation

- Sunday `2026-03-29` is deliberately scheduled for 480 minutes.
- Use the 60-minute instant interval from `EX-018`.
- Expected: 480; worked/credited: 60; balance: −420 despite the 1380-minute local day.

### EX-051 — Fall-back day keeps schedule expectation

- Sunday `2026-10-25` is deliberately scheduled for 480 minutes.
- Use the 60-minute instant interval from `EX-019`.
- Expected: 480; worked/credited: 60; balance: −420 despite the 1500-minute local day.

### EX-052 — Timezone correction before facts

- Organization has no punch event, applied correction, absence request, daily time-account posting, or monthly period.
- Authorized HR changes timezone from `Europe/Athens` to `Europe/Berlin`.
- Change and one configuration audit event commit; subsequent time attribution uses `Europe/Berlin`. No historical record is rebuilt because none exists.

### EX-053 — Timezone change blocked after facts

- Organization timezone is `Europe/Athens` and one immutable punch event exists.
- Authorized HR attempts to change it to `Europe/Berlin`.
- Return `409 ORGANIZATION_TIMEZONE_LOCKED`; configuration, event attribution, projections, ledgers, and domain audit history remain unchanged.

### EX-054 — Base daily posting is idempotent

- Use complete `EX-002`: daily balance +40 and a stable source fingerprint.
- First posting appends one `DAILY_DELTA` of +40 and its posting/audit result atomically.
- Retrying the same semantic source returns the existing result. Final ledger entries for the date: one; posted balance effect: +40.

### EX-055 — Unlocked recalculation appends the difference

- Start from `EX-054`, then approve an unlocked correction that reduces worked minutes by 10; recalculated daily balance is +30.
- Append one `DAILY_RECALCULATION_DELTA` of −10. The base +40 remains unchanged and the net date effect becomes +30.
- Retrying the recalculation appends nothing. If a later identified recalculation has zero difference, it records evidence but no balance entry.

### EX-056 — Zero-balance base posting

- Use complete `EX-001`: daily balance 0 and a stable source fingerprint.
- Posting appends exactly one `DAILY_DELTA` of 0 so the synchronized source/date is explicit.
- Retry returns the same posting result and does not append a second zero entry.

### EX-057 — Warning does not cap balance

- Policy warning threshold is +30 minutes; use `EX-002`, whose raw daily balance is +40.
- Result remains expected 480, credited 520, balance +40.
- Add warning `FLEX_POSITIVE_THRESHOLD_EXCEEDED`; do not cap the balance to +30 or classify it as payable overtime.

### EX-058 — Current on-break projection

- On current local `2026-02-03`, clock in at 08:00, start break at 12:00, and calculate at 13:00 local.
- Status: `PROVISIONAL`; provisional worked 240, break 60, credited 240, and balance −240.
- Final credited/balance fields are absent, worked minutes do not grow during the break, and nothing posts.

### EX-059 — Overlapping reconstructed intervals

- A deliberately corrupted test fixture or invalid applied interpretation yields work intervals 08:00–11:00 and 10:00–12:00 on the target date.
- Status: `INCOMPLETE`; blocker: `ATTENDANCE_OVERLAP`.
- Final worked/credited/balance values are absent and no daily ledger effect posts; the engine does not merge or double-count the overlap silently.

## Calculation fixture execution matrix

| Priority | Cases | Primary test level | Risk covered |
|---|---|---|---|
| P0 | `EX-001`–`EX-006`, `EX-010`–`EX-019`, `EX-046`–`EX-051`, `EX-057`–`EX-059` | Domain unit plus property-oriented interval/date-boundary tests | Arithmetic, incompleteness, precision, midnight, DST, and hidden-cap errors. |
| P0 | `EX-007`–`EX-009` | Application/database integration with deterministic concurrency | Duplicate attendance effects and stale-state races. |
| P0 | `EX-020`–`EX-021` | Domain unit plus API contract tests | Silent or incorrect local-time disambiguation. |
| P0 | `EX-052`–`EX-053` | Application/database integration | Historical reattribution after timezone change. |
| P0 | `EX-054`–`EX-056` | Database integration with rollback/retry assertions | Duplicate, mutable, or unexplained ledger effects. |

Must-test blockers are every P0 row above. Property-oriented follow-up should generate non-overlapping minute-aligned intervals around local-day and DST boundaries and assert conservation of elapsed work/break minutes. `D-202` still owns the physical projection-persistence strategy. Absence-specific execution levels follow the absence fixtures below.

## Absence calculations

### EX-022 — Full-day vacation

- Base expected: 480; no work; starting available vacation entitlement: 2,400 minutes.
- Submission appends `PENDING_RESERVATION -480`: available 2,400, pending 480, projected 1,920.
- Approval atomically appends `RESERVATION_RELEASE +480` and `APPROVED_DEDUCTION -480`: available 1,920, pending 0, projected 1,920.
- Effective absence credit: 480; credited: 480; daily balance: 0.

### EX-023 — Vacation over weekend

- Request Friday through Monday.
- Friday/Monday base expected: 480 each; Saturday/Sunday: 0.
- Reservation and approved deduction are exactly 960 minutes. Weekend coverage remains visible but contributes zero entitlement/credit.

### EX-024 — Vacation containing holiday

- Request covers a configured holiday.
- Holiday has base expected 0.
- Holiday coverage remains visible, but reservation, deduction, absence credit, and expected reduction are each 0.

### EX-025 — Half-day vacation plus work

- Base expected: 480; vacation coverage: `FIRST_HALF`, nominal 240; approved deduction: 240.
- Employee works 240 minutes against the remaining obligation.
- Effective absence credit: 240; credited: 480; balance: 0.

### EX-026 — Hourly absence plus excess work

- Base expected: 480; approved minute-specific vacation interval: 60; approved deduction: 60.
- Employee works 450 minutes with no interval intersection.
- Effective absence credit: 60; credited: 510; balance: +30.

### EX-027 — Unpaid leave

- Base expected: 480; approved full-day unpaid leave; worked: 0.
- The default `REDUCE_COVERED_EXPECTATION` input is 480 and absence credit is 0.
- Effective expected: 0; credited: 0; balance: 0. Reports still identify 480 minutes as unpaid absence to authorized actors.

### EX-028 — Sickness privacy

- Employee sees `SICKNESS`, coverage, status, and decision history. Current manager sees the limited review DTO; HR sees only required administration fields.
- Team status/calendar/agenda contains employee display identity, needed coverage, and `UNAVAILABLE` only.
- Request schema has no diagnosis, note, clinician, or attachment field; generic URL, log, notification, and export output contains no sickness classification.

### EX-029 — Pending vacation reservation

- Available entitlement: 4,800 minutes. Pending request: 960 minutes.
- Submission result: available 4,800, pending 960, projected remaining 3,840.
- Approval releases 960 pending and deducts 960 final: available 3,840, pending 0, projected remaining 3,840.
- The UI may explain these as 10, 2, and 8 schedule-relative 480-minute days, but the ledger/API uses minutes.

### EX-030 — Vacation cancellation

- Approved request deducted 960 minutes.
- Approved full cancellation creates `CANCELLATION_RESTORATION +960`, removes the effective absence calculation input, and sets current status `CANCELLED`.
- Original request, approval, deduction, daily posting/recalculation, and cancellation decision remain linked history.

### EX-031 — Insufficient balance

- Available entitlement: 240; pending request: 480. Submission reserves 480 and projects -240.
- Manager approval returns `ABSENCE_INSUFFICIENT_BALANCE`; reservation stays active and no deduction/time effect is written.
- Eligible non-self HR approval with an explicit override reason releases 480, deducts 480, leaves available/projected -240, creates the absence effect, and audits the override atomically.

### EX-032 — Overlapping absences

- An effective reported full-day sickness absence exists on the date.
- Vacation submission returns `ABSENCE_OVERLAP` with the authorized date/coverage only and does not reveal the conflicting type in a generic error DTO.
- No request, reservation, deduction, time effect, notification, or audit success event is written.

### EX-060 — Odd-minute half-day partition

- Base expected: 481.
- `FIRST_HALF` is 240 and `SECOND_HALF` is 241; together they equal 481 exactly.
- Neither label implies AM/PM. No rounding or missing minute occurs.

### EX-061 — Changes requested releases reservation

- Available vacation entitlement: 2,400; submitted request: 480; projected remaining: 1,920.
- Reviewer requests changes with a reason: append `RESERVATION_RELEASE +480`; available/projected return to 2,400 and no absence effect exists.
- Employee resubmits a preserved new version for 240: append a new `PENDING_RESERVATION -240`; projected remaining becomes 2,160.

### EX-062 — Rejection and withdrawal release once

- Two separate pending requests each reserve 240.
- Rejecting one and requester-withdrawing the other append one linked `RESERVATION_RELEASE +240` per request, no deduction, and no time effect.
- Retrying either terminal transition appends nothing.

### EX-063 — Sickness report is effective before acknowledgement

- Base expected: 480; employee reports a valid full-day sickness; default policy credits covered expectation.
- State becomes `REPORTED`; credit is 480 and balance is 0 immediately.
- Eligible manager acknowledgement changes state to `ACKNOWLEDGED` and records one decision; credit remains 480 and no second calculation/ledger effect appears.

### EX-064 — Retroactive sickness boundary

- Organization current local date: 2026-02-10; effective policy maximum: 7 calendar days.
- A report starting 2026-02-03 is accepted at the inclusive boundary.
- A report starting 2026-02-02 returns `ABSENCE_RETROACTIVE_LIMIT`; no request/effect is written. A future start date also fails validation.

### EX-065 — Work during full-day paid absence

- Base expected: 480; approved full-day vacation nominal credit and entitlement deduction: 480; worked: 120.
- Quantity-based credit fills only the unworked obligation: effective absence credit 360; credited 480; balance 0.
- Entitlement deduction remains 480 and `WORK_DURING_ABSENCE` is emitted; changing the approved coverage requires cancellation/correction.

### EX-066 — Partial cancellation restores exact subset

- Approved two-day vacation deducted 960. Employee requests cancellation of one date's `FIRST_HALF` worth 240.
- Approval appends `CANCELLATION_RESTORATION +240`, removes only that calculation coverage, and yields `PARTIALLY_CANCELLED` with 720 effective/deducted minutes remaining.
- The original 960 deduction and all decisions remain visible.

### EX-067 — Concurrent duplicate cancellation

- Two authorized decisions race to cancel the same still-effective 240-minute subset using the same expected version.
- One transaction restores 240 and advances the version; the other returns `ABSENCE_STATE_CHANGED` or `ABSENCE_CANNOT_CANCEL` after refetch.
- Total restoration is 240, never 480.

### EX-068 — Locked-date cancellation

- Approved absence coverage belongs to a locked monthly period.
- Submission captures the exact immutable monthly snapshot and source fingerprint while leaving the approved baseline unchanged.
- Approval appends the zero successor absence effect, exact eligible entitlement restoration, per-date component adjustment, one nonzero aggregate time-account adjustment per snapshot, minimized audit, and generic notification in one transaction.
- A stale decision or snapshot/effect mismatch rolls back every effect; the original snapshot and prior ledger rows remain unchanged.

### EX-069 — Disjoint odd-minute halves with different types

- Base expected: 481. Approved vacation covers `FIRST_HALF` for 240 credit/deduction; approved unpaid leave covers `SECOND_HALF` for 241 expected reduction.
- Effective expected: 240; credited: 240; balance: 0.
- The portions are disjoint and accepted. Reusing either portion would return `ABSENCE_OVERLAP`.

### EX-070 — Minute absence intersects work

- Base expected: 480; approved minute-specific paid absence covers 10:00–11:00 for 60 nominal minutes.
- Credited work totals 420, including 30 minutes inside the absence interval.
- Effective absence credit is 30 after intersection; credited is 450; balance is -30; `WORK_DURING_ABSENCE` is emitted.

### EX-071 — Ambiguous minute-specific boundary

- A minute-specific absence boundary uses a repeated local time in `Europe/Athens` without an offset.
- Submission returns `ABSENCE_AMBIGUOUS_LOCAL_TIME` and writes no request/effect.
- Supplying either valid explicit offset resolves one exact interval; a nonexistent local boundary is rejected.

### EX-072 — Changes requested on reported sickness

- A reported full-day sickness currently contributes 480 credit. Reviewer requests changes with a reason.
- State becomes `CHANGES_REQUESTED`, but the latest reported effect stays at 480 until the employee replaces or cancels it.
- Employee resubmits a valid 240-minute version: current effect becomes 240 atomically; an unlocked complete date recalculates by -240 rather than posting a second base effect.

### EX-073 — Current scope and self-decision

- A pending requester's manager assignment changes before decision.
- Former manager receives `403 ACCESS_DENIED`; current manager may decide. A requester with combined manager/HR roles receives `APPROVAL_SELF_NOT_ALLOWED` for their own request.
- Denials write no decision, ledger, calculation, notification, or success audit effect.

### EX-074 — Sensitive absence data stays out of secondary channels

- A sickness report exists with an opaque request ID.
- Authorized detail API returns its purpose-specific DTO; browser persistence, URL query/hash, generic CSV/print, generic notification preview, technical audit, and operational log contain no sickness classification, coverage payload, or note/reason.
- Logout/session expiry clears the in-memory sensitive query cache.

### EX-075 — Invalid configurable absence policy

- HR proposes `REPORT_AND_ACKNOWLEDGE` plus an entitlement account and `RESERVE_PENDING`.
- Validation returns `POLICY_CONFIGURATION_INVALID`; no policy version or audit success event is written.
- A valid entitlement-backed `OTHER` policy must use `APPROVAL_REQUIRED`.

## Absence fixture execution matrix

| Priority | Cases | Primary test level | Risk covered |
|---|---|---|---|
| P0 | `EX-022`–`EX-027`, `EX-029`–`EX-032`, `EX-060`–`EX-072` | Domain unit plus application/database transaction tests | Coverage arithmetic, policy effects, reservation conservation, overlap, reversal, reporting, concurrency, and locked-history protection. |
| P0 | `EX-028`, `EX-074` | API authorization/serialization/cache tests plus manual network, URL, notification, log, and export inspection | Health-related data disclosure through purpose-incompatible channels. |
| P0 | `EX-073` | API authorization and manager-reassignment integration tests | Former-manager access, current scope, and combined-role self-decision. |
| P0 | `EX-075` | Domain configuration and API contract tests | Invalid policy combinations and arbitrary-workflow creep. |

Property-oriented follow-up should generate even/odd expectations, disjoint/intersecting half-open minute segments, request-version races, and reservation/deduction/restoration sequences. Assert exact minute conservation, at most one semantic source effect, and `available - reserved = projected` after every transition.

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

- An employee attempts an ordinary correction while the month is `SUBMITTED`.
- The command returns `PERIOD_REOPEN_REQUIRED`; period/source versions, calculation, ledger, and audit success history are unchanged.
- The current manager requests changes with a reason; state becomes `CHANGES_REQUESTED`, after which a new correction version may be submitted and the month must be resubmitted.

### EX-036 — Correction after lock

- Approved snapshot remains unchanged.
- Correction creates linked post-lock adjustment.
- Current adjusted view and original approved view are both explainable.

### EX-037 — Policy changed after lock

- New policy effective next month.
- Locked previous month remains reproducible with old policy version.

## Monthly period

### EX-038 — Ready month

- The organization-local month has ended; all employed dates are `COMPLETE`, every eligible date has its base posting, and no correction, absence, configuration, or reconciliation blocker remains.
- Readiness derives as `READY_FOR_SUBMISSION`; the employee acknowledges the exact warning/source set and submits with the current period version.
- State becomes `SUBMITTED`, version increments once, and the submitted source fingerprint is recorded; no approval snapshot exists yet.

### EX-039 — Incomplete month

- One missing clock-out.
- Submission returns `409 PERIOD_NOT_READY` with the authorized affected local date and `ATTENDANCE_INCOMPLETE`; state/version remain `OPEN`/unchanged and no submission audit success or notification is written.

### EX-040 — Eligible reviewer approval and lock

- An eligible non-self reviewer—the current direct manager under `CURRENT_MANAGER` authority or an
  organization HR administrator under `ORGANIZATION_HR` authority—approves a source-unchanged
  `SUBMITTED` month.
- State becomes `APPROVED`; approval cycle 1 snapshot, decision, version, audit, and notification commit atomically and its rows/totals/ledger references reconcile.
- The decision and snapshot require the authenticated account and explicit authority; manager
  authority requires employee evidence, while an HR-only account may record null employee evidence.
- A later explicit lock by a currently eligible non-self reviewer rechecks the exact
  snapshot/source and changes state to `LOCKED` without creating another snapshot. Ordinary changes
  then return `PERIOD_LOCKED` or select the explicit source-specific post-lock adjustment path.

### EX-041 — Self-approval attempt

- Reviewer is also the employee for their own period, including through combined manager/HR roles.
- Approval returns `APPROVAL_SELF_NOT_ALLOWED`; period/version remain `SUBMITTED`/unchanged and no decision, snapshot, audit success, or notification is written.

### EX-042 — Former manager access

- Manager assignment ended before request review.
- Access denied because manager scope is resolved from the current effective assignment.
- Historical relationship or prior approval attribution grants no access; delegation is outside the MVP.

### EX-076 — Warning acknowledgement becomes stale

- A ready month has warning set/fingerprint A; the employee acknowledges A.
- A source recalculation changes the warning/source set to fingerprint B before submission.
- Submission returns `PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED`; no transition occurs until B is reviewed and acknowledged.

### EX-077 — Approval detects changed sources

- The submitted source fingerprint is S1. A concurrent privileged operation changes a covered source before approval, producing S2.
- Approval returns `PERIOD_SOURCE_CHANGED`; it writes no snapshot, decision, notification, or ledger effect.
- The period must enter `CHANGES_REQUESTED`, be made ready, and be resubmitted from S2.

### EX-078 — Approval snapshot reconciliation

- Two daily rows have balances +30 and -15; opening posted balance is 600; the ordered included month ledger effects total +15.
- The snapshot period balance is +15 and closing posted balance is 615, with matching row, total, and ledger references.
- A mismatch returns `PERIOD_LEDGER_MISMATCH` and approval commits nothing.

### EX-079 — Changes requested after approval

- Before lock, the current manager requests changes on an `APPROVED` period with a reason.
- State becomes `CHANGES_REQUESTED`; approval-cycle-1 snapshot remains immutable historical evidence but is not a locked baseline.
- After correction and resubmission, approval creates cycle-2 snapshot; lock fixes cycle 2.

### EX-080 — Lock source race

- Manager loads `APPROVED` period version 4 and snapshot fingerprint P1; another accepted transition advances it to version 5.
- Lock with expected version 4 returns `PERIOD_VERSION_CONFLICT` and creates no lock/audit success event.
- A valid lock of the unchanged approved version fixes P1 and does not recalculate or create a second snapshot.

### EX-081 — Post-lock positive correction

- Locked snapshot closing balance is 615. An approved correction adds 13 minutes to one date.
- The snapshot and original daily ledger entries remain unchanged; one uniquely keyed `POST_LOCK_ADJUSTMENT +13` and linked adjustment record commit.
- Approved view closes at 615; current adjusted view reports baseline 615, cumulative delta +13, adjusted closing 628.

### EX-082 — Post-lock zero-delta correction

- A locked source interpretation is corrected but recalculates to the same daily and period totals.
- Approval records the interpretation, decision, per-date zero delta, adjustment-chain link, audit, and notification, but appends no zero time-account entry.
- The snapshot remains unchanged and the adjusted view explains that the net delta is zero.

### EX-083 — Concurrent post-lock decisions

- Two reviewers decide the same adjustment request/version concurrently.
- One approval commits its interpretation and ledger delta; the other returns a version/state conflict after refetch.
- Semantic source uniqueness proves the correction affects the balance once only.

### EX-084 — Post-lock reversal

- A prior locked adjustment added 13 minutes and is later found incorrect.
- Approval appends a linked compensating adjustment and `POST_LOCK_ADJUSTMENT -13`; it does not edit or delete the first entry.
- The ordered chain nets to zero while both decisions and the original snapshot remain reproducible.

### EX-085 — Snapshot absence privacy

- The approved month includes 480 sickness-credit minutes from an authorized absence effect.
- Snapshot rows contain the neutral effect/source ID and 480 absence-credit minutes, but no sickness classification, coverage payload, request/reviewer note, entitlement amount, or diagnosis.
- Generic monthly detail/export cannot recover the sensitive type by embedded fields; protected source detail requires separate authorization.

## Monthly-period fixture execution matrix

| Priority | Cases | Primary test level | Risk covered |
|---|---|---|---|
| P0 | `EX-035`, `EX-038`–`EX-042`, `EX-076`–`EX-080` | Domain state-machine plus application/database transaction and authorization tests | Readiness, freeze/reopen, current scope, self-action, stale warnings/sources, snapshot reconciliation, approval cycles, and explicit lock. |
| P0 | `EX-036`, `EX-081`–`EX-084` | Domain ledger plus database concurrency/integration tests | Immutable baseline, exact post-lock delta, zero delta, duplicate decision, and compensating reversal. |
| P0 | `EX-037`, `EX-085` | Snapshot serialization/version and API/export privacy tests | Historical reproducibility and sensitive absence data minimization. |

Property-oriented follow-up should generate period transition sequences, daily row/ledger minute sets, stale period/source versions, and ordered adjustment/reversal chains. Assert legal-state reachability, exact row/period/ledger reconciliation, one snapshot per approval cycle, no snapshot rebuild on lock, and at most one semantic adjustment effect.

## Reporting and export

### EX-043 — CSV formula injection

- After control/leading-whitespace inspection, an employee-entered cell beginning with `=`, `+`, `-`, `@`, tab, carriage return, or line feed is formula-significant.
- The canonical CSV cell value prefixes one apostrophe before the normalized original text and then applies ordinary CSV quoting. Example: `=2+2` serializes as the cell text `'=2+2`; reopening the export cannot execute it as a formula.
- Non-formula text is preserved, and the exporter adds no hidden column, macro, link, or metadata.
- Direct `WL-805` evidence covers the formula/control/whitespace prefix matrix, quote ordering,
  numeric negative preservation, hostile UTF-8 employee text in PostgreSQL/API integration, exact
  CRLF output, bounded encoded bytes, and forbidden-column absence.

### EX-044 — Scoped report

- Manager requests report including unrelated employee ID.
- A request explicitly naming the unrelated employee returns `403 ACCESS_DENIED`.
- A general team report applies current-direct-report scope before counts, totals, sorting, and pagination.

### EX-045 — Deactivated employee

- Sign-in returns the same `AUTH_INVALID_CREDENTIALS` response used for unknown/incorrect accounts; no session is created and no account-existence detail is exposed.
- Historical records remain in authorized reports and audit history.
