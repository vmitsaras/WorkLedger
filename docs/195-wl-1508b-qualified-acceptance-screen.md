# WL-1508B — Qualified D-515/D-516 acceptance screen

**Date:** 2026-09-06

The separately continued bounded screen passed mandatory health but failed submission-actions:
3/9 accepted. All three English cases passed. All three German cases failed runtime validation
with `FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID`, detail `factReferences / EMPTY_REQUIRED`,
and provider code `INVALID_RESPONSE`. All three Spanish cases passed runtime validation but failed
golden acceptance with `Missing required action reference action_submission_requests.` Their
provider/validation codes and detail are null. No today-posted group, C, retry or tuning followed.
B remains open; this is fresh semantic failure evidence, unlike report 189's health-only failure.

The clean starting revision was `e8f703ef005deab49fd3160ca271e5099993ef86`.
Pinned Node 24.18.0/pnpm 11.20.0 workspace, phase-version and forced TypeScript build checks passed.
Report 194's complete qualification artifact hash and all ten qualification source hashes matched
before startup. The same report 189 binary hashes/signatures, exact model manifest/config digests,
three active executable-scoped outbound-block rules and enabled firewall profiles passed preflight.
No portable process, port 11435 listener or installed-server loaded model existed before startup.

The portable server started hidden with cleaned Ollama/proxy variables, cloud and request debugging
disabled, one inference slot and the existing local model store. Exact executable, serve command,
owned PID 64860 and sole loopback server listener were verified. The candidate loaded-model list
was empty immediately before the screen. The wrapper verified API version 0.33.3 and the exact
qwen3.6:latest digest. The integration harness passed mandatory health before its nine-case loop.

The run retained profile `ollama-0333-qwen36-schema-v1`, D-515 acceptance, D-516 lifecycle
`synthetic-health-residency-v1`, 120,000 ms timeout, one slot, 1,024 generated-token limit,
temperature zero, thinking false and selection-v1. Only the ignored wrapper's provenance fields
were extended to reference the lifecycle and fresh qualification artifact. Application, prompt,
fixture, schemas, validators and acceptance thresholds were unchanged.

The run lasted from 14:42:13.708 to 14:43:16.712 UTC; the integration assertion ran for 59.431
seconds and exited 1. All nine locale/repetition records were retained. Strict v2 artifact parsing,
coverage, controls, final identity and eleven unchanged source hashes passed review. Review issues
were exactly `FAILED` and `RECORD`, reflecting the six failed cases. The screen stopped after its
first bounded group as required; the existing harness completes that group's nine repetitions.

Evidence directory:
`output/insights/wl1508b-evidence-submission-actions-ad0781ac-adca-4760-8f4b-874397434174`.
Runtime directory:
`output/insights/wl1508b-qualified-screen-6f1fd8b9-1b20-489b-b71a-a9ef5c2e3ee6`.

| Evidence | SHA-256 |
| --- | --- |
| `submission-actions.json` | `00cb31dfb2b5a4a0f864849371bf7a4dff0621dbcc85a1e613b94ee40ec30042` |
| `review.json` | `d7b6d699f94108fd34d29872177b509ded755f6b4c5328ba7bb02a5402f798cb` |
| `cleanup.json` | `6e0ad4ab0848adfdea62e4efd4de7e9b75113c9135eebcaac1a12c4190d48d54` |

After repeated executable/command/listener ownership checks, exact-PID tree cleanup stopped server
64860 and descendants 71332, 72260 and 72268. Final portable-process and port counts were zero;
the installed server remained running with no loaded models and firewall protection unchanged.
Only content-free metadata, closed diagnostics and ordinary lifecycle logs were retained, without
questions, prompts, raw model output or native values. The fixtures are synthetic employee cases.

Only evidence and project memory changed. No UI/accessibility, authorization, domain, database,
dependency, phase or version change occurred. No broad deterministic suite was repeated; scoped
workspace/build and final diff checks passed. Provider deployment remains disabled at `0.16.0`.

Next: bounded diagnosis of the persistent German empty-fact selection and Spanish pending-request
action omission using retained diagnostics and source inspection, before designing any recovery or
authorizing another attempt. The passing synthetic qualification does not establish employee
semantic completeness. B/C/D remain open; historical K and report 194 qualification remain valid
for their recorded scope. No new phase is needed.
