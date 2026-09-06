# WL-1508B — Fresh D-516 schema qualification

**Date:** 2026-09-06

The separately continued qualification passed cold health in 23,508 ms and all 18 fixed schema
challenges with null failure categories. Final identity passed, the artifact is complete, and all
21 immutable checkpoints plus the final artifact passed strict parsing. No employee evaluation,
retry, tuning or deployment ran. This qualifies the D-516 lifecycle for the next bounded B screen;
it does not establish employee semantic acceptance.

The clean starting revision was `b11fdf719d264d7727cf640f9c1fb06dce3ba62d`.
Pinned Node 24.18.0/pnpm 11.20.0 workspace, phase-version and forced TypeScript build checks passed.
The candidate preflight reverified report 189's three executable hashes and valid signatures,
exact model manifest/configuration digests, all three active executable-scoped outbound blocks,
all firewall profiles enabled, no portable process, no port 11435 listener and no model loaded
by the installed server. The portable server started hidden with cleaned Ollama/proxy variables,
cloud disabled, debug disabled, one slot and the existing model store. Its executable, serve
command and sole 127.0.0.1:11435 listener were verified against owned PID 63708.

Immediately before inference, version 0.33.3, the exact qwen3.6:latest manifest digest and an empty
loaded-model list passed. The run used `ollama-0333-qwen36-schema-v1` and lifecycle identifier
`synthetic-health-residency-v1`. The existing qualification runner, application adapter, fixed
challenges and persistence helper were unchanged. An ignored wrapper measured health and retained
content-free provenance. The 120,000 ms timeout, one slot, 1,024 maximum generated tokens,
temperature zero and thinking false were unchanged. The employee evaluation flag remained zero.

The uninterrupted run lasted from 14:20:56.411 to 14:22:40.972 UTC (104,561 ms including persistence
and review). Empty, singleton, compact, types/keys, locale/prose and native-maximum cases each
passed three repetitions. Ten source, compiled-module and wrapper hashes matched after the run.
The independent review CLI also accepted the final artifact as complete with health and identity
passed and 18 results.

Qualification artifact directory:
`output/insights/schema-qualification-c6d3ead0-2e1e-42ea-8952-0eebd0cc3f9f`.
Runtime/provenance directory:
`output/insights/wl1508b-residency-qualification-b91fbeb1-c0c7-4579-9ac3-7e489cdf6283`.

| Evidence | SHA-256 |
| --- | --- |
| `artifact.json` | `db82b9d6d7f646372b4677d1a54224af41bd7d281a7f30be163bc04c12b9e99c` |
| `review.json` | `723c0a547df6c09a76e557439493cb7fe12a479fcfe9999c3f38c934c585d958` |
| `cleanup.json` | `e644554326ede063414d5da0dcd1858c30e9cef0836078355358966c5aca7126` |

After executable, command and listener ownership checks, exact-PID tree cleanup stopped server
63708 and descendants 70648, 52492 and 65848. Final checks found zero portable processes, zero
port 11435 listeners, zero installed-server loaded models and unchanged firewall protection.
The installed server was left running. Evidence contains technical metadata and ordinary lifecycle
logs only; no raw model response, prompt, thinking or employee context was retained.

Only evidence and project memory changed. There are no UI/accessibility, domain, authorization,
database, dependency or phase/version changes. Deterministic implementation evidence remains in
report 192; no broad deterministic suite was repeated. Final diff checks passed.

Next: separately continued WL-1508B, with mandatory health, submission-actions 9/9 then
today-posted 9/9 under the qualified exact configuration and existing failure stop rules. No B case
is authorized by this qualification continuation. B/C/D remain open, historical K remains complete,
and provider deployment remains disabled at `0.16.0`.
