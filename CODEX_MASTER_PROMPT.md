# Codex Master Prompt — Start WorkLedger Correctly

Use Plan mode first.

You are working in the WorkLedger repository. Treat the root `AGENTS.md`, `PROJECT_STATUS.md`, `TODO.md`, accepted ADRs, and the files under `docs/` as the project contract.

## Objective

Prepare WorkLedger for implementation without prematurely writing application code. Validate the product, domain, architecture, accessibility, security, operations, roadmap, and task backlog. Then leave the repository in a state where Phase 1 can begin through an explicit follow-up task.

## First-run instructions

1. Read all root planning files and the documents under `docs/`.
2. Check for contradictions, missing dependencies, duplicated responsibilities, vague acceptance criteria, or rules that cannot be tested.
3. Review `docs/10-open-decisions.md` and classify every entry as:
   - blocking Phase 1,
   - blocking a later phase,
   - accepted default,
   - or intentionally deferred.
4. Verify that the roadmap begins with documentation and the domain engine rather than dashboard UI.
5. Verify that every phase has:
   - objective,
   - dependencies,
   - ordered tasks,
   - acceptance evidence,
   - and an exit gate.
6. Verify that the task board maps one-to-one to the roadmap and uses stable task IDs.
7. Verify that the architecture keeps:
   - business rules in `packages/domain`,
   - database access in `packages/database`,
   - API transport in `apps/api`,
   - and presentation in `apps/web` / `packages/ui`.
8. Verify that the time model explicitly covers:
   - local dates,
   - IANA timezones,
   - real event instants,
   - integer-minute durations,
   - overnight sessions,
   - daylight-saving changes,
   - and effective-dated schedules and policies.
9. Verify that authorization, audit history, idempotency, locking, CSV safety, backup, and restore are planned before production release.
10. Verify that WCAG 2.2 AA, keyboard operation, focus management, errors, live regions, calendar alternatives, reduced motion, zoom/reflow, and forced-colors checks are represented as acceptance criteria.

## Constraints

- Do not scaffold React, Fastify, PostgreSQL, Docker, or package files in this first run.
- Do not write feature code.
- Do not invent employment-law rules. WorkLedger policies must be configurable and documented as product rules rather than claims of legal compliance.
- Do not replace explicit project decisions merely because another library or architecture is fashionable.
- Do not add a dependency without a concrete need and an architecture decision.
- Preserve task IDs and document links.

## Allowed changes in this first run

- Improve planning documents.
- Add missing acceptance criteria.
- Correct contradictions between planning files.
- Add missing tasks or dependencies.
- Clarify open decisions.
- Update `PROJECT_STATUS.md`, `TODO.md`, and `docs/08-task-board.md`.

## Required result

Return:

1. A concise planning audit.
2. Files changed.
3. Blocking decisions still unresolved.
4. Confirmation that the Phase 0 exit gate is either passed or not passed, with evidence.
5. The exact next task ID to run.

Do not begin Phase 1 until the user explicitly asks you to execute that next task.
