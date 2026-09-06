# WL-1508L — Reproducible Windows verification and staged pilot execution

**Date:** 2026-09-06  
**Scope:** D-517 verification tooling, integration fixture corrections, request-history/readiness
repairs and the user-approved bounded retention repair; no model execution or semantic recovery.
D-518 records the implementation findings.

## Ordinary verification

Use Corepack to select the manifest's pnpm even when an older global pnpm shadows it:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm exec playwright install chromium firefox webkit
corepack pnpm run verify
```

On the reviewed Windows host, Corepack is at
`C:\Program Files\nodejs\corepack.cmd`. If it is absent from PATH, use
`& 'C:\Program Files\nodejs\corepack.cmd' pnpm run verify`.
The globally resolved pnpm was 9.15.1; its `pnpm with 11.20.0` invocation failed the engine check.
Do not relax the guard or change global settings. The working Corepack command executes
Node 24.18.0 and pnpm 11.20.0. A correctly selected pnpm can also run `pnpm run verify` directly.

`verify` runs configuration, OpenAPI reproducibility, formatting, lint, typecheck, script and
unit/component tests, integration, browser tests, and build in order. Individual checks use the
same implementation, for example `corepack pnpm run lint` or
`corepack pnpm run verify test:integration`.

The runner validates the real Node/pnpm executables before tests. It invokes children with the
resolved Node path and explicit argument arrays, preserves verified package-manager metadata,
and avoids nested shell-selected pnpm. Playwright starts Vite through that Node executable too.
The runner never downloads a toolchain. For an existing portable toolchain, set
`WORKLEDGER_PNPM_PATH` to its absolute `pnpm.cjs` or native executable path and invoke
`scripts/run-verification.mjs` with the pinned Node.

Both `WORKLEDGER_RUN_AI_EVALUATION` and `WORKLEDGER_RUN_SCHEMA_QUALIFICATION` are forced to `0`.
Stale provider settings, employee filters, limits and output paths are removed, including
case variations on Windows. This is process-local; provider deployment stays disabled.
Vitest and native script tests use at most two workers. Browser tests use two workers and the
existing retry policy. Test assertions and application deadlines are unchanged.

Each invocation creates `output/verification/<unique-id>/`. Numbered immutable JSON records
preserve actual child exits, signals and launch failures; `result.json` records the final result,
tool versions, and whether a test database URL was supplied. A nonzero child stops the command
with that exit code. Missing final results indicate incomplete execution. These summaries contain
technical metadata; ordinary test output remains visible in the terminal. Gated integration skips
must still be reported separately from passed tests.

To include the existing local PostgreSQL fixture, in a dedicated PowerShell session:

```powershell
corepack pnpm run db:up
$env:WORKLEDGER_TEST_DATABASE_URL = 'postgres://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test'
corepack pnpm run verify
```

Use only the local test database. Existing isolated schema fixtures own test cleanup. Stop the
Compose service with `corepack pnpm run db:down` only if this session started it. No database
reset, production migration, provider service or firewall mutation belongs to verification.

## Formatting and CI

Prettier and EditorConfig already require LF, while Git's host `core.autocrlf=true` produced CRLF
working files. `.gitattributes` now sets automatic text detection with LF checkout, retaining
CRLF for Windows batch files. The current checkout normalized 456 formatter-supported tracked
files by replacing only CRLF; those files already have LF in the index and create no semantic
diff. `.vscode/settings.json` additionally lacked its final newline; its settings were preserved.
No ignore patterns, formatter rules, global Git configuration or editor preferences were relaxed.

For an existing checkout with the same old line endings, `corepack pnpm run format` applies the
repository formatter. New checkouts use the checked-in attributes. Review the diff normally.

[CI](../.github/workflows/ci.yml) uses the same `pnpm run verify`, the manifest-pinned tools,
a frozen install, the existing PostgreSQL Compose setup, and Chromium/Firefox/WebKit. Actions
are pinned to reviewed commit IDs, token permissions are read-only, checkout credentials are
not persisted, and check/browser evidence is retained after failures. It neither runs models nor
deploys anything. Local command/configuration validation is distinct from a remote CI run.

Implementation references: [Git text/eol attributes](https://git-scm.com/docs/gitattributes),
[Vitest worker limits](https://vitest.dev/config/maxworkers),
[pnpm setup inputs](https://github.com/pnpm/action-setup), and
[Node setup inputs](https://github.com/actions/setup-node).

## Explicit pilot stages

These commands are for the corresponding later authorized roadmap task. L runs none of them.
They do not start, own, stop or isolate an Ollama process. The operator must first establish the
exact executable/model identity, empty/cold starting state, owned listener, egress protection and
cleanup responsibility using the existing [operator evidence](194-wl-1508b-residency-schema-qualification.md)
and [runbook](166-wl-1508h-employee-pilot-rerun-preparation.md). The new CLI replaces that runbook's
historical inline environment assignments and ignored wrappers, not its operational controls.

```powershell
corepack pnpm run pilot qualify output/insights/reviewed-config.json
corepack pnpm run pilot b output/insights/reviewed-config.json
corepack pnpm run pilot c output/insights/reviewed-config.json
```

These are separate tasks, not a command sequence to run automatically. Qualification is needed
only when relevant inputs changed or valid evidence is unavailable. B still requires completed
L/M; C requires fresh B. `test:ai:employee` is an alias for the explicit-stage CLI and no longer
implicitly enables inference. An omitted or unknown stage fails before contacting the provider.

Supply a reviewed JSON configuration with these fields (placeholders must be replaced):

```json
{
  "candidate": {
    "origin": "http://127.0.0.1:11435",
    "model": "qwen3.6:latest",
    "modelDigest": "<exact reviewed manifest digest>",
    "profileId": "ollama-0333-qwen36-schema-v1"
  },
  "lifecycle": "synthetic-health-residency-v1",
  "isolationEvidence": { "path": "output/insights/<review>.json", "sha256": "<digest>" },
  "qualificationArtifact": { "path": "output/insights/<qualification>/artifact.json", "sha256": "<digest>" },
  "qualificationReview": { "path": "output/insights/<qualification-attempt>/result.json", "sha256": "<digest>" },
  "previousB": { "path": "output/insights/<b-attempt>/result.json", "sha256": "<digest>" }
}
```

`qualify` needs candidate, lifecycle and isolation evidence only. B additionally requires both
qualification references; C also requires `previousB`. Paths are resolved from the repository
root. Every reference must match its SHA-256. Obtain it with
`(Get-FileHash -LiteralPath '<file>' -Algorithm SHA256).Hash.ToLowerInvariant()`.
The candidate must match an existing reviewed application profile and the unchanged fixed controls.
No arbitrary environment overrides, prompt settings or per-run limits are accepted in the config.

Qualification results include the artifact digest and relevant source/compiled hashes for reuse.
Source hashes normalize CRLF to LF; compiled files and referenced evidence use exact bytes.
Evaluation provenance additionally includes interpretation, grounding, contracts, localization,
golden fixtures, the harness and runner. A fresh C rejects changed B sources/configuration.

Legacy report-194 evidence has no new-runner `result.json`. Reuse requires an explicit local
review linking its artifact digest and D-516 lifecycle to unchanged relevant qualification inputs.
The review JSON uses `passed`, `candidate`, `lifecycle`, `qualificationArtifactSha256`, and
`sourceHashes.qualification`, matching the new qualification result fields. The exported
`sourceHashes()` helper in `scripts/pilot-workflow.mjs` supplies current hashes after a build;
current hashes alone do not prove historical equivalence. Do not create a passing review unless
the original evidence and source comparison establish it. A prompt/evaluator-only M change does
not itself invalidate the fixed schema challenges; an affected qualifier/adapter change does.

B invokes submission-actions across all three locales/repetitions, then today-posted only after
9/9. C invokes balance-summary, balance-projection and balance-closing as three separate nine-case
preflights, then clears every filter/limit for one full 216-case invocation. Mandatory health
remains inside each invocation. A failed group ends the attempt. There is no retry/resume/tuning
switch, and partial artifacts are never merged into a full pass.

Every attempt reserves `output/insights/pilot-<stage>-<unique-id>/` before model work. Each child has
its own directory. The existing strict readers validate artifacts; qualification retains its
immutable checkpoint helper. Employee evaluation now reserves output before health, records
content-free health and final identity, and writes an immutable validated checkpoint after each
case plus a final artifact. Original failed attempts remain untouched. No raw prompt, response,
reasoning, native result or employee payload is written by the launcher.

Outcome classes distinguish launch failures, missing/invalid artifacts, zero-case health failure,
incomplete identity/coverage, schema qualification failure, semantic failure, interruption and source
drift. Child exit and artifact result are separate conditions; both must pass. A passed short group
still has `complete: false`; only the full matrix can establish full coverage. Model child terminal
output is suppressed; the launcher prints content-free per-group outcomes and the evidence location.

## Integration defects exposed and repaired

The first full command correctly stopped in PostgreSQL integration: 13 failed, 50 passed and two
skipped tests across seven failing files. Earlier available-only runs had skipped these cases.
Focused checks separated setup defects from application defects; the original failed run remains
in `output/verification/6ed68b54-76c8-4c52-b6f1-1764702856c9/result.json`.

- Corrected hyphenated fixture schema labels, the POSIX-only absolute-migration-path check,
  and incomplete migration lists. Stored schema identifiers and authorization assertions remain strict.
- Rebuilt system-operations test identities using actual `auth_users`, role assignments,
  employment links and signed Better Auth sessions. Removed fictional legacy tables/session creation.
  Both positive technical authorization and HR/employee/anonymous rejection remain covered.
- Updated the injected employee AI mock to selection-v1 boolean vectors and bounded schema assertions.
  The mock is injected with provider configuration disabled; it makes no network call. Corrected
  fixture-only TypeScript narrowing and a diagnostic that incorrectly used a type parameter as a value.
- Corrected the revoked-cookie assertion to the existing `AUTH_SESSION_EXPIRED` contract; the
  401 denial and unchanged idempotency/event/audit counts remain required.
- Readiness now resolves the retention migration marker through the connection's schema search path,
  matching normal repository queries and isolated test schemas. Complete schema returns ready;
  renaming the marker produces not-ready. Default production schema remains public.
- PostgreSQL reported `22P02` / `enum_in` for personal request history: a derived `APPLIED` value
  was coerced into the stored correction enum. The three union status projections now use text.
  No stored enum, schema, status meaning, scope filter or pagination rule changed. The full
  existing inbox/history privacy, authorization and workflow test passes after the repair.

The user explicitly included the discovered retention defect. Previously data minimization and its
audit fact ran in a transaction before the referenced job existed, so the foreign key rolled the
minimization back. Data changes, the completed job and its linked minimization audit now commit in
one transaction, with the job inserted before the audit. On failure, that entire transaction rolls
back; a separate zero-effect job records `RETENTION_JOB_FAILED`. Database messages are not retained
because they may contain sensitive values. Retention periods, affected fields and domain invariants
are unchanged; no migration is needed.

Real PostgreSQL regressions verify retained employee UUIDs, one linked content-free audit,
zero-effect repeat execution, and rollback when an audit trigger rejects the write. They verify
that only a content-free failure is retained and a later retry can succeed. This is deterministic
database evidence, not a model/employee-pilot pass.

## Verification and next task

The final complete command is `corepack pnpm run verify`, with both real-model flags explicitly
zero and `WORKLEDGER_TEST_DATABASE_URL` set to the existing local test database. The runner also
enforces disabled model flags independently of the invoking shell. One complete invocation passed
with exit code 0 on 2026-09-06, using Node 24.18.0 and pnpm 11.20.0. This is one uninterrupted
command, not a combination of partial passes.

Evidence: `output/verification/dfde2502-60be-4184-9e14-2a022ee6ab9c/result.json` and its 49
numbered child records; full terminal output: `output/wl1508l-final-verification.log`.
The result records `passed: true`, `exitCode: 0`, `modelExecution: false` and
`databaseConfigured: true`; every child exited 0.

| Check | Observed result |
| --- | --- |
| Configuration, OpenAPI, format, lint, typecheck | Passed, including workspace boundaries and all 16 phase/version gates at `0.16.0` |
| Native script tests | 69 passed, including 12 workflow tests |
| Unit/component tests | 598 passed across 63 files |
| Real PostgreSQL integration | 64 passed; 2 skipped across 32 files (31 passed, 1 skipped) |
| Browser tests | 52 passed; 1 skipped, with desktop Chromium and Firefox/WebKit/mobile smoke projects |
| Production build | Passed, including bundle budgets and all nine workspace public entry points |

The two integration skips are the explicitly disabled real-model evaluation and the pre-existing
full upgrade-from-0.9.0 data-preservation test in `packages/database/test/upgrade.integration.test.ts`.
The passing current-schema readiness test does not replace upgrade data-preservation evidence;
the separate upgrade script was not run in L. The browser skip is the existing opt-in WL-1305
Phase 13 screenshot comparison (`WORKLEDGER_ASSERT_PHASE_13_BASELINES` was not enabled).
No new skip was introduced. Existing automated keyboard, reflow and accessibility checks passed;
no new manual assistive-technology review or whole-product conformance claim is made.

Earlier stopped attempts remain evidence: the original PostgreSQL failure above; a formatting stop
at the newly changed expired-session assertion (`f73dd7c5-53d9-47ca-937c-3571cc625678`); and a lint
stop on a task-created scratch edit script, which was then removed. No assertion, product timeout
or ignore list was weakened. Focused database JSON reports in `output/wl1508l-*.json` retain the
failure classifications and subsequent bounded checks. `output/format-portability-audit.json`
lists every line-ending normalization and the missing final newline.

The frozen install completed with the unchanged lockfile. CI YAML parsed, its environment and
command list were checked, action commit IDs were resolved from official repositories, and the
PostgreSQL Compose configuration passed validation. The existing database service was already
healthy and was left running. The pinned Playwright browser revisions were installed for local
validation; no model software or application dependency was added. CI's Linux browser-system
dependency installation remains a runner-specific setup step, not a claimed Windows command.

No remote CI job was run. No health, qualification or employee-model case is part of L's checks.
L is complete and the synchronized next implementation task is WL-1508M. B/C/D and provider
deployment retain their existing gates. There is no phase/version change, commit, push or deployment.

After the documentation update, static reconciliation checked all 164 executable task IDs against
HEAD: only L changed from unchecked to complete, five optional entries remain unchecked, and M
is the only ready task. All 114 relative links in the reviewed memory/runbook files resolve; the
historical status archive is unchanged. The phase/version check and `git diff --check` passed.
