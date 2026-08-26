# Phase 14 Translation Glossary

**Task:** `WL-1400` structure, populated and approved during `WL-1408`
**Source locale:** `en-GB`
**Review locales:** `de-DE`, `es-ES`

## Review contract

This glossary fixes product meaning before translation. It is not a runtime catalog and does not
mark any German or Spanish wording as approved. One fluent German reviewer and one fluent Spanish
reviewer must approve their own locale before `WL-1408` can complete.

Reviewers record their name, date, scope, and outcome in the approval table. Privacy sensitive
terms, destructive actions, attendance state, balance concepts, and approval decisions require
explicit review. Machine translation may assist a draft but cannot fill the approval fields.

## Status values

| Status | Meaning |
|---|---|
| `NOT_DRAFTED` | No candidate translation exists |
| `DRAFTED` | Candidate wording exists but has no fluent review |
| `CHANGES_REQUIRED` | A fluent reviewer rejected or qualified the wording |
| `APPROVED` | A fluent reviewer accepted the wording for the recorded context |

## Term structure

| Term ID | Canonical `en-GB` | Product meaning and context | Avoid or protect | Privacy level | `de-DE` candidate | `de-DE` status | `es-ES` candidate | `es-ES` status |
|---|---|---|---|---|---|---|---|---|
| `attendance.clockIn` | Clock in | Start a working attendance interval | Do not imply geolocation or surveillance | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `attendance.startBreak` | Start break | End current work segment and begin a break | Do not imply the employee clocked out | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `attendance.resume` | Resume work | End the active break and continue working | Do not use language that creates a new employment session | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `attendance.clockOut` | Clock out | End the current work session | Do not imply account sign out | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `attendance.working` | Working | Current attendance state with an open work segment | Never label as productivity or activity monitoring | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `attendance.onBreak` | On break | Current attendance state with an open break | Keep distinct from absence | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `attendance.offWork` | Off work | No active attendance session | Do not imply absence, leave, or account inactivity | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.expected` | Expected time | Work obligation after schedule, holiday, and absence reductions | Not planned shift length or elapsed day length | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.worked` | Worked time | Counted elapsed work segments after break subtraction | Do not call productive time | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.credited` | Credited time | Worked minutes plus eligible absence or adjustment credit | Keep distinct from worked time | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.dailyBalance` | Daily balance | Credited minutes minus expected minutes for one date | Preserve positive and negative meaning without celebration | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.flexibleTime` | Flexible time | Explainable time account balance, not pay or overtime entitlement | Never claim payroll value | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.postedBalance` | Posted balance | Sum of committed time account ledger entries | Keep distinct from projected balance | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `time.projectedBalance` | Projected balance | Posted balance plus eligible unposted projection | Must sound provisional | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `record.incomplete` | Incomplete record | Record that cannot produce a final calculation | Do not imply employee fault | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `request.correction` | Correction request | Request to add an approved interpretation while preserving original events | Do not imply original data deletion | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `absence.absence` | Absence | Approved or reported time away from expected work | Generic team views must stay neutral | Sensitive |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `absence.vacation` | Vacation | Approval based leave request | Avoid jurisdiction specific statutory claims | Sensitive |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `absence.sickness` | Sickness | Privacy protected report and HR workflow classification | Never expose diagnosis or classification in ordinary team output | Restricted |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `absence.unavailable` | Unavailable | Neutral team availability label | Do not reveal absence subtype | Restricted |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `absence.unpaidLeave` | Unpaid leave | Configured absence type without credited time | Do not make payroll calculations or legal claims | Sensitive |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `workflow.pendingDecision` | Pending decision | Submitted item awaiting an eligible reviewer | Do not promise a decision time | Normal |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `workflow.changesRequested` | Changes requested | Reviewer returned an item for a new version | Keep distinct from rejection | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `workflow.approved` | Approved | Eligible reviewer accepted the current version | Do not imply monthly lock or payment | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `workflow.rejected` | Rejected | Eligible reviewer did not accept the current version | Keep distinct from changes requested; use neutral notification wording where the detail is hidden | Sensitive |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `notification.itemNotApproved` | Item not approved | Generic privacy safe outcome notification | Do not expose workflow type, sickness classification, reason, or reviewer detail | Restricted |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `monthly.submitted` | Submitted | Employee submitted a ready month for review | The month is not yet approved or locked | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `monthly.locked` | Locked | Approved snapshot is protected from ordinary mutation | Do not imply data is deleted or impossible to adjust | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `monthly.postLockAdjustment` | Post lock adjustment | Append only change linked to a locked baseline | Original snapshot remains unchanged | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `role.manager` | Manager | Employee with application role plus current direct report scope | Role alone does not grant employee access | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `role.hrAdministrator` | HR administrator | Organization HR authority for allowed people and policy actions | Does not bypass self approval rules | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `role.systemAdministrator` | System administrator | Technical account and operations authority | Does not grant HR or employee record access | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `action.requestChanges` | Request changes | Reviewer asks for a new version with a reason | Destructive and decision context requires full wording review | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `action.deactivate` | Deactivate | Prevent future ordinary use while preserving history | Never use delete language | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |
| `action.revokeSession` | Revoke session | End one authenticated session | Keep distinct from account deactivation | Critical |  | `NOT_DRAFTED` |  | `NOT_DRAFTED` |

## Message review fields

Every privacy sensitive or critical message family records these fields during `WL-1408`:

| Field | Required value |
|---|---|
| Message namespace and key | Stable semantic catalog identity |
| Product context | Route, output, or communication where it appears |
| Audience | Employee, manager, HR, system administrator, or signed out visitor |
| Parameters | Names, types, and whether each value is user entered or system controlled |
| Privacy check | Confirmation that the wording and parameters disclose no broader data |
| Accessibility check | Accessible name, live announcement, error, or ordinary visible copy |
| German reviewer | Name, date, decision, and notes |
| Spanish reviewer | Name, date, decision, and notes |

## Fluent review approvals

| Locale | Reviewer | Date | Scope | Outcome | Notes |
|---|---|---|---|---|---|
| `de-DE` |  |  | Terminology, privacy, critical workflows, generated output | Pending | Required before `WL-1408` completion |
| `es-ES` |  |  | Terminology, privacy, critical workflows, generated output | Pending | Required before `WL-1408` completion |
