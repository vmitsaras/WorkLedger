# WL-1508B — Minimum evidence and cardinality diagnostics design

**Date:** 2026-09-06

**Status:** Design specified; implementation and verification pending.

**Decision:** D-514. Builds on reports 180–182 and spec 0003.

## Selected scope

Revise D-513's navigation instructions to preserve the existing minimum supporting evidence, and
extend content-free diagnostics for the existing cardinality rejection. Keep selection-v1,
the generation schema, decoder, public DTO, final validation rules and golden acceptance unchanged.
This is a bounded B recovery, not a new roadmap phase. No implementation, test or model run is
performed by this design. Earlier 6/9 and 0/9 screens remain failed evidence.

The final contract already enforces one or more facts and sources. Generation currently has no
trusted question-intent set, and fixed boolean lengths do not enforce true counts. Do not add
an assumed-supported schema keyword, mandatory arbitrary fact, keyword classifier or model
self-attested completeness set. Stronger instructions may improve compliance; runtime validation
continues to reject invalid selections, and golden evaluation independently assesses relevance.

## Coherent generation instructions

Rewrite the related instruction sentences as one consistent obligation in both system messages,
rather than accumulating another exception. Preserve existing security and material-dependency
instructions. State the following explicitly:

- Every answer, including a navigation answer, must select at least one supplied fact that supports
  the answer and at least one supplied source. Navigation actions supplement this evidence.
- Select each available read-only action needed for the destinations requested by the question.
  Cover multiple requested destinations without selecting unrelated optional actions.
- Select the exact union of sources required by selected facts, actions and limitations. Do not
  choose an unrelated source merely to satisfy the minimum; a source is not interchangeable with
  a fact and an action is not a substitute for evidence.
- Preserve material limitation dependencies, fixed positional booleans, safe prose, no invented
  reference/content and no write/approval authority. No locale-specific examples or golden IDs.

Do not demand arbitrary evidence if no supplied fact supports the answer. Do not add a new
refusal envelope or repair mechanism: existing invalid/unrepresentable outputs retain the safe
unavailable fallback. This slice does not promise a successful answer for every native result.
The model still chooses relevance; neither these instructions nor a future true-count constraint
would prove that the selected fact answers the question.

## Closed cardinality detail

Extend InsightValidationDetail with exactly:

```ts
type ReferenceCardinalityDetail = {
  kind: 'REFERENCE_CARDINALITY';
  field: 'factReferences' | 'sourceReferences' | 'actionReferences' | 'limitationReferences';
  reason: 'EMPTY_REQUIRED' | 'EXCEEDS_LIMIT';
};
```

The detail is valid only with FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID. EMPTY_REQUIRED is
valid only for factReferences and sourceReferences. EXCEEDS_LIMIT is valid for any of the four
fields. No counts, expected lengths, indices, selection bits, references, prose, native values,
parser issues or arbitrary diagnostic strings enter the record. Reject extra keys and invalid
field/reason/code combinations through the shared sanitizer.

Compute detail from the already decoded candidate only when the current classifier returns the
cardinality code. Preserve all existing earlier envelope/text/type/duplicate classification and
validation precedence. Inspect fields in the existing cardinality order: factReferences,
sourceReferences, actionReferences, limitationReferences. For the first violating field, return
EMPTY_REQUIRED if its required array is empty, otherwise EXCEEDS_LIMIT if its length exceeds 20.
If the candidate shape is unsafe or no cardinality violation can be confirmed, return null.
Use existing public bounds; do not introduce a different limit.

When both facts and sources are empty, record factReferences/EMPTY_REQUIRED. The diagnostic
identifies the first violation only, not an exhaustive account of the rejected answer. Later
source-union/material/golden outcomes remain unknown. Do not infer they passed because they lack
a recorded code. Preserve the existing provider failure classification and public safe fallback.

## Logger and artifact compatibility

Update the shared sanitizer, runtime detail extraction, logger enforcement and evaluation artifact
reader/tests together. Reconstruct only the closed allowlisted object. Null remains permitted for
historical cardinality records and malformed/unavailable detail. Runtime logging drops invalid
detail to null according to the existing sanitizer contract; strict artifact reading continues
to reject invalid non-null details rather than silently accepting them.

Keep employee artifactVersion=2 and providerOutputFormat=selection-v1: the envelope is unchanged
and only the closed diagnostic union is extended. Older strict readers may reject this new detail;
upgrade the reader before reviewing new runs, record D-514/source provenance, and retain historical
null-detail artifacts without modification. Do not backfill the exact field for report 181.

No API public error, authorization scope, employee-data retention or model-context allowlist
changes. This explicitly extends D-513's diagnostic scope while retaining its other boundaries.

## Implementation and acceptance checks

Expected files: employee-insight-interpretation.ts, logging/insight-validation-detail.ts, the
existing interpretation/selection/logger/artifact unit tests, and operations/status/task docs.
The artifact reader already delegates to the shared sanitizer; change its code only if required
to preserve strictness. Do not change golden fixtures or provider configuration.

Required deterministic cases:

1. Full-length all-false fact selections with valid action/source selections decode but fail with
   factReferences/EMPTY_REQUIRED. Source-only emptiness reports sourceReferences/EMPTY_REQUIRED.
2. Both empty reports the fixed fact-first detail. Empty optional action/limitation arrays remain
   valid where no material requirement applies. A valid navigation answer retains supporting
   facts and exact sources, all requested actions and optional unrelated-action behavior.
3. Twenty references remain allowed; 21 in each field reports EXCEEDS_LIMIT. Cover this at the
   direct final-validation boundary where some native/decoded collections cannot reach 21.
   Earlier duplicate/type failures keep their existing codes/details and precedence.
4. Locale variants and reordered action tables retain the same boundary behavior. Existing
   omission tests still demonstrate runtime-valid but golden-incomplete answers where appropriate.
5. Logger and artifact cases admit valid combinations; reject extra keys, arbitrary strings,
   invalid reason/field pairs and detail under a different failure code. Canary content and
   selection arrays cannot enter retained diagnostics. Old null-detail records still parse.
6. Mocked orchestration still sends one generation with the same schema and minimized context;
   no automatic retry or selected-reference repair is introduced. Instruction checks may confirm
   delivery but must not be represented as proof of model compliance.

Run applicable format, compile, lint and focused deterministic/privacy checks before any fresh B.
Record limitations honestly. Because the provider and generation schema are unchanged, K need not
be rerun for this slice; confirm exact profile/isolation again before an authorized employee run.
If implementation changes schema features, stop and reassess qualification scope instead.

After implementation and deterministic verification, a separately continued B screen runs the
fixed submission-actions group, then today-posted only after 9/9 and artifact review. Stop on a
failed group; do not retry or tune within the attempt. C requires passing B and its own continuation.
No success is claimed by this design. B/C/D remain open and deployment disabled at 0.16.0.
