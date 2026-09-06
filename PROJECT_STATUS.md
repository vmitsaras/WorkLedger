# WorkLedger Project Status

**Current phase:** Phase 15 — deterministic WorkLedger Insights complete
**Project readiness:** Stage 5 of 5 — recorded production and UI release gates complete
**Current milestone:** `0.16.0`; all 16 phase gates complete
**Next task:** WL-1508M — resolve report-195 fact/action completeness in one bounded slice
**Execution state:** WL-1508L complete; full local verification passed; WL-1508M ready
**Optional employee AI pilot:** Not passed; B/C/D blocked on the ordered recovery
**Provider deployment:** Disabled; no model approved
**Last verified update:** 2026-09-06

## Current objective

Resolve the two report-195 fact/action failures with one evidence-supported implementation and
meaningful deterministic regressions before another model attempt. Follow
[the bounded execution plan](docs/196-roadmap-reconciliation-and-pilot-execution-plan.md) and
[the task board](docs/08-task-board.md). D-517 defines the order; D-518 and
[report 197](docs/197-wl-1508l-reproducible-verification.md) record the completed verification
workflow, restored CI configuration, database repairs and runnable commands.

The deterministic product remains complete through the
[Phase 15 release review](docs/165-wl-1516-phase-15-gate-review.md). Employee, Manager,
privacy-suppressed HR and isolated System Insights work with the provider disabled. The optional
pilot is independent of that release milestone.

## Current evidence

| Area | Latest relevant result | Consequence |
| --- | --- | --- |
| Verification infrastructure L | Report 197: one complete `corepack pnpm run verify` exited 0 with real PostgreSQL; 69 script, 598 unit/component, 64 integration and 52 browser tests passed | L is complete; use the checked-in runner. Two integration skips and one opt-in browser baseline are explicitly recorded. Remote CI has not run. |
| Accepted implementation | D-515 acceptance and D-516 health residency implemented; reports 188/192 | Do not reimplement these recoveries. |
| Provider qualification | Report 194: cold health and 18/18 schema challenges passed for its exact configuration | Reuse only after identity, relevant source, lifecycle and isolation checks. Mandatory run health remains required. |
| Employee screen B | Report 195: submission-actions 3/9; German empty facts and Spanish missing pending-request action, three each | B failed for that attempt. Today-posted did not run. Semantic recovery is still required. |
| Full matrix C | Report 172: 210/216 on historical selection-v1; report 168: 213/216 on an older configuration | Neither passes the gate or establishes the current configuration's result. |
| Closure D | Not executed | Blocked until a fresh full matrix and required non-model evidence pass. |

A health timeout before the first case is not a 0/9 employee result. Report 189 remains historical
health-failure evidence; reports 193/194/195 subsequently passed health. Passing schema challenges
does not prove question-relevant fact/action selection.

## Ordered remaining work

1. **WL-1508M — Ready:** Trace both report-195 failure classes and implement one
   evidence-supported recovery with meaningful regressions and documentation. If the accepted
   contract cannot support a defensible fix, record the explicit blocker/defer decision.
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

- The current optional model candidate has not demonstrated complete employee answers. Existing
  deterministic rejection tests do not prove that the model will make the right selections.
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
completed pilot infrastructure and excluded proposals. L is checked complete and M is the only
ready task. The full verification command passed configuration, OpenAPI, formatting, lint,
typechecking, tests and build using Node 24.18.0/pnpm 11.20.0. Its immutable result is
`output/verification/dfde2502-60be-4184-9e14-2a022ee6ab9c/result.json`; report 197 retains counts,
skips and earlier stopped attempts separately.

The user-authorized retention repair commits data, job and audit together, rolls back on failure,
and stores a content-free failure result. Request-history enum projection and schema-aware
readiness defects were also repaired and tested. No schema migration, dependency version,
permission, UI, canonical phase-gate checkbox or manifest version changed. No model health,
qualification, employee inference or deployment ran.

The entire previous status file is preserved in
[the historical snapshot](docs/history/project-status-before-2026-09-06-roadmap-reconciliation.md).
Its former Current objective, Blockers and Next task text is historical, not current instruction.
Detailed reports 159–195 retain their original outcomes and scope.

## Update rules

Keep this file a current snapshot. Replace superseded status and next-task text; place detailed
attempt history in evidence reports. After a task, synchronize this file, TODO and the task board
with the exact result, applicable verification, blocker, and one next task. Never equate
implementation completion, qualification success, semantic acceptance and deployment approval.
