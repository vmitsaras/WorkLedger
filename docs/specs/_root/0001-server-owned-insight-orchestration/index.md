# 0001. Server owned employee Insight orchestration

**Date**: 2026-08-28
**Status**: Accepted

**Implemented follow-up:** D-511 and spec 0002 replace only the provider wire
reference representation and extend bounded operational diagnostics in WL-1508I. Final public
validators and server-owned authorization remain unchanged. Historical acceptance below describes
WL-1508F; WL-1508I evidence is in report 170 and fresh B/C evidence is required for the new format.

**D-512/J continuation:** Spec 0003 adds provider compatibility/schema qualification and material
completeness to the one-registry/one-employee-generation path. Four safe qualifiers enter only
request-memory context. Report 174 records implementation and pending deterministic execution.

## Summary

WorkLedger will execute the exact authorized Employee Insight tool before it calls the model. The
model will receive the minimized current result and return one response constrained by the existing
JSON contract. This removes unnecessary model control over data access while preserving the strict
pilot gate and native result authority.

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

## Decision

**Chosen option**: Option 1: Execute the registry tool on the server

WorkLedger will make application authorization and request intent choose the exact registry tool,
then make one model request with no tools and a strict output schema. (basis: ADR 0014 authority
rules and the official Ollama API contracts)

The runner up is Option 4. It remains the safe outcome if no exact local digest passes after this
bounded orchestration improvement.

Decision history and sources are recorded in [rationale.md](./rationale.md).

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

* [x] After `WL-1508F` passes without a real model run, resume `WL-1508B` only for the 18 accepted
  `submission-actions` and `today-posted` cases against exact qualified `qwen2.5-coder:14b` digest
  `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849`.
* [x] If any case fails, stop before `WL-1508C` and decide whether to close the optional model pilot.

The resumed screen stopped after six of the first nine cases failed. The user closed the optional
model pilot without passing it on 2026-08-28. No further model work is authorized in the current
Phase 15 scope.

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
