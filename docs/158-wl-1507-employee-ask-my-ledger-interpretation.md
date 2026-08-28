# WL-1507 Employee Ask My Ledger Interpretation

**Task:** `WL-1507`  
**Date:** 2026-08-27  
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`  
**Runtime change:** Optional Employee workspace interpretation over current native Insights

## Outcome

WorkLedger now offers Ask My Ledger only after an employee explicitly runs one deterministic
native Insight and the configured private provider reports ready. The native result remains first,
complete, and authoritative. Disabled, unavailable, cancelled, rate-limited, invalid, or failed
provider work cannot remove that result.

The browser sends one strict `POST /v1/insights/interpret` request containing the selected Employee
Insight, one question, and at most four transient prior question and answer pairs. Questions are
limited to 500 Unicode code points, total conversation text to 8,000 code points, output to eight
statements, and model prose to 2,000 code points. No question or answer enters a URL, browser
storage, TanStack Query cache, PostgreSQL, audit history, backup, or a new log field.

## Authority and orchestration

The interpretation service reloads current account locale and Employee self authority before it
checks provider readiness. It gives the provider exactly one tool for the already selected Insight
and fixes every tool argument to the visible date, month, or range. The model cannot select another
workspace, employee, period, tool, query language, network destination, or write operation.

Every tool execution enters the existing read-only registry again and reauthorizes current
Employee self scope at the captured request instant. Permission loss remains a `401` or `403` and
clears transient browser results. Other model and provider failures return a safe unavailable
state. Provider work is bounded to one in-flight interpretation per account, 12 attempts per
rolling 10 minutes, two tool rounds, four tool executions, one provider deadline per operation,
and no application retry.

Client cancellation aborts the fetch. Request abort and premature response close also abort server
provider work. A normal completed response is not cancelled by cleanup.

## Structured grounding and source attribution

The provider receives only the question, transient prior prose, account locale, selected Insight
descriptor, exact tool schema, and a minimized native tool projection. It receives no DOM, route
DTO, actor, employee, organization, role list, stored free text, sickness detail, note, reason,
attachment, credential, or session value.

Final output must match one strict provider-independent schema. Every statement references at least
one native fact and the exact union of sources that support its facts, limitations, and actions.
Unknown, duplicate, missing, excess, or cross-result references fail closed. Every material native
limitation must be cited. Model prose cannot contain numeric values, dates, native status tokens,
source labels, limitation labels, action labels, or native references. The UI resolves values,
qualifiers, limitations, sources, and actions from the validated current native result and formats
them with the authoritative account locale.

## Accessibility and interaction

The native result precedes the optional provider state, question form, and interpretation. The
question uses a visible label, description, Unicode-aware count, inline error, linked focusable
error summary, explicit submit, pending, cancel, and clear controls. One polite status announces
meaningful running, cancelled, and completed outcomes without streaming tokens or moving focus on
success. Cancellation returns focus to the question.

Interpretations use ordinary headings, paragraphs, lists, definition lists, warnings, and real
source or action links rather than chat-role semantics. Native facts and source links remain
available on provider failure. Scope changes, route removal, reload, sign-out, session expiry, and
permission loss clear transient conversation state.

English, German, and Spanish catalogs contain the complete form, status, provider, validation,
error, source, limitation, and result copy. Component axe and keyboard evidence covers successful
grounding, native-first order, request-memory boundaries, cancellation, retained native output,
and focus restoration. The existing browser matrix continues to cover the Insights route at narrow
width and in forced colors.

## Performance budget

The optional browser interface has a separate `WL-1507` allowance of 14,000 raw and 5,000 gzip
JavaScript bytes. Largest-chunk, CSS, locale, and established application ceilings remain
unchanged. The verified production graph uses 1,050,183 raw and 270,383 gzip non-locale JavaScript
bytes against combined ceilings of 1,052,000 and 282,000 bytes. CSS uses 50,593 bytes. Locale
chunks remain independently bounded.

## Verification

`pnpm verify` passes runtime configuration, reproducible OpenAPI, formatting, lint, source and CSS
boundaries, strict TypeScript, 54 tooling tests, 464 unit and component tests, 13 broad integration
tests with 48 expected database opt-outs, 48 Playwright scenarios with one intentional historical
skip, internationalization checks, the production bundle budget, and all workspace builds.

`pnpm db:test` passes 15 PostgreSQL files with 28 tests and one existing historical skip. Its
authenticated API path proves ready metadata, same-origin and CSRF enforcement, fresh native
authorization before provider context, exact tool execution, grounded response serialization,
account locale use, no question echo, protected-identifier absence, and permission loss.

Focused interpretation contract, orchestration, provider, component, and API contract suites also
pass. Source boundaries cover 343 files and 1,967 imports with no forbidden edge. The generated
OpenAPI artifact includes both deterministic run and optional interpretation operations.

## Remaining boundaries

`WL-1508` still owns the 20 to 30 question multilingual golden set, real pinned-model evaluation,
prompt-injection and leakage matrix, bounded content-free operational traces, broader degraded-model
handling, exact assistive-technology verification, and the local AI pilot sub-gate. This task does
not enable manager, report-builder, HR, System, MCP, public provider, cloud model, write, scoring,
prediction, recommendation, or autonomous action scope.

No dependency, migration, table, persisted conversation, audit content, model download, public
egress path, or manifest version changed. Provider mode remains disabled by default.
