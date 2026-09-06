# WL-1508K — Candidate preparation and schema qualification

**Date:** 2026-09-06

**Status:** Prepared; qualification blocked before startup by canceled Windows administrator consent.

## Scope and result

The user's explicit next task was WL-1508K. This work repairs qualification persistence and selects
an exact source-reviewed stable candidate for isolated synthetic qualification. No candidate server
was started, no health/inference request ran, and no B/C employee evaluation ran. K remains open;
provider deployment remains disabled and workspace versions stay at 0.16.0.

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
weights. The candidate server has not yet independently confirmed these identities through its API.

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

## Isolation blocker and continuation

All Windows firewall profiles were enabled. The reviewed helper
`scripts/ollama-schema-firewall.ps1` manages only three named outbound-block rules for this exact
portable directory: ollama.exe, lib/ollama/llama-server.exe and lib/ollama/llama-quantize.exe.
It refuses an existing rule with a different path/direction/action. Rollback removes only those
matching rules. It does not touch the installed runtime's H rules or global firewall settings.

The Windows RunAs request ended with: "The operation was canceled by the user." No K rule was
observed afterward. This was Windows administrator consent, not an automatic approval-review
rejection. Do not start the candidate until the helper succeeds and the effective rules are verified.

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
