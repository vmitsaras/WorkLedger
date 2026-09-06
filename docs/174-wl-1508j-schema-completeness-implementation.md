# WL-1508J — Schema enforcement and material completeness

**Date:** 2026-09-06
**Status:** Implemented; static verification recorded below; test execution pending

## Completed implementation

The user continued after spec 0003. The application now requires a source-controlled compatibility
profile matching model/digest configuration. There are no eligible real profiles. Test profiles
are injected only through test dependencies; production environment configuration cannot select
them. No provider installation, model inference, health probe or qualification was executed.

The private adapter checks /api/version before health generation and before each employee request,
using existing private-address/redirect/deadline protections. Health retains the cooperative probe
and adds the compact schema challenge within the same deadline and concurrency slot. Both use
keep_alive=0; no thinking or tool output is accepted. A version/profile mismatch or schema-health
failure leaves generation unavailable. A metadata-only identity check supports qualification review.

Six fixed synthetic schema challenges cover empty/singleton arrays, compact envelope lengths,
types/keys, locale/text and the 190-position maximum. The explicit qualification runner performs
three repetitions per challenge, stops at the first failure and rechecks identity. Its separate
strict artifact records bounded technical metadata and closed failure categories without raw output.
Passing synthetic output still requires the source/build/isolation review defined for K.

The interpreter shares direct limitation dependencies between context and runtime validation.
After existing grounding and material-limitation checks, missing material facts/actions fail with
FINAL_MATERIAL_FACT_MISSING or FINAL_MATERIAL_ACTION_MISSING and null detail. It neither repairs
the answer nor generates a second response. Native facts now expose only the four designed
qualifiers to model context: POSTED, PROJECTED, PROVISIONAL and INCOMPLETE. These stay in request
memory; existing safe prose rules and reference limits remain unchanged.

Runtime/provider failure vocabularies are explicit shared constants. New v2 employee artifacts and
logger failure fields accept only known codes; historical legacy artifact parsing remains available.
This also closes a discovered mismatch with the design: v2 previously accepted arbitrary uppercase
failure codes. Diagnostic detail remains the existing strict union; new completeness codes have null
detail. Public response DTOs, domain calculations, authorization and database schemas are unchanged.

## Regression coverage prepared

**Repair continuation:** Report 176 corrects the stale fixtures and expands the mock coverage
identified in report 175. Static typechecking passes; deterministic execution remains pending.

**Subsequent pretest review:** Report 175 found two stale fixtures that should fail under the new
contracts, plus missing mock coverage. The cases below are prepared coverage, not verified passing
evidence. Correct the identified issues before executing the deterministic suite.

Added cases for profile admission/version drift, invalid schema health and unavailable generation;
material facts/actions and failure precedence; direct shared-source dependencies and nonmaterial
optionality; independent golden comparison completeness; challenge bounds and strict parsing;
artifact ordering/privacy checks and first-failure qualification termination. Updated existing
adapter/config/context fixtures for the new admission and health behavior.

Static regression-file typechecking also exposed existing fixture typing defects: a widened locale,
an erased generic type used in an error string, and a readonly array returned for a mutable contract.
These are corrected without changing golden questions, required references or acceptance rules.
The fixture helper source hash changes, so future B/C provenance must use fresh hashes.

## Verification

- TypeScript workspace compilation passed during implementation.
- Repository lint, toolchain/workspace/phase guards, source boundaries and CSS contract passed.
  The repository ESLint configuration covers JavaScript; TypeScript is checked by its compiler.
- Explicit static typechecking of the five new/updated regression files passed after the fixture
  fixes. This compiles their imported fixture/source dependencies and executes no test.
- Repository build passed, including i18n, forced TypeScript compilation, Vite production build,
  bundle budgets and workspace import verification.
- Scoped source/script formatting passed with the repository formatter. Markdown is excluded by
  the repository formatter; documentation was reviewed directly.
- No unit, integration, browser or model test ran. J remains unchecked until its required
  deterministic execution evidence exists. No test pass is inferred from compilation.

Initial static-command corrections: nested pnpm resolved 9.15.1 until the pinned Node directory
was placed first on PATH; the successful run used pnpm 11.20.0 and Node 24.18.0. ESLint rejected an
explicit TypeScript directory because the repository only configures JavaScript linting; the normal
repository lint then passed. TypeScript 7 explicit-file checking required --ignoreConfig.

## Operations and next steps

WORKLEDGER_OLLAMA_COMPATIBILITY_PROFILE is required only in ollama mode and must name a reviewed
source-controlled profile matching the configured model/digest. Disabled mode remains the default.
Existing optional-provider configurations without a profile now fail startup validation deliberately.
Do not populate the profile table with the known-bypassing Ollama 0.24.0/Qwen tuple.

After J's deterministic verification and K's source/candidate/isolation preparation, a separately
authorized qualification invocation uses the built API and existing environment loading:

```powershell
$env:WORKLEDGER_RUN_SCHEMA_QUALIFICATION = '1'
node --env-file-if-exists=.env scripts/qualify-ollama-schema.mjs
```

The command requires a reviewed profile and exact 120-second/concurrency-one controls. It writes a
new UUID-named ignored output/insights/schema-qualification artifact without overwriting history.
Remove the explicit run flag afterward. Read-only review:

```text
node scripts/review-ollama-schema-qualification.mjs <artifact-path>
```

No command above was executed in this task. No eligible profile is currently present, so qualification
cannot proceed yet. K also needs installation/checksum, parser/config, exact source review and
isolation evidence; the script alone does not close K or authorize deployment. Fresh B/C follow K.
C remains failed 210/216 and D blocked. Material closure cannot guarantee question-specific posted
comparison evidence: that separate golden obligation remains a known evaluation risk.

## Accessibility and security/data

No UI or accessibility behavior changed; no accessibility test is claimed. Deterministic native
fallback remains available. No employee value, identity, raw response, thinking, selection bits or
additional retained diagnostic field was added. No dependency, migration, phase/version, commit,
branch, deployment or installation operation was performed by the assistant.
