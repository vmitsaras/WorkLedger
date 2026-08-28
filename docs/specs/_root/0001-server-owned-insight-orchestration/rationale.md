# Rationale: Server owned employee Insight orchestration

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

## Rationale

The server already owns every input required to select the tool. Letting the model repeat that
choice adds no product capability, while it adds prompt injection, invalid selection, latency, and
timeout surface. Server execution keeps current scope inside the existing registry and narrows the
model to its intended job, selecting grounded references for an explanation.

Ollama documents tools as optional model choices and documents JSON Schema through the `format`
field. The API does not document a forced tool choice on its native chat endpoint. One schema
constrained final call therefore fits the supported interface better than prompt pressure for a
known tool.

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
