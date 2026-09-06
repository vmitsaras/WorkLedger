# WL-1508N — Bounded runtime performance recovery

**Date:** 2026-09-06  
**Status at this report's run:** Full matrix complete; responsiveness and supported English cases pass;
UNKNOWN acceptance fails

**Current follow-up:** [Report 201](201-wl-1508n-best-effort-english-suggestions.md) records the
subsequent best-effort contract amendment and a separate assessment of this existing evidence.
It supersedes the pending decision below. This report's protocol, results and original failure
are preserved; no fresh model run or improved abstention is implied.

The user explicitly continued WL-1508N after report 199's latency/deadline failure.
This slice investigates the existing exact candidate. It changes no product scope,
prompt, fixture, acceptance threshold, model, runtime binary or deployment default.

## Diagnosis and frozen experiment

Report 199's immutable runtime log records two loads with 32,768 context tokens.
The allocator projected 22,006 MiB against 22,972 MiB free and a 1,901 MiB reserve.
It consequently placed portions of three layers in system memory: the recorded
model buffers were 19,942.20 MiB CUDA and 1,501.79 MiB host. Typical full topic
prompts used approximately 218–224 tokens. Repeated requests also showed slow
generation with only four newly evaluated prompt tokens. A 14-token response took
79,275.90 ms to generate, with just 50.80 ms of prompt evaluation.

These observations establish memory pressure and slow decoding, but do not prove
that host spill is the sole cause. Startup, prompt length and output length alone
do not explain the warm-request delays. Historical health responses were fast
despite the same placement, so a context reduction is an experiment, not a proven fix.

The single prepared change is process-local `OLLAMA_CONTEXT_LENGTH=8192`, reduced
from 32768. All other host/provider settings remain as recorded in report 199:
Ollama 0.33.3, the same exact qwen3.6 manifest/config, temperature zero, thinking
disabled, 1,024 output tokens, one parallel request/model and a 120-second deadline.
The smaller context remains generous for the static prompt and 500-code-point input;
the runtime log must be checked for truncation. No cache quantization, GPU fitting
reserve override, model switch or prompt adjustment is included.

[Ollama's FAQ](https://docs.ollama.com/faq#how-can-i-specify-the-context-window-size)
documents the context environment setting. The
[exact v0.33.3 runner source](https://github.com/ollama/ollama/blob/v0.33.3/llm/llama_server.go)
passes context size to llama-server and enforces context limits. Observed startup
arguments, allocation and timings determine the actual result on this host.

## Procedure and boundaries

- Rebuild with the pinned toolchain; run existing provider/topic and evaluation-review checks.
- Use a separate host wrapper and unique evidence directories; preserve all earlier artifacts.
- Recheck exact signed programs, enabled outbound firewall blocks, model manifest,
  sole owned loopback listener, no competing model and cold state before inference.
- Record the wrapper hash, this pre-run plan hash and explicit host settings in isolation evidence.
- Sample only GPU resource/timing metadata. Do not persist questions, generated content,
  employee records or process command lines from unrelated applications.
- Run fresh purpose-specific health and the original ordered 60-case matrix. Stop on a
  provider/validation failure. Do not retry, combine partial runs or change the criteria.
- Recheck identity/source hashes and remove only the owned server process tree and
  measurement helper. Confirm no remaining owned process or evaluation listener.

The acceptance criteria remain ADR 0015's full 60 valid responses, at least 36/40
supported and 8/10 for each topic, 20/20 UNKNOWN and p95 at most ten seconds.
The cold request remains in that distribution and is reported separately. Health is
timed separately; deployment remains disabled. No UI/domain changes require new
accessibility or database tests in this runtime-only slice.

## Recorded outcome

The fresh run started at `2026-09-06T21:04:44.343Z`, reached ready health at
`2026-09-06T21:05:04.432Z`, and finished at `2026-09-06T21:05:44.229Z`.
All 60 requests completed with valid outputs and no provider/validation failures.

| Criterion | Result | Disposition |
| --- | --- | --- |
| Exact ordered coverage | 60/60 | Pass |
| Supported English topics | 40/40; each topic 10/10 | Pass |
| UNKNOWN outcomes | 12/20 | Fail; 20/20 required |
| Request p95, including cold request | 510 ms | Pass; at most 10,000 ms required |
| Cold first topic request after health unload | 20,754 ms | Visible startup limitation |
| Slowest remaining request | 795 ms | Observed warm performance only |
| Final provider identity and source/compiled hashes | Both passed | Pass |
| Owned server/listener cleanup | Zero remaining | Pass |
| Overall acceptance | `passed: false`, `complete: true` | N stays unchecked |

The four failing fixture classes were `unknown-ambiguous`, `unknown-german`,
`unknown-spanish` and `unknown-mixed`, each failing both repetitions. Multiple-topic,
write, other-person, injection, unrelated and employment-decision cases returned
UNKNOWN in both repetitions. The artifacts retain correctness flags, not selected
topics or raw output; do not invent which alternative topic was returned.

The new run provides complete bounded-sample evidence of correct supported English
suggestions and fast warm requests. It also establishes that the current prompt/model
does not reliably abstain from ambiguous or non-English input. English-only support
documentation is not a language detector. Confirmation still prevents a suggestion
from automatically running an Insight or gaining authority, but it does not turn
the failed UNKNOWN criterion into a pass.

The runtime confirmed context 8192 with no recorded prompt truncation. Its first
load used a 20,440.20 MiB CUDA model buffer and 1,003.79 MiB host buffer. On the
post-health reload, Ollama automatically disabled multimodal projector GPU offload
for limited VRAM; that load used 20,149.07 MiB CUDA and 1,294.92 MiB host model
buffers. This automatic placement differed from report 199. The observed latency
improvement therefore belongs to this complete recorded configuration/load, not
proof that context size alone caused it or that all model weights fit on the GPU.
Cold health took about 20.1 seconds and the first suggestion another 20.8 seconds.
No prewarming or residency-control change hides either cost.

GPU snapshots in `gpu-sample-start.csv` and `gpu-sample-matrix.csv` contain only
timestamp, memory used/free, GPU/memory utilization, temperature, performance state
and power. These are two finite 20-sample windows, not a complete profiler trace;
the second spans the end of inference and cleanup. Their commands completed without
a persistent measurement helper. Independent post-run host inspection also found
zero owned portable processes and zero listeners on port 11435.

## Evidence and verification

- Evaluation: `output/insights/english-topics-4291e793-0e23-4f75-b7c4-406d67e2c17d`.
- Host: `output/insights/english-topics-ctx8192-host-feba3724-9e3a-4590-9e49-81c6976a174a`.
- The host directory preserves `pre-run-plan.md`, isolation evidence with context size
  and plan/wrapper hashes, signed-program/firewall checks, runtime logs and cleanup.
- Local wrapper: `output/insights/run-english-topics-ctx8192.ps1`; the historical
  `run-english-topics.ps1` is unchanged. The context override existed only in the
  evaluation process environment; no application or machine default was enabled/changed.
- Result SHA-256: `897a31a76f1c5c9fed41af24426d13349bc7cf805ee729e161ab5e26c1856f9e`.
- Cleanup SHA-256: `e000a62d02d2b900215330c72c963f38dd015ea1b9ada900ae87e8c643dc987c`.
- Pinned `test:build` passed: `output/verification/74c23af0-2ccf-442c-be52-e2969baf9559`.
- Existing provider/topic tests: 44 passed in two files.
- Existing evaluation-review test: one passed, covering coverage, per-topic accuracy,
  UNKNOWN requirements, duplicate results, failure and latency boundaries.
- Pinned `format:check` passed: `output/verification/f2eb7de1-6a5e-4725-8c1b-fe71d0b46241`.
  `phase:check` passed at `0.16.0`; `git diff --check` passed and all 112 relative
  documentation links resolved. Preserved pre-run plan and wrapper hashes match isolation evidence.

Only project documentation changed in the tracked repository. Report 199's full local
implementation gate remains the latest full gate; it was not rerun for documentation
and an isolated host setting. No new UI, permission, persistence, database, dependency,
manifest or phase-gate change occurred. Remote CI and broader accessibility evidence
retain their previous limits.

## Remaining decision

The performance experiment is complete. Do not queue another unchanged run, silently
change UNKNOWN expectations or mark N complete. A review of the request builder and
strict parser found the English/ambiguity abstention instructions present, with no
missing question field or permissive output parser explaining these semantic misses.

Two distinct paths are available:

1. Retain the accepted strict UNKNOWN criteria. N remains experimental/disabled until
   a separately justified abstention recovery passes a fresh full matrix. No specific
   repair is established by this experiment; another blind prompt replay is not queued.
2. Explicitly amend the product contract to **best-effort topic suggestions, supported
   and evaluated in English**, with ambiguity/non-English behavior unsupported and
   measured rather than guaranteed to abstain. Preserve all observed misses and the
   original failed evaluation; retain confirmation, independent native execution,
   privacy, schema and provider controls. This would require an explicit user decision,
   revised acceptance documentation and truthful UI/support wording before closure.

Path 2 is a concrete scope proposal, not an accepted amendment or deployment approval.
No current checkbox or threshold has changed. The legacy interpretation pilot remains
deferred independently of this smaller feature.
