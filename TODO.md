# WorkLedger Ordered TODO

This compact list mirrors `docs/08-task-board.md`. Keep task IDs stable.

**Current status: WL-1508N complete under the best-effort English support amendment; full local verification passed.** Phases 0–15 are complete at `0.16.0`. No implementation task is ready;
the legacy optional pilot remains deferred. Excluded proposals are not queued. The next recommended
slice is a decision/readiness slice for controlled local provider enablement only if the operator
chooses to use the English suggestion feature locally; it is not deployment authorization.

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
- [x] `WL-101` Scaffold web, API, explicit internal package exports, and shared boundaries; defer the Astro site to the portfolio phase.
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
- [x] `WL-705` Complete authorization and accessibility review.
- [x] `WL-706` Pass the Phase 7 exit gate.

## Phase 8 — Monthly closure and reporting

- [x] `WL-800` Implement monthly period summary and blockers.
- [x] `WL-801` Implement employee submission.
- [x] `WL-802` Implement eligible-reviewer approval and lock.
- [x] `WL-803` Implement post-lock adjustment workflow.
- [x] `WL-804` Build monthly, balance, leave, and missing-record reports.
- [x] `WL-805` Build safe CSV, print, and explicit clipboard behavior.
- [x] `WL-806` Pass the Phase 8 exit gate.

## Phase 9 — Administration

- [x] `WL-900` Build employee lifecycle and separated technical-account/session administration.
- [x] `WL-901` Build teams and manager assignment.
- [x] `WL-902` Build schedule and effective-date management.
- [x] `WL-903` Build time-policy management.
- [x] `WL-904` Build absence-type and entitlement management.
- [x] `WL-905` Build holiday calendar management.
- [x] `WL-906` Build audit explorer.
- [x] `WL-907` Pass the Phase 9 exit gate.

## Phase 10 — Production hardening and self-hosting

- [x] `WL-1000` Establish the threat evidence baseline and complete application security/privacy/permission remediation.
- [x] `WL-1000A` Implement locked-period absence-cancellation adjustments.
- [x] `WL-1001` Complete performance, pagination, and concurrency review.
- [x] `WL-1002` Complete full accessibility audit and remediation (cross-engine automation added; manual assistive-technology evidence remains).
- [x] `WL-1003` Complete the Caddy-reference Docker production deployment.
- [x] `WL-1004` Document and test encrypted backup and isolated clean restore.
- [x] `WL-1005` Document and test migrations and upgrades.
- [x] `WL-1006` Add structured logs, failure diagnostics, and safe technical operations/audit surfaces.
- [x] `WL-1007` Complete mandatory retention, minimization, user-export, and backup-expiry controls.
- [x] `WL-1008` Pass the production release gate.

## Phase 11 — UI/UX direction, design system, and adaptable company identity

- [x] `WL-1100` Audit every canonical route, role, workflow, and required state; capture responsive baselines and create a prioritized UI/UX issue register.
- [x] `WL-1101` Define and approve the WorkLedger visual direction, content hierarchy, density rules, page archetypes, and interaction principles.
- [x] `WL-1102` Consolidate semantic design tokens and CSS ownership; remove undefined and one-off style contracts and establish enforceable styling boundaries.
- [x] `WL-1103` Implement validated company-identity configuration for organization name, logo, favicon, and brand accent with accessible fallbacks and no source-code editing.
- [x] `WL-1104` Expand the local React Aria UI system for actions, forms, panels, statuses, alerts, tables, filters, pagination, and route states.
- [x] `WL-1105` Redesign the application shell, navigation, authentication surfaces, and route boundaries across startup failure, responsive, zoom, forced-colors, and reduced-motion contexts.
- [x] `WL-1106` Pass the UI-foundation phase gate and bump all workspace manifests to `0.12.0`.

## Phase 12 — Workflow UX remediation and product polish

- [x] `WL-1200` Redesign Today attendance, calculation hierarchy, warnings, recovery, and primary clock-action feedback.
- [x] `WL-1201` Improve personal time records, balances, calendars, notifications, profile, loading, empty, and error experiences.
- [x] `WL-1202` Improve correction, absence, cancellation, approval-history, and monthly-review workflows.
- [x] `WL-1203` Improve manager Team, Approvals, team-calendar, filtering, decision, and narrow-screen workflows.
- [x] `WL-1204` Improve employee administration, time/absence/holiday settings, reports, audit, and system-administration surfaces using appropriate dense layouts.
- [x] `WL-1205` Complete the cross-route microcopy, responsive, state-consistency, motion, and recovery pass.
- [x] `WL-1206` Pass visual-regression, usability, accessibility, and UI release gates and bump all workspace manifests to `0.13.0`.

## Phase 13 — Attendance clarity, operational trust, and workflow usability hardening

- [x] `WL-1300` Audit the Phase 12 implementation, capture deterministic baselines, and register Phase 13 references and constraints.
- [x] `WL-1301` Establish one authoritative Today attendance display contract and eliminate contradictory timestamps, durations, and balances.
- [x] `WL-1302` Implement the revised Today information architecture and visual hierarchy from the approved reference.
- [x] `WL-1303` Implement the complete attendance-state matrix and reliable clock-action feedback and recovery behavior.
- [x] `WL-1304` Separate current session, today’s progress, estimated completion, provisional difference, and posted flexible-time balance.
- [x] `WL-1305` Rebuild Today’s timeline and calculation details for transparent, concise, auditable explanations.
- [x] `WL-1306` Replace generic warnings with actionable attention and correction-recovery workflows.
- [x] `WL-1307` Pass the dedicated Today responsive, accessibility, usability, and visual sub-gate.
- [x] `WL-1308` Prioritize actionable work and simplify filtering, actions, pagination, and narrow-screen behavior in Approval inbox.
- [x] `WL-1309` Improve Team status comprehension, filtering, actionability, labels, and workspace navigation.
- [x] `WL-1310` Improve employee and team administration search, primary actions, route separation, dense layouts, and explanatory copy.
- [x] `WL-1311` Normalize cross-route navigation labels, microcopy, heading focus, status semantics, card density, and table-overflow behavior.
- [x] `WL-1312` Complete deterministic cross-route state, visual-regression, integration, accessibility, and usability coverage.
- [x] `WL-1313` Pass the Phase 13 release gate, update evidence and documentation, and bump all workspace manifests to `0.14.0`.

## Phase 14 — Internationalization and multilingual product experience

- [x] `WL-1400` Audit every user-facing string and ratify the locale, translation-key, message-ownership, formatting, and fallback architecture.
- [x] `WL-1401` Establish the shared typed i18n foundation, local catalog loading, locale resolution, React/React Aria integration, and bundle-budget contract.
- [x] `WL-1402` Implement per-account locale persistence, signed-out device preference, initial invitation locale, profile/auth selectors, and immediate language switching.
- [x] `WL-1403` Replace user-facing API prose dependencies with bounded message descriptors and structured presentation data.
- [x] `WL-1404` Translate shared UI, route titles and boundaries, authentication, application shell, navigation, profile, validation, dialogs, and announcements.
- [x] `WL-1405` Translate employee workflows: Today, time and balances, records, corrections, absences, calendars, notifications, and monthly review.
- [x] `WL-1406` Translate manager, HR, and system workflows, including Approvals, Team, administration, settings, reports, audit, accounts, and operations.
- [x] `WL-1407` Localize print, clipboard, CSV labels/statuses, notification email, invitations, and password-reset communication.
- [x] `WL-1408` Complete and human-review the `en-GB`, `de-DE`, and `es-ES` catalogs and add automated catalog enforcement plus a test-only pseudo-locale.
- [x] `WL-1409` Execute multilingual integration, accessibility, responsive, visual, usability, security, and upgrade verification.
- [x] `WL-1410` Pass the Phase 14 release gate, update evidence and documentation, and bump all workspace manifests to `0.15.0`.

## Phase 15 — WorkLedger Insights (deterministic release complete)

The accepted deterministic release is complete at `0.16.0`. The optional employee AI pilot has
not passed and does not block that release. D-517 and
[the execution plan](docs/196-roadmap-reconciliation-and-pilot-execution-plan.md) define the
remaining sequence. Keep failed attempts in reports, not in task titles.

### Completed deterministic product

- [x] `WL-1500` Ratify Insights product, authority, privacy and staged-gate contracts.
- [x] `WL-1501` Implement the deterministic Insight Service and typed native-result contracts.
- [x] `WL-1502` Implement employee balance, submission, leave and Today insights.
- [x] `WL-1503` Build the accessible role-scoped native Insights route.
- [x] `WL-1504` Add bounded contextual entry points and pass the deterministic foundation gate.
- [x] `WL-1508G` Reconcile provider-independent continuation after the historical pilot closure.
- [x] `WL-1509` Implement deterministic Manager action summaries and team coverage.
- [x] `WL-1512` Define fixed HR aggregate purposes and privacy/suppression contracts.
- [x] `WL-1513` Implement privacy-suppressed deterministic HR aggregate Insights.
- [x] `WL-1514` Implement isolated deterministic System Insights.
- [x] `WL-1516` Pass the deterministic Phase 15 release gate and synchronize manifests at `0.16.0`.

### English-only optional AI enhancement

- [x] `WL-1508N` Implement and evaluate optional local AI topic suggestions for Employee Insights. **Complete under D-520 / ADR 0015's best-effort English amendment.** [Report 201](docs/201-wl-1508n-best-effort-english-suggestions.md): truthful English copy, confirmation/native authority, 71 script, 619 unit/component, 64 PostgreSQL integration and 52 browser tests passed; build/budgets passed. Separate assessment of report 200's unchanged 60 responses passes the amended criteria: English 40/40, p95 510 ms; UNKNOWN 12/20 remains an explicit strict failure. Cold first request 20.754 seconds. No fresh inference or deployment; original failures preserved in reports 199–200. No implementation task is ready; controlled provider enablement is an unscheduled operator decision.

### Follow-up register — not queued

- Controlled local provider enablement/readiness — recommended next slice only after explicit
  operator scheduling. Depends on current source identity, provider-disabled default, private local
  origin, exact runtime/model tuple, health/isolation checks, rollback/support wording and no
  deployment claim.
- Legacy interpreter resumption — blocked on an accepted bounded question-intent amendment or new
  causal defect evidence; do not replay the same prompt/model attempt.
- Remote CI verification — local WL-1508N evidence passed, but no remote CI run is recorded.
- Broader D-502 assistive-technology/browser coverage and unrecorded authoritative partial-day
  overlap signals — remain limitations until separately scoped.
- Portfolio presentation — remains an unscheduled draft and has no active task ID.

### Legacy optional employee interpretation pilot — deferred

No legacy interpretation task is ready. M's diagnostic review found no supported complete repair within the current
contract; [report 198](docs/198-wl-1508m-fact-action-recovery-disposition.md) and D-519 record the
deferral and decision needed to resume. L retains the full local verification evidence in report 197.
Complete each task's entry and exit criteria in the task board and execution plan.
Planning these tasks does not start inference, authorize deployment, or claim a fix.

- [ ] `WL-1508M` Resolve report-195 fact/action completeness in one bounded slice. **Blocked; pilot deferred (D-519/report 198).** Diagnostic review and 101 boundary tests completed, but no supported recovery fits the current contract. Resume only with an accepted bounded question-intent amendment or new causal defect evidence; do not repeat prompt experiments.
- [ ] `WL-1508B` Run one fresh submission-actions 9/9 screen, then today-posted 9/9 only after the first group passes. **Blocked on M and current qualification.** Latest attempt failed 3/9 in report 195.
- [ ] `WL-1508C` Pass balance-summary, balance-projection and balance-closing preflight (27 cases), then one unfiltered uninterrupted 216-case evaluation on the frozen configuration. **Blocked on fresh B.** Historical full runs failed; no combined partial passes.
- [ ] `WL-1508D` Reconfirm applicable non-model privacy, security, fallback, localization and accessibility evidence and close the pilot. **Blocked on fresh C.** Deployment remains disabled.
- [ ] `WL-1508` Pass the optional employee local AI pilot sub-gate. **Parent milestone; blocked on D**, not a separate implementation task.

### Completed pilot infrastructure and historical qualification

These checked tasks retain their recorded scope; they are not proof that the current model passes
B/C, and their completion is not a reason to repeat them automatically.

- [x] `WL-1505` Implement read-only Insight tools with current authorization and workspace scope.
- [x] `WL-1506` Implement the disabled-by-default private provider adapter and health controls.
- [x] `WL-1507` Implement optional employee interpretation, cancellation and grounded sources.
- [x] `WL-1508A` Qualify the historical replacement candidate; evidence in report 159.
- [x] `WL-1508E` Qualify the historical qwen3-coder candidate; evidence in report 159.
- [x] `WL-1508F` Implement server-owned registry execution and constrained generation; spec 0001.
- [x] `WL-1508H` Prepare the Windows pilot and qualify its recorded candidate; report 166.
- [x] `WL-1508I` Implement duplicate-safe selections and bounded diagnostics; report 170.
- [x] `WL-1508J` Implement schema admission, material completeness and deterministic checks; report 177.
- [x] `WL-1508K` Qualify the exact schema-enforcing candidate for its recorded lifecycle; report 178.
- [x] `WL-1508L` Make Windows verification and staged pilot invocation reproducible, restore CI configuration, and repair the discovered database/fixture defects including authorized retention atomicity. Full local verification passed; mocked pilot stop/provenance checks passed; no inference. [Report 197](docs/197-wl-1508l-reproducible-verification.md).

D-515 evidence acceptance and D-516 health residency are also implemented (reports 188/192).
Report 194 contains the newer lifecycle qualification. M/B must assess evidence validity by inputs,
not reopen completed tasks or infer qualification from a historical checkbox.

### Excluded proposals — not queued

- `WL-1510` Manager model interpretation — obsolete; requires a new scope decision.
- `WL-1511` Natural-language report generation — obsolete; requires a separately scoped proposal.
- `WL-1515` MCP adapter evaluation — obsolete; requires its own roadmap and threat review.

Portfolio presentation remains an unscheduled draft. No new phase or version bump is introduced.
