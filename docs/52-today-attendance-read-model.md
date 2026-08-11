# Today Attendance Read Model

**Task:** `WL-401`  
**Completed:** 2026-08-11  
**Outcome:** Complete locally. WorkLedger now serves and renders an authorized, organization-local
Today attendance read model with current state, a bounded immutable-event timeline, an explainable
provisional calculation, and stable warning/blocker codes.

## Contract and time boundary

`GET /v1/me/attendance/today` is an authenticated self-service operation. Its strict Zod response
contains:

- a trusted, minute-aligned `asOf` instant plus the organization-local date and IANA timezone;
- the current attendance state, state-start instant, optimistic `attendanceRevision`, and valid
  next domain actions;
- `PROVISIONAL` or `INCOMPLETE` calculation status, an explicitly named nullable estimate, public
  holiday name, and stable warning/blocker codes; and
- at most 500 current-local-date punch events in source order, with an explicit truncation flag.

The current date is never represented as final or `COMPLETE`. An available estimate exposes only
integer-minute scheduled, holiday-reduction, absence-reduction, expected, worked, break,
absence-credit, approved-adjustment, credited, and balance values. An unreliable calculation
returns `estimate: null` rather than invented totals.

The service floors the trusted server instant to a whole minute, derives the local date with
Temporal, and creates DST-aware local-day instant bounds. Open work/break intervals end at that
calculation instant for the estimate. Source punch events remain immutable and are never split or
rewritten.

## Application and persistence composition

The application service performs one transaction-scoped read:

1. resolve the active account, employee capability, current roles, organization, and timezone;
2. apply the central `ATTENDANCE_READ` employee-target policy to the current employee;
3. load the attendance head, bounded reconstruction source, effective schedule/policy versions,
   public holiday, latest persisted absence effects, and unresolved correction/absence facts;
4. reconstruct sessions and organization-local work/break intervals in the domain package; and
5. calculate and map the provisional response without persisting a projection or ledger entry.

The specialized repository remains organization/employee scoped. It uses the latest clock-in
before the local-day boundary only as a reconstruction anchor and reads no more than 501 source
events to detect the 500-event boundary. Effective-dated configuration keeps gap and overlap
outcomes explicit. Missing/overlapping schedule or policy assignments and invalid policy
configuration produce specific calculation blockers.

The transport excludes employee/organization identifiers, command identifiers, actor identity,
request/correction/absence detail, sickness classification, notes, raw policy JSON, and ledger
records. Timeline event identifiers are opaque UI keys only. Responses are `private, no-store` and
carry the normal server-owned request identifier.

## Browser behavior

TanStack Query owns the validated Today response under `['self', 'attendance', 'today']`. A response
with an older `attendanceRevision`, or an older `asOf` value at the same revision, cannot replace
newer cached attendance state. Query data and the session-bound CSRF value remain memory-only.

The Today route presents, in DOM order:

1. one focused route heading, date, and estimate timestamp/background-update text;
2. current state and text-only valid-next-action information;
3. provisional balance or a clear unavailable-calculation explanation;
4. persistent blocker/warning lists;
5. a semantic calculation description list; and
6. an ordered event timeline or valid empty state.

Loading uses a named progress indicator without a noisy live region. Background refresh shows
ordinary visible text. Dependency failure is one persistent assertive alert with a safe request
reference and retry action. Session expiry clears protected in-memory state and follows the
existing focused sign-in recovery path. The loading and ready states preserve the same heading
node, so route focus is not lost when prefetched data resolves.

The intrinsic responsive grids preserve source/reading order, reflow without horizontal page
overflow at the tested 390 px viewport, and do not use CSS order or dense placement. State,
warning, blocker, provisional, and incomplete meaning is always present in text rather than color
alone.

## Verification evidence

- Domain unit tests cover open work and break estimates, cross-midnight local attribution,
  DST-short-day bounds, missing configuration, head/source disagreement, holiday work, stable
  threshold signals, and preservation of valid state when only calculation configuration fails.
- Contract tests validate the strict bounded response and reject an over-broad employee identifier.
- PostgreSQL/API integration covers real authentication, self authorization, effective
  schedule/policy resolution, reconstruction, exact minute totals, no-store/minimized transport,
  missing-schedule incompleteness, and deactivated-employee denial.
- Component tests cover ready, warning, incomplete, empty, dependency-error/retry, route focus, and
  axe behavior.
- Chromium tests cover post-sign-in Today focus, visible state, axe, reduced-motion mobile reflow,
  and absence of horizontal page overflow.
- The generated OpenAPI 3.1 artifact includes the selected Today operation and remains
  reproducible without exposing Better Auth internals or runtime secrets.
- The database-enabled canonical gate passes 24 native contract checks, 141 unit/component tests,
  19 integration tests, four Chromium scenarios, OpenAPI drift, formatting, lint/boundaries,
  strict TypeScript, and the production build.

## Deferred ownership

- `WL-402` and `WL-403` add idempotent clock mutations and deliberate action feedback. This task
  exposes valid next actions as text but does not render non-functional clock controls or claim an
  optimistic state.
- `WL-404` enriches the timeline and calculation-detail workflow after all clock transitions exist.
- `WL-405` owns polling, offline behavior, cross-tab/device refresh, and mutation retry conflicts.
- Absence workflow work will provide exact effective coverage/work-intersection facts for
  `WORK_DURING_ABSENCE`; correction/post-lock workflows will provide approved adjustment sources.
  The read model does not infer either fact from unrelated minute totals.
- Current event reconstruction is intentionally bounded at 500 rows. Truncation makes the
  calculation incomplete; `WL-1001` owns measured scale and any justified archival/query design.
