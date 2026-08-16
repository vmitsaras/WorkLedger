# Phase 9 Gate Review

**Review date:** 2026-08-16

**Task:** `WL-907`

**Outcome:** Passed. The administration slice is complete. Phase 10 may begin with `WL-1000`; this gate does not authorize production deployment, publication, a Git tag, a container release, or a supported external release.

## Reviewed scope

The review covers `WL-900` through `WL-906`: employee lifecycle and invitation, HR/system account separation, employment history, teams and current direct-manager assignments, immutable weekly schedule and time-policy versions, effective-dated employee assignments, absence-type versions, reasoned entitlement adjustments, date-only holiday administration with impact preview, and the redacted HR domain-audit explorer.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| Schedule and policy changes require effective dates | Pass | Strict contracts require date-only effective boundaries. Services reject past, duplicate, no-effect, uncovered, and invalid-employment transitions; half-open assignments close only the row containing the boundary and preserve scheduled future rows. PostgreSQL exclusion constraints remain the concurrency guard. |
| Past approved results remain unchanged after future configuration changes | Pass | Schedule, policy, and absence definitions are immutable version rows referenced by assignments or captured requests. Ordinary changes are current/future only. Holiday creation blocks protected submitted, approved, or locked months. Approved snapshots, projections, ledgers, raw punches, and older assignment/version rows are not rewritten. |
| Deactivation revokes access and preserves history | Pass | Employee deactivation closes the active employment period, deactivates the linked account, revokes every session, and invalidates pending invitation state in one transaction. Reactivation appends a new non-overlapping employment period; prior attendance, periods, ledgers, assignments, account links, roles, and audit evidence remain. Technical account state cannot override HR deactivation. |
| Complex forms have error summaries and keyboard-complete workflows | Pass | Employee creation and schedule-version forms provide focusable linked summaries. Team, manager, schedule, policy, absence, entitlement, holiday, account/session, and audit workflows use visible labels, native controls, pending protection, persistent outcomes, textual state, keyboard-complete actions, route focus/boundaries, narrow-screen containment, and axe/component coverage. |
| Privileged changes produce audit events | Pass | Employee/account lifecycle, roles, teams, assignments, configuration versions, entitlement adjustment, holiday creation, and session actions append audience-specific minimized evidence in their source transaction. The HR explorer reads only redacted domain events; technical security history remains physically and authoritatively separate. |
| Administrator routes remain usable at realistic data density | Pass | Employee, team, system-account, and audit collections use bounded pagination; filters are URL-owned where shareable; dense results use captioned tables or semantic histories with narrow-screen containment. Settings pages use scoped histories and aggregate previews rather than unbounded payloads. Production-scale measurement remains explicitly assigned to `WL-1001`. |

## Cross-cutting review

| Area | Gate conclusion |
|---|---|
| Domain and history | Stable employee identity, non-overlapping employment and assignment ranges, immutable configuration versions, append-only entitlement and audit evidence, protected monthly history, and date-only holiday semantics preserve explainability. Ordinary administration offers no backdated rewrite path. |
| Authorization | API checks derive organization and current actor scope from authoritative state. Privileged self-target actions are denied; current direct-manager assignments alone grant report scope. HR employment/domain authority and system account/security authority remain separate even for combined-role accounts. |
| Transactions and concurrency | Lifecycle, invitation, role, assignment, entitlement, holiday, and audit effects use explicit transactions; high-risk transitions use serializable retry and database constraints. Duplicate and stale operations return structured conflicts without partial effects. |
| Privacy and security | Purpose DTOs exclude credentials, tokens, sickness content, complete forms, unrestricted reasons, and unrelated employee or technical fields. Audit audiences remain separate, exports are not expanded, protected responses are no-store, and mutations retain origin/CSRF requirements. |
| Accessibility and recovery | Administration provides semantic headings, labels, field descriptions, summaries for complex validation, focused error recovery, textual status, keyboard operation, table captions, named pagination, contained reflow, pending protection, empty/loading/denied/error states, and automated axe/Chromium evidence. Full manual WCAG evidence remains `WL-1002`. |
| Scope | No payroll, billing, surveillance, geolocation, biometrics, rotating shifts, native application, multi-tenant SaaS billing, arbitrary workflow builder, or AI-generated HR decision was added. |

## Gate defect found and resolved

The first database gate run exposed a valid entitlement-adjustment request returning `500`. The production migration and repository were correct; `apps/api/test/administration.integration.test.ts` stopped its fixture migration list at `0018`, so the `0019_stale_loners.sql` entitlement-adjustment source table did not exist in that isolated schema. The fixture now includes migration `0019`. The focused four-test administration file and the complete 41-test integration project pass afterward.

## Verification

Before the manifest bump, the canonical verification passes with pinned Node `24.18.0` and pnpm
`11.20.0`:

- workspace topology, ten-gate phase/version contract, reproducible OpenAPI, formatting, ESLint, 245-file/1,278-import boundaries, strict TypeScript, and the production/workspace build;
- 24 repository/tooling tests and 297 unit/component tests across 43 files;
- all 41 PostgreSQL-backed integration tests across 21 files, including administration scope/history, audit redaction/pagination, migrations, constraints, transactions, and concurrency; and
- 20 Chromium scenarios covering authenticated employee/system administration, keyboard workflows, invitation-grant cleanup, schedule configuration, reflow, touch, forced colors, focus, and axe.

The production build retains the known main-chunk advisory owned by `WL-1001`. Integration emits the existing `pg` concurrent-query deprecation warning; Phase 10 must resolve it before `pg` 9. Automated checks do not establish WCAG conformance, and the cross-browser/assistive-technology matrix remains `WL-1002`/`D-502`.

After the manifest bump, the managed pnpm wrapper requested a noninteractive dependency refresh,
could not fetch registry metadata, and aborted before changing repository state. The installed
dependency graph was then verified directly: the ten-gate phase/version and workspace checks,
formatting, ESLint/boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 297
unit/component tests, and production/public-entry builds pass. The host Node installation had
independently advanced to `24.19.0`, so the exact `24.18.x` toolchain guard correctly reports that
post-bump host mismatch; no unsupported install or lockfile rewrite was performed.

## Versioning

Completing `WL-907` is the tenth zero-indexed phase gate. The root and all eight private workspace manifests advance together from `0.9.0` to `0.10.0`; the phase-version guard confirms ten sequential completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image, GitHub release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The next task is `WL-1000`: remediate the threat model and complete the permission/privacy regression suite. It must resolve the open `D-504` locked absence-cancellation contract, verify every Critical/High control, preserve HR/system separation, and schedule any required bounded implementation before the production release gate.
