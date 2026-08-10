# WorkLedger

WorkLedger is a planned self-hosted application for working time, flexible-time balances, absence requests, approvals, corrections, and auditable monthly records in small and medium-sized office, remote, and hybrid organizations.

> **Project readiness: Stage 2 of 5 — Foundation in progress**<br>
> **Current phase progress: 7 of 9 tasks complete**

Phase 0 has passed and this public repository is in **Phase 1: repository foundation**. The workspace, project boundaries, strict tooling, test and CI baseline, local PostgreSQL environment, runtime configuration, and React Aria UI foundation are implemented. A development-only foundation preview is runnable, but WorkLedger does not yet provide product workflows, a domain engine, an application database schema, authentication, or a supported release. `WL-107` is the active public documentation task.

## Current status

- Follow [PROJECT_STATUS.md](PROJECT_STATUS.md) for the active task and verified decisions.
- Follow [TODO.md](TODO.md) and [docs/08-task-board.md](docs/08-task-board.md) for dependency-ordered work.
- Read “Stage 2 of 5” as the current readiness stage, not as two completed stages or a release-readiness claim. The stage definitions live in [docs/07-roadmap.md](docs/07-roadmap.md#user-facing-readiness-scale).
- Treat [AGENTS.md](AGENTS.md), accepted ADRs, and the planning documents as the implementation contract.
- Continue Phase 1 only through the active bounded task in `PROJECT_STATUS.md`; passing the gate does not authorize skipping directly to application or feature scaffolding.
- Root format, lint, typecheck, unit, component, integration, browser, and build checks exercise the applicable repository layers and enforce the accepted package graph. Application-level claims begin only after their owning tasks create and test those layers.

## Delivery order

1. Validate and complete Phase 0 documentation.
2. Resolve Phase 1-entry decisions and assign explicit owners to later blockers in `docs/10-open-decisions.md`.
3. Confirm the Phase 0 exit gate in `docs/07-roadmap.md`.
4. Scaffold the repository in Phase 1.
5. Build the framework-independent domain engine before the dashboard.
6. Deliver later phases as vertical slices with tests and documentation.

Codex must not skip directly to attractive dashboard screens. WorkLedger is only credible when its time calculations, permissions, audit trail, and correction workflows are reliable.

## Planning map

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
| `docs/18-architecture-ratification.md` | Accepted ADR, publication, package, and dependency-boundary evidence |
| `docs/19-phase-0-gate-review.md` | Passed Phase 0 criteria, quantitative evidence, remaining owners, and Phase 1 handoff |
| `docs/20-workspace-foundation.md` | Pinned toolchain, root workspace contract, verification evidence, and WL-101 handoff |
| `docs/21-workspace-shells.md` | WL-101 project shells, exact dependency graph, typed build evidence, and WL-102 handoff |
| `docs/22-strict-tooling-and-boundaries.md` | WL-102 strict configuration, source-boundary fixtures, compatibility decisions, and WL-103 handoff |

## Default implementation principle

Complete one bounded task at a time. Preserve domain history. Test calculations before presenting them. Enforce permissions on the server. Treat accessibility and self-hosting as product requirements rather than final polish.

## License

WorkLedger-owned source and documentation are licensed under the [MIT License](LICENSE). Third-party dependencies and copied source/assets retain their own license and notice requirements.
