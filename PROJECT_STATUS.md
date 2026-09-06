# WorkLedger Project Status

**Current phase:** Phase 15 — deterministic WorkLedger Insights complete
**Project readiness:** Stage 5 of 5 — recorded production and UI release gates complete
**Current milestone:** `0.16.0`; all 16 phase gates complete
**Next task:** None ready; a product-contract decision or new causal evidence is needed to resume WL-1508M
**Execution state:** WL-1508L complete; WL-1508M reviewed and blocked; optional pilot deferred
**Optional employee AI pilot:** Not passed; M and parent unchecked; B/C/D blocked
**Provider deployment:** Disabled; no model approved
**Last verified update:** 2026-09-06

## Current objective

Keep the optional pilot deferred under D-519 and M's explicit blocked exit. The
[bounded review](docs/198-wl-1508m-fact-action-recovery-disposition.md) found no evidence-supported
repair within the accepted contract: the required navigation information reaches the model, but
the model omits selections and runtime grounding has no trusted question-intent requirement.
Another prompt experiment or replay is not queued. Resuming M needs an accepted explicit
question-intent contract or new causal evidence of a concrete defect; neither exists yet.

D-517 defines the remaining dependency order. D-518 and
[report 197](docs/197-wl-1508l-reproducible-verification.md) retain the completed verification
workflow, restored CI configuration, database repairs and runnable commands.

The deterministic product remains complete through the
[Phase 15 release review](docs/165-wl-1516-phase-15-gate-review.md). Employee, Manager,
privacy-suppressed HR and isolated System Insights work with the provider disabled. The optional
pilot is independent of that release milestone.

## Current evidence

| Area | Latest relevant result | Consequence |
| --- | --- | --- |
| Verification infrastructure L | Report 197: one complete `corepack pnpm run verify` exited 0 with real PostgreSQL; 69 script, 598 unit/component, 64 integration and 52 browser tests passed | L is complete; use the checked-in runner. Two integration skips and one opt-in browser baseline are explicitly recorded. Remote CI has not run. |
| Recovery review M | Report 198: 101 existing boundary tests passed; no defensible complete repair identified within the current contract | M remains unchecked/blocked; pilot deferred. These tests do not establish model semantic success. |
| Accepted implementation | D-515 acceptance and D-516 health residency implemented; reports 188/192 | Do not reimplement these recoveries. |
| Provider qualification | Report 194: cold health and 18/18 schema challenges passed for its exact configuration | Reuse only after identity, relevant source, lifecycle and isolation checks. Mandatory run health remains required. |
| Employee screen B | Report 195: submission-actions 3/9; German empty facts and Spanish missing pending-request action, three each | B failed for that attempt. Today-posted did not run. Semantic recovery is still required. |
| Full matrix C | Report 172: 210/216 on historical selection-v1; report 168: 213/216 on an older configuration | Neither passes the gate or establishes the current configuration's result. |
| Closure D | Not executed | Blocked until a fresh full matrix and required non-model evidence pass. |

A health timeout before the first case is not a 0/9 employee result. Report 189 remains historical
health-failure evidence; reports 193/194/195 subsequently passed health. Passing schema challenges
does not prove question-relevant fact/action selection.

## Ordered remaining work

1. **WL-1508M — Blocked:** Diagnostic review is complete, recovery is not. Resume only after
   an accepted bounded question-intent amendment or new causal evidence supports a concrete fix.
   The proposed amendment and its impact are recorded in report 198; no new implementation is approved.
2. **WL-1508B — Blocked on M and valid qualification:** One attempt: submission-actions 9/9,
   then today-posted 9/9. A failed first group stops the attempt.
3. **WL-1508C — Blocked on fresh B:** First pass the three historical full-matrix failure groups
   (27 cases), then run one unfiltered, uninterrupted 216-case gate on the same frozen configuration.
4. **WL-1508D — Blocked on fresh C:** Reconfirm applicable privacy, security, fallback,
   localization and accessibility evidence; close parent WL-1508 only when all requirements pass.

Completed A/E/F/G/H/I/J/K/L retain their recorded scope and are not tasks to replay. A later failure requires
new evidence and a bounded recovery decision before another attempt; it does not automatically
restart the sequence. Provider deployment stays disabled even if the optional pilot passes.

## Current blockers and limitations

- The current optional model candidate has not demonstrated complete employee answers. The current
  request supplies free text without trusted question-intent requirements. No evidence-supported
  recovery was found; D-519 defers the pilot without adding another diagnosis/design task.
- The restored CI configuration has local command/configuration evidence, but no remote run yet.
- The pre-existing full upgrade-from-0.9.0 integration case remains skipped; current schema
  readiness is tested, but this run does not establish upgrade data preservation. The optional
  employee-model case and opt-in Phase 13 screenshot comparison were also skipped as documented.
- The broader exact retail browser/assistive-technology matrix in D-502 remains a limitation;
  bounded existing evidence is not whole-product conformance.
- Exact partial-day work/absence overlap, calculation-to-ledger mismatch and break-duration
  warning signals need authoritative facts. Today must not infer them from aggregate minutes.
- Portfolio presentation remains an unscheduled [draft](docs/drafts/portfolio-presentation.md).
  Obsolete WL-1510/WL-1511/WL-1515 are excluded from the executable queue.

## Project memory and verification

The roadmap, TODO and task board separate completed product work, the optional execution queue,
completed pilot infrastructure and excluded proposals. L is checked complete; M remains unchecked
and blocked, with no ready task. The L full verification command passed configuration, OpenAPI, formatting, lint,
typechecking, tests and build using Node 24.18.0/pnpm 11.20.0. Its immutable result is
`output/verification/dfde2502-60be-4184-9e14-2a022ee6ab9c/result.json`; report 197 retains counts,
skips and earlier stopped attempts separately.

The user-authorized retention repair commits data, job and audit together, rolls back on failure,
and stores a content-free failure result. Request-history enum projection and schema-aware
readiness defects were also repaired and tested. No schema migration, dependency version,
permission, UI, canonical phase-gate checkbox or manifest version changed. No model health,
qualification, employee inference or deployment ran during L or M.

M changed documentation only and reran five relevant non-model test files: 101 tests passed.
It preserved D-515, the failed artifact hash, all task checkboxes and qualification scope.
See report 198 for the separate failure traces, rejected interventions and concrete decision to resume.

The entire previous status file is preserved in
[the historical snapshot](docs/history/project-status-before-2026-09-06-roadmap-reconciliation.md).
Its former Current objective, Blockers and Next task text is historical, not current instruction.
Detailed reports 159–195 retain their original outcomes and scope.

## Update rules

Keep this file a current snapshot. Replace superseded status and next-task text; place detailed
attempt history in evidence reports. After a task, synchronize this file, TODO and the task board
with the exact result, applicable verification, blocker, and at most one ready next task. State
that none is ready when an explicit deferral applies. Never equate
implementation completion, qualification success, semantic acceptance and deployment approval.
