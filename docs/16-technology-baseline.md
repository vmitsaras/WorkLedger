# Technology Baseline and Dependency Policy

This file records responsibilities, not frozen version numbers. The lockfile records exact versions after Phase 1.

## Installation rule

Before installing any package, Codex must:

1. Check the package’s current official documentation and supported runtime baseline.
2. Select the latest stable release compatible with the repository baseline.
3. Avoid beta, RC, canary, experimental, or deprecated packages.
4. Record exact versions in `pnpm-lock.yaml`.
5. Record a new dependency’s purpose in the task report and ADR when architecture-relevant.
6. Prefer existing or native capability when it meets the requirement clearly.

## Selected platform

### Workspace and runtime

- pnpm workspaces with `apps/*` and `packages/*`, one committed root lockfile, and no Turborepo initially.
- Internal dependencies use `workspace:*`; workspace cycles fail rather than warn-and-continue.
- Root/apps/packages use `"private": true` for the MVP. Exact package exports and the dependency matrix follow ADR `0011` and `docs/04-architecture.md` section 11.
- Support Node.js 22 or newer only while the selected line remains under official LTS. `WL-100` pins the then-current compatible LTS toolchain/package manager; do not choose an odd-numbered/EOL line or assume “current” is production-supported.

`WL-100` verified and pinned Node.js `24.18.0` LTS plus pnpm `11.20.0` stable on 2026-08-05. `.node-version`, `package.json`, `pnpm-workspace.yaml`, and the generated lockfile are the executable authority. Node 26 was Current rather than LTS and pnpm 12 was beta, so neither was selected. Later compatibility and production gates must recheck these time-sensitive versions before changing the pins.

At `WL-101` completion, TypeScript `7.0.2` was the only compiler dependency needed to prove the eight typed workspace entries built under Node `24.18.0`. Its supported Node range was checked before installation and the exact resolution remains locked. `WL-102` then replaced that task's temporary command-line flags with the shared configuration described below.

`WL-102` replaced the temporary compiler command with shared composite configuration and exact project references. It pins ESLint `10.8.0`, `@eslint/js` `10.0.1`, Prettier `3.9.6`, `globals` `17.9.0`, and `es-module-lexer` `2.3.1`. ESLint covers repository JavaScript/tooling; strict TypeScript plus the repository-owned lexer cover TypeScript because current `typescript-eslint` `8.66.0` excludes TypeScript 7 through its `<6.1.0` peer range. Do not install that unsupported combination; recheck compatibility in a later tooling upgrade.

`WL-103` pins the baseline test stack after checking stable package metadata and official support docs on 2026-08-07: Vitest `4.1.10`, jsdom `30.0.1`, `@vitejs/plugin-react` `6.0.4`, React/React DOM `19.2.8`, React Testing Library `16.3.2`, DOM Testing Library `10.4.1`, jest-dom `7.0.0`, user-event `14.6.1`, Playwright `1.61.1`, axe-core and `@axe-core/playwright` `4.12.1`, Fastify `5.10.0`, `@types/node` `24.13.3`, `@types/react` `19.2.17`, and `@types/react-dom` `19.2.3`. Vitest `5.0.0` was still beta, so it was excluded. Playwright supports the pinned Node 24 line; Fastify v5 requires Node 20+; Vite/plugin-react support Node 20.19+, 22.12+, or newer, which includes Node `24.18.0`.

`WL-104` pins the local PostgreSQL development image to official `postgres:18.4-trixie` and adds `pg` `8.22.0` plus `@types/pg` `8.20.0` after checking stable package and upstream docs on 2026-08-09. Docker Compose owns only the local development/test service, binds PostgreSQL to loopback port `54329` by default, waits on `pg_isready`, and mounts the PostgreSQL 18 data volume at `/var/lib/postgresql`. `WL-300` now owns Drizzle, generated migrations, and the initial product schema; production Compose remains a later task, while `WL-105` owns the intentionally separate runtime configuration validation.

`WL-105` adds no dependency. The API uses Node's stable WHATWG `URL`, `net.isIP`, and `Buffer.byteLength` capabilities to validate runtime configuration before use. This keeps secret/origin/proxy parsing out of the browser and avoids choosing a contract/schema library before the `D-200` Fastify contract spike. Fastify `5.10.0` receives only the validated exact proxy IP list; it never receives a broad trust setting or a hop count.

Official references:

- https://pnpm.io/workspaces
- https://pnpm.io/settings
- https://docs.npmjs.com/cli/v11/configuring-npm/package-json#private
- https://nodejs.org/en/about/previous-releases
- https://registry.npmjs.org/typescript/7.0.2
- https://www.typescriptlang.org/docs/handbook/project-references.html
- https://eslint.org/docs/latest/use/configure/configuration-files
- https://prettier.io/docs/configuration
- https://registry.npmjs.org/typescript-eslint/8.66.0
- https://www.npmjs.com/package/vitest
- https://vitest.dev/guide/
- https://vite.dev/releases
- https://www.npmjs.com/package/@vitejs/plugin-react
- https://www.npmjs.com/package/react
- https://www.npmjs.com/package/react-dom
- https://react.dev/learn/typescript
- https://www.npmjs.com/package/@testing-library/react
- https://www.npmjs.com/package/@testing-library/dom
- https://www.npmjs.com/package/@testing-library/jest-dom
- https://testing-library.com/docs/user-event/intro/
- https://playwright.dev/docs/intro
- https://playwright.dev/docs/ci
- https://www.npmjs.com/package/axe-core
- https://www.npmjs.com/package/@axe-core/playwright
- https://fastify.dev/docs/v5.10.x/Guides/Migration-Guide-V5/
- https://www.postgresql.org/docs/release/18.4/
- https://hub.docker.com/_/postgres
- https://docs.docker.com/reference/cli/docker/compose/up/
- https://docs.docker.com/reference/compose-file/services/#healthcheck
- https://node-postgres.com/apis/client
- https://www.npmjs.com/package/pg
- https://www.npmjs.com/package/@types/pg
- https://nodejs.org/api/url.html
- https://nodejs.org/api/net.html#netisipinput
- https://fastify.dev/docs/v5.10.x/Reference/Server/#trustproxy

### React web

- React and TypeScript.
- Vite build tooling.
- React Router Data Mode.
- TanStack Query for server state.
- React Hook Form plus Zod for complex forms.

Official references:

- https://reactrouter.com/start/modes
- https://tanstack.com/query/latest/docs/framework/react/overview
- https://react-hook-form.com/
- https://zod.dev/

### Accessible component system

- React Aria Components.
- shadcn/ui initialized with the React Aria base (`--base aria`) when supported by the current CLI.
- Tailwind CSS and CSS custom properties.
- Class Variance Authority for limited, typed component variants.
- Local WorkLedger wrappers and stories.

`WL-106` pins `react-aria-components` `1.20.0`, Tailwind CSS and `@tailwindcss/vite` `4.3.3`,
Class Variance Authority `0.7.1`, and shadcn CLI schema/registry behavior observed at `4.16.2` on
2026-08-10. The checked-in `aria-nova` metadata selects the React Aria base. See
`docs/26-ui-foundation.md` for the source-alias constraint and the narrowly scoped upstream
declaration compatibility override.

Official references:

- https://react-spectrum.adobe.com/react-aria/
- https://ui.shadcn.com/docs/changelog/2026-07-react-aria
- https://ui.shadcn.com/docs/components/aria/calendar
- https://tailwindcss.com/docs

### API

- Node.js supported LTS baseline, initially Node 22 or newer.
- Fastify.
- Schema validation and response serialization.
- OpenAPI when the chosen schema integration is stable.

Official references:

- https://fastify.dev/docs/latest/
- https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- https://fastify.dev/docs/latest/Reference/Type-Providers/

### Database

- PostgreSQL, locally bootstrapped by `WL-104` through `infra/compose/postgres.dev.yml`.
- Drizzle ORM `0.45.2` using the pinned `pg`/node-postgres driver and Drizzle Kit `0.31.10` for generated, committed SQL migrations.
- `WL-300` adds 28 initial application tables, PostgreSQL 18 native UUIDv7 defaults, generated schema metadata, and a custom generated migration for exclusion constraints, organization-consistency foreign keys, and append-only triggers that Drizzle does not express directly.
- The database project alone uses `skipLibCheck` for Drizzle `0.45.2` declarations that are not compatible with the pinned TypeScript `7.0.2` across unused database drivers. WorkLedger source remains strictly checked, and the Drizzle schema is not exported from the package public boundary.
- Local development/test databases use explicit non-production defaults and loopback-only exposure. `WL-105` validates an optional development/test `WORKLEDGER_DATABASE_URL` and requires a non-placeholder credentialed PostgreSQL URL in production; repository/pool construction remains owned by `WL-301`.

Official references:

- https://www.postgresql.org/docs/
- https://www.postgresql.org/docs/release/18.4/
- https://hub.docker.com/_/postgres
- https://node-postgres.com/
- https://orm.drizzle.team/docs/get-started/postgresql-new
- https://orm.drizzle.team/docs/migrations

### Authentication

- Better Auth for credentials and sessions.
- PostgreSQL adapter/integration.
- WorkLedger-owned authorization model.

Official references:

- https://better-auth.com/docs/installation
- https://better-auth.com/docs/integrations/fastify
- https://better-auth.com/docs/concepts/session-management
- https://better-auth.com/docs/concepts/rate-limit
- https://better-auth.com/docs/reference/security
- https://better-auth.com/docs/reference/options
- https://better-auth.com/docs/adapters/postgresql

### Reference reverse proxy

- Caddy is the shipped production Compose/reference example; WorkLedger remains compatible with another proxy only when it satisfies `docs/06-security-operations.md`.
- Use one canonical HTTPS origin, private API/database services, exact trusted-proxy configuration, and overwritten forwarded headers.

Official references:

- https://caddyserver.com/docs/caddyfile/options
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

### Date and time

- Temporal semantics for domain logic.
- Maintained Temporal polyfill where selected browsers/runtimes lack complete support.
- `@internationalized/date` at React Aria control boundaries.

`WL-200` pins `@js-temporal/polyfill` `0.5.1` in `packages/domain`. The accepted Node `24.18.0`
runtime has no global `Temporal`, while the package's stable release supports the repository
baseline and provides its own TypeScript declarations. Domain code imports the polyfill explicitly;
it does not modify a runtime global. See `docs/29-domain-primitives.md` for the construction and
serialization boundary.

Official references:

- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal
- https://www.npmjs.com/package/@js-temporal/polyfill
- https://github.com/js-temporal/temporal-polyfill
- https://react-spectrum.adobe.com/internationalized/date/

Do not assume native Temporal support is universal merely because some modern browsers support it. Browser support must be checked during Phase 1 and again before production release.

### Testing

- Vitest.
- React Testing Library.
- Playwright.
- axe-core integration.
- MSW where client/API mocking improves tests.
- Storybook for isolated UI behavior and visual states.

Official references:

- https://vitest.dev/
- https://testing-library.com/docs/react-testing-library/intro/
- https://playwright.dev/
- https://github.com/dequelabs/axe-core
- https://mswjs.io/
- https://storybook.js.org/

## Explicitly deferred dependencies

Do not add these until a task proves the need:

- Zustand or Redux.
- Redis.
- Queue library.
- FullCalendar.
- TanStack Table.
- Chart library.
- General animation framework.
- File/object-storage SDK.
- Search engine.
- Analytics/telemetry SDK.
- Native/PWA offline mutation package.
- Turborepo or another task orchestrator/cache layer.
- Changesets or another package-publication/versioning workflow.

## Dependency review questions

For any proposed package:

- What exact user or engineering problem does it solve?
- Can React, the browser, PostgreSQL, Fastify, React Aria, or an existing package solve it?
- What is its accessibility effect?
- What is its maintenance and security surface?
- Does it introduce another state or component primitive model?
- Is it compatible with ESM, strict TypeScript, Node baseline, Vite, and tests?
- Can it be removed later without corrupting persisted data?
