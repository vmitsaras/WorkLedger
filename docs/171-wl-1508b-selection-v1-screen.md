# WL-1508B — Selection-v1 regression screen

**Date:** 2026-09-06  
**Status:** Complete — 18/18 grounded cases; zero failures  
**Scope:** Fresh B only; no selection-v1 full matrix or deployment enablement

## Provenance and controls

The user continued after WL-1508I completion and identification of fresh B as the next task.
The screen ran submission-actions first, then today-posted only after the first artifact passed
review. Neither group was retried. No prompt, schema, validator, fixture or inference setting was
changed during the screen.

- Clean starting checkout: `81ec675b97db2007fd273d8eff281fd01f255c2f`, including WL-1508I.
- Format: selection-v1; artifactVersion=2; existing strict public grounding validators.
- Model: `qwen3.6:latest`; digest
  `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`.
- Runtime: Node 24.18.0, pnpm 11.20.0, Ollama 0.24.0 on the previously qualified local host.
- Inference: 120-second request timeout, concurrency 1, temperature 0, thinking false,
  maximum generated tokens 1,024. Each evaluator invocation rechecked adapter health.
- Preflight: exact served digest, loopback-only 127.0.0.1:11434 listener, cloud-disabled startup,
  empty HTTP/HTTPS proxy fields, all firewall profiles enabled, and both named Ollama executable
  outbound-block rules active for Any profile/address. No installation setting changed.
- The initial proxy check assumed adjacent field ordering and returned false. Independent named-field
  extraction confirmed both proxy fields present and empty before any evaluation began; this was
  a read-only check correction, not a configuration change or semantic retry.

## Results

| Group | en-GB | de-DE | es-ES | Total | Request latency range |
|---|---|---|---|---|---|
| submission-actions | 3/3 | 3/3 | 3/3 | 9/9 | 5,728–23,191 ms |
| today-posted | 3/3 | 3/3 | 3/3 | 9/9 | 6,387–22,181 ms |

Submission wrapper ran 08:15:54.268–08:17:24.088 UTC; today wrapper ran
08:17:37.338–08:18:57.830 UTC. Both terminated normally with code 0 and no signal.
Runner durations were 89.35 and 78.49 seconds respectively.

All 18 records are GROUNDED/SUCCESS with no evaluator errors, null provider/validation failure
codes and null validationDetail, one registry execution and zero model tool rounds. Both artifacts
correctly say complete=false. This screen does not cover the historically failing balance-summary
question and does not establish a passing full matrix.

## Retained evidence and review

Ignored evidence under `output/insights/`:

- `wl1508b-selection-submission-actions-6d46a767-31ca-49db-9344-fdf9c7af1160/submission-actions.json`.
- `wl1508b-selection-today-posted-a62bde5e-32fd-4126-9237-070f8db4332e/today-posted.json`.
- Each directory contains run.json with source hashes/provenance and review.json with safe results.
- `wl1508b-selection-summary-2026-09-06.json` records 18/18 as a screen, not stitched full evidence.
- `wl1508b-selection-run.mjs` preserves the bounded Windows invocation and artifact review.

The wrapper sets the semantic group and explicit run limit 9 in its child environment and invokes
only the employee evaluation integration file. Earlier fixed-name smoke output is preserved before
each run. Strict artifact parsing checks known version/format and field shapes. Review additionally
checks exact candidate/inference, nine distinct locale/repetition combinations per group, all
outcomes/failures/details/tool counts, and normal termination. SHA-256 hashes of the relevant source,
adapter, contracts, evaluator and fixture are unchanged within and across both runs.

No prompts, prose, reference values, selection bits, native values, identities or tool content were
retained in the evaluation records. Existing historical artifacts were preserved.

## Verification and next task

Pinned workspace/toolchain/phase checks and TypeScript compilation passed before the screen.
No additional broad deterministic, PostgreSQL, browser or accessibility suite ran; WL-1508I's
verification and disclosed baseline formatting/skipped-integration limits remain recorded in report 170.

B is complete for selection-v1. C is next: a separately authorized, uninterrupted, unfiltered
24-question × 3-locale × 3-repetition run must pass 216/216 for this exact configuration. The old
213/216 remains failed legacy evidence; no new C run occurred. D and the parent pilot remain open.
Provider deployment stays disabled; the deterministic milestone remains 0.16.0.
