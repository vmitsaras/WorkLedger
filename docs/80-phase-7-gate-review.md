# Phase 7 Gate Review

**Review date:** 2026-08-14

**Task:** `WL-706`

**Outcome:** Passed. The manager approvals and team availability slice is complete. Phase 8 may
begin with `WL-800`; this gate does not authorize production deployment, package publication, a Git
tag, a container release, a supported external release, approval delegation, or AI-generated HR
decisions.

## Reviewed scope

The review covers `WL-700` through `WL-705`: the unified approval inbox and URL state, correction/
absence/cancellation decisions, team current status, team calendar and agenda, durable generic
notifications with optional post-commit email delivery, and the manager authorization/accessibility
review. It also covers the affected authorization policy, database constraints and repositories,
audit records, privacy-minimized contracts, OpenAPI, browser behavior, security boundaries, and
roadmap documentation.

Monthly-period approval items remain outside this gate. `WL-802` may add them only after the
authority conflict in `D-402` is resolved.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| Manager sees only authorized reports | Pass | Authorization resolves current effective direct-manager assignment and active employee capability before collection queries, counts, filters, team options, and pagination. PostgreSQL/API evidence covers current, former, unrelated, self, inactive, employee-only, HR-only, combined-role, technical-admin, and cross-organization cases. |
| Every decision has enough context and an audit event | Pass | Authorized detail routes expose the current version, available actions, affected dates/coverage, and the workflow-specific correction or entitlement context. Serializable decisions append account-first actor/authority evidence and a minimized domain audit event in the transaction. |
| Self-approval is impossible | Pass | The central policy makes privileged self-prohibition stronger than additive roles. Own rows are excluded from scoped collections; direct linked-HR/manager self targets are denied; HR-only decisions remain attributable through the authenticated account under `D-352`. |
| Team views use privacy-safe labels | Pass | Team status and calendar expose neutral `Working`, `On break`, `Not working`, or `Unavailable` wording, optional current team name, and generic unresolved state. DTOs omit employee/request identifiers, absence subtype, sickness context, notes, reasons, entitlement, and reviewer history. |
| Filters are shareable/restorable and keyboard usable | Pass | React Router owns allowlisted status, broad workflow type, current team, paired dates, sort, direction, and pagination state. Component and Chromium coverage proves canonical restoration, validation, clear/reset, focus retention, browser back, narrow disclosure, contained table scrolling, and no sensitive URL fields. |
| Email failure does not roll back a successful domain decision | Pass | The in-app notification is appended with the decision transaction. Optional delivery runs after commit with at most two recorded attempts; adapter and diagnostic-write failures cannot replace or roll back the committed decision or notification. |

## Cross-cutting review

| Area | Gate conclusion |
|---|---|
| Domain and transactions | Approval decisions preserve immutable source history, use expected versions and serializable transactions, and append the correct absence effects, entitlement transitions, cancellation reversals, correction state, audit, and notification exactly once. Delivery is deliberately outside the domain commit. |
| Authorization and privacy | Current manager or organization-HR authority is re-evaluated at each request. Non-self decisions, organization boundaries, no-store responses, same-origin CSRF, purpose-minimized list/team/notification DTOs, and non-disclosing foreign targets are enforced at the API/database boundary. |
| Accessibility | Approval, team, calendar, and notification routes use semantic headings, forms, buttons, links, lists, and captioned tables. Keyboard completion, final-route focus, linked validation, polite bounded outcomes, agenda equivalence, 320 px reflow, native/React Aria focus, reduced motion, forced colors, and axe checks pass. |
| UX states | Loading, default/filtered empty, success, validation, pending, permission, dependency failure, retry, stale conflict, no-action, pagination, missing-team, and delivery-failure states are explicit and recoverable. |
| Scope | The phase adds no delegation grant, arbitrary workflow builder, payroll, monitoring, geolocation, biometrics, native app, multi-tenant billing, production SMTP dependency, or monthly approval behavior. |

## Verification

The installed pinned-toolchain equivalent of the database-enabled canonical verification passed:

- toolchain, workspace topology, sequential phase-version contract, runtime configuration, source
  boundaries, strict TypeScript, Prettier, ESLint, and generated OpenAPI reproducibility;
- 24 repository-contract tests and 219 unit/component tests;
- 33 PostgreSQL-backed integration tests, including the expanded approval/team permission matrix,
  HR-only actor evidence, notification ownership, stale decisions, and delivery failure; and
- 16 Chromium scenarios, including the approval decision path, keyboard navigation, 320 px reflow,
  reduced motion, forced colors, touch, focus/status behavior, and axe coverage.

The production build passed and retains the known main-chunk-size warning owned by `WL-1001`. The
warning is not suppressed and is not a Phase 7 correctness, accessibility, or security failure.
Automated axe and accessibility-tree checks do not establish WCAG conformance; real assistive-
technology and platform high-contrast smoke remains a release-level verification item.

After the manifest-only milestone bump, pnpm's managed-runtime wrapper requested a non-interactive
dependency refresh and aborted before changing installed dependencies. The already-installed Node
`24.18.0` runtime then ran the same TypeScript, configuration, OpenAPI, formatting, lint, boundary,
test, Chromium, build, and workspace-build commands directly. No dependency, lockfile, or package-
manager state is part of this gate change.

## Versioning

Completing `WL-706` is the eighth zero-indexed phase gate. The root and all eight private workspace
manifests advance together from `0.7.0` to `0.8.0`; the canonical phase-version guard confirms eight
sequentially completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image, GitHub
release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The next task is `WL-800`: implement the monthly period projection, totals, warnings, blockers, and
snapshot version. It must consume the existing schedule, attendance, absence, entitlement,
correction, and time-ledger facts without rewriting approved history or beginning the unresolved
manager approval/lock behavior owned by `WL-802`.
