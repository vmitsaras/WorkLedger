# Roadmap reconciliation and bounded pilot execution

**Date:** 2026-09-06

**Decision:** D-517

**Scope:** Planning repair requested by the user; no runtime implementation or model execution.

## Findings

| Finding | Repository evidence | Correction |
| --- | --- | --- |
| Different planning files describe different current phases. | The roadmap still named Phase 10, zero completed tasks and `0.10.0`; `WL-1516` and the manifests record the completed deterministic Phase 15 gate at `0.16.0`. | Keep one current phase/readiness statement, linked to report 165. |
| Current status is also a growing historical journal. | The status file exceeds 3,400 lines, naming report 195 at the top, a closed pilot under blockers, and the already diagnosed report-168 duplicate failure under Next task. | Archive the previous file intact and replace it with a short current snapshot. Historical next-step instructions are not current assignments. |
| Completed gates still have unchecked roadmap criteria. | Phases 5/6/7/10 have passing gate reports 65/73/80/98 and checked canonical TODO gates, but unchecked roadmap lists. | Reconcile the historical criteria with linked evidence; preserve the phase-version checkboxes and all limitations. Post-lock correction evidence also links to Phase 8 report 87. |
| The bootstrap prompt can restart planning. | CODEX_MASTER_PROMPT still describes preparing for Phase 1 and its first-run stops. | Label it historical and point ongoing work to the current status and task board. |
| One task owns too many kinds of work. | `WL-1508B` contains qualification, diagnosis, design, implementation, deterministic testing, and repeated model screens across reports 179–195. | Give verification tooling and one complete recovery slice separate IDs. B owns only its two-group acceptance screen. |
| Passing the wrong layer is mistaken for readiness at the next layer. | Report 194 passed cold health and 18/18 schema challenges; report 195 then accepted only 3/9 employee cases. | Track environment, structure, runtime grounding, and semantic acceptance separately. |
| Local verification depends on host-specific invocation and baseline exceptions. | `package.json` uses POSIX environment assignment for `test:ai:employee`; report 188 records nested pnpm drift and repository formatting failure; report 192 records component-worker startup timeouts. | Implement a checked-in Windows-compatible workflow before further recovery/evaluation. Do not keep reconstructing ignored wrappers or rerunning the entire suite for one worker failure. |
| README claims an active CI workflow that is absent. | Its `.github/workflows/ci.yml` link has no working-tree file or tracked entry. | Correct the current claim and include restoring documented CI configuration in L's reproducible verification slice. Historical CI evidence remains historical. |
| The short screen does not cover the failures found by the full matrix. | B covers submission-actions and today-posted; reports 168/172 fail balance-summary, balance-projection, and balance-closing. | Add those three existing questions as a bounded C preflight before paying for another full matrix. The 216-case gate remains unchanged. |
| Excluded proposals look like pending work. | `WL-1510`, `WL-1511`, and `WL-1515` are unchecked TODOs despite being obsolete. | Preserve IDs in a separate excluded list, without executable checkboxes. |

This audit reviewed planning documents, accepted contracts, implementation, existing tests, and
recorded verification. It does not independently reproduce model behavior or claim a new root
cause. In particular, content-free evidence cannot recover the model's unrecorded reasoning.

## Current evidence and release boundary

The deterministic product is complete through Phase 15, version `0.16.0`, as recorded in
[the release review](165-wl-1516-phase-15-gate-review.md). The employee AI pilot remains optional
and has not passed. Provider deployment remains disabled. No new phase, version, model approval,
Manager interpretation, natural-language reports, or MCP work is introduced.

| Layer | Latest relevant evidence | Meaning for the next attempt |
| --- | --- | --- |
| Implementation | Reports 188 and 192 implement D-515 acceptance and D-516 health residency. | These changes already exist; do not schedule them again. |
| Cold health | Reports 193/194 pass under the D-516 lifecycle. | Report 189's timeout is historical, not the latest blocker. Mandatory health still runs for each evaluation invocation. |
| Schema qualification | Report 194 passes 18/18 on the exact recorded tuple. | Reuse only after checking identity, relevant source hashes, lifecycle and isolation; requalify when an input to qualification changes. |
| Employee screen B | Report 195: submission-actions 3/9; today-posted not run. | German selects no facts; Spanish omits the pending-request action, three cases each. B is failed for that attempt and blocked for a new attempt. |
| Full matrix C | Report 172: 210/216 accepted, including three permitted safe rejections. | Historical configuration only. Report 168's 213/216 is also failed evidence, not a current pass. |
| Closure D | Unexecuted. | Requires a fresh passing full matrix and applicable non-model evidence. |

## Ordered implementation

The task board owns IDs, dependencies and current states. The order is
`WL-1508L` → `WL-1508M` → `WL-1508B` → `WL-1508C` → `WL-1508D` → parent `WL-1508`.
Completed A/E/F/G/H/I/J/K remain evidence, not a queue to replay. Do not use parent completion
as a prerequisite of its children. G depended on the historical closure decision, not a passing
parent gate.

### WL-1508L — Make local verification and pilot invocation reproducible

**Entry:** Completed J and implemented D-515/D-516; this task is ready and is the next assignment.

**Deliverable:** One documented, checked-in workflow using the pinned manifest toolchain, with
ordinary deterministic verification separated from explicit model stages. It must work from
PowerShell without inline POSIX environment assignments or an ignored task-specific wrapper.

**Expected files:** `package.json`, the existing evaluation/qualification scripts under `scripts/`,
focused script tests, `.github/workflows/ci.yml`, and the contributor/pilot runbook. Change the integration harness only where
needed for invocation, isolated artifacts, and result classification. Inspect existing helpers
before introducing another runner or package.

Acceptance:

- Resolve the real Node/pnpm executables once and preserve them in child commands; fail with a
  useful toolchain diagnostic before tests when they do not match the manifest.
- Restore the documented CI configuration using the same pinned, deterministic verification
  commands, frozen install and existing PostgreSQL/browser setup. Validate the workflow and its
  commands locally. Do not claim a remote CI pass without an actual run; committing, pushing or
  triggering a remote run is outside this planning request.
- Deterministic mode explicitly disables both real-model flags. Model modes require an explicit
  stage and supplied qualified configuration; do not inherit a stale semantic filter/run limit
  into a full run. Validate stage inputs before contacting the provider.
- Use existing harnesses and strict artifact readers. Give every attempt its own content-free
  output directory. Capture the actual child exit, missing/incomplete artifact, coverage, source
  hashes and qualification reference. Preserve original failures.
- Separate launch/toolchain errors, health failures with zero cases, qualification failures,
  semantic failures, and interrupted runs. None counts as a passing or completed full matrix.
- Use bounded worker concurrency for deterministic verification based on reports 177/192.
  Fix invocation or resource scheduling; do not weaken assertions, increase product timeouts, or
  combine partial results into a claimed clean command pass.
- Resolve the recorded formatting gate systematically: compare working-tree/index line endings
  and repository Prettier configuration; make the smallest repository-owned portability correction
  if supported by evidence. Run `format:check` once afterward. Any remaining formatting work must
  name actual affected files and a concrete fix; do not conceal it with broader ignores or repeated
  baseline disclaimers. Do not change global Git/editor settings or mix semantic refactoring into
  line-ending normalization.
- Mock child processes/provider boundaries to test stage validation, disabled defaults, exit
  propagation, missing artifacts, filter clearing and the failed-first-group stop rule. A mocked
  workflow pass is tooling evidence only. Run no real health, qualification or employee case here.
- Keep provider process ownership/isolation in the existing operator runbook. This launcher does
  not install software, edit firewall rules, start an unowned server, or enable deployment.

**Done:** The workflow and relevant deterministic checks pass with exact commands recorded;
formatting is either repaired or remains an explicitly blocking, scoped defect of L. Do not label
L complete while its core verification path still requires manual workarounds.

### WL-1508M — Resolve report-195 fact/action completeness as one slice

**Entry:** L complete. Reuse reports 180/182/186 and the existing D-515 tests; do not restart the
entire historical diagnosis.

**Expected files:** `apps/api/src/insights/employee-insight-selection.ts`,
`employee-insight-interpretation.ts`, and related API unit tests, with existing fixtures in
`apps/api/test/fixtures/employee-insight-golden-set.ts` reviewed for consistency. Change only
files needed by the demonstrated defect. A provider change would require explicit compatibility
impact review and invalidation of affected qualification evidence.

Acceptance:

- Classify the German all-false fact vector and Spanish missing action separately. Trace input
  construction → schema → codec → grounding → golden evaluation using synthetic examples, all
  supported locales, and reordered native tables.
- Existing tests already reject empty facts and detect missing actions. Preserve those tests;
  merely adding another rejection assertion or a prompt-string assertion does not demonstrate a
  recovery. Establish the mechanism a proposed change addresses and its expected observable effect.
- Implement one evidence-supported recovery within the accepted contracts, plus meaningful
  regressions, relevant deterministic integration coverage, and its documentation in this task.
  Diagnosis, design, implementation and verification are steps of this slice, not four new
  approvals or four new tasks. A prompt-only experiment cannot count as a proven fix.
- Preserve D-515 fact alternatives, both required actions, native authority, exact source union,
  material dependencies, locale coverage, request-memory-only data, content-free diagnostics,
  output rejection and the complete native fallback. Do not copy golden IDs into production,
  silently fill selections, force unrelated facts/actions, or loosen acceptance to obtain a pass.
- Inspect whether facts needed to answer the question can actually be distinguished in the
  permitted model context. If a trusted intent contract or schema/representation change is
  necessary, record the exact bounded amendment and implementation impact before adopting it;
  this roadmap does not preapprove a new architecture or privacy exposure.
- Freeze one candidate change, record applicable deterministic commands and outcomes, explain
  qualification validity, and identify exactly what fresh B must prove. Unit tests establish
  application behavior; only fresh employee cases establish model semantic success.

**Exit:** Either a tested candidate is ready for B, or the pilot is explicitly blocked/deferred
because no evidence-supported recovery fits the accepted contract. In the latter case M and the
pilot remain unchecked; retain the completed diagnostic work and name the concrete product or
contract decision needed. Do not invent a fix or run another candidate merely to keep moving.

### WL-1508B — Run the existing two-group acceptance screen once

**Entry:** L and M complete; exact candidate, relevant source hashes, isolation, and qualification
validity checked. Requalify only the affected qualification contract if it changed; historical H/K
completion alone does not qualify a new tuple. Existing mandatory cold health remains required.

Run submission-actions across three locales and three repetitions. Only 9/9 permits today-posted,
also 9/9. Keep the existing deadline, concurrency, inference controls, rejection policy and
stop-after-failed-group behavior. Preserve a separate artifact per group and one attempt record.
No prompt/source/fixture change or retry between groups. Both groups passing is B completion.

### WL-1508C — Check previous full-matrix failures, then run the full gate

**Entry:** Fresh B passed on the same frozen evaluation configuration.

1. Run existing balance-summary, balance-projection, and balance-closing questions, in that order,
   each across all three locales and repetitions. Stop after any failed nine-case group.
   All 27 must pass before the full matrix. These are additional regression checks under D-517;
   they do not change B's 18-case contract or any golden expectation.
2. Clear semantic filters and run limits, assert 24 questions × 3 locales × 3 repetitions, and
   execute one uninterrupted full run. Require 216/216 under the existing per-question acceptance,
   including only the already permitted safe-rejection cases. Do not stitch together short runs
   or reuse preflight cases as part of the matrix.
3. Validate the complete artifact, exact identity/configuration and unchanged relevant sources.
   Preserve failed and interrupted attempts. Any failure leaves C incomplete and D blocked.

No tuning is permitted between preflight and the full matrix. Each invocation retains mandatory
health and operational checks. The latest accepted spec governs provider controls; D-517 adds only
the three regression groups before the unchanged full gate.

### WL-1508D — Review evidence and close the optional pilot

**Entry:** Fresh C passed. Review trace/privacy, current authorization, degraded-provider native
fallback, localization, and accessibility evidence against changed files. Run the applicable full
quality gate once; record database/model-gated skips separately from actual evidence. An unrun
required check or unresolved introduced defect blocks completion.

Close the parent only after all required evidence passes for the exact recorded candidate.
Provider deployment remains disabled; passing this task is not deployment authorization and does
not reopen the already completed Phase 15 gate or bump the version.

## Rules that prevent another loop

- There is one next task. Current status records only the latest evidence, blockers, and next
  action; chronological reports retain history. Replace stale current prose instead of appending
  another outcome into B's task description.
- A failed run ends that attempt, not the evidence trail. Do not automatically return to M,
  switch models, rewrite the prompt, rerun qualification, or rerun the matrix. First record what
  new evidence justifies a further recovery. Without it, mark the optional work blocked/deferred.
- The next candidate gets one B attempt and, if it passes, one C preflight/full attempt. Further
  attempts require a new bounded scope supported by new evidence, not a standing retry loop.
- Ordinary repair and its deterministic tests are one authorized implementation task. Do not
  infer fresh permission requirements from old reports that describe an earlier task's scope.
  This planning request itself starts no model run or system change.
- Report tooling failures, worker startup failures, gated skips and model semantic failures by
  their actual class. Passing health/schema checks is never a claim of semantic readiness.
- Portfolio presentation stays an unscheduled draft. Broader D-502 assistive-technology coverage
  and Today signals lacking authoritative facts remain explicit limitations, not hidden roadmap
  completion or new implementation scope.

## Verification of this planning change

- Planning consistency check: passed for 167 board IDs, preserving all 165 previous IDs and
  adding only L/M. All 164 TODO checkboxes match board completion states; three obsolete IDs
  remain in the excluded list. Expanded dependency ranges form an acyclic graph.
- All four current planning entry points identify L as next. The only six unchecked executable
  tasks are L, M, B, C, D and their parent milestone, in that order.
- Relative document links: 91 checked, all resolve. The missing baseline CI link was corrected
  and its configuration restoration assigned to L.
- Historical status: the archive preserves the original file bytes after its explanatory header;
  normalized content also matches the previously tracked file. Current status is under 100 lines.
- `node scripts/check-phase-version.mjs`: passed; 16 completed gates, version `0.16.0`.
  Canonical TODO gate checkboxes and every manifest are unchanged. The 29 stale roadmap criteria
  were reconciled with their existing passing reports.
- `node scripts/check-workspace.mjs`: passed; root plus nine projects and no dependency cycles.
- `git diff --check`: passed after removing new trailing whitespace. Git still reports the
  checkout's LF/CRLF conversion notices; no global settings or runtime files were changed.

These are static documentation/workspace checks using the available Node `24.19.0`, not the
canonical pinned-toolchain product gate. No application test, browser run, provider health,
qualification or employee model case ran. The Markdown-only scope makes runtime, domain,
authorization, database, UI and accessibility checks inapplicable to this change. Existing product
and model failures remain recorded; this task fixes planning, not those runtime failures.
