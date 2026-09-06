# WL-1508N — Best-effort English topic suggestions

**Date:** 2026-09-06  
**Decision:** D-520 / ADR 0015 best-effort amendment  
**Status:** Complete under the amended best-effort English support contract; deployment disabled

The user asked to continue after the recommendation to keep a small useful AI enhancement with
documented English-only support. This continuation is interpreted as proceeding with that
recommendation; the interpretation was stated before editing and recorded in D-520.

## Scope and support contract

One clear English question can suggest one of four Employee topics. It cannot generate an answer,
calculate time or leave, select a person or period, call a tool, or make a write. The user reviews
the suggestion, confirms **Use this topic**, selects a fresh period and separately runs the native
Insight. Manual topic selection remains available. API authorization and native calculation stay
authoritative even if the topic suggestion is wrong.

The UI now explains that suggestions can be wrong, especially for unclear questions or other
languages. The English interaction remains marked `lang="en"` in every account locale; the
surrounding application and native results stay localized. The description remains linked to
the input with `aria-describedby`. Pending copy explains that starting local AI may take time;
the existing cancellation control remains available. No new visual component or browser API is
introduced.

## Explicit acceptance change

`english-topics-best-effort-v2` removes only guaranteed abstention from completion requirements.
All original 60 cases, expected answers and ordering remain. Every output must validate, provider
or validation failure stops the run, supported accuracy must reach 36/40 and 8/10 per topic,
and p95 must remain at most 10 seconds. Identity, frozen sources and operator isolation remain
required. The 20 UNKNOWN outcomes remain measured and reported. Future artifacts identify the
acceptance version and expose the original rule as `strictAcceptancePassed`.

This is a support-scope change after observing the failures. It is not a semantic repair, a new
model measurement, or proof that unsupported input is rejected. The prompt still asks for UNKNOWN;
no language detector, heuristic filter, fixture-specific prompt change or output repair is added.
The original immutable result in [report 200](200-wl-1508n-runtime-performance-recovery.md) remains
failed under its original rule. The legacy interpretation pilot remains deferred separately.

## Existing model evidence and applicability

Report 200's complete run produced 60 valid responses, 40/40 correct supported English suggestions
(10/10 each), p95 510 ms and 12/20 UNKNOWN outcomes. Ambiguous, German, Spanish and mixed-language
cases failed both repetitions. Other unsupported cases returned UNKNOWN in the observed sample;
that does not make abstention a security boundary or a general guarantee.

The separate offline assessment passed the amended criteria and retained
`strictAcceptancePassed: false`. It verified the original result and cleanup hashes from report
200, ready health, recorded final identity/source checks, the isolation reference hash and all
60 individual case files against the final result. All qualification/evaluation source and
compiled hashes matched the original run after the current build. The original matrix text was
compared against commit `770e745`, whose fixture content hash matches the original run. Only
acceptance/reporting code and UI catalog copy changed; model-facing inputs and code did not.

- Assessment: `output/insights/topic-contract-review-96a3d5d1-62b9-4434-a1f6-20fd0a4417a2/assessment.json`.
- SHA-256: `dff880c634301b40f238611cee5bc045e46cbf1a415bcbae3290dbdf1bc7d70f`.
- Kind: `OFFLINE_ACCEPTANCE_REASSESSMENT`; `inferencePerformed: false`.
- Local assessment script: `output/insights/review-topic-best-effort.mjs`; its hash and the current
  review-module hash are retained in the assessment alongside all source evidence references.

This is reuse of existing evidence. It did not recheck live host isolation or provider health,
start a server, perform inference, change runtime settings or overwrite any original artifact.

The measured candidate remains Ollama 0.33.3, qwen3.6 at the exact manifest/config digests recorded
in report 200, process-local context 8192, one model/request, temperature zero, thinking disabled,
1,024 generated-token limit and a 120-second evaluation deadline. Automatic memory placement
changed during that run; context size alone is not a proven cause of the speed improvement. The
first suggestion took 20.754 seconds after about 20.1 seconds of cold health. The application's
existing 30-second request deadline is unchanged; this sample does not guarantee cold performance
on other loads or hosts. Provider deployment and persistent context settings remain disabled/unchanged.

## Verification and closure

The pinned full local command passed on Node 24.18.0 / pnpm 11.20.0 with the existing test PostgreSQL:

```powershell
$env:WORKLEDGER_TEST_DATABASE_URL = 'postgres://workledger_test:workledger_test_password@127.0.0.1:54329/workledger_test'
& 'C:/Program Files/nodejs/corepack.cmd' pnpm run verify
```

Evidence: `output/verification/a5cd2d27-cdcc-4f96-9adc-660727866c32/result.json`, exit 0,
`passed: true`, `modelExecution: false`, `databaseConfigured: true`. Configuration, OpenAPI
reproducibility, formatting, lint, typecheck, 71 script tests, 619 unit/component tests, 64
PostgreSQL integration tests, 52 browser tests, production build and bundle budgets passed.
The existing upgrade-from-0.9.0 and optional legacy real-model integration skips and opt-in
Phase 13 screenshot comparison skip remain. No new skip was added; remote CI was not run.

After closure documentation and the final evaluator summary edit, pinned formatting and lint
checks passed again in `output/verification/3e5aea1e-7131-4aa9-89c3-aa26b9e5f4c2` and
`output/verification/b0db8f5b-a889-4d76-be40-74bc96e7d6f1`. Phase-version checks remained at
16 completed gates and `0.16.0`; the evaluator's Node syntax check and `git diff --check` passed.

Focused checks also passed: two evaluator tests and all 16 Insight component tests. These cover
retained English/per-topic accuracy, exact coverage, provider failure and latency requirements;
explicit UNKNOWN diagnostics and original strict failure; accessible English limitation text in
all account locales; and discarding a deliberately mistaken suggestion through manual topic
selection without native execution. Existing confirmation, fresh-period, cancellation, no-store,
authorization and disabled-provider checks passed in the full gate.

Modern Web Guidance's forms guide was retrieved successfully after Windows denied sandboxed npx
execution. The browser scenario passed keyboard confirmation, 320-pixel reflow, axe, forced colors,
reduced motion and failure recovery. Its updated screenshot was visually inspected and preserved
as `english-topic-suggestion-320.png` beside the offline assessment. All description text, the
English input and confirmation controls remain readable. This remains bounded browser/axe
evidence, not completion of D-502's broader manual assistive-technology matrix.

WL-1508N is complete for this amended bounded scope. PROJECT_STATUS, TODO, the task board, roadmap,
README, UX documentation, D-520 and ADR 0015 are synchronized; reports 199–200 link forward while
preserving their failed outcomes. There is no phase gate or version change (`0.16.0`), package,
migration, domain calculation, authorization, model-facing prompt or provider implementation change.
No commit, push, release or provider enablement was performed.

No implementation task is ready. A controlled local provider enablement is a possible next
operator decision and would require current host identity/isolation/health checks. It is not
queued or authorized by this completion. Legacy M/B/C/D and parent WL-1508 remain deferred;
this smaller enhancement does not close them.
