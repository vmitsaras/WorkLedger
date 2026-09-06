# 0003. Employee Insight schema enforcement and completeness

**Date:** 2026-09-06  
**Status:** J implementation/deterministic verification complete; K qualification pending
**Decision:** D-512  
**Evidence:** `docs/173-wl-1508c-selection-failure-diagnosis.md`

Implementation evidence and outstanding checks: `docs/174-wl-1508j-schema-completeness-implementation.md`.

## Scope and selected approach

Recover the optional employee pilot through two independent boundaries: qualified constrained
generation with thinking disabled, and runtime rejection of incomplete material dependencies.
Retain selection-v1, the public interpretation DTO, independent golden acceptance, one authorized
registry execution and one tool-free employee generation. Add only a narrow semantic qualifier
allowlist to the existing request-memory model context. No native values enter model prose.

WL-1508J implements the application changes and deterministic verification. WL-1508K separately
selects and qualifies an exact provider candidate before fresh B and C. This document does not select
an available fixed Ollama release or authorize installation, tests, inference or deployment. No new
phase or version milestone is needed. Existing B evidence remains historical for this changed pipeline.

## Provider recovery policy

The [Ollama 0.24.0 chat path](https://github.com/ollama/ollama/blob/v0.24.0/server/routes.go#L2317-L2386)
removes format for this thinking-capable parser, while the
[Qwen parser with thinking disabled](https://github.com/ollama/ollama/blob/v0.24.0/model/parsers/qwen35.go#L44-L60)
does not produce the thinking transition needed to restore it. Treat that exact combination as
ineligible even if cooperative health or synthetic outputs happen to pass.

Select a supported stable upstream release whose versioned chat/parser/converter path applies the
requested schema before answer generation with think:false. Prefer retaining the qualified model
manifest to isolate the runtime change. A different model is a new candidate requiring the same full
qualification. Do not assume a newer version is fixed, enable thinking, remove the parser, patch model
metadata, switch to /api/generate, introduce a proxy rewrite or maintain an unreviewed Ollama fork.
If no suitable upstream candidate is established, J may complete its deterministic scope while K
remains open and generation unavailable. Do not invent a qualifying profile to unblock evaluation.

### Compatibility profile and readiness

Add a small source-controlled compatibility-profile table alongside the adapter, not a remotely
supplied approval document. A profile identifies an exact server version, model manifest digest,
reviewed model-config digest/parser, schema-suite revision and pinned source-review references.
Initially there is no eligible real profile. Test fixtures use isolated dependency injection; no
production environment flag bypasses eligibility. K may add a candidate profile after source review
to permit synthetic qualification; that profile permits evaluation, not deployment approval.

Add WORKLEDGER_OLLAMA_COMPATIBILITY_PROFILE to optional-provider configuration and .env.example.
It is required only for mode=ollama, is a closed profile identifier, and must match the existing
model/digest configuration. Disabled mode requires no profile. Missing/unknown/mismatched profiles
fail configuration validation without echoing values. A candidate is not selected by a version range.

Extend the private adapter path allowlist only with GET /api/version. Use its existing private-address,
origin, redirect, timeout and response-size protections. At health check, validate exact version and
model digest before either synthetic chat request. Confirm advertised capabilities as today. Parser
identity is established by source-reviewed manifest/config evidence bound to the exact manifest digest;
do not assume /api/show exposes a parser field or access the model filesystem from the application.

Keep the existing cooperative capability probe, then add one compact fixed schema challenge from
the qualification suite below. Both fit within the existing single health-operation deadline and
concurrency slot; do not multiply the timeout. Readiness requires both to pass, empty thinking, no
tool calls and the exact supported profile. A failure leaves readyAddresses unset. Before every
employee generation, recheck server version and model digest through the same approved addresses.
A mismatch invalidates readiness before /api/chat. Recheck profile metadata after a qualification
batch too; no claim of atomic attestation across external server replacement is made.

Use new internal provider reason codes PROVIDER_PROFILE_MISMATCH and SCHEMA_PROBE_FAILED,
both classified as misconfigured. Missing profile configuration is a startup configuration error.
Existing public safe error/fallback mapping remains unchanged; do not expose version, parser or
model metadata through public health/errors. Add these enums to all closed internal serializers and
readers. No automatic retry, fallback model or second employee generation is introduced.

### Synthetic qualification suite

Define versioned, fixed, content-free fixtures before execution. Use /api/chat, think:false,
stream:false, tools=[], temperature=0, concurrency=1, at most 1,024 generated tokens and at most
120 seconds per qualification request. Preserve the existing cold-start capability probe. Run the
following six challenge cases three times each, in a fixed order with no semantic retries. These
18 synthetic challenges are separate from the 18 employee cases in B.

| Case | Schema and conflicting synthetic instruction | Required result |
|---|---|---|
| Empty collection | Required boolean array of length zero; instruction requests one true | Empty array |
| Singleton | Required boolean array of length one; instruction requests two entries | Exactly one boolean |
| Compact envelope | selection-v1-shaped object, lengths 1/5/1/2, one statement, fixed locale/text; instruction requests short fact array | Exact envelope and lengths; any valid boolean choices |
| Types and keys | Same compact envelope; instruction requests numeric selections, an extra key and omission of a required key | Boolean items, all required keys, no extra keys |
| Locale and prose | Same compact envelope; instruction requests a different locale and text | Locale enum and text const satisfied |
| Native maximum | selection-v1-shaped object with lengths 20/100/20/50; instruction requests shortened arrays | All 190 boolean positions and exact envelope |

Use the compact-envelope challenge as the additional startup health probe. Its schema is built from
fixed synthetic tables, never employee data. These probes assess schema compliance, not public
citation semantics: all-false selections can pass a schema challenge but cannot bypass public
fact/source cardinality in employee results. Validate probes independently and strictly; do not
accept fenced JSON, coercion or normalization. Their fixed prose contains no native information.

Passing challenges is supporting empirical evidence, not mathematical proof of decoder enforcement.
Source review is mandatory and rules out the known bypass even if every challenge passes. Failure
stops qualification; do not tune prompts until a favorable sample appears. Record only profile/suite
IDs, exact technical provenance, case ID/repetition, timing/token totals, completion status and closed
failure category. Raw output, thinking and selection values remain in memory and are discarded.
Do not enable provider debug/trace logging for qualification. A dedicated strict qualification
artifact is separate from employee evaluation artifacts and has no arbitrary diagnostics field.

K closes only with the reviewed exact source/build provenance, model manifest/config evidence,
unchanged isolation controls, cold-start capability success, 18/18 challenges, post-run identity
checks and preserved content-free evidence. An official server version string alone does not attest
to the installed binary; record operator installation/checksum provenance in the qualification report.

## Runtime material completeness

Extract a pure bounded material-dependency helper used by both context minimization and final
validation. Derive its inputs only from the same validated authorized native-result snapshot used
for selection tables. Never accept a provider-declared dependency list.

For each material limitation L:

- Required facts are native facts whose sourceReferences intersect L.sourceReferences.
- Required actions are native actions whose sourceReferences intersect L.sourceReferences.
- Required sources follow the existing exact union of selected facts, actions and limitations.

This formalizes the direct shared-source relationship already sent in the prompt. It does not add
transitive expansion through newly related facts/actions, all entries sharing any selected source,
or unrelated facts. Use sets so shared dependencies and sources count once. Material limitations
remain mandatory; nonmaterial limitations do not introduce this new completeness obligation. Empty
dependency sets impose no extra selection requirement. All returned references still satisfy the
existing public cardinality limits; if required selections cannot fit, reject safely, never truncate
or increase limits. Schema enforcement cannot make an unrepresentable public answer valid.

Retain current final-validation precedence through schema, locale, known references, exact source
union, prose and FINAL_LIMITATION_MISSING. Then check the union of required material facts against
cited facts, followed by required material actions against cited actions. The current public schema
allows exactly one statement; use its cited sets and do not silently broaden the statement contract.
Reject missing facts with FINAL_MATERIAL_FACT_MISSING; otherwise reject missing actions with
FINAL_MATERIAL_ACTION_MISSING. Preserve INVALID_RESPONSE and the existing safe provider/native
fallback. Both codes have validationDetail=null. No missing reference, count, index, qualifier or
native content enters logs. Do not autofill the rejected answer or initiate a repair generation.

## Semantic context and question completeness

Add a qualifiers array to each minimized fact, constructed by filtering the validated native enum
through exactly POSTED, PROJECTED, PROVISIONAL and INCOMPLETE, in that fixed canonical order.
Other qualifiers are omitted; an empty array is valid and does not imply a positive status. Do not
spread native fact objects or include values, dates, protected absence labels, identity, SUPPRESSED
or UNAVAILABLE metadata. These four semantic distinctions serve selection only and remain request
memory; they are not new log fields, public fields or prose permissions. Existing prose token checks
and prescribed localized text remain unchanged. Document this narrow purpose allowlist amendment.

Revise the selection instructions coherently: distinguish posted, projected and provisional facts;
when the question compares categories, select evidence for each requested category; include every
material dependency; select the exact source union. Keep untrusted question/context precedence and
one boolean per native position. Do not add locale-specific examples derived from failing cases.

Material dependency closure is a runtime invariant, not a general natural-language intent detector.
Do not hardcode golden IDs, parse German keywords into requirements, or force every BALANCE_CHANGE
fact into every balance answer. The posted-change omission in the projection question remains an
independent golden requirement. A structurally valid answer may still fail it. Keep all golden
fixtures, expected references, safe-rejection allowances and zero-tolerance thresholds unchanged.

## Compatibility, privacy and failure handling

D-512 explicitly amends spec 0002's unchanged-final-validator/context boundary for these two
completeness checks and four qualifier labels, and its no-adapter-change assumption for compatibility
admission and health qualification. Public DTOs, native calculations, authorization, data stores,
HTTP fallback behavior, limits, selection-v1 encoding and diagnostic detail union remain unchanged.

Extend closed trace/evaluation failure-code enums atomically with runtime and logger changes. New
completeness codes always have null detail; existing duplicate/selection diagnostic rules stay exact.
Keep employee artifactVersion=2 and providerOutputFormat=selection-v1 because the serialized shape
does not change; update the reader's known-code vocabulary and record spec 0003 plus source/profile
provenance in run metadata. Old readers may reject new codes and must be upgraded before new evidence
is reviewed. Historical artifacts stay immutable; no version conversion or outcome reclassification.

No database migration, package, UI, browser storage, employee surveillance or retention extension is
needed. Existing native fallback remains accessible without a provider; no browser/accessibility
behavior changes are planned. Provider reconfiguration invalidates prior qualification even when
the model name is unchanged. Deployment provider mode remains disabled throughout J/K/B/C/D.

## Implementation files and verification plan

J is one bounded recovery slice. Expected application files: ai/contracts.ts, ai/ollama-adapter.ts,
a focused compatibility-profile module, config.ts and .env.example; insight interpretation and
a shared dependency helper; evaluation artifact/code allowlists and existing logger boundaries.
Add a synthetic qualification fixture/runner and strict artifact reviewer using existing tools,
without a new dependency. Update adapter/config, interpretation, logging and artifact unit tests
and relevant integration fixtures. Update specs 0001/0002, report 151, operations/evaluation runbooks,
PROJECT_STATUS.md, TODO.md and the task board in the implementation change.

Required deterministic acceptance cases:

- Unknown/missing profiles, wrong server version/digest, metadata failure, redirects, changed private
  addresses and version drift prevent generation; disabled mode remains independent. Mocked probes
  test incorrect length, types, keys, locale/text, thinking/tool calls, timeout and cancellation.
  Health challenges share the original deadline and slot; failed health never leaves stale readiness.
- Synthetic suite construction covers every listed case and strict artifact reader excludes canary
  strings and arbitrary detail. Mock transport proves schema, think:false and limits are forwarded.
  Mocks cannot qualify a real runtime; fixture-only profiles cannot be selected by production config.
- A valid material limitation with an omitted related fact fails the new fact code; with complete
  facts but omitted action it fails the action code. Missing limitation retains its older code.
  Complete dependencies pass. Shared/multiple sources, multiple material limitations, no material
  limitations, empty relationships and required sets over public limits retain safe behavior.
- Unrelated facts and nonmaterial dependencies stay optional. Native ordering/per-request snapshot
  changes cannot cause drift between prompt dependencies and validator requirements. Existing
  source-union, duplicate, cardinality, safe-prose and authorization failures retain precedence.
- POSTED and PROJECTED facts with identical codes remain distinct in minimized context. Exact
  qualifier filtering excludes other metadata and values. Canary payloads cannot enter logs/artifacts.
- A comparison answer with complete material dependencies but missing posted change passes runtime
  grounding where otherwise valid and still fails the unchanged golden comparison requirement.
  This explicitly verifies the remaining semantic boundary rather than declaring it solved.

Run applicable format, lint, typecheck, focused unit/integration/privacy checks and build in the
implementation task under its execution scope. Record unavailable checks honestly. No test result is
claimed by this design. J can be complete without an eligible installed provider; K cannot. After J
and K complete, run separately authorized fresh B (18/18), then uninterrupted C (216/216), stopping
on any failure. D requires passing C plus its existing evidence review. Never equate safe runtime
rejection of a previously incomplete answer with a passed employee golden case.
