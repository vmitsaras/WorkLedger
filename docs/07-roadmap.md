# WorkLedger Implementation Roadmap

## Roadmap rules

- Phases are dependency-ordered.
- A phase is complete only when its exit gate has evidence.
- A checkbox or merged file is not evidence by itself.
- The task board in `docs/08-task-board.md` is authoritative for task IDs and dependencies.
- Product code begins only after Phase 0 passes.
- Build vertical slices after the domain and platform foundations exist.
- Completing a phase exit-gate task requires one internal minor-version bump across the root and every workspace manifest. The version is `0.<completed phase-gate count>.0`: Phase 0 completion is `0.1.0`, Phase 1 completion is `0.2.0`, and so on.
- `pnpm run phase:check` reads the phase-gate checkboxes in `TODO.md`, rejects skipped gates, and verifies the required workspace version. The version is an internal milestone, not permission to tag, publish, release, or deploy. Moving to `1.0.0` requires an ADR.

## User-facing readiness scale

This five-stage label supplements the technical phase and SemVer. It communicates the kind of work
currently underway; reaching a stage does not mean that stage is complete or that the product is
ready to release.

| Stage | Label | Roadmap coverage | Completion condition |
|---|---|---|---|
| 1 of 5 | Product contract | Phase 0 | Product, domain, accessibility, security, and architecture contracts pass their gate |
| 2 of 5 | Foundation | Phase 1 | Repository, tooling, test, data-service, configuration, UI-foundation, and contributor-documentation work passes its gate |
| 3 of 5 | Core engine and platform | Phases 2–3 | Domain engine, persistence, authentication, authorization, audit, and API foundations pass their gates |
| 4 of 5 | Product workflows | Phases 4–9 | Employee, manager, absence, closure, reporting, and administration workflows pass their gates |
| 5 of 5 | Production and release | Phases 10–15 | Production hardening, self-hosting, accessibility, operations, public documentation, and release gates pass |

The current label is **Stage 5 of 5 — Recorded production and UI release gates complete**.
Phases 0–15 have passed their accepted exit gates; the workspace version is `0.16.0`.
[Report 165](165-wl-1516-phase-15-gate-review.md) records the deterministic Phase 15 release.
The optional employee AI pilot has not passed and provider deployment remains disabled.

**Next task: none ready; M is blocked and the pilot deferred (D-519/report 198).** Follow [the bounded execution plan](196-roadmap-reconciliation-and-pilot-execution-plan.md)
and the task board. Historical evaluation attempts do not reopen completed product phases.

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

- [x] Every decision blocking Phase 1 in `docs/10-open-decisions.md` is resolved; later-phase and production decisions have an explicit owner and deadline.
- [x] At least 25 calculation and workflow examples have explicit expected results.
- [x] No rule contradicts the permission matrix, state machine, or ledger model.
- [x] Every MVP feature has a role, route/workflow, data owner, and test strategy.
- [x] Non-goals are explicit.
- [x] Architecture boundaries and dependency directions are accepted.
- [x] The exact first scaffold task is identified.

**Gate evidence:** `docs/19-phase-0-gate-review.md`, the historical planning/architecture audits, and updated `PROJECT_STATUS.md`.

---

# Phase 1 — Repository Foundation

## Objective

Create a strict, reproducible monorepo and development environment without implementing business features.

## Deliverables

- pnpm workspace.
- `apps/web`, `apps/api`, and package boundaries.
- Strict TypeScript, ESM, lint, format, test, and build configuration.
- Enforced ADR `0011` package exports, dependency directions, cycle rejection, and internal-publication guardrails.
- PostgreSQL development container.
- Validated environment configuration.
- Baseline CI.
- React Aria shadcn foundation and design tokens.
- Storybook or equivalent isolated UI environment.
- Contributor setup documentation.

## Exit gate

- [x] Fresh clone installs from the lockfile.
- [x] Web and API health placeholders run locally.
- [x] PostgreSQL starts and can be reached by an integration test.
- [x] `format:check`, lint, typecheck, baseline tests, and build pass.
- [x] CI runs the same checks.
- [x] UI foundation includes visible focus, reduced-motion tokens, and a semantic link/button example.
- [x] No feature or calculation logic has leaked into scaffold files.
- [x] Representative forbidden cross-package/deep imports fail in automated boundary checks; all workspace projects remain private/internal.

**Gate evidence:** `docs/28-phase-1-gate-review.md`, the successful canonical CI run linked there,
the `WL-100`–`WL-107` evidence records, and updated `PROJECT_STATUS.md`.

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

- [x] All documented example calculations pass as executable tests.
- [x] Spring-forward and fall-back cases pass.
- [x] Overnight sessions split correctly.
- [x] Invalid transition and overlap cases are rejected with stable codes.
- [x] Domain package has no framework, database, environment, network, or UI dependency.
- [x] Results are deterministic when supplied the same inputs and clock.
- [x] Coverage prioritizes decision branches and invariants rather than an arbitrary percentage alone.

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

- [x] Migrations apply to a clean database and are repeatable in tests.
- [x] Authentication success, failure, reset/session basics, and deactivation are tested.
- [x] Permission matrix has API tests for owner, scoped manager, unrelated actor, HR, and system administrator.
- [x] A transaction can append an immutable event and audit entry atomically.
- [x] Repeated idempotency key returns the original result.
- [x] Errors expose stable codes without sensitive internals.
- [x] Seed data covers the scenarios in `docs/14-seed-scenarios.md`.

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

- [x] The complete attendance flow works across web, API, database, domain, audit, and tests.
- [x] Duplicate clicks and lost responses do not duplicate events.
- [x] Two tabs/devices converge on server truth.
- [x] Current state and result are announced appropriately without timer spam.
- [x] Keyboard-only and mobile completion pass.
- [x] Loading, offline, conflict, permission, and server-error states exist.
- [x] The user can explain the displayed daily balance.

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

- [x] Normal and incomplete days are understandable.
- [x] Correction approval changes calculated results without altering raw history.
- [x] Rejection leaves results unchanged and preserves decision history.
- [x] Unauthorized managers cannot review the request.
- [x] Locked-period corrections follow the adjustment path.
- [x] Focus, errors, comparison semantics, and decision feedback pass accessibility review.

**Recorded gate evidence:** [Phase 5 review](65-phase-5-gate-review.md); locked ordinary edits were rejected there,
and [Phase 8 review](87-phase-8-gate-review.md) supplies the completed post-lock adjustment path.
These checks reconcile already completed work; they do not record a new test run or version gate.

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

- [x] Weekends, holidays, zero-hour weekdays, and partial days calculate correctly.
- [x] Pending, approved, cancelled, and rejected requests affect balances correctly.
- [x] Sickness data is minimized in manager and team views.
- [x] Overlap and insufficient-balance policies return explicit results.
- [x] Calendar workflow is keyboard usable and has an equivalent agenda/list.
- [x] Ledger history explains the current balance.

**Recorded gate evidence:** [Phase 6 review](73-phase-6-gate-review.md).
These checks reconcile already completed work; they do not record a new test run or version gate.

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

- [x] Manager sees only authorized reports.
- [x] Every decision has enough context and an audit event.
- [x] Self-approval is impossible.
- [x] Team views use privacy-safe labels.
- [x] Filters are shareable/restorable and keyboard usable.
- [x] Email failure does not roll back a successful domain decision.

**Recorded gate evidence:** [Phase 7 review](80-phase-7-gate-review.md).
These checks reconcile already completed work; they do not record a new test run or version gate.

---

# Phase 8 — Monthly Closure and Reporting

## Objective

Create trustworthy monthly records that can be reviewed, locked, exported, and adjusted without rewriting history.

## Deliverables

- Period calculation and blockers.
- Employee submission.
- Eligible current-manager or organization-HR changes request and approval, always non-self.
- Locking.
- Approved snapshot.
- Post-lock adjustments.
- Time, balance, leave, and missing-record reports.
- Safe CSV and printable record.

## Exit gate

- [x] A complete seeded month can be submitted, approved, locked, and exported.
- [x] Ordinary edits are rejected after submission/lock according to state.
- [x] Post-lock correction creates a linked adjustment.
- [x] Approved snapshot remains reproducible.
- [x] CSV formula injection tests pass.
- [x] Reports are scoped, paginated, and accessible.

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

- [x] Schedule/policy changes require effective dates.
- [x] Past approved results remain unchanged after future configuration changes.
- [x] Deactivation revokes access and preserves history.
- [x] Complex forms have error summaries and keyboard-complete workflows.
- [x] Privileged changes produce audit events.
- [x] Administrator routes remain usable at realistic data density.

---

# Phase 10 — Production Hardening and Self-Hosting

## Objective

Make WorkLedger safe and operable outside the developer laptop.

## Deliverables

- Full authorization/security suite.
- Concurrency and performance review.
- Full accessibility audit.
- Production Docker Compose with Caddy reference proxy and private API/database network.
- Encrypted backup and isolated tested restore with restored-session/grant invalidation.
- Upgrade and migration procedure.
- Health, readiness, logs, and diagnostics.
- Mandatory class-specific retention/minimization, backup-expiry, and safe export controls.
- Security and operations documentation.

## Production release gate

- [x] Clean production-style deployment works with documented configuration.
- [x] Direct API/database access and forged forwarded headers are denied; canonical HTTPS origin, cookies, CSRF, and health/readiness behave as specified.
- [x] Backup and isolated restore have been executed successfully with new secrets, revoked restored sessions/grants, disabled outbound mail, and ledger/snapshot/audit integrity evidence.
- [x] Upgrade from the previous test release works.
- [x] Every `T-001`–`T-020` control has evidence and no known Critical/High security issue remains.
- [x] No known critical accessibility blocker remains in core workflows.
- [x] Permission matrix tests pass.
- [x] Load/concurrency targets for expected organization size pass.
- [x] Logs, audit, URLs, browser storage/cache, notifications, clipboard, print, and exports respect the data inventory/privacy matrix.
- [x] A non-placeholder retention profile covers every required class and its backup behavior.
- [x] Failure modes are documented.

**Recorded gate evidence:** [Phase 10 review](98-phase-10-gate-review.md). The D-502 assistive-technology
limitation and deployment-specific operator responsibilities remain explicit.
These checks reconcile already completed work; they do not record a new test run or version gate.

---

# Phase 11 — UI/UX Direction, Design System, and Adaptable Company Identity

## Objective

Establish one evidence-led visual, interaction, and company-identity foundation before changing individual workflows.

## Deliverables

- Canonical route, role, workflow, and state inventory with responsive baselines.
- Approved visual direction, content hierarchy, density rules, page archetypes, and interaction principles.
- Consolidated semantic tokens and enforceable CSS ownership boundaries.
- Validated organization name, logo, favicon, and accent configuration with accessible fallbacks.
- Expanded local React Aria component system for recurring application patterns.
- Redesigned application shell, authentication surfaces, navigation, and route boundaries.

## UI foundation release gate

- [x] Every canonical route and required state has an owner, implementation status, and evidence level.
- [x] The approved visual direction covers calm employee surfaces and denser manager/admin surfaces without becoming a generic dashboard template.
- [x] Semantic tokens and shared components replace undefined and recurring one-off style contracts.
- [x] Company identity is configurable without source editing and remains legible under absent/invalid assets, forced colors, and zoom.
- [x] Shell, authentication, navigation, and route boundaries pass supported responsive, keyboard, zoom/reflow, forced-colors, and reduced-motion checks.
- [x] The gate advances every workspace manifest to `0.12.0`.

---

# Phase 12 — Workflow UX Remediation and Product Polish

## Objective

Apply the Phase 11 foundation to complete, understandable, recoverable workflows for every role.

## Deliverables

- Refined Today task hierarchy, calculation explanation, warnings, recovery, and clock feedback.
- Improved personal time, balance, request, calendar, notification, profile, and monthly-review flows.
- Improved manager Team, Approvals, decision, filtering, and narrow-screen flows.
- Improved HR/system administration, reports, audit, settings, and dense-data surfaces.
- Consistent route states, microcopy, responsive behavior, motion, and recovery patterns.
- Maintained visual-regression baselines for representative route and state archetypes.

## Workflow UX release gate

- [x] Canonical routes contain no stale milestone placeholder, sensitive subtype URL, or missing required workflow state.
- [x] Representative employee, manager, HR, and system-administrator workflows are keyboard complete and understandable at desktop, mobile, and 320 CSS px reflow.
- [x] Dense tables retain task-critical context and actions with an explicit narrow-screen strategy.
- [x] Loading, empty, stale, success, warning, permission-denied, and error behavior use consistent shared patterns.
- [x] Automated accessibility, visual-regression, and usability checks pass; manual assistive-technology evidence or an explicit residual is recorded.
- [x] The gate advances every workspace manifest to `0.13.0`.

---

# Phase 13 — Attendance Clarity, Operational Trust, and Workflow Usability Hardening

## Objective

Turn the Phase 12 implementation into a cognitively clear, trustworthy, and production-ready
experience. Establish one coherent Today display contract before changing layout, then apply the
proven clarity standards to manager and administration workflows.

The previously scheduled portfolio presentation work remains preserved as an unnumbered draft in
`docs/drafts/portfolio-presentation.md`. It has no active task identifiers or version gate until the
remaining product phases are known.

## Dependencies

- Phase 12 is complete and all workspace manifests are at `0.13.0`.
- Existing domain rules, immutable attendance history, ledger behavior, permissions, and API
  contracts remain authoritative.
- `docs/references/phase-13/today-redesign-reference.png` is a visual hierarchy reference, not a
  source of domain or arithmetic truth.

## Deliverables

- One coherent Today attendance snapshot and display contract.
- Revised Today information architecture and responsive implementation.
- Complete attendance-state and clock-action feedback matrix.
- Clear separation of current session, daily progress, provisional difference, and posted
  flexible-time balance.
- Actionable warning and recovery patterns.
- Improved timeline and calculation disclosure.
- Streamlined manager Approval inbox and Team status workflows.
- Clearer employee and team administration surfaces.
- Cross-route navigation, microcopy, focus, overflow, and responsive consistency.
- Deterministic visual, integration, usability, and accessibility regression coverage.
- Updated screenshots, product documentation, status files, and release notes.

## Attendance clarity and operational trust release gate

- [x] Every value on Today comes from one coherent server snapshot and all visible times reconcile.
- [x] A first-time employee can identify current state, session start, worked time, remaining time,
  next action, and any real problem without opening a secondary panel.
- [x] An in-progress day is not presented as posted flexible-time debt.
- [x] Posted flexible-time balance is dated and visually separated from current-day progress.
- [x] Every `Needs attention` item is actionable, dated where relevant, and classified as blocking
  or non-blocking.
- [x] Clock actions pass duplicate, stale-state, network-loss, two-tab/device, and session-expiry
  tests.
- [x] Today passes keyboard-only, screen-reader, 200% zoom, 320 CSS-pixel reflow, forced-colors,
  reduced-motion, and mobile tests.
- [x] Approval inbox defaults to actionable work and secondary filters no longer dominate the
  first viewport.
- [x] Team and employee administration rows expose clear next actions and work on narrow screens.
- [x] Permanent horizontal-scroll instructions are removed unless overflow is present and
  relevant.
- [x] Automated and manual visual, usability, accessibility, and regression gates pass.
- [x] Project status, roadmap, task board, release notes, screenshots, and relevant UX
  documentation are current.
- [x] The gate advances every workspace manifest to `0.14.0` only after every Phase 13 task passes.

---

# Phase 14 — Internationalization and Multilingual Product Experience

## Objective

Provide one coherent multilingual WorkLedger experience in British English, German, and Spanish
without weakening domain ownership, privacy language, accessibility, auditability, operational
clarity, or self-hosting. Establish locale and message-ownership contracts before translating
individual workflows, then release only after every shipped catalog and user-facing output passes
the same product-quality gate.

## Dependencies

- Phase 13 is complete and every workspace manifest is at `0.14.0`.
- The accepted domain, API, authorization, privacy, accessibility, route-state, and UI contracts
  remain authoritative.
- `D-507` fixes the product-level locale, preference, output, review, and self-hosting boundaries.
- `docs/138-phase-14-internationalization-roadmap.md` is the implementation handoff for this phase.
- ADR 0013 fixes the locale resolution, semantic key, package, message ownership, formatting,
  loading, budget, and enforcement architecture accepted by `WL-1400`.
- `docs/139-phase-14-internationalization-architecture-audit.md` and
  `docs/140-phase-14-translation-glossary.md` are the implementation inventory, risk register, and
  human-review structure.

## Deliverables

- A complete inventory of user-facing copy, API-originated presentation, formatting, and outbound
  communication surfaces.
- A typed local internationalization foundation for `en-GB`, `de-DE`, and `es-ES`, with `en-GB`
  fallback and explicit bundle budgets.
- Per-account locale persistence plus a bounded signed-out device preference and accessible
  language controls.
- Server-owned, language-neutral message descriptors for user-facing API presentation.
- Translated shared, employee, manager, HR, and system workflows.
- Localized print, clipboard, CSV labels and statuses, in-app notifications, invitations,
  password resets, and optional email.
- Human-reviewed German and Spanish catalogs, automated catalog enforcement, and a test-only
  pseudo-locale.
- Multilingual accessibility, responsive, visual, usability, security, upgrade, and release
  evidence.

## Internationalization and multilingual release gate

- [x] Every canonical route and user-facing output has catalog coverage.
- [x] Shipped catalogs have matching keys, interpolation parameters, and plural forms.
- [x] German and Spanish terminology and privacy-sensitive language have documented fluent-human
  approval.
- [x] Account and signed-out locale precedence works across sign-in, sign-out, refresh, and
  multiple devices.
- [x] No protected route renders briefly in the wrong language.
- [x] Dates, times, numbers, lists, and minute durations use the resolved locale and authoritative
  timezone.
- [x] Today attention, errors, reports, and notifications remain code- or descriptor-driven.
- [x] CSV, print, clipboard, notification, invitation, password-reset, and optional-email output
  preserve authorization, privacy, formula-neutralization, and data-minimization guarantees.
- [x] Keyboard, focus, live-region, forced-colors, reduced-motion, representative screen-reader,
  and 320 CSS-pixel reflow checks pass for all three locales.
- [x] The application baseline, bounded internationalization-runtime allowance, and separate
  locale-chunk budgets remain enforced.
- [x] The full repository quality gate passes with no mixed-language workflow or open P0/P1
  defect.
- [x] Project status, roadmap, task board, decisions, implementation evidence, and operations
  documentation are current.
- [x] The gate advances every workspace manifest to `0.15.0` only after every Phase 14 task passes.

---

# Phase 15 — WorkLedger Insights (deterministic release complete)

## Objective

Add role scoped, read only WorkLedger Insights whose deterministic native facts remain complete
without a model. Continue from the completed Employee foundation into deterministic Manager, HR
aggregate, and System work through purpose specific permission, privacy, evaluation, accessibility,
and operations evidence. The optional employee pilot is reopened for future evaluation and is not a release prerequisite.

## Dependencies

- Entry prerequisite, already satisfied: Phase 14 passed at `0.15.0`. Phase 15 completion has
  since advanced the workspace to `0.16.0`.
- ADR 0014 and `docs/151-phase-15-insights-architecture-privacy-evaluation.md` define the accepted
  authority, scope, data flow, egress, retention, grounding, accessibility, evaluation, and staged
  gate contracts.
- Existing domain, immutable history, ledger, permission, privacy, localization, route state,
  accessibility, operations, and self hosting contracts remain authoritative.
- `WL-1508G` and `docs/160-wl-1508g-phase-15-deterministic-continuation.md` define the accepted
  deterministic product sequence. D-517 defines the remaining optional pilot sequence separately.
- No Manager, HR, System, or release task may bypass its revised deterministic prerequisite gate.

## Deliverables

- A deterministic Insight Service and typed native result contract.
- Employee balance change, monthly submission blocker, leave projection, and Today explanation
  Insights.
- A dedicated accessible Insights route plus visible bounded contextual entry points.
- A deny by default read only Insight tool registry with active workspace authorization on every
  execution.
- Deterministic current-manager action summaries and team coverage.
- Deterministic privacy-suppressed HR aggregates with no row drilldown or model context.
- Deterministic isolated System diagnostics with no employee or HR data.
- A provider-disabled Phase 15 release path in which no accepted route depends on Ollama.
- Retained inactive provider, orchestration, failure, privacy, and evaluation evidence from the
  optional employee pilot, reopened but not passed.

## Insights foundation sub gate

- [x] `WL-1500` through `WL-1504` are complete.
- [x] Provider mode `disabled` is the complete and tested product path, with no model request,
  prompt persistence, or provider dependency.
- [x] Exact domain values, scope, period, freshness, sources, limitations, and native actions pass
  deterministic fixtures.
- [x] Context is visible, removable, bounded, and absent from sensitive URL or persistent browser
  state.
- [x] The Insights route passes every supported locale, keyboard, focus, announcement, reflow,
  forced color, reduced motion, touch, offline, partial, stale, empty, denied, and failure state.

## Employee local AI pilot sub gate

**Current state:** Optional, not passed and deferred under D-519. [Report 198](198-wl-1508m-fact-action-recovery-disposition.md)
records M's completed diagnostic review and 101 passing boundary tests, with no supported complete
repair in the current contract. M remains unchecked/blocked; no task is ready. An accepted bounded
question-intent amendment or new causal defect evidence is needed to resume. The deterministic release is complete independently.
Report 195 is the latest B attempt: health passed, submission-actions accepted 3/9, German selected
no facts, and Spanish omitted the pending-request action. Today-posted and C did not run. Report
194's cold health and 18/18 schema qualification are separate evidence, not semantic acceptance.

D-517 replaces the accumulated rerun instructions with one ordered queue:

| Order | Task | Required outcome |
| --- | --- | --- |
| 1 — Done | WL-1508L | [Report 197](197-wl-1508l-reproducible-verification.md): reproducible Windows verification, restored CI configuration and staged pilot invocation; full local verification passed without a real model |
| 2 — Blocked; deferred | WL-1508M | Report 198 records the explicit blocked exit. Recovery is incomplete; resume only with an accepted question-intent amendment or new causal defect evidence |
| 3 | WL-1508B | submission-actions 9/9, then today-posted 9/9, on one frozen qualified configuration |
| 4 | WL-1508C | Historical full-matrix failure preflight 27/27, then one uninterrupted unfiltered 216/216 gate |
| 5 | WL-1508D | Required non-model evidence and exact candidate reviewed before parent WL-1508 closes |

See [the execution plan](196-roadmap-reconciliation-and-pilot-execution-plan.md) for files,
dependencies, qualification invalidation rules, verification and stop conditions. Completed
A/E/F/G/H/I/J/K remain historical evidence; they are not the next queue. D-515/D-516 are already
implemented. Fresh execution must check whether qualification still matches the affected inputs
and always retain mandatory health. No automatic prompt tuning, model switching or repeated
attempt follows a failure. If no defensible recovery is supported, leave the optional pilot
blocked/deferred with the decision needed to resume.

The user reopened this pilot under D-510 after its historical 2026-08-28 closure without passing.
Historical B passes (reports 167/171) and C failures (reports 168/172) keep their original
configuration and outcome; they cannot pass the current candidate. D-517 changes scheduling and
adds regression coverage, not golden expectations or the provider/grounding/privacy contract.

- [ ] `WL-1505` through `WL-1508` satisfy the complete employee pilot gate.
- [x] Provider deployment remains disabled; qualification permits only the exact recorded private
  origin, runtime, model digest, inference controls and isolation for evaluation.
- [x] Every tool is purpose-specific, read-only, schema-validated and reauthorized against current
  employee self scope.
- [x] Question, prompt, native result, output and reasoning content is not retained in logs,
  audit, backup or analytics; model context remains request memory only.
- [ ] The full 24-question, three-locale, three-repetition matrix passes the existing zero-tolerance
  correctness, scope, source, action, unsupported-claim and leakage contract.
- [x] Timeout, cancellation, invalid output, drift and provider failure preserve the usable native
  result; changed paths must retain the applicable accessibility evidence.
- [x] Server-owned registry orchestration, duplicate-safe selections, material completeness and
  bounded health residency are implemented; implementation is distinct from model acceptance.

The full matrix retains only its already permitted safe-rejection cases. A collection of short
passes, successful schema qualification, or completed implementation tasks cannot replace it.

## Deterministic continuation gate

- [x] `WL-1508G` reconciles Phase 15 around provider-independent Insights and records obsolete work.
- [x] `WL-1509` completes deterministic Manager action summaries and team coverage.
- [x] `WL-1512` accepts fixed deterministic HR aggregate purposes and suppression controls.
- [x] `WL-1513` implements the accepted privacy-suppressed HR aggregates.
- [x] `WL-1514` completes deterministic isolated System Insights.
- [x] No accepted continuation route calls a provider or depends on model availability.

`WL-1510`, `WL-1511`, and `WL-1515` are obsolete and removed from the accepted Phase 15 scope. A
future model interpretation, natural-language report, or MCP proposal requires a new roadmap
decision and the applicable ADR, privacy, security, evaluation, and threat gates.

## Phase 15 release gate

**Complete:** WL-1516 and report 165 close the accepted deterministic release at `0.16.0`.
The optional employee pilot is not a prerequisite and does not reopen this gate. These checkboxes
record the completed release evidence; they are not fresh verification of the current checkout.

- [x] Every accepted Phase 15 role and provider-disabled path passes its named prerequisite
  and evidence gate.
- [x] Manager scope is current reports only, HR aggregation is suppressed before result construction, and
  System Insights contains technical data only.
- [x] No unrestricted query, SQL, write, scoring, prediction, recommendation, autonomous action,
  public provider, cloud model, or unreviewed MCP surface exists.
- [x] Multilingual, accessibility, security, privacy, retention, operations, provider-disabled
  configuration, upgrade, rollback, and browser privacy evidence has no open P0/P1 or unresolved
  Critical/High finding.
- [x] Project status, roadmap, task board, ADR, product, permission, architecture, accessibility,
  security, retention, evaluation, and operations documentation is current.
- [x] The gate advances every workspace manifest to `0.16.0` only after every accepted Phase 15 task
  passes.
