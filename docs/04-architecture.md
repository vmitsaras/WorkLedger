# Architecture

## 1. System shape

```text
Browser
  │
  ├── apps/web — React application
  │      ├── React Router Data Mode
  │      ├── TanStack Query
  │      ├── React Aria / WorkLedger UI
  │      └── React Hook Form / Zod
  │
  └── HTTPS JSON API
         │
         └── apps/api — Fastify
                ├── authentication/session adapter
                ├── authorization policies
                ├── application services
                ├── domain package
                ├── repositories / transactions
                └── PostgreSQL
```

A later `apps/site` Astro application presents the public case study, documentation, and portfolio material. It is not required to operate WorkLedger.

## 2. Monorepo boundaries

### `apps/web`

Owns:

- route composition,
- authenticated application shell,
- page-level data composition,
- user interaction,
- accessible presentation,
- client-side error and pending states.

Does not own:

- business calculations,
- authorization truth,
- database access,
- ledger mutation,
- audit rules.

### `apps/api`

Owns:

- HTTP transport,
- authentication integration,
- authorization checks,
- request validation,
- application-service orchestration,
- transaction boundaries,
- response serialization,
- API error mapping.

Does not embed calculation rules directly in route handlers.

### `packages/domain`

Owns pure, deterministic business behavior:

- domain value types,
- schedule and policy resolution,
- attendance transition validation,
- session reconstruction,
- daily calculation,
- warning detection,
- absence credit,
- ledger calculation,
- monthly state transitions.

Rules:

- No React imports.
- No Fastify imports.
- No database imports.
- No environment variables.
- No network or filesystem calls.
- Clock/time is passed explicitly to functions that need “now.”

### `packages/contracts`

Owns:

- request/response schemas,
- error codes,
- pagination/filter contracts,
- DTOs that cross process boundaries.

Contracts are not domain entities. Avoid exposing database rows directly.

### `packages/database`

Owns:

- Drizzle schema,
- SQL migrations,
- repository implementations,
- transaction helpers,
- query pagination,
- database test setup.

It maps database rows to domain/application values.

### `packages/ui`

Owns:

- accessible shared components,
- React Aria wrappers,
- design tokens and variants,
- product-neutral interaction patterns,
- Storybook stories and UI tests.

Product-specific feature components may remain in `apps/web/src/features` until reuse is demonstrated.

## 3. React Router and TanStack Query contract

- Use React Router Data Mode.
- Route definitions own layout nesting, lazy boundaries, error boundaries, permission gates, document titles, and URL parsing.
- TanStack Query owns API queries, mutations, cache invalidation, retries, and server-state lifecycle.
- Route loaders may authenticate, check coarse permission, and prefetch with `queryClient.ensureQueryData`.
- Do not fetch the same resource separately in a loader and component.
- Mutations use one application mutation function; do not implement parallel React Router action and TanStack mutation paths for the same operation.
- Search params own date range, page, sort, status, team, and employee filters.
- Sensitive values do not belong in URLs.

## 4. API shape

Prefer domain-oriented commands over generic CRUD where rules matter.

Examples:

- `POST /v1/attendance/clock-in`
- `POST /v1/attendance/start-break`
- `POST /v1/attendance/end-break`
- `POST /v1/attendance/clock-out`
- `GET /v1/me/attendance/today`
- `GET /v1/me/time-records`
- `POST /v1/correction-requests`
- `POST /v1/absence-requests`
- `POST /v1/approvals/{id}/approve`
- `POST /v1/monthly-periods/{id}/submit`

Generic CRUD is acceptable for low-risk administration resources when validation and audit behavior remain explicit.

## 5. Application services

Application services coordinate:

1. authenticate actor,
2. authorize resource/action,
3. load state,
4. invoke domain rule,
5. persist in a transaction,
6. append ledger/audit records,
7. return DTO and relevant version.

They should not depend on React or UI language.

## 6. Authentication

- Better Auth handles credentials, password reset, verification where enabled, sessions, and secure cookies.
- WorkLedger stores employee identity, team, manager, and application roles separately.
- A user account may link to one employee record in the MVP.
- Deactivation revokes access without deleting history.
- The session response exposes only the minimum data needed by the client.

## 7. Database design principles

- PostgreSQL is the source of truth.
- Use generated, committed SQL migrations.
- Never use schema push as the production migration process.
- Use database constraints for invariant support where practical.
- Use transactions for multi-record domain changes.
- Use unique constraints for idempotency and one-active-state protection where practical.
- Use optimistic version or equivalent concurrency control for records edited by multiple actors.
- Index common organization, employee, date, status, manager, and period queries.
- Use soft deactivation or status fields for employees; do not cascade-delete audit history.

## 8. High-level data areas

- authentication users and sessions,
- organizations and settings,
- employees and employment periods,
- teams, manager assignments, and delegations,
- schedules, policies, and assignments,
- holiday calendars and dates,
- punch events and correction versions,
- calculated daily records or persisted snapshots,
- time-account entries,
- absence types, requests, decisions, and entitlements,
- monthly periods and snapshots,
- notifications,
- attachments,
- idempotency records,
- audit events.

The exact schema is produced in Phase 3 after the domain interfaces are stable.

## 9. Calculation persistence strategy

Recommended:

- Preserve raw immutable events.
- Calculate deterministic daily results through the domain engine.
- Persist daily projections/snapshots for reporting and locking when needed.
- Version calculation-policy inputs.
- Store the approved period snapshot and hash/version metadata.
- Rebuild projections through an explicit process, never silently during arbitrary reads.

## 10. Error architecture

Use stable machine-readable codes and user-safe messages. See `docs/13-api-error-conventions.md`.

Error classes:

- authentication,
- authorization,
- validation,
- domain conflict,
- not found,
- concurrency conflict,
- rate limit,
- dependency unavailable,
- internal failure.

Do not expose stack traces, SQL, secrets, or sensitive record details.

## 11. Dependency rule

Allowed dependency direction:

```text
apps/web ──> packages/ui, packages/contracts
apps/api ──> packages/contracts, packages/domain, packages/database
packages/database ──> packages/domain where mapping types require it
packages/ui ──> React Aria and style utilities
packages/domain ──> only small runtime-neutral utilities and Temporal support
```

No circular package dependencies.

## 12. Architecture review triggers

Create or update an ADR before:

- adding global state,
- changing authentication provider,
- changing ORM or database,
- introducing queues or Redis,
- adding offline clocking,
- supporting multiple organizations,
- changing calculation persistence,
- adding file storage,
- adding formal overtime,
- changing monthly locking semantics,
- replacing the UI primitive foundation.
