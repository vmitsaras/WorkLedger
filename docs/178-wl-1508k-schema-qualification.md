# WL-1508K — Candidate preparation and schema qualification

**Date:** 2026-09-06

**Status:** Complete; cold-start health and 18/18 synthetic challenges passed on continuation.

## Scope and result

The user's explicit next task was WL-1508K. This work repairs qualification persistence and selects
an exact source-reviewed stable candidate for isolated synthetic qualification. Initial preparation
stopped at canceled Windows administrator consent. On the user's continuation, consent succeeded,
the isolation preflight passed, and one uninterrupted K qualification passed. No B/C employee
evaluation ran. K is complete; deployment remains disabled and workspace versions stay at 0.16.0.

## Qualification evidence

Windows administrator consent succeeded on continuation, and all three candidate rules were
verified in ActiveStore: enabled, outbound, block, all profiles, exact executable paths and Any
remote address. Domain, Private and Public firewall profiles were enabled. Before startup, exact
server/runner and model manifest/config hashes matched the table below; the old server's /api/ps
was empty and port 11435 was free. The portable server started hidden with a cleaned OLLAMA/proxy
environment, OLLAMA_NO_CLOUD=1, OLLAMA_DEBUG=false, OLLAMA_NUM_PARALLEL=1, the existing model
directory and OLLAMA_HOST=127.0.0.1:11435. Logs confirmed cloud disabled, request debug false,
empty proxies, CUDA on RTX 4090, and the runtime's default 32768 context. No inference tuning ran.

The candidate API confirmed 0.33.3, the exact model digest and an empty loaded-model list before
the cold probe. The API and runner listeners remained on loopback, and observed established
connections were loopback. The first model load took about 47.56 seconds. Both health chats shared
the unchanged 120-second deadline; the existing keep_alive=0 behavior was retained. Health and
case requests used the unchanged application adapter, not manual substitute requests.

| Gate | Result |
|---|---|
| Cold health, including capability and compact schema probe | Passed; 96,650 ms including checkpoint overhead |
| Empty collection | 3/3 passed |
| Singleton | 3/3 passed |
| Compact envelope | 3/3 passed |
| Types and keys | 3/3 passed |
| Locale and prose | 3/3 passed |
| Native maximum, 190 boolean positions | 3/3 passed |
| Final version/model identity | Passed |
| Overall run | Complete; 181,612 ms including health and persistence |

Qualification artifact:
`output/insights/schema-qualification-583914e3-66d3-485c-8f4b-679b2de3c301/artifact.json`.
SHA-256: `20f61e789bb627f8e07ed9ff603114e353fd1b5ac132f0a2a53003f62db944f9`.
It records healthPassed=true, identityPassed=true, complete=true and 18 ordered results with null
failure categories. All 21 immutable checkpoints and the final artifact passed independent strict
parsing; the last checkpoint's results match the final artifact. The challenge requests total
594 input and 4,470 output tokens, excluding health. Per-case latencies range from 291 to 20,676 ms;
the first empty case includes another model load. No retries, prompt/schema edits or threshold
changes occurred. WORKLEDGER_RUN_AI_EVALUATION remained 0 throughout.

Source hashes were recorded during the run and verified unchanged afterward in
`output/insights/wl1508k-runtime/session-d710547e-64bd-4e39-8bc7-8544d6b1362f/source-hashes.json`.
This covers the adapter, profile, challenge definitions, runner, CLI and output helper. The same
session directory contains process metadata and ordinary server logs; debug/trace was disabled.
The qualification evidence retains technical metadata only, with no raw model output, thinking,
selection values or employee data. No employee context was sent.

Post-run API version, model manifest and active firewall rules remained unchanged. The owned
portable server PID 52336 and its final runner PID 57236 were stopped after listener/path checks;
the pre-existing installed server PID 42664 was left running. The three scoped outbound rules and
portable files remain available for the next isolated run. No service installation, .env update,
deployment enablement, model mutation, commit or phase/version bump occurred.

K closes for this exact profile and installation evidence only. Fresh B is next, followed by C
only if B passes. Schema qualification does not establish employee semantic completeness or
overwrite the earlier failed C evidence. Preserve the same runtime/environment controls for B/C;
reconfiguration requires qualification review.

## Candidate and source review

Selected evaluation profile: `ollama-0333-qwen36-schema-v1`. This profile admits synthetic evaluation;
it is neither qualification evidence nor deployment approval. The installed 0.24.0 server and its
existing H firewall rules were not modified.

The official [Ollama v0.33.3 release](https://github.com/ollama/ollama/releases/tag/v0.33.3) was
published on 2026-09-02 and is marked stable, not prerelease. Its official Windows amd64 portable
archive was downloaded into the ignored output directory and its release asset digest verified
before extraction. The executable's Authenticode signature is valid, signed by Ollama Inc.

| Identity | Pinned value |
|---|---|
| Server version | 0.33.3 |
| Model | qwen3.6:latest |
| Model manifest SHA-256 | 07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522 |
| Model configuration SHA-256 | 5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa |
| Manifest-bound parser / renderer | qwen3.5 / qwen3.5 |
| Portable archive bytes | 1469175900 |
| Portable archive SHA-256 | 52cb36a62e7e501f61514f60212dec7117b6c098811357585e02fffe32d2fcd7 |
| Extracted ollama.exe SHA-256 | e4fe6bd835fe146659f5c969dccaff2e25a9de63d90ee204ca5d11b9034b0ca5 |
| Extracted llama-server.exe SHA-256 | d02f2d584ba38c12f3ccc2c66342e7c9f1911372c90349b8e89cee3a338e73a9 |

Portable location: `output/insights/wl1508k-runtime/0.33.3`.
Archive: `output/insights/wl1508k-runtime/ollama-windows-amd64-0.33.3.zip`.
Model manifest/config metadata were inspected locally without changing the model or downloading
weights. The continuation also confirmed the candidate's model digest through its API.

The pinned [chat route](https://github.com/ollama/ollama/blob/v0.33.3/server/routes.go#L2587)
sets immediate schema enforcement for a thinking-capable built-in parser when thinking is explicitly
false, preserving the format on the first completion. This removes the specific 0.24.0 bypass
identified in report 173. The [parser](https://github.com/ollama/ollama/blob/v0.33.3/model/parsers/qwen35.go)
reports thinking support and initializes directly in content state with thinking false. The
[renderer](https://github.com/ollama/ollama/blob/v0.33.3/model/renderers/qwen35.go#L199)
honors the explicit thinking boolean when constructing its assistant prefix.

The [completion transport](https://github.com/ollama/ollama/blob/v0.33.3/llm/llama_server.go#L1478)
for this explicit renderer/parser forwards an object format through llama-server's json_schema
field over loopback /completion. It does not discard that schema. The
[build configuration](https://github.com/ollama/ollama/blob/v0.33.3/llama/server/CMakeLists.txt#L103)
reads [LLAMA_CPP_VERSION](https://github.com/ollama/ollama/blob/v0.33.3/LLAMA_CPP_VERSION), pinned
to b10760. That [converter](https://github.com/ggml-org/llama.cpp/blob/b10760/common/json-schema-to-grammar.cpp#L859)
handles required object properties, additionalProperties=false, boolean items, literal/enum values,
and array minItems/maxItems through bounded repetition. This covers the synthetic suite's schema
features. It does not imply all JSON Schema keywords or employee semantics are enforced.

An [open upstream Qwen JSON-output report](https://github.com/ollama/ollama/issues/17871)
describes intermittent reasoning-like JSON on an earlier 0.32.14 Linux/ROCm installation. It is a
qualification risk, not evidence that this Windows exact-schema tuple passes or fails. The runtime
also changes its inference engine and model-load compatibility handling. Source review therefore
permits the fixed synthetic qualification only; it cannot replace cold-start and 18/18 evidence.

## Persistence repair and verification

The qualification command now reserves a unique directory and flushes reservation.json before
constructing the provider. The runner saves a strictly parsed initial incomplete checkpoint before
health, another after health, one after every challenge, and a final identity checkpoint. Each file
uses exclusive creation and fsync; prior evidence is never overwritten. Final artifact.json also
uses exclusive creation. A checkpoint failure propagates before the next inference operation.

SIGINT/SIGTERM abort the shared provider signal so the runner can persist an incomplete outcome.
Abrupt process termination or later disk failure can still leave the newest file partial or prevent
its creation. Recover only the newest successfully parsed checkpoint; an in-flight case without
a completed checkpoint has an unknown result. Never infer a pass, resume the matrix automatically,
or overwrite/reclassify existing evidence. This closes report 175's output-preparation blocker
without claiming protection against every storage/power failure.

Verification on Node 24.18.0 / pnpm 11.20.0:

- TypeScript build passed after correcting closure narrowing found by the first compile.
- Three focused unit files passed 44 tests, including failure before health and after the first
  challenge checkpoint; they verify that persistence failure stops subsequent provider work.
- Two new Node script tests passed: reserved/immutable output and an unwritable root represented
  by an existing file. These tests are included in the root test command.
- The complete repository script suite passed 57 tests, including those two new tests. Scoped
  source formatting, final TypeScript compilation, diff whitespace and firewall-helper parsing passed.
- Repository lint, toolchain/workspace/phase, source-boundary and CSS guards passed. The earlier
  scoped ESLint command reported ignored TypeScript-file warnings; root lint covers configured
  JavaScript and TypeScript compilation supplies the repository's current TypeScript check.
- No broad unit/integration rerun or browser test was needed for these bounded script/profile changes.
  Report 177 retains J's full deterministic evidence; it is not K model evidence.

## Initial isolation blocker and operational reference

All Windows firewall profiles were enabled. The reviewed helper
`scripts/ollama-schema-firewall.ps1` manages only three named outbound-block rules for this exact
portable directory: ollama.exe, lib/ollama/llama-server.exe and lib/ollama/llama-quantize.exe.
It refuses an existing rule with a different path/direction/action. Rollback removes only those
matching rules. It does not touch the installed runtime's H rules or global firewall settings.

The Windows RunAs request ended with: "The operation was canceled by the user." No K rule was
observed afterward. This was Windows administrator consent, not an automatic approval-review
rejection. The later user continuation resolved it as recorded above. Future starts still require
the effective isolation rules to be verified.

From an administrator PowerShell, the prepared operation is:

```powershell
& 'D:\github\WorkLedger\scripts\ollama-schema-firewall.ps1'
```

Rollback, after stopping the owned candidate processes:

```powershell
& 'D:\github\WorkLedger\scripts\ollama-schema-firewall.ps1' -Rollback
```

After consent is available, verify exact executable hashes and effective outbound rules, launch
the portable server hidden on 127.0.0.1:11435 with OLLAMA_NO_CLOUD=1, no proxy, debug disabled,
concurrency one and the unchanged local model directory. Recheck loopback listeners, API version,
model metadata and absence of a loaded model before cold health. Do not interfere with the old
11434 server or unrelated GPU workloads. Use process-scoped qualification configuration only:

- WORKLEDGER_AI_PROVIDER_MODE=ollama; WORKLEDGER_OLLAMA_ORIGIN=http://127.0.0.1:11435
- WORKLEDGER_OLLAMA_MODEL=qwen3.6:latest; model digest from the table above
- WORKLEDGER_OLLAMA_COMPATIBILITY_PROFILE=ollama-0333-qwen36-schema-v1
- WORKLEDGER_OLLAMA_TIMEOUT_SECONDS=120; WORKLEDGER_OLLAMA_CONCURRENCY=1
- WORKLEDGER_RUN_SCHEMA_QUALIFICATION=1; WORKLEDGER_RUN_AI_EVALUATION=0

Rebuild dist before invoking node scripts/qualify-ollama-schema.mjs. Run one cold health operation
and the fixed 18 synthetic cases with unchanged schema-v1 controls. Stop on the first failure.
Preserve and independently parse the artifact, verify post-run identity/isolation, and stop the
owned candidate afterward. Only passing evidence can close K and unblock separately requested
fresh B, then C. No UI, accessibility, domain data, authorization or deployment setting changed.
