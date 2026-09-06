# Phase 15 Insights Architecture, Privacy, and Evaluation Contract

**Current amendment:** [ADR 0015](adr/0015-english-local-ai-topic-suggestions.md) accepts a separate English-only topic-suggestion flow under D-520. The legacy interpretation pilot below remains deferred and its evidence unchanged.

**Reopening, 2026-09-06 (D-510):** The user reopened the employee pilot for a future test.
The earlier closure remains historical failed evidence. `WL-1508H` prepares and requalifies one
exact candidate before reopened `WL-1508B`, then gated `WL-1508C` and `WL-1508D`. No tests or
model probes run in this planning task. Provider mode remains disabled; no model is approved.
The completed deterministic Phase 15 gate, version `0.16.0`, and obsolete Manager interpretation,
natural-language reports, and MCP proposals remain unchanged. This bounded rerun needs no new phase.

**Task:** `WL-1500`
**Reconciled by:** `WL-1508G`
**Date:** 2026-08-27
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`
**Runtime changes:** None

**WL-1508I recovery (2026-09-06, D-511):** selection-v1 encodes citations as boolean positions in
current authorized reference tables and decodes them before the unchanged public grounding checks.
Bounded field/count diagnostics are validated at the logger sink; no model content or selection bits
are retained. Implementation evidence and verification limits are in report 170. Fresh selection-v1 B passes 18/18 (report 171); C
fails 210/216 (report 172) and provider deployment stays disabled.

**D-512 recovery design:** Spec 0003 adds proposed exact provider compatibility admission and
synthetic schema qualification, runtime material fact/action completeness, and request-memory
qualifiers limited to POSTED, PROJECTED, PROVISIONAL and INCOMPLETE. J implements and verifies;
K separately qualifies the provider before fresh B/C. Public DTOs, safe prose, authorization and
retention exclusions remain unchanged. J now implements these boundaries; report 174 records static checks and pending test execution.

## Outcome

The Phase 15 boundary is accepted. WorkLedger first shipped deterministic, role scoped native
Employee Insights. The optional private Ollama pilot later closed without passing. Completed
`WL-1508G` now continues Phase 15 with deterministic Manager, HR aggregate, and System Insights
only. Provider mode remains disabled and no accepted route may depend on a model.

No product code, dependency, package, migration, database table, model, provider request, MCP
surface, prompt store, conversation store, or version change is part of `WL-1500`.

## Accepted product scope

### Included

- Deterministic employee balance change, monthly submission blocker, leave projection, and Today
  explanation results.
- One dedicated accessible Insights route with visible bounded context and native source actions.
- Purpose specific read only tools that reauthorize the current active workspace on every call.
- Deterministic Manager action summaries and team coverage after `WL-1509`.
- Deterministic privacy-suppressed HR aggregates after `WL-1512` and `WL-1513`.
- Deterministic isolated System diagnostics after `WL-1514`.
- Retained inactive provider and Employee interpretation code from the closed pilot, disabled and
  ineligible for deployment.

### Excluded

- General chat, natural language SQL, arbitrary database or report queries, and unrestricted tool
  access.
- Employee ranking, productivity or absence scoring, illness prediction, staffing or discipline
  advice, approval recommendations, policy invention, legal conclusions, and autonomous actions.
- Model generated calculations, workflow decisions, writes, exports, notifications, or audit
  entries.
- Persistent global assistant UI, automatic DOM capture, hidden page context, stored conversation
  history, third party analytics, external model providers, and cloud Ollama models.
- Manager, HR, and System model interpretation in Phase 15.
- Natural-language report generation and MCP exposure in Phase 15.

## Data inventory

| Data | Source | Storage or transfer | Sensitivity | Purpose | Retention | User control | Main risk | Required control |
|---|---|---|---:|---|---|---|---|---|
| Native Insight request | Authenticated browser | Same origin JSON body to API | High personal operational | Select one purpose specific result | Request lifetime only | Explicit submit or context link | Query leaks through URL or logs | POST body, strict schema, no-store, no body logging |
| Native facts | Authorized domain and read models | API memory and purpose DTO | High personal operational | Explain one bounded question | Request lifetime only | Visible source links | Excess fields or wrong scope | Current authorization, field allowlist, typed facts |
| Context descriptor | Current native route | Browser memory and request body | Moderate to high | Narrow the requested Insight | Current page or conversation only | Visible and removable | DOM or full DTO capture | Allowlisted kind, period, and source references only |
| Question and bounded prior turns | Employee form | Browser memory, API memory, private Ollama request | High personal operational | Natural language interpretation | Current browser session and request only | Clear, reload, workspace change, sign out | Prompt disclosure or accidental persistence | No URL, database, log, audit, cache, analytics, or backup copy |
| Tool definitions and arguments | API registry and model selection | API memory, private Ollama request | High when scoped | Retrieve exact authorized facts | Request lifetime only | No direct user storage | Model expands scope or injects an argument | Schema validation and authorization on every execution |
| Tool results | Authorized Insight service | API memory, minimized private Ollama request | High personal operational | Ground the interpretation | Request lifetime only | Native result stays visible | Excess data, identity, notes, or source leakage | Purpose DTO, aliases, no stored free text, minimum fields |
| Model output | Private Ollama | API memory then validated DTO | High personal operational | Optional explanation | Current browser session only | Clear, cancel, retry | Unsupported claim or leaked model trace | Structured schema, grounding, no reasoning trace, safe rejection |
| Provider diagnostics | API provider adapter | Allowlisted structured operational log | Low to moderate technical | Health, capacity, failure diagnosis | `OPERATIONAL_LOGS` profile | Operator retention | Prompt or domain data copied into logs | Content free field allowlist and redaction tests |
| Golden evaluation set | Repository synthetic fixtures | Git and local test runner | None or low synthetic | Release evaluation | Repository history | Maintainer review | Production data enters fixtures | Synthetic facts only, fixture review and secret scan |
| HR aggregate | Purpose specific aggregate service | API memory and same-origin response only after suppression | High sensitive HR | Bounded organization trend facts | Request lifetime only | HR initiates bounded query | Small cohort inference or differencing | Minimum cohort and case floors, complement test, no drilldown |

The question, model, provider, and golden-evaluation rows describe retained evidence from the closed
employee pilot. They are inactive. No accepted Phase 15 continuation route creates those flows.

Repository classification is a mixed self hosted web, API, storage, reporting, and inactive private
AI implementation. Data sensitivity is high. The accepted Phase 15 continuation flow is browser to
same origin API to the authorized Insight Service. Provider mode remains disabled.

## Authorization contract

| Actor and active workspace | Native result | Model interpretation | Data excluded |
|---|---|---|---|
| Employee in Employee workspace | Own active employee facts | Unavailable in the accepted Phase 15 scope | Other people, HR and technical data |
| Manager in Employee workspace | Own employee facts | Unavailable in the accepted Phase 15 scope | Current reports and manager queue |
| Manager in Manager workspace | Current direct report summary after `WL-1509` | Unavailable in the accepted Phase 15 scope | Self data, former reports, sickness subtype, reasons, notes |
| HR in HR workspace | Fixed purpose aggregates only after `WL-1513` | Unavailable in the accepted Phase 15 scope | Row data, free text, small cohorts, technical data |
| System administrator in System workspace | Fixed technical diagnostics from completed `WL-1514` | Unavailable in the accepted Phase 15 scope | Employee, attendance, balance, absence, request, report, HR data |
| Combined role with no matching active workspace | Denied | Denied | All other role scopes |

Collection scope, aggregation, suppression, totals, native result construction, and source actions
all use the same authorization transaction. A partial response cannot mix allowed and denied
purposes.

## Privacy risk matrix

| ID | Area | Risk | Severity | Accepted control | Evidence owner |
|---|---|---|---:|---|---|
| `AI-R01` | Scope | Combined roles or prior turns blend employee, manager, HR, or system facts | Critical | One active workspace, current authorization per tool, clear state on workspace change | `WL-1501`, `WL-1505`, role tasks |
| `AI-R02` | Authority | Model calculates or invents a domain value | Critical | Native facts are authoritative; rendered values come only from referenced facts | `WL-1501`, `WL-1502`, `WL-1508` |
| `AI-R03` | Prompt injection | User question or tool data directs an undeclared tool or prohibited action | High | Tool allowlist, schema validation, data treated as data, no write tools | `WL-1505`, `WL-1508` |
| `AI-R04` | Egress | A local endpoint or model silently invokes cloud service | Critical | Private exact origin, public origin rejection, signed out Ollama, blocked provider internet, pinned digest | `WL-1506`, `WL-1516` |
| `AI-R05` | Retention | Prompt, conversation, result, or reasoning trace enters database, logs, audit, backup, or browser persistence | High | Request and browser memory only; content free operational trace | `WL-1506` to `WL-1508` |
| `AI-R06` | Context | DOM, full DTO, stored free text, notes, reasons, or sickness data enters model context | High | Explicit descriptor and purpose tool projection, no stored free text | `WL-1504`, `WL-1505`, role tasks |
| `AI-R07` | Grounding | Valid JSON contains a wrong fact, source, limitation, or action | High | Reference validation, native value rendering, reject unreferenced claims | `WL-1507`, `WL-1508` |
| `AI-R08` | HR inference | Small cohorts, complements, or repeated queries reveal sickness or identity | Critical | Suppress before result construction, cohort and case floors, fixed purposes, no row drilldown | `WL-1512`, `WL-1513` |
| `AI-R09` | Accessibility | Streaming text, focus movement, or chat semantics create noisy or incomplete output | High | Nonstreaming response, one status, normal document structure, native result first | `WL-1503`, `WL-1507`, `WL-1508` |
| `AI-R10` | Failure | Provider timeout or invalid output hides the deterministic answer | High | Native result remains available; cancel, safe retry, provider unavailable state | `WL-1506` to `WL-1508` |
| `AI-R11` | URLs and cache | Questions, sensitive context, or results enter history or shared cache | High | POST body, memory only state, no-store, clear on session or scope loss | `WL-1503`, `WL-1504`, `WL-1508` |
| `AI-R12` | Operations | Diagnostics expose provider origin, model, prompts, employee facts, or raw errors | High | Safe capability codes and content free logs; technical authorization | `WL-1506`, `WL-1514`, `WL-1516` |
| `AI-R13` | Model supply chain | Model digest, behavior, or capabilities drift after evaluation | High | Exact digest, startup check, complete reevaluation before enablement | `WL-1506`, `WL-1508`, `WL-1516` |
| `AI-R14` | Localization | Model responds in the wrong locale or changes numeric and date meaning | High | Account locale input, native locale formatters, three locale evaluation | `WL-1507`, `WL-1508` |
| `AI-R15` | Reuse | Internal tools are exposed through MCP without equivalent controls | Critical | MCP excluded; separate ADR, metadata allowlist, auth and threat gate | `WL-1515` |

Overall privacy status is acceptable for deterministic implementation. Provider work is closed and
remains disabled. Completed `WL-1512` accepts
`docs/162-wl-1512-hr-aggregate-privacy-contract.md`: exactly two organization-wide calendar-month
purposes, fixed sources and units, whole-result suppression, a closed query algebra against
differencing, and no provider context. `WL-1513` may implement only that contract.

## Evaluation contract

### Deterministic foundation gate

- Exact integer minute, date, timezone, state, source, freshness, and limitation fixtures pass.
- Employee self, current manager, former manager, unrelated actor, HR, system, combined role,
  deactivated account, permission loss, and cross organization cases pass where applicable.
- The complete product works with provider mode `disabled` and makes no model request.
- The native route passes all supported locale, keyboard, focus, screen reader, zoom, reflow, forced
  colors, reduced motion, touch, offline, stale, partial, empty, denied, and failure states.
- Questions, context, and results are absent from URL history, browser persistence, logs, audit, and
  cache.

### Employee local AI pilot gate

The golden set contains 24 semantic questions. Each question has British English, German, and
Spanish wording and runs three times against the exact model digest and inference configuration.
Fixtures cover all four employee Insight kinds plus ambiguity, provisional and incomplete evidence,
prompt injection, prohibited employment and health requests, scope loss, timeout, cancellation,
invalid output, and provider unavailability.

The gate fails on any wrong numeric, date, status, scope, permission, source, limitation, or action
reference; any unsupported domain, policy, legal, health, employment, or workflow claim; any
sensitive disclosure; any unvalidated schema; or any loss of the native fallback. Latency, token
counts, cancellation time, and provider failures are recorded as content free operational evidence.
They do not replace correctness thresholds.

`WL-1508` executed this gate on 2026-08-28. The evaluation infrastructure, privacy and security
tests, degraded-provider evidence, content-free traces, and accessibility matrix are complete, but
the exact evaluated `gemma4:12b` digest reached 207 of 216 cases. Six `submission-actions` cases
returned invalid structured output and three German `today-posted` cases omitted the required
posted-balance fact reference. Later qualified candidates also failed the bounded known-failure
screen. The user closed the optional pilot without passing it on 2026-08-28. Provider mode stays
disabled, no model is approved for deployment, and later dependent tasks remain blocked until a
separate roadmap decision rescopes them. See
`docs/159-wl-1508-employee-local-ai-pilot-evaluation.md`.

### Later role and release gates

- Manager work repeats the scope, former manager, self exclusion, neutral availability, and
  prohibited recommendation set without provider calls.
- HR work tests cohort, case, complement, differencing, repeated query, source absence, and safe
  omission before constructing a native result.
- System work proves that every employee and HR field is absent from its technical result.
- `WL-1516` runs provider-disabled paths, every supported locale and accepted workspace, upgrade,
  configuration, rollback, and browser privacy checks.

## Staged gate contract

| Gate | Tasks | Entry condition | Exit evidence |
|---|---|---|---|
| Architecture gate | `WL-1500` | Phase 14 complete at `0.15.0` | ADR 0014 and synchronized product, permission, architecture, accessibility, security, retention, evaluation, and operations contracts |
| Insights foundation | `WL-1501` to `WL-1504` | Architecture gate complete | Deterministic product and contextual entry points pass with provider disabled |
| Employee local AI pilot | `WL-1505` to `WL-1508` | Foundation gate complete | Closed without passing; retained as inactive historical evidence and not a release prerequisite |
| Deterministic reconciliation | `WL-1508G` | Employee pilot closure recorded | Accepted remaining scope, obsolete tasks, revised dependencies, and provider-disabled release boundary |
| Manager | `WL-1509` | Foundation and `WL-1508G` complete | Current direct report scope, self exclusion, neutral availability, exact facts, native actions, accessibility, and zero provider calls |
| HR aggregate | `WL-1512` and `WL-1513` | `WL-1509` and `WL-1508G` complete | Accepted deterministic privacy decision, suppression before result construction, no row data or inference leak |
| System | `WL-1514` | Complete | `docs/164-wl-1514-system-insights.md`; technical facts remain isolated from all employee and HR data with zero provider calls |
| Removed work | `WL-1510`, `WL-1511`, `WL-1515` | Closed employee pilot | Obsolete in Phase 15; revival requires a new roadmap and applicable decision gates |
| Phase release | `WL-1516` | Complete | `docs/165-wl-1516-phase-15-gate-review.md`; full deterministic multilingual, accessibility, privacy, security, operations, upgrade, rollback, and provider-disabled gates; version `0.16.0` |

No deterministic row may bypass its revised prerequisite. `WL-1508G` replaces downstream task
sequencing only; it does not mark the employee pilot complete or weaken its privacy, security, or
evaluation boundary.

## Required implementation checks

- Contract and service tests for exact native result shape, value source, and safe omissions.
- Exhaustive tool metadata, argument, permission, workspace, and output allowlist tests.
- SSRF, redirect, public origin, cloud model, digest drift, timeout, cancellation, rate, concurrency,
  and dependency error tests for the provider.
- Prompt injection, malformed tool call, tool loop, invalid schema, ungrounded number, source and
  action fabrication, locale, and hostile stored text tests.
- Browser URL, history, storage, cache, network, clipboard, accessibility tree, focus, and live
  region inspection.
- Operational log, technical audit, backup, retention, and restored environment inspection for
  absence of prompt and result content.

## `WL-1500` acceptance evidence

| Requirement | Evidence |
|---|---|
| Product boundary and prohibited use | ADR 0014 and Accepted product scope above |
| Role and active workspace scope | ADR 0014 role table, Authorization contract, and `docs/02-roles-permissions.md` |
| Architecture and data flow | ADR 0014 ownership, tool, provider, and grounding sections; `docs/04-architecture.md` |
| Privacy, retention, and egress | Data inventory, Privacy risk matrix, `docs/06-security-operations.md`, and `docs/107-retention-and-minimization.md` |
| Accessibility | ADR 0014 interaction contract and `docs/05-ux-accessibility.md` |
| Evaluation | Evaluation contract and gate thresholds above |
| Staged gates and operations | Staged gate contract, `docs/07-roadmap.md`, and `docs/06-security-operations.md` |

## Safety confirmation

No publish, push, tag, upload, release, provider request, or remote write command was run. No secret
value is printed in this review.
