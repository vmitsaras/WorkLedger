# WL-1508B — Evidence acceptance implementation

**Date:** 2026-09-06

**Status:** D-515 implementation and deterministic verification complete; later fresh B stopped at health before employee cases

**Decision:** D-515

**Contract:** `docs/specs/_root/0004-insight-evidence-acceptance/index.md`

## Scope and controls

This continuation implemented the bounded evidence-acceptance recovery designed in report 187. It
changed the synthetic golden fixture/evaluator and the two Employee interpretation instructions.
It did not run a provider health check, schema qualification, employee evaluation, browser flow or
real-model inference. Provider deployment remains disabled at version `0.16.0`.

Deterministic commands set `WORKLEDGER_RUN_AI_EVALUATION=0`; the independent
`WORKLEDGER_RUN_SCHEMA_QUALIFICATION` flag was either explicitly `0` or unset and was never `1`.
The pinned PATH reported Node 24.18.0 and pnpm 11.20.0. An initial typecheck attempt exposed pnpm
9.15.1 in nested scripts; putting `C:\Program Files\nodejs` first on PATH restored the accepted
toolchain before any successful gate was recorded.

## Implemented behavior

The test-only golden question now owns an explicit fact-acceptance object. Existing exact required
facts become singleton OR groups under a null allowlist, preserving their all-required behavior.
Safe-rejection questions retain no fact-specific golden requirement. The `submission-actions`
question alone uses one alternative group and a strict allowlist containing the month-count and
pending-request facts. Count only, pending only or both can pass; schedule and ledger facts cannot.
Both monthly-review and pending-request actions remain mandatory.

The fixture constructor rejects an empty allowlist, empty groups, duplicate entries, unknown native
fact references and groups outside a non-null allowlist. It freezes copied allowlist and group
arrays. The evaluator preserves prose-first ordering and legacy singleton error text, checks required
groups in declaration order, reports unexpected selected facts in native fact order, then checks
actions and forbidden tokens. This logic remains synthetic evaluation code and is not available to
production request handling.

Both model instructions now say that a navigation fact must share a source relationship with a
selected action or source for a destination requested by the question. One fact may support the
navigation statement as a whole; the model must not manufacture one fact per destination or select
unrelated filler. The existing safe-unavailable path remains the answer when no supplied fact has
that relationship. Tests confirm that these instructions contain no golden fact/action identifiers.

No public DTO, output schema, selection codec, grounding validator, qualifier rule, native value,
authorization boundary, trace field, provider compatibility control, retry policy or threshold
changed. K therefore remains applicable. Future B evidence must record fresh prompt and evaluator
source hashes.

## Verification

- Focused selection, evaluation and interpretation suite: 3 files, 75 tests passed. Coverage spans
  all three locales, normal and reversed fact/action tables, count-only, pending-only and combined
  accepted facts, schedule/ledger rejection, mixed allowed/unexpected facts, exact source union,
  empty runtime evidence, requested-action omissions, optional actions, immutable fixture validation,
  singleton preservation, safe-rejection preservation and prompt-data boundaries.
- Typecheck: passed with workspace, toolchain and phase-version guards.
- Lint: passed with ESLint, source boundaries and the CSS contract.
- Repository script tests: 57 passed. The complete unit/component suite then passed 592 tests in 63
  files. The first aggregate output stream detached after starting Vitest, so the full suite was
  rerun directly and its final zero exit status was captured; no test or threshold changed.
- Available integration suite: 4 files and 13 tests passed; 28 files / 52 database- or model-gated
  tests skipped. This is not fresh PostgreSQL or model evidence.
- Build: passed TypeScript, localization, production Vite, bundle-budget and public workspace-import
  checks.
- Scoped Prettier and `git diff --check`: passed. Repository-wide `pnpm format:check` continues to
  fail the existing CRLF checkout baseline, now reporting 457 files. No broad line-ending or user
  settings rewrite was made.

No browser E2E run was needed for this non-UI slice. Existing component coverage ran, but this work
creates no new visual or assistive-technology evidence.

## Review and next gate

D-515 is complete within its implementation and deterministic scope. Prompt guidance can influence
selection but cannot prove natural-language relevance, so the bounded fixture remains the B/C
acceptance authority. Historical artifacts keep their original contracts and outcomes.

A separately continued B screen must recheck the exact K candidate and isolation, then run
`submission-actions` first for 9/9. Any failure stops without retry or tuning. Only a passing first
group permits the 9/9 `today-posted` group. C still requires a complete passing B; D and the parent
pilot remain open. Provider deployment remains disabled and no phase, version, dependency, migration,
branch or commit changed.

The separately continued attempt is recorded in report 189. Exact candidate, isolation, toolchain
and source-drift preflight passed, but provider health returned unavailable/TIMEOUT before the
golden-set loop. Zero employee cases ran, no evaluation artifact was created, and the stop rule
prevented retry, `today-posted` and C. D-515 therefore still has no real-model semantic evidence.
