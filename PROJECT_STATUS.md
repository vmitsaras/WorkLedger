# WorkLedger Project Status

**Current phase:** Phase 15 — deterministic WorkLedger Insights complete
**Project readiness:** Stage 5 of 5 — recorded production and UI release gates complete
**Current milestone:** `0.16.0`; all 16 phase gates complete
**Current task:** WL-1508N — English-only local AI topic suggestions
**Execution state:** N implementation and full verification passed; model acceptance blocked on runtime performance
**Legacy interpretation pilot:** Deferred; M and parent unchecked; B/C/D blocked
**Provider deployment:** Disabled
**Last verified update:** 2026-09-06

## Current objective

The user-approved English-only topic-suggestion enhancement is implemented under D-520 / ADR 0015.
An English question suggests one of four employee topics. The person confirms the topic, chooses
its period, and explicitly runs the independently authorized native Insight. AI receives no native
records and cannot write an answer, calculate a balance or execute a tool. Native results and the
surrounding application retain account localization. See [report 199](docs/199-english-local-ai-topic-suggestions.md).

The deterministic product remains complete through the
[Phase 15 release review](docs/165-wl-1516-phase-15-gate-review.md). Employee, Manager,
privacy-suppressed HR and isolated System Insights work with the provider disabled.

## Current evidence

| Area | Latest result | Consequence |
| --- | --- | --- |
| N implementation | English-only confirmation flow, strict topic endpoint, no-tools provider request, privacy/cancellation/fallback controls | Implemented; legacy answer interpretation is unavailable at runtime. |
| N full local verification | Report 199: pinned verify exited 0; 70 script, 618 unit/component, 64 PostgreSQL integration and 52 browser tests passed; build and budgets passed | Implementation verified locally; remote CI not run. Existing skips remain. |
| N initial model attempt | Capability probe passed; legacy compact schema health timed out before any topic case | Zero-case health failure, not a 0/60 semantic result. Owned process/listener cleanup confirmed. |
| N health adaptation | Application/evaluator now use the actual strict topic enum; six new adapter cases passed | Existing identity, isolation, capability, deadline and output controls remain. Legacy compact qualification keeps its original default. |
| N model attempt | 32 valid correct responses; request 33 reached the 120-second deadline; 27 unrun; partial-run p95 102.172 seconds | Acceptance failed/incomplete. Full English coverage and all UNKNOWN cases remain unproven. Identity/source checks and owned process/listener cleanup passed. |
| Legacy recovery M | Report 198: 101 boundary tests passed; no defensible complete repair in the old contract | M remains unchecked/blocked. |
| Legacy employee screen B | Report 195: submission-actions 3/9; German empty facts and Spanish missing action | Old multilingual answer contract did not pass. The one repeated English question does not prove broad English reliability. |
| Legacy full matrix C / closure D | Historical matrices failed; current C/D not executed | Legacy pilot remains deferred independently of N. |

Final full verification evidence:
`output/verification/97a6d6fd-32e9-4381-8ee9-d456d291a3c1/result.json`.
Report 199 records the exact model attempt, configuration, isolation, cleanup, thresholds and limits.
No package, migration, domain calculation, phase gate or manifest version changed. No commit,
push, release or provider deployment was performed.

## Remaining work and limits

- N remains unchecked for model acceptance, with implementation verified. The next bounded work
  is local runtime performance diagnosis, followed by a fresh full evaluation on any deliberately
  revised configuration. No repeat inference or model switch is queued automatically. The observed
  short-output latency is a separate problem from the legacy multilingual semantic failures.
- The legacy M/B/C/D queue is deferred under D-519. N is a separate, smaller accepted contract;
  it does not relabel old semantic failures or close parent WL-1508. Reports 196–198 retain the
  old resumption criteria and dependency order.
- Provider deployment remains disabled. A model sample pass and deployment authorization are
  separate outcomes; current health/identity/isolation must be checked for any later use.
- Remote CI has not run. The pre-existing upgrade-from-0.9.0 integration case, optional legacy
  real-model integration gate and opt-in Phase 13 screenshot comparison remain skipped.
- Browser/axe evidence is bounded; the broader retail browser/assistive-technology matrix in D-502
  remains a limitation. Exact partial-day overlap and other unrecorded signals still require
  authoritative facts and must not be inferred from aggregate minutes.
- Portfolio presentation remains an unscheduled [draft](docs/drafts/portfolio-presentation.md).
  Obsolete WL-1510/WL-1511/WL-1515 are excluded from the executable queue.

## Project memory

TODO, the task board, roadmap, D-520, ADR 0015 and report 199 track the new English-only slice.
Completed provider infrastructure A/E/F/G/H/I/J/K/L retains its historical scope. Earlier source,
model and lifecycle qualification results do not automatically qualify a changed purpose.
Detailed reports retain failed and stopped attempts; only current evidence establishes a pass.

The [historical status snapshot](docs/history/project-status-before-2026-09-06-roadmap-reconciliation.md)
and reports 159–198 preserve the previous roadmap and evidence. Their former next-task language
is historical unless reaffirmed by current scope.

## Update rules

Keep this file a current snapshot. Synchronize status, TODO and the task board with the exact
result and at most one ready next task. Never equate implementation completion, schema health,
semantic acceptance and deployment approval. Preserve failed attempts and explicitly deferred work.
