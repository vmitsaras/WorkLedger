# WL-1508C — Qwen3.6 uninterrupted full evaluation

**Date:** 2026-09-06  
**Status:** Failed — 213/216 passed; C remains open and D is blocked  
**Execution:** One uninterrupted full matrix, no filters, retries, or stitched results

## Candidate and provenance

The user continued after B passed 18/18 and C was identified as the next task. The invocation ran
only C, preserving the existing zero-tolerance threshold and disabled deployment provider.

- Model: `qwen3.6:latest`.
- Digest: `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`.
- Checkout: `f694ee21bcce583b0a141600067aab1a12955bd9`, plus the documented H workspace-guard,
  firewall helper, and planning changes. No AI implementation or fixture changed for this run.
- Runtime: Node 24.18.0, pnpm 11.20.0, Ollama 0.24.0, H-qualified Windows/RTX 4090 installation.
- Inference: 120,000 ms deadline, concurrency 1, temperature 0, thinking false, 1,024 generated
  tokens maximum. No prompt, schema, validator, tool scope, or evaluation criterion changed.
- Wrapper start: 07:09:40.537 UTC; finish: 07:37:41.877 UTC. Runner duration: 1,679.77 seconds
  (about 28 minutes); normal termination with exit code 1 and no signal.

## Complete-matrix result

| Coverage | Passed | Failed |
|---|---|---|
| balance-summary, en-GB | 3 | 0 |
| balance-summary, de-DE | 3 | 0 |
| balance-summary, es-ES | 0 | 3 |
| Other 23 semantic questions, all locales/repetitions | 207 | 0 |
| Total | 213 | 3 |

All 213 passing records are GROUNDED. No passing safe-rejection disposition was needed. The three
Spanish balance-summary repetitions fail identically at the recorded validation boundary:

- Outcome: PROVIDER_INVALID_OUTPUT.
- Provider failure: INVALID_RESPONSE.
- Validation failure: FINAL_SCHEMA_REFERENCES_DUPLICATE.
- Safe error: WorkLedger INTERNAL_ERROR, HTTP 503.
- Each trace: one server-owned registry execution, zero model tool rounds, 823 input tokens,
  155 output tokens. Latencies: 8,708 ms, 8,625 ms, and 8,674 ms.

This proves the strict duplicate-reference validator rejected those responses. The content-free
artifact does not identify the duplicated reference or retain model prose, so no narrower cause
or proposed prompt/schema fix is asserted. The previously failing B groups both passed 9/9 again
inside this independent full run, but cannot compensate for another failed semantic question.

## Invocation and artifact verification

The actual Node child environment omitted both WORKLEDGER_AI_EVALUATION_SEMANTIC_ID and
WORKLEDGER_AI_EVALUATION_RUN_LIMIT. A child-process preflight verified their absence before the
single Vitest process began; empty PowerShell values were not used. The runner selected only the
existing employee evaluation integration file. The evaluator itself performed adapter health
before generating employee cases. No partial run or screen artifact was used to populate C.

Ignored local evidence, relative to the repository:

- `output/insights/wl1508c-full-843c14db-509c-46f2-a6aa-e726d15d2404/full-evaluation.json`.
- The same directory's `run.json` contains launch times, revision, Node version, filter absence,
  exit code, and termination signal.
- The same directory's `review-summary.json` contains the independently checked counts and safe
  error-code aggregates. It explicitly records gatePassed=false.
- `output/insights/wl1508c-run.mjs` and `wl1508c-review.mjs` preserve the local invocation and
  artifact-review procedures. Earlier full-matrix output, if present, was moved aside first.

Review verified the complete=true flag, 216 records, 24 current fixture IDs, every distinct
question/locale/repetition tuple, exact candidate and inference controls, exact allowed top-level
and record fields, failure counts, and normal process termination. Review found no artifact
validation issue. Complete=true means the matrix finished; it does not mean the gate passed.

## Security, accessibility, and verification boundaries

Loopback-only listening, cloud-disabled startup state, and active Ollama outbound firewall blocks
were reconfirmed before execution. No deployment setting changed. Evidence contains no question,
prompt, generated prose, native value, source reference, tool contents, or employee identity.

Pinned workspace/phase guards and TypeScript compilation passed before the run. The full model
evaluation failed its expected-zero-failures assertion. No separate UI, browser, database, or
broader non-model suite ran in C, and no new accessibility claim is made. D still owns that review,
including the unexecuted H CRLF regression case.

## Stop decision and next work

**Diagnostic follow-up:** The subsequently requested source/fixture review is complete in
`docs/169-wl-1508c-duplicate-reference-diagnosis.md`. It identifies an Ollama 0.24.0 uniqueItems
enforcement gap while preserving uncertainty about the actual repeated array. No inference or
implementation change accompanied the diagnosis. The following stop decision remains in force.

C remains unchecked because it requires 216/216. D and parent WL-1508 cannot close. H and B retain
their passing historical evidence. There is no automatic rerun, model switch, prompt adjustment,
schema change, duplicate-reference normalization, or threshold relaxation.

The next proposed work is a separately scoped diagnosis of the Spanish balance-summary duplicate
references. Any accepted remediation must preserve the privacy and validation contract and define
fresh screen/full-matrix evidence for the resulting exact configuration. No implementation recovery
task was started by this evaluation. The deterministic Phase 15 gate and version 0.16.0 remain intact.
