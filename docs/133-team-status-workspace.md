# Team status comprehension, actionability, and workspace evidence

**Task:** `WL-1309`  
**Completed:** 2026-08-26  
**Outcome:** Team status now turns its current overview into privacy-safe, URL-backed filters,
uses time-bound status language, exposes a useful next step for each applicable direct report, and
keeps the same complete record meaning across wide and narrow layouts.

## Scope and authority

This task changes the Team status route presentation, generic client view state, Team workspace
labels, component and browser tests, current visual evidence, and project memory. It does not change
the Team status API, current-manager authorization, domain rules, database schema, migration,
dependency, or workspace version.

`GET /v1/team/status` remains the sole remote source. The API still returns only current effective
direct reports and purpose-minimized current availability, current team, and generic open-record
facts. Filtering occurs over that already authorized response and never changes the server request
or widens its scope.

## Comprehension and interaction decisions

| Concern | Result |
|---|---|
| Overview | All direct reports, Working now, On break, Unavailable today, and Not working now are pressed buttons with their authoritative totals. |
| Record focus | A separate People with open records toggle can combine with any availability filter. Supporting copy explains that the category may include review, employee response, or final application without exposing a workflow or absence type. |
| URL ownership | Only `availability` and `records` are accepted. Default values are omitted; unknown keys, duplicate keys, and invalid values redirect to `/team`. |
| Results | A polite result summary states the visible and total counts. A zero-result view explains the condition and restores all direct reports through one visible action. |
| Availability labels | Working now and Not working now distinguish the current instant; Unavailable today names the date boundary; On break remains unambiguous. |
| Record labels | Open records and No open records replace the less actionable unresolved wording while retaining a deliberately broad, privacy-safe meaning. |
| Row action | Open records lead to `/approvals?status=ALL&sort=EMPLOYEE&direction=ASC`; unavailable records without an open record lead to the current month in Team calendar; other records state No follow-up. |
| Workspace navigation | The Team area destinations are Team status, Approval inbox, and Team calendar. The accepted Team work-area name and authorization model remain unchanged. |

The row destinations deliberately do not include an employee ID, employee name, request ID,
workflow type, or absence subtype. The Approval inbox is sorted by employee to support discovery
inside the authorized generic collection. Team calendar opens the source response month and relies
on its own authorized data.

## Responsive and visual evidence

The route uses complete semantic list articles below `72rem`, when the application shell leaves too
little content width for stable comparison columns and a visible next step. At wider viewports it
uses a captioned comparison table with Employee, Current team, Availability, Record state, and Next
step columns.

The opt-in comparison command is:

```text
WORKLEDGER_E2E_PORT=4174 WORKLEDGER_ASSERT_PHASE_13_TEAM=1 pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project=chromium --grep "makes Team status"
```

| Viewport | Presentation | Full-page file | Raster size | SHA-256 |
|---|---|---|---:|---|
| 1440×900 | Comparison table | `team-status-1440x900-chromium-darwin.png` | 1440×1139 | `6cec40c8d8063b21eb29e6db89c064273cb3b0cdf00621c1618f03bca95f4109` |
| 768×1024 | Complete record list | `team-status-768x1024-chromium-darwin.png` | 768×1827 | `70508d7fab7e6fe8d50964a8bbf41650ea480f35a547085daa475044a1f9b331` |
| 390×844 | Complete record list | `team-status-390x844-chromium-darwin.png` | 390×2034 | `093362eadf867850d7fa66ef45508c51b2ffd611cc95ccd759987780e2a82c93` |
| 320×900 | Complete record list | `team-status-320x900-chromium-darwin.png` | 320×2125 | `e58b7fa758ebf5588738c97c08aaec76feb48b8d49ce202b41858ae0663739f3` |

The snapshot update run passed. Original-resolution inspection of all four files found no
page-level horizontal overflow, clipped filter, inaccessible next step, hidden record fact,
color-only selected state, dead interaction zone, or private workflow detail. The 1440 image keeps
the five comparison columns readable. The 768, 390, and 320 images keep every identity,
availability, team, record state, and next step in one complete article.

The Phase 12 Team images remain preserved as historical evidence. The four files above are the
current `WL-1309` acceptance baseline.

## Accessibility evidence

- One visible route `h1` remains the route-navigation focus target and the document title now
  matches Team status.
- Each overview control is a React Aria button with a visible label and count, a complete accessible
  name, `aria-pressed`, a 44-pixel target, and visible focus. URL navigation restores focus to the
  activated control.
- The record filter is labelled separately from availability so the two dimensions are not
  presented as one mutually exclusive group.
- The result count is a polite atomic status. Background refresh retains its separate polite status
  and does not move focus.
- The wide result is a captioned semantic table. The narrow result is an ordered list of articles
  with headings, definition-list facts, text status badges, and record-specific accessible link
  names.
- Empty, filtered-zero, loading, dependency error, permission denial, and session-expiry states
  preserve the existing focused route-state behavior.
- Component and browser axe checks pass. The 320 browser case also asserts a visible 44-pixel row
  action and no document-level horizontal overflow.

## Privacy and permission regression

- The Team URL parser accepts only generic availability and open-record state. It rejects employee
  search, sickness or vacation state, unknown keys, duplicates, and invalid allow-list values.
- Team status requests contain no filter query. Client view state cannot become server permission
  input or reveal whether an unauthorized person matches a filter.
- The browser never receives an absence subtype, correction type, reason, request ID, workflow
  status, or open-record count per workflow from this route.
- Row destinations contain no employee or record target. Authorization and scope are re-evaluated
  by the destination route and API.
- Existing component denial coverage and PostgreSQL-backed Team integration tests remain the
  evidence for current direct-manager scope, former and unrelated manager exclusion, and field
  minimization.

## Verification

- The Team status component file passes all seven cases, including the actionable table, URL filter
  combinations, focus restoration, complete narrow records, strict URL rejection, empty and
  dependency states, employee denial, and axe.
- The Approval inbox and application-shell component suites pass with the clarified navigation
  labels.
- The targeted Chromium flow passes at 1440, 768, 390, and 320 pixels with URL, keyboard, focus,
  action destination, 44-pixel target, no-overflow, privacy, and axe assertions.
- Full `pnpm verify` passes runtime configuration, reproducible OpenAPI, formatting, lint,
  290-source/1,518-import boundaries, CSS ownership, strict TypeScript, 37 tooling checks, 371
  unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 38
  browser scenarios with one opt-in capture skipped, and the production/public-root build.
- The production bundle measures 374,954 largest JavaScript bytes, 902,137 total JavaScript bytes,
  243,937 gzip JavaScript bytes, and 50,501 CSS bytes. Relative to `WL-1308`, this task adds 4,206
  total JavaScript bytes, 1,070 gzip JavaScript bytes, and 541 CSS bytes. The total JavaScript, gzip
  JavaScript, and CSS budgets moved narrowly to 904,000, 245,000, and 51,000 bytes.

## Remaining boundaries

`WL-1310` owns employee and team administration search, route separation, primary actions, dense
layouts, and explanatory copy. `WL-1311` owns the final cross-route navigation and microcopy
normalization. `WL-1312` owns the broader deterministic cross-route state, accessibility,
usability, and visual gate. This task does not claim a complete assistive-technology matrix or
whole-product WCAG conformance.
