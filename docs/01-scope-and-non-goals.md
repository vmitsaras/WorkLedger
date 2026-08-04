# Scope and Non-Goals

The MVP is the complete set of capabilities listed below. A capability is not complete until its domain, permission, route or operator workflow, tests, accessibility behavior, and operations impact have an explicit task owner.

## MVP scope

### Organization and people

- One organization per installation.
- Employee records with start/end dates and status.
- Teams and one current direct manager per employee.
- Employee, manager, HR administrator, and system administrator roles.
- Credential sign-in and sign-out, password reset through an expiring single-use token, and secure session expiry.
- Account invitation, activation, deactivation, and session revocation.
- Read-only employee self-service profile summary plus sign-out and revocation of the employee's own sessions; HR-owned identity, employment, schedule, team, and role data is not self-editable.

### Work schedules and policies

- Effective-dated weekly schedules.
- Different expected minutes per weekday.
- Part-time and zero-hour weekdays.
- Effective-dated time policies.
- Organization timezone and holiday calendar.
- No rounding by default.
- Manual break recording with warnings; no silent automatic deduction by default.

### Attendance

- Clock in.
- Start break.
- Resume work.
- Clock out.
- Multiple work sessions in one day.
- Server-owned active state across devices.
- Idempotent mutations.
- Daily timeline and textual list.
- Expected, worked, break, absence-credit, credited, and balance minutes.
- Missing-entry and policy warnings.

### Corrections

- Employee correction request.
- Original and proposed value comparison.
- Manager approval, rejection, or changes requested.
- Controlled HR adjustment.
- Original punch history preserved.
- Locked-period adjustment path.

### Absence

- Vacation.
- Sickness.
- Unpaid leave.
- Configurable other absence.
- Full-day, partial-day, and hourly duration where enabled by policy.
- Entitlement ledger and current balance.
- Request, approval/acknowledgement, rejection, changes requested, and cancellation.
- Personal calendar and accessible agenda.
- Privacy-safe team availability.

### Monthly periods

- Open, incomplete, ready, submitted, changes requested, approved, locked, and adjusted-after-lock states.
- Employee review and submission.
- Manager approval.
- Locking.
- Post-lock adjustments.

### Reporting and administration

- Monthly time report.
- Flexible-time balance report.
- Leave balance report.
- Missing-record report.
- Pending-approval report.
- Safe CSV export.
- Printable monthly record.
- Searchable audit events.
- In-app notification records for request and decision outcomes; external email delivery is optional.

### Self-hosting

- Docker Compose deployment.
- PostgreSQL persistence.
- Reverse-proxy/TLS guidance.
- Configuration and secret documentation.
- Health checks.
- Backup, restore, migration, and upgrade procedures.
- No telemetry by default.

## Nice-to-have after MVP

- Departments or additional organization hierarchies.
- Approval delegation.
- Multi-stage approval.
- Time off in lieu.
- Formal overtime authorization.
- Leave accrual and carryover expiry.
- OpenID Connect and LDAP.
- Passkeys or TOTP.
- Webhooks and public API.
- S3-compatible attachment storage.
- Optional sick-document upload with restricted authorization.
- Scheduled reports.
- Kiosk mode.
- Organization branding.
- Additional locales and per-employee timezone display.

## MVP boundary clarifications

- Teams are the only organization grouping. Departments have no MVP data model, authorization effect, route, report, or administration flow.
- Approval is single-stage. Approval delegation does not grant access in the MVP and requires a later ADR plus explicit authorization, expiry, audit, administration, UI, and test work.
- English is the only shipped UI language. API/domain codes remain language-neutral, and user-facing formatting must not hardcode English-formatted dates or numbers.
- The profile is read-only self-service context plus account/session actions. Employees cannot edit HR-owned employment facts.
- In-app notification history is part of the product. SMTP or another external delivery adapter is optional, and delivery failure cannot roll back an approval or other domain decision.
- Attachment fields, storage, upload, download, and medical-document workflows are excluded even where future authorization or security constraints are documented.
- Attendance is online-only. The UI must surface loss of connectivity and recovery, but it must not queue clock mutations locally.

## Explicit non-goals for the first release

- Payroll, tax, salary, or wage calculation.
- Project/client billing.
- Complex shift scheduling.
- Recruiting, onboarding workflows, expenses, or performance management.
- Employee ranking or productivity scoring.
- Screenshots, keystrokes, webcam, application monitoring, or browsing history.
- Mandatory GPS or continuous location tracking.
- Biometrics or face recognition.
- Native iOS or Android applications.
- Offline-first attendance mutation queues.
- Multi-company SaaS tenancy, subscription billing, or marketplace features.
- Arbitrary no-code workflow construction.
- AI decisions about absence, discipline, staffing, or performance.
- Hardcoded jurisdiction-specific legal conclusions.

## Scope-control rule

A new feature may enter the MVP only when:

1. It directly supports the core attendance, balance, absence, approval, locking, or self-hosting journey.
2. Its domain rules and permissions are documented.
3. Its accessibility implications are defined.
4. Its test and operations cost is accepted.
5. An existing MVP task cannot cover the need more simply.
6. A stable task owns its end-to-end implementation and acceptance evidence.
