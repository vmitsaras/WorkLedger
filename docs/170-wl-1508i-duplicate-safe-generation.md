# WL-1508I — Duplicate-safe generation and field diagnostics

**Date:** 2026-09-06  
**Status:** Implementation complete; fresh B/C model evidence not run  
**Design:** D-511 and spec 0002  
**Runtime:** Node 24.18.0, pnpm 11.20.0; provider deployment remains disabled

## Implemented behavior

The Employee provider now uses selection-v1. Its four boolean arrays have one position for each
entry in the current authorized native collection. The minimized context includes an ephemeral
selectionIndex. Schema lengths, context order and decoding use the same request-owned snapshot;
another request or a later change to the source object cannot change that mapping.

The decoder rejects legacy reference-array output, wrong envelope keys, locale, statement count,
non-array selections, wrong lengths and non-boolean entries. It selects each reference at most once,
then passes the resulting existing public interpretation to the unchanged strict schema and grounding
checks. Exact prose remains enforced by the existing final validator, preserving specific prose-error
codes. No missing source, limitation, fact or action is added automatically. No source union is repaired,
duplicate model array normalized, token limit raised or generation retried.

The public 20-reference limit is unchanged. The codec supports all native candidates up to the generic
100/50/20/20 bounds; current Employee registry tools retain their narrower purpose-specific limits.
All existing authorization, private origin, model digest, health, timeout and cancellation controls remain.

## Diagnostics and evidence

The service emits one nullable validationDetail. Selection failures contain only an allowlisted field
and NOT_ARRAY, LENGTH or ITEM_TYPE. Existing strict duplicate-reference failures retain their code
and can include item/distinct/duplicate counts bounded to 20. Oversized or malformed diagnostic input
produces null detail. A conservative bounded scan also withholds detail if an earlier reference field
is oversized; failure-code classification is unchanged.

The logger independently validates the nested detail and its failure-code/outcome relationship,
reconstructs only allowed fields, and excludes request-specific detail from persistent child bindings.
Success and unrelated failures contain no detail. Reference values, arbitrary keys, parser issues,
selection bits, prompts, prose, native values and identities are excluded.

The evaluator writes artifactVersion=2 and providerOutputFormat=selection-v1 and validates its output
before writing. The reader accepts exact legacy or v2 shapes, validates diagnostic consistency and
coverage, and rejects unknown keys and mixed formats. It never upgrades historical evidence. Existing
synthetic evaluation fields remain synthetic evidence only; this reader is not an ingestion endpoint.

After building the API, the read-only review command is:

```text
node scripts/review-employee-insight-evaluation.mjs <artifact-path>
```

It prints only version/format, run/failure counts, completion and gate status. The existing 216-case
artifact was reviewed successfully as legacy with three failures and gatePassed=false. No historical
artifact was rewritten. Version-specific provenance and candidate/isolation review remain required
before any new model evaluation; this structural reader alone does not qualify a model configuration.

## Verification

- Focused deterministic checks: 61 tests passed across codec, orchestration, golden acceptance,
  logger and artifact suites. Coverage includes all small-table fact subsets, three locales, empty
  optional tables, native bounds, the public 20/21 boundary, malformed vectors/envelopes, source
  mismatch, material limitations, required facts, all four duplicate-reference fields, concurrent
  employees, no retry, stale-detail prevention and content canaries.
- `pnpm typecheck`: passed, including toolchain/workspace/phase guards.
- `pnpm lint`: passed, including source boundaries and CSS contract.
- `pnpm test`: passed 55 repository-script tests and 530 unit/component tests. The first invocation
  stopped at the expected source/import inventory; updating that inventory for added modules fixed
  it without relaxing the boundary rules. The earlier H Windows CRLF regression now also passes.
- `pnpm test:integration`: passed 13 tests; 52 database/model-gated tests skipped. No claim of a new
  live PostgreSQL authorization run is made.
- `pnpm build`: passed typed workspace imports, production build, localization and bundle budgets.
- Repository-wide `pnpm format:check`: failed on existing checkout formatting (465 flagged files).
  A read-only end-of-line-auto check narrowed this to the changed boundary-test file and pre-existing
  `.vscode/settings.json`. The boundary test was formatted; the user settings were preserved. Changed
  implementation and documentation receive scoped formatting verification. No broad checkout
  normalization or formatter-policy change was made.

WORKLEDGER_RUN_AI_EVALUATION=0 was set for the test commands. No health probe, real model case,
browser E2E run, deployment setting change, dependency change, migration or version bump ran in I.
Component tests cover existing UI behavior; no new browser/accessibility claim is made.

## Next gate

**Subsequent B evidence:** Fresh selection-v1 B has now passed 18/18 in report 171, on separate
user continuation. I's no-model boundary below remains historical; fresh C is still unexecuted.

WL-1508I is complete. WL-1508B is reopened for selection-v1: the prior 18/18 remains valid historical
evidence for the old format only. Separately authorized fresh B must pass 18/18 before uninterrupted
C can run. C's historical 213/216 remains failed and D stays blocked. Check candidate and isolation
provenance before any future run. Positional selection accuracy and real-model output size are still
unverified for selection-v1. Provider deployment remains disabled at deterministic milestone 0.16.0.
