# WL-1508G Phase 15 deterministic continuation

**Task:** `WL-1508G`
**Completed:** 2026-08-28
**Decision:** Continue Phase 15 with provider-independent Insights only
**Runtime changes:** None

## Reconciliation summary

The Employee local AI pilot is closed without passing and is no longer a Phase 15 release
prerequisite. This does not convert `WL-1508` into a pass. The completed deterministic Employee
Insights foundation remains the evidence-backed product baseline.

The remaining accepted Phase 15 scope is deterministic Manager, HR aggregate, and System Insights,
followed by a provider-disabled release gate. Model interpretation for Manager Insights,
natural-language report generation, and MCP exposure are obsolete in this phase. They may return
only through a new roadmap decision and, where required, a superseding ADR and threat review.

## Sources of truth

| Evidence | Role | Reconciled conclusion |
|---|---|---|
| `docs/152-wl-1501-deterministic-insight-service-contracts.md` | Native service and authorization evidence | Complete and reusable for later deterministic work |
| `docs/153-wl-1502-employee-insight-computations.md` | Exact deterministic calculation evidence | Complete and provider independent |
| `docs/154-wl-1503-accessible-native-insights-route.md` | Native route and accessibility evidence | Complete and reusable by later workspaces |
| `docs/155-wl-1504-insights-foundation-gate.md` | Foundation gate | Passed with provider mode disabled |
| `docs/159-wl-1508-employee-local-ai-pilot-evaluation.md` | Model pilot evidence | Closed without passing; no model approved |
| ADR 0014 | Authority, privacy, and inactive provider boundary | Still authoritative; the closed model path stays disabled |

## Plan reconciliation

| Task | Verified state | Phase 15 treatment |
|---|---|---|
| `WL-1500` to `WL-1504` | Complete | Required deterministic foundation |
| `WL-1505` to `WL-1507` | Complete | Retained inactive implementation and security evidence; not a release prerequisite |
| `WL-1508` | Closed without passing | Historical failed optional gate; excluded from the deterministic release prerequisites |
| `WL-1508A`, `WL-1508E`, `WL-1508F` | Complete | Retained pilot recovery evidence |
| `WL-1508B` | Closed after failed screen | Does not pass and will not resume |
| `WL-1508C`, `WL-1508D` | Closed without execution | Obsolete after the pilot closure |
| `WL-1509` | Complete | Deterministic current-direct-report Manager Insights |
| `WL-1510` | Obsolete | Manager model interpretation removed from Phase 15 |
| `WL-1511` | Obsolete | Natural-language report generation removed from Phase 15 |
| `WL-1512` | Complete | Deterministic HR aggregate contracts and privacy suppression accepted |
| `WL-1513` | Complete | Accepted deterministic HR aggregates implemented |
| `WL-1514` | Complete | Deterministic technical System Insights implemented |
| `WL-1515` | Obsolete | MCP evaluation removed from Phase 15 |
| `WL-1516` | Complete | Accepted deterministic and provider-disabled paths verified at `0.16.0` |

## Revised dependencies

1. `WL-1509` depends on the completed `WL-1504` foundation and completed `WL-1508G` reconciliation.
2. `WL-1512` follows `WL-1509` and owns the dedicated deterministic HR privacy decision.
3. `WL-1513` depends on `WL-1512` and implements no row-level or model-facing HR surface.
4. `WL-1514` depends on `WL-1504` and `WL-1508G`; it may proceed independently of HR work.
5. `WL-1516` depends on `WL-1509`, `WL-1512`, `WL-1513`, and `WL-1514`.

`WL-1510`, `WL-1511`, and `WL-1515` are not dependencies because they are no longer accepted Phase
15 work. `WL-1508` remains failed historical evidence rather than a dependency.

## Accepted execution sequence

### 1. `WL-1509` deterministic Manager Insights

Implement current-direct-report action summaries and team coverage through the native Insight
Service. Preserve self exclusion, neutral availability, current effective manager scope, exact
timezone and date semantics, and native source actions. Add domain, API, UI, accessibility, and
permission evidence without provider calls.

### 2. `WL-1512` deterministic HR aggregate privacy contracts

Accept fixed purposes, value sources, cohort and case floors, complement suppression, differencing
controls, current HR authorization, safe omissions, and bounded sources before implementing an HR
surface. Do not include model context, free text, notes, reasons, diagnosis, attachments, or row
drilldown.

### 3. `WL-1513` deterministic HR aggregate Insights

Implement only the contracts accepted by `WL-1512`. Keep suppression authoritative on the server,
return neutral unavailable states, and prove repeated-query and cross-scope resistance.

### 4. `WL-1514` deterministic System Insights

Expose allowlisted technical health, version, migration, backup, mail, and session-policy facts to
the System workspace. Exclude every employee, attendance, balance, absence, request, report, and HR
field.

`WL-1514` may run after `WL-1509` or in parallel with the HR sequence once its own bounded task is
active. Phase 15 still follows the repository rule of one active roadmap task at a time.

### 5. `WL-1516` deterministic Phase 15 release gate

Completed on 2026-08-29. The applicable multilingual, accessibility, security, privacy, usability,
upgrade, rollback, provider-disabled, database, production, and visual evidence passes. No accepted
route depends on Ollama, no model is approved, provider mode remains disabled, and all ten
manifests advance to `0.16.0`. See `docs/165-wl-1516-phase-15-gate-review.md`.

## Non-goals

- Do not resume model qualification or evaluation.
- Do not enable, uninstall, pull, retag, or replace an Ollama model.
- Do not add Manager, HR, or System model interpretation.
- Do not add natural-language report generation, general chat, natural-language SQL, or MCP.
- Do not remove the inactive provider code as part of this planning task.
- Do not change a runtime configuration, dependency, database schema, API, UI, manifest, or version.

## Validation

This task changes planning and governing documentation only. It must pass `pnpm format:check`, the
Phase 15 version guard, `git diff --check`, and a consistency search for stale dependencies or
claims that model-dependent work remains accepted.
