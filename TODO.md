# WorkLedger Ordered TODO

This compact list mirrors `docs/08-task-board.md`. Keep task IDs stable.

## Phase-completion version rule

When an exit-gate task is checked complete, bump the root and every workspace manifest to `0.<completed phase-gate count>.0` in the same change. Phase 0 maps to `0.1.0`, Phase 1 to `0.2.0`, and so on. `pnpm run phase:check` enforces this rule; the version does not authorize publishing, tagging, releasing, or deployment.

## Phase 0 — Product and domain contract

- [x] `WL-001` Audit and ratify the project charter and planning pack.
- [x] `WL-002` Finalize MVP, non-goals, assumptions, and success criteria.
- [x] `WL-003` Finalize roles, scopes, and permission matrix.
- [x] `WL-004` Finalize terminology and domain invariants.
- [x] `WL-005` Finalize attendance state machine and idempotency rules.
- [x] `WL-006` Finalize time-calculation rules and example catalog.
- [x] `WL-007` Finalize absence, entitlement, privacy, and cancellation rules.
- [x] `WL-008` Finalize monthly submission, approval, locking, and adjustment rules.
- [x] `WL-009` Finalize route map, screen states, responsive behavior, and accessibility acceptance criteria.
- [x] `WL-010` Finalize security, data classification, threat model, and operations assumptions.
- [x] `WL-011` Ratify architecture decisions and repository boundaries.
- [x] `WL-012` Pass the Phase 0 exit gate.

## Phase 1 — Repository foundation

- [x] `WL-100` Initialize the private pnpm workspace, single lockfile, cycle rejection, and root tooling.
- [x] `WL-101` Scaffold web, API, explicit internal package exports, and shared boundaries; defer the Astro site to Phase 11.
- [x] `WL-102` Configure strict TypeScript, linting, formatting, shared config, and executable import-boundary checks.
- [x] `WL-103` Configure test projects and baseline CI.
- [x] `WL-104` Configure local PostgreSQL and Docker development environment.
- [x] `WL-105` Configure environment, origin/proxy trust, secrets, and safe example configuration.
- [x] `WL-106` Initialize React Aria shadcn base and design tokens.
- [x] `WL-107` Add public repository, setup, contribution, license, and verified security-reporting documentation.
- [x] `WL-108` Pass the Phase 1 exit gate.

## Phase 2 — Domain engine

- [x] `WL-200` Implement domain primitives and branded value objects.
- [x] `WL-201` Implement effective-dated schedules and policy resolution.
- [x] `WL-202` Implement attendance transition validation.
- [x] `WL-203` Implement punch-to-session reconstruction.
- [x] `WL-204` Validate manual/corrected intervals and overlap constraints.
- [x] `WL-205` Implement daily expected, worked, credited, and balance minutes.
- [x] `WL-206` Implement overnight and timezone-aware day splitting.
- [x] `WL-207` Implement absence credit integration.
- [x] `WL-208` Implement time-account ledger calculations.
- [x] `WL-209` Implement warning and incompleteness detection.
- [x] `WL-210` Complete domain example and property-oriented tests.
- [x] `WL-211` Pass the Phase 2 exit gate.

## Phase 3 — Data, authentication, and API foundation

- [x] `WL-300` Implement initial PostgreSQL schema and migrations.
- [x] `WL-301` Implement repository interfaces and transaction boundaries.
- [x] `WL-302` Integrate the accepted Better Auth credential, session, CSRF, reset, and revocation profile.
- [x] `WL-303` Implement application roles and scoped authorization.
- [x] `WL-304` Implement API error envelope and validation conventions.
- [x] `WL-305` Implement separated domain/security audit persistence.
- [x] `WL-306` Implement idempotency storage for clock mutations.
- [x] `WL-307` Implement seed organization and realistic personas.
- [x] `WL-308` Generate or expose OpenAPI safely.
- [x] `WL-309` Pass the Phase 3 exit gate.

## Phase 4 — Employee attendance vertical slice

- [x] `WL-400` Build authentication routes, application shell, profile/session surface, and route boundaries.
- [x] `WL-401` Build Today query and attendance state endpoint.
- [x] `WL-402` Build clock-in mutation end to end.
- [x] `WL-403` Build break, resume, and clock-out mutations end to end.
- [x] `WL-404` Build Today timeline and calculation breakdown.
- [x] `WL-405` Add duplicate, retry, stale-state, offline, and error handling.
- [x] `WL-406` Complete keyboard, screen-reader, mobile, and reduced-motion tests.
- [x] `WL-407` Pass the Phase 4 exit gate.

## Phase 5 — Time records and corrections

- [x] `WL-500` Build My Time and the flexible-time portion of My Balances.
- [x] `WL-501` Build daily record details and accessible timeline/list.
- [x] `WL-502` Build missing-entry and policy-warning presentation.
- [x] `WL-503` Build correction request workflow.
- [x] `WL-504` Build manager correction review and comparison.
- [x] `WL-505` Preserve original values and apply approved adjustment.
- [x] `WL-506` Pass the Phase 5 exit gate.

## Phase 6 — Absence and leave balances

- [x] `WL-600` Implement absence types and policy behavior.
- [x] `WL-601` Implement the entitlement ledger and complete My Balances.
- [x] `WL-602` Build vacation request workflow.
- [x] `WL-603` Build sickness reporting with privacy boundaries.
- [x] `WL-604` Build partial-day and hourly absence support.
- [x] `WL-605` Build personal calendar plus accessible agenda alternative.
- [x] `WL-606` Build cancellation workflow and balance reversal.
- [x] `WL-607` Pass the Phase 6 exit gate.

## Phase 7 — Manager approvals and team availability

- [x] `WL-700` Build manager approval inbox and URL-owned filters.
- [x] `WL-701` Build approve, reject, and changes-requested decisions.
- [x] `WL-702` Build team status and privacy-safe availability.
- [x] `WL-703` Build team calendar and agenda alternative.
- [x] `WL-704` Implement notification records, in-app history, and optional email delivery.
- [ ] `WL-705` Complete authorization and accessibility review.
- [ ] `WL-706` Pass the Phase 7 exit gate.

## Phase 8 — Monthly closure and reporting

- [ ] `WL-800` Implement monthly period summary and blockers.
- [ ] `WL-801` Implement employee submission.
- [ ] `WL-802` Implement manager approval and lock.
- [ ] `WL-803` Implement post-lock adjustment workflow.
- [ ] `WL-804` Build monthly, balance, leave, and missing-record reports.
- [ ] `WL-805` Build safe CSV, print, and explicit clipboard behavior.
- [ ] `WL-806` Pass the Phase 8 exit gate.

## Phase 9 — Administration

- [ ] `WL-900` Build employee lifecycle and separated technical-account/session administration.
- [ ] `WL-901` Build teams and manager assignment.
- [ ] `WL-902` Build schedule and effective-date management.
- [ ] `WL-903` Build time-policy management.
- [ ] `WL-904` Build absence-type and entitlement management.
- [ ] `WL-905` Build holiday calendar management.
- [ ] `WL-906` Build audit explorer.
- [ ] `WL-907` Pass the Phase 9 exit gate.

## Phase 10 — Production hardening and self-hosting

- [ ] `WL-1000` Remediate the threat model and complete security/privacy/permission tests.
- [ ] `WL-1001` Complete performance, pagination, and concurrency review.
- [ ] `WL-1002` Complete full accessibility audit and remediation.
- [ ] `WL-1003` Complete the Caddy-reference Docker production deployment.
- [ ] `WL-1004` Document and test encrypted backup and isolated clean restore.
- [ ] `WL-1005` Document and test migrations and upgrades.
- [ ] `WL-1006` Add structured logs, failure diagnostics, and safe technical operations/audit surfaces.
- [ ] `WL-1007` Complete mandatory retention, minimization, user-export, and backup-expiry controls.
- [ ] `WL-1008` Pass the production release gate.

## Phase 11 — Portfolio presentation

- [ ] `WL-1100` Build Astro project site and case-study structure.
- [ ] `WL-1101` Add seeded demo accounts and safe demo reset.
- [ ] `WL-1102` Document architecture, accessibility, threat model, and tradeoffs.
- [ ] `WL-1103` Add screenshots, workflow media, and calculation examples.
- [ ] `WL-1104` Complete public README, known limitations, and future roadmap.
- [ ] `WL-1105` Pass the portfolio release gate.
