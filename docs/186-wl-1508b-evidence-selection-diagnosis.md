# WL-1508B — Evidence-selection failure diagnosis

**Date:** 2026-09-06  
**Status:** Diagnosis complete; B remains failed/open; today-posted, C and D remain blocked

## Confirmed finding

Report 185 contains two different failures, both exposed by the same unresolved semantic boundary.
German produced a structurally valid, full-length all-false fact selection, which correctly failed
the public minimum-one-fact contract. English and Spanish selected at least one different fact and
both requested actions, passed every runtime grounding check, then failed only because the golden
fixture requires `fact_submission_count`.

The exact golden requirement is not aligned with the question. The question asks where to review
the month and the pending request; it does not ask how many blockers exist. The most direct fact for
the pending-request part is the supplied pending-blocker fact, while the required count fact is tied
to the month source. D-514 simultaneously tells the model to select a supporting fact and not to
select an unrelated fact merely to satisfy the minimum. Requiring the count for this navigation-only
question therefore makes the evaluator demand a choice that the generation instructions do not
semantically justify.

This is not a provider-schema, decoder, source-order, transport, authorization or locale-fixture
defect. It is a question-to-evidence contract defect combined with the already documented absence
of a trusted question-intent requirement at runtime. The model still owns relevance selection;
runtime validation can prove grounding and minimum cardinality, but it cannot prove that the chosen
fact answers a free-text question.

Only preserved content-free evidence, current source and history were read. No test, health probe,
model inference, implementation change, acceptance change or deployment operation ran. The report
185 artifact SHA-256 remains
`a89e5751b9dbfd4bb0f3f918b4b9c0bac1fe7c19052f6c04bff65d88b597caaa`, and all eleven source
hashes in its `run.json` match the inspected checkout.

## Evidence trace

| Boundary | Confirmed behavior | Consequence |
| --- | --- | --- |
| Golden question | `submission-actions` asks where to review the month and pending request in each locale. | Both destinations are question material; no wording asks for the blocker count. |
| Golden expectation | The fixture requires `fact_submission_count` plus both navigation actions. | A grounded answer using another supporting fact fails even if it answers both requested destinations. |
| Supplied facts | The ordered facts are blocker count, pending-request blocker, schedule blocker and ledger blocker. | More than one fact can plausibly support the native result; the pending fact is more directly connected to the request named in the question. |
| Minimized context | Facts retain code, reference and source relationships. `CURRENT` is not in the narrow qualifier allowlist, and values are intentionally omitted. | The count code remains distinguishable, but the model receives neither the count value nor a semantic reason that the question requires it. This is a contributor, not a data-loss defect. |
| Actions and sources | The month action requires the month source; the request action requires the request source. The count fact uses the month source and the pending fact uses the request source. | Selecting both actions already requires both sources. Selecting the count rather than the pending fact adds no source-closure signal that could resolve relevance. |
| Selection schema/codec | The provider must return four booleans for facts, but the schema permits all four to be false. The codec maps true positions only and performs no repair. | German's empty decoded fact list proves an all-false fact vector after successful structural decoding. |
| Runtime grounding | Facts and sources must be nonempty, references known, and sources the exact union required by selected facts/actions/limitations. The validator does not receive the question. | English/Spanish prove at least one non-count fact, both actions and a valid exact source union, but not which non-count fact was selected. |
| Golden evaluator | It checks the exact required fact/action references after runtime success. | English/Spanish correctly report the missing count under the current fixture, but that assertion is fixture-specific rather than a general relevance invariant. |

## What report 185 establishes

For each English and Spanish repetition, `SUCCESS` plus the single golden error establishes all of
the following:

- `fact_submission_count` was absent;
- at least one of the three other facts was selected because public validation requires a nonempty
  fact list;
- both `action_submission_review` and `action_submission_requests` were selected because the golden
  evaluator reported neither action missing; and
- the selected facts/actions had a nonempty, known, exact source union.

The artifact does not identify which other fact or facts were selected. In particular, it is
reasonable but not evidentially valid to assume the pending-request fact was chosen. The selection
bits, reference lists, provider output and model reasoning were intentionally not retained.

For each German repetition, the D-514 detail establishes that `factReferences` was empty. Because
the selection codec had already accepted the exact four-position boolean vector, every fact
position was false. Fact cardinality is the first final-schema violation, so German source and
action selections, source union, later grounding checks and golden coverage remain unknown.

The same native fixture and position order are used for all locales. Only the localized question,
safe prose constant and locale envelope vary. The repeatable locale split is therefore model
selection behavior conditioned on those inputs, not evidence of a locale-specific native fixture,
sorting or decoding path. Temperature zero and repeated identical categories do not reveal the
model's rationale or prove that a translation caused the difference.

## Why D-514 could not close the gap

D-514 successfully made empty required evidence diagnosable and stated the public minimum in both
system instructions. Its deterministic tests correctly show that an all-false fact vector is
rejected and construct passing navigation examples by manually selecting
`fact_submission_count`. Those tests validate mechanics and the existing fixture expectation; they
do not establish that the count is the right supporting fact for the question or that a model will
choose it.

The runtime has no trusted `requiredFactReferences` derived from the question. The question is
untrusted free text, the provider cannot attest its own completeness, and source closure only proves
relationships for entries the provider already selected. Prompt emphasis can move the observed
selection—as reports 179, 181 and 185 demonstrate—but cannot independently enforce question-specific
evidence. Another wording-only recovery would leave the same unverified boundary.

## Bounded next design

Before another B screen, decide one coherent acceptance contract for `submission-actions`:

1. If the question remains navigation-only, replace the arbitrary exact count dependency with a
   reviewed supporting-evidence rule. The smallest options are a fact explicitly connected to the
   pending request, or a bounded set of acceptable supporting fact combinations. Define whether
   evidence must support each requested destination, not merely one statement overall.
2. If the blocker count is genuinely required product content, rewrite all three localized
   questions to ask for that count as well as both destinations. Then the existing exact fact
   requirement becomes question material.

Do not silently delete the minimum-one-fact contract, accept an arbitrary nonempty fact, force every
fact, hardcode a production golden ID, expose native values merely to coerce the selection, infer
selection bits from token counts, or retry until a favorable output appears. A fixture/evaluator
change alters accepted evaluation semantics and therefore needs an explicit bounded decision,
deterministic tests and fresh B evidence; it is not a documentation-only correction.

No new roadmap phase is required. B stays open, K stays complete, today-posted and C remain blocked,
D remains unexecuted, the parent pilot remains open, provider deployment remains disabled, and
version `0.16.0` is unchanged.

## Verification and impact

Read-only artifact/source/history review only; no command result is represented as a product test.
No domain calculation, permission, API, UI, accessibility, database, migration, dependency,
provider configuration, privacy allowlist or retention behavior changed. The existing native
fallback remains complete and accessible independently of the failed optional model selection.
