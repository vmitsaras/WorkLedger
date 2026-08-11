# WL-104 PostgreSQL Docker Development Environment

**Review date:** 2026-08-09

**Task:** `WL-104`

**Outcome:** Local PostgreSQL development service and isolated test database lifecycle are configured without adding application schema, Drizzle migrations, authentication storage, seed data, or production deployment behavior.

## 1. Scope delivered

- Added a local-only Docker Compose PostgreSQL service in `infra/compose/postgres.dev.yml`.
- Pinned the development container to PostgreSQL `18.4` through the official `postgres:18.4-trixie` image.
- Mounted the database volume at `/var/lib/postgresql`, matching the PostgreSQL 18 Docker image layout.
- Added initialization SQL that creates separate local app, migration, and test roles plus an empty `workledger_test` database.
- Added `db:*` scripts for starting, stopping, resetting, health-checking, and testing the local service.
- Added a host-side PostgreSQL health check that redacts credentials in output.
- Added an opt-in integration test that creates, queries, drops, and verifies cleanup of a random test schema.
- Updated CI so GitHub Actions starts PostgreSQL, runs the lifecycle proof, and then runs the full workspace verify command with the test database URL set.

## 2. Command contract

| Command | Responsibility |
|---|---|
| `pnpm run db:up` | Start the local PostgreSQL service and wait for Docker health checks |
| `pnpm run db:check` | Connect from the host to the local development database and print a redacted readiness summary |
| `pnpm run db:test` | Build package outputs and run the real database lifecycle integration test |
| `pnpm run db:verify` | Run the local health check and database lifecycle test |
| `pnpm run db:down` | Stop the local PostgreSQL service while preserving its Docker volume |
| `pnpm run db:reset` | Stop the service and remove the local PostgreSQL Docker volume |

Default local URLs:

| Purpose | URL |
|---|---|
| App development health check | `postgres://workledger_app:workledger_dev_password@127.0.0.1:54329/workledger_dev` |
| Integration database | `postgres://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test` |

The port can be overridden with `WORKLEDGER_POSTGRES_PORT`. `WORKLEDGER_DATABASE_URL` overrides the health-check target, and `WORKLEDGER_TEST_DATABASE_URL` overrides the integration-test target.

## 3. Dependency decisions

Exact stable versions were checked on 2026-08-09 and locked in `pnpm-lock.yaml`.

| Dependency | Version | Purpose |
|---|---:|---|
| `pg` | `8.22.0` | Host health check and PostgreSQL integration test client |
| `@types/pg` | `8.20.0` | Type declarations for database-package integration tests |

No Drizzle dependency is added in `WL-104`; schema and migration tooling remain `WL-300`.

## 4. Security and data

The Compose service binds PostgreSQL only to `127.0.0.1` and uses explicit non-production credentials. The app, migration, and test roles are separate to keep the later permission model visible, but no production secret handling or deployment configuration is introduced. The health-check script redacts usernames and passwords before printing connection labels.

The integration test uses a generated schema name, creates only a disposable probe table, and drops the schema in a `finally` block before verifying that the namespace is gone. It does not create WorkLedger domain tables, migrations, employee records, seed data, auth tables, or audit records.

`WL-307` adds an explicit development-seed command. The local migrator owns tables it creates;
Compose initialization grants the normal application role schema usage and default
select/insert/update/delete privileges on those future tables. Production role provisioning remains
a separate deployment responsibility and must not reuse these development credentials.

## 5. CI behavior

GitHub Actions now starts the same Compose service used locally, runs `pnpm run db:verify`, sets `WORKLEDGER_TEST_DATABASE_URL`, and then runs `pnpm run verify`. The PostgreSQL service is stopped in an `always()` cleanup step.

## 6. Verification evidence

Executed with Node `24.18.0`, pnpm `11.20.0`, Docker `29.6.1`, and Docker Compose `v5.3.0` on 2026-08-09:

| Command | Result |
|---|---|
| `pnpm with 11.20.0 install --lockfile-only` | Passed; lockfile updated for `pg` and `@types/pg` |
| `pnpm with 11.20.0 install --frozen-lockfile` | Passed for all 9 workspace projects |
| `pnpm with 11.20.0 run workspace:check` | Passed: 8 runtime edges, 11 development edges, phase version `0.1.0` |
| `pnpm with 11.20.0 run lint` | Passed ESLint and 25-file/38-import boundary scan |
| `pnpm with 11.20.0 run typecheck` | Passed all 8 strict composite TypeScript projects |
| `pnpm with 11.20.0 run test:integration` | Passed with database lifecycle test skipped because no URL was set |
| `pnpm with 11.20.0 run db:up` | Passed; local PostgreSQL container became healthy |
| `pnpm with 11.20.0 run db:verify` | Passed host health check and isolated lifecycle integration test |
| `WORKLEDGER_TEST_DATABASE_URL=... pnpm with 11.20.0 run verify` | Passed full format, lint, typecheck, unit/component, integration, E2E, and build chain with the PostgreSQL integration test enabled |

During verification, the first PostgreSQL startup attempt exposed the PostgreSQL 18 Docker image's new data-directory guard. The Compose volume was corrected to mount at `/var/lib/postgresql`, the failed local Docker volume was removed, and the clean retry passed.

## 7. Handoff

`WL-105` owns environment validation, canonical origins, proxy trust, secrets, and safe example configuration. `WL-300` owns the first real PostgreSQL schema and generated Drizzle migrations.
