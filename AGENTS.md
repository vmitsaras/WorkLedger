# AGENTS.md — WorkLedger Repository Contract

## 1. Project mission

WorkLedger is a self-hosted application for small and medium-sized office, remote, and hybrid organizations. It records working time, calculates flexible-time balances, manages absence requests, supports manager approvals and corrections, and produces auditable monthly records.

The product must be useful, realistic, accessible, secure, maintainable, and portfolio-ready. It must look and behave like a credible operational product, not a tutorial dashboard.

## 2. Instruction priority

When instructions conflict, use this order:

1. The user's explicit request for the current task.
2. This root `AGENTS.md`.
3. Relevant files under `docs/` and accepted ADRs.
4. The active task in `PROJECT_STATUS.md` and `TODO.md`.
5. Existing implementation conventions when they do not conflict with the above.

Do not silently resolve contradictions. Record them in `docs/10-open-decisions.md` and state the assumption used.

## 3. Product boundary

### Build in the MVP

- One organization per self-hosted installation.
- Employee, manager, HR administrator, and system administrator roles.
- Effective-dated weekly work schedules and time policies.
- Clock in, break, resume, and clock out.
- Multiple work sessions per day.
- Expected, worked, credited, and balance minutes.
- Positive and negative flexible-time balances.
- Vacation, sickness, unpaid leave, and configurable other absence.
- Correction requests with approval and preserved history.
- Manager approval queue and team availability.
- Monthly review, submission, approval, locking, and post-lock adjustment.
- Public holidays, reports, CSV export, audit history, and Docker self-hosting.

### Do not build in the initial release

- Payroll calculation.
- Project billing.
- Recruitment, performance reviews, or expenses.
- Screenshot, keystroke, application, or productivity monitoring.
- Mandatory geolocation or biometrics.
- Complex rotating shift planning.
- Native mobile applications.
- Multi-tenant SaaS billing.
- Arbitrary workflow builders.
- AI-generated approval or HR decisions.

Do not add a non-goal because it seems easy. Scope creep is still scope creep when wrapped in a tiny pull request.

## 4. Selected technical architecture

Use currently supported stable releases. Do not install beta, release-candidate, canary, or experimental packages without an accepted ADR.

### Repository

- `pnpm` workspaces.
- Monorepo without Turborepo initially.
- Strict TypeScript and ESM.
- Node.js 22 or newer supported LTS baseline.

### Applications

- `apps/web`: React, TypeScript, Vite, React Router Data Mode.
- `apps/api`: Node.js, TypeScript, Fastify.
- `apps/site`: Astro public project site and documentation, added only in the portfolio phase.

### Packages

- `packages/domain`: framework-independent business rules and calculation engine.
- `packages/contracts`: shared request, response, error, and validation contracts.
- `packages/database`: Drizzle schema, migrations, repositories, and database utilities.
- `packages/ui`: local WorkLedger React component system.
- `packages/config`: shared TypeScript, lint, test, and formatting configuration.
- `packages/test-utils`: fixtures, factories, accessibility helpers, and API test utilities.

### Frontend foundation

- React Aria Components as the interaction and accessibility primitive layer.
- shadcn/ui React Aria source components as a starting point, initialized explicitly with the React Aria base.
- Tailwind CSS and CSS custom properties for visual tokens.
- Class Variance Authority for bounded component variants where it improves clarity.
- React Router Data Mode for routes, route boundaries, permission gates, URL state, and query prefetching.
- TanStack Query owns server-state caching and mutations.
- React Hook Form plus Zod for complex forms.
- `@internationalized/date` at React Aria date-control boundaries.
- Lucide React for icons, always paired with accessible text or names when meaningful.

### Backend foundation

- Fastify with schema validation and response serialization.
- PostgreSQL as the only production source of truth.
- Drizzle ORM with the `pg`/node-postgres driver and generated SQL migrations.
- Better Auth for credential authentication and secure cookie-based sessions.
- Application roles and employee authorization remain WorkLedger domain data; do not outsource domain permissions to the authentication library.
- OpenAPI generated from API contracts when the scaffold supports it reliably.

### Date and time foundation

- Use Temporal semantics for domain time calculations.
- Use a maintained Temporal polyfill where runtime support is incomplete.
- Do not use JavaScript `Date` arithmetic for expected time, elapsed time, local dates, timezone conversion, overnight work, or daylight-saving logic.
- Store real event instants and explicit IANA timezone identifiers.
- Store date-only business values as date-only values.
- Store durations and balances as integer minutes, never floating-point hours.

## 5. State ownership rules

- PostgreSQL is authoritative for attendance, balances, requests, approvals, policies, and audit history.
- TanStack Query owns remote server state in the web application.
- React Router search parameters own shareable filters, date ranges, pagination, and sort state.
- React Hook Form owns complex form state.
- Local React state owns transient UI state only.
- Do not add Zustand, Redux, or another global store without a demonstrated cross-route client-state problem and an accepted ADR.
- Do not keep a second source of truth in local storage. Local storage may hold non-sensitive display preferences only.

## 6. Domain rules that must not be violated

- An employee cannot have more than one active attendance state.
- Raw punch events are immutable after creation.
- Corrections preserve original values and create approved versions or adjustments.
- Work intervals and breaks cannot overlap illegally.
- A break must be associated with working attendance.
- Every balance change must have an explainable ledger entry.
- Work schedules and policies are effective-dated; changing a current policy must not rewrite approved history.
- Locked monthly periods cannot be edited through ordinary flows.
- Post-lock corrections create adjustments and audit events.
- An employee cannot approve their own request.
- A manager may only access employees whose current effective direct-manager assignment names them; approval delegation grants no access in the MVP.
- Sickness details are minimized; ordinary team views show availability, not medical information.
- Every decision records actor, timestamp, status, and reason where required.
- Clock mutations must be idempotent and safe across retries, double-clicks, tabs, and devices.

Read `docs/03-domain-rules.md` before changing attendance, absence, balances, corrections, or period logic.

## 7. Accessibility contract

WCAG 2.2 AA is the baseline.

- Prefer semantic HTML before ARIA.
- Use real links for navigation and real buttons for actions.
- Do not style a React Aria Button as a link by rendering an anchor through it; use an actual anchor or router link with button styling.
- All workflows must be keyboard complete.
- Focus order must follow the visual and logical order.
- Route changes, dialogs, validation failures, and meaningful async results require deliberate focus and announcement behavior.
- Forms require visible labels, descriptions where necessary, field errors, and an error summary for complex submissions.
- Never communicate working, pending, approved, rejected, locked, warning, or balance state through color alone.
- Calendar information must have a list or table alternative.
- Data tables require correct captions, headers, sorting semantics, and usable narrow-screen behavior.
- Live regions announce meaningful state changes only; never announce a running timer every second.
- Motion must be fast, purposeful, and disabled or simplified under `prefers-reduced-motion`.
- Verify forced-colors mode, zoom/reflow, touch targets, and visible focus.

Read `docs/05-ux-accessibility.md` before building or changing UI.

## 8. Security and privacy contract

- Enforce authentication and authorization on the API, not only in the UI.
- Use secure, HTTP-only, same-site session cookies and CSRF protection appropriate to the architecture.
- Validate every request and serialize every response.
- Do not log passwords, tokens, complete form payloads, sickness details, or attachment contents.
- Scope exports and attachments through the same authorization rules as normal records.
- Neutralize spreadsheet formula injection in CSV exports.
- Use transactions for clock actions, approvals, ledger updates, cancellation, and period locking.
- Record security-relevant and domain-relevant audit events without turning observability into employee surveillance.
- Include backup, restore, migration, and secret-management documentation as part of the product.

Read `docs/06-security-operations.md` before changing authentication, authorization, exports, uploads, logs, or deployment.

## 9. UI and product-quality contract

- The employee experience is calm and spacious; the manager and admin experience may be denser.
- The Today screen prioritizes current status, the primary clock action, today’s calculation, unresolved problems, and the next absence.
- Show calculation breakdowns so users can understand every balance.
- Use realistic seed data and meaningful microcopy.
- Include empty, loading, partial, stale, success, warning, offline, permission-denied, and error states where relevant.
- Do not use a generic admin template.
- Do not gamify overtime or celebrate excessive working hours.
- Do not add charts when a number, comparison, table, or explanation is clearer.
- Use motion for orientation and feedback, never as a delay or comprehension requirement.

## 10. Coding rules

- Work on one roadmap task or one explicitly bounded vertical slice at a time.
- Inspect existing code, relevant docs, tests, and status before editing.
- Keep domain logic out of React components, route handlers, and database repositories.
- Keep database queries out of React and domain packages.
- Keep feature components focused; avoid giant route files.
- Prefer named exports for shared modules.
- Avoid `any`, unsafe casts, non-null assertions, and ignored TypeScript errors.
- Avoid magic strings and magic numbers; use domain types and constants.
- Do not add abstractions until at least two real call sites justify them.
- Do not refactor unrelated code while completing a task.
- Do not add a package without recording why it is needed and why native or existing tools are insufficient.
- Do not alter an accepted domain rule merely to simplify implementation.
- Do not silently swallow errors.
- Do not mark TODOs complete without evidence.

## 11. Required workflow for every Codex task

### Step 1 — Orient

Read:

1. `PROJECT_STATUS.md`.
2. The active entry in `TODO.md` and `docs/08-task-board.md`.
3. Relevant product, domain, architecture, UX, security, and ADR files.
4. Existing implementation and tests in the affected area.

### Step 2 — Plan

State:

- Scope.
- Files expected to change.
- Domain and security risks.
- Accessibility implications.
- Tests to add or update.
- Documentation to update.

Do not begin with broad repository rewrites.

### Step 3 — Implement the smallest complete slice

A complete slice includes the necessary domain rule, API/data behavior, UI behavior when applicable, tests, and documentation. Avoid half-building five layers.

### Step 4 — Verify

Run the relevant available commands. The intended full quality gate is:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

Run narrower tests during development, then the applicable full checks before completion. Do not claim a command passed unless it was actually run.

### Step 5 — Review

Check:

- Domain invariants.
- Permission scope.
- Transaction boundaries.
- Accessibility behavior.
- Loading and error states.
- Timezone and concurrency edge cases.
- Migration and backward-compatibility impact.

### Step 6 — Update project memory

Update:

- `PROJECT_STATUS.md`.
- `TODO.md`.
- `docs/08-task-board.md`.
- Relevant ADR, README, API, domain, accessibility, or operations documentation.

### Step 7 — Report

Use this completion format:

```md
## Completed

## Changed

## Verification

## Accessibility

## Security / Data

## Documentation

## Remaining risks or next task
```

## 12. Phase gates

Do not begin a later phase while its prerequisite gate is incomplete unless the user explicitly overrides the roadmap.

The first implementation milestone is not the dashboard. It is the tested domain engine for schedules, attendance events, work sessions, expected minutes, credited minutes, and daily balance.

## 13. Git behavior

- Do not commit, push, create branches, or open pull requests unless explicitly requested.
- Keep changes reviewable and scoped to the active task.
- Never hide generated migrations or lockfile changes.
- Do not rewrite history.
