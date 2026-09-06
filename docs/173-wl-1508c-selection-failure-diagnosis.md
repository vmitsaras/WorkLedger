# WL-1508C — Selection-v1 failure diagnosis

**Date:** 2026-09-06  
**Status:** Diagnosis complete; C remains failed 210/216; D blocked

## Scope and evidence

The user requested diagnosis of the two remaining failure modes. This task reviewed report 172's
preserved artifacts, current fixture, selection codec, interpreter, adapter and versioned upstream
source. Starting checkout was `7b23da15354755eace6c4ed48a04598948b34a81`, with a clean working tree.
Only documentation changed. No tests, inference, retry, prompt/schema/validator change, upgrade or
deployment operation ran. Local `/api/show` and `/api/version` requests read metadata only.

| Failure | Existing observations | Diagnosis |
|---|---|---|
| de-DE balance-projection, repetitions 1–3 | Runtime SUCCESS; golden missing posted change, incomplete count and review action | Runtime grounding does not enforce material relationship completeness; minimized facts also omit posted/projected qualifiers |
| en-GB balance-closing, repetitions 1–3 | FINAL_SELECTION_INVALID; factReferences / LENGTH | Required length is five; pinned provider source bypasses the schema for this parser with thinking disabled |

## German omissions: grounding is not completeness

`apps/api/test/fixtures/employee-insight-golden-set.ts` uses the same BALANCE_RESULT across locales:
five ordered facts (opening, posted change, closing, projected change, incomplete count), one review
action, one material incomplete-data limitation and two sources. The German question explicitly
compares expected and posted change. Its golden obligations require posted change, projected change,
incomplete count and the review action. Only projected change passed those required-fact checks.

`minimizeNativeResultForModel` sends the material limitation's related facts (projected change and
incomplete count), review action and deduplicated sources. The system instruction requires these
relationships to be included. However, `validateGroundedInterpretation` checks valid references,
exact source union, prescribed prose and material limitation presence, without requiring the related
facts/actions. A response can therefore pass runtime grounding while omitting this dependency set.
The separate golden evaluator correctly rejects the incomplete answer.

Posted change is a second completeness obligation: it follows from the comparison question, not
from the material limitation's daily-record source. Enforcing material relationships alone would
not guarantee that posted change is selected. The minimizer omits fact qualifiers; both posted and
projected change reach the model as BALANCE_CHANGE_MINUTES, with references and source relationships
providing the remaining distinction. Production handlers also distinguish these facts by qualifiers.
This is a plausible contributor to ambiguous selection, not proof of the locale-specific cause.

Runtime success implies the material limitation was included. Together with the golden result,
this establishes inclusion of projected change and the daily source, and omission of the three
reported required references. Optional opening/closing selections and the full historical mask are
unknown. Identical token counts do not establish identical responses or explain why German failed.

## English length failure: provider schema bypass

`employee-insight-selection.ts` constructs a boolean fact array with minItems=maxItems=5 for this
fixture. `ollama-adapter.ts` forwards that output schema in `format`, with `think:false` and
`stream:false`. The request uses the authorized snapshot; source hashes match the earlier screen.
The decoder rejects an array whose length differs from five before checking its item types.
Consequently LENGTH proves a wrong-length array, not that every returned item was boolean. The
retained diagnostic cannot distinguish shorter from longer. No padding, trimming or repair occurs.

Read-only metadata reconfirmed the exact evaluated model and server:

- Model: `qwen3.6:latest`.
- Manifest SHA-256: `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`.
- Config digest: `sha256:5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa`.
- Config parser: `qwen3.5`; advertised capabilities include thinking.
- Served version: Ollama `0.24.0`.

In the versioned [chat handler](https://github.com/ollama/ollama/blob/v0.24.0/server/routes.go#L2317-L2386),
structured output initially loses `format` for thinking-capable models with a built-in parser.
The immediate-format exception covers gemma4 with thinking disabled, not qwen3.5. Reapplication
requires both accumulated thinking and answer content. The
[parser registry](https://github.com/ollama/ollama/blob/v0.24.0/model/parsers/parsers.go#L43-L48)
selects Qwen35Parser for the installed parser name. With `think:false`, that
[parser](https://github.com/ollama/ollama/blob/v0.24.0/model/parsers/qwen35.go#L44-L60)
starts in content collection and emits no thinking. The schema-reapplication condition is therefore
never reached: this source path leaves the completion unconstrained.

This is a source-confirmed compatibility defect matching local metadata and request controls, and
the strongest explanation for the invalid length despite an exact-length schema. The installed
binary's internal path was not instrumented or reproduced with new generation in this task.
The source finding does not reveal the historical array or explain the English question specificity.

The existing health probe validates a simple ready=true response. A model can satisfy that output
without grammar enforcement; its successful result does not prove constrained decoding. Likewise,
18/18 screening and many passing C cases do not prove the schema was active.

## Correction to the earlier grammar diagnosis

Report 169 correctly identified missing uniqueItems support in the generic array converter. That
remains a constraint limitation when conversion runs, but is incomplete as an explanation of this
candidate's actual chat path: the schema bypass precedes conversion. Spec 0002's fixed vectors
still make successfully decoded references duplicate-safe; they do not guarantee provider output
has the required shape. The runtime rejection remains necessary. No previous failed evidence is
reclassified as passing, and no constraint is weakened.

## Next bounded work and acceptance boundary

**Design follow-up:** The user subsequently requested this design; spec 0003 under D-512 now
specifies J implementation and K provider qualification before fresh B/C. No tests or inference
ran in that design task, and no fixed provider candidate has been selected.

No new phase is needed. The next proposed task is a recovery design addressing both boundaries:

1. Establish a provider configuration/version whose chat path applies the schema with thinking
   disabled for the exact parser. Review a candidate fix before choosing any upgrade or adapter
   change; do not enable thinking as a workaround. Define synthetic schema-enforcement qualification
   for fixed-length arrays and other used constraints, beyond the cooperative health response.
2. Specify runtime enforcement of declared material fact/action dependencies, rejecting incomplete
   selections rather than filling them in. Review a narrow allowlist of semantic qualifiers for
   model context, retaining data minimization. Keep question-specific completeness in golden
   acceptance; dependency closure alone does not solve the missing posted comparison fact.

Do not hardcode golden question IDs, select every fact to force a pass, normalize invalid arrays,
capture raw provider output or lower acceptance thresholds. A future approved change requires
appropriate deterministic verification, exact provider requalification and fresh B then uninterrupted
C evidence. This diagnosis authorizes none of those executions. D stays blocked and deployment
provider mode stays disabled at deterministic milestone 0.16.0.

## Verification and impact

Read-only source/artifact/metadata review only; no test or inference result is claimed. Existing
artifacts retain synthetic expected-reference names in golden errors, but no raw model response,
selection bits or employee values were recovered or added. No domain, authorization, retention,
database or accessibility behavior changed. Project status, TODO, task board, decision record and
the affected earlier reports/spec now distinguish these findings from the historical assumptions.
