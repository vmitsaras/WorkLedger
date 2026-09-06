# ADR 0014: Deterministic Insights and Local AI Boundary

**Current amendment:** [ADR 0015](0015-english-local-ai-topic-suggestions.md) accepts a separate English-only topic-suggestion flow under D-520. The legacy interpretation pilot below remains deferred and its evidence unchanged.

**Reopening, 2026-09-06 (D-510):** The user reopened the employee pilot for a future test.
The earlier closure remains historical failed evidence. `WL-1508H` prepares and requalifies one
exact candidate before reopened `WL-1508B`, then gated `WL-1508C` and `WL-1508D`. No tests or
model probes run in this planning task. Provider mode remains disabled; no model is approved.
The completed deterministic Phase 15 gate, version `0.16.0`, and obsolete Manager interpretation,
natural-language reports, and MCP proposals remain unchanged. This bounded rerun needs no new phase.

**Status:** Accepted by `WL-1500`; deterministic continuation accepted by `WL-1508G`

## Summary

WorkLedger Insights is a read only explanation layer over authorized WorkLedger facts. Native
results remain complete without a model. Optional local AI may explain those results, but it cannot
calculate balances, choose permissions, make decisions, or write domain data.

**Pilot outcome, 2026-08-28:** The optional employee local AI pilot closed without passing after no
qualified model met the zero-tolerance evaluation gate. Provider mode remains disabled and no model
is approved for deployment. The deterministic Employee Insights foundation remains the supported
path. Completed `WL-1508G` continues Phase 15 with deterministic Manager, HR aggregate, and System
Insights plus a provider-disabled release gate. This outcome preserves this ADR as the boundary for
the inactive implementation; it does not mark `WL-1508` complete or approve model use.

## Context

`WL-1512` accepts `docs/162-wl-1512-hr-aggregate-privacy-contract.md` as this ADR's HR aggregate
addendum. Phase 15 HR Insights are limited to fixed organization-wide monthly closure-readiness and
neutral absence-coverage purposes. Caller-defined cohorts, subtype breakdowns, arbitrary ranges,
comparisons, and row drilldown are prohibited. The 10-person cohort, 3-case, and 10-person
complement floors suppress the whole result before native result or provider-context construction.

WorkLedger can answer useful questions from its existing attendance, balance, absence, request,
report, monthly period, and operations sources. Natural language can improve explanation and
navigation, but employment and health related data make a broad chat or unrestricted model context
unsafe. A self hosted installation also cannot assume that a configured model is private merely
because the API endpoint is called local.

The architecture must preserve the current domain, permission, privacy, accessibility, retention,
and operations contracts. It must also remain useful when no model is configured or when the model
is unavailable.

## Requirements

- **AC-1:** With provider mode `disabled`, every accepted Insight returns a complete deterministic
  native result with exact facts, scope, period, freshness, sources, limitations, and valid native
  actions.
- **AC-2:** Every request and tool execution authorizes one active workspace from current
  PostgreSQL scope. Combined roles, former scope, prior turns, and model output cannot merge or
  grant access.
- **AC-3:** Optional Ollama interpretation is disabled by default and can reach only one exact
  operator-controlled private origin and pinned local model digest with public, cloud, redirect,
  and silent external egress denied.
- **AC-4:** Questions, conversations, tool content, model input/output, and reasoning traces are
  request or browser-session only. HR aggregates are suppressed before model context at the
  accepted cohort, case, and complement floors.
- **AC-5:** Every interpreted fact, source, limitation, status, and action references the current
  native result. Invalid or unavailable model output is rejected while the native result remains
  usable.
- **AC-6:** The dedicated route keeps native results first and passes the keyboard, focus,
  announcement, screen reader, localization, reflow, forced-color, reduced-motion, touch, offline,
  cancellation, and dependency-failure contract.
- **AC-7:** The foundation, employee pilot, later role, optional MCP, and final release gates pass in
  order. No average score hides a correctness, scope, unsupported-claim, or privacy failure.
- **AC-8:** Provider configuration, capability checks, content-free diagnostics, model drift,
  rollback to disabled, and operator network evidence are observable without exposing protected
  data or making the provider a core dependency.

## Decision

### Product boundary and authority

Phase 15 adds purpose specific, role scoped Insights after the MVP. An Insight is a deterministic
native result with typed facts, scope, period, freshness, sources, limitations, and allowlisted
native actions.

The existing WorkLedger sources remain authoritative:

1. `packages/domain` owns calculation rules and exact integer minute, date, state, and ledger
   semantics.
2. PostgreSQL owns stored facts, effective scope, workflow state, and audit history.
3. `apps/api` owns authentication, authorization, Insight orchestration, provider calls, and final
   response validation.
4. `packages/contracts` owns Insight requests, native results, tool schemas, provider independent
   structured output, and safe error codes.
5. `apps/web` owns the dedicated Insights route, visible context, accessible presentation, and
   transient conversation state.

No new workspace package is justified. Pure deterministic rules may live in `packages/domain`.
Cross source composition, tool execution, and provider adapters remain application services in
`apps/api`.

The model is never a source of domain fact. It may not calculate a balance, infer a missing rule,
classify an employee, predict illness, recommend approval or staffing, rank people, interpret legal
compliance, or select a write action. All mutations remain explicit native WorkLedger workflows
started and confirmed by an authorized person.

### Native result contract

Every native result names these values through typed fields rather than finished prose:

| Field | Source and rule |
|---|---|
| Insight kind | Allowlisted request value |
| Active workspace | Allowlisted request intent, reauthorized by the API |
| Scope | Current account, organization, active employee link, roles, and effective relationship |
| Period | Validated date only or month inputs in the organization timezone |
| Freshness | Trusted server capture instant plus the exact posted through or calculated through boundary |
| Facts | Existing domain results, projections, ledgers, workflow records, and purpose specific read models |
| Sources | Authorized native routes and opaque source references already valid for that actor |
| Limitations | Server selected descriptor codes for incomplete, provisional, suppressed, stale, or unavailable evidence |
| Actions | Server selected allowlisted native links or report specifications |

Facts use integer minutes, date only values, instants, enumerated states, and explicit qualifiers.
Posted, provisional, incomplete, projected, reserved, and suppressed values cannot be merged or
silently relabelled. Native results use `Cache-Control: private, no-store` and are not persisted in
the browser.

The provider independent service interface accepts an authenticated server context plus an
`InsightRequest` containing exactly one workspace, one allowlisted Insight kind, that kind's bounded
date or month parameters, and an optional visible context descriptor. It returns one
`InsightNativeResult`; it does not accept a model, prose query, actor ID, organization ID, role,
employee collection, or raw filter.

The browser uses authenticated, same-origin, CSRF-protected `POST /v1/insights/run` for native
results. `POST /v1/insights/interpret` later accepts the same native request, a 1 to 500 Unicode
code point question, and at most four prior question/answer exchanges held in browser memory, with
an 8,000 code point total text limit. The server recomputes the native result rather than trusting
facts returned by the browser. Both endpoints reject unknown fields, serialize through the typed
contracts, return no-store responses, and use the existing safe `401`, `403`, `422`, `429`, and
dependency-unavailable error architecture.

### Role and active workspace authorization

The request states one active workspace as intent. The API reauthorizes that workspace and every
tool call from current PostgreSQL facts. Browser navigation, model output, prior tool success, and a
combined role never grant scope.

| Workspace | Permitted scope | Phase boundary |
|---|---|---|
| Employee | The actor's active employee link only | Native foundation; model pilot closed without passing |
| Manager | Current effective direct reports only, with self scope excluded from manager results | Deterministic manager work after `WL-1508G`; no model interpretation in Phase 15 |
| HR | Purpose specific organization aggregates only | Disabled until the dedicated aggregate and privacy gate passes |
| System | Allowlisted technical diagnostics only | Deterministic and isolated from employee, attendance, balance, absence, request, report, and HR data |

Changing workspace clears browser conversation state, context, pending provider work, and cached
Insight results. A tool call that loses authority fails closed and no partial result is returned.

Manager data keeps neutral availability semantics. The model never receives sickness subtype,
notes, reasons, entitlement history, or medical inference. HR aggregate work has no row level drill
down. Before any HR value exists, its fixed purpose specific cohort must contain at least 10
eligible people and at least 3 contributing cases where a case count applies. The complementary
group for a comparison must also contain at least 10 people. Smaller or differenced results are
suppressed before any native result is created. `WL-1512` may select stricter thresholds but cannot
weaken these floors without a superseding ADR and privacy review.

### Tool registry

The Insight tool registry is internal, read only, and deny by default. Each tool declares:

- a stable code and bounded input schema,
- the workspaces and purpose it supports,
- its current authorization policy,
- the minimum result fields it may return,
- sensitivity and model exposure metadata,
- freshness and source rules,
- execution limits, and
- whether a future external adapter may expose it.

Tool arguments never contain role claims, organization scope, SQL, arbitrary field names, raw
filters, unrestricted date ranges, or user supplied employee collections. Each execution starts
from the authenticated account and active workspace. There is no generic database tool, natural
language SQL, arbitrary report query, file access, network fetch, shell action, or write tool.

An MCP adapter is not accepted by this ADR and is removed from the Phase 15 scope. Any future
proposal requires its own roadmap decision, allowlist, authentication, transport, rate, audit, and
threat decision.

### Provider and egress boundary

The provider abstraction has two Phase 15 modes: `disabled` and `ollama`. `disabled` is the default
and produces no provider network request. The application never downloads, pulls, deletes, copies,
or publishes a model.

The Ollama adapter may call one exact operator configured private origin. Configuration is startup
owned, not accepted from a browser request, database row, model response, or administration form.
The origin must use `http` or `https`, contain no user information, query, or fragment, match the
deployment allowlist exactly, and resolve inside the operator controlled host or private network.
Redirects are rejected. Direct `ollama.com` and other public provider origins are rejected.
All resolved addresses must remain inside the configured loopback or private network allowlist at
startup and connection time. The adapter ignores environment HTTP proxy settings and never follows
a redirect or tunnel origin.

The operator must provision one exact local model name and digest, keep the Ollama service private,
keep it signed out from cloud use, and block provider outbound internet access. WorkLedger rejects
model drift or a missing required capability. Calling a private Ollama API does not by itself prove
that the model stays local, so production evidence must include the network policy and configured
model digest.

Ollama must run with cloud features disabled, including `OLLAMA_NO_CLOUD=1` or the equivalent
server setting, and no outbound proxy. The adapter uses `/api/tags` to verify the configured digest,
`/api/show` plus a startup probe to verify chat, tool, and structured-output capability, and
`/api/chat` only for interpretation. Any other Ollama endpoint is outside its allowlist.

The adapter uses nonstreaming structured output. Thinking or reasoning traces are disabled and are
never returned, stored, or logged. Requests have a bounded timeout, one server-owned registry
execution, account rate limits, concurrency limits, and user cancellation. Provider failure never
blocks native Insights or another WorkLedger workflow.

One account may have one interpretation in flight and may start at most 12 interpretations in a
rolling 10 minute window. The installation defaults to two provider requests in flight and may be
configured from one through eight. Employee interpretation performs exactly one current-authorized
registry execution followed by one tool-free provider generation, with zero model tool rounds,
eight grounded statements, and 2,000 Unicode code points of model prose. The provider timeout
defaults to 30 seconds and may be configured from 5 through 120 seconds. WorkLedger does not retry
a model call automatically; only an explicit safe user retry starts another call. The provider
health contract remains conservative and still requires chat, structured-output, and tool
capability; changing that contract requires a separate decision.

An external or cloud model provider requires a superseding ADR, a data processing and egress
review, explicit operator enablement, new retention rules, and a complete threat and evaluation
gate. This ADR does not authorize one.

### Context minimization and retention

The model receives only the current bounded question, resolved account locale, fixed system
instructions, the smallest current-authorized typed facts needed to answer, and a response schema
narrowed to that locale and those transient references. It receives no tool definitions and never
receives a DOM snapshot, whole API response, export, audit record, attachment, password or session
material, notes, reasons, diagnosis, unrestricted user text from stored records, or hidden page
content.

Identity is removed when it is not needed. Manager context uses transient aliases where a name is
not required for the explanation. Source identifiers are mapped to transient references before the
provider call and mapped back only after output validation.

Prompts, questions, conversations, tool arguments, tool results, model input, model output, and
reasoning traces have no PostgreSQL table and no server side retention in Phase 15. The browser may
hold at most the bounded current conversation in memory. It clears that state on reload, workspace
change, sign out, session expiry, permission loss, or explicit clear.

Operational diagnostics may retain only provider kind, configured model digest, safe outcome code,
request ID, timing, token counts, registry execution and model tool-round counts, validation
outcome, cancellation, and retry count.
They contain no question, answer, prompt, tool argument, tool result, source reference, employee
identity, or domain value. These facts use the existing `OPERATIONAL_LOGS` retention class.
Evaluation fixtures are synthetic repository files. Production records cannot be copied into the
evaluation set.

### Grounded interpretation

WorkLedger selects the one Employee registry call from validated request intent, fixes its
arguments to the requested visible period, and runs it through current authorization before the
provider receives context. The model receives no tools and cannot select a different tool,
argument, period, workspace, employee, network destination, or write operation. The minimized
registry result is supplied as untrusted data rather than instructions. Stored user text does not
enter model context.

The final model response must match the provider independent schema and reference native fact,
source, limitation, and action codes that actually exist in the current result. WorkLedger renders
numeric values, dates, statuses, sources, and actions from the native result, not from model text.
Model prose containing an unreferenced number, date, identifier, status, policy claim, or action is
rejected. Invalid, unsupported, timed out, cancelled, or ungrounded output becomes a safe provider
unavailable state while the native result remains visible.

A successful interpretation must cite its native sources, state material limitations, and use the
authenticated account locale. It may explain a relationship between validated facts. It may not
fill an evidence gap or turn a provisional result into a final claim.

### Interaction and accessibility

Insights uses a dedicated `/insights` route. There is no persistent global assistant, automatic
question submission, hidden page capture, token by token live region, or provider required path.

Native results appear before optional interpretation. Context from Today, My time, My balances,
Requests, or Reports is visible, named, removable, and limited to allowlisted kind, date range, and
native source references. Questions and conversation text never enter URLs or persistent browser
storage.

The question form has a visible label, description, bounded input, submit action, and cancel action
while work is pending. Focus stays predictable. Completion produces one concise polite status,
while the result itself uses headings, lists, tables, source links, limitations, and native actions
in normal document order. Provider failure keeps the deterministic answer and exposes a retry only
when retry is safe. Keyboard use, screen reader output, 320 CSS pixel reflow, 200 percent zoom,
forced colors, reduced motion, long localized text, offline behavior, and dependency failure are
release evidence.

### Evaluation and staged gates

No average score may hide a critical failure. A single scope leak, sensitive disclosure,
unsupported policy claim, invalid native action, or wrong numeric, date, status, or source value
fails the relevant gate.

The Insights foundation gate requires `WL-1500` through `WL-1504` complete with the provider
disabled. Exact deterministic fixtures, permission scope, source links, all supported locales,
accessibility states, safe context, and no new provider egress or prompt persistence must pass.

The employee local AI pilot gate requires `WL-1505` through `WL-1508` complete. It uses 24
synthetic semantic questions in `en-GB`, `de-DE`, and `es-ES`, with three repeated runs against one
pinned model digest and inference configuration. The set covers each employee Insight, ambiguity,
incomplete evidence, hostile prompt injection, scope change, provider failure, cancellation, and
attempted prohibited use. Every run must achieve:

- 100 percent correct numeric, date, status, scope, permission, source, limitation, and native
  action references,
- zero unsupported domain, policy, legal, health, employment, or workflow claims,
- zero cross scope or sensitive data disclosure,
- 100 percent schema and grounding validation or a safe rejection, and
- 100 percent preservation of the native result during timeout, cancellation, or provider failure.

`WL-1508G` supersedes the downstream sequencing after the pilot closure. Deterministic Manager, HR
aggregate, and System Insights keep their revised task dependencies and separate gates. Manager
model interpretation, natural-language report generation, and MCP evaluation are removed from
Phase 15. `WL-1516` repeats provider-disabled deterministic paths across every accepted role and
locale before version `0.16.0`.

### Operations

System operations reports only `disabled`, `ready`, `unavailable`, or `misconfigured` for the
optional provider, its capability categories, last safe check time, and a safe reason code. It does
not expose the provider URL, model name, model digest, prompt, employee data, or raw dependency
error to browser users.

Provider unavailability does not fail core liveness or make deterministic Insights unavailable. A
deployment that enables the pilot records its endpoint allowlist, network isolation, model name and
digest, capability check, timeout and concurrency bounds, evaluation evidence, operator, and
rollback to `disabled`. Configuration change and failed policy enforcement create technical audit
evidence without prompt or result content.

## Options considered

### Deterministic native Insights only

This has the smallest privacy and operations surface and remains the required foundation. It does
not provide the optional natural language explanation requested for the later pilot.

### Deterministic Insights with optional private Ollama interpretation

This preserves authoritative WorkLedger results and self hosting while allowing a bounded local
pilot. It adds model supply chain, network isolation, grounding, evaluation, and failure handling
cost.

### General chat or external model service

This could offer broader language capability and simpler hosted operations. It creates uncontrolled
scope, new egress and retention obligations, weaker self hosting, and a much larger prompt injection
and privacy surface. It is rejected.

## Rationale

The deterministic-first option is the only design that preserves WorkLedger's explainability and
permission model when an optional dependency is absent or wrong. Adding a bounded private Ollama
adapter after that foundation provides the requested language assistance without making a model the
source of truth or creating a silent public data flow.

The main cost is deliberate duplication between native structured presentation and optional model
interpretation, plus strict evaluation for each pinned model digest. That cost is smaller and more
operable than trying to prove a general assistant safe across high-sensitivity employment and
health-related data.

## Standard definition

**Canonical pattern**:

```ts
async function runInsight(
  actor: AuthenticatedActor,
  request: InsightRequest,
): Promise<InsightResponse> {
  const authority = await authorizeActiveWorkspace(actor, request.workspace);
  const nativeResult = await insightService.run(authority, request);

  if (!request.interpret || provider.mode === "disabled") {
    return { nativeResult, interpretation: null };
  }

  const toolResult = await toolRegistry.executeAuthorized(authority, request);
  const candidate = await provider.interpret(minimizeForModel(toolResult));

  return {
    nativeResult,
    interpretation: validateGroundedOutput(candidate, nativeResult),
  };
}
```

**Replaces**:

- A model-first chat that decides which records, permissions, calculations, or actions apply.
- Passing route DOM, full API DTOs, exports, stored free text, or unrestricted query access to a
  model.
- Treating the union of an account's roles as one shared Insight or conversation scope.

**Enforcement**:

Strict transport schemas, an exhaustive typed tool registry, current server authorization on every
execution, no-store and field-absence tests, grounding validation, provider configuration checks,
synthetic golden evaluation, and the staged phase gates fail the build or release evidence.

**Rollout**:

New Phase 15 work follows this pattern immediately. Native employee Insights ship first. Provider,
manager, report, HR, system, and MCP surfaces remain unavailable until their named gates pass.

**Exceptions**:

None. A new provider, persistence path, external tool exposure, or weaker HR threshold requires a
superseding ADR and its own privacy and threat review.

## Consequences

1. The first four Phase 15 implementation tasks deliver useful product value with no provider.
2. Local AI is optional, off by default, employee only at pilot start, and safe to remove without
   changing authoritative results.
3. The API must maintain separate native result, tool, provider, and grounding contracts rather
   than passing application DTOs directly to a model.
4. Prompt and transcript debugging is intentionally limited. Operators use content free trace
   facts and synthetic reproduction fixtures.
5. Small HR cohorts and comparisons will often be suppressed. This is an accepted privacy cost.
6. Model upgrades require a new digest and complete evaluation run before enablement.
7. No database migration, dependency, provider connection, or model configuration is introduced by
   `WL-1500`.

## Evidence and references

- `docs/151-phase-15-insights-architecture-privacy-evaluation.md`
- `docs/01-scope-and-non-goals.md`
- `docs/02-roles-permissions.md`
- `docs/04-architecture.md`
- `docs/05-ux-accessibility.md`
- `docs/06-security-operations.md`
- `docs/107-retention-and-minimization.md`
- Ollama structured outputs: <https://docs.ollama.com/capabilities/structured-outputs>
- Ollama tool calling: <https://docs.ollama.com/capabilities/tool-calling>
- Ollama streaming behavior: <https://docs.ollama.com/api/streaming>
- Ollama authentication and local versus cloud behavior:
  <https://docs.ollama.com/api/authentication>
- Ollama local-only configuration: <https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features>
- Ollama model digest and capability metadata: <https://docs.ollama.com/api/tags> and
  <https://docs.ollama.com/api-reference/show-model-details>
