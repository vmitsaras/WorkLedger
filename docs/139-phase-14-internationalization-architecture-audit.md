# Phase 14 Internationalization Architecture Audit

**Task:** `WL-1400`
**Date:** 2026-08-26
**Decision:** `docs/adr/0013-local-internationalization-and-message-ownership.md`
**Runtime changes:** None

## Outcome

The audit identifies every current route family, shared presentation owner, API prose boundary, and
generated output that Phase 14 must migrate. WorkLedger currently ships one English experience.
There is no i18n runtime, catalog, account locale, device locale preference, or language control.

The scan covered all 34 renderable route patterns in `apps/web/src/app/router.tsx`, all 30 route
modules, all 17 application components, all 13 shared UI components, the web formatting and route
presentation helpers, API services and routes, shared transport contracts, CSV generation,
notifications, account invitations, password reset hooks, print, clipboard, and the self service
data export.

The literal counts used during discovery are heuristic candidate lines rather than a message count.
Enum values, technical errors, and user entered text are not all translation messages. The tables
below are the canonical ownership inventory for implementation.

## Route inventory

| Route or surface | Audience | Present owner | Required catalog area |
|---|---|---|---|
| `/sign-in` | Signed out | `routes/auth-routes.tsx` | `auth.signIn` |
| `/forgot-password` | Signed out | `routes/auth-routes.tsx` | `auth.forgotPassword` |
| `/reset-password` | Signed out | `routes/auth-routes.tsx` | `auth.resetPassword` |
| `/activate-account` | Signed out | `routes/auth-routes.tsx` | `auth.activateAccount` |
| `/today` | Employee | `routes/today-page.tsx` and Today components | `employee.today` |
| `/profile` | Any account | `routes/profile-page.tsx` | `shared.profile` |
| `/my-time` | Employee | `routes/my-time-page.tsx` | `employee.time` |
| `/my-balances` | Employee | `routes/my-time-page.tsx` | `employee.balances` |
| `/time-records/:recordId` | Employee | `routes/daily-time-record-page.tsx` | `employee.records` |
| `/monthly-periods/:periodId` | Employee and reviewer | `routes/monthly-period-page.tsx` | `employee.monthlyPeriod` |
| `/requests` | Employee | `routes/request-history-page.tsx` | `employee.requests` |
| `/requests/new` | Employee | `routes/request-new-page.tsx` plus correction, vacation, and sickness forms | `employee.requests` |
| `/requests/:requestId` | Employee | `routes/request-detail-page.tsx` | `employee.requests` |
| `/calendar` | Employee | `routes/personal-calendar-page.tsx` | `employee.calendar` |
| `/time-records/:recordId/correction` | Employee redirect state | `app/router.tsx` | `employee.requests` |
| `/notifications` | Any account | `routes/notifications-page.tsx` | `employee.notifications` and `shared.notification` |
| `/team` | Manager | `routes/team-status-page.tsx` | `manager.team` |
| `/team-calendar` | Manager and HR | `routes/team-calendar-page.tsx` | `manager.teamCalendar` |
| `/approvals` | Manager and HR | `routes/approval-inbox-page.tsx` | `manager.approvals` |
| `/approvals/:approvalId` | Manager and HR | `routes/approval-detail-page.tsx` | `manager.approvals` |
| `/reports` | Authorized account | `routes/reports-page.tsx` | `admin.reports` |
| `/reports/:reportKey` | Authorized account | `routes/report-detail-page.tsx` | `admin.reports` |
| `/employees` | HR | `routes/employee-administration-page.tsx` | `admin.employees` |
| `/employees/new` | HR | `routes/employee-administration-page.tsx` | `admin.employees` |
| `/employees/:employeeId` | HR | `routes/employee-administration-page.tsx` and employee administration components | `admin.employees` |
| `/teams` | HR | `routes/team-administration-page.tsx` | `admin.teams` |
| `/settings/time` | HR | `routes/time-settings-page.tsx` and schedule and policy components | `admin.timeSettings` |
| `/settings/absence` | HR | `routes/absence-settings-page.tsx` and entitlement component | `admin.absenceSettings` |
| `/settings/holidays` | HR | `routes/holiday-settings-page.tsx` | `admin.holidaySettings` |
| `/audit` | HR | `routes/audit-page.tsx` and audit explorer | `admin.audit` |
| `/system/accounts` | System administrator | `routes/system-account-administration-page.tsx` | `system.accounts` |
| `/system/operations` | System administrator | `routes/system-operations-page.tsx` | `system.operations` |
| `/system/audit` | System administrator | `routes/system-audit-page.tsx` and audit explorer | `system.audit` |
| `*` and route failures | Any visitor | `routes/route-boundary.tsx` | `shared.route` |

The index route redirects and has no independent page copy. Its initial session check uses the
shared loading copy in `app/router.tsx` and must resolve signed out or account locale before the
destination shell is displayed.

## Shared browser presentation inventory

| Owner | Current presentation content | Migration rule | Task |
|---|---|---|---|
| `app/route-copy.ts` | 20 canonical route labels | Replace values with stable keys and resolve them at render time | `WL-1404` |
| `app/router.tsx` | Route titles, initial loading copy, redirect state | Route handles own keys, not rendered English | `WL-1404` |
| `app/route-presentation.tsx` | Document title and route focus contract | Resolve title before updating `document.title`; keep focus behavior | `WL-1401`, `WL-1404` |
| `components/application-shell.tsx` | Navigation, work areas, account utilities, sign out states | Resolve from active locale; retain route and focus state on switch | `WL-1404` |
| `app/workflow-status-presentation.ts` | Workflow status labels | Map stable status codes to catalog keys; tone remains code driven | `WL-1404` |
| `app/date-time-format.ts` | Dates, times, offsets, minute durations | Require explicit locale and authoritative timezone | `WL-1401` |
| `packages/ui/route-state.tsx` | Five implicit English titles | Remove product copy defaults or require caller supplied messages | `WL-1404` |
| `packages/ui/pagination.tsx` | Navigation name, summary, next and previous labels | Supply localized values through a neutral component interface | `WL-1404` |
| `packages/ui/dialog.tsx` and `drawer.tsx` | Implicit Close actions | Supply localized close labels through neutral component interfaces | `WL-1404` |
| `packages/ui/data-table.tsx` | Derived English table region name | Require caller supplied localized scroll label when named | `WL-1404` |
| React route and component modules | Headings, descriptions, labels, placeholders, errors, status text, accessible names, announcements | Replace complete messages with semantic keys; do not concatenate translated fragments | `WL-1404` to `WL-1406` |
| `apps/web/index.html` | Static `lang="en"` | Use the `en-GB` boot fallback, then synchronize resolved `lang` and `dir` | `WL-1401` |

`packages/ui/src/components/foundation-preview.tsx` contains demonstration copy. It is not routed in
the product, but its strings remain governed test and preview content so hard coded copy checks do
not need a broad package exception.

## API prose and descriptor inventory

| Current owner | English presentation crossing the boundary | Required descriptor or structured replacement | Task |
|---|---|---|---|
| `api/attendance/today-display.ts` and `contracts/today.ts` | Attention title, reason, recovery label, and status after action | Attention code, severity, action, destination, source date, and code specific safe parameters | `WL-1403` |
| `api/http/errors.ts`, `api/http/foundation.ts`, and `contracts/api.ts` | General and field error messages | Stable error and field codes plus allowlisted structured recovery context | `WL-1403` |
| `api/reports/report-service.ts` and `contracts/reports.ts` | Report title and description | Report key, available sorts, scope, and structured summary | `WL-1403` |
| `api/notifications/content.ts`, notification service, and `contracts/notifications.ts` | Stored notification title and body plus email subject | Event code and bounded safe parameters; render for browser or recipient locale | `WL-1403`, `WL-1407` |
| `api/account/self-service.ts`, administration service, and `contracts/account.ts` | English device summary such as Browser on platform | Bounded browser code and nullable platform code | `WL-1403` |
| Zod refinements in `packages/contracts` | Some validation text may reach forms, while other text only describes contract invariants | Product validation uses stable field codes; invariant diagnostics remain technical English | `WL-1403` |
| Fastify route schemas and OpenAPI setup | Technical summaries and descriptions | Keep technical English and do not include in catalogs | Excluded |
| Domain, database, audit, and log codes | Stable internal identifiers and diagnostics | Keep language neutral codes or technical English | Excluded |

The browser currently humanizes several enum and warning codes with `replaceAll('_', ' ')`, case
conversion, or direct lowercase conversion. Those patterns appear in time records, balances,
requests, approvals, personal calendar, reports, monthly review, print, entitlements, and audit.
Every one must become an exhaustive code to key mapping. Generic humanization is prohibited for
shipped product copy because it cannot express grammar, terminology, or privacy context.

`@workledger/contracts` owns the supported locale enum and every wire descriptor code and parameter
schema. `@workledger/i18n` depends on those contracts and maps them to typed catalog messages. The
contracts package never imports catalogs or a translation runtime, which prevents a package cycle
and keeps OpenAPI generation language neutral.

## Generated and outbound output inventory

| Output | Current owner | Required Phase 14 behavior | Task |
|---|---|---|---|
| Monthly print | `components/monthly-period-print.tsx` and browser print action | Localized title, labels, statuses, dates, durations, table headers, and adjustment explanation | `WL-1407` |
| Report clipboard summary | `components/report-portability-actions.tsx` | Localized complete lines using current actor locale; copy only authorized visible summary data | `WL-1407` |
| Five report CSV schemas | `api/reports/csv.ts` | Localized headings and status values; ISO dates and integer minutes stay stable; formula neutralization and limits stay unchanged | `WL-1407` |
| In app notifications | notification service and notifications route | Browser renders event descriptor with account locale | `WL-1403`, `WL-1404` |
| Notification email | `api/notifications/delivery.ts` | API renders subject and body with recipient account locale after authorization and privacy selection | `WL-1407` |
| Employee and technical account invitations | `api/administration/service.ts` sender boundary | Sender receives selected initial locale and safe activation link data | `WL-1402`, `WL-1407` |
| Password reset | `api/auth/authentication.ts` sender boundary | Sender receives authoritative account locale and safe reset link data | `WL-1402`, `WL-1407` |
| User data export ZIP | `api/retention/user-export.ts` | Keep machine readable JSON field names and filenames stable; translate only the initiating UI and status messages | Excluded artifact, UI remains in scope |

## Formatting inventory

`apps/web/src/app/date-time-format.ts` currently uses the environment locale through
`Intl.DateTimeFormat(undefined, ...)` and formats durations as English `h` and `m` fragments.
Other route modules create local `Intl.DateTimeFormat` instances, manually concatenate plurals, or
case convert values under the runtime locale. The implementation must route all product formatting
through explicit locale aware helpers.

The authoritative formatting inputs are:

| Display value | Source |
|---|---|
| Locale | Authenticated account, or signed out resolution order from ADR 0013 |
| Direction | Static property of the resolved supported locale |
| Event date and time | Stored instant plus authoritative response timezone |
| Business date | Stored date only value, formatted without changing its business date |
| Minute duration and balance | Integer minutes from domain or contract data |
| Lists and counts | Structured values from the authorized response |
| User entered text | Stored original value, rendered verbatim and safely |

## Risk register

| ID | Risk | Severity | Control and evidence owner |
|---|---|---|---|
| `I18N-R01` | Protected routes flash the device or fallback locale before account context loads | High | Blocking account locale bootstrap and browser test in `WL-1401` and `WL-1402` |
| `I18N-R02` | Server owned recovery meaning moves into browser inference | High | Typed descriptor contract and integration tests in `WL-1403` |
| `I18N-R03` | Sickness or reviewer detail leaks through keys, parameters, URLs, logs, or generic notification text | High | Bounded parameter types, privacy review, and output tests in `WL-1403`, `WL-1407`, and `WL-1409` |
| `I18N-R04` | Locale formatting changes authoritative dates, timezone attribution, or integer minute meaning | High | Explicit locale plus authoritative timezone tests in `WL-1401`, `WL-1405`, and `WL-1409` |
| `I18N-R05` | German or Spanish expansion breaks 320 pixel reflow, tables, dialogs, focus, or announcements | High | Pseudo locale plus accessibility and responsive evidence in `WL-1404` to `WL-1409` |
| `I18N-R06` | Catalog fallback hides missing or mismatched keys and parameters | High | Catalog parity, interpolation, plural, and descriptor checks in `WL-1401` and `WL-1408` |
| `I18N-R07` | Enum humanization or string concatenation produces mixed or ungrammatical output | Medium | Exhaustive code to key maps and prohibited pattern checks in `WL-1403` to `WL-1407` |
| `I18N-R08` | Eagerly bundled catalogs exceed the current application budget | Medium | Per locale lazy loading and separate chunk budgets in `WL-1401` and `WL-1408` |
| `I18N-R09` | Locale save failure leaves UI, React Aria, title, `lang`, and `dir` inconsistent | High | Atomic client switch and rollback tests in `WL-1402` and `WL-1404` |
| `I18N-R10` | Translation interpolation enables markup injection or changes user entered text | High | Text only resources, safe bindings, no user HTML, and security tests in `WL-1401` and `WL-1409` |
| `I18N-R11` | CSV localization weakens formula protection or changes machine significant values | High | Keep one CSV cell neutralization path and assert ISO dates and integer minutes in `WL-1407` |
| `I18N-R12` | Pseudo locale or unsupported locale enters production storage | Medium | Production allowlist schema and negative contract tests in `WL-1401` and `WL-1402` |

## `WL-1400` acceptance evidence

| Requirement | Evidence |
|---|---|
| Route and output inventory | This document, route, shared browser, API, generated output, and formatting sections |
| Accepted architecture decision | ADR 0013 |
| API prose boundary | API prose and descriptor inventory plus ADR 0013 ownership table |
| Risk register | `I18N-R01` through `I18N-R12` above |
| Translation glossary structure | `docs/140-phase-14-translation-glossary.md` |

No dependency, catalog, contract, migration, application source, manifest, lockfile, or version was
changed by this audit.
