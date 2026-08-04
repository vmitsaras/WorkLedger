# WorkLedger Codex Planning Pack

This package is the operating contract for building **WorkLedger**, a self-hosted working-time, flexible-time, absence, approval, and monthly-record application.

It contains planning and governance files only. It intentionally does not contain application code.

## How to use this package

Copy the following into the root of the WorkLedger repository:

- `AGENTS.md`
- `CODEX_MASTER_PROMPT.md`
- `PROJECT_STATUS.md`
- `TODO.md`
- `docs/`

Then open the repository in Codex and begin with `CODEX_MASTER_PROMPT.md`.

## Required order

1. Validate and complete Phase 0 documentation.
2. Resolve blocking items in `docs/10-open-decisions.md`.
3. Confirm the Phase 0 exit gate in `docs/07-roadmap.md`.
4. Scaffold the repository in Phase 1.
5. Build the framework-independent domain engine before the dashboard.
6. Deliver later phases as vertical slices with tests and documentation.

Codex must not skip directly to attractive dashboard screens. WorkLedger is only credible when its time calculations, permissions, audit trail, and correction workflows are reliable.

## Main control files

| File | Purpose |
|---|---|
| `AGENTS.md` | Repository-wide rules and architecture contract |
| `CODEX_MASTER_PROMPT.md` | Initial prompt to run in Codex Plan mode |
| `PROJECT_STATUS.md` | Current phase, active task, verified work, and blockers |
| `TODO.md` | Compact ordered checklist |
| `docs/07-roadmap.md` | Full phased roadmap and exit gates |
| `docs/08-task-board.md` | Detailed backlog with task IDs and dependencies |
| `docs/09-definition-of-done.md` | Completion criteria for every task and milestone |
| `docs/17-planning-audit.md` | Ratification evidence, contradictions, and missing-item ownership |

## Default implementation principle

Complete one bounded task at a time. Preserve domain history. Test calculations before presenting them. Enforce permissions on the server. Treat accessibility and self-hosting as product requirements rather than final polish.
