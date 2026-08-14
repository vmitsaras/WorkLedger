# UX and Accessibility Specification

## 1. Experience direction

WorkLedger should feel calm, precise, transparent, and operational. It must not resemble surveillance software.

- Employee views: spacious and focused.
- Manager/admin views: balanced density with clear hierarchy.
- Strong typography and tabular numerals for time values.
- Neutral surfaces with restrained semantic accents.
- No gamification of long workdays.
- Every important total has an explanation path.

## 2. Main navigation

### Employee

- Today
- My time
- My balances
- Requests
- Calendar

Notifications and Profile are account utilities available from the application shell. Monthly periods and individual records are reached from My time, Requests, Approvals, or Reports rather than duplicated in primary navigation.

### Manager additions

- Team
- Approvals
- Team calendar

### HR additions

- Employees
- Reports
- Time settings
- Absence settings
- Holiday calendars
- Audit

### System-administrator additions

- Accounts and sessions
- Operations
- Technical audit

A technical-only system-administrator account does not receive employee navigation. A combined-role account receives the union of eligible navigation, but navigation never weakens field minimization or the prohibition on privileged self-action.

Navigation visibility is convenience only; the API enforces authorization.

## 3. Route map

### Route rules

- Route definitions own authentication boundaries, capability gates, document titles, a visible `h1`, URL parsing, loading/error boundaries, and optional query prefetch. TanStack Query remains the single owner of server-state lifecycle and mutations.
- Protected routes redirect an unauthenticated actor to `/sign-in`. An authenticated actor without the required capability receives an explicit permission-denied route state. A named target outside the actor's current scope produces `403 ACCESS_DENIED`; an authorized lookup of a genuinely absent target produces not found.
- The default authenticated destination is `/today` for an account with active employee capability and `/system/operations` for a technical-only system-administrator account. A signed-in actor who visits an authentication route returns to their eligible default destination.
- Path parameters use opaque record identifiers except for date-only `YYYY-MM-DD`, calendar-month `YYYY-MM`, and allow-listed report keys. Route titles and analytics-free operational logs never interpolate sensitive request data.
- URL search state is limited to non-sensitive view, date range, page, sort, generic workflow status, broad non-sensitive workflow category, and opaque team/employee identifiers where the actor is already authorized. An absence subtype, including sickness classification, notes, reasons, entitlement values, names, email addresses, and other person-identifying search text never appear in a path, query, or hash.
- `/requests/new`, `/requests/:requestId`, and `/approvals/:approvalId` are type-neutral. The authorized response determines the workflow presentation; sickness or another sensitive absence type is never encoded in the route.
- A route may render several role-specific actions, but the server-authorized resource and current state determine which actions are available. Client route guards and hidden navigation are never authorization evidence.
- Browser back/forward restores the prior route and non-sensitive filters. Draft complex-form state is not persisted in the URL or browser storage; after an unexpected navigation, only server-saved drafts explicitly added by a later scoped task may be restored.

### Authentication and account-entry routes

| Route | Eligible actor and observable purpose | Implementation owner |
|---|---|---|
| `/sign-in` | Unauthenticated account signs in with credentials; generic failure copy does not reveal account existence. | `WL-302` authentication contract; `WL-400` route and UI |
| `/forgot-password` | Unauthenticated actor requests recovery and receives the same neutral completion state for known and unknown identifiers. | `WL-302` contract; `WL-400` route and UI |
| `/reset-password` | Holder of a valid 30-minute single-use reset grant sets a new credential; invalid, expired, and consumed grants share one safe recovery state. The no-referrer/no-store page captures the Better Auth query grant only in memory, immediately cleans browser history, never loads third-party resources, and returns to normal sign-in after revoking all sessions. | `WL-302` contract; `WL-400` route and UI |
| `/activate-account` | Invited account uses a 24-hour single-use grant to establish its credential, then signs in normally and reaches only the capability allowed by active account/employee state. Invalid, expired, and consumed invitations share a safe reissue/support path and the reset-route privacy controls. | `WL-900` |

### Employee and shared record routes

| Route | Eligible actor and observable purpose | Implementation owner |
|---|---|---|
| `/today` | Active employee views authoritative attendance state, valid clock actions, today's timeline, calculation, warnings, and next approved absence. | `WL-400`–`WL-406` |
| `/my-time` | Active employee reviews their week/month records, totals, warnings, and links to daily/monthly detail using URL-owned date/view state. | `WL-500` |
| `/time-records/:recordId` | Employee views their own daily record; current manager or HR may view a currently authorized target reached from Team, Approvals, or Reports. The view explains source events, intervals, calculation status, and correction history without rewriting raw punches; eligible non-self HR may start a reasoned privileged correction/adjustment from this context. | `WL-501`–`WL-505` |
| `/my-balances` | Active employee sees separately labelled posted/projected flexible-time balance and ledger plus leave available/reserved/projected balance and entitlement ledger. Phase 5 supplies the time-account portion; `WL-601` owns completion of the combined route. | `WL-500`, `WL-601` |
| `/requests` | Active employee creates a request through a type-neutral entry point and reviews their correction, absence, cancellation, and post-lock request history. | `WL-503`, `WL-602`–`WL-606`, `WL-803` |
| `/requests/new` | Active employee chooses an eligible workflow and completes one policy-specific form without encoding the type or draft in the URL. | `WL-503`, `WL-602`–`WL-604`, `WL-606`, `WL-803` |
| `/requests/:requestId` | Request owner views the current status, versioned history, authorized details, calculation/ledger effect, and available correction, withdrawal, or cancellation action. Current manager/HR use approval routes for decisions. | `WL-503`, `WL-602`–`WL-606`, `WL-803` |
| `/calendar` | Active employee views personal holiday and absence information with equivalent month-grid and agenda/list presentations. | `WL-605` |
| `/monthly-periods/:periodId` | Self, current manager, or HR reviews a scoped monthly period, blockers/warnings, per-date totals, workflow decisions, immutable approved record, and post-lock adjustments according to current state. | `WL-800`–`WL-803` |
| `/notifications` | Authenticated actor reads or dismisses their generic in-app outcome/attention records and follows an authorized link to restricted detail. Notification copy does not reveal sickness/type/reason on this generic surface. | `WL-704` |
| `/profile` | Authenticated actor views account/session information, revokes their own sessions, and signs out. An actor with an employee link also sees a read-only employee summary; HR-owned identity, employment, team, schedule, and role facts are not editable here. | `WL-302`, `WL-400` |

### Manager routes

| Route | Eligible actor and observable purpose | Implementation owner |
|---|---|---|
| `/team` | Current manager views privacy-safe current status and unresolved-record indicators for current direct reports only. It never reveals an absence type or medical context. | `WL-702` |
| `/approvals` | Current manager or HR reviews a scoped, paginated queue with URL-owned non-sensitive generic-status, broad-workflow-category, current-team, affected-date, sort, and page state; counts and pagination are calculated after authorization scope. | `WL-504`, `WL-700`–`WL-701`, `WL-802` |
| `/approvals/:approvalId` | Current eligible non-self decision maker reviews one type-neutral correction, absence, cancellation, or monthly-period item and performs only actions valid for its policy and state. | `WL-504`, `WL-701`, `WL-802` |
| `/team-calendar` | Current manager or HR views neutral availability for authorized employees in equivalent calendar and agenda/list presentations. | `WL-703` |

### HR-administration routes

| Route | Eligible actor and observable purpose | Implementation owner |
|---|---|---|
| `/employees` | HR lists employees within the organization, with scoped pagination and safe non-sensitive filters. | `WL-900` |
| `/employees/new` | Eligible non-self HR creates an employee/employment record and starts the account invitation flow. | `WL-900` |
| `/employees/:employeeId` | HR views and manages one employee's employment history, team/manager assignment, schedule/policy assignment, entitlement administration, account state, and linked history through purpose-specific sections. Privileged self-edit controls are absent and rejected by the API. | `WL-900`–`WL-904` |
| `/reports` | Eligible self, current manager, or HR chooses from only the reports their scope grants. | `WL-804` |
| `/reports/:reportKey` | Eligible actor runs one allow-listed `monthly-time`, `flexible-time`, `leave`, `missing-records`, or `pending-approvals` report; scope is applied before totals/pagination and export/print uses the same minimized data. | `WL-804`–`WL-805` |
| `/settings/time` | HR manages effective-dated schedules, time policies, assignments, and the constrained organization-timezone setting with impact explanation. | `WL-902`–`WL-903` |
| `/settings/absence` | HR manages absence-type versions and employee entitlement ledger adjustments without exposing sickness records as configuration. | `WL-904` |
| `/settings/calendars` | HR manages organization holiday calendars and sees affected-date/recalculation impact before saving. | `WL-905` |
| `/audit` | HR searches authorized domain audit events through redacted summaries and purpose-specific detail. | `WL-906` |

### System-administration and operator routes

| Route or workflow | Eligible actor and observable purpose | Implementation owner |
|---|---|---|
| `/system/accounts` | System administrator manages technical accounts, system-administrator role assignment, and session revocation without HR/domain fields. Employee-linked account lifecycle remains HR-owned on `/employees/:employeeId`. | `WL-900` |
| `/system/operations` | System administrator sees safe service version, dependency/health, and migration-status diagnostics plus links to deployment procedures; it does not expose secrets, HR payloads, or browser-triggered restore/upgrade controls. | `WL-1003`, `WL-1005`–`WL-1006` |
| `/system/audit` | System administrator searches limited security/technical metadata without domain payloads or notification content. | `WL-1006` |
| Install/configure secrets and reverse proxy | Authorized host operator follows validated environment and Docker/reverse-proxy procedures outside the application UI. | `WL-105`, `WL-1003` |
| Back up and restore | Authorized host operator runs documented, verified PostgreSQL procedures outside the application UI. | `WL-1004` |
| Migrate and upgrade | Authorized host operator follows versioned migration, backup, readiness, and rollback guidance outside the application UI. | `WL-1005` |

Browser routes do not create an authorization path for host operations. Destructive restore, secret rotation, and upgrade actions remain explicit operator workflows for the MVP.

## 4. Today screen hierarchy

1. Page heading and date.
2. Current state: off work, working, or on break.
3. Primary clock control plus only the attendance actions valid for the authoritative state.
4. Current session start and today’s elapsed/credited summary.
5. Calculation breakdown.
6. Unresolved warning or correction requirement.
7. Upcoming approved absence.

Do not render organization-wide statistics on the employee’s primary screen.

## 5. Core reusable UI patterns

- Application shell and skip link.
- Page header with title, description, and actions.
- Button and router-link variants with correct semantics.
- Field, description, error, and error summary.
- Date picker, date-range picker, and time field.
- Combobox and select.
- Dialog and alert dialog.
- Menu and popover.
- Disclosure and optional tabs only when content is genuinely tabbed.
- Native/read-only table and interactive React Aria table.
- Pagination.
- Status badge with text and icon.
- Inline alert and persistent status message.
- Toast as secondary feedback only.
- Skeleton, progress indicator, empty state, and permission-denied state.
- File trigger only in a later attachment phase.

## 6. Product-specific components

- `ClockControl`
- `AttendanceStateSummary`
- `DailyTimeBreakdown`
- `AttendanceTimeline`
- `TimeBalanceSummary`
- `LeaveBalanceSummary`
- `PolicyWarningList`
- `CorrectionComparison`
- `RequestStatusHistory`
- `ApprovalDecisionPanel`
- `TeamAvailabilityList`
- `MonthlyPeriodSummary`
- `AuditEventEntry`

Product-specific components display domain results; they do not calculate them.

## 7. Semantic structure

- One `main` landmark.
- A visible `h1` for every route.
- Logical nested headings without skipped levels.
- Navigation regions labelled where multiple exist.
- Forms use `form`, `fieldset`, and `legend` where grouping is meaningful.
- Tables use captions and proper column/row headers.
- Lists use actual list markup.
- Status messages use appropriate live-region semantics only when dynamic announcement is needed.

## 8. Keyboard behavior

- All actions work without pointer input.
- Focus order matches reading order.
- No custom keyboard model when native behavior is sufficient.
- Menus, dialogs, listboxes, calendars, and tables follow their established React Aria patterns.
- The primary clock action remains reachable and does not move unexpectedly after mutation.
- Closing dialogs restores focus to the trigger unless the trigger no longer exists.
- Error-summary links move focus to the associated field.
- Route navigation places or announces focus context consistently.
- Calendar grid usage never blocks access to the equivalent agenda/list.

### Route focus and announcement contract

- Every completed client-side route navigation updates the document title and moves focus to the destination `h1`. If the navigation is the successful result of a workflow, focus may instead move to the newly rendered status heading or confirmation summary that names the outcome.
- Browser back/forward restores the previously focused element and scroll position when that element still exists; otherwise focus moves to the restored route's `h1`.
- Initial loading, background refresh, pagination, sorting, and successful inline mutations do not replace the focused element merely to announce progress. If the focused control is removed because its action is no longer valid, focus moves to the updated status heading or the next logical action.
- Route-level permission-denied, not-found, and dependency-error boundaries render a descriptive `h1`, place focus there, and offer only recovery actions valid for the actor. Error text never confirms an unauthorized sensitive target.
- Session expiry clears sensitive in-memory data, moves the actor to `/sign-in`, focuses its `h1`, and announces once that the session expired. Signing in returns only to a validated, currently authorized destination.
- Opening mobile navigation moves focus into its labelled dialog/drawer; closing it restores focus to the menu trigger. Selecting a destination closes the navigation and follows the normal destination-focus rule.
- One route contains one assertive error announcement at a time. Inline status updates use a polite status region, and repeated query refreshes, idempotent replays, or identical errors do not create duplicate announcements.

## 9. Clock-action feedback

After success, announce one concise result, for example:

- “Clocked in at 08:12.”
- “Break started at 12:04.”
- “Clocked out at 17:03. Credited time today: 8 hours 6 minutes.”

One user intent, identified by its idempotency key, produces at most one live-region announcement even if a duplicate response or replay arrives. When the original response was lost, the eventual replay may provide that one result announcement.

- Do not claim the next attendance state optimistically. Keep visible pending text and prevent repeat activation in the current tab while the request is unresolved.
- Confirm clock-out from an active break in an accessible dialog that explains it will close the break and clock out at one instant. Cancelling changes nothing; confirming sends a new deliberate request.
- On `ATTENDANCE_STATE_CHANGED`, refetch the authoritative state, retain logical focus, and announce a concise explanation such as “Attendance changed in another tab. Current status: working.”
- Offline mode never queues a clock event. Explain that no action was recorded, then refetch after reconnection before enabling a new intent.
- A response with an older attendance revision must not replace a newer view or move focus backward through prior controls.

Do not announce the running elapsed timer every second or announce each automatic retry. Visual elapsed time may update at a lower cadence while the accessible name remains stable.

## 10. Calculation breakdown and time ambiguity

- Show scheduled minutes, holiday/absence expected reductions, expected, worked, break, absence-credit, adjustment, credited, and signed balance minutes as distinct labelled values when applicable; never require users to infer the formula from a total.
- Identify `PROVISIONAL`, `INCOMPLETE`, and `COMPLETE` in text and expose blockers next to the affected local date. Provisional/incomplete estimates are labelled as estimates and never styled as final totals.
- Label posted balance separately from projected balance and list dates excluded because they are incomplete.
- Explain a zero expected day or holiday before presenting a positive worked-time balance; do not celebrate or label it as payroll overtime.
- When local wall time repeats, detail views include the UTC offset or equivalent “first/second occurrence” explanation. A correction form offers the two valid offset choices with complete accessible names.
- A nonexistent local time produces a field error explaining that the time did not occur in the selected timezone; focus/error-summary behavior follows the normal form contract.
- Daylight-saving and overnight timelines retain a list/table alternative whose elapsed totals are based on instants rather than visual spacing.

## 11. Forms and validation

- Visible label for every field.
- Explanatory text for policy consequences.
- Client validation improves speed; server validation remains authoritative.
- Failed complex submissions show an error summary and inline errors.
- Errors state the problem and correction, not merely “Invalid.”
- Date-range forms explain excluded weekends, holidays, and non-working days after calculation.
- Destructive or irreversible actions require clear confirmation.
- Disabled controls are not used to hide explanations; provide reason text.

### Absence request, review, and cancellation forms

- Before submission, present a per-date text/table summary of requested coverage, zero-minute weekends/holidays, entitlement minutes, available/pending/projected balance, and the policy's credit or expected-reduction effect. “Days” is secondary schedule-relative presentation, not an unexplained ledger unit.
- A half-day choice is labelled `First half of scheduled obligation` or `Second half of scheduled obligation` with its calculated minutes. Do not call those choices morning/afternoon; users choose a minute-specific start/end when clock-time availability matters.
- The sickness form asks only for coverage and shows a short privacy explanation. It has no diagnosis, symptoms, treatment, clinician, free-text note, or attachment field.
- Optional notes for other absence types identify who can read them and warn against entering unnecessary medical or personal detail. Reviewer reasons identify their audience before submission.
- Overlap, retrospective-limit, insufficient-balance, stale-state, and locked-period errors appear in the error summary and at the relevant coverage/decision control. Safe conflict text names an authorized date/portion, not another absence's private type.
- A manager decision view distinguishes `Approve`, `Acknowledge`, `Reject`, and `Request changes`; it never offers rejection for a report-and-acknowledge policy. Required reasons are visible before activation, not requested in an inaccessible follow-up prompt.
- Cancellation shows the still-effective coverage, permits a keyboard-complete subset selection, previews exact entitlement restoration and calculation impact, and states that the original request/history remains. Pending, partially cancelled, cancelled, and rejected states use text and not color alone.
- Successful submit, report, decision, and cancellation outcomes announce one concise result, move focus to the updated heading/status when navigation changes, and do not expose sickness/type details in generic notification previews.

### Monthly review, approval, lock, and adjustment

- Present persisted workflow state and derived readiness/adjusted status as text, never color alone. Group blockers by local date with links to the relevant record; distinguish blockers from warnings and identify when the exact current warning set still needs acknowledgement.
- The employee review uses a captioned table/list alternative with per-date expected, worked, absence-credit, adjustment, credited, and balance minutes plus period totals. Submission errors move focus to an error summary; successful submission moves focus to and announces the updated `Submitted` status.
- Eligible-reviewer detail labels `Request changes`, `Approve`, and the later `Lock month` as distinct actions for an authorized current manager or HR actor. Requesting changes exposes a visible required reason. Lock uses an accessible confirmation that explains permanence, the preserved approved snapshot, and the post-lock adjustment path; cancel restores focus without effect.
- If period/source versions become stale, keep the user's typed reason where safe, refetch authoritative state, focus the changed status/summary, and announce that no decision was recorded. Do not announce each background reconciliation check.
- A locked adjusted month offers clearly headed `Approved record` and `Current adjusted record` views. A textual adjustment table lists date, signed delta, decision status, actor/date, and explanation; users never have to infer a delta from color, strikethrough, or side-by-side visual position.

## 12. Calendar requirements

- Date selection uses React Aria date controls.
- Team events use WorkLedger-specific presentation.
- Month grid is not the only view.
- Agenda/list groups availability by date.
- Status is textually represented.
- Current date, selected date, and request status are distinct.
- No mandatory drag-and-drop.
- Narrow screens default to agenda/list where the grid would become unusable.

## 13. Table requirements

Use native tables for passive summaries. Use React Aria Table when row selection, collection navigation, or richer interaction is required.

- Caption or equivalent accessible naming.
- Header cells and sort direction.
- Row actions accessible without hover.
- URL-owned pagination and approved non-sensitive filters only. Opaque authorized team/employee IDs and broad workflow category may be used where the route contract permits; absence subtype, sickness classification, notes/reasons, entitlement, names, email addresses, and person-identifying free-text searches never enter the URL.
- Empty and partial-result states.
- Horizontal scrolling with preserved focus and context where needed.
- Card transformation only when relationships remain understandable.

## 14. Responsive behavior

Responsive changes follow available space and content fit, not user-agent or device detection. Source order remains the logical reading and focus order; CSS reordering never changes the apparent order without changing the DOM order to match.

### Mobile

- Primary employee actions remain above the fold when practical.
- Navigation becomes a labelled menu/drawer.
- Dialogs may become full-height sheets while retaining dialog semantics.
- Tables use scroll or a deliberate list transformation.
- Touch targets meet the project target size.
- Filters may collapse into a labelled disclosure or dialog, but applied filters and a clear/reset action remain visible on the results surface.
- Actions do not depend on hover, a context menu, swipe, drag, or a precisely positioned pointer.

### Desktop

- Persistent side navigation may be used.
- Manager filters and table summaries remain visible without crowding.
- Detail panels must not trap keyboard focus merely because they appear beside a table.

### Surface-specific reflow contract

| Surface | Narrow-screen behavior | Wide-screen behavior | Acceptance boundary |
|---|---|---|---|
| Application shell | One labelled navigation trigger opens a modal navigation region; utility actions remain reachable in the same logical order. | Persistent navigation may be visible beside `main`. | Skip link reaches `main`; opening/closing navigation follows the focus contract; no destination disappears solely because of viewport size. |
| Today | State, primary valid action, concise current-session summary, warnings, then calculation/timeline appear in task order. | Summary and calculation may share columns without moving the primary action after secondary content. | At 200% zoom and the narrow supported viewport, the current state and valid action remain visible without horizontal page scrolling. |
| Complex forms | Fields and explanatory summaries use one logical column; decision/submit actions follow the fields they act on. | Related fields may share rows when label, description, error, and focus order remain unambiguous. | Error summary precedes the invalid fields; zoom/reflow never separates a control from its label, error, policy consequence, or submit action. |
| Passive and interactive tables | Keep a caption and provide either contained horizontal scrolling or an explicitly designed list transformation. | Show columns needed for comparison; lower-priority fields may move into an accessible detail disclosure. | A list transformation preserves every label/value relationship and row action. Two-dimensional comparison tables may scroll within a named region rather than becoming misleading cards. |
| Original/proposed or approved/adjusted comparison | Stack explicitly headed records followed by a signed-difference summary. | Side-by-side presentation is allowed in addition to the same explicit headings and difference summary. | Meaning never depends on spatial position, strike-through, or color; reading order is original/approved, proposed/current, then difference. |
| Calendar | Agenda/list is the default when the month grid cannot remain usable; the grid remains an optional equivalent view. | Grid and agenda/list controls may appear together. | Both views expose the same authorized dates, people, neutral status, selection, and available actions; switching view preserves the selected date where possible. |
| Split list/detail or side panel | Detail follows the list as normal document content or opens as a labelled dialog when modal behavior is intended. | Non-modal detail may appear beside the list. | Visual adjacency never creates a keyboard trap or hidden reading-order jump; closing modal detail restores focus to its originating row/action. |
| Dense manager/admin filters | Filters collapse into a labelled disclosure/dialog and results retain a textual applied-filter summary. | Filters may remain persistently visible beside or above results. | Applying, clearing, or closing filters preserves a predictable focus target and updates results without moving focus into the table automatically. |

At every supported layout, status is textual, focus indicators are not clipped, browser text zoom and reflow preserve complete workflows, and controls meet the WCAG 2.2 AA target-size requirement or one of its documented exceptions. Horizontal scrolling is limited to a deliberately named data region when two-dimensional relationships require it; the page itself does not require two-dimensional scrolling.

## 15. Motion

Allowed:

- Short state transition for clock action.
- Dialog/popover entrance.
- Disclosure expansion.
- Filter-result transition.
- Success confirmation.
- Context highlight after a correction or approval.

Avoid:

- continuous pulsing “working” indicators,
- animated counters required for comprehension,
- celebratory overtime effects,
- slow route transitions,
- parallax,
- motion that changes focus order or delays action.

Under reduced motion, preserve immediate state feedback and remove spatial travel or decorative animation.

## 16. Required screen states

`Ready` is the normal loaded state. Every route owner must implement or explicitly mark not applicable each state below; a blank screen, silent failure, or indefinite skeleton is never an acceptable state.

| State | Observable route contract | Focus and announcement contract |
|---|---|---|
| Initial loading | The application shell, route title, `h1`, and a named progress indication render while content is unavailable. Skeletons do not fabricate meaningful values or row counts. | Focus remains on the route `h1`; completion is not announced unless it creates a meaningful result or requires action. |
| Background refresh | Existing authorized content remains readable and is identified as updating or last-refreshed/stale when that distinction matters. Older data never overwrites a newer version. | Focus and scroll do not move. Repeated refreshes are silent unless the actor-relevant state changes. |
| Empty | The route names what is empty, distinguishes a valid absence of records from an error, and offers only actions the actor may take. An `OFF_WORK` day with no punches is a valid Today state, not an empty-route error. | The empty-state heading participates in normal reading order; it is not repeatedly announced after refresh. |
| Partial data | Usable sections remain visible; unavailable sections and totals are explicitly identified. The UI does not present a partial total as complete or infer hidden records from missing data. | One concise status identifies the partial result; focus remains on the actor's current task. |
| Mutation pending | The initiating control exposes pending text/state and prevents duplicate activation in the current UI. Authoritative domain status is not changed optimistically. | Focus stays on the initiating control or confirmation dialog; progress is announced once when useful, not for every retry. |
| Mutation success | The updated authoritative state, version, and allowed next actions render. A toast may supplement but never replace persistent confirmation. | Announce one concise result per user intent; retain logical focus or move it to the updated status when the prior control disappears. |
| Validation failure | Safe field errors explain the problem and correction. Complex forms show an error summary before the fields and retain non-sensitive input. No mutation effect is recorded. | Focus moves to the error-summary heading; each summary link focuses its invalid control. |
| Domain or concurrency conflict | The route states that no action was recorded, shows the safe current status/version, refetches authoritative data, and offers a valid recovery path. Sensitive competing-record detail remains purpose-limited. | Focus moves to the changed status/summary only when the current control is no longer valid; announce the conflict once. |
| Stale data | Stale content is labelled, destructive/decision actions that require current state are withheld, and a refresh/review action is available. Typed reasons are retained only in memory and only when safe. | Refresh does not move focus; a material version change is announced once and focus moves only if the prior action became invalid. |
| Permission denied | The route states that the actor lacks access and offers a safe destination. It does not confirm the existence, type, owner, or status of an unauthorized sensitive record. | Focus moves to the permission-denied `h1`; no hidden control remains keyboard reachable. |
| Not found | An authorized lookup states that the record or route is unavailable and offers a parent destination. Not found is not used to disguise the specified `403` behavior for an explicit unauthorized target. | Focus moves to the not-found `h1`. |
| Network unavailable | Previously loaded content may remain visibly stale. Mutations state that nothing was recorded unless a terminal server outcome is known; attendance commands are never queued offline. | Announce loss/recovery once per transition. Reconnection refetches before enabling a new attendance intent. |
| Rate limited | The route explains that the action is temporarily limited and when/how it may be retried if safe retry information is available. Existing content remains usable. | Focus remains on the relevant action or error summary; no animated countdown is required for comprehension. |
| Retry or replay success | The terminal authoritative outcome is rendered once. An idempotent replay is not presented as a second domain event. | At most one success announcement is produced for the original intent. |
| Session expired | Sensitive in-memory query/form state is cleared and the actor is taken to `/sign-in` with a neutral expiry explanation. | Focus moves to the sign-in `h1`; expiry is announced once. |
| Maintenance or dependency failure | The route distinguishes a temporary service problem from validation or permission failure, preserves safe read-only data where possible, and provides retry/support guidance with a request identifier when available. | Focus moves only for a route-level failure; repeated dependency polling is not announced. |
| Read-only, submitted, approved, or locked | Data remains reviewable with a textual reason why ordinary edits are unavailable and the authorized correction/reopen/adjustment path, if any. Disabled controls do not hide that explanation. | Status is included in the route heading/summary; irreversible-state confirmation follows the dialog focus contract. |

### Minimum state coverage by route family

| Route family | Required states in addition to Ready |
|---|---|
| `/sign-in`, `/forgot-password`, `/reset-password`, `/activate-account` | Initial loading where token/session validation is needed; mutation pending/success; validation or generic authentication failure; invalid/expired/consumed grant; rate limited; network/dependency failure; already-authenticated redirect. |
| `/today` | Initial loading; background refresh; valid `OFF_WORK` with no events; partial calculation; mutation pending/success; stale/domain conflict; offline; retry/replay success; session expiry; dependency failure. |
| Collection routes (`/my-time`, `/my-balances`, `/requests`, `/notifications`, `/team`, `/approvals`, `/employees`, `/reports`, `/audit`, `/system/accounts`, `/system/audit`) | Initial loading; background refresh; empty; partial data; stale data; permission denied; network/dependency failure; retry; session expiry; valid pagination/filter state with zero results. |
| Detail and workflow routes (`/time-records/:recordId`, `/requests/new`, `/requests/:requestId`, `/approvals/:approvalId`, `/monthly-periods/:periodId`, `/employees/new`, `/employees/:employeeId`, settings routes) | Initial loading; not found; permission denied; mutation pending/success; validation failure; stale/domain conflict; read-only/locked where applicable; network/dependency failure; session expiry. |
| Calendar routes (`/calendar`, `/team-calendar`) | Initial loading; background refresh; empty; partial/stale data; permission denied; network/dependency failure; equivalent grid/agenda loading and selection state. |
| Report/export routes | Initial loading; background refresh; empty/zero-result filters; partial data; permission denied; stale data; export pending/success/failure; dependency failure; session expiry. |
| `/profile` | Initial loading; employee-linked and technical-only account variants; own-session revocation pending/success/conflict; session expiry; dependency failure; read-only employee facts. |
| `/system/operations` and host-operator workflows | Initial loading; healthy/degraded/unavailable dependency states; migration/version mismatch; permission denied; stale diagnostic data; safe documentation-only recovery path. |

## 17. Accessibility test matrix

### Cross-route acceptance criteria

#### AC-ROUTE-01 — Navigation context

- Given an actor activates any permitted in-app link,
- when the destination finishes routing,
- then the document title and visible `h1` identify the destination and focus follows the route focus contract without bypassing the skip link or trapping the actor in navigation.

#### AC-ROUTE-02 — Authorization boundary

- Given an unauthenticated actor, an authenticated actor without the required capability, or an actor naming an out-of-scope target,
- when they request a protected route,
- then the UI renders the authentication or explicit permission-denied behavior defined in the route rules and exposes no sensitive target fields, counts, or actions.

#### AC-ROUTE-03 — Async state recovery

- Given each required route state in section 16,
- when the corresponding fixture or failure is presented,
- then the route exposes the specified persistent text, preserves or deliberately moves focus, announces at most the meaningful change, and offers a valid recovery action without a blank or indefinite-loading result.

#### AC-ROUTE-04 — Reflow and input equivalence

- Given a route at 200% browser zoom, a narrow supported viewport, forced colors, reduced motion, keyboard-only input, or touch input,
- when the actor completes its primary workflow,
- then the same information and actions remain available in logical reading/focus order without hover-only, color-only, drag-only, or motion-dependent meaning.

#### AC-ROUTE-05 — URL and browser privacy

- Given an absence, approval, profile, entitlement, audit, or employee workflow,
- when the actor filters, navigates, submits, encounters an error, refreshes, or signs out,
- then sensitive type/classification, notes, reasons, entitlement values, names/email search text, and form payloads do not enter URLs or persistent browser storage, and session expiry removes sensitive in-memory state.

### Critical-flow acceptance criteria

#### AC-AUTH-01 — Sign-in and recovery

- Given keyboard-only use of sign-in, password-recovery request, reset, and an invalid/expired grant,
- when the actor submits valid or invalid input,
- then labels, generic safe errors, error-summary/focus behavior, pending state, neutral account-enumeration behavior, success routing, and retry guidance are all perceivable without pointer or color dependence.

#### AC-ATT-01 — Attendance sequence and concurrency

- Given each authoritative attendance state plus offline, duplicate replay, active-break clock-out confirmation, and stale revision fixtures,
- when the employee completes clock in, start break, resume, and clock out,
- then only valid actions are exposed, no optimistic or queued event is claimed, focus remains logical, and each intent produces at most one concise outcome announcement.

#### AC-TIME-01 — Record understanding and correction

- Given normal, incomplete, overnight, repeated-local-time, corrected, and locked daily records,
- when the employee reviews detail and submits a correction,
- then the event list/table, instant/offset explanation, calculation status, original/proposed comparison, validation summary, and available unlocked or post-lock path are understandable in reading order at narrow and wide layouts.

#### AC-BAL-01 — Explainable balances

- Given posted entries, eligible projections, incomplete excluded dates, leave reservations, deductions, and restoration entries,
- when the employee opens `/my-balances`,
- then posted/projected time and available/reserved/projected leave values are separately labelled and every total links to a captioned list/table of source entries without relying on sign color.

#### AC-ABS-01 — Vacation and cancellation

- Given weekends/holidays, zero-hour dates, half-day or minute coverage, insufficient/negative balance, stale state, and partial cancellation fixtures,
- when the employee requests or cancels absence,
- then the form exposes exact per-date minute effects, policy consequences, safe conflicts, versioned history preservation, and one announced result with error-summary recovery where needed.

#### AC-ABS-02 — Sickness privacy

- Given an employee sickness report and its authorized manager/HR review,
- when each actor uses the type-neutral request, notification, team, approval, and calendar routes,
- then the employee form collects no diagnosis/note/attachment, restricted review shows only purpose-specific fields, and generic/team surfaces reveal only neutral absence/availability language.

#### AC-APP-01 — Scoped approval and filters

- Given pending correction, absence, cancellation, and monthly items plus former-manager, unrelated-manager, self-action, empty-filter, and stale-version fixtures,
- when a manager filters the queue and opens or decides an item,
- then scoped counts/pagination, caption/sort semantics, type-appropriate actions, required reasons, explicit denials, and no-effect stale recovery are keyboard complete and textually clear.

#### AC-TEAM-01 — Team status and calendar equivalence

- Given authorized availability across several dates plus no results and partial dependency data,
- when a manager uses `/team` and switches `/team-calendar` between grid and agenda,
- then both calendar views expose equivalent neutral availability, selection, and actions while unrelated employees and absence reasons remain absent.

#### AC-PERIOD-01 — Submit, approve, lock, and adjust

- Given incomplete, ready-with-warnings, submitted, changes-requested, approved, locked, and adjusted-after-lock periods,
- when eligible self/manager/HR actors perform the available transition,
- then blockers, acknowledgement, per-date totals, distinct decision actions, permanence confirmation, stale/no-effect outcomes, and approved-versus-adjusted records satisfy the monthly contract without self-approval.

#### AC-PROFILE-01 — Read-only profile and sessions

- Given employee-linked, combined-role, and technical-only accounts with multiple sessions,
- when an actor opens `/profile`, revokes an own session, or signs out,
- then only the eligible account/employee summary is shown, HR-owned facts remain read-only, the targeted outcome is confirmed once, and revoked/current-session behavior is explicit.

#### AC-ADMIN-01 — Employee and effective-dated settings

- Given new/existing employee, overlap/gap, future-effective, timezone-blocked, holiday-impact, entitlement-adjustment, and privileged-self-action fixtures,
- when eligible HR creates or changes records,
- then visible labels/descriptions, impact preview, validation summary, required reason, safe confirmation, history preservation, and API-enforced self-action denial are keyboard complete and reflow without lost context.

#### AC-REPORT-01 — Reports, export, print, and audit

- Given self, current-manager, HR, system-administrator, zero-result, paginated, partial, and export-failure fixtures,
- when an actor runs an allowed report or audit search and exports/prints where permitted,
- then scope precedes totals/pagination, captions/sort/filter state are perceivable, sensitive absence/reason fields are omitted, formula-safe export status is announced, and technical/domain audit boundaries remain separate.

#### AC-NOTIFY-01 — Generic notification privacy

- Given correction, absence including sickness, cancellation, monthly, and delivery-failure outcomes,
- when the recipient opens `/notifications` or follows one item,
- then generic copy identifies that an item changed without sensitive type/reason, the restricted destination reauthorizes current access, and delivery failure never changes the recorded domain outcome.

#### AC-SYSTEM-01 — Technical administration separation

- Given a technical-only system administrator and an HR-only administrator,
- when each attempts system and domain routes,
- then the system administrator can reach only safe account/session/operation/technical-audit data, HR cannot gain technical actions from HR role, and host-only restore/secret/upgrade procedures are not exposed as browser mutations.

### Required evidence by route family

| Route family | Automated evidence | Manual evidence before its phase gate |
|---|---|---|
| Authentication/account entry | Component behavior and axe; authentication/API integration; critical E2E for invalid sign-in, neutral recovery, reset success/failure, and session expiry. | Keyboard and screen-reader error/recovery flow; 200% zoom, narrow reflow, forced colors, and touch. |
| Today | Domain/API state fixtures; component behavior and axe for every attendance state/error; E2E for full sequence, duplicate/replay, stale tab/device, offline recovery, and active-break clock-out. | Keyboard, screen-reader announcements, mobile touch, 200% zoom/reflow, forced colors, and reduced motion. |
| My time, daily detail, balances, and requests | Component/axe tests for tables/lists/forms/states; integration tests for scope/version; E2E for correction, vacation, sickness, cancellation, and locked path. | Keyboard, screen-reader form errors/comparisons, narrow table/list transformation, timezone ambiguity, touch, and forced colors. |
| Calendars and team | Component/axe equivalence tests for grid and agenda; authorization integration; E2E for view switch, date selection, and scoped availability. | Keyboard calendar/agenda, screen-reader equivalence smoke, narrow default, touch targets, zoom, and forced colors. |
| Approvals and monthly periods | Component/axe for queue, decision panels, blockers, confirmations, comparisons, and states; permission/concurrency integration; critical decision/lock E2E. | Keyboard and screen-reader decision flow, narrow/wide comparison, reduced motion, zoom, and self-action denial review. |
| Profile, notifications, and employee/settings administration | Component/axe for read-only/edit variants and complex forms; permission/field-minimization integration; E2E for own-session revoke, employee creation, invitation/activation, and effective-dated setting. | Keyboard, screen-reader validation/confirmation, reflow/touch, forced colors, and combined-role review. |
| Reports, export, and audit | Component/axe for filters/tables/empty/partial states; scoped query/export integration including formula injection; representative E2E for report/filter/export. | Keyboard sort/filter/pagination, screen-reader table smoke, narrow contained scroll/list, print review, and privacy-field inspection. |
| System administration and operations | Component/axe for diagnostic states; role-separation and redaction integration; E2E for safe account/session operation only. | Keyboard/screen-reader diagnostics, degraded-state recovery, zoom/reflow, and confirmation that host-only actions are absent. |

Exact supported browser versions remain owned by `D-502`. Until that production decision is accepted, each implementation phase uses the currently supported stable project targets while preserving these browser-independent behavioral criteria.
