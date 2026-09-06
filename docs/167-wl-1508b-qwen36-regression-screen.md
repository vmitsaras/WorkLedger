# WL-1508B — Qualified candidate regression screen

**Date:** 2026-09-06  
**Status:** Complete — 18/18 strict cases passed  
**Scope:** B only; the 216-case matrix and pilot closure remain unexecuted

## Candidate and execution boundary

The user continued after H completed and B was identified as the next employee test task. This
authorized the bounded screen: submission-actions first, followed by today-posted only after
the first group passed 9/9. It did not authorize the full matrix or deployment enablement.

- Model: `qwen3.6:latest`.
- Exact digest: `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`.
- Checkout: `f694ee21bcce583b0a141600067aab1a12955bd9`, with the recorded H documentation and
  workspace CRLF guard changes. No provider, orchestration, golden fixture, validator, or threshold
  change was made for B. Existing unrelated user changes were preserved.
- Runtime: Node 24.18.0, pnpm 11.20.0, Ollama 0.24.0 on the H-qualified Windows/RTX 4090 host.
- Controls: 120,000 ms per request, concurrency 1, temperature 0, thinking false, 1,024 generated
  tokens maximum. Only test-process configuration selected the provider.
- H's loopback-only listener, cloud-disabled startup state, and enabled outbound firewall blocks
  were reconfirmed before execution. Both evaluator invocations rechecked adapter health.

## Results

| Group | en-GB | de-DE | es-ES | Result | Recorded request latency |
|---|---|---|---|---|---|
| submission-actions | 3/3 | 3/3 | 3/3 | 9/9 | 4,752–22,203 ms |
| today-posted | 3/3 | 3/3 | 3/3 | 9/9 | 8,378–22,914 ms |

All 18 records are GROUNDED with SUCCESS, no evaluator errors, no provider or validation failure
code, exactly one server-owned registry execution, and zero model tool rounds. Each artifact has
the expected nine distinct locale/repetition combinations, exact candidate, and unchanged inference
controls. Both are correctly marked complete=false: these are screens, not full-matrix evidence.

## Evidence retained

Paths are repository-relative and ignored local artifacts under output/insights:

- `wl1508b-submission-4f9a2aa45fd94d97be7b480ccd1c8761/submission-actions.json` — first group.
- `wl1508b-today-9fd6bd033df54981afcb2dd3f01245ff/today-posted.json` — second group.
- `wl1508b-screen-summary-2026-09-06.json` — content-free 18/18 summary, not a merged full gate.
- Each group directory also retains run metadata. Earlier smoke evidence was moved aside before
  the fixed evaluator filename could be overwritten.

Artifact review checked the exact top-level and per-record key allowlists, candidate identity,
locale/repetition coverage, outcomes, errors, tool counts, and inference limits. There are no
questions, prompts, generated prose, native values, tool contents, source references, or employee
identities in the retained result records.

## Launch correction

The first submission-actions launch passed adapter health but failed before any employee case:
WORKLEDGER_AI_EVALUATION_RUN_LIMIT arrived as an empty value and parsed to zero. No smoke result
was produced. Its failed run metadata remains in
`wl1508b-submission-db28d17be6d44f6984e964acc981259f/run.json`.

The corrected invocation explicitly set the run limit to 9, the complete selected group. Both
groups then ran once successfully. This corrected process configuration only; it was not a retry
of failed semantic cases and changed no evaluation criterion. H's Windows runbook now reflects
the correction. C must ensure semantic-ID and run-limit keys are absent from the actual Node
child environment rather than merely assigned empty strings.

## Verification and remaining boundary

The pinned workspace and phase guards passed, and TypeScript compilation passed before the screen.
Each corrected invocation of the exact employee evaluation integration file passed: 89.90 seconds
for submission-actions and 94.85 seconds for today-posted, including runner overhead.

No broad repository, browser, accessibility, or database suite was run for this evidence-only task.
The H CRLF regression case remains for the later applicable non-model checks. Native fallback and
privacy contracts are unchanged, but this result does not replace D's broader evidence review.

B is complete. C is next: one uninterrupted unfiltered 24-question × 3-locale × 3-repetition run
must independently record 216/216 for the same exact candidate. D and parent WL-1508 remain open.
Provider mode remains disabled for deployment; no model is approved and no version changes.
