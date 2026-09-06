# 0004. Employee Insight evidence acceptance alignment

**Date:** 2026-09-06  
**Status:** Implemented and deterministically verified; fresh qualified B failed 3/9 in report 195 after health passed
**Decision:** D-515  
**Evidence:** `docs/186-wl-1508b-evidence-selection-diagnosis.md`; `docs/188-wl-1508b-evidence-acceptance-implementation.md`; `docs/189-wl-1508b-acceptance-screen-health-timeout.md`

**Current scheduling:** D-519 and [report 198](../../../198-wl-1508m-fact-action-recovery-disposition.md)
defer the optional pilot after M's bounded review found no supported complete repair within this
contract. M remains unchecked/blocked; no fresh screen or repeated diagnosis is queued. The design
and historical outcomes below remain unchanged. A question-intent amendment is proposed, not accepted.

## Scope and selected approach

Keep `submission-actions` as a navigation-only question. Do not add the blocker count to the
question merely to preserve an accidental evaluator dependency: `submission-count` already tests
that distinct semantic obligation. Keep both requested navigation actions mandatory.

Replace the golden fixture's exact count-fact dependency with a bounded supporting-evidence
contract. The accepted fact selection for this question is any nonempty subset of exactly:

- `fact_submission_count`, which is connected to the requested monthly-review destination; and
- `fact_submission_pending`, which is connected to the requested pending-request destination.

The schedule and ledger blocker facts do not satisfy this question and are not permitted in a
passing `submission-actions` answer. An arbitrary nonempty fact therefore remains insufficient.
The two required actions and their exact source union cover each requested destination. Supporting
facts apply to the statement as a whole; requiring one fact for every destination would turn a
where-to-review question into an unasked blocker-detail question.

This is a synthetic evaluation-contract correction plus a coherent model-instruction refinement.
It is not a production intent classifier or new runtime grounding invariant. The public minimum of
one fact and one source, final reference validation, exact source union, native fallback, provider
schema, selection-v1, authorization and zero-tolerance gate remain unchanged.

## Golden fact-acceptance contract

Replace the fixture-only flat `requiredFactReferences` field with an explicit acceptance object:

```ts
type EmployeeInsightGoldenFactAcceptance = Readonly<{
  allowedReferences: readonly string[] | null;
  requiredGroups: readonly (readonly string[])[];
}>;
```

Every `requiredGroups` entry is an OR clause and every group must be satisfied. Multiple groups
combine with AND. A singleton group preserves the current exact required-reference behavior. When
`allowedReferences` is `null`, other grounded native facts remain permitted, matching the existing
evaluator. When it is an array, every selected fact must occur in that array. A non-null allowlist
must be nonempty.

Convert existing golden questions mechanically: every current required reference becomes one
singleton group and `allowedReferences` remains null. Questions with no fact-specific golden
requirement retain an empty group list. Configure only `submission-actions` as:

```ts
{
  allowedReferences: ['fact_submission_count', 'fact_submission_pending'],
  requiredGroups: [['fact_submission_count', 'fact_submission_pending']],
}
```

The fixture constructor must reject empty groups, duplicate entries within an allowlist or group,
unknown native fact references, and a required group outside a non-null allowlist. Freeze the copied
arrays so later tests cannot mutate acceptance. This validation operates only on source-controlled
synthetic fixtures and must not enter production request handling.

The evaluator keeps its current prose-first ordering. It then checks fact groups in declaration
order, rejects selected facts outside a non-null allowlist in native statement order, checks required
actions, and finally checks forbidden prose tokens. Preserve the existing singleton error text so
unchanged tests and evidence remain comparable. Use closed deterministic messages for a missing
alternative group and an unexpected fact; no provider output or question prose enters those errors.

The evaluator still receives only a grounded public interpretation. It does not repair selections,
derive production requirements from free text, or alter successful runtime validation. Historical
artifacts retain the acceptance rules and outcomes that existed when they were recorded.

## Coherent navigation instruction

Amend the D-514 navigation instruction in both system messages without locale-specific examples or
golden identifiers:

- select at least one supplied supporting fact for every answer;
- for a navigation question, select supporting facts only when their `sourceReferences` overlap a
  selected action/source for a destination actually requested by the question;
- one such fact may support the navigation statement as a whole; do not manufacture one fact per
  destination;
- keep each requested read-only destination action and its exact source union; and
- if no supplied fact has that relationship, do not select unrelated filler or invent evidence;
  the existing safe unavailable path remains correct.

This relationship is visible in the already minimized request-memory context. No native value,
CURRENT qualifier, request state, protected label or new identifier is exposed. The instruction can
guide generation but cannot independently prove natural-language relevance, so the separate golden
contract remains authoritative for B and C.

## Deterministic acceptance cases

Implementation must add or update focused cases for all supported locales and reordered native
fact/action tables:

- count only, pending only, and both accepted facts pass with both required actions and the exact
  resulting source union;
- empty facts retain the existing runtime cardinality rejection before golden evaluation;
- schedule only and ledger only are runtime-grounded but fail the required alternative and the
  fixture allowlist;
- pending plus schedule satisfies the alternative but fails the allowlist;
- omission of either requested action retains the existing golden action error;
- unrelated optional actions remain optional and do not change the fact contract;
- existing singleton and multi-fact golden questions retain their prior all-required behavior;
- safe-rejection questions retain no fact-specific golden requirement; and
- prompts contain the generic source-overlap rule without golden IDs, locale-specific examples,
  native values or question text copied into logs.

Run scoped formatting, TypeScript compilation, lint, the complete non-model unit/component suite,
the applicable integration suite and build. Record gated skips and repository formatting baselines
honestly. Both real-model execution flags remain disabled during implementation and deterministic
verification.

## Compatibility, privacy and staged evaluation

D-515 explicitly amends spec 0003's requirement to keep every golden fixture and expected reference
unchanged. The amendment is limited to the `submission-actions` fact-acceptance rule and its generic
navigation guidance. It does not amend material dependency closure, semantic qualifiers, provider
compatibility admission, schema qualification, public DTOs or runtime failure precedence.

K remains applicable because the server/model identity, schema, selection codec and qualification
suite do not change. Implementation changes employee prompt and evaluator source hashes, which a
fresh artifact must record. It does not authorize an inference run, provider enablement, retry,
threshold relaxation, new package, migration, phase or version bump.

After deterministic implementation evidence passes, one separately continued B screen runs
`submission-actions` 9/9 first. Only a passing first group permits `today-posted` 9/9. Any failure
stops without retry or tuning. C still requires a complete passing B; D still requires 216/216 C.
Provider deployment remains disabled throughout.

The separately continued attempt in report 189 passed exact candidate, isolation and source-drift
preflight but returned unavailable/TIMEOUT from the mandatory shared-deadline health operation
before the golden-set loop. Zero employee cases ran and no fresh evaluation artifact exists. The
stop rule prevented retry, `today-posted` and C. This does not change the D-515 acceptance contract;
it leaves its real-model B evidence pending and requires health-timeout diagnosis before another
attempt.

Report 195 records fresh D-516-qualified B: health passed but submission-actions failed 3/9.
German cases have empty required facts; Spanish cases omit the pending-request action. No second
group or retry followed. The contract remains unchanged; bounded diagnosis is next.
