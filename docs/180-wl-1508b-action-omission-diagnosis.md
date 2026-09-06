# WL-1508B — Pending-request action omission diagnosis

**Date:** 2026-09-06

**Status:** Diagnosis complete; recovery design next. B remains failed/open.

## Finding

The Spanish submission-actions answers omitted a question-required navigation action that was
available in the authorized context. Nothing in the current schema or runtime action-completeness
contract requires that action for this fixture. The prompt explicitly asks for question-relevant
facts, but explicitly requires actions only through material limitations. The fixture has no
limitations. This explains how an incomplete answer can pass runtime validation and still fail
independent golden acceptance. It does not establish why this model chose differently in Spanish.

This task inspected code, preserved evidence, tests and spec 0003 only. No tests, health probes,
model inference or application changes ran. The artifact hash matches report 179, and every
source hash recorded in that run matches the current inspected file. Historical evidence stays
unchanged. K remains qualified; deployment remains disabled at 0.16.0.

## Trace through the boundaries

| Boundary | Evidence and implication |
|---|---|
| Golden question | employee-insight-golden-set.ts:505 asks where to review the month and pending request in all three locales. It requires the blocker-count fact and both navigation actions. Spanish has the same two requested destinations as English/German. |
| Native fixture | SUBMISSION_RESULT at line 142 contains OPEN_MONTHLY_REVIEW followed by OPEN_MY_REQUESTS, referencing separate month/request sources. At line 193, limitations is empty. The pending-request action is not missing from native data. |
| Locale input | The evaluator's createSource at line 181 reuses the same native fixture and changes the locale/capturedAt wrapper. There is no Spanish-specific action list or sorting. |
| Model context | minimizeNativeResultForModel at interpretation.ts:399 preserves both actions in native order, with selectionIndex, code, destination, reference and sourceReferences. Index 0 is monthly review; index 1 is personal requests. |
| Schema | employee-insight-selection.ts creates exactly two boolean action positions. It constrains type and length, not which question-relevant positions must be true. Both true and false are valid at index 1. |
| Decode | The codec snapshots the same native order, checks every boolean and selects a reference exactly when its corresponding value is true. It does not truncate, reorder, deduplicate or repair actions. |
| Grounding | validateGroundedInterpretation at line 457 receives nativeResult and locale, not the user's question. It validates existing references and the source union of selected entries; it does not require every action connected to a selected source. |
| Material completeness | insightLimitationDependencies maps limitations; validation filters to material limitations before checking required actions. An empty limitation list yields no required material actions. The new FINAL_MATERIAL_ACTION_MISSING check is therefore inapplicable here. |
| Golden acceptance | evaluateGoldenInterpretation at fixture line 720 independently checks each requiredActionReference. It correctly detects the missing personal-request action after service success. |

The public actionReferences array permits zero actions, unlike the minimum-one fact/source
requirements. Consequently, raising confidence in array shape cannot by itself repair action
coverage. Adding a generic minimum-one action rule would still allow this exact one-action answer.
Requiring a source does not imply citing every action sharing that source under the accepted
one-direction source-union contract.

## What the retained evidence establishes

Report 179 records three identical Spanish golden errors for action_submission_requests and no
other golden errors. Runtime outcome is SUCCESS with null provider/validation failure codes.
The required monthly-review action and blocker-count fact were therefore present in the accepted
interpretation according to the independent evaluator. With exactly two native actions and the
reviewed deterministic codec, the implied action selection is [true, false]. This is a deduction
from code and recorded acceptance checks, not recovered raw model output. Exact JSON formatting,
other selected references and generated token decisions cannot be reconstructed.

The failure does not indicate a duplicate-reference error, malformed boolean array, transport
failure, stale locale fixture or dropped action in minimization. It shows the remaining boundary
between structurally grounded output and answering all parts of the question. K's 18 synthetic
cases expressly permit any schema-valid boolean values; their pass is consistent with this failure.

## Prompt and context observations

systemInstruction at line 299 requires every fact needed to answer the question and every material
limitation. Its explicit action requirement is restricted to each material limitation's related
actions. finalResponseInstruction at line 316 reinforces material dependencies and posted/projected
comparison coverage, without an equally explicit requirement to cover every requested navigation
destination. The general instruction to explain an Insight still applies, but leaves action
coverage less explicit than fact/material coverage. This asymmetry is a plausible contributor,
not proof that a prompt edit alone will recover the model.

Minimization intentionally omits native fact values and CURRENT qualifiers. Thus the pending
blocker's native state value is absent, although OPEN_MY_REQUESTS, MY_REQUESTS and PERSONAL_REQUEST
remain visible in the relevant action/source context. The action is distinguishable without
exposing that state. Do not widen the privacy allowlist or add protected request-state content
merely to fit this failure. No demonstrated data-availability defect requires that change.

The earlier report 171 screen passed under Ollama 0.24.0 and the pre-J prompt/context. This run
uses 0.33.3's different inference engine plus J's changes. Those are confounded changes, so the
observed regression cannot be attributed solely to the runtime upgrade, J's instructions or the
Spanish phrasing. Temperature-zero repetitions are repeatability evidence, not three independent
causal experiments. No controlled comparison or retry was performed in this diagnosis.

## Coverage and bounded next design

Existing tests cover positional decoding, optional/empty action selections and material dependency
closure. They also intentionally demonstrate runtime-valid output failing question-specific golden
fact requirements. They do not establish a general question-to-action completeness policy. The
failing real screen supplies evidence for this analogous action boundary; no passing test result
is claimed by this read-only review.

Next design should define question-relevant action coverage explicitly, distinguishing model
instructions from deterministic guarantees. At minimum, make the obligation to cover every
requested authorized navigation destination coherent across instructions. If runtime enforcement
is proposed, first define how trusted required-action intent is obtained: the current request
contains free text, and a provider-declared required set cannot independently validate itself.
Do not claim that material-source closure alone solves this question-understanding problem.

The design's deterministic cases should include a no-limitation, two-destination question with
the second action omitted; complete coverage of both; an unrelated optional action; a one-destination
question; no available action; reordered native action tables; locale variants; and source-union,
privacy and public-cardinality preservation. Retain independent golden checks for all requested
destinations. Tests that document the present semantic gap must not be relabeled as proof of a fix.

Do not hardcode the golden ID, Spanish words or synthetic reference names into production logic;
force every available action for every question; fabricate a material limitation; autofill an
omitted action after generation; add a repair generation; weaken the golden expectation; or retry
until a favorable sample appears. Any broader runtime contract change needs a bounded accepted
design consistent with spec 0003. No new roadmap phase is needed. Keep B open, today-posted/C/D
blocked, and preserve the failed 6/9 screen while designing the next recovery slice.
