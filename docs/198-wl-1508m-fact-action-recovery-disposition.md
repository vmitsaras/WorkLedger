# WL-1508M — Fact/action recovery disposition

**Date:** 2026-09-06  
**Decision:** D-519  
**Outcome:** Diagnostic review complete; M remains unchecked and blocked. Optional pilot deferred.

## Finding and disposition

No evidence-supported implementation repair was identified within the accepted free-text,
selection-v1 and D-515 contracts. The supplied context contains the information needed for this
navigation question, and the application faithfully decodes the selected entries. Existing
instructions already require the evidence and both requested actions. Report 195 establishes that
this candidate still fails those instructions; it does not establish a dropped field, indexing bug
or provider schema violation that another application patch would repair.

Use the explicit blocked/deferred exit of M in
[the execution plan](196-roadmap-reconciliation-and-pilot-execution-plan.md). Do not mark recovery
complete, start B, add a prompt experiment, switch models, or create another diagnosis/design task.
This is a bounded engineering conclusion from the available evidence, not a claim that no future
model or representation could succeed. The deterministic product remains complete at `0.16.0`.

## Trace of the two failures

| Boundary | German empty facts | Spanish missing pending-request action |
| --- | --- | --- |
| Input | The harness uses the same submission native result in en-GB, de-DE and es-ES. The question asks for monthly review and the pending request in each locale. | Both OPEN_MONTHLY_REVIEW and OPEN_MY_REQUESTS reach the context, with distinct destinations and source relationships. There is no locale-specific action filter. |
| Minimized representation | Four facts retain codes, references and source relationships. The count links to the month; the pending blocker links to the personal request. Values and CURRENT qualifiers are intentionally omitted. | The actions retain selectionIndex, code, destination, reference and sourceReferences. Their corresponding source kinds and destinations remain visible. |
| Generation schema | A four-position boolean fact array may be all false. This satisfies the generation shape, but not the public minimum-one-fact contract. | A two-position boolean action array permits either action to be false. Shape qualification does not require a question-specific position to be true. |
| Codec | The successful structural decode followed by factReferences / EMPTY_REQUIRED proves all four fact positions were false. There is no insertion or repair. | Runtime success and the independent missing-action error prove the request action was omitted and the monthly-review action was present. The codec maps positions to the current native table. |
| Grounding | Cardinality rejection occurs before source closure and material checks. German action choices and later checks are unknown. | Known references and exact source union pass. With no material limitations, material-action closure supplies no question-specific obligation. Grounding receives nativeResult and locale, not trusted question intent. |
| Golden evaluation | No accepted interpretation reaches the golden checks. Do not infer whether actions would pass. | Both actions are mandatory under D-515. The independent evaluator correctly rejects the omission even though runtime grounding passes. No fact error establishes an accepted nonempty subset of count/pending, but not which subset. |

Report 195 retained no raw outputs or selections. Its artifact hash was checked again and matches:
`00cb31dfb2b5a4a0f864849371bf7a4dff0621dbcc85a1e613b94ee40ec30042` for
`output/insights/wl1508b-evidence-submission-actions-ad0781ac-adca-4760-8f4b-874397434174/submission-actions.json`.
No missing raw output was reconstructed or logged. Repeated failures establish repeatability for
that run, not the model's rationale or a causal explanation based on translation.

## Distinguishability and repair review

For this navigation question, the allowed context is sufficient to distinguish both destinations
and the D-515 supporting fact alternatives using codes and source relationships alone. The pending
fact's source is PERSONAL_REQUEST / MY_REQUESTS, while the count uses MONTHLY_PERIOD /
MONTHLY_REVIEW. The schedule and ledger blockers share a daily source and are excluded by D-515.
Their omitted state values are not needed to distinguish the two requested navigation destinations.
Exposing those values or relying on semantic words in synthetic reference IDs would not repair a
demonstrated context loss. References remain identifiers, not a trusted intent vocabulary.

| Candidate intervention | Disposition |
| --- | --- |
| Repeat or strengthen navigation prompts | D-513 through D-515 already did this; report 195 fails the current explicit obligations. Another wording-only trial lacks evidence for a recovery mechanism. |
| Enforce a minimum true fact bit in a new schema | Could prevent an empty fact vector if supported and requalified, but could select an unrelated fact and leaves the Spanish action omission untouched. It is not a complete M recovery. |
| Require all actions or reverse source closure | Would change optional actions into mandatory ones for single-destination and non-navigation questions. Shared sources do not establish which destinations the user requested. |
| Fill omitted references or copy golden requirements into production | Violates no-repair, independent acceptance and native selection boundaries. A provider-declared required set is not an independent completeness check. |
| Broaden native values/labels or switch candidate | No missing navigation information justifies broader disclosure; no reviewed replacement evidence justifies a candidate switch in this slice. |
| Introduce a typed question-intent contract | A concrete possible product change, but not an existing contract or an implemented repair. Define its authority and effect on free-text questions before adopting it. |

## Decision needed to resume

The default disposition is to keep the optional pilot deferred and use complete native Insights.
There is no ready implementation or model-run task. To resume M, establish a bounded product
contract for **explicit user-selected question intent**, with server-validated read-only
destinations and supporting-evidence rules derived from the authorized native result. That design
must define how a free-text question that conflicts with the selection is handled, how non-navigation
questions retain their scope, and how unknown/ambiguous intent fails safely. Merely classifying free
text with the same provider and trusting its declaration would retain the current validation gap.

This proposal would amend D-515's production-intent boundary and the current request contract. It
would affect contracts, API validation/grounding, localized accessible intent controls if adopted,
and deterministic/golden cases; it requires an explicit accepted amendment before implementation.
It must preserve authorization, native authority, exact sources, material dependencies, privacy and
complete fallback. It is neither approved nor scheduled by this report. Alternatively, new causal
evidence of a concrete defect within the existing contract could justify reopening this same M
slice; unchanged diagnostics alone cannot.

## Verification

Executed with both real-model flags set to `0`:

```powershell
$env:WORKLEDGER_RUN_AI_EVALUATION = '0'
$env:WORKLEDGER_RUN_SCHEMA_QUALIFICATION = '0'
& .\node_modules\.bin\node.EXE node_modules/vitest/vitest.mjs run apps/api/test/employee-insight-selection.unit.test.ts apps/api/test/employee-insight-interpretation.unit.test.ts apps/api/test/employee-insight-completeness.unit.test.ts apps/api/test/employee-insight-evaluation.unit.test.ts apps/api/test/employee-insight-evaluation-artifact.unit.test.ts --maxWorkers=2
```

Exit 0: **101 tests passed in five files**. Existing tests cover en-GB/de-DE/es-ES, reordered fact
and action tables, empty evidence, count/pending/both alternatives, rejected filler, optional and
missing navigation, exact sources, material dependencies, minimized context, rejection/fallback
and strict artifact acceptance. These are application-boundary checks with constructed selections;
they do not prove model question understanding. No redundant rejection test was added or relabeled
as recovery evidence. Source review also checked the integration harness's shared locale fixture.

Only planning and disposition documentation changed. No full suite or database/browser test was
repeated for this documentation-only disposition; the complete L result remains separately recorded
in [report 197](197-wl-1508l-reproducible-verification.md). The scoped repository Prettier command
exits 0 but Markdown is excluded by the existing ignore file, so that is not a Markdown formatting
validation. Separate checks passed: 104 relative links resolve across nine reviewed documents,
all 164 executable task checkboxes match HEAD, no task-board row is Ready, and M is Blocked.
The phase check passed all 16 gates at `0.16.0`; `git diff --check` passed. The content-free audit is
`output/wl1508m-documentation-review.json`. All tracked changes are documentation only.

## Qualification and gates

No employee prompt, context, codec, schema, evaluator, provider adapter, dependency or configuration
changed. This disposition does not invalidate report 194 within its exact qualification scope; it
also does not refresh identity, health or isolation evidence. No health, qualification, employee
inference or deployment ran. A future schema change requires qualification impact review and fresh
qualification of affected behavior, not a claim that historical 18/18 proves the new contract.

M and parent WL-1508 remain unchecked; B/C/D remain blocked. If an accepted repair later completes
M, B still must demonstrate fresh submission-actions 9/9 followed by today-posted 9/9 on frozen,
qualified inputs. C remains 27-case preflight then one uninterrupted 216-case gate. Provider
deployment stays disabled. No domain, security, retention, UI or accessibility behavior changed.
