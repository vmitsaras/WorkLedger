# WL-1508C — Duplicate-reference failure diagnosis

**Date:** 2026-09-06  
**Status:** Diagnosis complete; remediation not implemented; C remains failed 213/216

## Scope and evidence

The user requested diagnosis after the full evaluation. This review used the existing content-free
artifact in report 168, current fixture, orchestration, adapter and contracts, and version-pinned
Ollama source. No model call, test suite, prompt change, schema change, validator change, or
deployment change was made. This is a continuation of C, not a new phase or passing gate.

## Confirmed findings

**Subsequent correction:** Report 173 identifies a schema bypass before grammar conversion in the
exact candidate's chat path. Missing uniqueItems support below remains true of the generic converter,
but does not establish that this run used that converter. The new source/metadata diagnosis refines
the earlier attribution; historical output cannot be reconstructed. Selection-v1 was subsequently
implemented in I and evaluated in reports 171–172; C still failed.

All three es-ES balance-summary repetitions returned FINAL_SCHEMA_REFERENCES_DUPLICATE. In
`apps/api/src/insights/employee-insight-interpretation.ts`, the classifier checks each of
actionReferences, factReferences, limitationReferences and sourceReferences separately. The code
means at least one array contains repeated strings. It does not mean a reference used by two
different native facts is invalid. The classifier retains neither the field nor the repeated value,
and may report the first duplicate before other validation defects are examined.

WorkLedger already tells the model to use unique references and an exact source set union.
`packages/contracts/src/insights.ts` emits uniqueItems=true on all four output reference arrays.
The orchestration preserves that keyword when constraining item enums to currently authorized
references, and `apps/api/src/ai/ollama-adapter.ts` forwards the schema as format. Provider output
is validated without an application step that appends references. The runtime duplicate rejection
is therefore the intended protection, not evidence that it should be relaxed.

Ollama 0.24.0 converts schema format to a grammar through SchemaToGrammar in its
[completion path](https://github.com/ollama/ollama/blob/v0.24.0/llm/server.go#L1471-L1488).
Its [array grammar conversion](https://github.com/ollama/ollama/blob/v0.24.0/llama/llama.cpp/common/json-schema-to-grammar.cpp#L865-L882)
repeats one item rule using minItems and maxItems. It has no uniqueItems handling. Consequently,
allowed enum strings may repeat despite the supplied uniqueness keyword. This is a confirmed
generation constraint gap in the version's source, not a claim that the deployed binary was rebuilt
or its grammar instrumented during this diagnosis.

## Fixture and locale comparison

The balance-summary golden entry supplies one shared BALANCE_RESULT for en-GB, de-DE and es-ES.
Its native reference identifiers are unique within each collection:

| Collection | Distinct entries | Relationship |
|---|---|---|
| Facts | 5 | Three posted facts share the ledger source; two other facts share the daily source |
| Actions | 1 | Uses the daily source |
| Material limitations | 1 | Uses the daily source |
| Sources | 2 | Ledger and daily records |

The minimized limitation context derives related facts/actions from those collections and explicitly
deduplicates relatedSourceReferences with Set. Repeated source appearances across different facts
and relationships are legitimate input. The model must turn them into a union for the output.
No Spanish-only reference construction or duplicate fixture identifier was found. Locale changes
the question, locale constraint and prescribed prose; the allowed reference vocabulary stays the same.

The schema keeps maxItems=20 for every nonempty reference vocabulary, even the one-item action and
limitation vocabularies. Without enforced uniqueness this permits repeated valid items. Clamping
the maximum to vocabulary size would prevent repetition for singleton vocabularies, but would not
guarantee uniqueness for facts or sources with multiple allowed values.

## What remains uncertain

Concatenating shared source references instead of taking their set union is a plausible trigger.
The final instruction asks the model to copy limitation-related references and then add sources for
cited facts/actions; an additive reading could repeat a source despite the system's explicit rule.
This is a hypothesis only. The historical artifact cannot establish which of the four arrays repeated,
the repeated value, or why only the Spanish question triggered it. Identical token counts and failure
codes across three runs do not establish identical response content. Other balance questions passed
with the same fixture, so shared sources alone do not explain the locale/question-specific behavior.

## Recommended next bounded task

**Design follow-up:** The subsequently requested design is specified in
`docs/specs/_root/0002-duplicate-safe-insight-generation/index.md` under D-511. WL-1508I tracks
implementation and deterministic verification; neither has run as part of the design task.

Prepare a duplicate-safe provider representation while preserving the existing strict public result
and runtime validators. First specify content-free duplicate diagnostics limited to an allowlisted
reference-field name and bounded counts, so a future authorized failure can be localized without
retaining prompts, prose, identifiers or native values. Cover all four arrays with deterministic
cases and keep valid shared-source relationships accepted.

Then choose a bounded representation whose uniqueness does not depend on the unsupported keyword,
and verify it against the pinned provider's supported grammar. Do not silently deduplicate invalid
model output, relax the gate, assume prompt wording guarantees uniqueness, or enumerate an
unbounded number of reference subsets. This proposal needs a scoped implementation/design decision;
no recovery implementation is accepted by this diagnostic report alone.

Any accepted change requires fresh B and uninterrupted C evidence for that exact configuration;
the existing 18/18 screen cannot qualify changed generation behavior. C stays unchecked and D remains
blocked until 216/216 passes. Provider deployment stays disabled and the completed deterministic
Phase 15 milestone stays at 0.16.0.

## Verification and impact

Reviewed existing full-run summary, fixture relationships, prompt/schema construction, adapter
forwarding, duplicate classification and the pinned upstream implementation. No test or inference
was executed. Only documentation changed in this diagnosis. No UI, accessibility, domain calculation,
authorization, database or retention behavior changed; no new accessibility verification is claimed.
