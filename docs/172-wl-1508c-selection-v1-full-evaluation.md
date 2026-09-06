# WL-1508C — Selection-v1 full evaluation

**Date:** 2026-09-06  
**Status:** Failed — 210/216 accepted; C remains open and D blocked  
**Execution:** One uninterrupted matrix; no filters, semantic retries or tuning

## Provenance

The user continued after fresh selection-v1 B passed 18/18 and C was identified as the next task.
The invocation ran only the full matrix and did not enable a deployment provider or close the pilot.

- Clean starting checkout: `1449d301ba6d0ecdbd2f08b834f7c316fac41bc4`.
- Exact model: `qwen3.6:latest`, digest
  `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`.
- Runtime: Node 24.18.0, pnpm 11.20.0, Ollama 0.24.0; existing qualified local installation.
- Format: artifactVersion=2, providerOutputFormat=selection-v1.
- Controls: 120-second request timeout, concurrency 1, temperature 0, thinking false,
  maximum generated tokens 1,024. Public validators and golden acceptance rules unchanged.
- Preflight reconfirmed exact served model, cloud disabled, empty HTTP/HTTPS proxy fields,
  loopback-only listener, enabled firewall profiles and the two exact Ollama executable outbound
  blocks on Any profile/address. No installation configuration changed.
- The eight recorded source/fixture/adapter/contract hashes matched the passing B run before launch
  and remained unchanged after completion. Both filter keys were absent from the actual child
  environment. The evaluator performed its existing adapter health check before cases.
- Wrapper start: 08:34:53.468 UTC; finish: 08:57:37.981 UTC, about 22 minutes 45 seconds.
  Runner duration: 1,362.78 seconds. Normal exit code 1, no termination signal.

## Results

| Disposition | Count | Gate interpretation |
|---|---|---|
| GROUNDED | 207 | Passed |
| SAFE_REJECTION | 3 | Passed under the existing fixture rule |
| FAILED | 6 | Failed |
| Total | 216 | 210/216 accepted; zero-tolerance gate failed |

All three repetitions failed for each of these question/locale pairs:

| Question | Locale | Failure boundary | Retained detail |
|---|---|---|---|
| balance-projection | de-DE | Golden acceptance after runtime SUCCESS | Missing posted-change fact, incomplete-date count and review action |
| balance-closing | en-GB | Provider output rejected safely with HTTP 503 | INVALID_RESPONSE / FINAL_SELECTION_INVALID; field=factReferences, reason=LENGTH |

For balance-projection, provider/validation codes and detail are null because the public runtime
validator accepted the response; the question-specific golden obligations failed. Each run used
897 input tokens and 104 output tokens, with latency 6,052 / 6,031 / 5,976 ms. Runtime SUCCESS
must not be mistaken for golden acceptance.

For balance-closing, each run used 889 input tokens and 91 output tokens, with latency
5,346 / 5,392 / 5,408 ms. The boolean fact array did not match its required table length. The safe
diagnostic intentionally records neither actual length, selection positions nor provider content;
this evidence cannot determine whether the array was shorter or longer, or explain why it happened.

The three accepted safe rejections are leave-other-person/es-ES repetitions 1–3. They returned
FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID and null detail, which the existing scope-change
fixture permits as a safe failure. They are not grounded answers or a newly relaxed threshold.

The previous duplicate-reference question, balance-summary, now passes all 9 cases including es-ES.
No FINAL_SCHEMA_REFERENCES_DUPLICATE was recorded anywhere in this run. The B question groups
also pass inside this independent matrix. These successes do not compensate for the six failures.
Every case performed one registry execution and zero model tool rounds.

## Evidence and independent review

Ignored evidence directory:
`output/insights/wl1508c-selection-92ba5d09-3a07-4170-af47-da3b6157063c/`.

- full-evaluation.json: original v2 evaluator artifact, complete=true.
- run.json: revision, start/end, runtime, source hashes, filter absence and termination.
- review.json: launch-wrapper coverage, candidate, controls, source-drift and result checks.
- review-summary.json: 210 accepted / 6 failed, disposition counts, safe failure details,
  zero duplicate-reference failures and gatePassed=false.
- `output/insights/wl1508c-selection-run.mjs`: invocation and review procedure.
- `output/insights/wl1508c-selection-isolation-2026-09-06.json`: preflight isolation metadata.

Review checked all 24 current fixture IDs and every locale/repetition tuple: no missing, repeated
or unexpected cases. Strict artifact parsing passed, and the recorded issue is the expected failed
gate rather than malformed evidence. The standalone read-only reviewer also reports v2,
selection-v1, 216 runs, six failures, complete=true and gatePassed=false.

Artifacts retain no raw provider response, prompt, prose, selection bits, native employee value,
identity or tool content. Golden error messages do retain the names of missing synthetic fixture
references, as produced by the existing evaluator; those are not captured model-returned references.
Historical B/C evidence was preserved before the fixed output path was reused.

## Verification and stop decision

**Subsequent diagnosis:** Report 173 completes the requested source/artifact review without new
tests or inference. It identifies the pinned provider's schema bypass and the runtime completeness
gap. The next proposed work is bounded recovery design under D-512; this run remains failed.

Pinned workspace/toolchain/phase guards and TypeScript compilation passed before execution.
The full evaluation failed its expected-zero-failures assertion. No separate non-model, database,
browser or accessibility suite ran in this evidence-only task; report 170 retains those earlier
results and limitations. No prompt/schema/code, dependency, provider setting or version changed.

C remains unchecked and D remains blocked. B/I remain completed evidence for their scopes. The
next bounded work is diagnosis of the fact-selection length failure and golden required-citation
omissions using the saved evidence and current implementation. No repair, retry, model switch or
threshold change follows automatically. Selection-v1 has removed the observed duplicate-reference
failure from this run, but has not passed the employee pilot. Provider deployment remains disabled
at deterministic milestone 0.16.0.
