# Architecture

## 1. System shape

```text
Browser
  │ HTTPS; one canonical production origin
  ▼
reference Caddy / equivalent trusted reverse proxy
  │
  ├── apps/web — React application
  │      ├── React Router Data Mode
  │      ├── TanStack Query
  │      ├── React Aria / WorkLedger UI
  │      └── React Hook Form / Zod
  │
  └── private JSON API
         │
         └── apps/api — Fastify
                ├── authentication/session adapter
                ├── authorization policies
                ├── application services
                ├── domain package
                ├── repositories / transactions
                └── PostgreSQL
```

A later `apps/site` Astro application presents the public case study, documentation, and portfolio material. It is not required to operate WorkLedger. The API and PostgreSQL remain private in production; proxy trust, TLS, headers, health, and network requirements are defined in `docs/06-security-operations.md`.

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

### `packages/config`

Owns shared TypeScript, ESLint, Vitest, and formatting configuration. It is tooling-only: production source must not import it at runtime, and it must not depend on another WorkLedger app/package.

### `packages/test-utils`

Owns generic deterministic clocks, builders/factories based on public domain/contract APIs, accessibility helpers, and transport-test helpers that are genuinely reused. It may depend on `packages/domain` and `packages/contracts`, but it is test-only and never imported by production source. Domain tests keep domain-specific factories local so `packages/domain` never depends back on `packages/test-utils`.

### Composition and interface ownership

- `apps/api` is the server composition root and application-service layer. Route handlers remain transport-thin; application services coordinate authorization, repositories, transactions, domain rules, audit, and contract mapping.
- Repository interfaces, implementations, and transaction adapters live in `packages/database` for the MVP. They expose narrow application-facing methods and domain/application values, never Drizzle query builders or rows.
- `apps/web` is the browser composition root. It consumes serialized contracts and does not reimplement authoritative domain calculation or authorization.
- `packages/contracts` owns wire schemas and DTOs independently of domain entities. The API explicitly and exhaustively maps domain results/errors to contracts; neither package imports the other.

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

The Today response is the authoritative source of `state`, `attendanceRevision`, and `validActions`. Every attendance `POST` requires the `Idempotency-Key` header and the latest `expectedAttendanceRevision`; `CLOCK_OUT` also accepts the narrowly scoped `confirmActiveBreak` flag. Ordinary commands never accept a client occurrence timestamp. Exact processing, retry, and replay behavior is defined in `docs/03-domain-rules.md` section 9 and `docs/13-api-error-conventions.md`.

## 5. Application services

Application services coordinate:

1. authenticate actor and validate request security,
2. authorize resource/action,
3. claim retry protection where required,
4. lock/load current state and validate expected revision,
5. invoke the domain rule,
6. persist domain, revision, idempotency, and audit effects in one transaction,
7. return the serialized operation snapshot and relevant version.

They should not depend on React or UI language.

## 6. Authentication

- Better Auth handles invite-only credentials, password reset, verification where enabled, PostgreSQL-backed sessions, and secure cookies under ADR `0008` and `docs/06-security-operations.md` sections 6–8.
- Stateless sessions, secondary session storage, and Better Auth cookie/session caching are excluded from the MVP so revocation is authoritative on the next request.
- Production is same-origin. Better Auth CSRF/origin/redirect checks stay enabled, and WorkLedger domain mutations additionally require the accepted session-bound CSRF contract.
- WorkLedger stores employee identity, team, manager, and application roles separately.
- A user account may link to one employee record in the MVP.
- Password reset, deactivation/unlink, and privileged-role changes revoke all sessions without deleting domain history.
- Session/profile responses expose only safe opaque session IDs and minimum client context, never session/reset/CSRF tokens or authoritative domain permissions.

## 7. Database design principles

- PostgreSQL is the source of truth.
- Use generated, committed SQL migrations.
- Never use schema push as the production migration process.
- Use database constraints for invariant support where practical.
- Use transactions for multi-record domain changes.
- Use a unique organization/actor/key claim for idempotency and transaction locking plus attendance revision checks for active-state protection.
- Use optimistic version or equivalent concurrency control for records edited by multiple actors.
- Index common organization, employee, date, status, manager, and period queries.
- Use soft deactivation or status fields for employees; do not cascade-delete audit history.

## 8. High-level data areas

- authentication users and sessions,
- organizations and settings,
- employees and employment periods,
- teams plus effective-dated team and manager assignments; delegation only after a later ADR,
- schedules, policies, and assignments,
- holiday calendars and dates,
- immutable punch events, correction requests, decisions, and applied interpretations,
- daily-record projections with identified source/rule versions,
- time-account entries,
- absence types, requests, decisions, and leave-entitlement entries,
- monthly periods and immutable approved snapshots,
- notifications,
- attachments only after a later ADR; not in the MVP model,
- idempotency records,
- audit events.

`WL-300` produced the initial schema after the Phase 2 domain interfaces stabilized. Later Phase 3
tasks extend it only through generated/committed migrations while preserving the accepted
organization and immutable-history constraints.

## 9. Calculation persistence strategy

Recommended:

- Preserve raw immutable events.
- Calculate deterministic daily results through the domain engine.
- Persist daily projections/snapshots for reporting and locking when needed.
- Version calculation-policy inputs.
- Store the approved period snapshot and hash/version metadata.
- Rebuild projections through an explicit process, never silently during arbitrary reads.
- Preserve the `PROVISIONAL`, `INCOMPLETE`, and `COMPLETE` calculation-status distinction and the identified calculation source fingerprint.
- Post only `COMPLETE` past dates: one idempotent base `DAILY_DELTA`, then append-only `DAILY_RECALCULATION_DELTA` differences for later unlocked source changes.
- Keep posted ledger balance, projected balance, and incomplete-date blockers distinct. This is the
  accepted `D-105` lifecycle; `D-202`, resolved by `WL-300`, stores one explicit-rebuild,
  source-fingerprinted employee/date projection while raw facts, ledgers, and approved snapshots
  remain authoritative.

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

Arrows mean “may import.” These are the only WorkLedger runtime edges:

```text
packages/domain       ──> no WorkLedger package
packages/contracts    ──> no WorkLedger package
packages/database     ──> packages/domain
packages/ui           ──> no WorkLedger package
packages/config       ──> no WorkLedger package (tooling only)
packages/test-utils   ──> packages/domain, packages/contracts (tests only)

apps/web              ──> packages/ui, packages/contracts
apps/api              ──> packages/domain, packages/contracts, packages/database
apps/site             ──> packages/ui (Phase 11 only)
```

Development-only edges from the seven consuming apps/packages to `packages/config` are allowed and now explicit. Test files outside `packages/domain` may use `packages/test-utils`; production source may not. External dependencies are declared by the workspace project that imports them.

Boundary and publication rules:

- No app/package imports an app. Shared behavior moves to a package only after a second real consumer proves the need.
- Cross-workspace imports use `@workledger/*` package names and declared `workspace:*` dependencies. Relative traversal into another project or an undeclared TypeScript path alias is prohibited.
- Import only explicit package export subpaths. Imports from another project's `src`, tests, migrations, generated internals, or build directory are prohibited.
- Root, apps, and packages are `"private": true` for the MVP. There is no npm publish workflow or registry credential.
- Use one committed root lockfile and fail installation/CI on workspace cycles. Do not suppress cycle warnings.
- `packages/domain` remains runtime-neutral apart from the accepted Temporal support; it has no React, Fastify, database, environment, filesystem, or network dependency.
- `packages/contracts` has no React, router, Fastify instance, database, domain, environment, or Node-only dependency. It contains transport schemas/codes, not application services or database entities.
- `packages/database` may map to domain types but exposes neither Drizzle rows/query objects nor unrestricted database clients to API handlers.
- `packages/ui` contains product-neutral accessible presentation/interaction primitives and does not import contracts, domain, database, auth, or feature code.
- `packages/config` and `packages/test-utils` cannot become back doors around production dependency direction.

`WL-100` established the workspace, `WL-101` encoded the project/manifest/export graph, and `WL-102` now enforces matching TypeScript project references plus repository-owned negative fixtures for forbidden/deep/app/test/config/browser-server imports. ESLint owns JavaScript/tooling diagnostics; the strict compiler and module lexer cover TypeScript. Do not add a boundary plugin unless the built-in configuration/check cannot express the matrix clearly.

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
- adding a new production app/package or moving an ownership boundary,
- allowing a new dependency edge or package cycle,
- publishing any workspace package or introducing registry/release automation,
- importing authoritative domain behavior into the browser or transport/database behavior into the domain.
