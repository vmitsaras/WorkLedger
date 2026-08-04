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
- https://better-auth.com/docs/adapters/postgresql

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

## Dependency review questions

For any proposed package:

- What exact user or engineering problem does it solve?
- Can React, the browser, PostgreSQL, Fastify, React Aria, or an existing package solve it?
- What is its accessibility effect?
- What is its maintenance and security surface?
- Does it introduce another state or component primitive model?
- Is it compatible with ESM, strict TypeScript, Node baseline, Vite, and tests?
- Can it be removed later without corrupting persisted data?
