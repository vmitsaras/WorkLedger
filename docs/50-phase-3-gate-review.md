# Phase 3 Gate Review

**Review date:** 2026-08-11

**Task:** `WL-309`

**Outcome:** Passed. The data, authentication, and API foundation phase is complete. Phase 4 may
begin with `WL-400`; this gate does not authorize a production deployment, supported release,
attendance product workflow, later absence/approval/period behavior, package publication, tag, or
external release artifact.

## Reviewed scope

The review covers `WL-300` through `WL-308`, all seven committed PostgreSQL migrations, repository
and transaction boundaries, the Better Auth credential/session profile, application authorization,
transport contracts, separated audit persistence, attendance idempotency, deterministic seed data,
OpenAPI exposure, the Phase 3 roadmap/task-board entries, and the current security and definition-of-
done contracts.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| Migrations apply to a clean database and are repeatable in tests | Pass | Every PostgreSQL fixture creates a random isolated schema and applies `0000` through `0006` in journal order. The migration test verifies the 37-table schema, UUIDv7 defaults, effective-date exclusions, organization consistency, immutable history/audit triggers, and projection arithmetic. Repository, authentication, authorization, audit, idempotency, and two independent seed fixtures repeatedly apply the same chain and clean up in `finally`. |
| Authentication success, failure, reset/session basics, and deactivation are tested | Pass | The API authentication integration covers canonical-origin enforcement, successful and failed credentials, invite-only sign-up denial, secure host-only session cookies, passive/active/absolute/fresh session behavior, session-bound CSRF, generic recovery, protected single-use reset grants, expiry/replay, reset revocation, and rate limiting. Gate review adds direct evidence that account deactivation sets the account inactive, deletes its PostgreSQL sessions atomically, and makes the prior cookie resolve to no session. |
| Permission matrix covers owner, scoped manager, unrelated actor, HR, and system administrator | Pass | Policy and PostgreSQL-backed API authorization tests cover employee self access, current and former managers, unrelated and cross-organization targets, inactive account/employee capability, HR non-self grants, combined-role self prohibitions, technical-only system access without domain access, freshness checks, scope-before-pagination, history-preserving role/link changes, and immediate session revocation. Product HTTP routes remain later vertical-slice work and must reapply these decisions server-side. |
| A transaction can append an immutable event and audit entry atomically | Pass | The idempotency integration commits one punch, one attendance revision, one domain audit event, and one terminal result in one transaction. Audit integration proves source punch plus audit evidence both disappear on rollback. Database triggers reject update/delete of punch, audit, and completed idempotency history. |
| Repeated idempotency key returns the original result | Pass | Matching key/fingerprint claims replay the exact original HTTP status and typed semantic outcome. Changed command/fingerprint returns a detail-free conflict. Concurrent matching claims serialize to one terminal row and one replay; rollback removes the claim so a retry can claim normally. Only the SHA-256 key digest is persisted. |
| Errors expose stable codes without sensitive internals | Pass | Strict Zod/Fastify contract tests separate malformed JSON, schema failures, not found, unsupported/oversized input, safe application conflicts, response-serialization failures, and unknown failures. Error context is bounded and reparsed; tests prove submitted secrets, unknown fields, stack/SQL-like text, database credentials, and authentication secrets are absent. |
| Seed data covers `docs/14-seed-scenarios.md` | Pass | Two independently migrated schemas produce equal Northstar summaries. Tests verify ten personas, credentials, current/former manager history, full/part-time/effective schedule stories, positive/negative balances, representative attendance/absence/correction/monthly histories, exact entitlement arithmetic, privacy-safe locked snapshots, repeat safety, drift/non-empty rejection, and production/non-local target guards. |

## Additional foundation evidence

| Area | Gate conclusion |
|---|---|
| Repository boundary | `@workledger/database` exposes domain-facing repositories only inside transaction callbacks. Emitted declarations contain no Drizzle, `pg`, SQL, schema-table, query-builder, or unrestricted-client type. The workspace scan reports 100 files and 300 imports with no forbidden/deep/app/test/config/browser-server edge. |
| Runtime configuration | Production configuration requires HTTPS canonical origin, exact trusted-proxy addresses, credentialed non-placeholder PostgreSQL URL, and a non-placeholder authentication secret of at least 32 bytes. Validation and summaries never echo secret values. CORS remains disabled by default. |
| OpenAPI | `/openapi.json` matches the in-process OpenAPI 3.1 document, is hidden from its own paths, uses no-store/nosniff, excludes provider-owned authentication routes and runtime secrets, and has a byte-reproducible tracked artifact. Typed-client generation remains deferred under the documented stable-toolchain decision. |
| Accessibility | No product UI was added in Phase 3. The existing React Aria foundation, semantic component checks, focus restoration, reduced-motion behavior, axe coverage, and Chromium smoke tests remain green. Stable errors, calculation signals, and authorization outcomes are structured for later accessible presentation; they are not a claim that Phase 4 workflows exist. |

## Security and data review

- Credentials and sessions are PostgreSQL-backed; password/token fields are recursively removed
  from responses, reset identifiers are protected at rest, and deactivation/role/link changes revoke
  sessions at the authoritative boundary.
- Authorization is deny-by-default, evaluated from current PostgreSQL facts, scoped before
  pagination, and keeps HR/domain access separate from system/technical access.
- Domain and security audit streams use separate tables, fact allowlists, query services, and
  authorization paths. Arbitrary metadata, medical detail, secrets, request bodies, and raw URLs
  have no audit storage field.
- Raw attendance events, ledger history, audit evidence, completed idempotency outcomes, and
  approved snapshots remain immutable through normal paths. Source effects and their evidence can
  commit or roll back together.
- The development seed is fictional, explicit, local/test-only, and cannot run against production
  or a non-loopback development target. No production secret, deployment, backup/restore, or release
  claim is created by this gate.

## Verification

The loopback PostgreSQL service became healthy and `pnpm run db:verify` passed all eight selected
database integration files / nine tests. The database-enabled canonical gate then passed:

- exact pnpm `11.20.0` and Node `24.18.0` toolchain, workspace, phase-version, configuration, and
  OpenAPI drift checks;
- Prettier, ESLint, strict composite TypeScript, and the 100-file/300-import boundary scan;
- 24 native repository-contract tests;
- 23 unit/component files with 124 tests;
- all 11 integration files with 17 tests and no database skips;
- two Chromium tests covering semantics/focus/axe and reduced motion; and
- the Vite production build plus all eight emitted workspace entries.

The first browser attempt reached an unrelated Python-served site already listening on port 4173
and therefore failed before loading WorkLedger. The unchanged full gate passed on the repository's
validated `WORKLEDGER_E2E_PORT=4187` isolation path; no application assertion remained failing.

The review also reconciles stale Phase 2 roadmap criterion boxes with the already accepted
`docs/40-phase-2-gate-review.md` and canonical TODO status; `D-206` records that documentation-only
normalization.

## Versioning

Completing `WL-309` is the fourth zero-indexed phase gate. The root and all eight private workspace
manifests advance together from `0.3.0` to `0.4.0`; `phase:check` confirms four sequentially
completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image, GitHub
release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The exact next task is `WL-400`: build the authentication routes, application shell, read-only
profile/session surface, route boundaries, responsive navigation, permission gates, and their
accessible recovery/focus behavior. It must consume the existing authentication/authorization
foundations without putting domain roles in Better Auth sessions or treating client route guards as
authorization evidence.
