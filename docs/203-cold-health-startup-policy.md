# WL-1508P — Cold-health diagnosis and startup policy

**Date:** 2026-09-21  
**Disposition:** Diagnosis and policy review complete; local enablement remains NO-GO.

The user scheduled WL-1508P explicitly. This review uses report 202's preserved evidence
and current source. No model request, prewarming, configuration change or deployment ran.

## Evidence and diagnosis

Evidence directory: `output/insights/local-readiness-host-a95c7d06-62bf-4be0-857a-d52d4ca7b508`.
The server log timestamps use +02:00; health JSON uses UTC. These describe the same run.

| Recorded event | Evidence |
| --- | --- |
| 08:49:26 metadata checks | Version and tags return 200; show returns 200 in 118.5229 ms. |
| 08:49:53.184 runner startup | Runtime reports llama-server started in 25.74 seconds. |
| 08:49:53.264 runner responding | Runtime reports 25.82 seconds; this overlaps the preceding measurement and must not be added to it. |
| First inference | Task 0 starts with 38 prompt tokens, empty cache and context 8192. |
| 08:49:56 cancellation | Only one chat request appears, returning 500 after 29.8646155 seconds; stderr records cancellation of task 0. |
| 06:49:56.641Z driver result | Unavailable / TIMEOUT after 30,026 ms, no capabilities and zero topic cases. |

The adapter performs version, digest and capability metadata checks, then the capability
chat, then the purpose-specific schema chat, under **one** deadline and concurrency slot.
Consequently this failure occurred in the first capability chat, before topic-schema health.
Runner startup consumed most of the budget, leaving roughly three seconds after the runner
responded. Cancellation is consistent with the application deadline. The server's 500 is
not independent evidence of a model crash or schema rejection.

This establishes where the budget was consumed, not why loading took that long or how long
successful completion would require. The remaining inference has no completion measurement.
Memory placement, disk caching and resource contention are not isolated by this observation.
Neither a larger safe deadline nor a context-size defect can be inferred from one censored run.
Report 200's 20.754-second first suggestion is a different operation after health; it does not
measure this two-probe cold-health protocol or guarantee startup under 30 seconds.

SHA-256 of stderr: `e3d34f526b3df2393c365df9a97ca3a044866313a569c49dfbf3e2c569b9c2a3`.
SHA-256 of stdout: `912369e8a917b317bab1b40b33154df5e9784d2e038fe4a3f2812d26fdcff5ce`.
Report 202 preserves health, cleanup and source identity hashes. No historical artifact changed.

## Supported startup policy

Retain the implemented bounded, optional-provider lifecycle and the local proposal's 30-second
deadline. This policy supports safe unavailability; it does not qualify this host for enablement.

1. API listening precedes the asynchronous, single startup health check (`apps/api/src/main.ts`).
   Native functionality remains available while the optional provider is unready.
2. Identity and both synthetic probes share the configured total deadline. No per-probe reset,
   background retry, automatic restart, bypass or implicit prewarming is supported.
3. Until both probes pass, generation is denied. Timeout clears approved addresses, publishes
   unavailable / TIMEOUT with no capabilities and preserves manual native Insights. The current
   entry point has no scheduled recovery; host recovery alone does not rerun health.
4. The first synthetic probe requests a 120-second idle keep-alive; the second requests unload
   (`keep_alive: 0`). Successful health therefore does not promise a resident model. Any later
   startup proposal must also account for the first suggestion and idle reloads. Keeping the
   model resident would be a separate lifecycle/privacy/resource decision.
5. Application cancellation bounds the caller, not proof that runtime resources have vanished.
   Retain report 202's owned-process cleanup and rollback procedure. Do not kill unrelated services.
6. For this candidate, remain disabled. A future authorized startup-policy change must keep
   identity, isolation, cancellation, strict output validation and native fallback intact.

No application repair is justified by current evidence: the deadline and fail-closed provider
gate operated as implemented. Raising the shared setting would also lengthen interactive requests;
it is not a startup-only repair. A separate startup budget or resident-model policy needs explicit
design and qualification rather than a guessed constant.

## Verification and disposition

The three existing provider, topic-service and runtime-config unit suites passed: **56 tests**.
They cover shared deadlines/concurrency, cancellation, admission after health, disabled behavior
and topic fallback. They use local fakes, not the real model. No new test is needed for this
documentation-only disposition. Full build, database and browser suites were not rerun; report
202's checks remain historical evidence. No UI/accessibility, domain, permission, database,
dependency, phase gate or version changes were made.

WL-1508P is complete under the task board's explicit-disposition criterion. The root performance
cause and a successful startup configuration remain unresolved. No new task is queued automatically.
Recommended future scope, if scheduled: design and qualify a separate bounded startup budget,
with content-free stage timings and a predeclared cold/first-use/idle-reload experiment. Define
the hypothesis, limits and stop conditions before inference; preserve failed evidence and exact
candidate identity/isolation/cleanup. This is a proposal, not an accepted new timeout or runtime
experiment. Local enablement still needs successful readiness and separate authorization.
