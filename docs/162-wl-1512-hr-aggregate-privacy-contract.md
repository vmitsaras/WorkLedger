# WL-1512 Deterministic HR Aggregate Privacy Contract

**Task:** `WL-1512`  
**Date:** 2026-08-28  
**Decision:** Accepted as an addendum to ADR 0014  
**Runtime changes:** None

## Outcome

WorkLedger may implement exactly two deterministic HR aggregate Insight purposes in `WL-1513`:
monthly closure readiness and neutral absence coverage. Both use one fixed organization-wide cohort,
one canonical organization-local calendar month, current HR authorization, and suppression before
an `InsightNativeResult` or source action exists.

The contract does not accept caller-defined teams, managers, locations, schedules, employment
attributes, absence types, request states, arbitrary ranges, rolling windows, or row identifiers. It
provides no model context, row drilldown, export, saved view, comparison builder, recommendation,
prediction, score, or write action.

## Classification and accepted flow

- **Target:** mixed self-hosted HR, attendance, reporting, and deterministic Insight application.
- **Sensitivity:** high. Neutral attendance and absence aggregates can still reveal health or
  identity through small cohorts, complements, or repeated queries.
- **Flow:** authenticated browser `POST` to the same-origin API; one repeatable-read transaction
  authorizes the HR workspace, selects the fixed cohort, calculates hidden suppression counts, and
  either constructs one minimized result or returns one generic unavailable result.
- **Privacy status:** acceptable for `WL-1513` only under every control in this document. Any new
  purpose or cohort dimension requires a new privacy decision.

## Fixed request contract

| Field | Accepted value |
|---|---|
| `workspace` | Literal `HR` |
| `kind` | `HR_MONTHLY_CLOSURE_READINESS` or `HR_NEUTRAL_ABSENCE_COVERAGE` |
| `month` | One ISO month from `2000-01` through the current organization-local month |

Unknown fields are rejected. Actor, organization, employee, manager, team, schedule, policy,
absence type, status, free text, sort, grouping, comparison, and arbitrary dates are never accepted.
The server derives organization, timezone, month boundaries, capture instant, and HR authority.
Future months are unavailable rather than projected.

Transport remains authenticated, CSRF protected, `POST` only, private, and `no-store`. Requests and
results do not enter URLs, persistent browser storage, analytics, operational logs, audit payloads,
exports, clipboard content, mail, or provider traffic.

## Thresholds and suppression order

| Control | Floor |
|---|---:|
| Eligible people in the fixed cohort | 10 |
| Contributing cases for a case-derived value | 3 |
| Non-contributing complement | 10 people |

All thresholds use hidden integer counts in the same repeatable-read transaction. The API:

1. Reauthorizes the active account, organization, `HR_ADMIN` role, and literal HR workspace.
2. Derives the canonical organization-local month and purpose eligibility rules.
3. Reads only authoritative fields needed for that purpose.
4. Calculates hidden eligible-person, contributor-person, contributing-case, and complement counts
   before creating facts, sources, actions, limitations, presentation descriptors, or logs.
5. Suppresses the **entire purpose result** when the eligible cohort is below 10, a required case
   count is below 3, or the non-contributing complement is below 10.
6. Discards all calculated metrics and hidden counts on suppression. The response contains only
   `PRIVACY_THRESHOLD_NOT_MET`, purpose, month, capture instant, and generic unavailable copy. It
   never identifies which threshold failed or its proximity.
7. Constructs the allowlisted result and native action only after every check passes.

Zero contributors is suppressed rather than published as zero. Partial release, rounding, noise,
threshold bands, and visible hidden-count diagnostics are not accepted substitutes.

## Purpose 1: monthly closure readiness

**Purpose:** show organization-wide progress through monthly closure without employee rows.

An eligible person is a distinct active employee whose employment overlaps the month and who has
positive authoritative expected minutes in at least one daily calculation. A contributor is an
eligible person whose current monthly period is not `LOCKED`. One employee contributes one case,
regardless of incomplete days or workflow transitions.

| Metric | Unit | Authoritative source | Rule |
|---|---|---|---|
| `eligibleEmployeeCount` | employees | effective employment and daily calculations | Distinct eligible employees |
| `lockedEmployeeCount` | employees | monthly periods | Eligible employees in `LOCKED` |
| `openEmployeeCount` | employees | monthly periods | Eligible employees in `OPEN` |
| `submittedEmployeeCount` | employees | monthly periods | Eligible employees in `SUBMITTED` |
| `changesRequestedEmployeeCount` | employees | monthly periods | Eligible employees in `CHANGES_REQUESTED` |
| `approvedEmployeeCount` | employees | monthly periods | Eligible employees in `APPROVED` |
| `incompleteDayCount` | employee-days | monthly daily rows | Distinct eligible employee/date pairs in `MISSING` or `INCOMPLETE` |

Employee-state counts must sum to `eligibleEmployeeCount`. This purpose exposes no worked,
expected, credited, balance, post-lock, absence, leave, request, or correction minutes.

The cohort, case, and complement floors use unlocked employees as contributors and locked employees
as the complement. Thus a month with fewer than 3 unlocked employees or fewer than 10 locked
employees is suppressed. The sole action is `OPEN_MONTHLY_TIME_REPORT`, fixed to the same month and
organization scope. That existing report independently reauthorizes HR access; it is a separate
native workflow, not an Insight row drilldown or employee link.

## Purpose 2: neutral absence coverage

**Purpose:** describe organization-wide effective absence coverage using neutral availability
semantics, never sickness, vacation, unpaid leave, entitlement, or another subtype.

An eligible person is a distinct active employee whose employment overlaps the month and who has
positive scheduled minutes on at least one date. A contributing case is one distinct currently
effective approved absence coverage source overlapping the month after approved cancellations and
superseding effects. A contributor person has at least one such case.

| Metric | Unit | Authoritative source | Rule |
|---|---|---|---|
| `eligibleEmployeeCount` | employees | effective employment and schedules | Distinct eligible employees |
| `coveredEmployeeCount` | employees | effective approved absence effects | Distinct eligible employees with coverage |
| `coverageCaseCount` | cases | effective approved absence effects | Distinct effective sources overlapping the month |
| `coveredDayCount` | employee-days | effective coverage by local date | Distinct employee/date pairs with positive coverage |
| `coveredScheduledMinutes` | minutes | coverage intersected with schedules | Integer scheduled minutes covered in the month |

Units remain separately labelled and are never added, averaged, normalized, or described as rates.
Holiday and zero-scheduled-minute coverage may remain part of an effective case but contributes
neither a covered employee-day nor covered scheduled minutes. Canceled or superseded portions do
not contribute after replacement.

The cohort floor applies to eligible employees, the case floor to effective cases, and the
complement floor to eligible employees without effective coverage. This purpose never groups or
filters by absence type and never reads or returns classification, name, entitlement account,
request/reviewer note, reason, attachment, diagnosis, comment, identity, team, manager, or row ID.

The sole action is `OPEN_TEAM_CALENDAR`, fixed to the same month with no employee, team, manager,
absence type, or request filter. The calendar retains its privacy-safe availability projection and
authorization; the Insight provides no direct row or case link.

## Repeated-query and differencing controls

- The eligible cohort is immutable per purpose. There is no caller subset, grouping, exclusion,
  search, sort, or pagination input.
- Only calendar months are accepted. Arbitrary ranges, rolling windows, day/week views, custom
  comparisons, and partial-month boundaries are rejected.
- One request produces one purpose and month. No two-cohort response, delta, percentage, rank,
  top/bottom group, or cross-purpose join exists.
- Suppression is recomputed from current authority and sources every time. A prior success cannot
  authorize or fill a later suppressed result.
- Identical requests at the same source state return the same result; no randomized noise is used.
  Safe account rate limits remain abuse controls, not the privacy boundary.
- Each adjacent month must independently pass every floor, and Phase 15 never calculates or
  presents a month-over-month delta.
- Independent DTOs and source reads prevent reuse of hidden counts or IDs as facts, actions, logs,
  error metadata, or provider context.
- Authority or source change during calculation aborts the transaction without a partial or prior
  result.

`WL-1513` must vary month, purpose, role, organization, employment, schedule, case, contributor, and
complement counts at every boundary. Suppressed responses must be indistinguishable except for
purpose, month, and capture time, and no sequence may reconstruct identity, subtype, row, or count.

## Data inventory

| Data | Source | Storage/transfer | Sensitivity | Purpose | Retention | Risk | Required control |
|---|---|---|---:|---|---|---|---|
| HR request | HR browser | Same-origin POST | High | Select purpose/month | Request only | Query leak | Strict schema, no URL/body log, no-store |
| Hidden counts | Authorized rows | Transaction memory | High | Suppression decision | Transaction only | Threshold leak | Never serialize, log, audit, cache, or persist |
| Closure aggregate | Periods/daily calculations | Response after suppression | High | Closure readiness | Request/browser memory | Workflow inference | Fixed cohort, whole suppression, no IDs |
| Absence aggregate | Employment/schedules/effects | Response after suppression | High | Neutral coverage | Request/browser memory | Health inference | No subtype read/output, case/complement floors |
| Native action | Server allowlist | Same-origin response | Moderate | Existing route | Request only | Drilldown | Same month only; no person/type filter |

## Privacy risks and evidence

| ID | Risk | Severity | Control | Required `WL-1513` evidence |
|---|---|---:|---|---|
| `HR-R01` | Small group identifies people | Critical | 10-person, 3-case, 10-person-complement floors | Exact 9/10, 2/3, and 9/10 boundaries |
| `HR-R02` | Sickness or subtype inference | Critical | Neutral coverage; subtype fields not selected | Field-absence and hostile fixtures |
| `HR-R03` | Filter differencing isolates a person | Critical | No filters, grouping, ranges, or comparisons | Strict rejection and repeated-query matrix |
| `HR-R04` | Suppression leaks hidden counts | High | Generic reason; discard metrics/actions | Response equality and log/audit absence |
| `HR-R05` | Workspace/role composition widens scope | Critical | Current literal HR workspace authority | Role, scope-loss, and cross-org tests |
| `HR-R06` | Units imply a false HR claim | High | Explicit employee/case/day/minute fields | Contract and localized unit tests |
| `HR-R07` | Action becomes row drilldown | High | Generic route/month only | URL/action and authorization tests |
| `HR-R08` | Result is persisted or sent to provider | Critical | Memory only and zero provider call | Storage/cache/log/backup/network inspection |

## Accessibility and presentation

- Suppression is a complete textual unavailable state, not zero, blank, dash, disabled chart,
  color-only state, or an error encouraging repeated probing.
- Labels always name employees, cases, employee-days, or minutes. Localization cannot change the
  authoritative integer or calendar-month meaning.
- Use headings, descriptions, and a definition list or captioned table; no chart is required. The
  source action is a real link.
- Loading, result, suppressed, stale, denied, and error states follow existing route focus and
  single-announcement rules. Identical suppression is not repeatedly announced assertively.
- Cover every locale, 320-pixel reflow, keyboard, zoom/text spacing, forced colors, reduced motion,
  and automated accessibility checks.

## WL-1513 implementation boundary and verification

`WL-1513` may add strict contracts, repository aggregate methods, one repeatable-read HR service,
same-origin transport, localized native presentation, and tests for only these purposes.
Aggregation and suppression occur in server authority before shared result construction. A
repository returns a validated safe aggregate or internal suppression decision, never rows for
browser-side aggregation.

No table, persistence, audit event, export, notification, provider call, tool/MCP exposure,
natural-language input, model interpretation, write, dependency, or migration is authorized. If a
field requires a prohibited subtype or row payload, omit it and stop for a new decision.

Verification must include strict request/result schemas; database boundary, cancellation,
supersession, zero-schedule, holiday, timezone, and month fixtures; HR/non-HR/combined-role,
deactivated, cross-organization, scope-loss, and rollback cases; differencing sequences; prohibited
field absence; browser URL/storage/cache/network and source-action inspection; multilingual and
accessibility evidence; and provider-disabled zero-call evidence.

## Safety confirmation

No publish, push, tag, upload, release, provider request, or remote write command was run. No secret
value is printed. `WL-1512` changes documentation and project memory only.
