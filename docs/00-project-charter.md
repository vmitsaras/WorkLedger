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

- An employee can clock in or out in a few clear actions on desktop or mobile.
- An employee can explain their daily and monthly balance from the interface.
- A manager can process requests from one queue with sufficient context.
- A schedule or policy change affects only its valid date range.
- A duplicate or retried clock request does not create duplicate events.
- A locked month can be corrected without erasing the approved history.
- An unauthorized user cannot access another employee’s protected data.
- A new self-hosted installation can be backed up and restored from documented procedures.
- Critical workflows pass automated and manual accessibility tests.

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

- Working-time rules vary by organization and jurisdiction; WorkLedger provides configurable rules.
- Payroll and salary calculation are outside the initial product.
- Vacation and absence entitlement are ledger-based.
- Duration precision is one minute in the MVP.
- Public holidays are configured or imported by an administrator; the first implementation does not depend on a legal holiday API.
- The product is responsive web software, not an offline-first clock terminal.
