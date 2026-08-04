# Scope and Non-Goals

## MVP scope

### Organization and people

- One organization per installation.
- Employee records with start/end dates and status.
- Teams, departments, and one direct manager per employee.
- Employee, manager, HR administrator, and system administrator roles.
- Account invitation, activation, deactivation, and session revocation.

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

### Self-hosting

- Docker Compose deployment.
- PostgreSQL persistence.
- Reverse-proxy/TLS guidance.
- Configuration and secret documentation.
- Health checks.
- Backup, restore, migration, and upgrade procedures.
- No telemetry by default.

## Nice-to-have after MVP

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
