# WL-1508 employee local AI pilot evaluation

**Status:** Evaluation infrastructure complete; employee local AI pilot sub-gate remains open  
**Evaluated:** 2026-08-28  
**Decision:** Fail closed for the evaluated model digest

## Outcome

WorkLedger now has the required 24-question synthetic employee golden set, all three supported
locales, three deterministic repetitions, a real-provider evaluator, content-free operational
traces, degraded-provider regressions, and browser accessibility evidence. The normal repository
quality gates are green.

The local AI pilot sub-gate does not pass. The best strict full run completed 207 of 216 cases
without an evaluator error. Nine repeatable cases missed the zero-tolerance threshold:

- six `submission-actions` cases in `en-GB` and `de-DE` produced provider-invalid structured
  output while selecting the native review actions; and
- three `today-posted` cases in `de-DE` omitted the required posted-balance fact reference.

An attempted action-to-fact hint widened provider instructions and regressed the full matrix to
171 of 216. That experiment was discarded. The retained implementation is the smaller strict
contract that produced the 207-of-216 result. WorkLedger does not weaken source, action, fact,
locale, limitation, prose, or leakage validation to convert the result into a pass.

`WL-1508` therefore remains in progress. `WL-1509` and every task that depends on the employee
pilot remain blocked by the named roadmap gate. No manifest version changes.

## Exact evaluated provider

| Setting | Evaluated value |
|---|---|
| Provider | Private loopback Ollama adapter |
| Model | `gemma4:12b` |
| Digest | `4eb23ef187e2c5462566d6a1d3bbbc2f1346d0b4327cbb66d58fffbcc9b2b05c` |
| Temperature | `0` |
| Thinking output | Disabled and rejected if returned |
| Concurrency | `1` |
| Provider deadline | `30` seconds per request |
| Maximum generated tokens | `1024` |
| Repetitions | `3` |

Provider mode remains disabled by default. The evaluator requires explicit test-only Ollama
configuration and a successful digest/capability health check. A locally installed
`qwen3.6:27b` candidate did not become ready within the maximum 120-second startup health window,
so it was not treated as an eligible replacement pilot model.

## Golden set and evaluator

The repository-owned set contains exactly six semantic questions for each Employee Insight:

| Insight | Coverage |
|---|---|
| Balance change | Summary, projection versus posted evidence, opening/closing, ambiguity, prompt injection, and cross-employee scope expansion |
| Submission blockers | Count, blocker details, native actions, ambiguity, write-tool injection, and prohibited legal conclusion |
| Leave projection | Available, reserved/projected, separate-account limitation, ambiguity, prohibited health inference, and colleague comparison |
| Today explanation | Expected/worked, provisional difference, posted balance, incomplete evidence, private-export injection, and prohibited employment recommendation |

Every semantic question has `en-GB`, `de-DE`, and `es-ES` wording and is evaluated three times.
Fixtures contain no email address, UUID, credential, copied production identifier, stored note,
reason, diagnosis, attachment, or employee identity. The evaluator fails on missing required fact
or action references, repeated injection markers, non-allowlisted prose, malformed structured
output, unknown references, incorrect source unions, missing material limitations, and missing
operational traces.

`pnpm test:ai:employee` writes an ignored local JSON artifact under `output/insights/`. Records are
content free: semantic fixture ID, locale, repetition, disposition, safe outcome and validation
codes, latency, token counts, and tool counters. They contain no question, prompt, answer, tool
argument, tool result, source reference, identity, or domain value. Optional run-limit and
semantic-ID controls support smoke diagnosis but cannot mark the 216-run gate complete.

## Runtime hardening

- Ollama token usage is parsed into bounded input/output counters; malformed counters fail closed.
- Generation is deterministic, non-streaming, thinking-disabled, and capped at 1,024 tokens.
- Tool selection and final output are separate provider phases. The first phase exposes exactly
  one purpose-specific read-only tool; the final phase exposes no tool.
- Current employee self authorization is rerun for the exact visible scope. Model-selected tool,
  argument, period, workspace, second-tool, mixed-content, and execution-limit changes fail closed.
- Tool context omits native numeric values, dates, freshness timestamps, source labels, actor,
  employee, organization, roles, stored free text, and credentials. It carries only the bounded
  codes and references needed for grounding plus precomputed material-limitation relationships.
- Final prose must equal one locale-specific safe sentence. This prevents unsupported domain,
  policy, legal, health, employment, or workflow claims from passing merely because they contain
  no number.
- Every final fact, limitation, action, and source reference must exist in the current native
  result. Source references must equal the exact union required by cited evidence, and every
  material limitation must be present.
- A whole-response `json` Markdown fence is normalized only as a transport accommodation. Any
  surrounding prose, malformed inner JSON, unknown field, duplicate reference, or grounding error
  remains invalid.
- A rejected concurrent request does not release the first request's account lock. Cancellation,
  timeout, busy, invalid response, unavailable provider, rate limit, and permission loss have
  distinct safe trace outcomes.

## Operational trace boundary

The API writes one allowlisted trace per interpretation with only:

- request ID, dependency, operation, success;
- outcome, latency, input/output token counts;
- tool round and execution counts; and
- provider and validation failure codes.

The logging allowlist excludes question, prior turns, prompts, generated prose, tool arguments,
tool results, sources, account/employee/organization identity, and domain values. PostgreSQL,
audit, browser storage, URL state, analytics, and backup data receive no interpretation content.

## Accessibility and degraded behavior

Automated component and Chromium coverage proves that:

- the complete deterministic native result precedes Ask My Ledger and remains visible after
  success, provider failure, cancellation, and retry;
- a prior grounded interpretation remains visible when a later provider attempt fails;
- questions and answers remain absent from URL state, `localStorage`, and `sessionStorage`, and a
  reload clears transient interpretation state;
- the optional result uses normal document headings and source links rather than chat-log
  semantics or streaming live regions;
- one polite status announces meaningful completion without token streaming or focus theft;
- the provider-failure state exposes a native button retry and retains the native evidence;
- the flow has no horizontal overflow at 320 pixels and passes axe under forced colors and reduced
  motion; and
- the accessibility snapshot contains the native, Ask My Ledger, and optional explanation
  headings and no `log` role.

## Verification

Passed:

- focused API unit evaluation: 32 tests;
- focused Insights component evaluation: 7 tests;
- `pnpm verify`: configuration, OpenAPI reproducibility, formatting, ESLint, 346-file/1,988-import
  boundaries, CSS ownership, strict TypeScript, 54 tooling tests, 477 unit/component tests, 13
  environment-independent integrations with 49 expected database opt-outs, 49 Playwright passes
  with one historical skip, i18n, bundle budgets, production build, and workspace build;
- `pnpm db:test`: 15 files, 28 tests passed, one historical skip; and
- targeted real-model smoke and regression runs used diagnostically for fenced JSON, source-union,
  submission-action, and Today posted-balance behavior. Only a complete 216-case run can decide
  the gate.

Gate result:

- `pnpm test:ai:employee`: **failed** the zero-tolerance pilot threshold. The best retained strict
  configuration completed 207/216; nine deterministic semantic cases remained invalid.

## Required next decision

Keep provider mode disabled and evaluate a different exact private model digest that becomes ready
within the accepted health boundary and passes all 216 runs. Do not mark `WL-1508` complete, enable
the pilot, advance to `WL-1509`, cite every native fact indiscriminately, or weaken the accepted
zero-tolerance thresholds without an explicit superseding architecture decision.
