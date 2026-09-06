# WL-1508H — Employee pilot rerun preparation

**Date:** 2026-09-06  
**Status:** Complete; synthetic health and operator isolation evidence recorded  
**Scope:** D-510 plus explicit health-only authorization; no employee evaluation executed

## Provenance and source review

Reviewed checkout `f694ee21bcce583b0a141600067aab1a12955bd9` against the server-owned
orchestration recovery commit `f01a565`. The provider adapter, golden fixture set, and real-model
evaluator have no tracked changes between those revisions. The interpretation service gained an
explicit Employee workspace rejection and narrower Employee types. The registry changes narrow
types; shared native contracts gained Manager, HR, and System support. These observations are
source review, not new runtime verification. Later service/route and contract changes still require
the applicable non-model authorization and native-fallback checks before pilot closure.

Existing uncommitted changes concern project planning, `.vscode/settings.json`, and a reported
`package.json` modification with no textual diff. No AI implementation or fixture has an uncommitted
change. Preparation initially changed documentation only. The subsequent static workspace check exposed
a CRLF portability defect; this task now also normalizes CRLF in the workspace contract checker
and adds an unexecuted regression case covering valid CRLF and rejected configuration drift.
Existing user edits are preserved.

## Local inventory and provisional candidate

Local manifest files were read and SHA-256 hashed without loading a model. A manifest digest is
provisional provenance; it must match the serving API before qualification. Blob completeness and
capabilities have not been established.

| Local tag | Manifest SHA-256 | Treatment |
|---|---|---|
| `qwen3.6:latest` | `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522` | Provisional candidate; digest absent from historical pilot evidence |
| `gpt-oss:latest` | `17052f91a42e97930aa6e28a6c6c06a983e6a58dbb00434885a0cf5313e376f7` | Inventory only; no automatic fallback |
| `qwen3-coder:latest` | `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca` | Same digest as the historically timed-out candidate; tag is not a new model |

`qwen2.5-coder:14b` is absent from the inspected default local manifest directory. The provisional
choice introduces no installation and avoids presenting the already-failed qwen3-coder digest as
a fresh candidate. It makes no quality, capability, privacy, or performance claim about qwen3.6.

The Ollama executable exists in the standard per-user installation, but is not on this shell's
PATH. Read-only requests to `127.0.0.1:11434` for version, tags, and loaded models all returned
connection unavailable. The active service location, serving version, private-only configuration,
and empty loaded-model state are therefore unverified. No service was started or model unloaded.

Host metadata: Windows `10.0.26200`, x64, Intel Core i9-13900K, 32 logical CPUs, 32 GiB RAM.
GPU metadata is unavailable because the CIM read was denied. Node on this shell's PATH is
`24.19.0`, while the repository requires `24.18.0` and `pnpm@11.20.0`. `pnpm.cmd` was not resolved
on PATH. Resolve the pinned toolchain before running the commands below; do not relax its guard.

## Windows invocation prepared for a later test session

The root script uses POSIX inline environment assignment. Use PowerShell process variables with
explicit restoration, then invoke the same workspace guard, build, and exact evaluator directly.
No package dependency or package-script change is needed. The B execution exposed an empty-value
run-limit issue; the screen command below now explicitly selects all nine cases.

Prerequisites: H has fresh successful cold-start qualification; the exact serving tag/digest match;
the operator-controlled origin and egress boundary are established; the pinned toolchain is
available; and a test run has been requested. Start with `submission-actions`. A later invocation
may select `today-posted` only after the first group records 9/9. Do not combine automatic retries
or automatic advancement with this command. A full run is a separate C task after B records 18/18.

Run from the repository root in a dedicated PowerShell session. Use synthetic test configuration,
never load a production environment file. Set the origin only to the freshly verified private
origin. The loopback address below was verified during H closure.

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
# Dedicated session only: this selects the verified system Node and Corepack launcher.
$pilotSemanticId = 'submission-actions'
$pilotModel = 'qwen3.6:latest'
$pilotDigest = '07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522'
$pilotOrigin = 'http://127.0.0.1:11434'
$pilotVariables = @{
    WORKLEDGER_ENVIRONMENT = 'test'
    WORKLEDGER_AI_PROVIDER_MODE = 'ollama'
    WORKLEDGER_OLLAMA_ORIGIN = $pilotOrigin
    WORKLEDGER_OLLAMA_MODEL = $pilotModel
    WORKLEDGER_OLLAMA_MODEL_DIGEST = $pilotDigest
    WORKLEDGER_OLLAMA_TIMEOUT_SECONDS = '120'
    WORKLEDGER_OLLAMA_CONCURRENCY = '1'
    WORKLEDGER_RUN_AI_EVALUATION = '1'
    WORKLEDGER_AI_EVALUATION_SEMANTIC_ID = $pilotSemanticId
    WORKLEDGER_AI_EVALUATION_RUN_LIMIT = '9'
}
$pilotSaved = @{}
foreach ($pilotKey in $pilotVariables.Keys) {
    $pilotSaved[$pilotKey] = [Environment]::GetEnvironmentVariable($pilotKey, 'Process')
}
$pilotEvidence = Join-Path 'output/insights' ('wl1508h-' + [guid]::NewGuid().ToString('N'))
$pilotArtifact = 'output/insights/wl1508-employee-local-ai-smoke.json'
New-Item -ItemType Directory -Path $pilotEvidence -ErrorAction Stop | Out-Null
try {
    foreach ($pilotKey in $pilotVariables.Keys) {
        [Environment]::SetEnvironmentVariable($pilotKey, $pilotVariables[$pilotKey], 'Process')
    }
    pnpm.cmd run workspace:check
    if ($LASTEXITCODE -ne 0) { throw 'Pinned workspace check failed.' }
    pnpm.cmd run test:build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    if (Test-Path -LiteralPath $pilotArtifact) {
        Move-Item -LiteralPath $pilotArtifact -Destination (Join-Path $pilotEvidence 'prior-smoke.json') -ErrorAction Stop
    }
    pnpm.cmd exec vitest run apps/api/test/employee-insight-evaluation.integration.test.ts --project integration
    $pilotExit = $LASTEXITCODE
    if (Test-Path -LiteralPath $pilotArtifact) {
        Copy-Item -LiteralPath $pilotArtifact -Destination (Join-Path $pilotEvidence ($pilotSemanticId + '.json')) -ErrorAction Stop
    }
    if ($pilotExit -ne 0) { throw 'Evaluation failed; retain evidence and stop.' }
} finally {
    foreach ($pilotKey in $pilotVariables.Keys) {
        [Environment]::SetEnvironmentVariable($pilotKey, $pilotSaved[$pilotKey], 'Process')
    }
}
```

Before declaring a screen pass, inspect the new artifact: exact model/digest, selected semantic ID,
all three locales and repetitions, nine records, zero failures, and expected content-free fields.
`complete: false` is correct for a screen. Missing artifacts or abnormal termination cannot pass.
The evaluator collects failures through one group; stop before the next invocation on any failure.
Record the revision, runtime, qualification evidence, and artifact location alongside the result.

For C, ensure both semantic-ID and run-limit keys are absent from the actual Node child environment
(not merely empty strings). The first B launch showed that assigning null through this PowerShell
path left an empty value visible to the evaluator. Verify absence before authorizing the full run;
use the full evaluation artifact filename
`wl1508-employee-local-ai-evaluation.json`, preserving any prior artifact before running. Require
one uninterrupted 216-record result with `complete: true` and zero failures for the same candidate.
Do not treat a screen, merged files, or resumed partial run as C evidence.

## Read-only recheck — 2026-09-06

The earlier connection failure is resolved. Ollama at the inspected loopback endpoint now reports
version 0.24.0. Its tags match all three recorded manifest digests, and no model is loaded. The
qwen3.6 metadata advertises completion, vision, tools, and thinking with no remote host/model
metadata. These declarations do not prove WorkLedger health or structured-output behavior.

System Node under Program Files reports 24.18.0, matching the repository pin. The inspected
user-installed pnpm reports 9.15.1 rather than required 11.20.0. The shell still resolves bundled
Node 24.19.0 and no pnpm on PATH. Escalated version reads succeeded; no installation or setting
changed. Another Program Files pnpm launcher exists but its version was not established.

The example loopback origin above is now reachable for metadata. Fresh WorkLedger cold-start health,
structured output, reasoning rejection, operator egress controls, and pinned pnpm remain pending.
No tests, chat/generation calls, or model loads occurred. H remains in progress.

## Toolchain resolution and static guard repair — 2026-09-06

The system pnpm launcher uses Corepack 0.35.0 and resolves the repository pin to pnpm 11.20.0.
Prepending the system Node directory to PATH in a temporary command session selects Node 24.18.0
and the correct pnpm. The obsolete user-level pnpm 9.15.1 was neither changed nor removed.

The first static workspace guard rejected pnpm-workspace.yaml solely because the Windows checkout
uses CRLF. After line-ending normalization its content matches the expected contract exactly.
scripts/check-workspace.mjs now normalizes CRLF only; configuration values remain strictly checked.
A regression case in scripts/check-workspace.test.mjs covers CRLF acceptance and altered-setting
rejection. The test was added but was not executed under the no-tests instruction.

The subsequent pnpm run workspace:check passed: exact pinned toolchain, root plus nine projects,
dependency graph/lockfile rules, and all sixteen completed phase gates at version 0.16.0.
These are static configuration guards, not tests or model calls. Fresh health qualification remains
pending; no evaluator, provider probe, deployment setting, dependency, or model was changed.

## Authorized synthetic health result — 2026-09-06

The user explicitly authorized the health probe only, leaving employee evaluation stopped.
TypeScript compilation via pnpm run test:build passed; this script does not execute tests.
The unchanged WorkLedger adapter received a freshly validated test-only configuration, exact
loopback origin, recorded qwen3.6 tag/digest, 120-second deadline, and concurrency 1. The loaded-model
inventory was confirmed empty immediately before the probe. No production environment was loaded.

- Result: ready in 29,265 ms; CHAT, STRUCTURED_OUTPUT, TOOLS; reasonCode null.
- Runtime: Ollama 0.24.0, Node v24.18.0; NVIDIA GeForce RTX 4090, driver 32.0.15.9649.
- Content-free artifact: `output/insights/wl1508h-health-2026-09-06T06-38-31-598Z.json`.
- Employee semantic cases: zero. No regression screen, full matrix, test suite, or automatic retry.
- The host Ollama process may retain the model after the probe; it was not forcibly unloaded.

The adapter health boundary passed, but H is not complete. A subsequent filtered startup-log read
reports OLLAMA_NO_CLOUD=false. No equivalent cloud-denial setting or operator outbound-network
isolation has been established. Missing remote metadata and loopback transport do not prove those
host-level controls. Do not advance to B or enable deployment on health evidence alone. Changing
Ollama configuration or restarting the service was not included in the health-only authorization.

The regression case for the CRLF guard has been added but not executed. Static workspace/phase
guards, compilation, JavaScript syntax checks, and diff whitespace checks passed. The earlier
no-probe statements in this report describe preparation before this explicit authorization.

## Historical outstanding H acceptance (resolved by isolation record below)

- Pinned toolchain is verified and loopback metadata is reachable; confirm the operator-controlled
  private service boundary before qualification.
- Serving version and GPU/runtime provenance are recorded. Establish cloud denial, no outbound
  proxy routing, and operator network isolation; logged OLLAMA_NO_CLOUD is currently false.
- Synthetic adapter health has passed from an empty loaded-model state with the exact tag/digest,
  120 seconds, concurrency 1, required capabilities, and unchanged reasoning/digest/origin controls.
- Complete operator privacy evidence before closing H. No employee semantic question belongs in H.

At this checkpoint one explicitly authorized synthetic health probe had passed and no employee
evaluation had run. The continuation below resolves the remaining operator prerequisites.

## Operator isolation and H closure — 2026-09-06

The user requested continuation of the task. Two scoped firewall rules were applied through the
Windows administrator prompt using `scripts/ollama-pilot-firewall.ps1`. User environment settings
OLLAMA_NO_CLOUD=1 and OLLAMA_HOST=127.0.0.1:11434 were persisted; both were previously unset.
The desktop app was restarted, but its persisted expose setting overrode the bind address.
After confirming the Ollama 0.24.0 schema, only settings.expose at id=1 changed from 1 to 0 in a
transaction while Ollama was stopped. No conversation, account, or other settings field was read
or changed by that transaction. The app was restarted hidden and remains available locally.

Verified post-restart evidence:

- Only 127.0.0.1:11434 listens; the prior all-interface listener is gone.
- Startup logs confirm cloud disabled and empty HTTP_PROXY/HTTPS_PROXY fields. Windows variable
  names are case insensitive; lowercase duplicates are not required in the startup record.
- Both named rules block outbound traffic to Any address, on Any profile, for the exact installed
  ollama.exe and ollama app.exe. All firewall profiles are enabled; unrelated rules are unchanged.
- Ollama 0.24.0 metadata remains reachable; the selected served digest is unchanged and no model
  is loaded. No public-network probe, new model health probe, or employee evaluation was run.
- Content-free isolation artifact: `output/insights/wl1508h-isolation-2026-09-06.json`.

The two rule names are WorkLedger-WL1508H-Ollama-Server-Outbound and
WorkLedger-WL1508H-Ollama-App-Outbound. Model downloads, cloud features, and updates through those
executables remain blocked while the rules are enabled. WorkLedger deployment provider mode stays
disabled. This is a local installation qualification, not model approval for deployment.

H is complete based on the existing 29.265-second synthetic health pass plus the subsequently
verified isolation configuration. The health pass predates the firewall change; no inference
availability under the final firewall configuration is claimed. B already rechecks adapter health
before its semantic cases and must stop on failure. B is ready only after an employee-test
instruction; C and D remain gated and unexecuted. The CRLF regression case remains unexecuted and
must be included in the later applicable non-model checks. No phase gate or version changed.

### Rollback of this installation change

Rollback deliberately restores the former cloud/network access. Quit Ollama before restoring its
settings. In an administrator PowerShell, run the helper with the same installation directory and
-Rollback to remove only its two named rules:

```powershell
.\scripts\ollama-pilot-firewall.ps1 -InstallationDirectory "$env:LOCALAPPDATA\Programs\Ollama" -Rollback
```

For the same Windows user, remove only the two user environment values introduced by this task
with `[Environment]::SetEnvironmentVariable(name, $null, 'User')`. Restore the desktop network
exposure setting through Ollama Settings, or while stopped change only settings.expose at id=1
from 0 back to its recorded prior value 1 in the local Ollama settings database. Restart Ollama
from a fresh session so it inherits the restored environment. Do not remove or reset other settings,
firewall profiles, model files, or conversations. Any rollback invalidates this isolation evidence.

### Primary references

- [Ollama local-only configuration](https://docs.ollama.com/faq): cloud-disable setting and restart.
- [Ollama 0.24.0 desktop settings schema](https://github.com/ollama/ollama/blob/v0.24.0/app/store/database.go): the expose field in the single settings row.
- [Windows scoped firewall rules](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule): executable, outbound, block, and profile scope.
