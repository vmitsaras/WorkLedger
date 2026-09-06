# WL-1508B — Cardinality regression diagnosis

**Date:** 2026-09-06

**Status:** Diagnosis complete; minimum-evidence recovery design next. B remains failed/open.

## Confirmed finding

Each of the nine failed D-513 answers selected zero facts, zero sources, or both. This conclusion
follows from the recorded failure category, the exact fixture bounds and the reviewed decoder.
The existing content-free evidence cannot distinguish those alternatives. It does not establish
whether the previously missing pending-request action was selected in the new answers.

The regression exposes a gap between the generation schema and the final public contract:
fixed-length boolean vectors may contain no true entries, while every public statement requires
at least one fact reference and one source reference. Runtime rejection is correct. This is not
evidence of the old schema bypass returning, an array-length error or a broken decoder.

Only saved evidence and source were read in this diagnosis. No tests, health probes or model calls
ran; no implementation was changed. All source hashes in the failed run match the inspected files.
The artifact hash still matches report 181:
1b6c955b1d2675f2f41dc2f12b3dde3e733db59a2b3830c10ec236f9b1370a23.

## Why the category narrows to empty evidence

The path is parseInterpretation → selection codec decode → validateGroundedInterpretation.
The codec has already checked the envelope, locale, boolean item types and exact vector lengths
before final validation can emit FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID. Decoding selects
only existing native references at true positions, so selected counts cannot exceed table sizes.

| Field | Native entries in submission-actions | Allowed final references | Can explain this failure? |
|---|---|---|---|
| actionReferences | 2 | 0–20 | No |
| factReferences | 4 | 1–20 | Yes, if no fact is selected |
| limitationReferences | 0 | 0–20 | No |
| sourceReferences | 3 | 1–20 | Yes, if no source is selected |

The classifier in employee-insight-interpretation.ts:600 checks these cardinalities using
hasReferenceCardinality. The public minima are defined in packages/contracts/src/insights.ts.
There is no way for this fixture's decoded lists to exceed 20. This is therefore a selected-count
failure, not an incorrect number of boolean positions. An all-false four-position fact vector
is structurally valid but decodes to an invalid empty fact list.

Schema parsing fails before source-union, prose and material-dependency checks. The trace cannot
prove that any of those later checks would pass. Golden evaluation never received an accepted
interpretation, so the 0/9 results cannot be used to judge whether navigation coverage improved.

## Likely prompt interaction and limits of attribution

D-513 added repeated emphasis on navigation destinations and optional actions. The earlier fact
instruction still says to cite every fact needed to answer the question. Neither instruction
explicitly states that even a navigation answer must include at least one supporting fact and
source. For a question asking where to navigate, a model can interpret the answer as requiring
actions alone. That interpretation conflicts with the final public contract even when the action
choices are relevant. This is a plausible explanation for the new failures, not recovered model
reasoning. Empty sources, or simultaneous empty facts/sources, remain possible.

The generation schema in employee-insight-selection.ts constrains vector length and boolean type;
it does not constrain the number of selected entries. K's synthetic suite intentionally permits
any schema-valid boolean choices and therefore did not certify public minimum-evidence semantics.
Its qualification remains valid within that stated scope.

The GPU-discovery warning in report 181 does not establish the cause of this regression. Health
passed and responses reached decoded-reference validation; these were not recorded transport or
timeout failures. Do not attribute their selection choices to the warning without evidence.

## Why deterministic verification did not establish recovery

The new navigation tests manually select fact_submission_count and construct its source union in
every scenario. They verify action ordering/optionality and the independent golden boundary, but
do not demonstrate that a model retains evidence while answering a navigation question. The
existing all-false fact test already expects this runtime cardinality rejection. The checks passed
because rejection behavior is correct, not because prompt compliance was proved.

## Next bounded design

Design minimum-evidence generation and content-free cardinality diagnostics before another screen.
Make the instruction coherent: cover the requested navigation destinations while retaining at
least one relevant supporting fact and its sources; preserve exact source union, independent
golden relevance and optional actions. Do not pick an arbitrary fact merely to satisfy a minimum,
select all entries, weaken public minima or repair the model's selection afterward.

If proposing generation-schema constraints for selected counts, source-review and synthetically
qualify the exact provider's support first. Full vector length is not a substitute for a minimum
true count; do not assume an unqualified JSON Schema keyword is enforced. Changed schema features
would require an explicit qualification-scope review rather than silently reusing K as proof.

For diagnostics, design a closed field/reason category identifying an empty required reference
collection, with deterministic precedence if both are empty. Do not log selection bits, indices,
references, raw content or arbitrary validator errors. Specify logger and artifact allowlist
compatibility together. This is a proposal, not a diagnostics implementation or retention change.

Deterministic cases should distinguish empty facts with valid action/source choices, empty sources
with selected facts, both empty, and valid navigation with relevant evidence; retain locale,
ordering, source-union and privacy coverage. Such tests verify boundaries, not language-model
compliance. Any fresh model screen remains a separate, bounded evaluation with no retries.

D-513 remains an unvalidated working change pending revision or withdrawal; this diagnosis does
not silently revert it. No new roadmap phase is required. Keep B unchecked, today-posted/C/D
blocked, all prior failed artifacts preserved, K complete and deployment disabled at 0.16.0.
