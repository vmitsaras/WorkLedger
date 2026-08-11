# Contributing to WorkLedger

Thank you for considering a contribution. WorkLedger is beginning its first authenticated employee
attendance vertical slice; it is not a supported time-recording application or a production-ready
deployment. Proposals should match the active roadmap task and the accepted product, domain,
accessibility, security, and architecture contracts.

Review and merge are not guaranteed. A small, evidence-backed change that completes one accepted
outcome is easier to assess than a broad feature or refactor.

## Before starting

1. Read [PROJECT_STATUS.md](PROJECT_STATUS.md) for the active task and blockers.
2. Check [TODO.md](TODO.md) and [docs/08-task-board.md](docs/08-task-board.md) for dependencies and
   acceptance evidence.
3. Read [AGENTS.md](AGENTS.md) and the relevant accepted documents or ADRs.
4. Search existing issues and pull requests before proposing duplicate work.
5. For a substantial or roadmap-changing proposal, open an issue before implementation. Do not
   start a later phase while its gate is incomplete without an explicit accepted override.

Security reports are the exception: never put vulnerability details in a public issue, discussion,
or pull request. Use [SECURITY.md](SECURITY.md).

## Local setup

WorkLedger executes Node `24.18.x` and pnpm `11.20.0` exactly. The managed bootstrap below selects
the accepted pair even when the host shell starts with another version; the install guard rejects
mismatched project commands.

```sh
git clone https://github.com/vmitsaras/WorkLedger.git
cd WorkLedger
pnpm with 11.20.0 install --frozen-lockfile
pnpm with 11.20.0 exec playwright install chromium
pnpm with 11.20.0 run verify
```

Docker is needed only for the local PostgreSQL lifecycle path:

```sh
pnpm with 11.20.0 run db:up
pnpm with 11.20.0 run db:seed:development
pnpm with 11.20.0 run db:verify
pnpm with 11.20.0 run db:down
```

The default database credentials are development-only and the service binds to loopback. It has no
product schema or seed data. `pnpm run db:reset` deletes the local PostgreSQL volume.

## Choose a bounded change

- Work on one roadmap task, issue, or explicitly bounded vertical slice.
- Do not add MVP non-goals, speculative feature folders, unsupported dependencies, or a later-phase
  project because it seems convenient.
- Preserve existing user changes in the working tree and keep unrelated refactors out of scope.
- Record contradictions in [docs/10-open-decisions.md](docs/10-open-decisions.md) instead of
  silently choosing a new product rule.
- Do not change an accepted architecture or domain decision only to simplify implementation. Use an
  ADR when the documented review triggers require one.

For attendance, absence, balances, corrections, or period logic, read
[docs/03-domain-rules.md](docs/03-domain-rules.md). For UI work, read
[docs/05-ux-accessibility.md](docs/05-ux-accessibility.md). For authentication, authorization,
exports, uploads, logs, or deployment, read
[docs/06-security-operations.md](docs/06-security-operations.md).

## Preserve workspace boundaries

[docs/04-architecture.md](docs/04-architecture.md#11-dependency-rule) and
[ADR 0011](docs/adr/0011-pnpm-monorepo-and-internal-package-boundaries.md) are authoritative.

- Import another workspace only through its declared `@workledger/*` public export and a
  `workspace:*` dependency.
- Do not deep-import or traverse into another workspace's source, tests, migrations, generated
  files, or build output.
- Applications are composition roots and cannot be imported.
- Browser production code cannot import domain, database, API/server, environment, or Node-only
  code.
- `packages/config` is tooling-only and `packages/test-utils` is test-only.
- Do not add a runtime edge, project, package publication path, global client store, or new
  production dependency without the evidence and ADR required by the repository contract.

The root workspace and source-boundary checks enforce these rules and include representative
negative fixtures.

## Implementation expectations

- Keep domain logic out of React components, HTTP route handlers, and repositories.
- Enforce authentication and authorization at the API boundary, not only in the UI.
- Preserve immutable attendance events, append-only ledger/audit history, effective dates, and
  locked-period rules.
- Use Temporal semantics for domain time calculations and integer minutes for durations/balances.
- Prefer semantic HTML and keyboard-complete interactions; WCAG 2.2 AA is the baseline.
- Validate requests, serialize responses, minimize sensitive data, and keep secrets and personal
  payloads out of logs, URLs, browser persistence, and examples.
- Add packages only after checking current stable compatibility and documenting why existing or
  native capabilities are insufficient.

## Tests and documentation

Run focused checks while developing and the applicable root checks before requesting review. The
intended full local gate is shown in compact form below; use the `pnpm with 11.20.0 run ...` prefix
when pnpm `11.20.0` is not already active.

```sh
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:integration
pnpm run test:e2e
pnpm run build
```

`pnpm run verify` runs that chain after runtime-configuration validation. A passing check covers
only implemented repository layers; do not present it as evidence for an unimplemented workflow.

Update tests proportionally to the risk and include relevant accessibility, permission, timezone,
concurrency, migration, or error-state cases. Update `PROJECT_STATUS.md`, `TODO.md`,
`docs/08-task-board.md`, and affected technical documentation only when the work has matching
evidence. Phase-gate completion has a separate version rule in [AGENTS.md](AGENTS.md); an internal
version bump does not authorize a release or deployment.

## Pull request checklist

In the pull request, state:

- the task or issue and the bounded outcome;
- files and layers changed;
- domain/security/data risks and transaction or permission effects;
- accessibility implications;
- exact commands run and whether any test skipped;
- documentation and project-memory updates;
- remaining risks or the exact next task.

Do not commit generated output that is intentionally ignored. Do commit required lockfile changes
and, once schema work begins, generated SQL migrations. Never include secrets, production data,
employee information, access tokens, private vulnerability details, or unredacted diagnostic
artifacts.

## License

By submitting a contribution, you agree that your WorkLedger-owned contribution is licensed under
the repository's [MIT License](LICENSE). Third-party code, assets, and notices must remain compatible
and be identified accurately.
