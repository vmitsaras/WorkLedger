# WL-1508J — Deterministic verification

**Date:** 2026-09-06

**Status:** J complete within its implementation/deterministic scope; K remains open

## Scope and controls

The user continued after the fixture/coverage repair and identification of deterministic execution
as the next step. This continuation ran non-model tests only. Every test process explicitly set
WORKLEDGER_RUN_AI_EVALUATION=0 and WORKLEDGER_RUN_SCHEMA_QUALIFICATION=0. Adapter tests used
synthetic loopback servers; runner tests used mocks. No installed-model health probe, inference,
schema qualification, installation or employee evaluation ran.

Starting checkout was clean at `83676c4467453d3bb9fa5c9be35d0fb1aa44ec36`. The pinned Node directory
was first on PATH; toolchain checks reported Node 24.18.0 and pnpm 11.20.0. Vitest was 4.1.10.

## Results

| Check | Final evidence |
|---|---|
| Focused J regressions | 9 files, 125 tests passed |
| Repository script guards | 55 tests passed after count assertion correction |
| Full unit/component suite | 63 files, 566 tests passed with --maxWorkers=2 |
| Available integration suite | 4 files, 13 tests passed; 28 files / 52 tests skipped, with --maxWorkers=2 |
| Workspace/toolchain/phase guards and forced TypeScript build | Passed in the initial test command |
| Diff whitespace check | Passed |

The focused files cover adapter/configuration, interpretation/completeness/selection, qualification
challenges and runner, diagnostic logging, artifact validation and golden acceptance. This includes
the repaired fixtures and coverage from report 176. Full unit/component duration was 88.45 seconds;
integration duration was 14.19 seconds. Test counts overlap the focused run and must not be added
as unique cases. Skipped integration cases retain their existing database/model prerequisites;
this is not a fresh PostgreSQL or real-model qualification claim.

Report 174 retains implementation-time lint, build and source formatting evidence; report 176
retains explicit test-file typechecking/formatting. No production source changed in this continuation.
No browser E2E or deployment verification was required for this bounded non-UI slice or run here.

## Failures encountered and resolved

The first pnpm test invocation passed static guards and compilation, then stopped in the script
suite: the repository-boundary test expected 362 files / 2,116 imports, while the checker found
369 / 2,144 and no boundary errors. Updated those two counts in scripts/check-boundaries.test.mjs
to reflect J's added modules/imports. The checker and all negative boundary assertions remain
unchanged. All 55 script tests then passed; the previously successful compilation was not repeated.

The initial full unit/component run recorded 413 passing tests but 19 worker-start timeouts, so it
was failed evidence, not a passing full run. An overlapping integration run recorded two 10-second
timeouts, 11 passes and 52 skips. Resource contention was a plausible contributor. Both suites were
rerun sequentially with --maxWorkers=2 and passed as reported above. No timeout, assertion, fixture,
acceptance rule or runtime code was relaxed. The bounded-worker setting applies to these invocations,
not a silent repository configuration change. The original all-in-one pnpm test invocation remains
recorded as failed; its guard and Vitest stages subsequently passed separately.

## Completion and remaining work

J's implementation and applicable deterministic verification are complete. K remains open: before
real qualification, repair output-writability/persistence preparation identified in report 175 and
establish an exact source-reviewed compatible runtime/model profile. The production profile list
is still empty. No schema-enforcing runtime or model is approved by this test result.

Fresh B and uninterrupted C remain required after K. C's 210/216 failure is unchanged; D and the
parent pilot remain open. Material completeness still does not guarantee question-specific comparison
coverage. Deployment provider mode stays disabled, with no new phase/version, at 0.16.0.

No domain calculation, authorization, public DTO, UI, database or retention behavior changed in
this continuation. The assistant did not commit, create a branch, install or deploy anything.
