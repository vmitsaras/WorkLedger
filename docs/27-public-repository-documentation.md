# WL-107 Public Repository and Contributor Documentation

**Review date:** 2026-08-10

**Task:** `WL-107`

**Outcome:** Complete. WorkLedger now has evidence-aligned public status, fresh-clone setup, script,
workspace-boundary, contribution, license, and private security-reporting documentation. The
foundation remains unreleased and not production-ready.

## 1. Scope delivered

- Replaced the planning-oriented root README with a contributor-facing repository overview.
- Documented the exact Node/pnpm/Playwright prerequisites and a fresh-clone verification path.
- Distinguished the runnable React Aria foundation preview from an application or supported demo.
- Documented every current root script, including install/test helpers, PostgreSQL opt-in behavior,
  and the destructive effect of `db:reset`.
- Summarized the executable ADR `0011` package graph and linked the canonical architecture sources.
- Added a bounded contribution workflow with required test, accessibility, security, and project-
  memory expectations.
- Retained the existing MIT license and explained that private workspace manifests prevent package
  publication but do not change the source license.
- Added a security policy with no supported-version or response-time claim and enabled GitHub
  Private Vulnerability Reporting for `vmitsaras/WorkLedger`.

No domain behavior, product route, application schema, authentication, API listener, production
Compose file, release artifact, deployment, package publication, or new dependency was added.

## 2. Public claim boundary

| Surface | Verified claim | Explicitly not claimed |
|---|---|---|
| Web | Vite can serve an isolated component-foundation preview | A WorkLedger product workflow, demo account, or production frontend |
| API | Configuration and generic Fastify health behavior have tests | A runnable product API, authentication, domain endpoint, or deployment |
| Database | Local PostgreSQL health and disposable-schema lifecycle are available | Product schema, migration, seed, backup, or production database |
| Tests | Root commands cover implemented foundation layers | Future workflow correctness, full WCAG conformance, or production security |
| Packages | Eight private typed projects and exact internal edges are enforced | Public npm packages, stable public APIs, or publication support |
| Release | Phase 1 is awaiting its exit-gate review | A supported version, image, tag, deployment, SLA, or production readiness |

## 3. Security-reporting workflow

GitHub's repository API reported Private Vulnerability Reporting disabled before this task. The
setting was enabled through the authenticated repository API, then read back as enabled. The public
policy directs reporters to the repository's private advisory form and explicitly rejects public
issues, discussions, pull requests, or commits for vulnerability details.

`SECURITY.md` accepts reports while stating that no released version is supported. It asks for
synthetic, minimized evidence and prohibits live secrets, employee/HR data, production records, and
unrelated personal information. It makes no acknowledgement, remediation, or operational-support
deadline promise.

## 4. Accessibility

The documentation uses semantic Markdown headings, lists, tables, descriptive link text, and plain
language. It accurately limits current accessibility evidence to foundation component and Chromium
axe/keyboard checks. Manual screen-reader, forced-colors, zoom/reflow, and complete workflow review
remain later gates; no documentation statement converts the current preview into WCAG conformance
evidence for an application.

## 5. Security and data

- No secret, employee data, authentication record, database content, browser storage, telemetry,
  or networked product behavior was introduced.
- Local connection strings shown publicly are the explicit loopback-only, non-production defaults
  already tracked for the Compose development service.
- The security-reporting setting is the only external repository state changed by this task. It is
  a private intake path, not a support or release promise.
- Setup text warns that `.env.example` is local-only and that `db:reset` deletes the local volume.

## 6. Verification evidence

Verification covered the repository content, clean-clone setup path, complete current quality gate,
and private-reporting setting.

| Check | Result |
|---|---|
| Independent clone | `git clone --local --no-hardlinks` created a separate checkout of current `HEAD`; no existing dependencies or build output were copied |
| Managed frozen install | `pnpm with 11.20.0 install --frozen-lockfile` passed and the preinstall guard reported pnpm `11.20.0`, Node `v24.18.0` |
| Managed versions/browser | The documented Node and pnpm version commands returned `v24.18.0` / `11.20.0`; Playwright's Chromium installation command passed |
| Clean-clone quality gate | `pnpm with 11.20.0 run verify` passed 24 native tests, 14 unit/component tests, 4 non-database integration tests with the 1 PostgreSQL test skipped as documented, 2 Chromium tests, and the build |
| Real PostgreSQL lifecycle | `pnpm with 11.20.0 run db:verify` passed the host health check and isolated create/query/drop/cleanup test |
| Database-enabled quality gate | `WORKLEDGER_TEST_DATABASE_URL=<documented local test URL> pnpm with 11.20.0 run verify` passed all 5 integration tests plus the complete format/lint/boundary/type/unit/component/E2E/build chain |
| Documentation | Prettier, `git diff --check`, all local Markdown targets, and the `docs/04-architecture.md#11-dependency-rule` heading check passed |
| Private reporting | Authenticated GitHub API readback returned `{ "enabled": true }` after enablement |

The database-enabled working-tree run passed 24 native contract tests, 14 unit/component tests, all
5 integration tests, 2 Chromium tests, strict type checking, the 37-file/75-import boundary scan,
the Vite build, and all eight emitted workspace-entry imports. PostgreSQL was stopped afterward
without deleting its development volume.

## 7. Handoff

The exact next task is `WL-108`: execute the Phase 1 gate review. That review owns the clean-install,
boundary, test, database, configuration, UI-foundation, contributor-documentation, and shared
version evidence needed to close Phase 1. It does not authorize starting Phase 2 before the gate is
passed.
