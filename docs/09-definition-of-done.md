# Definition of Done

A task is not complete because code exists. It is complete when the relevant criteria below have evidence.

## 1. Scope

- The implemented behavior matches the active task and accepted documents.
- No unrelated refactor or hidden feature was added.
- Non-goals remain outside scope.
- Any assumption is recorded.

## 2. Architecture

- Code is in the correct app/package.
- Domain logic is not embedded in React, Fastify handlers, or repositories.
- Database rows are not exposed directly to the client.
- Dependency direction is preserved.
- Cross-workspace imports use declared package names and public exports rather than sibling-source/deep paths.
- Applicable boundary and cycle checks pass; test/config packages do not leak into production source.
- No new package was added without a documented need.
- Public contracts have stable names and ownership.
- Internal-only apps/packages remain protected from accidental publication.

## 3. Domain correctness

For domain-affecting work:

- Invariants are preserved.
- Effective dates are handled.
- Integer minutes are used.
- Timezone/local-date behavior is explicit.
- Original history remains available.
- Ledger effects are explainable.
- Locked-period behavior is correct.
- Error/warning codes are structured.
- Example fixtures are added or updated.

## 4. Data and transactions

For persistence work:

- Schema change has a generated committed migration.
- Constraints and indexes are considered.
- Multi-record changes use a transaction.
- Concurrency behavior is tested or explicitly documented.
- Idempotency is applied where required.
- Rollback/error behavior leaves consistent state.
- Seed and test factories are updated when needed.

## 5. Authentication and authorization

For protected behavior:

- API checks authentication.
- API checks resource scope.
- Owner, allowed manager, unrelated employee, unrelated manager, HR, and system-administrator cases are considered.
- Self-approval is prevented.
- Deactivated/expired scope is handled.
- Sensitive fields are minimized by DTO.

## 6. Accessibility

For UI work:

- Semantic structure is correct.
- Accessible name and description are present.
- Keyboard completion works.
- Focus behavior is deliberate.
- Validation errors are associated and understandable.
- Complex forms include an error summary.
- Meaningful dynamic results are announced appropriately.
- State is not color-only.
- Reduced motion is supported.
- Narrow layout, zoom/reflow, and touch targets are checked.
- Automated axe check passes for the affected story/flow.
- React Aria behavior was preserved rather than overridden accidentally.

## 7. UX states

Relevant states exist and are tested or reviewed:

- loading,
- empty,
- success,
- validation error,
- domain conflict,
- permission denied,
- not found,
- network/dependency failure,
- retry/recovery,
- stale/concurrent state,
- disabled/read-only,
- partial data.

## 8. Security and privacy

- The data inventory/classification and trust boundary cover every new collection, storage, transfer, cache, log, export, backup, and deletion path.
- Input and output validation are present.
- Errors do not leak internals.
- Logs/audit data do not include forbidden sensitive fields.
- Exports/uploads are authorized.
- CSV values are neutralized when relevant.
- Secret/config handling is correct.
- Threat model is updated for a new surface.
- Authentication/session/CSRF/proxy/cache controls remain at or above the accepted security profile.
- Retention, user control, backup/restore, and restored-credential behavior are tested or explicitly not applicable.

## 9. Tests

- Unit tests cover decision logic.
- Integration tests cover database/API boundaries where relevant.
- Component tests cover behavior rather than implementation details.
- E2E tests cover critical user flows only.
- Regression tests reproduce fixed bugs.
- Tests use realistic times, schedules, and permission scopes.
- Time-dependent tests use an injected/fixed clock.

## 10. Verification commands

Run the applicable checks and record exact results:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
```

A task may use a narrower subset only when unaffected layers are demonstrably unchanged. Never claim unrun checks passed.

## 11. Phase-gate versioning

For a phase exit-gate task:

- Root and every workspace manifest use `0.<completed phase-gate count>.0` in the same change.
- `TODO.md` records the gate as complete only with its matching version bump; skipped gates are invalid.
- `pnpm run phase:check` passes.
- The version bump is recorded as an internal milestone only; it does not create a tag, publish packages, create a release, or deploy an instance.

## 12. Documentation

Update the relevant files:

- API/contract docs,
- domain rule or example,
- ADR,
- README/setup,
- accessibility notes,
- security/operations,
- task board,
- project status.

## 13. Completion report

The final task report includes:

- completed scope,
- files changed,
- tests/checks run and results,
- accessibility review,
- security/data review,
- migrations/config changes,
- remaining risks,
- next task ID.
