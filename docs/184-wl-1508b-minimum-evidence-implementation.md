# WL-1508B — D-514 minimum-evidence implementation

**Date:** 2026-09-06

**Scope:** Deterministic implementation of report 183/D-514. No live model call or employee evaluation.

Both system instructions now require relevant supporting facts and their sources for navigation
answers, alongside every supplied action needed for the requested destinations. They preserve
material dependencies and the exact source union, prohibit invented evidence and unrelated minimum
filler, and retain the read-only boundary. Prompt delivery tests do not prove model compliance.

The existing cardinality classifier now supplies a closed REFERENCE_CARDINALITY detail. It records
only the first violating field in fact/source/action/limitation order, with EMPTY_REQUIRED or
EXCEEDS_LIMIT. Earlier envelope, text, type and duplicate classification remains unchanged. The
existing public reference bound is reused; there is no retry, automatic selection or repair.

The shared sanitizer admits only valid field/reason/failure-code combinations. Logger enforcement
drops malformed detail to null; the existing strict artifact reader rejects malformed non-null
detail through that sanitizer. Tests exercise both boundaries, canary content, selection arrays,
extra counts, historical nulls, all locales, reordered navigation actions, empty required evidence,
20/21 reference limits, duplicate/type precedence and one-generation trace propagation.

Employee artifactVersion=2 and providerOutputFormat=selection-v1 remain unchanged. New diagnostic
records require the updated reader; older strict readers may reject them. Historical null-detail
artifacts and failed reports 179/181 remain untouched. This diagnostic identifies the first
cardinality violation only and says nothing about subsequent grounding or golden acceptance.

## Verification

Compilation (`pnpm exec tsc --build --pretty false`), repository lint/workspace/boundary checks,
scoped Prettier and `git diff --check` pass. The initial focused suite passed 86 tests; after
strengthening reordered-action coverage and adding the mocked trace case, the full unit/component
suite passed 581 tests in 63 files. Available integration tests passed 13, with 52 gated tests
skipped. No browser E2E, database-enabled gate, frontend bundle build or repository-wide formatting
check was run for this backend-only slice. Both
WORKLEDGER_RUN_AI_EVALUATION and WORKLEDGER_RUN_SCHEMA_QUALIFICATION were set to 0.

## Review and next task

No public schema, generation schema, native context, golden fixture, authorization, domain logic,
UI, migration, provider control or dependency changed. Deployment remains disabled at 0.16.0.
B/C/D remain open and K complete. A separately continued B screen must recheck exact profile and
isolation, run submission-actions first, and stop on a failed group. Only 9/9 plus artifact review
permits today-posted. C requires passing B and its own continuation. No new phase is needed.
