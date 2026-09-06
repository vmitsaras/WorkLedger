# WL-1508B — Acceptance-aligned screen health timeout

**Date:** 2026-09-06

**Status:** Stopped at provider health before any employee case; B remains open

## Scope and result

The user continued after D-515 implementation and deterministic verification. This task prepared
one fresh `submission-actions` screen under spec 0004, but the required provider health check
returned `unavailable` / `TIMEOUT` before the evaluator entered the golden-set loop. Therefore this
is neither a 0/9 semantic result nor evidence for the D-515 acceptance contract. No
`submission-actions` employee case started, no evaluation artifact was created, and
`today-posted` and C did not run. The stop rule was applied without retry or tuning.

The starting checkout was clean at `008cf550df375768c32f4072544bf2e048707265`. The ignored bounded
runner's provenance label was updated from the historical D-514 label to `0004/D-515`; its run
record contains fresh hashes for all eleven relevant sources. Workspace, toolchain, phase-version
and forced TypeScript build guards passed on Node 24.18.0 and pnpm 11.20.0 immediately before the
attempt. The sandbox initially denied starting Node before the runner or model was reached; the
identical escalated launch was a process-launch correction and not an inference retry.

## Candidate and isolation preflight

The exact report 178 candidate was rechecked before startup:

- portable Ollama 0.33.3 `ollama.exe` SHA-256
  `e4fe6bd835fe146659f5c969dccaff2e25a9de63d90ee204ca5d11b9034b0ca5`, with a valid
  Authenticode signature;
- `llama-server.exe` SHA-256
  `d02f2d584ba38c12f3ccc2c66342e7c9f1911372c90349b8e89cee3a338e73a9`, with a valid
  signature;
- `llama-quantize.exe` SHA-256
  `0637f101d31d3d871d93a709ae09f76df3718c77f1737d6f90e99c3fa8f1161d`, with a valid
  signature;
- `qwen3.6:latest` manifest/model digest
  `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522` and configuration
  digest `5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa`;
- all three exact executable-scoped outbound-block rules enabled for Any profile/address, with
  Domain, Private and Public firewall profiles enabled; and
- no portable process, no port 11435 listener and no model loaded by the installed port 11434
  server.

The portable server started hidden with a cleaned OLLAMA/proxy environment,
`OLLAMA_NO_CLOUD=1`, request debug disabled, one inference slot, the existing local model store and
`OLLAMA_HOST=127.0.0.1:11435`. Its startup log reports empty HTTP/HTTPS proxy values, cloud disabled,
the unchanged 32,768 context and a loopback-only 0.33.3 listener. API checks found exactly one
matching model digest and zero loaded models before health.

## Health failure

The integration harness calls `checkHealth()` before constructing or iterating the filtered golden
set. That health operation applies one unchanged 120,000 ms deadline across address/version/model
checks, the capability chat and the compact structured-output chat. Both chats use `keep_alive=0`,
so the candidate may unload between them.

Version, tags, show and the first capability chat succeeded. The server access log records the
first chat as HTTP 200 after about 80 seconds. The second compact-schema chat ended as HTTP 499
after about 39.24 seconds when the shared deadline expired. The server reports that the client
closed while `llama-server` was still loading and records the load failure as context cancellation.
The adapter consequently returned health status `unavailable`, no capabilities and reason
`TIMEOUT`. Vitest failed the health assertion after 120.018 seconds, before an employee question or
tool execution. The wrapper exited 1 without a signal and correctly found no fresh smoke artifact.

No prompt, fixture, schema, validator, timeout, concurrency, temperature, thinking setting, token
limit, model installation or acceptance threshold changed. The previously completed K artifact
remains historical qualification evidence for the exact tuple; this attempt establishes only that
the same candidate did not complete the mandatory cold B health check within its fixed deadline.

## Evidence and cleanup

Retained content-free run directory:
`output/insights/wl1508b-evidence-submission-actions-993c2305-f25c-45f7-a049-b47147608634`.

| File | Meaning | SHA-256 |
| --- | --- | --- |
| `run.json` | D-515 provenance, eleven source hashes, 13:32:20.309–13:34:21.678 UTC, exit 1 | `e1bf76c892314d83e4ef67a2a5c66463f0807a42d43126a86d034092e235c1f4` |
| `review.json` | Post-run health-stage review; zero employee cases, no retry | `289808243b51d143a6b0c94275b8b16c689fbd8a7b5bd9a0ce59517e3f8b6532` |
| `prior-smoke.json` | Preserved D-514 report 185 artifact, not this attempt | `a89e5751b9dbfd4bb0f3f918b4b9c0bac1fe7c19052f6c04bff65d88b597caaa` |

The server session is
`output/insights/wl1508k-runtime/evidence-session-7d3da03e-9fc5-44e3-a061-5843e4b15f19`.
Its final `stderr.log` and `stdout.log` SHA-256 values are respectively
`178e64c049b1958395fb14abec4845916675fbecc4fa7d0e943e2ec0c5b069ac` and
`9229f8428171b367db0da89b18903a1b58a2dfe14baa1b6115c2eb2b40f6c1d8`.
All eleven recorded source hashes matched after the run; the prompt and golden fixture hashes are
`611f44b69e4b61f11bfda79feb989465b687e68f1e70565862e723e4789646b7` and
`3854bba746e9ba2b18d4ca5fe7db3a83cd9ec0d35eb453ea89dec336bc7619d4`.

PowerShell's first exact-PID `Stop-Process` call failed with an internal null-reference error while
leaving the verified process running. After rechecking its executable path, command line and sole
loopback listener, exact-PID `taskkill` terminated only the owned server PID 62424 and its child PID
67184. Final checks found zero portable processes, zero port 11435 listeners, zero models loaded on
the installed server, all firewall profiles enabled and all three scoped block rules unchanged.

## Impact and next task

No production provider configuration was enabled. No employee data, question, prompt, model output,
selection, tool content, native value or identity was retained. Native deterministic Insights and
their fallback remain unchanged. There was no UI, accessibility, authorization, database,
migration, dependency, phase or version change.

WL-1508B remains open because D-515 has no real-model semantic evidence. Diagnose this pre-screen
health timeout and decide a bounded next step before authorizing another model attempt. Do not treat
another launch as a retry of this stopped sequence, silently widen the deadline or bypass health.
`today-posted`, C and D remain blocked, K remains complete as historical qualification evidence,
and provider deployment remains disabled at `0.16.0`.
