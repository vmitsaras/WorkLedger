# Codex Prompt — Start WorkLedger Phase 13

Operate in Plan mode first.

Read, in order:

1. `AGENTS.md`
2. `PROJECT_STATUS.md`
3. `TODO.md`
4. `docs/07-roadmap.md`
5. `docs/08-task-board.md`
6. `docs/09-definition-of-done.md`
7. `docs/03-domain-rules.md`
8. `docs/05-ux-accessibility.md`
9. `docs/13-api-error-conventions.md`
10. `PHASE_13_HANDOFF.md`
11. `references/today-redesign-reference.png`

Then begin `WL-1300` only.

## Operating rules

- Treat domain rules, permissions, immutable history, ledgers, and server truth as authoritative.
- Treat the Today reference image as a visual hierarchy reference, not literal data or a pixel-perfect mandate.
- Do not copy contradictory sample numbers from any screenshot.
- Do not calculate authoritative attendance or balance values from formatted strings in React components.
- Do not duplicate domain calculations in presentation code.
- Do not add a new component framework, icon library, state library, date library, or animation library.
- Continue using the established React Aria/shadcn, Tailwind/design-token, React Router, TanStack Query, React Hook Form/Zod, and test foundations.
- Preserve URL-owned filters and server-side authorization.
- Preserve original punch events and audit history.
- Do not begin `WL-1308` or later until the `WL-1307` Today sub-gate passes.
- Implement one task at a time. Before marking a task done, satisfy its detailed acceptance criteria and the repository definition of done.
- Update `PROJECT_STATUS.md`, `TODO.md`, and `docs/08-task-board.md` after each completed task.
- Use deterministic clocks and seeded data for tests and screenshots.
- Ask for a product decision only when the repository and handoff genuinely leave a domain rule unresolved. Do not ask questions that source inspection can answer.

## First output

Before changing code, return:

1. The files and components that currently implement Today.
2. The API/query/view-model path that produces every visible Today value.
3. Any contradictions between visible values, tests, fixtures, and domain rules.
4. The current state and error matrix.
5. The exact files proposed for `WL-1300` and `WL-1301`.
6. Risks or blockers.
7. A narrow execution plan for `WL-1300` only.

Do not scaffold or redesign secondary routes during the first task.
