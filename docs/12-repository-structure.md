# Intended Repository Structure

This is the target shape after Phase 1. Do not create all feature folders before their phase.

```text
WorkLedger/
├── AGENTS.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── README.md
├── PROJECT_STATUS.md
├── TODO.md
├── .editorconfig
├── .node-version
├── .prettierignore
├── playwright.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── openapi/
│   └── workledger.openapi.json
├── scripts/
│   ├── check-toolchain.mjs
│   ├── check-boundaries.mjs
│   ├── check-boundaries.test.mjs
│   ├── check-phase-version.mjs
│   ├── check-phase-version.test.mjs
│   ├── check-postgres-dev.mjs
│   ├── check-workspace-build.mjs
│   ├── check-workspace.mjs
│   ├── check-workspace.test.mjs
│   ├── generate-openapi.mjs
│   └── run-postgres-integration.mjs
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── prettier.config.js
├── test/
│   └── setup/
│       └── vitest-dom.ts
├── .env.example
│
├── apps/
│   ├── web/
│   │   ├── e2e/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── router/
│   │   │   │   ├── providers/
│   │   │   │   ├── layouts/
│   │   │   │   └── error-boundaries/
│   │   │   ├── features/
│   │   │   │   ├── attendance/
│   │   │   │   ├── corrections/
│   │   │   │   ├── absences/
│   │   │   │   ├── approvals/
│   │   │   │   ├── periods/
│   │   │   │   ├── employees/
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   │   │   ├── shared/
│   │   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── routing/
│   │   │   │   ├── formatting/
│   │   │   │   └── testing/
│   │   │   ├── styles/
│   │   │   └── main.tsx
│   │   ├── test/
│   │   └── vite.config.*
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── plugins/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── attendance/
│   │   │   │   ├── corrections/
│   │   │   │   ├── absences/
│   │   │   │   ├── approvals/
│   │   │   │   ├── periods/
│   │   │   │   ├── employees/
│   │   │   │   ├── reports/
│   │   │   │   └── audit/
│   │   │   ├── authorization/
│   │   │   ├── errors/
│   │   │   ├── observability/
│   │   │   └── server.ts
│   │   └── test/
│   │
│   └── site/                      # Added in Phase 13
│
├── packages/
│   ├── domain/
│   │   ├── src/
│   │   │   ├── shared/
│   │   │   ├── attendance/
│   │   │   ├── schedules/
│   │   │   ├── time-account/
│   │   │   ├── absences/
│   │   │   ├── leave-account/
│   │   │   └── periods/
│   │   └── test/
│   │
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── errors/
│   │   │   └── modules/
│   │   └── test/
│   │
│   ├── database/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── schema/
│   │   │   ├── repositories/
│   │   │   ├── transactions/
│   │   │   ├── mapping/
│   │   │   ├── seed/             # Added with WL-307
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   └── test/
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── patterns/
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   └── testing/
│   │   └── stories/
│   │
│   ├── config/
│   │   ├── eslint/
│   │   ├── prettier/
│   │   ├── src/
│   │   ├── typescript/
│   │   ├── vitest/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── test-utils/
│       ├── src/
│       └── test/
│
├── docs/
│   ├── adr/
│   ├── product/
│   ├── domain/
│   ├── architecture/
│   ├── ux/
│   ├── security/
│   └── operations/
│
├── e2e/
├── infra/
│   ├── docker/
│   │   └── postgres/
│   │       └── init/
│   │           └── 001-workledger-local.sql
│   ├── compose/
│   │   └── postgres.dev.yml
│   └── proxy-examples/
└── .github/
    └── workflows/
        └── ci.yml
```

`WL-100` created the root workspace foundation, `WL-101` created the eight typed project shells,
`WL-102` added the root/project TypeScript configs, shared config surfaces, formatter/linter
adapters, and boundary fixtures/checks, `WL-103` added the baseline test-runner, accessibility,
Playwright, and CI files shown above, `WL-104` added the local PostgreSQL Compose service plus
database lifecycle scripts/tests, `WL-105` added tracked-safe environment examples plus API runtime
configuration and proxy-trust validation, `WL-106` added the React Aria/Tailwind component
foundation, and `WL-107` added the public setup, contribution, license, and private security-
reporting documentation. Feature folders, framework files beyond the current foundation preview,
production infrastructure, `apps/site`, and other descendants in this diagram remain phased targets
rather than claims that they already exist. `WL-108` passed the Phase 1 gate with the evidence in
`docs/28-phase-1-gate-review.md` and advanced the shared internal workspace version to `0.2.0`.
`WL-200` then created `packages/domain/src/shared` for the first bounded domain slice, and
`WL-201` added the pure `packages/domain/src/schedule-policy.ts` resolver. Later feature folders
remain uncreated until their owning tasks begin. `WL-300` created the internal
`packages/database/src/schema`, generated migration SQL/metadata, migration configuration, and
database schema tests; repositories, transactions, mappings, and seed folders remain owned by
their later tasks.

`WL-302` added `apps/api/src/auth` for the credential/session composition boundary,
`packages/database/src/auth-database.ts` for internal Better Auth persistence and authoritative
session/throttle operations, and shared isolated PostgreSQL fixture support in
`packages/test-utils/src/postgres.ts`.

`WL-303` added `apps/api/src/authorization` for the pure permission policy and composed
authorization service. Historical account links and role assignments plus their transaction-scoped
repository remain internal to `packages/database`; Better Auth sessions remain free of domain
permission claims.

`WL-304` added `packages/contracts/src/api.ts` for strict shared Zod envelopes/error contracts and
`apps/api/src/http` for request identifiers, Zod Fastify compilers, OpenAPI generation, and safe
transport error mapping. `WL-308` now exposes the selected document through the hardened public
route and reproducibility boundary described below.

`WL-305` added `packages/database/src/repositories/audit-values.ts` for minimized fact validation
and `apps/api/src/audit` for authorization-composed domain/security history queries. The two audit
tables and query surfaces remain separate by design.

`WL-306` added the protected attendance idempotency repository and terminal outcome validation.
`WL-307` added `packages/database/src/seed` for the explicit local/test-only deterministic Northstar
seed; it is not imported by application startup and rejects production/non-local development
targets.

`WL-308` added `apps/api/src/http/openapi.ts`, the generated `openapi/workledger.openapi.json`
artifact, and a root generator/check script. The runtime document and tracked artifact derive from
the same Zod/Fastify route schemas; neither is a second request/response contract source.

## Feature-folder rule

Create a feature folder only when work begins on that feature. Avoid empty speculative architecture.

A web feature may contain:

```text
attendance/
├── api/
├── components/
├── routes/
├── forms/
├── hooks/
├── formatters/
└── tests/
```

Do not create a feature-level “utils” dumping ground. Name modules by responsibility.

## Package-boundary rule

`docs/04-architecture.md` section 11 is canonical. In summary:

- `packages/domain`, `packages/contracts`, `packages/ui`, and `packages/config` import no other WorkLedger runtime package.
- `packages/database` may import `packages/domain`; it must not expose Drizzle rows/query builders or an unrestricted client to API handlers.
- `packages/test-utils` may import domain/contracts through public exports but is test-only. `packages/domain` keeps its own factories local and never imports `packages/test-utils`.
- `apps/web` may import contracts/UI only; it cannot import domain calculations, database, API/server auth, environment, or another app.
- `apps/api` may import domain/contracts/database only; it cannot import UI/web or delegate server authorization to contracts.
- `apps/site`, when added in the portfolio phase (now Phase 13), may import UI only unless a later ADR justifies another edge.
- Cross-project imports use declared `@workledger/*` `workspace:*` dependencies and explicit package exports; do not traverse into sibling `src`, tests, migrations, generated files, or build output.
- Root/apps/packages are private and internal-only for the MVP. Workspace cycles fail; they are not ignored.
- Shared configuration is a development dependency, not production runtime code. External dependencies are declared by their direct importer.

`WL-101` rejects the wrong manifest graph and proves accepted public-root imports through a real build. `WL-102` now also rejects TypeScript-reference drift and executes static negative fixtures for forbidden, deep, app, sibling-source, production test/config, and browser/server imports. Do not rely on this document alone.

## Test placement

- Pure domain tests live beside or under `packages/domain/test`.
- Database integration tests live in `packages/database/test` or API integration tests.
- Component behavior tests live near components.
- Playwright tests live under the owning app's `e2e/` folder and cover critical workflows rather than every field combination.
