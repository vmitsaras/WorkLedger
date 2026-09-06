# WL-1508J — Review before test execution

**Date:** 2026-09-06

**Status:** Review complete; two deterministic test defects found; tests remain stopped

## Scope

The user requested blocker/failure inspection before continuing with tests. Reviewed current source,
regressions, configuration, Vitest projects, execution flags and qualification persistence. No test,
health probe, inference, installation or code modification ran in this review. Prior compilation,
lint and build evidence in report 174 remains static evidence, not proof that regressions pass.

## Confirmed from source: fix before the deterministic run

1. **Stale configuration success expectation.** In
   `apps/api/test/runtime-config.unit.test.ts:240`, the private-host/default-bounds case calls
   createRuntimeConfig in ollama mode without a compatibility profile, then expects success.
   Configuration now always rejects this tuple; the real profile table is empty. This case will
   throw before its bounds assertion. Keep private-address rejection coverage and explicitly verify
   the missing-profile rejection. If successful default parsing needs isolated coverage, use a
   scoped module mock for a reviewed fixture profile; do not admit it to production configuration.

2. **Concurrency fixture conflicts with material completeness.** In
   `apps/api/test/employee-insight-interpretation.unit.test.ts:662`, both facts share source_today
   with a material limitation. The response at line 680 selects only the first fact. Both are now
   mandatory, so each request reaches FINAL_MATERIAL_FACT_MISSING instead of the expected success.
   Preserve this test's distinct per-request selection/order assertion by making its limitation
   nonmaterial, or by creating genuinely independent optional facts/sources. Do not weaken the
   production validator or simply select both facts, which would erase the assertion's purpose.

These are predicted deterministic failures established by tracing the code, not executed failures.
They correct the earlier implication that the prepared regression fixtures were all ready to run.

## Coverage needed before closing J

Existing cases cover several failures, but do not establish all spec 0003 requirements:

- Execute the runner with fully mocked successful responses for all 18 challenges and verify exact
  order/count, complete=true and identity checks. The current all-success test only parses a manually
  assembled artifact; the runner itself is covered only for first schema failure.
- Add mocked health failure, provider exception and final identity failure runner paths; verify no
  unexpected extra challenge or retained content and incomplete evidence for each.
- Verify both health chats share one deadline and concurrency slot. The existing timeout test stalls
  at the first metadata request and cannot catch a deadline reset between probes.
- Verify all four allowed qualifiers and exclusion of other labels/native values, and new failure
  codes at logger/v2 artifact boundaries with null detail and rejection of arbitrary code strings.

These gaps are acceptance-evidence blockers, not proof that those runtime paths are defective.
No additional phase or relaxed golden threshold is needed.

## Before real qualification or employee evaluation

The empty source-controlled profile table is an intentional hard gate: J's isolated unit tests do
not need a real profile, but K and B/C cannot run until a source-reviewed candidate is admitted and
qualified. Do not use the installed known-bypassing tuple just to make configuration parse.

The qualification script calls runOllamaSchemaQualification before mkdir/writeFile. Therefore an
unwritable output directory or a persistence error discovered at the end can discard the returned
in-memory evidence after expensive inference. Before K, reserve a unique output location and check
writability before any health/inference call, and define how incomplete evidence is preserved on
interruption. Preflight cannot guarantee against later disk failure; keep that residual risk explicit.
This issue does not prevent isolated deterministic tests from running.

Use the pinned Node directory first on PATH: report 174 demonstrated nested pnpm otherwise selecting
9.15.1 instead of 11.20.0. The package's test:ai:employee command still uses POSIX inline assignment;
on this Windows shell use the already documented explicit environment setup and direct invocation
when a future employee run is authorized. Do not execute the aggregate verify command as a preflight.

Vitest's unit project includes the new regression files and excludes integration cases. The employee
evaluation is an integration test gated by WORKLEDGER_RUN_AI_EVALUATION=1; the standalone schema
runner separately requires WORKLEDGER_RUN_SCHEMA_QUALIFICATION=1. Neither flag equals 1 in the
current review process. Future invocations must explicitly preserve that separation; this observation
does not attest to other terminals, user/machine environment or later environment changes.

## Disposition

Next work is a bounded J pretest repair: correct the two stale fixtures and complete the specified
mock coverage, retaining no-test/no-inference execution until a test instruction. Harden qualification
output preparation before K. J stays unchecked; K/B/C/D remain gated and deployment disabled.
No UI, accessibility, native calculation, authorization or retention behavior changed in this review.
