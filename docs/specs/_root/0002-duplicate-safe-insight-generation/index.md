# 0002. Duplicate-safe Employee Insight generation and diagnostics

**Date:** 2026-09-06  
**Status:** Implemented in WL-1508I; fresh model evaluation pending  
**Decision:** D-511  
**Evidence:** `docs/169-wl-1508c-duplicate-reference-diagnosis.md`

Implementation and deterministic verification: `docs/170-wl-1508i-duplicate-safe-generation.md`.
The requirements below describe the implemented slice and its separately gated model verification.

## Scope

Replace provider-generated reference strings with fixed boolean selections. Decode those selections
into the existing public interpretation, then run all existing grounding validators. Add bounded,
content-free validation detail to the existing operational trace and synthetic evaluation artifact.
This design changes no domain calculation, public API DTO, database, UI, provider capability,
authorization rule, inference limit, retention class or deployment default.

One server-owned registry execution still reauthorizes Employee self scope before one tool-free
provider request. Questions, context, selection tables and provider output remain request memory only.
No dependency, model switch, retry, phase, version bump or model run belongs to this design task.

## Provider format: selection-v1

Keep the exact root keys locale and statements, exactly one statement, and existing prescribed
localized text. The statement has exactly these five keys:

| Provider field | Runtime type | Corresponding public field |
|---|---|---|
| actionSelections | boolean array | actionReferences |
| factSelections | boolean array | factReferences |
| limitationSelections | boolean array | limitationReferences |
| sourceSelections | boolean array | sourceReferences |
| text | Exact locale-safe string | text |

For each collection, freeze an ordered table of references from the validated current registry
result. Preserve its native array order; do not sort one representation independently. Use the same
snapshot for prompt context, schema lengths and decoding. Include a zero-based selectionIndex on
each corresponding minimized native entry, assigned by the server. It is an ephemeral ordinal,
never an identity or stored diagnostic. Existing relationship references can remain in minimized
context; the output instructions refer to selection positions instead of copying reference strings.
Do not add broader native fields to explain the mapping.

Each selection array has exactly N entries, where N is the corresponding table length. Its schema is
`{type: 'array', items: {type: 'boolean'}, minItems: N, maxItems: N}`. For N=0 it must be empty.
All object properties are required; additionalProperties=false. Retain locale enum and text const.
The generation schema does not use uniqueItems: repeated booleans are valid because each position
represents a different entry.

For example, `[true, false, true]` selects the first and third entries exactly once. Decoding walks
the table once in order and emits each entry whose matching boolean is true. No model-returned
string becomes a reference, and no duplicate array is normalized. Given a unique table, selecting
its positions cannot produce duplicate references. Every unique subset remains representable;
ordering is canonicalized without changing reference-set semantics.

The [pinned Ollama 0.24.0 converter](https://github.com/ollama/ollama/blob/v0.24.0/llama/llama.cpp/common/json-schema-to-grammar.cpp#L865-L882)
uses item rules and minItems/maxItems to generate bounded arrays. Its primitive rules include boolean.
This source review supports the format choice; it is not an executed provider compatibility test.

## Runtime boundary and limits

1. Retain request validation, authorization, native result validation, cancellation and provider
   health checks. Build tables only from that request's authorized snapshot. Invalid native tables
   fail before provider generation through the existing native-result failure path; never deduplicate
   native identifiers or silently truncate a table.
2. Parse provider content through the existing bounded JSON path, retaining tool-call and malformed
   content rejection. Strictly validate the selection envelope before decoding. Reject missing or
   extra keys, wrong locale, invalid text shape, non-array selections, incorrect lengths and
   non-boolean entries. Exact prose is checked by the existing final validator immediately after
   decoding, preserving its specific diagnostic codes before any result can be returned.
   Do not coerce strings/numbers, pad, trim, zip unequal arrays or accept legacy reference arrays as
   a fallback format. The public reference validator remains callable independently for existing
   consumers and regressions.
3. Decode true positions to a fresh existing InsightInterpretation object. Pass it to the unchanged
   strict schema and validateGroundedInterpretation. Public reference arrays still allow at most 20
   selected entries each; facts and sources still require at least one. Selecting over 20 fails,
   rather than keeping the first 20. Source selection stays model-owned: do not fill or replace it
   with a server-computed union. Missing/extra sources, omitted material limitations, and unsafe
   prose still fail. Golden required-fact/action checks remain independent and unchanged.
4. Return only the existing public result on success, or the existing safe provider-error/native
   fallback on failure. No automatic second generation or error-feedback prompt is introduced.

Native bounds are 100 facts, 50 sources, 20 actions and 20 limitations: at most 190 boolean positions.
The 20-reference public selection limit is distinct from table length. Keep all authorized entries
available even when there are more than 20 candidates. Table construction/decoding is linear, with
no subset enumeration or grammar branch per possible subset. Keep the existing 256 KiB request,
1 MiB response, 1,024 generated-token and 120-second qualified-run limits. Positional errors and
output size remain evaluation risks. Larger valid native results must be covered in deterministic
boundary checks; later provider truncation is a safe failure, not permission to raise a limit.

Replace the current copy-reference prompt instructions coherently, including the final reminder:
one boolean per listed position, true only for cited entries, required material limitations and
related entries selected, sources exactly covering selected facts/actions/limitations. Retain the
untrusted-input hierarchy and safe localized prose. Do not retain contradictory legacy instructions.

## Content-free validation detail

Add an explicitly serialized nullable validationDetail field to EmployeeInsightOperationalTrace.
It is internal operational evidence, never part of the public error or result. Use a strict union:

| kind | Additional fields | Allowed circumstances |
|---|---|---|
| REFERENCE_DUPLICATE | field, itemCount, distinctCount, duplicateCount | Existing FINAL_SCHEMA_REFERENCES_DUPLICATE, bounded all-string array |
| SELECTION_INVALID | field, reason | New FINAL_SELECTION_INVALID code during provider envelope validation |

field is one of actionReferences, factReferences, limitationReferences, sourceReferences. Map provider
selection names to these constants; never copy a provider key, parser path or exception message.
reason is exactly NOT_ARRAY, LENGTH or ITEM_TYPE, in that checking order. Root/key/locale/text
failures continue to use existing applicable safe codes with validationDetail=null. Keep the existing
JSON.parse behavior; this work does not introduce a general JSON parser or change duplicate-key policy.

For REFERENCE_DUPLICATE, attach counts only when the affected array contains at most 20 strings:
itemCount is 2..20, distinctCount is 1..19, duplicateCount=itemCount-distinctCount is 1..19.
For oversized or malformed arrays, preserve existing classification precedence and emit null detail;
do not invent clipped counts or scan an unbounded array solely for diagnostics. Preserve the current
first-failure field order: actions, facts, limitations, sources. One trace has at most one detail.
The detail describes the selected failure, not proof that every other field was valid.

SELECTION_INVALID contains no lengths, indices, selection values or selected counts. Success and
unrelated failures have null detail. Initialize detail per request and copy it explicitly only from
the typed validation error; do not spread error objects into traces. Validate cross-field consistency
before logging or artifact serialization. An invalid detail is omitted as null without masking the
original failure code. Avoid logging failed detail validation payloads.

Do not retain references, hashes of references, native values, selection tables/bits, prompts, prose,
tool content, employee identifiers, arbitrary object keys or raw Zod issues. The small bounded failure
counts use the existing access-controlled operational retention class. They reveal only the shape
of a rejected interpretation, not a durable selection history. No database, audit, analytics or browser
storage sink is added.

## Trace and evaluation compatibility

Update the service trace, `apps/api/src/insights/routes.ts` logging boundary and
`apps/api/src/logging/logger.ts` allowlist/sanitizer. A top-level allowlist entry alone is insufficient:
validate and reconstruct the nested detail with exact keys and enum/count bounds at the logger sink,
including when another caller supplies an object. Do not enable arbitrary nested metadata. Update the
synthetic evaluation record type, serializer, safe-field checks and artifact review procedure together.
New evaluation artifacts declare artifactVersion=2 and providerOutputFormat=selection-v1 at the
top level; these are application constants, not provider-supplied fields. Each result includes nullable
validationDetail. Historical artifacts lacking those fields remain immutable legacy evidence with
detail unavailable, never silently converted into new-format or passing evidence. Readers accept
only the exact known legacy or v2 shape and reject unexpected fields and format/version combinations.
Document source revision and prompt/schema configuration with the existing run provenance.

The prior trace allowlist and spec 0001 describe only the original format. D-511 explicitly specifies
this narrow internal-format/diagnostic amendment for WL-1508I; implementation must update those
documents in the same slice. All public contract and privacy exclusions remain in force.

## Alternatives considered

| Alternative | Decision |
|---|---|
| More uniqueness wording or maxItems equal to vocabulary size | Cannot enforce uniqueness for multiple choices |
| Deduplicate generated arrays | Repairs invalid output and hides the failing behavior |
| Enumerate every allowed subset | Exponential size at current native bounds |
| A boolean object keyed by every reference | Larger repeated keys and dependence on dynamic object-property handling |
| Server-compute source selection or select every fact | Removes an existing model grounding obligation or changes selection behavior |
| Fixed boolean positions | Selected; linear size, unique decoded subsets, same final grounding requirements |

## Implementation slice and acceptance evidence

WL-1508I owns the provider schema/context/decoder and typed diagnostic plumbing. Expected files:
`apps/api/src/insights/employee-insight-interpretation.ts`, a focused adjacent selection codec if
needed to keep that file manageable, its unit tests, `apps/api/src/insights/routes.ts`,
`apps/api/src/logging/logger.ts` and logger tests, evaluation test/record
helpers, and the corresponding privacy/evaluation/spec documentation. The public contracts package and generic Ollama adapter should
not need behavior changes; they remain independent validation/transport boundaries.

Required deterministic evidence (execution results and limitations are recorded in report 170):

- Every subset for small synthetic tables maps to distinct, unique references in table order;
  empty tables, 100/50/20/20 bounds and the public 20/21 selected boundary are covered.
- One valid mock response per locale preserves the same public interpretation and existing golden
  acceptance; shared-source relationships produce one source citation when selected once.
- Missing/extra fields, length N-1/N+1, strings/numbers/null instead of booleans, wrong locale/text,
  legacy output, malformed JSON and unexpected tool calls fail safely without a second generation.
- Incorrect source selections, material limitation omissions and golden required-fact omissions
  still fail the existing corresponding checks. No decoder autofill makes a bad selection pass.
- Independent strict reference-validator cases for each of four duplicate arrays retain the same
  failure code and exact bounded counts. Oversized/malformed input emits no content or unsafe detail.
- Synthetic canary content cannot enter route logs or evaluation artifacts. Unknown fields, malformed
  detail unions and cross-request stale detail are rejected; successful traces have null detail.
- Concurrent requests with different table orders use their own snapshots; permission/native-result
  failure prevents generation. Existing timeout, cancellation and provider-disabled behavior remains.
- Applicable format, lint, typecheck, unit/integration, privacy and build checks pass before I closes.
  No browser change is planned; preserve existing accessibility behavior and disclose unrun checks.

After I is complete, obtain separately authorized fresh B (18/18) and uninterrupted C (216/216) for
the resulting exact configuration, with unchanged fixtures and zero-tolerance threshold. Reconfirm
candidate/isolation provenance before running. Old B remains historical evidence; it cannot qualify
selection-v1. A failure stops progression. D remains blocked until C passes and its remaining
non-model/accessibility evidence is reviewed. No real model run is authorized by this design task.
