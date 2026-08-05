# ADR 0011 — pnpm Monorepo and Internal Package Boundaries

**Status:** Accepted by `WL-011`

## Context

WorkLedger needs separate browser, API, domain, contract, persistence, UI, configuration, and test responsibilities. A monorepo keeps those changes reviewable together, but directory names alone do not prevent domain rules from leaking into React/route handlers, database access from leaking into the browser, or internal packages from being published accidentally.

The project is planning-only today. Phase 1 must create the smallest enforceable workspace without inventing feature folders, a second build orchestrator, or a registry release process.

## Decision

Use a pnpm workspace with one root `pnpm-lock.yaml` and no Turborepo initially.

- Workspace projects are `apps/web`, `apps/api`, `packages/domain`, `packages/contracts`, `packages/database`, `packages/ui`, `packages/config`, and `packages/test-utils`. `apps/site` is added only in Phase 11.
- The root and every app/package manifest use `"private": true`. Internal package names use `@workledger/*`; cross-workspace dependencies use `workspace:*`.
- The exact allowed WorkLedger dependency matrix is canonical in `docs/04-architecture.md` section 11. No app is imported, no package cycle is allowed, and production source cannot import `packages/config` or `packages/test-utils`.
- Each package exposes an explicit public surface through package exports. Cross-project relative traversal, undeclared path aliases, and imports from another project's `src`, tests, migrations, generated internals, or build output are prohibited.
- `apps/api` is the server composition/application-service layer. `apps/web` is the browser composition layer. No separate application package is introduced until at least two real consumers justify one through a later ADR.
- Phase 1 enforces the matrix through pnpm cycle rejection, TypeScript project/build boundaries, explicit exports, ESLint import restrictions or an equivalent repository-owned static check, and representative negative fixtures.
- There is no npm package publication, registry credential, package release/versioning tool, or compatibility promise in the MVP. Public package publication requires a later ADR and an explicitly authorized release workflow.

## Consequences

- The domain and contracts remain independently usable and runtime-neutral; the API performs explicit mapping between them.
- The database package can map rows to domain values without making the domain depend on persistence.
- The browser cannot import authoritative calculation, database, or server-auth code through a convenience path.
- Test reuse is available without making production code depend on test helpers; domain-local factories avoid a domain/test-utils cycle.
- A single lockfile and direct dependency declarations make installs and reviews reproducible without another orchestration layer.
- Some mapping code at API/database boundaries is deliberate. It prevents database rows, domain entities, and public DTOs from becoming one coupled model.

## Rejected alternatives

- One undivided application package: makes browser/server/persistence boundaries easy to bypass.
- A package for every feature or abstract “application” layer before real reuse: creates speculative structure and circular-dependency pressure.
- Turborepo in Phase 1: pnpm recursive scripts and the small initial graph are sufficient; add orchestration only after measured need.
- Publishing `packages/domain` or `packages/ui` during the MVP: their APIs and product constraints are not stable public contracts.
- TypeScript path aliases that point directly at sibling source: they bypass package metadata, exports, and dependency declarations.

## Review triggers

Update or supersede this ADR before adding a production workspace project, changing an allowed edge, introducing another orchestration tool, extracting an application package, sharing server code with another client, or publishing any package.
