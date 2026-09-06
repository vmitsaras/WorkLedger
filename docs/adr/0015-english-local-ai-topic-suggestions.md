# ADR 0015 — English-only local AI topic suggestions

**Status:** Accepted on the user's 2026-09-06 instruction to continue with optional local AI topic suggestions and document English-only interaction.

The latest multilingual failure is evidence of incomplete semantic selection, not proof that
English solves the former answer contract. English passed only one question repeated three times.
ADR 0014's original multilingual interpretation and its failed evaluations remain historical.

## Decision

Add one optional Employee feature: an English question produces a suggested topic from
balance-change, submission-blockers, leave-projection, today-explanation, or UNKNOWN. The model
receives only the submitted question and static topic descriptions. It receives no native result,
identity, period, page context, tools, or prior conversation. There is no generated prose.

The suggestion is untrusted. Explicit **Use this topic** chooses it in the native form, clears
carried scope/period, and focuses the topic selector. The employee checks the topic, chooses the
period, and explicitly runs the independent authorized native Insight. A conflict between the
question and confirmed topic is resolved by this explicit selection; the question is not forwarded
to native execution. Ambiguous, unsupported, multiple-topic and non-English questions are intended
to return UNKNOWN, with manual selection always available. Language recognition and relevance
remain probabilistic, not security controls. No model-supplied confidence value grants authority.

AI interaction copy, inputs and suggestions are English-only, with `lang="en"` even in a German or
Spanish account. Identical English topic-copy catalog entries are intentional. The surrounding
application and native results retain the account locale. There is no automatic translation.
This is an explicit bounded exception to the earlier multilingual AI contract, not a removal of
Phase 14 localization or evidence that the legacy English interpreter passed.

## Authority and privacy

The new strict POST endpoint requires session, same origin, CSRF and current active employee self
permissions. Authorization runs before generation and again before returning; native execution
reauthorizes separately. The model cannot execute a tool, choose an employee, select a date, write
data, calculate a balance, or omit native facts, sources, limitations or actions.

One request per account may be in flight; the existing shared 12-per-10-minute limiter applies.
Existing private origin, exact model identity, compatibility, health, deadline and concurrency
controls remain. Cancellation aborts provider work; the browser discards late responses after
cancel, clear, scope change or unmount. Question and result stay in component/request memory,
outside query/mutation caches, URLs, browser storage, logs, PostgreSQL and audit history.

The application and topic evaluator select the closed `english-topics-v1` health purpose. Its
second synthetic probe tests the actual strict topic enum against an incompatible requested
topic/extra field. The initial attempt timed out in the former selection-array probe before any
topic question ran. Testing that unrelated output format is no longer an application prerequisite.
Identity, capability probe, private address pinning, deadline, zero tool/reasoning output,
independent strict validation and unload behavior remain enforced. Legacy qualification defaults
to its original compact probe. Its historical success does not qualify the new purpose; fresh
topic health and the unchanged 60-case matrix must pass. This bounded health amendment changes
neither the topic-selection prompt, fixtures, thresholds nor the old failed evaluation records.

The old interpretation endpoint returns unavailable, including with an enabled provider. Its
implementation and evaluation fixtures remain for historical reproducibility. Provider deployment
is not authorized by this decision. Default configuration stays disabled.

## Acceptance and consequences

WL-1508N owns this bounded implementation and evaluation. It does not complete or lower the
legacy M/B/C/D/parent criteria, change a phase gate, or bump `0.16.0`.

Before any model experiment, fix the new matrix: five English questions per supported topic and
ten UNKNOWN cases, two repetitions each (60 total). Require at least 36/40 correct supported
suggestions, at least 8/10 per topic, and 20/20 UNKNOWN outcomes. All 60 outputs must validate;
provider/validation failure stops the run. Per-request p95 must be at most 10 seconds; health is
measured separately under the existing deadline. These are bounded sample criteria, not population
accuracy guarantees. Report misses and fallback rates; no prompt tuning or automatic rerun follows
a failure. Frozen source/configuration identity and current isolation evidence are required.

Contract/service, authenticated PostgreSQL, keyboard/axe, narrow-screen, forced-colors,
reduced-motion, privacy, cancellation and disabled-provider checks accompany model evidence.
Semantic pass, implementation pass and deployment approval are distinct.

## Recorded outcome

[Report 199](../199-english-local-ai-topic-suggestions.md) records passing implementation checks
and the incomplete model attempt: 32 correct valid responses, then a 120-second deadline stop;
27 cases unrun and partial p95 102.172 seconds. The accepted English-only feature contract remains,
but the candidate has not passed its evaluation. No threshold is relaxed and no deployment follows.

The subsequent context-size experiment in [report 200](../200-wl-1508n-runtime-performance-recovery.md)
completed the unchanged 60-case matrix with context 8192: 40/40 supported English suggestions
correct and p95 510 ms, but UNKNOWN only 12/20. The cold first suggestion took 20.754 seconds.
This supersedes the incomplete run as current evaluation evidence while preserving it historically.
The candidate still fails this ADR's strict acceptance criteria. A documented best-effort
English-only support contract is proposed in report 200; no such amendment is accepted yet.
