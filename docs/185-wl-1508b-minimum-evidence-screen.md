# WL-1508B — D-514 fresh bounded screen

**Date:** 2026-09-06

**Outcome:** Failed, 0/9 submission-actions cases accepted. Stop rule applied; today-posted and C did not run.

## Scope and preflight

The user explicitly requested a fresh bounded B screen after report 184. This attempt used the
D-514 working sources without changing prompts, schemas, validators, fixtures or inference controls.
The exact qualified portable Ollama 0.33.3 executables matched their report 178 SHA-256 values;
profile ollama-0333-qwen36-schema-v1 and qwen3.6:latest digest
07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522 matched before and after the run.

All three exact executable outbound-block rules were active for Any profile/address, and all
Windows firewall profiles were enabled. Startup used a cleaned OLLAMA/proxy environment, cloud
disabled, request debug disabled, concurrency one, existing local models and loopback 127.0.0.1:11435.
The port was free before startup and the loaded-model list was empty before health. Startup
identified the RTX 4090 with CUDA and the unchanged 32768 runtime default context.

Pinned Node 24.18.0/pnpm 11.20.0 workspace, phase and compilation checks passed. Report 184 preserves
the prior deterministic verification. K was not rerun because its qualified provider and generation
schema were unchanged. B's ordinary capability/structured-output health passed before employee cases;
the first two chat requests took approximately 23.07 and 37.98 seconds.

Controls stayed at 120 seconds, concurrency one, temperature zero, thinking false and 1024 maximum
generated tokens. The child alone enabled employee evaluation, with semantic ID submission-actions,
explicit limit nine and schema qualification disabled. Each locale ran exactly three repetitions.

## Results and limits

| Locale | Accepted | Failure in all three repetitions |
| --- | --- | --- |
| en-GB | 0/3 | Runtime SUCCESS, but golden acceptance reports missing fact_submission_count |
| de-DE | 0/3 | INVALID_RESPONSE / FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID; REFERENCE_CARDINALITY, factReferences, EMPTY_REQUIRED |
| es-ES | 0/3 | Runtime SUCCESS, but golden acceptance reports missing fact_submission_count |

All nine traces report one server-owned registry execution and zero model tool rounds. English
and Spanish have null provider/validation failures and null diagnostic detail. Their only golden
error is the missing required count fact, so both required navigation actions passed in those six
cases. They selected some other fact(s), because final validation requires nonempty facts; the
content-free artifact does not retain which ones. German records establish empty facts as the
first violation only; source emptiness, later grounding and action coverage remain unknown.

D-514's diagnostic works, but its prompt did not meet the employee acceptance gate. This result
is not evidence that the earlier action omission is fixed in every locale, and no historical
null-detail record is backfilled. No retry, tuning, timeout change or acceptance relaxation followed.

## Evidence and cleanup

Evidence directory:
output/insights/wl1508b-evidence-submission-actions-49530726-eee8-4f08-b927-9344cec279a4.

submission-actions.json SHA-256:
a89e5751b9dbfd4bb0f3f918b4b9c0bac1fe7c19052f6c04bff65d88b597caaa.

run.json records 12:45:42.967–12:47:18.971 UTC, spec 0003/D-514, base revision
ad644a898186cf5215219c2304d4b518a703e6ce, and hashes for all eleven relevant source files. D-514
was uncommitted; source hashes identify the evaluated working state. The harness exited 1 without
a signal. Strict v2 parsing, selection-v1, locale/repetition coverage, controls, unchanged source
hashes and post-run identity checks passed. review.json contains only FAILED and RECORD issues.
The previous fixed-name smoke artifact was preserved as prior-smoke.json; complete=false accurately
marks this as a partial screen. The isolated wrapper is output/insights/wl1508b-evidence-run.mjs.

Final firewall checks remained valid. Cleanup first refused a generic child-process path check
because Windows also created conhost.exe; no unrelated process was terminated. Explicit verified
server PID 59416 and runner PID 40868 were then stopped, and port 11435 was confirmed free.
The portable files and existing firewall blocks remain. No deployment setting changed.

## Next task

Diagnose the evidence-selection failure: why relevant minimum guidance still yields no facts in
German and omits the golden-required count fact in English/Spanish. Review the question, supplied
fact semantics and unchanged acceptance contract before proposing another bounded recovery.
Do not infer exact model reasoning or selected facts from the retained artifact. B/C/D and the
parent pilot remain open, K complete, provider deployment disabled and version 0.16.0 unchanged.
