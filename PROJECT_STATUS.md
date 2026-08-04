# WorkLedger Project Status

**Current phase:** Phase 0 — Product and domain contract  
**Current milestone:** Planning pack validation  
**Active task:** `WL-001`  
**Status:** Not started  
**Last verified:** Not yet verified in repository

## Current objective

Validate the complete planning contract before scaffolding application code.

## Verified decisions

- Product name: WorkLedger.
- One organization per self-hosted installation for the initial release.
- React web application with a separate Fastify API.
- PostgreSQL source of truth.
- React Aria plus shadcn React Aria source components and Tailwind.
- TanStack Query for server state.
- Framework-independent domain engine before UI feature development.
- WCAG 2.2 AA baseline.
- Immutable punch events, ledger-based balances, effective-dated policies, and monthly locking.

## Work completed

- [ ] Planning files reviewed for consistency.
- [ ] Phase 0 blocking decisions resolved.
- [ ] Domain example catalog approved.
- [ ] Roadmap and task-board mapping verified.
- [ ] Phase 0 exit gate passed.

## Current blockers

See `docs/10-open-decisions.md`.

## Next task

`WL-001 — Audit and ratify the project charter and planning pack.`

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
