# WL-1508B — Evidence acceptance alignment design

**Date:** 2026-09-06  
**Status:** Design complete; implementation and deterministic verification pending  
**Decision:** D-515  
**Contract:** `docs/specs/_root/0004-insight-evidence-acceptance/index.md`

**Implementation follow-up:** Report 188 records the completed implementation and deterministic
verification. The design status below is retained as the pre-implementation decision record.

## Selected decision

Keep `submission-actions` focused on navigation. Rewriting it to request the blocker count would
duplicate the separate `submission-count` question and conceal the mismatch diagnosed in report
186. Both navigation actions remain exact mandatory golden obligations.

For supporting facts, accept only a nonempty subset of the count fact connected to the month and the
pending fact connected to the named request. Count only, pending only, or both can therefore pass;
schedule and ledger blocker facts cannot. Facts support the statement as a whole, while both actions
and their exact sources cover both requested destinations. This preserves the public one-fact
minimum without demanding one unasked fact per destination or accepting arbitrary filler.

The test-only golden contract will represent required fact alternatives and an optional fact
allowlist explicitly. Existing required facts become singleton alternative groups, preserving every
other fixture's behavior. The navigation prompt will generically direct the model toward facts whose
source relationships overlap requested destination actions. Production runtime validation still
does not infer intent from free text and will not receive golden metadata.

## Boundaries

No code, test, provider, model, health, browser or deployment operation ran in this design task. No
public DTO, schema, decoder, material dependency, qualifier allowlist, native fact, authorization,
logging, retention or accessibility behavior changes. K remains valid within its provider/schema
scope. Historical artifacts and their original acceptance outcomes remain immutable.

The implementation task must update the synthetic fixture/evaluator, focused selection and
evaluation tests, and the two coherent navigation instructions. It must run deterministic non-model
verification with both model flags disabled. A fresh B screen is separate and may start only after
that evidence is reviewed; submission-actions remains the stop-first group.

## Status after design

WL-1508B remains open. Today-posted, C and D remain blocked. The parent employee pilot remains open,
provider deployment remains disabled, and version `0.16.0` is unchanged.
