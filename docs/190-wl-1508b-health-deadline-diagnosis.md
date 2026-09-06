# WL-1508B — Shared health deadline diagnosis

**Date:** 2026-09-06  
**Status:** Diagnosis complete; recovery design pending; no model attempt authorized

## Finding

Report 189 is a health availability failure, not D-515 semantic evidence. The adapter correctly
exhausted its single 120-second budget while the second synthetic health chat was loading the model.
The first chat took about 80 seconds, leaving about 39 seconds for the compact-schema chat. Both
requests explicitly set `keep_alive: 0`; the retained server log confirms a second runner launch.
Repeated loading within one deadline is a concrete latency risk. The evidence does not establish
why this host was slower than earlier successful runs or guarantee that avoiding the reload would
make health pass.

## Evidence and control flow

- `apps/api/src/ai/ollama-adapter.ts:119` wraps address resolution, version/digest/capability checks
  and both sequential chats in one `runOperation`. `runWithDeadline` starts one timer, aborts the
  request and normalizes expiration to `TIMEOUT`. There is no per-chat budget reset or retry.
- The capability request and compact challenge both request immediate unloading. Readiness is set
  only after both validations pass; health failure clears the approved addresses. No health bypass
  or stale readiness was found in this path.
- `apps/api/test/ai-provider.unit.test.ts:650` already specifies shared deadline and concurrency-slot
  behavior with controlled timers, including generation denial after timeout. This test was read,
  not rerun. It does not simulate real model loading or prove performance.
- `apps/api/test/employee-insight-evaluation.integration.test.ts:39` asserts health before creating
  the case records and iterating the golden questions. D-515 instructions, evidence acceptance and
  employee tools were never reached. No fresh evaluation artifact is expected after this assertion.
- Spec 0003 explicitly requires both probes within the existing deadline and slot. The observed
  cancellation complies with that contract; increasing each probe to 120 seconds would violate it.

Retained report 189 logs, in
`output/insights/wl1508k-runtime/evidence-session-7d3da03e-9fc5-44e3-a061-5843e4b15f19`,
give the following local-time sequence (UTC+02:00):

| Event | Evidence |
| --- | --- |
| 15:32:21–22 | Version, tags and show succeed before capability inference |
| 15:32:23.235 | First runner starts, context 32,768, one slot, Windows CUDA mmap disabled |
| 15:33:42 | Capability chat returns HTTP 200 after about 80 seconds |
| First runner timing | Prompt evaluation 22,942.33 ms; generation 1,538.57 ms; total 24,480.90 ms |
| 15:33:46.101 | Second runner starts for compact-schema health |
| 15:34:21.703 | Client cancellation while loading; server records context cancellation |
| Second chat | HTTP 499 after 39.235 seconds; no completed schema result |

The first request's roughly 55.5 seconds outside reported prompt/generation timing includes loading,
initialization and other overhead; it cannot all be attributed to disk loading. The second runner
was still loading at cancellation, so this is not evidence of malformed schema output, schema
rejection or slow employee-answer generation. The server's configured five-minute load timeout was
not the controlling timeout; the adapter's shared deadline canceled the request first.

## Contributors and limits

The first runner reported 11.4 GiB free system memory and 22.5 GiB free GPU memory. At second-runner
startup these snapshots were 9.9 GiB and 1.8 GiB. The server disabled projector offload for the second
launch due to limited VRAM. Later fitting output reported substantially more free device memory.
These are transient snapshots during reload, not proof of sustained exhaustion, an unrelated GPU
consumer, a leak or an out-of-memory crash. Memory fitting and CPU/GPU placement changed during the
load; their individual latency contributions were not measured. No resource-owning process should
be terminated on the basis of these records.

Historical K health passed in 96,650 ms including checkpoint overhead (report 178). Report 185's
two health chats took about 23.07 and 37.98 seconds. These establish that the exact candidate has
previously fit the budget, not a stable latency guarantee. The saved records lack continuous host
load, disk/page-fault and GPU utilization measurements. A claim that D-515 caused a model-speed
regression, or that the host alone caused it, would exceed the evidence.

## Bounded next task

Design the health model-residency lifecycle before changing code or authorizing inference. Assess
whether a finite, synthetic-only residency interval between the two probes can avoid the forced
reload while preserving an initially cold capability check, both validations, the single unchanged
120-second deadline, one concurrency slot and denial of generation on any failure. Specify cleanup
on success, cancellation and partial failure, with a finite expiry as a backstop; do not assume a
failed second request will unload the first model. Keep employee generation and retention unchanged.

That is a proposal, not an accepted control change. The design must resolve the residency/privacy
tradeoff, required deterministic request/deadline/cancellation tests, and fresh qualification scope
for changed health behavior. Historical K must not be presented as proof for an amended lifecycle.
Do not silently add warm-up calls, retries, a larger deadline, different context/offload settings,
or a skipped/merged probe. Merely launching the same attempt again supplies no new diagnosis.

After an accepted design and deterministic verification, separately decide whether to authorize
one bounded cold synthetic health attempt. Only fresh successful health under the accepted controls
can support proceeding toward B; it cannot itself satisfy D-515's employee semantic gate.

## Verification and project state

Read-only source, specification, test and saved-log inspection completed. Both saved log SHA-256
values match report 189 (`178e64c0…069ac` stderr; `9229f842…6c1d8` stdout). No tests, health requests,
inference, provider launch, network calls, resource changes or production code edits occurred.
Only this diagnosis and project-memory documents changed; whitespace verification uses
`git diff --check`. No UI/accessibility, authorization, domain, database or dependency changes.

WL-1508B remains open without real-model D-515 evidence. Today-posted, C and D remain blocked.
K remains complete as historical qualification. Provider deployment stays disabled at `0.16.0`.
