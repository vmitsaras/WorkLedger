# WL-1508O — Controlled local provider readiness

**Date:** 2026-09-21  
**Scope:** Readiness and an enablement decision; application provider remains disabled.

The user explicitly continued the recommended readiness slice after WL-1508N closure.
This schedules a bounded host/configuration review and synthetic topic health check,
not application enablement, deployment, another semantic matrix or legacy pilot resumption.

## Prepared check

Verify the report-200 portable Ollama 0.33.3 executables, valid signatures, exact qwen3.6
manifest/config and active outbound block rules. Use only an owned server on
127.0.0.1:11435, cloud disabled, empty proxy settings, one model/request and context 8192.
Require no competing loaded model and a cold candidate before health. Run the existing
application provider with `english-topics-v1`, a 30-second deadline and concurrency one.
Send only the two fixed synthetic health probes; execute zero employee topic cases.
Preserve unique evidence, stop on failure, and verify owned process/listener cleanup.
No automatic retry, deadline increase, persistent configuration or firewall change follows.

Source baseline: `dc4b3b1513c7bb59daf3ab74c1e9953dc8ccc086` (initially clean).
The local wrappers and evidence are under `output/insights`; they are operational evidence,
not a supported service launcher. Report 200's wrapper is preserved unchanged.

## Initial host findings

All three portable executable hashes match report 200's wrapper and signatures are valid.
The model manifest SHA-256 is
`07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`;
the referenced config blob SHA-256 is
`5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa`.
This is not a fresh hash of every weight blob.

No root `.env` exists and process/user/machine provider mode overrides are absent.
The parser defaults to disabled and tracked example configurations remain disabled.
These checks do not establish the environment of an independently running application.
The existing port 11434 listener uses wildcard IPv6 address `::`; it is not the proposed
private candidate endpoint. No installed service is stopped or reconfigured by this review.

## Outcome

**NO-GO for local enablement at the current application deadline.** The single cold
health attempt returned `unavailable` / `TIMEOUT` after 30,026 ms under the 30,000 ms
deadline. No topic case ran. Runtime logs confirm context 8192 and cancellation;
this result does not establish a causal performance defect or invalidate report 200's
historical semantic sample. No retry or timeout increase was performed.

The wrapper verified all firewall profiles enabled, all three program-specific outbound
blocks, exact binary signatures/hashes, server version, an owned loopback-only listener,
no competing loaded model and cold state. It then stopped its owned process tree;
cleanup recorded zero remaining portable processes and zero listeners on port 11435.
This verifies the inspected controls, not comprehensive packet-level egress behavior.

Evidence directory:
`output/insights/local-readiness-host-a95c7d06-62bf-4be0-857a-d52d4ca7b508`.
It preserves the pre-run plan, isolation reference, runtime logs, health and cleanup.
The wrapper retains its historical `evaluationExitCode` field name: value 1 here means
health failure, not a failed semantic evaluation.

- Health SHA-256: `41385826eb6e541572a9dc3419130ae9751ca62fb718dc280cc46619d78e6ccb`.
- Cleanup SHA-256: `8b58a8d2a6b9726229e7684a8ab2dc6a7d26058475fc057c31771ba357486cef`.
- Wrapper: `output/insights/run-local-readiness.ps1`; hash recorded in isolation evidence.
- Health driver: `output/insights/check-local-readiness.mjs`.
- `source-identity.json` records current source/compiled hashes and the health-driver hash;
  it was captured after cleanup. Application source files were unchanged from the baseline.
- Pinned build passed: `output/verification/9d0a9a4d-8434-41cf-9d52-ba5bab0cd9ce`.
- Provider, topic-service and runtime-configuration unit tests: 56 passed in three files.
- Pinned formatting check passed: `output/verification/3a3d6319-9f04-4e46-980f-2e820a03eb92`.
- Pinned configuration check passed with `aiProvider=disabled`:
  `output/verification/2f457855-ec23-4bb4-b577-32b36da32edc`.
  Both guards confirmed 16 phase gates and version `0.16.0`.

## Reviewable local configuration

This is a proposal for a later authorized session, not an enabled environment file.
Use the portable 0.33.3 runtime and exact digests above; compatibility profile
`ollama-0333-qwen36-schema-v1`. Do not use the installed wildcard listener on 11434.

| Boundary | Proposed setting |
| --- | --- |
| Owned Ollama listener | `OLLAMA_HOST=127.0.0.1:11435` |
| Model store | Existing `C:/Users/vasil/.ollama/models`; no pull or model change |
| Host controls | `OLLAMA_NO_CLOUD=1`, `OLLAMA_DEBUG=0`, empty proxy environment, existing outbound blocks |
| Host capacity | `OLLAMA_CONTEXT_LENGTH=8192`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1` |
| API provider | `WORKLEDGER_AI_PROVIDER_MODE=ollama` only for an explicitly enabled session |
| API destination/model | `WORKLEDGER_OLLAMA_ORIGIN=http://127.0.0.1:11435`, `WORKLEDGER_OLLAMA_MODEL=qwen3.6:latest` |
| API identity | `WORKLEDGER_OLLAMA_MODEL_DIGEST` and `WORKLEDGER_OLLAMA_COMPATIBILITY_PROFILE` match above |
| API limits | `WORKLEDGER_OLLAMA_TIMEOUT_SECONDS=30`, `WORKLEDGER_OLLAMA_CONCURRENCY=1` — health currently fails |

The historical evaluator used 120 seconds; that is not evidence that application startup
passes at 30 seconds. The context override is host-owned and not an API setting.
Do not copy this table into a persistent service until the cold-start issue is resolved.

## Support and rollback

Supported use remains one clear English question about one Employee topic. Suggestions
can be wrong, especially for unclear or non-English input. Confirm the topic, choose its
period and explicitly run the native Insight. Manual selection remains available; native
results retain account localization. Cold startup can be slow or unavailable. No generated
answer, record access, tool execution or decision authority is granted to the model.

For any later enabled session, restore `WORKLEDGER_AI_PROVIDER_MODE=disabled` and remove
or blank **all six** `WORKLEDGER_OLLAMA_*` fields before restarting the API. The parser
rejects provider-specific values left populated in disabled mode. Verify disabled health
and manual native Insights. Stop only the session-owned candidate after verifying its
process identity; confirm its process tree and 11435 listener are gone. Retain outbound
blocks; do not stop unrelated Ollama services. This review exercised candidate cleanup
and tested disabled-provider behavior; it did not exercise rollback of a live enabled API.

## Disposition and next task

WL-1508O is complete as a readiness decision with a failed enablement prerequisite.
WL-1508P is the next bounded task: diagnose the recorded cold-health deadline failure
and define a supported startup/deadline policy before proposing a repair. Start with
existing timing and lifecycle evidence; do not replay the semantic matrix, silently
raise timeouts, prewarm, change models or enable the application. Any runtime experiment
needs a stated causal hypothesis, frozen configuration and the same isolation/cleanup.

This slice changes documentation and stale environment comments only. No UI, API behavior,
dependency, schema, permission, phase gate or version changed. Broader browser/manual
accessibility, remote CI and report 201's existing skips remain unchanged. Full database
and browser suites were not rerun for this operational/documentation-only change.
