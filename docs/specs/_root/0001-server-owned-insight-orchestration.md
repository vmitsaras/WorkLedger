# 0001. Server owned employee Insight orchestration

**Date**: 2026-08-28
**Status**: In Progress

## Summary

WorkLedger will execute the exact authorized Employee Insight tool before it calls the model. The
model will receive the minimized current result and return one response constrained by the existing
JSON contract. This removes unnecessary model control over data access while preserving the strict
pilot gate and native result authority.

## Context

> ⚠️ Premise note: The failing screen looks like a model quality problem, but the first failure is
> caused by asking the model to select a tool that WorkLedger already knows. The safer framing is to
> keep data access under application control and use the model only to select grounded references.

The Employee interpretation path already knows the active workspace, Insight kind, exact period,
expected tool code, and exact arguments before generation. It also computes one current native
result before checking provider readiness. The current path still asks the model to repeat that
selection, then rejects an answer without a tool call.

Exact `qwen2.5-coder:14b` failed all nine `submission-actions` cases before tool execution. Exact
`qwen3-coder:30b` timed out in all nine cases, including three after tool execution. The best full
run, exact `gemma4:12b`, reached 207 of 216. Provider mode remains disabled and the complete native
result remains usable in every failure.

This decision affects personal work records and leave evidence. The existing privacy, current
authorization, no persistence, content free trace, and private local provider controls remain
mandatory.

## Requirements

**User stories**:

* As an employee, I want optional explanation to use only my current authorized Insight so that a
  model cannot choose or widen data access.
* As an operator, I want one bounded provider request so that the optional pilot has predictable
  latency and rollback.

**Acceptance criteria**:

* **AC-1**: Each accepted Employee interpretation executes exactly one server selected registry
  tool with the validated request period, fixed `EMPLOYEE` workspace, current identity, and trusted
  capture instant before provider generation.
* **AC-2**: Permission loss or invalid registry output stops before provider generation and returns
  the existing safe authorization or unavailable result without partial model content.
* **AC-3**: The provider receives one generation request with no tools, the minimized registry
  result, the existing bounded question and prior turns, and a JSON schema derived only from the
  current locale, current authorized references, and existing interpretation contract.
* **AC-4**: The existing runtime parser, strict schema, source union, material limitation, safe
  prose, reference, and native action validators remain the final authority. No validator or golden
  threshold is weakened.
* **AC-5**: One successful request records zero model tool rounds, one completed registry tool
  execution, and the existing bounded provider latency and token counters. Failed execution records
  only the existing content free safe fields.
* **AC-6**: Timeout, cancellation, provider failure, invalid output, rate, concurrency, exact model
  digest, private origin, redirect, proxy, reasoning trace, and disabled default controls remain
  unchanged. WorkLedger adds no provider retry.
* **AC-7**: `POST /v1/insights/interpret`, browser behavior, native result presentation, database
  schema, runtime configuration, and provider capability health contract remain compatible.
* **AC-8**: `WL-1508F` runs mocked, deterministic, database authorization, and repository quality
  checks only. It runs no real model case and makes only the already qualified exact
  `qwen2.5-coder:14b` digest eligible to resume `WL-1508B` afterward.

## Options considered

### Option 1: Execute the registry tool on the server

WorkLedger derives and executes the one exact tool, then sends one schema constrained generation
request. The model selects grounded references but never selects data access. (basis:
`docs/156-wl-1505-read-only-insight-tool-registry.md`, ADR 0014, Ollama tool calling and structured
output documentation)

**Pros**:

* Removes redundant model agency from authorization sensitive work.
* Removes one provider phase and its failure and latency surface.
* Reuses the current registry, provider request schema, validators, and endpoint.

**Cons**:

* Changes the orchestration and trace meaning established by `WL-1507`.
* Does not guarantee that any current local model will pass semantic reference selection.

### Option 2: Keep model tool selection and tune it

Keep two provider phases and alter prompts, request limits, or tool instructions. (basis: the
current `apps/api/src/insights/employee-insight-interpretation.ts` implementation)

**Pros**:

* Preserves the current interaction shape.
* Could help one model without moving tool execution.

**Cons**:

* Retains model control over a choice the server already knows.
* Prior prompt widening regressed the full matrix, and a longer deadline does not address invalid
  tool selection.

### Option 3: Provision another local model

Keep the current implementation and qualify a new exact private model and digest. (basis:
`docs/159-wl-1508-employee-local-ai-pilot-evaluation.md`)

**Pros**:

* Requires no application behavior change if a model passes.

**Cons**:

* Adds model supply, storage, cold start, and qualification cost.
* Leaves the redundant authorization sensitive model choice in place.

### Option 4: Close the optional model pilot

Retain deterministic native Insights and end the Employee model pilot. (basis: ADR 0014 native
first and disabled provider contracts)

**Pros**:

* Has the smallest privacy and operations surface.
* Keeps the complete deterministic product value.

**Cons**:

* Removes the optional interpreted explanation goal.
* Requires a wider Phase 15 roadmap and dependency decision.

## Decision

**Chosen option**: Option 1: Execute the registry tool on the server

WorkLedger will make application authorization and request intent choose the exact registry tool,
then make one model request with no tools and a strict output schema. (basis: ADR 0014 authority
rules and the official Ollama API contracts)

The runner up is Option 4. It remains the safe outcome if no exact local digest passes after this
bounded orchestration improvement.

## Rationale

The server already owns every input required to select the tool. Letting the model repeat that
choice adds no product capability, while it adds prompt injection, invalid selection, latency, and
timeout surface. Server execution keeps current scope inside the existing registry and narrows the
model to its intended job, selecting grounded references for an explanation.

Ollama documents tools as optional model choices and documents JSON Schema through the `format`
field. The API does not document a forced tool choice on its native chat endpoint. One schema
constrained final call therefore fits the supported interface better than prompt pressure for a
known tool.

## Feature design

**Data model sketch**:

No database entity, field, relationship, index, retention rule, or migration changes.

**State transitions**:

1. Validate the interpretation request and acquire the existing account concurrency guard.
2. Reload the native result and account locale through the current Insight Service.
3. Confirm provider readiness and consume the existing rate limit.
4. Derive the exact registry call from the validated Insight request.
5. Execute the registry call once with current `SELF` authorization.
6. Build minimized model context and the bounded output schema from that current result.
7. Make one provider generation request with `tools: []`.
8. Validate the response against the current native result and return or fail closed.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Authorization | Key errors |
|---|---|---|---|---|---|
| `/v1/insights/interpret` | `POST` | Existing Employee Insight, question, prior turns | Existing native result and optional interpretation | Existing session, origin, CSRF, active Employee self scope | Existing `401`, `403`, `422`, `429`, `503` |
| `InsightToolRegistry.execute` | Internal call | Fixed `EMPLOYEE` workspace, identity, capture instant, derived call | Current validated native result | Current PostgreSQL self scope on every execution | Existing permission and safe internal failures |
| `AiProvider.generate` | Internal call | Messages, `tools: []`, output schema | Content and usage | Ready exact private provider only | Existing provider safe codes |

**Value sourcing**:

| Action | Value produced | Source |
|---|---|---|
| Select registry tool | Tool code and arguments | `toolCallForRequest` applied to the validated Insight kind and period |
| Authorize registry execution | Workspace, identity, capture instant | Fixed `EMPLOYEE`, authenticated identity, trusted request capture instant |
| Build model context | Facts, sources, limitations, actions | `minimizeNativeResultForModel` applied to the fresh registry result |
| Build output schema | Locale, fixed prose, allowed references, cardinality | Account locale, `EMPLOYEE_INSIGHT_SAFE_PROSE`, current registry result, existing contract limits |
| Validate final output | Interpretation and native result | Existing parser and `validateGroundedInterpretation` against the same registry result |
| Record trace | Latency, tokens, tool counters, safe failure codes | Measured provider response, completed registry execution, existing error classification |
| Resume model screen | Exact candidate name and digest | Completed `WL-1508A` qualification record for `qwen2.5-coder:14b` |

**Key invariants**:

* The initial native result never authorizes the registry execution. The registry reauthorizes
  current scope and its result replaces the initial result for all provider context and final
  validation.
* The model receives no tool schema and cannot request a tool, period, workspace, employee, or
  network action.
* The generated output schema narrows possible structure and references but never replaces runtime
  parsing or grounding validation.
* Provider capabilities remain `CHAT`, `STRUCTURED_OUTPUT`, and `TOOLS` for this bounded task. A
  later capability change requires a separate decision.
* Provider mode remains disabled by default. No model is pulled, copied, retagged, deleted, or
  published by WorkLedger.

**Security model**:

Only the authenticated employee in the active Employee workspace can request interpretation. The
registry rechecks current PostgreSQL account, organization, employee link, role, and self scope
before model context exists. Questions, prior turns, minimized results, prompts, output, and
reasoning remain request memory only. Operational traces remain content free. The provider origin,
address, digest, proxy, redirect, cloud, and outbound network controls remain unchanged.

**Critical test scenarios**:

* Happy path: one exact registry execution precedes one tool free schema constrained provider call,
  then strict validation returns the registry result, verifies **AC-1**, **AC-3**, **AC-4**.
* Permission case: scope loss during registry execution makes zero provider calls, verifies
  **AC-2**.
* Schema case: unknown, duplicate, missing, or wrong source references still fail closed even when
  the provider response matches JSON structure, verifies **AC-3**, **AC-4**.
* Trace case: success records zero model tool rounds and one completed registry execution, while a
  registry failure records zero completed executions, verifies **AC-5**.
* Failure case: timeout, cancellation, busy, invalid output, and retry behavior retain the native
  result and existing safe outcomes, verifies **AC-6**, **AC-7**.
* Boundary case: tests confirm no real model command or artifact is run by `WL-1508F`, verifies
  **AC-8**.

## Build plan

1. [x] Replace model selected tool orchestration with one derived registry execution and one final
   provider request in the Employee interpretation service, satisfies **AC-1**, **AC-2**, **AC-3**.
2. [x] Add a bounded dynamic JSON Schema builder that reuses current contract limits and authorized
   references, while retaining all runtime validators, satisfies **AC-3**, **AC-4**.
3. [x] Update content free trace counters and focused service, provider, cancellation, and permission
   tests, satisfies **AC-2**, **AC-5**, **AC-6**, **AC-7**.
4. [x] Run the applicable repository and database checks, update `WL-1507`, `WL-1508`, operations, and
   project memory documentation, and stop before real model execution, satisfies **AC-6**, **AC-7**,
   **AC-8**.

## Consequences

**Positive**:

* Data access becomes fully application selected.
* One provider phase reduces latency and failure surface.
* Structured generation uses the adapter capability that already exists.

**Negative / tradeoffs**:

* Existing orchestration tests and documentation need a precise semantic update.
* A passing real model is still not guaranteed.
* Keeping `TOOLS` in provider health is conservative but no longer required by this Employee path.

**Neutral**:

* The endpoint, UI, database, dependencies, configuration, rate, timeout, and disabled default do
  not change.
* `WL-1508B` remains blocked until `WL-1508F` is implemented and verified.

## Follow up

* [ ] After `WL-1508F` passes without a real model run, resume `WL-1508B` only for the 18 accepted
  `submission-actions` and `today-posted` cases against exact qualified `qwen2.5-coder:14b` digest
  `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849`.
* [ ] If any case fails, stop before `WL-1508C` and decide whether to close the optional model pilot.

## References

**Project sources**:

* `AGENTS.md`
* `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`
* `docs/156-wl-1505-read-only-insight-tool-registry.md`
* `docs/158-wl-1507-employee-ask-my-ledger-interpretation.md`
* `docs/159-wl-1508-employee-local-ai-pilot-evaluation.md`
* `apps/api/src/insights/employee-insight-interpretation.ts`
* `apps/api/src/ai/ollama-adapter.ts`

**Practices and standards**:

* Least privilege for authorization sensitive data access
* Fail closed validation for optional model output
* Native deterministic result authority

**Links**:

* Ollama tool calling: https://docs.ollama.com/capabilities/tool-calling
* Ollama structured outputs: https://docs.ollama.com/capabilities/structured-outputs
* Ollama native chat API: https://docs.ollama.com/api/chat

## Migration plan

**Strategy**: Direct replacement inside the disabled optional provider path

**Phases**:

1. Land deterministic service and contract tests with provider mode still disabled.
2. Resume the separate bounded model screen only after repository verification and documentation
   closure.

**Rollback**: Revert the one orchestration change before model screening. Native Insights remain
unchanged and provider mode stays disabled.

**Risks**: A model may satisfy JSON structure but still omit required semantic references. Runtime
validation and the zero tolerance screen remain the release controls.
