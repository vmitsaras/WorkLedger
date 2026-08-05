# Intended Repository Structure

This is the target shape after Phase 1. Do not create all feature folders before their phase.

```text
WorkLedger/
├── AGENTS.md
├── README.md
├── PROJECT_STATUS.md
├── TODO.md
├── .editorconfig
├── .node-version
├── .prettierignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── scripts/
│   ├── check-toolchain.mjs
│   ├── check-boundaries.mjs
│   ├── check-boundaries.test.mjs
│   ├── check-workspace-build.mjs
│   ├── check-workspace.mjs
│   └── check-workspace.test.mjs
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
├── .env.example
│
├── apps/
│   ├── web/
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
│   │   ├── tests/
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
│   │   └── tests/
│   │
│   └── site/                      # Added in Phase 11
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
│   │   └── tests/
│   │
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── errors/
│   │   │   └── modules/
│   │   └── tests/
│   │
│   ├── database/
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   ├── repositories/
│   │   │   ├── transactions/
│   │   │   ├── mapping/
│   │   │   └── seed/
│   │   ├── migrations/
│   │   └── tests/
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
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── test-utils/
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
│   ├── compose/
│   └── proxy-examples/
└── .github/
    └── workflows/
```

`WL-100` created the root workspace foundation, `WL-101` created the eight typed project shells, and `WL-102` added the root/project TypeScript configs, shared config surfaces, formatter/linter adapters, and boundary fixtures/checks shown above. Feature folders, framework files, test-runner projects, infrastructure, `apps/site`, and other descendants in this diagram remain phased targets rather than claims that they already exist.

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
- `apps/site`, when added in Phase 11, may import UI only unless a later ADR justifies another edge.
- Cross-project imports use declared `@workledger/*` `workspace:*` dependencies and explicit package exports; do not traverse into sibling `src`, tests, migrations, generated files, or build output.
- Root/apps/packages are private and internal-only for the MVP. Workspace cycles fail; they are not ignored.
- Shared configuration is a development dependency, not production runtime code. External dependencies are declared by their direct importer.

`WL-101` rejects the wrong manifest graph and proves accepted public-root imports through a real build. `WL-102` now also rejects TypeScript-reference drift and executes static negative fixtures for forbidden, deep, app, sibling-source, production test/config, and browser/server imports. Do not rely on this document alone.

## Test placement

- Pure domain tests live beside or under `packages/domain/tests`.
- Database integration tests live in `packages/database/tests` or API integration tests.
- Component behavior tests live near components.
- Playwright tests live under `e2e/` and cover critical workflows rather than every field combination.
