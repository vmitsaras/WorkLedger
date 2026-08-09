# WL-103 Test Projects and Baseline CI

**Review date:** 2026-08-07

**Task:** `WL-103`

**Outcome:** Complete locally. WorkLedger now has baseline unit, component, integration, E2E, accessibility, and CI harnesses without adding product behavior, database schema, design-system implementation, or `apps/site`.

## 1. Scope delivered

- Added a shared Vitest project factory under `packages/config/vitest`.
- Added root `vitest.config.ts` with `unit`, `component`, and `integration` projects.
- Added root `playwright.config.ts` for Chromium E2E smoke tests under `apps/web/e2e`.
- Added React Testing Library/jsdom setup in `test/setup/vitest-dom.ts`.
- Added `packages/test-utils` helpers for fixed clocks, JSON response parsing, database harness state, jsdom axe assertions, and Playwright axe assertions.
- Added baseline unit tests for current package boundary exports.
- Added component smoke tests for web/UI semantics and axe checks.
- Added API integration smoke coverage with Fastify injection.
- Added database harness tests that validate opt-in URL handling and credential redaction without opening a PostgreSQL connection.
- Added `.github/workflows/ci.yml`, using pnpm `11.20.0`, Node `24.18.0`, frozen install, Chromium browser installation, and `pnpm run verify`.

## 2. Test command contract

| Command | Responsibility |
|---|---|
| `pnpm run config:check` | Builds the API shell, loads an optional ignored local `.env` through Node's native `--env-file-if-exists` option, validates runtime configuration, and prints only a redacted summary |
| `pnpm run test` | Workspace contract, TypeScript build for public package exports, native Node contract tests, Vitest unit tests, and Vitest component tests |
| `pnpm run test:integration` | Workspace contract, TypeScript build, API/database integration smoke tests |
| `pnpm run test:e2e` | Workspace contract, TypeScript build, Chromium Playwright E2E smoke test with axe |
| `pnpm run verify` | Full local quality gate: runtime configuration, format, lint/boundaries, typecheck, unit/component, integration, E2E, and build |

`test:build` exists so test commands can resolve internal package public exports from `dist` even when a developer runs a test command directly from a clean checkout.

## 3. Dependency decisions

Exact stable versions were checked on 2026-08-07 and locked in `pnpm-lock.yaml`.

| Dependency | Version | Purpose |
|---|---:|---|
| Vitest | `4.1.10` | Unit/component/integration runner; `5.0.0` was beta and excluded |
| jsdom | `30.0.1` | DOM environment for component smoke tests |
| `@vitejs/plugin-react` | `6.0.4` | React transform support for Vite/Vitest tooling |
| React / React DOM | `19.2.8` | Test-time React rendering baseline for web/UI projects |
| React Testing Library | `16.3.2` | Component tests by accessible queries |
| DOM Testing Library | `10.4.1` | Required peer for current React Testing Library |
| jest-dom | `7.0.0` | DOM matchers for Vitest |
| user-event | `14.6.1` | Higher-fidelity user interaction smoke coverage |
| Playwright | `1.61.1` | Browser E2E runner; Chromium-only baseline in `WL-103` |
| axe-core / `@axe-core/playwright` | `4.12.1` | WCAG-tagged automated accessibility smoke checks |
| Fastify | `5.10.0` | API integration harness smoke via `inject` |
| `@types/node` | `24.13.3` | Node 24 config/helper typings |
| `@types/react` / `@types/react-dom` | `19.2.17` / `19.2.3` | React 19 test typing support |

The four `@workledger/test-utils` internal development edges are intentionally limited to `apps/api`, `apps/web`, `packages/database`, and `packages/ui`. Production imports of `@workledger/test-utils` still fail the source-boundary check.

## 4. Accessibility

The jsdom and Playwright smoke tests run axe with WCAG A/AA tags, verify real roles/names, and use React Testing Library queries rather than implementation details. These tests prove the harness works; they are not evidence that future WorkLedger feature UI is accessible. `WL-106` still owns design-system component accessibility evidence.

## 5. Security and data

No employee data, secret, database schema, migration, authentication path, telemetry, persistent browser storage, or network service was added. The database harness accepts an explicit test URL, rejects non-PostgreSQL protocols, and redacts username/password values in diagnostic labels. Actual PostgreSQL lifecycle and isolated test database behavior remain `WL-104`.

## 6. Verification evidence

Executed with pnpm `11.20.0` and Node `24.18.0`:

| Command | Result |
|---|---|
| `pnpm with 11.20.0 install --frozen-lockfile` | Passed for all 9 workspace projects |
| `pnpm with 11.20.0 run workspace:check` | Passed: 8 runtime edges, 11 development edges, phase version `0.1.0` |
| `pnpm with 11.20.0 run lint` | Passed ESLint and 24-file/35-import boundary scan |
| `pnpm with 11.20.0 run typecheck` | Passed all 8 strict composite TypeScript projects |
| `pnpm with 11.20.0 run test` | Passed 23 native Node tests and 6 Vitest unit/component tests |
| `pnpm with 11.20.0 run test:integration` | Passed 2 integration files / 3 tests |
| `pnpm with 11.20.0 run test:e2e` | Passed 1 Chromium Playwright E2E smoke test |
| `pnpm with 11.20.0 run verify` | Passed the full format, lint, typecheck, test, integration, E2E, and build chain |

The GitHub Actions workflow has not executed remotely in this local worktree; it will run on the next push or pull request.

## 7. Handoff

The exact next task is `WL-104`: configure local PostgreSQL and Docker development services plus a real isolated integration database lifecycle. Do not add Drizzle schema/migrations, seed data, or production deployment behavior before that service foundation is in place.
