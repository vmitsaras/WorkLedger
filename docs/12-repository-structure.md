# Intended Repository Structure

This is the target shape after Phase 1. Do not create all feature folders before their phase.

```text
workledger/
├── AGENTS.md
├── README.md
├── PROJECT_STATUS.md
├── TODO.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.*
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

- `packages/domain` may not import another WorkLedger app/package except a tiny shared runtime-neutral type package if later justified.
- `packages/contracts` must not import React, Fastify route instances, or database schema.
- `packages/database` may map to domain types but must not expose Drizzle query objects to API handlers.
- `packages/ui` is presentation only.
- `apps/web` cannot import `packages/database` or server-only auth modules.
- `apps/api` cannot import `packages/ui`.

## Test placement

- Pure domain tests live beside or under `packages/domain/tests`.
- Database integration tests live in `packages/database/tests` or API integration tests.
- Component behavior tests live near components.
- Playwright tests live under `e2e/` and cover critical workflows rather than every field combination.
