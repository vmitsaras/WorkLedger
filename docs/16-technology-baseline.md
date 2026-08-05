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

- PostgreSQL.
- Drizzle ORM using the `pg`/node-postgres driver.
- Drizzle Kit-generated SQL migrations committed to the repository.

Official references:

- https://www.postgresql.org/docs/
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

Official references:

- https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal
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
