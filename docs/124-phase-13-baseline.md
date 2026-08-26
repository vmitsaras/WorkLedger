# Phase 13 baseline: Phase 12 implementation audit

**Task:** `WL-1300`  
**Audit date:** 2026-08-25  
**Status:** Complete  
**Scope:** Evidence, documentation, a separate test fixture, and visual baselines only  
**Production change:** None

## 1. Authority and boundary

This audit adopts attendance clarity, operational trust, and workflow usability hardening as the numbered Phase 13. The former portfolio presentation scope is retained only as the unnumbered draft in `docs/drafts/portfolio-presentation.md`. It has no task IDs or version gate.

The supplied handoff pack is planning input. The repository's accepted domain, permission, history, ledger, accessibility, security, and API rules remain authoritative. The canonical copy of the supplied image is `docs/references/phase-13/today-redesign-reference.png`. It governs visual hierarchy only. It does not override contracts, calculation semantics, time values, recovery behavior, or accessibility requirements.

`WL-1300` does not change a production domain, database, API, TypeScript, or UI source. It does not fix a finding, begin `WL-1301`, alter a Phase 12 snapshot, add a dependency, or change the `0.13.0` manifests.

## 2. Implementation inventory

| Surface | Route, components, and presentation | Query and API client | Contract, service, domain, and repository | Existing test evidence |
| --- | --- | --- | --- | --- |
| Today | `/today`; `apps/web/src/routes/today-page.tsx`; `today-attendance-overview.tsx`; `today-attendance-controls.tsx`; `calculation-attention.tsx`; `daily-time-breakdown.tsx`; `today-attendance-timeline.tsx` | `todayAttendanceQuery`, key `['self', 'attendance', 'today']`; `loadTodayAttendance`; `GET /v1/me/attendance/today`; four attendance command endpoints | `packages/contracts/src/today.ts`; `apps/api/src/attendance/routes.ts`; `today-service.ts`; `packages/domain/src/current-day-attendance.ts`; `calculation-signals.ts`; `packages/database/src/repositories/contracts.ts`; `PostgresTodayAttendanceRepository` in `postgres.ts` | Domain current-day and attendance tests; `apps/api/test/today-attendance.integration.test.ts`; `apps/web/test/application-shell.component.test.tsx`; `apps/web/e2e/application-shell.spec.ts` |
| My Time and balances | `/my-time` and legacy `/my-balances`; `apps/web/src/routes/my-time-page.tsx`; calculation attention, period controls, summaries, day records, ledgers | `myTimeQuery`, key `['self', 'time', query]`; `loadMyTime`; `GET /v1/me/time`; time-record detail query | `packages/contracts/src/time.ts`; `apps/api/src/time/routes.ts`; `my-time-service.ts`; `packages/domain/src/time-account-ledger.ts`; daily projection and time-account repository contracts; `PostgresDailyProjectionRepository`; `PostgresTimeAccountRepository` | Time-account domain tests; API My Time integration coverage; application-shell component and E2E balance states |
| Approvals | `/approvals`; `approval-inbox-page.tsx`; `/approvals/:approvalId`; `approval-detail-page.tsx`; filters, table, decision forms, history | `approvalInboxQuery`, `approvalDetailQuery`; `GET /v1/approvals`; `GET /v1/approvals/:id`; decision endpoint | `packages/contracts/src/approvals.ts`; approval routes, service, authorization, and database inbox/history repositories | `apps/api/test/approval-inbox.integration.test.ts`; approval inbox/detail component tests; existing Phase 12 desktop and mobile screenshots |
| Team | `/team`; `team-status-page.tsx`; `/team/calendar`; `team-calendar-page.tsx`; availability table and calendar/list alternatives | `teamStatusQuery`; `teamCalendarQuery`; `GET /v1/team/status`; `GET /v1/team/calendar` | `packages/contracts/src/team-status.ts`; `team-calendar.ts`; team routes, services, authorization, and repositories | `apps/api/test/team-status.integration.test.ts`; team status/calendar component tests; existing Phase 12 screenshots |
| Employees and teams administration | `/employees`; `employee-administration-page.tsx`; employee directory and team administration; employee detail, assignment, schedule, and policy routes | Employee and team administration queries under `['administration', ...]`; `/v1/hr/employees*`; `/v1/hr/teams*`; schedule, policy, role, team, and manager assignment mutations | Administration contracts; API administration routes/services; employee, team, assignment, schedule, and policy repositories | `administration.component.test.tsx`; API administration tests; existing Phase 12 screenshots |
| Navigation and headings | `application-shell.tsx`; `page-header.tsx`; `router.tsx`; route metadata; desktop navigation, mobile navigation, skip link, and route-heading focus | `selfContextQuery` and router loaders determine visible navigation and permission gates | Self-context contract and authorization policy determine role and capability visibility | Application-shell component tests; E2E navigation, route focus, narrow layout, and axe checks |
| Statuses, tables, and overflow | Shared `StatusBadge`, `DataTable`, `Alert`, `RouteState`, and `Panel` in `packages/ui`; route-specific responsive wrappers; `apps/web/src/styles.css`; `packages/ui/src/styles.css` | Route queries provide loading, stale, empty, and error state | Response schemas constrain status values; server authorization remains authoritative | Component assertions plus Phase 12 responsive screenshots and new Today overflow assertions |
| Shared errors and route focus | `apps/web/src/routes/route-boundary.tsx`; shared error envelope handling in `api-client.ts`; title and focus logic in `router.tsx` and `PageHeader` | TanStack Query owns server state and refresh; React Router owns route boundaries; API client parses request references and stable error codes | `packages/contracts/src/api.ts`; API error conventions; Fastify error mapping | Application-shell error, session, retry, route-heading focus, and axe tests |

The Phase 12 Approvals, Team, Employees, and shared-state screenshots remain the canonical evidence for those surfaces. `WL-1300` does not duplicate them.

## 3. Today source trace

The current read path is:

1. `PostgresTodayAttendanceRepository.loadSource` reads the attendance head, immutable punch events through the minute-aligned `calculationAsOf`, effective schedule and policy assignments, holiday, latest absence effects, unresolved corrections, unresolved approval-required absences, and the configured warning threshold.
2. `calculateCurrentDayAttendance` reconstructs sessions and intervals, splits them by organization-local date, calculates the provisional daily estimate, and calls `calculateDailyCalculationSignals`.
3. `apps/api/src/attendance/today-service.ts` authorizes the employee, invokes the calculation, maps it into the Today contract, and serves it through `GET /v1/me/attendance/today`.
4. `loadTodayAttendance` validates the response. `todayAttendanceQuery` keeps the newest attendance revision in the TanStack Query cache.
5. `TodayPage` renders the header, overview, actions, attention, calculation details, and timeline. It owns transient mutation, reconnect, dialog, and focus state.

Three source facts are not currently supplied by the Today repository. The Today service passes approved adjustments as zero, `hasSourceLedgerMismatch` as false, and `workDuringAbsence` as false. Therefore the Today page cannot expose a nonzero approved adjustment, `LEDGER_SOURCE_MISMATCH`, or `WORK_DURING_ABSENCE` from the production path even though the contract and renderer allow those codes.

## 4. Visible Today value inventory

| Visible value | Field or source | Classification | Current transformation and caveat |
| --- | --- | --- | --- |
| Organization-local date eyebrow | `localDate` | Authoritative server fact | Client locale formatting only |
| Page title and description | Static component copy | Fixture or placeholder text, not data | Product copy in `TodayPage` |
| “Estimate updated” time | `asOf` plus `timeZone` | Authoritative server fact with client formatting | Server floors the instant to a minute; client formats the time |
| Updating label | TanStack Query `isFetching` | Client state | Replaces the update time during background refresh |
| Current status | `attendance.state` | Authoritative server fact | Client maps `OFF_WORK`, `WORKING`, and `ON_BREAK` to labels |
| “Since” time or no-active-session copy | `attendance.activeSince` plus `timeZone` | Server-derived value with client formatting | Derived from reconstructed current session, then formatted in the browser |
| Available action buttons | `attendance.validActions` | Server-derived value | Domain `validAttendanceActions` selects actions; client maps labels and primary order |
| Pending action label | Mutation intent | Client state | Clocking, starting break, resuming, or clocking out copy |
| Attendance revision | `attendance.attendanceRevision` | Authoritative server fact, not visible | Used for optimistic concurrency and stale-state recovery |
| Attendance success, conflict, and unknown-outcome copy | Mutation result or API error | Client formatting of authoritative outcome | Request reference is shown only when the safe envelope supplies one |
| Active-break confirmation copy | Attendance state and attempted command | Client behavior around authoritative state | Confirmation does not submit until explicitly accepted |
| Calculation status badge | `calculation.status` | Server-derived value | Client labels `PROVISIONAL` or `INCOMPLETE` |
| Today balance estimate | `calculation.estimate.balanceMinutes` | Server-derived value | Provisional credited minus expected minutes; it is not the posted flexible-time balance |
| Credited amount in summary equation | `estimate.creditedMinutes` | Server-derived value | Formatted as hours and minutes |
| Expected amount in summary equation | `estimate.expectedMinutes` | Server-derived value | Formatted as hours and minutes |
| Provisional explanation | Static component copy | Fixture or placeholder text, not data | Explicitly says the amount is not posted or locked |
| Public holiday name | `calculation.holidayName` | Authoritative server fact | Shown only when present; absence category is deliberately not returned |
| “Needs attention” group | `calculation.blockers` and `warnings` | Server-derived code set | Client maps each code to title, description, and recovery copy |
| Scheduled time | `estimate.scheduledMinutes` | Server-derived value | Effective schedule minutes for the local date |
| Public-holiday reduction | `estimate.holidayExpectedReductionMinutes` | Server-derived value | Scheduled minutes when the date is a holiday, otherwise zero |
| Absence reduction | `estimate.absenceExpectedReductionMinutes` | Server-derived value | Sum of latest stored absence effects; category remains hidden |
| Expected time | `estimate.expectedMinutes` | Server-derived value | Schedule minus holiday and absence reductions |
| Worked time | `estimate.workedMinutes` | Server-derived value | Reconstructed work intervals through `asOf`, excluding breaks |
| Break time | `estimate.breakMinutes` | Server-derived value | Reconstructed break intervals through `asOf`; not subtracted twice |
| Absence credit | `estimate.absenceCreditMinutes` | Server-derived value | Sum of latest stored absence effects without medical detail |
| Approved adjustments | `estimate.adjustmentMinutes` | Server-derived value in the DTO | Production Today currently supplies zero rather than reading an adjustment source |
| Credited time | `estimate.creditedMinutes` | Server-derived value | Worked plus absence credit and approved adjustments |
| Estimated balance in breakdown | `estimate.balanceMinutes` | Server-derived value | Same provisional daily delta as the summary, not a ledger balance |
| Timeline count | `timeline.length` | Client formatting of authoritative facts | Singular or plural copy only |
| Timeline timezone and date | `timeZone` and `localDate` | Authoritative server facts with client formatting | Explains the presentation boundary |
| Timeline event label and description | `timeline[].type` | Authoritative event fact with client formatting | Client maps four stable event types to copy |
| Timeline event time | `timeline[].occurredAt` plus `timeZone` | Authoritative server fact with client formatting | Preserves returned order for identical instants |
| Timeline-empty copy | Empty `timeline` | Client formatting | Does not invent attendance data |
| Timeline-incomplete alert | `timelineTruncated` | Server-derived fact | Rendering states the calculation is incomplete |

The Phase 13 audit fixture is purpose-limited test data. Its values are fixtures, while the same DTO fields in production are authoritative or server-derived as classified above.

## 5. Warning and blocker registry

Every item in these tables blocks monthly submission when it is a blocker. Warnings never block submission by themselves.

### Warnings

| Code | Server trigger | Rendered title and recovery | Blocking | Evidence and gap |
| --- | --- | --- | --- | --- |
| `WORK_ON_ZERO_EXPECTED_DAY` | Expected is zero, worked is greater than zero, and the date is not a holiday | “Work recorded on a zero-expected day”; opens calculation details | No | Domain and component automated evidence |
| `WORK_ON_HOLIDAY` | Expected is zero, worked is greater than zero, and the date is a holiday | “Work recorded on a public holiday”; opens calculation details | No | Domain and component automated evidence |
| `WORK_DURING_ABSENCE` | `workDuringAbsence` is true | “Work overlaps credited absence”; links to the event timeline | No | Renderer exists, but production Today hardcodes the input false; production reachability is unverified |
| `FLEX_POSITIVE_THRESHOLD_EXCEEDED` | Provisional daily balance is strictly greater than the positive warning threshold | “Positive flexible-time threshold reached”; links to My Time balances | No | Domain derivation is automated; semantics are misleading because the trigger is a daily delta |
| `FLEX_NEGATIVE_THRESHOLD_EXCEEDED` | Provisional daily balance is strictly less than the negative warning threshold | “Negative flexible-time threshold reached”; links to My Time balances | No | Preserved in the WL-1300 fixture; semantics are misleading because the trigger is a daily delta |

### Blockers

| Code | Server trigger | Rendered title and recovery path | Blocking | Evidence and gap |
| --- | --- | --- | --- | --- |
| `ATTENDANCE_INCOMPLETE` | Open or truncated source, reconstruction failure, state mismatch, or another incomplete-attendance condition | “Attendance entry incomplete”; links to the timeline and tells the user to record only the next valid action if the day is open | Yes | Automated domain and component coverage |
| `ATTENDANCE_OVERLAP` | Reconstructed or supplied attendance intervals overlap | “Attendance intervals overlap”; links to the timeline; historical recovery is not available on Today | Yes | Automated domain coverage; correction destination is missing |
| `ATTENDANCE_INVALID_EVENT_ORDER` | Events cannot be reconstructed, current head disagrees with events, or intervals cannot be collected | “Attendance event order needs review”; links to the timeline; historical recovery is not available on Today | Yes | Automated domain coverage; correction destination is missing |
| `ATTENDANCE_INVALID_EVENT_PRECISION` | An event or reconstructed interval cannot resolve to whole minutes | “Attendance event time needs review”; links to the timeline; historical recovery is not available on Today | Yes | Automated domain coverage; correction destination is missing |
| `SCHEDULE_NOT_ASSIGNED` | No effective work schedule applies to the local date | “Work schedule missing”; asks the employee to contact an administrator | Yes | Automated domain coverage; no direct destination |
| `SCHEDULE_ASSIGNMENT_OVERLAP` | More than one effective schedule assignment applies | “Work-schedule assignment overlap”; asks the employee to contact an administrator | Yes | Automated domain coverage; no direct destination |
| `POLICY_NOT_ASSIGNED` | No effective time policy applies to the local date | “Time policy missing”; asks the employee to contact an administrator | Yes | Automated domain coverage; no direct destination |
| `POLICY_ASSIGNMENT_OVERLAP` | More than one effective policy assignment applies | “Time-policy assignment overlap”; asks the employee to contact an administrator | Yes | Automated domain coverage; no direct destination |
| `POLICY_CONFIGURATION_INVALID` | The effective policy cannot produce a reliable calculation | “Time-policy configuration needs review”; asks the employee to contact an administrator | Yes | Automated domain coverage; no direct destination |
| `CORRECTION_UNRESOLVED` | A correction for the date is submitted, changes requested, or approved but not resolved into final evidence | “Correction decision pending”; wait-only recovery | Yes | Repository trigger and renderer exist; no request destination |
| `ABSENCE_APPROVAL_PENDING` | A submitted approval-required absence covers the date | “Absence decision pending”; wait-only recovery | Yes | Repository trigger and renderer exist; no request destination |
| `LEDGER_SOURCE_MISMATCH` | Calculation source does not match posted ledger evidence | “Ledger reconciliation needed”; asks the employee to contact an administrator | Yes | Renderer and domain signal exist, but production Today hardcodes the input false; production reachability is unverified |

## 6. Today state and error matrix

| State | Current behavior | Recovery and focus | Evidence status |
| --- | --- | --- | --- |
| Initial loading while online | Page header plus loading route state; no action is shown | Route heading receives route focus | Automated component coverage |
| Ready, off work | Status, no active session, only valid server-returned actions, calculation, attention, and timeline | Clock in uses revision and idempotency key | Automated component and API coverage |
| Ready, working | Status and active-since time; start-break and clock-out actions | Successful mutation refreshes Today and focuses status when the used action disappears | Automated component and E2E coverage |
| Ready, on break | Status and active-since time; resume and clock-out actions | Clock-out opens an explicit close-break confirmation | Automated component coverage |
| Empty timeline | Explicit empty panel and organization-local context | No false events are invented | Automated component coverage |
| Incomplete calculation | Danger status, no estimate, blockers, and timeline | User is told not to rely on a partial amount | Automated component coverage |
| Background refresh with cached data | Existing data remains; header says “Updating…” | Actions remain governed by current recovery state | Automated component coverage |
| Mutation pending | All attendance actions are disabled and the selected action changes to a pending label | Duplicate submissions are prevented in the client and by server idempotency | Automated component and API coverage |
| Mutation success | Success alert reports the recorded event time; query is invalidated | Status focus moves deliberately when the used action is no longer valid | Automated component coverage |
| Mutation state conflict | No success is claimed; current state is refreshed and conflict copy names another tab or device | Status receives focus when the focused action became invalid | Automated component coverage |
| Active-break confirmation required | A modal explains that break end and clock-out share one instant | Cancel preserves state; confirm submits `confirmActiveBreak: true`; dialog focus behavior comes from React Aria | Automated component and domain coverage |
| Other-tab or device update without a mutation | Higher attendance revision produces an informational refresh message | Status receives focus only when the currently focused action is invalidated | Automated component coverage |
| Offline before any Today data | Offline page explains that actions cannot be sent or queued | Automatic refresh is required after reconnect | Automated component coverage |
| Offline with cached Today data | Cached data remains visible; danger recovery alert disables all actions | No mutation is queued | Automated component coverage |
| Reconnecting | Cached data remains; “Connection restored” says refresh is in progress | Actions remain disabled until a successful refresh | Automated component coverage |
| Dependency failure without cached data | “Today is temporarily unavailable” with retry and safe request reference | Retry button refetches | Automated component coverage |
| Dependency failure with cached data | Cached data remains; “Attendance is unavailable” disables actions and offers retry | No uncertain clock action is allowed | Automated component coverage |
| Authentication or session loss | Query and mutation state are cleared and navigation is replaced with sign-in | Pending sign-in notice announces session expiry | Automated component coverage |
| Permission loss | A 403 without an authentication code follows the recoverable load or mutation error path | It does not currently distinguish a revoked attendance capability from a dependency failure | Automated envelope behavior; permission-specific copy unverified |
| Generic or unknown mutation failure | Copy says WorkLedger could not confirm the result and tells the user to inspect refreshed state | Query invalidates before a retry; safe request reference is retained when supplied | Automated component coverage |

Manual screen-reader behavior remains a Phase 13 residual. Axe, DOM focus assertions, keyboard automation, and visual inspection are separate evidence and do not constitute a manual screen-reader pass.

## 7. Contradictions and findings

No P0 data-loss, unauthorized-access, or unbounded-overflow defect was found in this audit. The P1 and P2 findings below remain open for later tasks.

| ID | Route | Priority | Finding and contradiction | Responsible sources | Accessibility or privacy implication | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `AUD-1300-01` | Today test baseline | P1 | The Phase 12 E2E fixture reports 3h15 worked and a 15-minute break at an 11:30 Berlin `asOf`, but its timeline contains only a 9:00 clock-in. The response cannot be reconstructed from its displayed events. Phase 12 snapshots are preserved; the new fixture is separate. | `apps/web/e2e/application-shell.spec.ts` Phase 12 fixture and snapshots | Contradictory audit evidence undermines trust, including for nonvisual users | Automated fixture inspection and manual screenshot review |
| `AUD-1300-02` | Today | P1 | The flexible-time threshold warnings compare the provisional daily `balanceMinutes` with a policy threshold, then tell the user to review posted and projected flexible-time balance. Posted balance is absent from the Today DTO. | `calculation-signals.ts`; `today-service.ts`; `today.ts`; `calculation-attention.tsx` | Status meaning is misleading, not merely visual; color-independent text still communicates the wrong concept | Source trace and preserved automated baseline |
| `AUD-1300-03` | Today and My Time | P1 | Today cannot show a server-authoritative posted flexible-time balance or posted-through date. My Time owns `postedBalanceMinutes` through its ledger calculation. | `today.ts`; `time.ts`; `today-service.ts`; `my-time-service.ts`; time-account repositories | Users cannot distinguish today's provisional delta from accumulated posted balance on the primary attendance screen | Source trace; contract inspection |
| `AUD-1300-04` | Today API | P1 | The Today contract exposes provisional credited and balance fields directly in `calculation.estimate`. `docs/13-api-error-conventions.md` says `PROVISIONAL` omits final credited/balance fields and may use a separately nested provisional breakdown. | `packages/contracts/src/today.ts`; `docs/13-api-error-conventions.md` | Ambiguous status semantics can cause inconsistent presentation across routes and assistive technology | Contract and documentation inspection |
| `AUD-1300-05` | Today | P1 | Several blockers describe a recovery but provide no direct route to corrections, requests, or administrator settings. Three codes are not reachable from the current production Today service because source inputs are hardcoded. | `calculation-attention.tsx`; `today-service.ts`; repository source contract | Wait-only or administrator-only copy increases recovery cost; no private absence category is leaked | Source trace; manual route review |
| `AUD-1300-06` | Today reference | P2 | The reference image shows a 15-minute current session where the coherent handoff fixture requires 1h30, and shows a 5:00 PM finish where the handoff specifies 5:30 PM. Hierarchy is accepted, values are not. | Canonical reference image and handoff fixture description | Prevents a polished image from overriding truthful calculation and time semantics | Manual inspection |
| `AUD-1300-07` | Today and shared heading focus | P2 | Programmatic route focus on the Today H1 is highly visible as a large full-width blue outline that visually resembles a focused input. Focus itself must remain; treatment needs refinement. | `page-header.tsx`; shared styles; router focus logic | Strong focus is good, but an input-like outline can confuse visual and cognitive interpretation | Manual inspection at all five viewports; DOM focus is automated |
| `AUD-1300-08` | Today | P2 | The current hierarchy gives the provisional `−4h45m` and resulting warning more prominence than session truth and action recovery. | Today overview and attention components | Increases cognitive load and may lead users to interpret a partial-day delta as an accumulated deficit | Manual inspection and screenshot baseline |
| `AUD-1300-09` | Approvals | P2 | Phase 12 shows capable filters and table states, but the queue does not yet implement the Phase 13 triage-first presentation or saved view decisions. | `approval-inbox-page.tsx`; approval query and contracts | Dense data requires maintained headings, table semantics, and keyboard order during later changes | Existing automated and Phase 12 visual evidence; Phase 13 design unverified |
| `AUD-1300-10` | Team | P2 | Team availability is usable and privacy-minimized, but stronger filters and action linkage remain Phase 13 work. | `team-status-page.tsx`; team status contracts/service | Availability must continue to avoid sickness details and retain table semantics | Existing automated and Phase 12 visual evidence; Phase 13 design unverified |
| `AUD-1300-11` | Employees and teams | P2 | Employee and team administration share a broad surface. Search, filters, and lifecycle actions need hierarchy review without weakening role or effective-assignment rules. | `employee-administration-page.tsx`; administration queries/services | Dense controls must keep visible labels, error summaries, and permission boundaries | Existing automated and Phase 12 visual evidence; Phase 13 design unverified |
| `AUD-1300-12` | Shared tables and narrow layouts | P2 | Page-level horizontal overflow is absent in the new Today baseline, but route-specific table overflow and discoverability remain governed by existing Phase 12 evidence until their tasks begin. | Shared data table and route styles | Scroll affordances, captions, headers, and reflow must survive later redesign | Today automated; other routes existing automated/manual evidence |

## 8. Deterministic Phase 13 baseline

### Fixture identity

`PHASE_13_TODAY_BASELINE` freezes both browser time and mocked API `asOf` at `2026-08-11T10:45:00Z`, which is 12:45 PM in `Europe/Berlin`.

The fictional events are:

| Local time | Event |
| --- | --- |
| 9:00 AM | Clock in |
| 10:45 AM | Break start |
| 11:15 AM | Break end |

At 12:45 PM, the first work interval is 1h45, the break is 30 minutes, and the current work interval is 1h30. Worked and credited time are therefore 3h15. The 8h expectation produces the preserved provisional daily balance of `−4h45m`. The deliberately preserved `FLEX_NEGATIVE_THRESHOLD_EXCEEDED` warning records current behavior rather than fixing it.

All transport is mocked. Animations are disabled by Playwright screenshot comparison. The test asserts key status, time, calculation, action, and timeline copy; page-level horizontal overflow at every viewport; and axe results at the widest and narrowest viewport.

### Capture and comparison

The reproducible repository commands are:

```sh
WORKLEDGER_ASSERT_PHASE_13_BASELINES=1 pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project chromium --grep @phase13-baseline --update-snapshots
WORKLEDGER_ASSERT_PHASE_13_BASELINES=1 pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project chromium --grep @phase13-baseline
```

The 2026-08-25 capture used Node `24.18.0`, Playwright `1.61.1` with Chromium `149.0.7827.55`, and macOS ARM64. The installed package-manager wrapper attempted an unnecessary dependency refresh, so the verified run invoked the existing local Playwright executable directly with the Node 24.18.0 binary. No dependency or lockfile was changed.

| Requested viewport | Full-page image | SHA-256 |
| --- | --- | --- |
| 1440×900 | `today-audit-1440x900-chromium-darwin.png` (1440×1348) | `d6718ff940e41421254a9111abc84cf35961ed27b5f1931286b144f26286a462` |
| 1024×720 | `today-audit-1024x720-chromium-darwin.png` (1024×1396) | `a1396800c98bf50cbd953918d00add0757b143dd47522c0e1f7af556cea091bd` |
| 768×1024 | `today-audit-768x1024-chromium-darwin.png` (768×1396) | `84082a803e2bdec44d787ee3456c77709a3ff9364b4beac69e6d0b3f86985a88` |
| 390×844 | `today-audit-390x844-chromium-darwin.png` (390×1792) | `4a3ea2bee68606635caba36f32dc9468dc326f84076e446c0d0e75675f532e29` |
| 320×568 | `today-audit-320x568-chromium-darwin.png` (320×1868) | `bd56f7bc5a6b7eb35dc4a1ad9fe1b1463f02642fc327f3ff18b1cabbbea503c8` |

The full-page image height intentionally exceeds the viewport height. The update run and a separate comparison run each passed once, proving byte-stable reproduction on the recorded platform.

### Manual image review

All five images were inspected at original resolution.

- Hierarchy: Current state and next actions precede details. On narrow screens, the provisional estimate and warning still occupy excessive visual priority.
- Impossible values: The three displayed events, 3h15 worked, 30-minute break, 1h30 current interval, and 8h expectation reconcile. The provisional warning remains intentionally misleading and is finding `AUD-1300-02`.
- Clipping and order: No page-level horizontal clipping was visible. Content remains in logical document order from status and actions through attention, details, and timeline.
- Focus: The focused H1 remains visible at every viewport, but its input-like full-width treatment is finding `AUD-1300-07`.
- Privacy: The images contain no names, sickness categories or details, tokens, request references, organization secrets, or operational metadata. Event IDs and attendance revisions are not rendered.

The canonical reference image is 1586×992 with SHA-256 `de9f383232a50eba8868389f06c101d52166d41c9342e44117a8eaf7fd0588ad`.

## 9. `WL-1301` handoff boundary

`WL-1301` must decide a server-authoritative composition without guessing. Its candidate Today path is:

`PostgresTodayAttendanceRepository` → `calculateCurrentDayAttendance` and calculation signals → Today service → `packages/contracts/src/today.ts` → API client and query cache → Today route → overview, attention, breakdown, controls, and timeline.

Exact candidate file groups, to be reviewed but not changed by `WL-1300`, are:

- Database: `packages/database/src/repositories/contracts.ts`, `packages/database/src/repositories/postgres.ts`, and relevant repository tests.
- Domain: `packages/domain/src/current-day-attendance.ts`, `packages/domain/src/calculation-signals.ts`, `packages/domain/src/time-account-ledger.ts`, and their unit tests.
- API and contracts: `apps/api/src/attendance/today-service.ts`, `apps/api/src/attendance/routes.ts`, `packages/contracts/src/today.ts`, `packages/contracts/src/time.ts`, and Today integration tests.
- Web state: `apps/web/src/app/api-client.ts`, `apps/web/src/app/query.ts`, and cache ordering tests in `apps/web/test/application-shell.component.test.tsx`.
- Today presentation: `apps/web/src/routes/today-page.tsx`, `today-attendance-overview.tsx`, `calculation-attention.tsx`, `daily-time-breakdown.tsx`, `today-attendance-controls.tsx`, and `today-attendance-timeline.tsx`.
- Visual evidence: the separate `@phase13-baseline` scenario in `apps/web/e2e/application-shell.spec.ts` and the five files under `apps/web/e2e/application-shell.spec.ts-snapshots/phase-13/wl1300/`.

The posted flexible-time source already belongs to the My Time path:

`PostgresTimeAccountRepository.listForEmployeeThroughDate` → `calculateTimeAccountLedger` → `apps/api/src/time/my-time-service.ts` → `packages/contracts/src/time.ts` (`balance.postedBalanceMinutes`) → `loadMyTime` and `myTimeQuery` → `apps/web/src/routes/my-time-page.tsx`.

Today does not currently return a posted-through date. `WL-1301` must choose whether to compose ledger evidence into the Today service and contract or introduce another server-owned composition. It must not join separate browser queries and call the result authoritative without defining freshness, authorization, and error semantics.

### `WL-1301` follow-up

`WL-1301` closes `AUD-1300-01` through `AUD-1300-04` with the shared coherent fixture, nested
provisional source set, repeatable-read posted balance composition, posted-through definition, and
posted-only threshold semantics documented in `docs/125-today-authoritative-display-contract.md`.
It preserves the five `WL-1300` screenshots as historical audit evidence and adds a separate five
snapshot `WL-1301` set.

`AUD-1300-05` is only partially resolved: attention now has typed recovery metadata, but exact
partial-day work-versus-absence overlap and ledger-source mismatch still need dedicated repository
facts. `AUD-1300-06` remains a reference guardrail. `AUD-1300-07` and `AUD-1300-08` remain assigned
to the later Today hierarchy and presentation tasks.

### `WL-1302` follow-up

`WL-1302` implements the hierarchy-only reference boundary through one primary Today task region,
a rule-separated attendance-action band, and an intrinsic attention/timeline/calculation support
grid. It preserves every `WL-1301` value and all prior snapshots while adding a separate five-image
`WL-1302` set documented in `docs/126-today-information-architecture-visual-hierarchy.md`.

`AUD-1300-07` is closed: the shared route heading now shrink-wraps its existing product-owned focus
outline instead of drawing an input-like outline across the content column. The visual-hierarchy
portion of `AUD-1300-08` is closed by the task region, stable action band, and reduced provisional
value emphasis; `WL-1304` still owns the final five-part metric hierarchy. `AUD-1300-05` and
`AUD-1300-06` remain open guardrails in their assigned later work.

### `WL-1303` follow-up

`WL-1303` completes the attendance-state and recovery matrix in
`docs/127-today-attendance-state-feedback-recovery.md`. Dedicated stories now cover every
authoritative state and the pending, success, replay, stale, confirmation, rate-limit, offline,
reconnect, dependency, permission, session-expiry, and other-device paths.

The permission-loss gap recorded in section 6 is closed: Today removes and disables its exact query,
renders no cached attendance or actions, exposes no request reference, and focuses a neutral denial
route. The focus matrix also distinguishes direct Clock out while working from confirmation-based
Clock out while on break, so a remote transition cannot replace a focused same-named control without
moving context to the authoritative status. `AUD-1300-05` remains assigned to `WL-1306`; it concerns
attention-item destinations and missing repository facts, not clock-action recovery.

### `WL-1304` follow-up

`WL-1304` completes the five-part metric hierarchy in `docs/128-today-metric-hierarchy.md`.
Current attendance and the active interval now precede credited progress, estimated completion, and
the neutral provisional daily difference; the dated posted flexible-time balance remains a separate
third section that explicitly excludes today. Native progress semantics cover positive
expectations, while zero-expectation and incomplete states avoid a meaningless progress ratio.

`AUD-1300-08` is closed: the provisional daily difference no longer dominates current-session truth
or resembles accumulated debt. The new five-image `WL-1304` baseline is separate from all preserved
historical sets. `AUD-1300-05` remains assigned to `WL-1306`; the timeline and calculation-detail
work moves next to `WL-1305`.

### `WL-1305` follow-up

`WL-1305` completes the concise timeline and auditable calculation evidence in
`docs/129-today-timeline-calculation-evidence.md`. The Today snapshot now distinguishes immutable
punch events, purpose-minimized approved correction effects, and other approved adjustments. The
native disclosure contains a semantic source table, while the timeline keeps corrected and original
evidence separate in stable document order.

The dedicated five-viewport update and independent comparison passed, including axe and overflow
checks at 1440 and 320 CSS pixels. `AUD-1300-05` remains assigned to `WL-1306`, which is now the next
task; exact retail assistive-technology and browser verification remains assigned to `WL-1307`.

### `WL-1306` follow-up

`WL-1306` closes the presentation and recovery portion of `AUD-1300-05` in
`docs/130-today-actionable-attention-recovery.md`. Today now renders the server-owned attention
title, explanation, source date, blocking status, typed recovery destination, link label, and
expected next state without reducing the DTO to client-owned code arrays. Historical attendance
blockers route to the immutable correction workflow, correction input survives recoverable API
errors, and locked changes remain append-only adjustments.

Exact partial-day work-versus-absence overlap, calculation-to-ledger mismatch, and break-duration
warnings remain source gaps rather than fabricated UI signals. The dedicated Today responsive,
assistive-technology, usability, and visual sub-gate moves next to `WL-1307`.

### `WL-1307` follow-up

`WL-1307` passes the dedicated Today sub-gate in
`docs/131-today-responsive-accessibility-usability-visual-gate.md`. The current five-viewport
baseline is separate from and does not overwrite the Phase 12 images. It proves status-first action
order, 44×44 clock targets, reflow, text spacing, reduced motion, current axe coverage, and no page
overflow. Manual inspection found no impossible value, clipping, lost sign/unit, or private data.

The gate found and resolved one P1 responsive usability defect: at 320 CSS pixels the attendance
actions followed the full progress and posted-balance detail. Status and actions now form one task
column, so narrow source order is status, actions, progress, and posted balance. VoiceOver checks in
Chrome for Testing and Safari confirmed the same primary-action order and the native calculation
table's exposed structure. There is no remaining P0 or P1 Today issue; secondary-route work may
begin with `WL-1308`.

### `WL-1308` follow-up

`WL-1308` closes `AUD-1300-09` in `docs/132-approval-inbox-triage.md`. The Approval inbox now
opens on needs-review work, promotes the scoped result count and queue view before secondary
controls, promotes the status field as one URL-backed Queue view control, combines sort key and
direction into one understandable Order control, and collapses the remaining filters at every
width. The accepted URL remains the restorable view state; no named view or browser persistence was
added.

The responsive gate now uses the comparison table only when the shell content column can keep its
stable columns and Review action usable. At 768, 390, and 320 pixels a complete record list exposes
the same identity, workflow, text status, affected dates, submitted time, current team, and action
without page-level horizontal scrolling. Four current Phase 13 images, axe, URL and browser-history
tests, pagination focus, permission loss, HR access, privacy-field absence, and sensitive-query
rejection provide the bounded acceptance evidence. `AUD-1300-09` is resolved; cross-route
normalization remains assigned to `WL-1311` and `WL-1312`.

### `WL-1309` follow-up

`WL-1309` completes the Team status comprehension and actionability slice in
`docs/133-team-status-workspace.md`. Current overview totals are now keyboard-operable,
URL-backed availability filters, with a separate combinable open-record toggle and a clear
filtered-result recovery. Time-bound availability labels and deliberately broad open-record copy
make the visible state understandable without exposing absence or workflow detail.

Applicable direct-report records now lead to the generic employee-sorted Approval inbox or the
current-month Team calendar without placing an employee, request, workflow, or absence subtype in
the URL. The Team workspace destinations are explicitly named Team status, Approval inbox, and
Team calendar. The comparison table remains available at genuinely wide content widths; complete
semantic list records, four current screenshots, keyboard focus, axe, privacy, permission, target
size, and overflow assertions provide the bounded acceptance evidence at 768, 390, and 320 pixels.
Employee and team administration work moves next to `WL-1310`.

## 10. Original `WL-1300` verification result

The exact `pnpm verify` workflow passed under Node `24.18.0` and pnpm `11.20.0`. Because the existing `node_modules` workspace-state record predates the current workspace shape, pnpm was invoked through a temporary wrapper that changed `verify-deps-before-run` from automatic install to warning. The warning was recorded; no install, purge, registry refresh, manifest, or lockfile change was allowed.

Verification results:

- Toolchain, runtime configuration, reproducible OpenAPI, formatting, ESLint, 284-source/1,497-import boundaries, CSS ownership, strict TypeScript, workspace graph, and phase-version checks passed.
- All 37 tooling tests and all 343 unit/component tests passed.
- All 13 available integration tests passed; 45 PostgreSQL-dependent tests were skipped because no test database URL was configured.
- The full Playwright gate passed its 34 established scenarios across the configured browser matrix; the one Phase 13 baseline scenario was skipped without its opt-in flag.
- The unchanged Phase 12 visual command passed its 29 established Chromium flows and all 19 established snapshots; the Phase 13 scenario remained skipped.
- The Phase 13 snapshot update run passed once, and two later comparison runs passed without update mode. The final comparison covered all five files.
- The production web build, bundle budgets, and all eight public-root workspace imports passed. The largest JavaScript asset is 359,302 bytes, total JavaScript is 886,485 bytes, gzip JavaScript is 239,296 bytes, and CSS is 46,859 bytes.
- `pnpm run phase:check` reports 13 completed phase gates and version `0.13.0`.
- `git diff --check` passed after the final project-memory update.

## 11. Original `WL-1300` evidence status

The new baseline provides deterministic Chromium screenshot, axe, text, action, and overflow evidence for Today only. Existing Phase 12 evidence remains authoritative for Approvals, Team, Employees, navigation, tables, shared error states, and browser diversity. Manual keyboard and screen-reader verification is still required by the later route-specific tasks. No accessibility or privacy defect was silently fixed in this audit.
