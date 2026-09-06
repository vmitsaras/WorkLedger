# WL-1508N — Optional local AI topic suggestions for Employee Insights

**Date:** 2026-09-06  
**Decision:** D-520 / ADR 0015  
**Status at this report's run:** Implementation verified; model acceptance blocked by latency and a deadline stop

**Current follow-up:** [Report 200](200-wl-1508n-runtime-performance-recovery.md) records a fresh,
complete context-8192 matrix: English 40/40 and p95 510 ms pass; UNKNOWN 12/20 fails.
[Report 201](201-wl-1508n-best-effort-english-suggestions.md) records the subsequent best-effort
contract amendment and separate reuse assessment. These follow-ups supersede this report's
next-performance-diagnosis scheduling statement. All results and thresholds below remain
historical evidence without modification.

The user approved English-only AI interaction and the smaller topic-suggestion feature. The
latest legacy screen's German and Spanish failures do not establish that language alone caused
deferral. The legacy evaluation required multilingual completeness from its original contract.

## Scope

`POST /v1/insights/suggest-topic` accepts only `{ language: "en", question }`, with the existing
500 Unicode-code-point bound. It returns only `{ topic }` from the four employee topics or UNKNOWN.
The provider receives static topic descriptions and the question; it has zero tools and no native
record context. The API reauthorizes active employee self scope before and after generation.

The English-only interaction is available within every account locale. Use this topic confirms
the suggestion into the native form, clears the prior period/context, and focuses the topic field.
The employee chooses the date/range/month and runs the native result separately. All calculations,
facts, caveats, sources and actions are assembled by WorkLedger and displayed in the account locale.
Manual selection and existing native evidence remain usable if suggestions fail.

For example, “Why can I not send my month for review?” can suggest **Monthly submission blockers**.
Selecting **Use this topic** does not submit anything or run an Insight. The employee chooses the
month and selects **Run insight**; WorkLedger then reads the authorized records and supplies the
complete native result. Dates mentioned in the question are not extracted or carried forward.

| Supported question purpose | Suggested topic |
| --- | --- |
| Changes in posted flexible-time balances | Changes in my flexible-time balance |
| Issues preventing monthly submission | Monthly submission blockers |
| Available leave at a future date | Projected leave balance |
| Expected/worked time and provisional progress for a day | How my day is calculated |

Questions outside this English-only scope should produce UNKNOWN. A mistaken suggestion can
still occur; the person checks the topic and can select another one. No model choice establishes
permission or supplies a calculation.

The former interpretation UI is replaced. `/v1/insights/interpret` remains discoverable as a
deprecated unavailable endpoint and cannot be activated by enabling the provider. Legacy service
and evaluation code remain; old failures and M/B/C/D/parent checkboxes are not relabeled as passes.

## Evaluation protocol

ADR 0015 fixes the 60-case matrix and acceptance criteria before the first attempt. Fixtures are
`scripts/fixtures/employee-topic-evaluation.mjs`; runner is
`scripts/evaluate-employee-topics.mjs`. Use the manifest-pinned toolchain and freshly built sources.
The runner requires `WORKLEDGER_RUN_TOPIC_EVALUATION=1`, the existing reviewed exact Ollama
configuration, and a JSON file containing `{ path, sha256 }` for fresh operator isolation evidence.
Normal verification explicitly disables this new flag alongside the historical model gates.

The operator verifies exact binary/model identity, enabled outbound isolation, sole loopback
listener ownership and no competing loaded model before execution. The runner validates the
evidence hash and provider identity; it does not replace those host checks or start the server.
It runs mandatory health, two sequential repetitions of all fixed cases, final provider identity
and source-hash checks. Per-case files and the final result are written with exclusive creation.
Artifacts contain case IDs, correctness flags, error categories and latency, without questions,
raw output, selected topics or employee data. No retries or output repair occur.

```powershell
# After current host isolation, exact configuration and build checks:
$env:WORKLEDGER_RUN_TOPIC_EVALUATION = '1'
corepack pnpm run test:ai:topics output/insights/topic-isolation-reference.json
```

## Verification

The complete local command passed with real PostgreSQL on Node 24.18.0 / pnpm 11.20.0:

```powershell
$env:WORKLEDGER_TEST_DATABASE_URL = 'postgres://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test'
corepack pnpm run verify
```

Final immutable verification result: `output/verification/97a6d6fd-32e9-4381-8ee9-d456d291a3c1/result.json`,
`passed: true`, exit 0. Configuration, reproducible OpenAPI, formatting, lint, typechecking,
70 script tests, 618 unit/component tests, 64 PostgreSQL integration tests, all 52 browser tests
and build passed. This includes the purpose-specific provider health change. The earlier full
result `output/verification/33343f68-cfd8-45d3-b4a4-5e961538b053/result.json` passed before that change.
The pre-existing upgrade-from-0.9.0 and legacy real-model integration skips remain; the opt-in
Phase 13 browser baseline remains skipped. No new skip was added. Remote CI was not run.

The service/contract suite has ten tests covering exact output shape, all allowed topics, Unicode
input bounds, no tools or added native context, authorization before/after generation, rate limits,
concurrency, cancellation, disabled-provider and invalid-output behavior. Updated component tests
cover confirmation, fresh period selection, request-memory privacy, cancellation/late responses,
fallback, permission loss and English interaction in all three account locales. Authenticated
PostgreSQL coverage verifies session/origin/CSRF, strict bodies, no-store, unavailable legacy
interpretation, topic response and employee permission loss.

The browser scenario exercises keyboard confirmation, 320-pixel reflow, axe, forced-colors and
reduced-motion, retained native evidence on provider failure, URL/storage privacy and reload reset.
Its `english-topic-suggestion-320.png` artifact was visually inspected. This is bounded browser/axe
evidence; it does not establish a full manual assistive-technology matrix. No dependency, CSS
budget or version allowance was added.

Earlier development attempts stopped on corrected TypeScript/catalog naming, duplicate permission
feedback and updated inventory assertions. A focused invocation initially named a nonexistent API
Vitest configuration; the corrected root configuration passed 44 provider/topic tests. The existing `openapi:generate` convenience script
selected global pnpm 9.15.1; regeneration used the pinned test build and direct pinned Node instead.
The final full runner passed OpenAPI reproducibility. These earlier stops are not passing evidence.

The bounded model attempts are recorded separately below. Default provider deployment remains disabled. No database migration, package, version or domain
calculation changes are part of this slice.

## Initial health stop and purpose correction

The first attempt `output/insights/english-topics-482e48df-0baa-4712-a13c-916fc88edbba`
started at 2026-09-06T20:11:31.845Z. Capability health returned HTTP 200, but the old compact
selection-array challenge exhausted the 120-second shared deadline. Health returned TIMEOUT;
zero topic cases ran. This is not a 0/60 topic result or evidence of an English semantic failure.
Host evidence `output/insights/english-topics-host-57d727b4-3760-4902-bc11-613b11952646`
records cleanup with zero remaining owned processes/listeners.

ADR 0015 now makes the application's second health challenge purpose-specific: strict topic enum
with no extra fields, including a schema-conflicting synthetic request. Six fake-server cases
check acceptance/rejection, tools, reasoning and invalid output. The legacy compact probe remains
the default for historical qualification. All identity, network, deadline and residency controls
remain. A fresh attempt uses this purpose, unchanged English prompt, fixed cases and thresholds;
no old qualification result substitutes for current topic health.

## Purpose-specific model attempt

Evidence directory: `output/insights/english-topics-f90485c9-5fd4-4bf0-b0d1-7f6a2c59bbdd`.
Host evidence: `output/insights/english-topics-host-7c8fd96e-326d-4960-8389-5351cc23ae3f`.

| Frozen input/control | Value |
| --- | --- |
| Start | 2026-09-06T20:27:09.838Z |
| Runtime | Ollama 0.33.3, existing verified signed portable binaries |
| Model | qwen3.6:latest |
| Model digest | `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522` |
| Model config digest | `5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa` |
| Compatibility profile | ollama-0333-qwen36-schema-v1 |
| Prompt / health purpose | english-topics-v1 / english-topics-v1 |
| Private origin | http://127.0.0.1:11435 |
| Inference | Temperature 0, thinking disabled, 1,024 maximum generated tokens, concurrency 1, 120-second deadline |
| Host limits | One loaded model, one parallel request, 32,768 context, cloud disabled, proxy variables cleared in the owned process environment |
| Isolation | Existing exact-program outbound block rules; all firewall profiles enabled; sole owned loopback listener; cold start; no competing loaded model |
| Health | Ready at 20:27:29.144Z, approximately 19.3 seconds including initial setup |

The runner records source/compiled hashes and isolation evidence reference SHA-256 in started.json.
Only the owned portable server/process tree is stopped afterward; no persistent deployment setting,
installed runtime, model, or firewall rule is changed. The first topic request after the health
probe unloaded the model took 36.757 seconds. This cold-start cost is reported separately even if
the full distribution meets the preset p95 criterion.

The observed run already exceeds the preset p95 latency criterion: more than three of the first
18 requests took over ten seconds. Completing all cases can establish topic/abstention accuracy,
but cannot turn that performance result into a pass. No latency threshold or fixture is relaxed.
The implementation remains usable with manual topic selection and a disabled provider; a user can
also cancel a slow suggestion and continue directly with the native form.

A read-only check of content-free runtime timing metadata found a 14-token reply taking about
79.3 seconds of generation time. This rules out long answer length as a sufficient explanation
for that request. The runtime detects an RTX 4090 and adjusts model placement to fit device memory.
The underlying latency cause is not established by this run; do not claim that English-only scope,
a smaller token ceiling, or a particular memory setting fixes it. No runtime settings were tuned
mid-run. Any later performance work should preserve these results and use a separately recorded
configuration.

The evaluation explicitly uses the existing maximum 120-second provider deadline. Normal
enabled-provider configuration still defaults to 30 seconds; that default is unchanged, and
requests slower than it can return unavailable. Increasing a deadline does not satisfy the
ten-second responsiveness criterion. Default provider mode remains disabled.

## Final model result and disposition

The run ended at 2026-09-06T20:46:40.341Z with `passed: false`, `complete: false`.
It attempted 33 of the fixed 60 requests. The first 32 returned valid, correct topics:

| Group | Correct valid responses | Attempted / planned |
| --- | --- | --- |
| Balance changes | 10 | 10 / 10 |
| Submission blockers | 10 | 10 / 10 |
| Leave projection | 10 | 10 / 10 |
| Daily calculation | 2 | 3 / 10 |
| UNKNOWN / abstention | 0 | 0 / 20 |

Request 33, `today-2/1`, recorded `PROVIDER_OR_VALIDATION_FAILURE` at 120.046 seconds. The
runtime log records cancellation; no validated answer was returned within the configured deadline.
The evaluator intentionally retains the combined safe failure category rather than raw dependency
errors. The attempt stopped without retries. The remaining seven supported requests and all twenty
UNKNOWN checks did not run. No incorrect topic was observed among returned responses; this is not
proof of complete English accuracy or successful non-English/ambiguous-question rejection.

The attempted-request p95 was **102.172 seconds**, including the failed request, against the
fixed ten-second target. This is a partial-run statistic, not the full matrix's p95. Final provider
identity and source/compiled hash checks both passed. Host cleanup confirms zero remaining owned
processes and zero listeners on the evaluation port. No persistent deployment setting changed.

- Final result SHA-256: `55f5117e50908a34b1f1b2b39dee7494dd637dabf565f9cbd7032c178552b1be`.
- Cleanup SHA-256: `3a03055ba6ade95d56f3b1ef1302e539b35eba3fef922698a01dd5909050dee6`.

The repository contains the implemented optional English topic-suggestion enhancement and all
deterministic checks pass. The exact local candidate has not met the new acceptance criteria.
WL-1508N remains unchecked for acceptance, with implementation complete; legacy M/B/C/D/parent
remain deferred independently. Native Insights remain usable and provider mode stays disabled.

The next bounded work is local runtime performance diagnosis using the short-output timing
evidence, followed by a fresh full evaluation on any deliberately revised configuration. Do not
combine this partial run with a later run, loosen thresholds silently, retry the same attempt,
or reopen the legacy answer interpreter as a prerequisite. English-only scope alone does not
resolve the runtime problem. No new model, inference run or deployment is queued automatically.

Documentation-only closure also passed `git diff --check`; 108 relative documentation links were
checked without missing targets. Later status wording changes do not change the evaluated prompt,
fixtures, provider controls or compiled application.
