# WL-1508B — Screen after schema/completeness recovery

**Date:** 2026-09-06

**Status:** Failed first group, 6/9; B remains open. No second group or C run.

## Scope and provenance

The user continued after K completion and identification of fresh B as next. One fixed
submission-actions group ran across en-GB, de-DE and es-ES, three repetitions each. The harness
completed that group and failed its assertion. The wrapper rejected it; today-posted was not
started. There was no retry, tuning, acceptance change or full-matrix execution.

Starting checkout was clean at c3e1212a22b54073b44057819d076bdd1fc1751f. Node 24.18.0,
pnpm 11.20.0 and Vitest 4.1.10 were used. Workspace/toolchain/phase checks and TypeScript
compilation passed. This run uses spec 0003, selection-v1 and artifactVersion=2.

The exact K-qualified profile was ollama-0333-qwen36-schema-v1, Ollama 0.33.3 on
127.0.0.1:11435, qwen3.6:latest digest
07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522. Server/runner and model
manifest/config hashes matched report 178. All three candidate outbound blocks were active for
all firewall profiles and Any remote address; all firewall profiles were enabled. The candidate
started hidden with the same cleaned OLLAMA/proxy environment, cloud disabled, debug false,
one inference slot and unchanged model storage. Its runtime default context remained 32768.
The old server had no loaded model, and the new candidate reported an empty loaded-model list
before its evaluator health operation. API and runner listeners were loopback.

The evaluator's existing health checks passed. Request controls stayed at 120 seconds,
concurrency one, temperature zero, thinking false and at most 1024 generated tokens.
WORKLEDGER_RUN_AI_EVALUATION=1 was scoped to the wrapper child; semantic ID was exactly
submission-actions and run limit exactly 9. WORKLEDGER_RUN_SCHEMA_QUALIFICATION=0;
K was not rerun and application/deployment configuration was not enabled.

## Results and interpretation

| Group | en-GB | de-DE | es-ES | Total |
|---|---|---|---|---|
| submission-actions | 3/3 | 3/3 | 0/3 | 6/9 |
| today-posted | Not run | Not run | Not run | Not run |

All three Spanish records fail the same independent golden requirement:
Missing required action reference action_submission_requests.
The fixture asks where to review both the month and the pending request, and requires both
action_submission_review and action_submission_requests. Runtime outcome is SUCCESS, with null
providerFailureCode, validationFailureCode and validationDetail in all nine records. The six
passing records have GROUNDED disposition; the three omissions have FAILED disposition. Every
record has one registry execution and zero model tool rounds. No other golden error was recorded.

This is evidence of a question-specific action omission accepted by runtime grounding. It is not
evidence of a failed schema challenge, duplicate references or provider transport failure. K's
synthetic pass remains valid within its scope; it never guaranteed employee semantic coverage.
The exact generated prose/selection bits were not retained, so this report does not infer the
model's reasoning or a definitive cause of the Spanish-only pattern. Next work is bounded
diagnosis of this omission, without rerunning/tuning or weakening the independent golden check.

Wrapper interval: 12:06:56.075–12:08:49.569 UTC. Test duration: 109.57 seconds; Vitest duration:
111.71 seconds. Exit code 1, signal null. Employee-request latencies range from 970 to 37105 ms.
The artifact correctly records complete=false, runs=9 and failures=3; this is not full evidence.

## Preserved evidence and review

Evidence directory:
output/insights/wl1508b-recovery-submission-actions-cf41e612-d1f9-45f5-9510-54d558099b03.

- submission-actions.json SHA-256:
  d5ec5eab94f5509de7513b7fe5004d66afe941354b74ce4f1fcff3616da090c0.
- run.json records revision, profile/spec, source hashes, timestamps and termination.
- review.json records the failed review; the only issues are FAILED and RECORD.
- prior-smoke.json preserves the pre-existing fixed-name smoke artifact.
- output/insights/wl1508b-recovery-run.mjs preserves the bounded Windows invocation.

Strict artifact parsing passed. The wrapper checked exact model/inference, all nine distinct
locale/repetition combinations, format/version and post-run API version/digest. All recorded source
hashes remained unchanged: interpretation, selection, dependencies, adapter/profile/challenges,
artifact/logger boundaries, contracts, evaluator and golden fixture. Source/profile metadata in
run.json binds this artifact to spec 0003; the artifact shape itself remains v2.

The owned server PID 55188 and its runner were stopped after final path/listener/isolation checks.
The installed server was left alone, and candidate firewall rules remain active. No prompt, prose,
selection values or native employee content was added to retained evaluation evidence. Golden
reference names above identify synthetic fixture expectations. No UI, accessibility, authorization,
domain rule or data retention behavior changed. No broad deterministic/browser suite was rerun.

## Disposition

B remains unchecked; today-posted and C are blocked by this failed first group. D and the parent
pilot remain open. Earlier B passes and C failures stay historical evidence. K remains complete.
No additional phase is needed; version stays 0.16.0 and deployment provider mode stays disabled.
