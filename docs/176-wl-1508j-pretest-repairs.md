# WL-1508J — Fixture repairs and missing coverage

**Date:** 2026-09-06

**Status:** Repairs and regression coverage prepared; static typechecking passed; execution pending

## Changes

The user requested the pretest fixture/coverage repairs identified in report 175. This continuation
changes six unit-test files and project documentation only. It does not change runtime behavior,
golden questions, required references, provider profiles, qualification tooling or acceptance gates.

- Configuration: the private-host case now expects rejection without an eligible profile. A scoped
  compatibility lookup mock permits verification of default bounds and rejects a mismatched digest.
  After restoring the mock, the same fixture profile is rejected again by production configuration.
- Concurrent interpretation: the order-isolation fixture uses a nonmaterial limitation so that each
  request can select its own first fact. Distinct per-request reference assertions remain intact;
  separate material-completeness regressions continue to require all material dependencies.
- Qualification runner: added fully mocked 18-challenge success with exact sequence/repetition and
  usage checks, unavailable health with zero generations, first provider exception with immediate
  stop, and final identity failure after all challenges. These assert safe incomplete evidence and
  no exception/content retention. The existing first-schema-failure coverage remains.
- Health: a controlled-clock regression advances time while the capability request is held, then
  holds the schema request and expires the original deadline. Competing health requests at both
  stages must observe the occupied concurrency slot. Timer restoration, cancellation and loopback
  server cleanup are included. This regression will contact only its fake loopback server when run.
- Qualifiers: added valid native fixtures for each of the four allowed labels, canonical ordering
  for PROJECTED/INCOMPLETE, and exclusion of CURRENT, RESERVED, SUPPRESSED and UNAVAILABLE.
  Terminal facts retain null values; context assertions exclude native values.
- Diagnostics: logger and v2 artifact regressions cover both material failure codes with null detail,
  rejection/sanitization of unrelated detail, both new provider codes, and arbitrary uppercase-code
  canaries. Legacy artifact behavior and the existing strict diagnostic union are unchanged.

## Verification and limits

**Subsequent execution:** Report 177 records successful deterministic verification and closes J.
The statements below describe this earlier no-test repair task. K output preparation and candidate
qualification remain outstanding.

The pinned TypeScript compiler statically checked all six changed test files and their imported
source/fixture dependencies successfully. The command used --ignoreConfig --noEmit, strict NodeNext
resolution and vitest/globals. Scoped formatting was applied and checked. No unit, integration,
browser, health or model test was executed. No inference, installation or provider configuration
change occurred. Runtime build evidence remains report 174's prior result; no new build was needed
for this test/documentation-only continuation.

The fixtures and coverage identified for J in report 175 are now prepared for deterministic
execution, but this does not establish that they pass. J remains unchecked pending that evidence.
The empty real profile list still gates K/B/C. The qualification output-writability/persistence issue
from report 175 remains open for repair before K inference; it is outside this fixture/coverage
change and must not be lost when J verification proceeds. D and deployment remain blocked.

No UI/accessibility, authorization, native calculation, database, retention or public response
behavior changed. No new phase or version milestone is introduced.
