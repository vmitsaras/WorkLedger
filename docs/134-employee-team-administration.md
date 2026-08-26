# Employee and team administration hardening evidence

**Task:** `WL-1310`  
**Completed:** 2026-08-26  
**Outcome:** Employee administration now has private, scoped directory search and explicit record
actions, while team administration has a separate canonical route, clearer primary actions, and
complete responsive list/table presentations.

## Scope and authority

This task changes the employee-directory read contract, the PostgreSQL administration query, API
and client composition, employee and team route presentation, navigation, tests, current visual
evidence, OpenAPI, the exact boundary inventory, one measured bundle budget, and project memory. It
does not change a domain rule, database schema, migration, dependency, lockfile, manifest,
workspace version, publication, deployment, or tag.

The existing administration service remains authoritative for HR authorization and organization
scope. Teams remain orientation groups only. Current effective direct-manager assignments, not
team membership, continue to control manager access. Employee, employment, account, role,
attendance, schedule, policy, entitlement, team-assignment, and manager-assignment history remains
preserved by the existing effective-dated and append-only flows.

## Search privacy and authorization boundary

| Concern | Result |
|---|---|
| Searchable fields | Display name, employee number, and current linked-account email. Matching is case-insensitive and bounded to 2–320 characters. |
| Transport | Authenticated, same-origin, session-bound CSRF-protected `POST /v1/hr/employees/search` with a strict JSON body. |
| Browser ownership | Submitted identifying text and search pagination stay in TanStack Query and route-component memory. They are not placed in URL, local storage, or session storage. |
| Restorable generic state | Employment status and ordinary non-search page browsing remain URL-backed and schema-validated. |
| Scope order | The database fixes organization and status scope before matching, totals, ordering, and pagination. Current linked-email matching is constrained to an active organization account link. |
| Response | The existing minimized employee-directory DTO and private, no-store response are reused. No new account, organization, assignment, or history field enters the list. |
| Invalid access | URL search is rejected by the strict GET query contract; missing CSRF is rejected before search; API authorization remains server-owned. |

The identifying-body exception and its reasoning are recorded in `docs/10-open-decisions.md`, the
router/query contract in `docs/04-architecture.md`, and pagination/filtering conventions in
`docs/13-api-error-conventions.md`.

## Route and interaction decisions

- `/employees` is now the employee directory only. Add employee is the primary header action;
  Manage teams is a secondary route action. Each wide row and narrow article exposes an explicit
  Open record link with the employee name in its accessible name.
- `/teams` is the canonical HR team catalog. Create team is the primary header action and moves
  keyboard focus to the visibly labelled Team name field. Employee directory is the reciprocal
  secondary route action.
- Team create, activate, and deactivate operations reuse the existing contracts and mutations.
  Deactivation remains disabled while current members exist, with an adjacent accessible reason
  and recovery instruction. Existing assignment history is explicitly unchanged.
- Both routes provide a visible, polite result total; native labelled status controls; specific
  loading and empty states; and URL-backed generic status/page filters.
- The application shell exposes Employees and Teams as separate HR destinations. Coarse router
  gates and API authorization both require current HR access.

## Responsive and visual evidence

Both catalogs use complete semantic ordered lists below `48rem` and captioned comparison tables at
or above that boundary. This preserves source order and every record fact without forcing a dense
table into a narrow shell.

The opt-in comparison command is:

```text
WORKLEDGER_ASSERT_PHASE_13_ADMINISTRATION=1 pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project=chromium --grep "keeps employee, team, and technical audit administration usable"
```

| Viewport | Presentation | Full-page file | Raster size | SHA-256 |
|---|---|---|---:|---|
| Employee 1440×900 | Comparison table | `employees-1440x900-chromium-darwin.png` | 1440×900 | `94136787a0c7840c29a9f06540cab6698741cc508ef48345d06e5a136760e94e` |
| Employee 320×900 | Complete record list | `employees-320x900-chromium-darwin.png` | 320×1326 | `db47ac245c5f388002c48d013254b33056cd75ed8c2ae4350033c32464c21902` |
| Teams 1440×900 | Comparison table | `teams-1440x900-chromium-darwin.png` | 1440×1246 | `2bb691287d7864b8f2a5f41b6b8b7a4664bc28caa28b20733fcb9d696b4a83a9` |
| Teams 320×900 | Complete record list | `teams-320x900-chromium-darwin.png` | 320×1534 | `1a36b5f6441aaf617af3dd93e214a95e0a697a7a1f07662a1caa10a00ccabd92` |

The update run and a later clean comparison passed. Original-resolution inspection found no
page-level horizontal overflow, clipped primary or row action, missing record fact, color-only
state, or identifying text in the employee URL. The Phase 12 employee images remain historical;
these four files are the current bounded `WL-1310` evidence.

## Verification

- Exact `pnpm verify` passes with the pinned Node `24.18.0` and pnpm `11.20.0`: reproducible
  OpenAPI, formatting, lint, 292-source/1,530-import boundaries, CSS ownership, strict TypeScript,
  all 37 tooling tests, and all 372 unit/component tests.
- All 13 available integration tests pass. The 45 PostgreSQL-dependent cases are skipped because
  no test database URL is configured. Docker daemon inspection confirms it is not running, so the
  new search integration assertions and the existing lifecycle/assignment history cases remain
  locally unexecuted.
- The full Playwright matrix passes 38 scenarios with one opt-in capture skipped. The targeted
  `WL-1310` flow also passes once in screenshot-update mode and once in comparison mode, including
  CSRF, POST-body, URL privacy, route focus, primary-action focus, responsive semantics, no
  overflow, and axe assertions.
- The production web build and all eight public-root workspace imports pass. The bundle is 381,403
  largest JavaScript bytes, 908,586 total JavaScript bytes, 244,916 gzip JavaScript bytes, and
  50,540 CSS bytes. The total-JavaScript budget moves narrowly from 904,000 to 910,000 bytes; no
  dependency or stylesheet source was added.

## Remaining boundaries

The PostgreSQL-backed search and history cases should run when the local database service is
available; the compiled test source and unchanged history-preservation assertions remain in place.
`WL-1311` owns cross-route navigation, microcopy, heading focus, status semantics, card density,
and overflow normalization. `WL-1312` owns the broader deterministic visual, accessibility,
usability, and state gate. This task does not claim a complete assistive-technology matrix or
whole-product WCAG conformance.
