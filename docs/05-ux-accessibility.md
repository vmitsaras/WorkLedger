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
- Profile

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

Navigation visibility is convenience only; the API enforces authorization.

## 3. Route map

| Route | Primary purpose |
|---|---|
| `/today` | Current attendance state and daily calculation |
| `/my-time` | Week/month records and daily details |
| `/my-balances` | Flexible-time and leave ledgers |
| `/requests` | Request creation and history |
| `/calendar` | Personal absence and holiday view with agenda alternative |
| `/team` | Privacy-safe team status and unresolved records |
| `/approvals` | Manager approval queue |
| `/team-calendar` | Team availability grid plus agenda/list |
| `/employees` | Employee administration |
| `/reports` | Time, balance, leave, and exception reports |
| `/settings/time` | Schedules and time policies |
| `/settings/absence` | Absence types and entitlements |
| `/settings/calendars` | Holiday calendars |
| `/audit` | Authorized audit explorer |

## 4. Today screen hierarchy

1. Page heading and date.
2. Current state: off work, working, or on break.
3. One primary valid clock action.
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

## 9. Clock-action feedback

After success, announce one concise result, for example:

- “Clocked in at 08:12.”
- “Break started at 12:04.”
- “Clocked out at 17:03. Credited time today: 8 hours 6 minutes.”

Do not announce the running elapsed timer every second. Visual elapsed time may update at a lower cadence while the accessible name remains stable.

## 10. Forms and validation

- Visible label for every field.
- Explanatory text for policy consequences.
- Client validation improves speed; server validation remains authoritative.
- Failed complex submissions show an error summary and inline errors.
- Errors state the problem and correction, not merely “Invalid.”
- Date-range forms explain excluded weekends, holidays, and non-working days after calculation.
- Destructive or irreversible actions require clear confirmation.
- Disabled controls are not used to hide explanations; provide reason text.

## 11. Calendar requirements

- Date selection uses React Aria date controls.
- Team events use WorkLedger-specific presentation.
- Month grid is not the only view.
- Agenda/list groups availability by date.
- Status is textually represented.
- Current date, selected date, and request status are distinct.
- No mandatory drag-and-drop.
- Narrow screens default to agenda/list where the grid would become unusable.

## 12. Table requirements

Use native tables for passive summaries. Use React Aria Table when row selection, collection navigation, or richer interaction is required.

- Caption or equivalent accessible naming.
- Header cells and sort direction.
- Row actions accessible without hover.
- URL-owned filters and pagination.
- Empty and partial-result states.
- Horizontal scrolling with preserved focus and context where needed.
- Card transformation only when relationships remain understandable.

## 13. Responsive behavior

### Mobile

- Primary employee actions remain above the fold when practical.
- Navigation becomes a labelled menu/drawer.
- Dialogs may become full-height sheets while retaining dialog semantics.
- Tables use scroll or a deliberate list transformation.
- Touch targets meet the project target size.

### Desktop

- Persistent side navigation may be used.
- Manager filters and table summaries remain visible without crowding.
- Detail panels must not trap keyboard focus merely because they appear beside a table.

## 14. Motion

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

## 15. Required screen states

Every data route considers:

- initial loading,
- background refresh,
- empty,
- partial data,
- stale data,
- permission denied,
- not found,
- validation failure,
- domain conflict,
- network unavailable,
- retry success,
- session expired,
- maintenance/dependency failure.

## 16. Accessibility test matrix

Critical flows:

1. Sign in and recover from invalid credentials.
2. Clock in, break, resume, and clock out.
3. Recover from duplicate or stale clock state.
4. Request vacation.
5. Report sickness.
6. Submit a correction.
7. Approve or reject a request.
8. Review and submit a month.
9. Create an employee.
10. Configure a schedule.
11. Navigate team calendar through agenda view.
12. Filter an approval table.

Test through:

- keyboard only,
- automated axe checks,
- screen reader smoke tests,
- 200% zoom and narrow reflow,
- reduced motion,
- forced colors/high contrast,
- mobile touch interaction.
