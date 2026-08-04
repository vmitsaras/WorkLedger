# WorkLedger Implementation Roadmap

## Roadmap rules

- Phases are dependency-ordered.
- A phase is complete only when its exit gate has evidence.
- A checkbox or merged file is not evidence by itself.
- The task board in `docs/08-task-board.md` is authoritative for task IDs and dependencies.
- Product code begins only after Phase 0 passes.
- Build vertical slices after the domain and platform foundations exist.

---

# Phase 0 — Product and Domain Contract

## Objective

Remove ambiguous business rules before they become database columns or UI assumptions.

## Deliverables

- Ratified product charter.
- MVP and non-goals.
- Roles and permission matrix.
- Domain terminology and invariants.
- Attendance state machine.
- Time calculation rules.
- Absence and entitlement rules.
- Monthly locking rules.
- Route map and accessibility acceptance criteria.
- Threat model and operations assumptions.
- Accepted architecture decisions.
- Example calculation catalog.

## Exit gate

Phase 0 passes when:

- [ ] Every blocking item in `docs/10-open-decisions.md` is resolved.
- [ ] At least 25 calculation and workflow examples have explicit expected results.
- [ ] No rule contradicts the permission matrix, state machine, or ledger model.
- [ ] Every MVP feature has a role, route/workflow, data owner, and test strategy.
- [ ] Non-goals are explicit.
- [ ] Architecture boundaries and dependency directions are accepted.
- [ ] The exact first scaffold task is identified.

**Gate evidence:** planning-audit report and updated `PROJECT_STATUS.md`.

---

# Phase 1 — Repository Foundation

## Objective

Create a strict, reproducible monorepo and development environment without implementing business features.

## Deliverables

- pnpm workspace.
- `apps/web`, `apps/api`, and package boundaries.
- Strict TypeScript, ESM, lint, format, test, and build configuration.
- PostgreSQL development container.
- Validated environment configuration.
- Baseline CI.
- React Aria shadcn foundation and design tokens.
- Storybook or equivalent isolated UI environment.
- Contributor setup documentation.

## Exit gate

- [ ] Fresh clone installs from the lockfile.
- [ ] Web and API health placeholders run locally.
- [ ] PostgreSQL starts and can be reached by an integration test.
- [ ] `format:check`, lint, typecheck, baseline tests, and build pass.
- [ ] CI runs the same checks.
- [ ] UI foundation includes visible focus, reduced-motion tokens, and a semantic link/button example.
- [ ] No feature or calculation logic has leaked into scaffold files.

**Gate evidence:** command output, CI result, and setup documentation.

---

# Phase 2 — Framework-Independent Domain Engine

## Objective

Implement the authoritative calculation and state rules before API persistence or production UI.

## Deliverables

- Domain primitives and value objects.
- Effective-dated schedule and policy resolution.
- Attendance transition validation.
- Punch-event reconstruction.
- Multiple sessions and break handling.
- Expected/worked/credited/balance calculation.
- Overnight splitting.
- Timezone and daylight-saving handling.
- Absence credit integration.
- Time-account ledger calculation.
- Structured warnings and incompleteness.
- Comprehensive deterministic test suite.

## Exit gate

- [ ] All documented example calculations pass as executable tests.
- [ ] Spring-forward and fall-back cases pass.
- [ ] Overnight sessions split correctly.
- [ ] Invalid transition and overlap cases are rejected with stable codes.
- [ ] Domain package has no framework, database, environment, network, or UI dependency.
- [ ] Results are deterministic when supplied the same inputs and clock.
- [ ] Coverage prioritizes decision branches and invariants rather than an arbitrary percentage alone.

**Gate evidence:** domain test report and domain-calculation review.

---

# Phase 3 — Data, Authentication, and API Foundation

## Objective

Persist domain facts safely, authenticate users, enforce scoped authorization, and establish stable API conventions.

## Deliverables

- Initial PostgreSQL schema and migrations.
- Repository interfaces and implementations.
- Transaction helpers.
- Authentication and sessions.
- Employee-account link.
- Application roles and scope policies.
- Error envelope and validation.
- Audit events.
- Idempotency records.
- Realistic seed organization.
- OpenAPI exposure or generation.

## Exit gate

- [ ] Migrations apply to a clean database and are repeatable in tests.
- [ ] Authentication success, failure, reset/session basics, and deactivation are tested.
- [ ] Permission matrix has API tests for owner, scoped manager, unrelated actor, HR, and system administrator.
- [ ] A transaction can append an immutable event and audit entry atomically.
- [ ] Repeated idempotency key returns the original result.
- [ ] Errors expose stable codes without sensitive internals.
- [ ] Seed data covers the scenarios in `docs/14-seed-scenarios.md`.

**Gate evidence:** migration test, integration test suite, and security review.

---

# Phase 4 — Employee Attendance Vertical Slice

## Objective

Deliver a complete, reliable Today workflow from database through API to accessible UI.

## Deliverables

- Authenticated application shell.
- Today query.
- Clock in.
- Start break.
- Resume.
- Clock out.
- Timeline/list.
- Daily calculation breakdown.
- Stale state, duplicate, retry, network, and session-expiry behavior.
- Responsive mobile experience.

## Exit gate

- [ ] The complete attendance flow works across web, API, database, domain, audit, and tests.
- [ ] Duplicate clicks and lost responses do not duplicate events.
- [ ] Two tabs/devices converge on server truth.
- [ ] Current state and result are announced appropriately without timer spam.
- [ ] Keyboard-only and mobile completion pass.
- [ ] Loading, offline, conflict, permission, and server-error states exist.
- [ ] The user can explain the displayed daily balance.

**Gate evidence:** Playwright flow, API integration tests, axe checks, and manual accessibility notes.

---

# Phase 5 — Time Records and Corrections

## Objective

Let employees understand historical records and correct errors through an auditable approval process.

## Deliverables

- Week/month My Time views.
- Daily details.
- Accessible timeline and textual alternative.
- Missing-entry and policy warnings.
- Correction request.
- Manager comparison and decision.
- Approved adjustment and recalculation.
- Original value preservation.

## Exit gate

- [ ] Normal and incomplete days are understandable.
- [ ] Correction approval changes calculated results without altering raw history.
- [ ] Rejection leaves results unchanged and preserves decision history.
- [ ] Unauthorized managers cannot review the request.
- [ ] Locked-period corrections follow the adjustment path.
- [ ] Focus, errors, comparison semantics, and decision feedback pass accessibility review.

---

# Phase 6 — Absence and Leave Balances

## Objective

Implement vacation, sickness, unpaid leave, entitlement accounting, and cancellation without privacy leakage.

## Deliverables

- Configurable absence types.
- Entitlement ledger.
- Vacation request.
- Sickness report/acknowledgement.
- Partial-day/hourly absence.
- Personal calendar and agenda.
- Pending/reserved balance.
- Cancellation and restoration.

## Exit gate

- [ ] Weekends, holidays, zero-hour weekdays, and partial days calculate correctly.
- [ ] Pending, approved, cancelled, and rejected requests affect balances correctly.
- [ ] Sickness data is minimized in manager and team views.
- [ ] Overlap and insufficient-balance policies return explicit results.
- [ ] Calendar workflow is keyboard usable and has an equivalent agenda/list.
- [ ] Ledger history explains the current balance.

---

# Phase 7 — Manager Approvals and Team Availability

## Objective

Give managers one accessible, permission-safe place to resolve work without exposing unnecessary employee information.

## Deliverables

- Approval inbox.
- URL-owned filters, sorting, and pagination.
- Decision panel.
- Team current status.
- Team calendar and agenda.
- Notification records and optional email.
- Delegation data hooks reserved for later use.

## Exit gate

- [ ] Manager sees only authorized reports.
- [ ] Every decision has enough context and an audit event.
- [ ] Self-approval is impossible.
- [ ] Team views use privacy-safe labels.
- [ ] Filters are shareable/restorable and keyboard usable.
- [ ] Email failure does not roll back a successful domain decision.

---

# Phase 8 — Monthly Closure and Reporting

## Objective

Create trustworthy monthly records that can be reviewed, locked, exported, and adjusted without rewriting history.

## Deliverables

- Period calculation and blockers.
- Employee submission.
- Manager changes request and approval.
- Locking.
- Approved snapshot.
- Post-lock adjustments.
- Time, balance, leave, and missing-record reports.
- Safe CSV and printable record.

## Exit gate

- [ ] A complete seeded month can be submitted, approved, locked, and exported.
- [ ] Ordinary edits are rejected after submission/lock according to state.
- [ ] Post-lock correction creates a linked adjustment.
- [ ] Approved snapshot remains reproducible.
- [ ] CSV formula injection tests pass.
- [ ] Reports are scoped, paginated, and accessible.

---

# Phase 9 — Administration

## Objective

Allow authorized HR users to manage employees and effective-dated configuration without damaging history.

## Deliverables

- Employee creation/invitation/deactivation.
- Employment periods.
- Teams and manager assignment.
- Schedule management.
- Time-policy management.
- Absence-type and entitlement management.
- Holiday calendars.
- Audit explorer.

## Exit gate

- [ ] Schedule/policy changes require effective dates.
- [ ] Past approved results remain unchanged after future configuration changes.
- [ ] Deactivation revokes access and preserves history.
- [ ] Complex forms have error summaries and keyboard-complete workflows.
- [ ] Privileged changes produce audit events.
- [ ] Administrator routes remain usable at realistic data density.

---

# Phase 10 — Production Hardening and Self-Hosting

## Objective

Make WorkLedger safe and operable outside the developer laptop.

## Deliverables

- Full authorization/security suite.
- Concurrency and performance review.
- Full accessibility audit.
- Production Docker Compose.
- Backup and tested restore.
- Upgrade and migration procedure.
- Health, readiness, logs, and diagnostics.
- Retention/export controls.
- Security and operations documentation.

## Production release gate

- [ ] Clean production-style deployment works with documented configuration.
- [ ] Backup and restore have been executed successfully.
- [ ] Upgrade from the previous test release works.
- [ ] No known critical/high security issue remains.
- [ ] No known critical accessibility blocker remains in core workflows.
- [ ] Permission matrix tests pass.
- [ ] Load/concurrency targets for expected organization size pass.
- [ ] Logs redact sensitive data.
- [ ] Failure modes are documented.

---

# Phase 11 — Portfolio Presentation

## Objective

Present the product decisions and engineering quality clearly to recruiters, collaborators, and open-source users.

## Deliverables

- Astro public project site.
- Safe seeded demo and reset.
- Architecture and domain diagrams.
- Accessibility statement and test notes.
- Threat model summary.
- Calculation examples.
- Screenshots or short workflow media.
- README, setup, limitations, and roadmap.

## Portfolio release gate

- [ ] A visitor understands the problem and product within the first screen.
- [ ] Demo data tells realistic employee and manager stories.
- [ ] Documentation explains why immutable events, ledgers, Temporal, scoped permissions, and locking were selected.
- [ ] Accessibility is demonstrated rather than merely claimed.
- [ ] Installation and local setup are reproducible.
- [ ] Known limitations are direct and credible.
