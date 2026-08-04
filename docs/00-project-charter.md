# WorkLedger Project Charter

## Product statement

WorkLedger is a self-hosted working-time and absence application that gives employees clear control over their own records and gives managers and administrators reliable approval, reporting, and audit workflows.

It should answer four questions without detective work:

1. Who is currently working, on break, or unavailable?
2. How much time has each employee worked compared with their expected time?
3. Which absence or correction requests require action?
4. How was every balance and approved record calculated?

## Problem

Organizations often split attendance, flexible-time balances, vacation, sickness, corrections, and monthly reconciliation across spreadsheets, email, chat, paper, and unrelated tools. Employees cannot verify their balances, managers lack one approval queue, and historical records become difficult to explain.

## Initial target

- Small and medium-sized organizations.
- Approximately 10–250 employees.
- Office, hybrid, and remote work.
- Fixed or flexible weekly schedules.
- One organization per self-hosted installation.
- One primary organization timezone in the MVP.
- Single-stage manager approvals.
- Monthly timesheet closure.

## Primary users

### Employee

- Records attendance and breaks.
- Reviews daily, weekly, and monthly totals.
- Understands flexible-time and leave balances.
- Requests absence and corrections.
- Reviews and submits monthly records.

### Manager

- Reviews requests from authorized reports.
- Sees team availability without unnecessary private information.
- Resolves incomplete records.
- Reviews and approves monthly periods.

### HR administrator

- Manages employees, schedules, policies, holidays, entitlements, and reports.
- Applies controlled exceptional adjustments.
- Reviews organization-wide audit history.

### System administrator

- Operates authentication, configuration, backups, updates, and service health.
- Does not automatically receive access to sensitive HR records unless separately authorized.

## Product principles

1. **Transparent:** Every total can be explained.
2. **Correct before clever:** Domain calculations and history outrank dashboard decoration.
3. **Employee-respectful:** No surveillance, productivity scoring, or overtime gamification.
4. **Accessible:** WCAG 2.2 AA and keyboard-complete flows are baseline requirements.
5. **Auditable:** Corrections preserve history; approved periods can be trusted.
6. **Configurable, not legally presumptive:** Policies are organizational configuration, not hardcoded claims of legal compliance.
7. **Self-hostable:** Installation, backup, restore, upgrade, and diagnostics are part of the product.
8. **Portfolio-grade:** Architecture, tests, UX decisions, accessibility, and tradeoffs are visible and documented.

## Primary success outcomes

- An employee can use the valid clock action directly from Today on desktop or mobile.
- An employee can explain their daily and monthly balance from the interface.
- A manager can process requests from one queue with sufficient context.
- A schedule or policy change affects only its valid date range.
- A duplicate or retried clock request does not create duplicate events.
- A locked month can be corrected without erasing the approved history.
- An unauthorized user cannot access another employee’s protected data.
- A new self-hosted installation can be backed up and restored from documented procedures.
- Critical workflows pass automated and manual accessibility tests.

## MVP release success criteria

| ID | Criterion | Required evidence |
|---|---|---|
| SC-001 | An invited, active employee can sign in, sign out, and complete a password reset; invalid credentials receive a generic recoverable error, and a deactivated account cannot establish or retain a session. | Authentication integration tests and the critical account browser flows. |
| SC-002 | From Today, an employee can complete clock in, break start, break end, and clock out; after each step the server state and one valid primary action are clear. | API integration tests plus keyboard-only and narrow-viewport browser tests. |
| SC-003 | Repeating the same clock command returns the original result, while concurrent different commands produce exactly one accepted transition and a stable conflict/current-state response. | Idempotency and two-device concurrency tests. |
| SC-004 | Every accepted case in `docs/11-example-calculation-catalog.md` has one explicit expected result and maps to executable tests or named workflow evidence. | Catalog-to-test/evidence mapping completed by the relevant phase gates. |
| SC-005 | An employee can trace daily and monthly expected, worked, absence-credit, adjustment, credited, and balance minutes to their source records without hidden arithmetic. | Calculation-breakdown component tests and seeded end-to-end review. |
| SC-006 | Approved corrections preserve original punch facts, and post-lock corrections preserve the approved snapshot while adding a linked adjustment. | Domain, database, API, and locked-period workflow tests. |
| SC-007 | Vacation reservation, approval, rejection, and cancellation produce explainable leave-ledger effects, while team views reveal no sickness classification or medical detail. | Ledger sequence and privacy-shaped response tests. |
| SC-008 | A complete calendar month can be reviewed, submitted, approved, locked, exported, and later adjusted without ordinary edits changing the locked snapshot. | Seeded monthly-closure browser flow, snapshot tests, and CSV safety tests. |
| SC-009 | Every protected endpoint passes the actor/scope cases defined in `docs/02-roles-permissions.md`, including self-approval, former-scope, deactivated-account, system-administrator, and cross-organization denial cases. | Permission-matrix integration suite. |
| SC-010 | All critical workflows in `docs/05-ux-accessibility.md` are keyboard complete, pass configured automated accessibility checks, and have no unresolved critical accessibility blocker after screen-reader, zoom/reflow, forced-colors, reduced-motion, and touch review. | Automated reports and recorded manual review notes. |
| SC-011 | A clean self-hosted deployment can be configured without committed secrets, migrated, health-checked, backed up, and restored with verified record and ledger integrity. | Production-style deployment, backup/restore, migration, and integrity-check evidence. |

## Product success evidence

A release is credible when a seeded organization can complete this full scenario:

1. Administrator creates employees and assigns schedules and managers.
2. Employee records a normal day with a break.
3. Employee forgets a clock-out and submits a correction.
4. Manager approves the correction.
5. Employee requests vacation.
6. Manager reviews balance and team availability, then approves it.
7. The employee’s time and leave ledgers update correctly.
8. Employee submits the month.
9. Manager approves and locks the month.
10. Administrator exports a safe monthly record.
11. A later correction creates an adjustment rather than rewriting history.

## Assumptions

- A deployment serves one organization of approximately 10–250 employees and uses one primary IANA organization timezone.
- Teams are the only organization grouping in the MVP; department hierarchies are deferred.
- Each employee has at most one current direct manager. Approvals are single-stage, and approval delegation is deferred.
- English is the only shipped UI language in the MVP. Dates, times, numbers, and durations remain locale-aware and translation-ready without shipping German or Greek translations.
- Working-time rules vary by organization and jurisdiction. WorkLedger provides configurable product rules, while the deploying organization remains responsible for selecting lawful policies and retention settings.
- Vacation and absence entitlement, flexible-time balances, corrections, and post-lock changes are ledger-based or otherwise source-linked and explainable.
- Duration precision is one minute, with no rounding by default.
- Public holidays are configured by an administrator; the MVP does not depend on a legal holiday API.
- Attendance mutations require a live server connection. The responsive web application may explain offline state but does not queue offline clock commands.
- In-app records provide the core notification history. External email delivery is optional and must not determine whether a domain decision succeeds.
- Attachments and medical-document upload are outside the MVP.
- Payroll, salary, and jurisdiction-specific legal compliance calculations remain outside the product boundary.
