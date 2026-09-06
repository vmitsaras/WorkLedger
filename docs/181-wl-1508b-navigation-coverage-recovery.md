# WL-1508B — Navigation coverage recovery

**Date:** 2026-09-06

**Status:** Recovery attempt failed 0/9; B remains open. Deterministic checks passed.

## Decision and implementation

The user started B after report 180 identified question-relevant action coverage as the next
design/implementation task. Select a bounded instruction improvement, preserving the runtime
contract. Free text supplies no independently trusted required-action set; do not introduce a
keyword classifier, provider self-attestation or mandatory selection of every available action.

Both system instructions now explicitly require supplied read-only navigation actions for every
requested destination, including multiple destinations and results without material limitations.
They direct the model to use action codes, destinations and source relationships, leave unrelated
actions optional unless required by a material limitation, and invent no unavailable action.
Navigation is explicitly distinct from permission to write or approve. This is locale-independent;
no golden IDs, synthetic references, Spanish words or failing-case examples enter the prompt.

No selection schema, decoder, final validator, native context allowlist, golden expectation,
inference control or public DTO changed. This is an instruction to the model, not a deterministic
guarantee of question understanding. Independent golden acceptance remains necessary. It preserves
spec 0003's distinction between material dependencies and question-specific completeness.

## Deterministic evidence boundary

Added cases in the existing selection suite cover all three locales, native/reversed action order,
two requested destinations, omission of the second destination, a single required destination,
an unrelated optional action, and no available action. They preserve the exact selected-source union.
The omission deliberately remains runtime-valid and golden-invalid; the test does not claim to
prove that the model follows the new instruction. The canonical golden fixture is unchanged.

TypeScript compilation and 52 focused selection/interpretation tests passed on the pinned toolchain.
Both model execution flags were zero. Scoped source formatting was applied. Existing interpretation
tests cover one-generation orchestration, privacy minimization, empty optional arrays and failures.
No UI/accessibility, authorization, retention, native domain rule or deployment setting changed.
No new dependency, roadmap phase or version is needed.

The failed report 179 screen stays immutable. One fresh B screen can assess this explicit recovery:
submission-actions first, then today-posted only after 9/9 and artifact review. Stop after a failed
group, preserving evidence; C requires passing B and a separate continuation. K remains applicable
because its exact provider/schema controls are unchanged. Model results are recorded separately.

## Fresh screen outcome

One fresh submission-actions group ran after compilation, 52 focused unit tests and repository
lint/workspace/boundary/phase guards passed. No further source edits occurred during inference.
The existing qualified binary/model hashes, loopback listener, all three exact outbound blocks,
enabled firewall profiles, cloud-disabled/no-proxy/debug-disabled environment and 32768 runtime
default context were checked. The pre-existing server was unloaded and the new candidate reported
an empty loaded-model list before health. Controls stayed at 120 seconds, concurrency one,
temperature zero, thinking false and maximum 1024 generated tokens. The wrapper set employee
evaluation to 1 only for its child, schema qualification to 0, semantic ID submission-actions and
run limit 9. Each locale had exactly three runs. K was not rerun.

Health passed, but all nine employee cases failed runtime validation:
PROVIDER_INVALID_OUTPUT / INVALID_RESPONSE / FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID,
with null validationDetail. Every record has one registry execution and zero model tool rounds.
This is a failed recovery, not confirmation that the earlier action omission was fixed. The
content-free category does not identify the exact deficient reference field or retain selected
bits. No raw-output reconstruction or definitive model-cause claim is made here.

The ordinary server log reported a GPU-discovery watchdog timeout and use of an earlier memory
reading; the model subsequently loaded and both health probes passed. This warning is retained
as operational context, not assigned as the cause of semantic/reference failures. The harness
completed the fixed first group and exited 1 with no signal; the wrapper rejected its evidence.
No retry, today-posted group, C run or timeout/acceptance adjustment followed.

Evidence directory:
output/insights/wl1508b-navigation-submission-actions-1521ac14-6762-4f76-be8d-56861b91f356.
The submission-actions.json SHA-256 is
1b6c955b1d2675f2f41dc2f12b3dde3e733db59a2b3830c10ec236f9b1370a23.
run.json records profile/spec, source hashes, base revision 7281c5f8108b07b4c6132e73f31c8fae29fecc55
and 12:23:58.312–12:25:46.452 UTC timestamps. The working source includes this uncommitted recovery;
the recorded source hashes, not base revision alone, identify it. review.json reports only FAILED
and RECORD issues; strict format/coverage/control, unchanged source and post-run version/digest
checks passed. complete=false correctly identifies a partial screen. The earlier fixed-name smoke
was preserved, and the navigation wrapper is output/insights/wl1508b-navigation-run.mjs.

The owned server PID 57536 and runner were stopped after final path/listener/firewall checks.
Candidate files and outbound blocks remain. Production provider mode stays disabled. The proposed
instruction remains an unvalidated working change for review, not an accepted recovery success.
Next: diagnose this cardinality regression and decide whether to revise or withdraw the instruction
before another model run. B, C, D and the parent pilot remain open; K remains complete.
