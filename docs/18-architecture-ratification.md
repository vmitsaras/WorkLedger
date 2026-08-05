# WL-011 Architecture Ratification

**Review date:** 2026-08-04

**Task:** `WL-011`

**Outcome:** Accepted for the Phase 0 gate. `WL-012` subsequently passed that gate in `docs/19-phase-0-gate-review.md`.

## 1. Scope and evidence

Reviewed:

- root repository controls, remote metadata, `README.md`, and `LICENSE`;
- architecture, repository structure, technology baseline, security/operations, definition of done, review checklists, roadmap, task board, and open decisions;
- ADRs `0001` through `0010` against the completed domain, accessibility, security, privacy, and operations contracts;
- current primary documentation for pnpm workspaces/settings, npm private packages, Node.js LTS, React Router Data Mode, Fastify support, the MIT license, and previously accepted Better Auth/Caddy controls.

Repository evidence:

- `git remote -v` identifies `https://github.com/vmitsaras/WorkLedger.git`.
- Read-only GitHub metadata reports `vmitsaras/WorkLedger`, visibility `PUBLIC`, and detected license `MIT`.
- The repository contains planning/governance documents only; there is no package manifest, lockfile, application source, migration, image, or release workflow to ratify as implementation evidence.

## 2. Ratified repository decisions

| Decision | Accepted result | Implementation owner |
|---|---|---|
| D-001 | Public `vmitsaras/WorkLedger` repository; public visibility grants no release/push/package/deployment authority | `WL-107` replaces the planning README and records contributor/security-reporting workflows |
| D-002 | Existing root MIT license retained; package metadata uses SPDX `MIT`; third-party notices remain separate | `WL-100`, `WL-107`, release reviews |
| D-004 | Root, apps, and packages are private/internal; `@workledger/*` plus `workspace:*`; no npm release tooling | `WL-100`–`WL-102` |
| Workspace | pnpm, one root lockfile, no Turborepo, cycles fail | `WL-100` |
| Boundaries | Explicit package exports and the dependency matrix in `docs/04-architecture.md` section 11 | `WL-101`, `WL-102` |
| Runtime | Supported Node.js LTS line at or above the Node 22 baseline; exact compatible versions pinned during scaffold | `WL-100`–`WL-103` |

## 3. ADR review

| ADR | Result | Ratification note |
|---|---|---|
| 0001 — React web / Fastify API | Accepted | Separate services remain same-origin behind the trusted proxy; API and database stay private |
| 0002 — React Aria foundation | Accepted | Compatible with the completed WCAG/state/route contracts; copied source remains WorkLedger-maintained |
| 0003 — PostgreSQL / Drizzle | Accepted | Supports transactions, immutable history, ledgers, snapshots, scoped queries, and generated migrations |
| 0004 — Immutable punches | Accepted | Required by attendance correction, audit, and restore integrity rules |
| 0005 — Ledger balances | Accepted | Matches the exact posting, entitlement, cancellation, and post-lock contracts |
| 0006 — Temporal model | Accepted | Required for instant/local-date/timezone/DST semantics; polyfill/browser support remains implementation evidence |
| 0007 — Router / Query ownership | Accepted | URL privacy and one remote-state cache align with WL-009/WL-010; router gates are not server authorization |
| 0008 — Better Auth sessions | Accepted with mandatory Phase 3 proof | Accepted security profile is stricter than library defaults and cannot be weakened by a spike result |
| 0009 — Single organization | Accepted for MVP | Organization identifiers remain defense-in-depth; multi-organization remains an ADR-triggered non-goal |
| 0010 — Monthly snapshots / locking | Accepted | Preserves immutable approved evidence and source-linked post-lock adjustments |
| 0011 — pnpm boundaries | Accepted, new | Makes internal publication and allowed import direction enforceable |

No accepted ADR contradicts the current domain, permission, accessibility, security, privacy, or self-hosting contracts.

## 4. Canonical dependency graph

Arrows mean “may import”:

```text
domain      ──> no WorkLedger package
contracts   ──> no WorkLedger package
database    ──> domain
ui          ──> no WorkLedger package
config      ──> no WorkLedger package (tooling only)
test-utils  ──> domain, contracts (test-only)

web         ──> ui, contracts
api         ──> domain, contracts, database
site        ──> ui (Phase 11 only)
```

`docs/04-architecture.md` section 11 is canonical if this summary ever diverges. API application services map between independent domain, persistence, and wire shapes. The browser receives purpose-specific DTOs and does not import/recalculate authoritative domain behavior.

## 5. Enforcement contract

Phase 1 evidence must include:

1. a private root workspace and private app/package manifests;
2. one committed lockfile, `workspace:*` internal edges, and cycle rejection;
3. explicit package exports with no sibling-source/deep imports;
4. TypeScript projects that build packages in dependency order without hidden path-alias edges;
5. lint or a repository-owned static boundary check matching the exact matrix;
6. negative fixtures proving web→database/domain, API→UI/web, domain→workspace, contracts→domain/database/framework, production→test-utils/config, app→app, and deep imports fail;
7. a clean install/typecheck/test/build using only declared dependencies.

Directory shape alone is not acceptance evidence.

## 6. Cross-contract review

| Concern | Boundary result |
|---|---|
| Domain invariants | Deterministic rules stay in `packages/domain`; app/database/UI layers cannot redefine them |
| Authorization/security | `apps/api` owns authenticated orchestration and current authorization; web/router state is never authoritative |
| Privacy | Contracts are purpose-specific wire shapes; database rows/domain entities are not returned directly; browser cannot import server/database modules |
| Accessibility | `packages/ui` owns product-neutral React Aria primitives; complete feature semantics/states remain in `apps/web` |
| Transactions/history | API services select the boundary; database adapters implement atomic persistence; domain stays I/O-free |
| Time | Temporal support is domain/runtime-neutral; UI date controls map through explicit adapters |
| Testing | Domain-specific factories remain local; reusable test helpers cannot become a production or cyclic dependency |
| Operations | Deployment/proxy/backup code remains outside domain/contracts/UI and follows the security/operations contract |

## 7. Remaining decisions and risks

- D-200 through D-204 remain deliberately owned by the Phase 3 contract/schema spike; they do not block Phase 1 entry.
- D-502 remains a production-browser baseline decision and must be resolved with executable browser/Temporal/accessibility evidence.
- `WL-100` subsequently pinned Node `24.18.0` LTS and pnpm `11.20.0` stable after official compatibility checks; `.node-version`, root/workspace metadata, and the generated lockfile are now the executable authority. Later compatibility gates must revalidate them rather than relying on this dated evidence.
- `WL-102` subsequently installed TypeScript-reference, manifest, source-scan, and negative-fixture enforcement for ADR `0011`. CI execution and future-project rule maintenance remain necessary; documentation alone is still insufficient.
- A separate API increases deployment and mapping work; the accepted same-origin proxy and explicit DTO mapping are deliberate costs.
- A public repository increases secret/supply-chain/disclosure exposure. Safe examples, private package flags, review checks, and a verified security-reporting workflow are required before the foundation gate.

## 8. Primary references checked

- pnpm workspaces and settings: <https://pnpm.io/workspaces>, <https://pnpm.io/settings>.
- npm `private` package behavior: <https://docs.npmjs.com/cli/v11/configuring-npm/package-json#private>.
- Node.js supported release policy: <https://nodejs.org/en/about/previous-releases>.
- React Router Data Mode: <https://reactrouter.com/start/data/installation>.
- Fastify LTS policy: <https://fastify.dev/docs/latest/Reference/LTS/>.
- Open Source Initiative MIT text: <https://opensource.org/license/mit>.

## 9. Gate handoff

`WL-011` accepted the architecture and dependency directions. `WL-012` subsequently verified every Phase 0 gate item, accepted the 85-case catalog, confirmed later decision owners/deadlines, and selected `WL-100` as the first scaffold task.
