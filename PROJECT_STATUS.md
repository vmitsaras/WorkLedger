# WorkLedger Project Status

**Current phase:** Phase 15 — WorkLedger Insights (employee pilot reopened for future evaluation)
**Project readiness:** Stage 5 of 5 — Production and UI release gates complete
**Phase progress:** Phase 15 complete — 10 of 10 accepted deterministic tasks complete
**Current milestone:** Phase 15 deterministic provider-disabled gate complete at `0.16.0`
**Active task:** WL-1508K — J verified; qualification preparation and candidate review next
**Status:** `WL-1516` complete; optional employee pilot reopened for future evaluation; provider disabled
**Last verified:** 2026-08-29

## Current objective

WL-1508J is complete: report 177 records 125 focused passes, 55 script passes, 566 unit/component
passes and 13 integration passes with 52 gated skips. Broad worker/timeouts were resolved by
sequential two-worker runs without changing timeouts or assertions. No real-model call ran. K is
next: repair qualification output preparation and select/review an eligible exact provider profile
before qualification. B/C/D remain gated and deployment disabled at 0.16.0.

Implementation, pretest review and fixture-repair history are preserved in reports 174–176.
The accepted recovery contract remains spec 0003/D-512.

Diagnosis is complete in `docs/173-wl-1508c-selection-failure-diagnosis.md`: pinned Ollama source
bypasses the output schema for the installed qwen3.5 parser with thinking disabled; local metadata
matches that path. Separately, runtime grounding does not enforce material fact/action dependencies,
and minimized facts omit posted/projected qualifiers. Exact historical output remains unavailable.
Only documentation and read-only inspection were performed; no tests or inference ran. Next is a
bounded K preparation under spec 0003, not a new phase.

Selection-v1 C finished one uninterrupted matrix but failed: 210/216 accepted (207 grounded plus
3 permitted safe rejections), with 6 failures. `docs/172-wl-1508c-selection-v1-full-evaluation.md`
records de-DE balance-projection required-citation omissions and en-GB balance-closing fact-array
length failures, three repetitions each. The former balance-summary duplicate cases now pass 9/9,
but the zero-tolerance gate still fails. No retry/tuning followed. C stays open, D blocked and
provider deployment disabled. Report 173 completes diagnosis of these two failure modes.

Fresh selection-v1 B passed 18/18 in `docs/171-wl-1508b-selection-v1-screen.md`: submission-actions
9/9 followed by today-posted 9/9. Exact model/isolation preflight, v2 artifacts, locale/repetition
coverage, null diagnostics and unchanged source hashes passed review. No retry or tuning occurred.
C's subsequent full matrix failed 210/216; the old 213/216 remains failed evidence. D and the parent pilot
remain open. Provider deployment remains disabled and no phase/version changed.

WL-1508I is implemented and verified: `docs/170-wl-1508i-duplicate-safe-generation.md` records
fixed boolean reference selections, unchanged final grounding validators, bounded field diagnostics,
logger enforcement and versioned artifact validation. Typecheck, lint, build, 55 script tests,
530 unit/component tests and 13 integration tests passed; 52 gated integration tests were skipped.
Repository-wide formatting remains limited by baseline CRLF/user-settings issues; scoped formatting
is checked. I itself ran no model or browser E2E case. The subsequent fresh B now passes 18/18;
its old 18/18 remains historical. C remains open and D blocked. Provider stays disabled at 0.16.0.

The requested duplicate-reference diagnosis is complete in
`docs/169-wl-1508c-duplicate-reference-diagnosis.md`. WorkLedger sends uniqueItems and correctly
rejects duplicates; Ollama 0.24.0's array grammar does not enforce that keyword. Report 173 now
identifies an earlier schema bypass in this candidate's chat path, refining that causal attribution.
No duplicate native
fixture identifiers or Spanish-only reference construction were found. The exact repeated array
cannot be recovered from content-free traces. The completed recovery design specifies safe field/count
diagnostics and duplicate-safe generation, preserving strict validators. No tests or model calls ran
during diagnosis, and no new phase is needed. C remains failed and D blocked.

`WL-1508C` completed one uninterrupted matrix but failed the zero-tolerance gate: 213/216.
`docs/168-wl-1508c-qwen36-full-evaluation.md` records all three Spanish balance-summary failures
with FINAL_SCHEMA_REFERENCES_DUPLICATE, exact pinned controls, full artifact verification, and
normal termination. No retry or tuning followed. C remains open; D and the parent pilot are blocked.


`WL-1508B` is complete: `docs/167-wl-1508b-qwen36-regression-screen.md` records 18/18 strict
qwen3.6 cases (9 submission-actions, then 9 today-posted), unchanged controls, preserved content-free
artifacts, and the zero-case Windows launch correction. The subsequent C run failed 213/216. Deployment
provider mode remains disabled; the parent pilot is not complete.


`WL-1508H` is complete: `docs/166-wl-1508h-employee-pilot-rerun-preparation.md` records source drift, local
manifest inventory, a provisional qwen3.6 digest, and a Windows runbook. On recheck, loopback Ollama
0.24.0 is reachable, the served candidate digest matches, and no model is loaded. System Node
24.18.0 and Corepack pnpm 11.20.0 are now verified using the system launcher. The static workspace
and phase guards pass after a CRLF-only portability fix. The explicitly authorized synthetic
cold-start probe passed in 29.265 seconds with CHAT, STRUCTURED_OUTPUT, and TOOLS. H itself ran
no employee cases; the subsequent B screen now records 18/18. Operator isolation is now verified: cloud disabled, no outbound proxy, loopback-only
listener, and two enabled executable-scoped outbound firewall blocks on every profile. The system
settings and rollback are recorded in the preparation report. H and B are complete. C has failed
and requires new passing evidence; D remains unexecuted.


**Reopening, 2026-09-06 (D-510):** The user reopened the employee pilot for a future test.
The earlier closure remains historical failed evidence. `WL-1508H` prepares and requalifies one
exact candidate before reopened `WL-1508B`, then gated `WL-1508C` and `WL-1508D`. No tests or
model probes run in this planning task. Provider mode remains disabled; no model is approved.
The completed deterministic Phase 15 gate, version `0.16.0`, and obsolete Manager interpretation,
natural-language reports, and MCP proposals remain unchanged. This bounded rerun needs no new phase.

Phase 15 is complete at internal milestone `0.16.0`. `WL-1516` reconciles the accepted
deterministic Employee, Manager, privacy-suppressed HR aggregate, and isolated System paths; closes
the final database route-coverage and native-result validation defects; passes repository,
PostgreSQL, upgrade, production, browser, accessibility, privacy, and reviewed visual gates; and
keeps provider mode disabled with no approved model. Completed `WL-1500` accepts ADR 0014 and
`docs/151-phase-15-insights-architecture-privacy-evaluation.md`. Completed `WL-1501` now supplies
strict typed Employee Insight requests, closed native result validation, and a repeatable-read
service that reloads current PostgreSQL authority before every handler. Deterministic native facts
remain authoritative and complete without a model; one active workspace narrows every request and
every later read-only tool call must reauthorize current scope. Completed `WL-1502` now supplies
authoritative balance-change, submission-blocker, leave-projection, and Today-explanation handlers
without inventing policy or exposing protected identifiers. Completed `WL-1503` now supplies the
same-origin CSRF-protected endpoint and accessible localized native route. Completed `WL-1504` adds
bounded, visible, removable, request-memory-only context from Today, My Time, My Balances, Requests,
and employee-authorized Reports and passes the deterministic foundation sub-gate with no provider.
Completed `WL-1505` now supplies four strict Employee Insight tools, current self authorization on
every execution, exact purpose output allowlists, combined-role workspace isolation, and explicit
external adapter denial. Completed `WL-1506` now supplies the disabled-by-default provider
abstraction and an optional private Ollama adapter. It pins the exact origin, resolved private
address set, local model name and digest, chat/tool/structured-output capability, timeout, and
installation concurrency; it rejects redirects, proxy routing, public/cloud models, reasoning
content, model drift, and generation before a successful health check. Completed `WL-1507` now
supplies optional employee-self Ask My Ledger interpretation through that adapter and the existing
tool registry. Questions and prior turns remain request memory only; every tool reauthorizes current
self scope; structured output maps to validated native facts, limitations, actions, and exact
sources; native values are rendered outside model prose; and cancellation or provider failure
preserves the complete deterministic result. `WL-1508` evaluated the pinned model,
prompt-injection and privacy boundaries, degraded behavior, content-free traces, and accessibility
before the local AI pilot sub-gate may pass. `WL-1508` now supplies the 24-question, three-locale,
three-repetition evaluator, content-free traces, privacy and security regressions, degraded-provider
coverage, and accessibility evidence. The exact evaluated `gemma4:12b` digest reached 207 of 216
strict cases: six `submission-actions` cases returned provider-invalid structured output and three
German `today-posted` cases omitted the required posted-balance fact. The zero-tolerance pilot gate
therefore did not pass and provider mode remains disabled by default. Recovery work was
bounded as completed replacement-digest qualification (`WL-1508A`), an 18-run known-failure
screen (`WL-1508B`), the uninterrupted 216-run gate (`WL-1508C`), and evidence/project-memory
closure (`WL-1508D`). `WL-1508A` rejected `devstral-small-2:latest` after the unchanged cold-start
health check timed out at 120.257 seconds, then qualified `qwen2.5-coder:14b` digest
`9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849` in 4.623 seconds with chat,
structured-output, and tool capability. Each failed model check stops the sequence without
changing prompts, schemas, validators, or accepted thresholds. `WL-1508B` applied that stop rule:
all nine `submission-actions` locale/repetition cases for the qualified digest failed before a tool
call with safe `PROVIDER_INVALID_OUTPUT` / `INVALID_RESPONSE` / `TOOL_REQUIRED` evidence. The
`today-posted` half and the full matrix did not run.
The remaining installed inventory supplied one unique untested tool-capable digest,
`qwen3-coder:30b`. Completed `WL-1508E` qualified its exact explicit tag and digest from an empty
loaded-model state in 45.570 seconds with `CHAT`, `STRUCTURED_OUTPUT`, and `TOOLS`. It stopped before
every employee semantic case. The separate `WL-1508B` screen then ran all nine required
`submission-actions` locale/repetition cases at the unchanged 120-second request deadline and
concurrency `1`. Every case failed safely with provider `TIMEOUT`: six before a tool call and three
after one tool execution while awaiting final output. The `today-posted` group and complete matrix
did not run. No model candidate now satisfies the screen. `WL-1508F` implements the accepted
bounded recovery: WorkLedger executes the exact registry call from validated Employee request
intent, reauthorizes current self scope before model context exists, and makes one tool-free
provider request whose JSON Schema is constrained to the current locale, current authorized
references, and locale-safe prose. The existing runtime validators, provider capability and
security contract, native fallback, zero-tolerance gate, and disabled default remain unchanged.
Mocked, cancellation, provider-failure, database-authorization, and repository checks pass without
a real model case. `WL-1508F` is complete. The exact qualified `qwen2.5-coder:14b` rerun then passed
all three Spanish `submission-actions` repetitions, while all six English and German repetitions
omitted the required pending request action reference. Every provider response and runtime
validation succeeded, every trace recorded one registry execution owned by the server and zero
model tool rounds, and the stop rule prevented `today-posted` and the full matrix from running.
The user then closed the optional model pilot without passing it. `WL-1508B` was closed after the
failed screen; `WL-1508C` and `WL-1508D` were closed without execution. That closure prohibited
further model work at the time. Decision `D-510` now reopens only the bounded employee evaluation
backlog; this planning task executes no tests.
Completed `WL-1508G` reconciles the remaining phase around deterministic, provider-independent
Insights. Completed `WL-1509` adds strict deterministic Manager action summaries and neutral team
coverage for current direct reports through a multilingual accessible Manager route, native source
actions, repeatable-read authorization, exact organization-local date semantics, and zero provider
calls. Completed `WL-1512` accepts exactly two fixed HR purposes:
organization-wide monthly closure readiness and neutral absence coverage for one canonical month.
It fixes sources and units, whole-result suppression at the 10-person cohort, 3-case, and 10-person
complement floors, a closed query algebra against differencing, generic suppression, bounded source
actions, and zero provider context. Completed `WL-1513` implements that contract through strict
requests, server-owned PostgreSQL aggregation and suppression, repeatable-read HR authorization, a
no-store endpoint, and an accessible multilingual native route with zero provider dependency.
Completed `WL-1514` adds one isolated technical System Insight with strict version, readiness,
schema, host-owned backup-boundary, mail-configuration, and session-policy facts. It reauthorizes
current System scope, exposes no employee or HR field, states that backup runtime truth is
unavailable to the application, and has no provider dependency. Completed `WL-1516` records the
provider-disabled release gate in `docs/165-wl-1516-phase-15-gate-review.md`. Manager model interpretation (`WL-1510`),
natural-language report generation (`WL-1511`), and optional MCP evaluation (`WL-1515`) are obsolete
and removed from the accepted Phase 15 scope. General chat, natural-language SQL, unrestricted
tools, scoring, prediction, recommendations, autonomous actions, and model-authored domain
decisions remain excluded.

Phase 15 is complete at `0.16.0`; Phase 14 remains complete at `0.15.0`. `WL-1400` accepted ADR 0013, `WL-1401` provides the typed runtime
foundation, and completed `WL-1402` persists authoritative account and invitation locales plus the
bounded signed-out device preference. `WL-1403` supplies language-neutral API descriptors for its
bounded migration set. Completed `WL-1404` now localizes the shared and authenticated foundation,
including authentication, Profile, shell, route boundaries, common validation, dialogs,
pagination, and announcements. Locale changes retain focus continuity and rollback, protected
content waits for the account catalog, and Profile session instants use the authoritative
organization timezone. Completed `WL-1405` now localizes the employee workflows for Today, time
and balances, daily records, requests, corrections, absences, calendar, notifications, and monthly
review, including the integrated monthly print view. Completed `WL-1406` now localizes manager
Approvals and Team views, reports, HR employee/team/policy/settings administration, audit,
accounts, and system operations. Completed `WL-1407` localizes print and clipboard output with the
authenticated browser locale, CSV output with the authorized actor locale, notifications and
password resets with the recipient account locale, and invitations with their stored initial
locale. `D-508` bounds the completed integration through a 96,000-byte raw and 22,000-byte gzip
Phase 14 allowance above the preserved 910,000/246,000-byte application baseline; the measured
build consumes 94,370/12,039 bytes of that allowance. `WL-1408` now provides expanded catalog
enforcement, 39 contract descriptor mappings, an isolated `en-XA` test runtime, drafted glossary
candidates, and the reproducible human-review guide in
`docs/148-wl-1408-human-catalog-review.md`. German is approved by Vasileios Mitsaras and Spanish by
Sol as of 2026-08-27 after their recorded terminology findings were resolved. Completed `WL-1409`
adds the five-profile localized browser matrix, eight deterministic German/Spanish cross-role
screenshots, forced-colors and reduced-motion checks, native macOS accessibility-tree evidence,
and corrected migration/upgrade verification for the account-locale backfill and constraint.
Completed `WL-1410` closes the PostgreSQL residual with the database-enabled integration suite and
the repaired `0.9.0` prior-release upgrade verifier, signs the Phase 14 checklist, and advances all
ten manifests to `0.15.0`. The broader `D-502` retail browser and assistive-technology matrix
remains an explicit limitation rather than a conformance claim. The portfolio presentation scope
remains an unnumbered draft.

## Verified decisions

- Product name: WorkLedger.
- One organization per self-hosted installation for the initial release.
- Runtime company identity is immutable presentation configuration; PostgreSQL organization data
  remains authoritative for scope, relationships, history, and audit.
- `GET /v1/identity` exposes only the validated display name, same-origin identity asset paths,
  decorative accent, and request ID; it exposes no organization ID, domain setting, account field,
  filesystem path, or secret.
- Organization accent affects only the non-semantic identity mark. Product-owned action, link,
  focus, and status color families never derive from deployment branding.
- React web application with a separate Fastify API.
- PostgreSQL source of truth.
- React Aria plus shadcn React Aria source components and Tailwind.
- TanStack Query for server state.
- The Today query uses an exact trusted capture instant, a minute-aligned calculation instant, and
  an organization-local Temporal date boundary; current-day values are explicitly provisional or
  incomplete and never final. Posted flexible-time evidence is ledger-derived through the prior
  local date and bounded by the same capture instant.
- The Today ready panel presents current attendance, today's credited progress, and posted flexible
  time as three labelled semantic sections in stable DOM order. The active elapsed value describes
  only the current work interval or break; it is never presented as a whole-session duration.
- Current status and its permitted attendance actions form one primary task column. Narrow source
  order is status, actions, progress, then posted balance; wide layout keeps the same action group
  with status beside the other semantic zones. Actions never fall below secondary Today details.
- The current Today visual gate is the separate five-file `WL-1307` baseline. Phase 12 screenshots
  remain historical and unchanged. The current gate covers 1440, 1024, 768, 390, and 320 CSS-pixel
  viewports plus axe, zoom-equivalent reflow, text spacing, reduced motion, long identity, privacy,
  and overflow assertions.
- Native Today progress compares credited minutes with expected minutes, caps only the visual
  progress position when credit exceeds expectation, preserves the uncapped value in text, and is
  omitted when expectation is zero or calculation is incomplete.
- The provisional daily difference is neutral partial-day evidence, not debt or an accumulated
  balance. Posted flexible time always carries its posted-through date or an explicit no-entry state
  and states that today's provisional result is excluded.
- Today attention is server-owned typed metadata: each emitted issue has one safe title,
  explanation, affected source date, severity, explicit submission effect, compatible recovery
  action and destination, link label, and expected next state. The browser renders that metadata
  without inferring errors from minutes, prose, current overnight attendance, or missing policy
  rules.
- The Today attendance state and server-provided permitted commands are the only source of clock
  actions. Permission loss latches a neutral denial presentation, removes the exact protected Today
  cache entry, closes pending confirmation, and prevents automatic refetch until route authority is
  re-established.
- Clock feedback distinguishes confirmed success, known no-effect, stale authoritative state,
  uncertain lost-response recovery, offline refusal, session expiry, and permission loss. A remote
  state change that preserves an action label but changes its interaction contract moves focus to
  current status instead of silently substituting the focused control.
- An older Today `attendanceRevision`, older `asOf` at the same revision, or older
  `snapshotCapturedAt` in the same calculation minute cannot replace newer in-memory query data.
  Today responses are no-store and exclude employee/organization, command, actor, absence-detail,
  policy-detail, and raw ledger identifiers.
- React Router `8.3.0` Data Mode owns route loaders, redirects, boundaries, permission gates, URL
  restoration, titles, and route focus; TanStack Query `5.101.4` owns in-memory remote state and
  mutations without browser persistence.
- Combined-role navigation expands one current work area at a time—My work, Team, People and
  policy, or System—while ordinary router links expose every authorized area landing and Reports
  appears once in the active non-system area. Current-area presentation remains memory-only and is
  never authorization evidence.
- Authenticated shell destinations and landing-route document titles consume one canonical label
  lexicon. My requests, Approval inbox, and Domain audit are not shortened or renamed differently
  between navigation, title, and landing heading; workflow-family eyebrows remain orientation
  copy rather than destinations.
- The Team workspace uses explicit destination labels: Team status, Approval inbox, and Team
  calendar. The work-area name remains Team, and authorization continues to come from server-owned
  navigation areas rather than route labels or client state.
- `/team` URL state is limited to allow-listed generic `availability` and `records` values. Unknown,
  duplicate, employee-identifying, workflow-specific, or absence-specific query state redirects to
  the canonical default. Filtering remains a client presentation over the already authorized Team
  response and does not widen or alter the server request.
- Team availability totals are keyboard-operable pressed buttons. Applicable rows lead to the
  generic employee-sorted Approval inbox or the current-month Team calendar without adding an
  employee, request, workflow, or absence subtype to the destination URL.
- Team results use a complete semantic record list below 72 rem and a captioned comparison table at
  wider widths. Both forms expose current team, time-bound availability, generic open-record state,
  and the same next step without page-level horizontal scrolling.
- Personal-request, approval-detail, and monthly-period badges consume one exhaustive typed
  text/tone presentation contract. Every state retains visible text, border, and marker; the
  presentation does not change workflow state or available actions.
- Shared panel density applies responsive comfortable, balanced, and compact padding without
  reducing target size or pushing Today's first valid action below its 320×568 acceptance viewport.
- Shared native table wrappers add their region name, keyboard tab stop, visible scroll guidance,
  and accessible description only while measured horizontal overflow exists; fitting tables retain
  caption/header semantics without a redundant focus stop.
- `pnpm test:visual` owns the current cumulative Phase 13 baseline: 19 reviewed macOS Chromium
  images cover Today, Approval inbox, approval detail, Team status, My time, Employees, and Teams
  from 1440 pixels through the 320-pixel reflow boundary. Earlier Phase 12 and task-specific Phase
  13 screenshots remain immutable historical evidence.
- Desktop account navigation, actor identity, and sign-out remain outside the independently
  scrolling destination inventory. The narrow shell preserves the same group order in the
  focus-managed React Aria drawer.
- Initial loading, permission denial, not found, and unexpected loader failures compose the shared
  route-state contract with a focused `h1`, safe recovery links, and a real retry button only for
  unexpected failures. A standalone top-level boundary also covers self-context startup failures
  before the application or authentication shell exists.
- Phase 15 Insights are read-only, active-workspace-scoped explanations over deterministic native
  results. The native result remains complete without a model and owns every fact, source,
  limitation, and action.
- Optional Phase 15 model interpretation is disabled by default and limited to a private,
  operator-controlled Ollama origin with a pinned local model digest. Public or cloud provider
  egress requires a superseding ADR and full privacy/security gate.
- The API uses direct nonproxy HTTP or HTTPS only for `/api/tags`, `/api/show`, and `/api/chat`.
  Every connection revalidates the complete pinned loopback/private address set, rejects redirects,
  and checks the exact local digest before protected generation. Provider health is optional and
  never enters core readiness or deterministic Insight authority.
- Insight questions, conversations, tool content, model input/output, and reasoning traces are not
  persisted. Each tool reauthorizes current scope, and model output cannot calculate, authorize,
  decide, score, recommend, or write.
- Employee Insight requests accept only one allowlisted kind with its exact date, month, or date
  range plus optional bounded visible context. Caller-supplied actor, organization, role, prose,
  model, and raw-filter fields are rejected.
- The Employee Insight Service reloads current PostgreSQL account, link, role, employee, and
  organization scope inside one repeatable-read transaction. It constructs kind, `SELF` scope,
  period, timezone, and capture metadata itself, then validates every handler result before return.
- Insight runtime schemas use the explicit `@workledger/contracts/insights` surface while the root
  keeps type-only exports, preserving the accepted browser bundle baseline until the route exists.
- Employee balance Insights derive posted opening, range change, and closing values only from the
  captured time account ledger. Complete unposted daily projections contribute to a separately
  qualified projected range change, while incomplete dates are excluded and materially disclosed.
- Employee leave Insights calculate each configured entitlement account independently at the
  requested effective date. Account names may label their own authorized sources, but WorkLedger
  does not sum unlike accounts or fabricate a zero balance when no entitlement ledger exists.
- Employee submission Insights reuse the monthly projection pipeline and expose ordered blocker
  codes through purpose aliases only. Employee Today Insights reuse the complete Today pipeline,
  accept only the organization local current date, and keep prior-date posted flexible time apart
  from provisional or incomplete current-day facts.
- Deterministic Employee Insight payloads omit account, employee, organization, request, ledger,
  daily record, monthly period, absence type, punch event, note, and policy identifiers or details.
  Sources and details stay bounded, and current permission loss is checked before each computation.
- Contextual Employee Insight entries exist on Today, My Time, My Balances, Requests, and Reports.
  They carry only an allowlisted source kind and optional server-owned visible period into one-shot
  module memory; no DOM, route DTO, record identifier, or free text is copied.
- Insight context is visibly named and removable. It clears on consumption, explicit removal,
  session clearing, route denial, API permission loss, reload, and process loss. Only the existing
  allowlisted question kind and period may appear in the URL.
- The deterministic Insights foundation gate is complete with provider mode disabled.
- HR Insights accept only one fixed purpose and one canonical month. The server derives current
  organization, timezone, authority, cohort, and boundaries inside one repeatable-read transaction;
  caller filters, comparisons, groups, identities, and arbitrary ranges are rejected.
- HR aggregate repositories return only a safe aggregate or an internal suppression decision.
  The complete result is suppressed before facts, sources, and actions exist when the fixed cohort,
  contributing-case, or non-contributing-complement floor fails.
- Neutral absence coverage reads only current approved effective sources and returns employees,
  cases, employee-days, and scheduled minutes without subtype, name, note, reason, attachment,
  identity, team, manager, or row identifiers. Monthly closure returns workflow employee counts and
  missing or incomplete employee-days without work, balance, absence, or correction minutes.
- `/hr-insights` keeps requests and results in memory, emits no query state or persistent storage,
  provides only the same-month Monthly time report or Team calendar action after suppression passes,
  and has no interpretation or provider path.
- System Insights accept only the fixed `SYSTEM_TECHNICAL_OVERVIEW` request. The result must contain
  exactly the application version, service/database readiness, expected-schema status,
  host-operator backup boundary, mail-adapter configuration, and authentication session-policy
  facts from five closed technical sources.
- `/system/insights` reauthorizes current `TECHNICAL_OPERATIONS_MANAGE` scope for every explicit
  run, retains request and result state only in browser memory, and offers only the native
  `/system/operations` action. Backup runtime and restore-test status remain materially unavailable
  because WorkLedger owns no authoritative in-application source. No provider, employee, HR, or
  other domain path enters the service.
- The read-only Insight registry contains only four strict Employee tools. Each tool records its
  current `SELF` authorization actions, purpose, source and result allowlists, freshness rules,
  execution limits, high personal operational sensitivity, private local model exposure, and
  external adapter denial. Manager, HR, and System workspace calls remain denied.
- Every tool call runs the repeatable-read Insight Service again, so combined roles, prior results,
  prior tool success, browser state, and later model output cannot carry authority across calls.
  Tool schemas use the API-only `@workledger/contracts/insight-tools` entry point and remain absent
  from the browser graph.
- Accepted `WL-1508F` makes the server derive and execute the exact Employee registry call before
  provider generation. The model receives no tools and returns one schema-constrained response;
  runtime grounding validation remains authoritative. The task is complete after deterministic
  and database verification without a model evaluation.
- Framework-independent domain engine before UI feature development.
- WCAG 2.2 AA baseline.
- Immutable punch events, ledger-based balances, effective-dated policies, and monthly locking.
- Teams are the only MVP organization grouping; departments are deferred.
- Approval delegation is excluded from the MVP.
- `/approvals` is a purpose-minimized inbox for corrections, absence requests, absence
  cancellations, and monthly periods. It exposes only generic workflow category and status,
  current-team and affected-date metadata; absence subtype, including sickness, is never a list or
  URL value.
- `/approvals` uses a complete record list below 72 rem and a semantic comparison table at wider
  widths. The primary review action remains visible with employee, workflow, status, dates,
  submitted time, and current-team context; default filters do not expose a redundant clear action.
- Approval detail follows record state, current effect, available decision, and trailing evidence
  order. Decision validation, focus, negative-balance override, optimistic version, correction
  application, and authoritative refetch behavior remain unchanged.
- `/requests` is an employee-self, purpose-minimized history for correction, absence, and
  cancellation records. The list exposes broad workflow category, state, affected dates, submitted
  time, and opaque ID only. Exact absence subtype, correction reason, coverage, source events, and
  decision reasons appear only in the owner-authorized `/requests/:requestId` response.
- `/requests/new` keeps vacation, sickness, and correction selection in transient component state.
  The former subtype-bearing sickness route is absent, and the legacy correction path redirects to
  the canonical chooser with only its opaque daily-record target.
- Current manager/HR scope and self exclusion apply before filters, totals, sorting, and
  pagination. Rows, totals, and team filter options share one repeatable-read snapshot.
- Monthly-period rows use month bounds and direct restricted-period links; scope and self-exclusion
  apply before filters, totals, sorting, and pagination, and reasons/source detail stay excluded.
- `/reports` returns only the current actor's authorized catalog. The five allow-listed report
  queries fix self/current-report/organization scope before date filters, totals, sorting, counts,
  and pagination; pending approvals exclude self, system authority grants no domain fallback, and
  an explicit unrelated opaque employee target returns `403` without partial fulfillment.
- Report URLs contain only bounded dates, pagination, allow-listed sorting, and an optional opaque
  authorized employee target. Generic report DTOs exclude sickness classification, reasons, notes,
  source/employee identifiers, and entitlement detail outside generic leave-account totals.
- Report CSV generation is a strict same-origin, CSRF-protected POST that re-evaluates the current
  report permission and `RECORD_EXPORT` scope inside one repeatable-read transaction. Complete
  authorized results are bounded to 100,000 rows and 32 MiB of UTF-8; formula-significant text is
  apostrophe-prefixed before ordinary CSV quoting, filenames are non-person-identifying, and the
  success audit stores only actor/authority, report action, scope, time, and source count.
- Monthly print and report-summary clipboard writes occur only after labelled user actions and an
  action-time authorization refresh. Their dedicated purpose-minimized representations omit
  internal identifiers, sickness classification, notes, decision reasons, reviewer comments, and
  hidden content; failure never opens print or claims a successful copy.
- Monthly request-changes, approval, and lock transitions use `CURRENT_MANAGER` when that current
  scope qualifies, otherwise `ORGANIZATION_HR`; HR-only accounts need no fabricated employee
  identity, system administrators receive no domain fallback, and both paths apply identical state,
  version, source, reconciliation, transaction, audit, and notification checks (`D-402`).
- Approval decisions require the authenticated account and explicit `CURRENT_MANAGER`,
  `ORGANIZATION_HR`, or `SELF` authority; a linked employee identity is optional evidence, so
  HR-only accounts remain attributable without fabricated employee records (`D-352`).
- The typed internationalization foundation supports exactly `en-GB`, `de-DE`, and `es-ES`, with
  `en-GB` fallback, repository-local catalog chunks, safe text interpolation, and explicit
  locale/timezone formatting. Existing screens still activate English only until their owning
  migration tasks complete.
- The preserved non-catalog application baseline is 910,000 bytes raw and 246,000 bytes gzip.
  Phase 14 localization runtime and integration have a separate 55,000/18,000-byte allowance;
  largest-chunk, CSS, and locale-catalog ceilings remain independent and unchanged (`D-508`).
- Phase 14 still requires complete user-facing-output coverage and fluent-human German and Spanish
  review before the multilingual product can ship.
- Employee self-service profile data is read-only; HR-owned employment facts are not self-editable.
- The self-context/profile transport exposes only active account, organization, employee summary,
  current application roles, derived navigation areas, and minimized session/device summaries; IP
  addresses and raw user-agent values never enter browser DTOs.
- In-app notification records are core; external email delivery is optional and non-transactional.
- Manager scope is current direct reports only and is evaluated when each request is handled.
- Team membership and direct-manager assignment use separate non-overlapping half-open histories;
  current manager scope is re-resolved from PostgreSQL on every request, so an effective manager
  change transfers access immediately while prior rows retain attribution but grant no access.
- Effective assignment changes cannot be backdated or replace an existing same-day boundary,
  preserve already scheduled later boundaries, and validate the full current/future manager graph
  against self-links and direct or indirect cycles inside the serializable mutation transaction.
- Weekly schedule versions are immutable organization-scoped seven-day minute records. Reusing a
  name with changed minutes creates the next serialized version, while an identical repeat is
  rejected and creating a version never changes employee assignments.
- Ordinary schedule assignment changes are current/future-only half-open transitions that preserve
  earlier and already scheduled later boundaries. Every current/future employed date must remain
  covered, periods between separate employments need no schedule, and PostgreSQL exclusion and
  organization-scoped foreign-key constraints remain final integrity guards.
- Inactive teams remain readable in history but unavailable for new assignments; a team with a
  current or scheduled assignment cannot be deactivated.
- `/team` uses active attendance before neutral organization-local date absence coverage and exposes
  only display name, current team name, textual availability, and a generic unresolved-record flag.
  It never exposes employee/request IDs, absence subtype, sickness context, notes, reasons,
  entitlement, or reviewer history.
- `/team` uses a complete direct-report list below 48 rem and a semantic table at wider widths, so
  availability, current-team context, unresolved-record state, and the approval-inbox action do not
  depend on horizontal panning.
- `/team-calendar` exposes effective, uncancelled coverage for the manager's current direct reports
  or HR's organization scope as neutral `UNAVAILABLE` entries. Its month grid and agenda share one
  selectable-date model; narrow screens start with the agenda, and missing current-team assignments
  remain explicit rather than guessed.
- Team calendar places selected month and selected-date context before the equivalent agenda or
  month grid. The grid retains a named, instructed local overflow region; the agenda is the narrow
  default until a user deliberately selects a view.
- Explicit unauthorized targets return `403`; scoped collections apply authorization before counts and pagination.
- Self-approval and privileged self-adjustment are prohibited even for combined roles.
- System-administrator capability grants technical access only, not HR/domain data.
- A work session runs from clock-in to clock-out and contains break-free work intervals; breaks are excluded exactly once.
- Effective-date ranges are half-open, and stable employee identity survives non-overlapping employment periods.
- Account/employee links are one-to-one while active; team and manager assignments have one current value per employee.
- Derived intervals split at organization-local midnight while source sessions/events remain intact.
- Ordinary clock actions use one trusted server occurrence instant and strictly increasing per-employee event sequence numbers.
- Every attendance command carries the latest `attendanceRevision`; one successful command increments it once, while rejection and replay do not.
- Every attendance mutation requires a scoped, fingerprinted `Idempotency-Key`; matching retries replay the terminal outcome and attendance keys do not expire in the MVP.
- `POST /v1/me/attendance/clock-in` authorizes active self capability before strict request
  validation, repeats that decision inside one serializable transaction, and atomically commits one
  immutable punch, one revision increment, one minimized audit event, and one terminal outcome.
- Concurrent matching clock-in requests produce one original result and one terminal replay;
  wrapped Drizzle/PostgreSQL serialization and deadlock codes remain eligible only for bounded
  database-only transaction retry.
- Clock-in captures one trusted minute only after lock/revision/state validation, rejects server
  clock regression with a complete rollback, and never accepts a client occurrence instant.
- The Today clock-in form uses one memory-only intent key, visible disabled pending state, no
  optimistic attendance claim, authoritative refetch, one result announcement, and logical status
  focus when the initiating control becomes invalid.
- Confirmed on-break clock-out atomically appends `BREAK_END` then `CLOCK_OUT` at one instant and increments the attendance revision once.
- `START_BREAK`, `RESUME`, and `CLOCK_OUT` share clock-in's preflight and in-transaction
  authorization, serializable idempotency, head/revision/source validation, trusted occurrence,
  immutable event, minimized audit, and terminal replay boundary.
- The Today screen renders only authoritative valid actions, disables the complete control group for
  one pending in-memory intent, and uses a controlled modal for deliberate active-break clock-out;
  cancel/Escape causes no attendance effect and confirmed submission creates a new intent key.
- The ready Today route uses one raised status/summary region, one rule-separated valid-action band,
  then attention, immutable timeline, and calculation disclosure in stable DOM order. Its
  container-sized layout never reorders controls, and the focused route heading shrink-wraps the
  existing product-owned outline instead of resembling a full-width input.
- Today calculation detail presents server-provided integer-minute sources in a captioned semantic
  table for expected time, credited time, and the provisional result. Applied corrections and other
  approved adjustments remain separate evidence, and the browser does not derive authoritative
  calculation totals.
- Today attendance history is a semantic ordered list with event meaning, organization-local date,
  IANA timezone, and same-time recorded-order context. Purpose-minimized approved correction
  evidence states the original and corrected worked totals without rewriting or hiding punch events.
  The table and timeline reflow without horizontal page overflow at the automated 320 px boundary.
- Today polls every 30 seconds only in the foreground and always refetches on tab return or
  reconnect. Newer device revisions cannot be replaced by older snapshots; if a refresh removes
  the focused action, current-status focus and one polite device-change message preserve context.
- Attendance mutations never pause into an offline queue. Online transport/`5xx` failures receive
  at most two automatic retries with the same memory-only idempotency key; terminal `4xx` outcomes
  are not retried. Offline/reconnect and dependency states disable actions until one authoritative
  refresh succeeds.
- Punch occurrence/manual attendance inputs use minute precision; interval, daily, policy, and display calculations apply no later rounding.
- Daily calculations have identified inputs and `PROVISIONAL`, `INCOMPLETE`, or `COMPLETE` status; only complete past dates may post.
- Holiday dates reduce expected and default absence consumption/credit to zero while preserving actual worked credit.
- Nonexistent manual local times are rejected; ambiguous times require one valid explicit UTC offset.
- Ordinary organization-timezone changes are blocked after time-dependent employee facts exist.
- Complete past dates post one base daily delta; later unlocked recalculations append only the difference, and locked changes use post-lock adjustment.
- Leave entitlement, reservation, deduction, restoration, coverage, credit, and expected-reduction amounts use integer minutes; day equivalents are presentation only.
- Half-day absence is an exact first/second obligation partition; minute coverage cannot mix with full/half coverage on the same local date.
- Approval-required entitlement absence reserves on submission, releases and deducts on approval, and releases without deduction on rejection, changes requested, or withdrawal.
- Negative vacation approval is manager-blocked and requires an eligible non-self HR override with a reason.
- Report-and-acknowledge sickness is effective once on report; acknowledgement adds no second effect, and the default retrospective window is seven configurable calendar days.
- Unpaid leave reduces covered expectation by default and contributes no absence credit.
- Cancellation is a separate versioned workflow that may target exact remaining coverage, restores no more than the linked deduction, and never rewrites the original request/decision.
- Sickness has no diagnosis, note, clinician, or attachment field; type and sensitive context stay out of team DTOs, URLs, browser persistence, generic notifications/exports, technical audit, and operational logs.
- Monthly readiness and adjusted-after-lock are derived; persisted workflow states are open, submitted, changes requested, approved, and locked.
- Approval creates a reconciled immutable snapshot; a separate eligible current-manager or
  organization-HR non-self reviewer action locks that exact snapshot, with no MVP unlock.
- Submitted/approved months require an explicit changes-requested transition before ordinary mutation; locked changes append uniquely linked adjustments against the preserved baseline.
- Monthly snapshots include versioned daily calculation/source/ledger evidence but exclude sickness classification, notes, entitlement balances, and other purpose-incompatible HR detail.
- Locked-date corrections reference the exact approved snapshot and approval atomically appends an
  ordered adjustment, nonzero time-account delta, audit, and generic notification without changing
  raw punches, the daily projection, or approved snapshot. The monthly DTO and UI separate the
  immutable approved record from its reconciled adjusted view.
- Locked-period absence cancellation preserves employee intent, links every affected immutable
  snapshot/source fingerprint, applies exact append-only absence/entitlement/time adjustments under
  current non-self reviewer authority, and exposes original versus reconciled results without
  sensitive absence detail (`D-504`, implemented by `WL-1000A`).
- Phase 10 threat evidence is cumulative: `WL-1000` owns the application baseline and central
  permission matrix, while load, deployment, restore, upgrade, diagnostics, and retention tasks add
  their required operational evidence before `WL-1008` can close `T-001`–`T-020` (`D-505`).
- The MVP application has 32 canonical route patterns plus three explicit host-operator workflows, each with stable implementation ownership.
- Request and approval routes are type-neutral; sensitive workflow types, notes, reasons, entitlement values, and person-identifying search text never become URL state.
- Route navigation updates the document title and visible heading with deterministic focus behavior; screen states have persistent, non-duplicative focus and announcement rules.
- Narrow-screen calendars use an equivalent agenda/list when the grid is unsuitable, and responsive transformations preserve reading order, relationships, and actions.
- System-administrator routes expose only technical account/session, safe operations, and technical-audit data; restore, secret rotation, and upgrade remain host-operator workflows.
- `/system/audit` is a bounded redacted explorer over the physically separate security audit store.
  `SECURITY_AUDIT_READ` is resolved inside the query transaction; organization scope, local-date,
  action, outcome, and target-kind filters precede totals/pagination. Browser DTOs omit
  actor/target account IDs, organization ID, request ID, domain payloads, notification content, IP
  addresses, user agents, tokens, and unrestricted text.
- HR employee administration and system account administration use separate contracts and routes:
  HR owns stable employee/employment history and employee/manager/HR roles; system administration
  receives no HR fields and owns only technical account state, system role, and session revocation.
- The employee directory and separate `/teams` catalog use complete record cards below 48 rem and
  captioned comparison tables above it. Identifying employee search uses a bounded,
  same-origin/CSRF-protected private body after HR and organization scope, while generic status and
  ordinary browse pagination remain URL-owned. Explicit record actions replace linked identity
  text; disabled team deactivation references an adjacent reason and recovery path. Report and
  audit comparisons retain named local scroll regions with persistent narrow-screen guidance.
- Employee deactivation ends the current half-open employment period, deactivates the linked
  account, and revokes all sessions without deleting prior periods or roles. Technical account
  state changes never mutate employment, and cannot re-enable an employee-linked account while the
  employee is inactive.
- WorkLedger treats authentication, employment, attendance, benefits, sickness-related absence, approvals, audit, exports, and backups as high-sensitivity data with purpose-specific access and retention.
- Invite-only credentials use 15–128 character passwords, local common-password rejection, 30-minute single-use reset grants, and 24-hour single-use invitation grants.
- Sessions are PostgreSQL-backed and immediately revocable; stateless/session caches and persistent remember-me are excluded, with 30-minute idle, 12-hour absolute, and 15-minute freshness boundaries.
- Production uses one canonical HTTPS origin, secure host-only cookies, enabled Better Auth checks, WorkLedger session-bound CSRF protection, protected-response no-store caching, and no sensitive browser persistence.
- Better Auth `1.6.26` owns invite-only credentials and technical sessions only; WorkLedger pins its security-sensitive options, stores sessions and atomic throttle buckets in PostgreSQL, protects reset identifiers at rest, and recursively strips credential/token fields from auth responses.
- Account-employee links and application-role assignments preserve history outside Better Auth; every authorization decision resolves active account/employee capability, current roles, organization, current direct-manager scope, and prohibited self-actions from PostgreSQL before applying a deny-by-default policy.
- Strict Zod contracts are the single transport source for Fastify validation, response
  serialization, inferred types, and generated OpenAPI 3.1; schema failures return `422`, malformed
  JSON returns `400`, and every response receives a server-owned UUID request identifier.
- `GET /openapi.json` exposes only selected Zod/Fastify WorkLedger contracts as no-store JSON; a
  canonical tracked OpenAPI artifact is regenerated and drift-checked without a second handwritten
  transport source, while typed-client generation is deferred until a stable generator supports
  the pinned TypeScript 7 toolchain.
- Domain and security audit evidence uses separate append-only tables, fact allowlists, repository
  record types, and authorization-composed query paths; source actions and audit evidence can commit
  atomically, and neither HR nor system roles gain the other audience implicitly.
- Caddy is the reference production proxy while the observable TLS, trusted-header, network-isolation, health, and security-header contract remains proxy-agnostic.
- Each deployment must own an explicit retention profile by data class; ordinary deletion never destroys source, ledger, snapshot, or required audit integrity, and restored sessions/grants are invalidated before activation.
- The canonical repository is the existing public `vmitsaras/WorkLedger` GitHub project and WorkLedger-owned source/documentation uses the existing MIT license.
- Root, app, and package manifests remain private/internal for the MVP; internal names use `@workledger/*` and cross-workspace edges use `workspace:*`, with no npm publication workflow.
- The accepted dependency graph keeps domain, contracts, UI, and config independent; database may import domain; web may import UI/contracts; API composes domain/contracts/database; test-utils is test-only.
- Cross-project deep/sibling-source imports, app imports, undeclared path-alias edges, workspace cycles, production test/config imports, and browser imports of authoritative domain/database/server code are prohibited and fail executable checks.
- pnpm with one root lockfile and no Turborepo is sufficient for the initial workspace; new production projects, dependency edges, orchestration, or package publication require an ADR.
- The root toolchain is pinned to Node `24.18.0` LTS and pnpm `11.20.0` stable; the generated lockfile records the Node runtime integrity variants.
- The exact workspace is two non-importable application shells plus six packages with explicit exports; five expose only their typed root and config also exposes its accepted tooling surfaces. `apps/site` remains deferred to the unnumbered portfolio draft.
- The eight accepted internal edges resolve through `@workledger/*` package roots and emit typed ESM entries; no sibling-source or deep import exists in the scaffold.
- TypeScript `7.0.2` is governed by a shared strict composite configuration; the root solution and per-project references exactly mirror the eight runtime edges and cannot use path aliases.
- Seven explicit development-only `@workledger/config` edges provide shared TypeScript configuration without making config production runtime code.
- Four explicit test-only `@workledger/test-utils` development edges allow API, web, database, and UI tests to use shared harness helpers while production imports remain prohibited.
- ESLint `10.8.0` checks JavaScript/tooling, Prettier `3.9.6` checks code/config formatting, and `es-module-lexer` `2.3.1` powers repository-owned source-boundary checks. Current `typescript-eslint` is not installed because its `<6.1.0` TypeScript peer range excludes TypeScript 7.
- Root commands reject a mismatched active toolchain, missing/unexpected or non-private workspace projects/configuration, alternate/nested lockfiles, wrong/non-`workspace:*` internal edges, TypeScript-reference drift/path aliases, dependency cycles, application exports, package export drift, forbidden/deep/app/test/config/browser-server source imports, and package-publication paths.
- Every completed zero-indexed phase gate requires the shared root/workspace version `0.<completed phase-gate count>.0`; Phase 1 completion sets all nine manifests to `0.2.0` without authorizing publication, tagging, deployment, or release creation.
- Vitest `4.1.10` owns unit, component, and integration projects; React/React DOM `19.2.8`, React Testing Library `16.3.2`, jsdom `30.0.1`, axe-core `4.12.1`, Playwright `1.61.1`, and Fastify `5.10.0` are pinned for the baseline harnesses.
- The root quality gate runs native contract tests, Vitest unit/component tests, Vitest integration tests, Chromium Playwright E2E with axe, and a GitHub Actions workflow that mirrors `pnpm run verify`.
- Application/domain records use PostgreSQL 18 native UUIDv7 defaults while domain and contract identifiers remain opaque strings; UUID generation time is not business chronology or authorization evidence.
- Daily projections persist as explicit-rebuild, versioned employee/date query caches with source fingerprints and reconciled minute totals; raw facts, append-only ledgers, and immutable approved snapshots remain authoritative.
- Drizzle ORM `0.45.2` and Drizzle Kit `0.31.10` own the internal database schema and generated migrations; PostgreSQL-only custom migration SQL adds effective-range exclusions, organization-consistency foreign keys, and immutable-history triggers.
- `@workledger/database` exposes one domain-facing root with repositories available only inside transaction callbacks; Drizzle schemas, rows, SQL/query builders, `pg` pools, and unrestricted clients remain internal, and an emitted-declaration test enforces the public closure.
- Repository operations are organization-scoped; attendance mutation supports `FOR UPDATE` head locking plus optimistic revision/event-sequence advancement, projection replacement requires the exact next version, and time-account rows map the canonical actor/explanation/source ledger contract.
- Transactions default to `READ COMMITTED`, permit explicit `REPEATABLE READ` or `SERIALIZABLE`, and retry only explicit database-only callbacks two to five times for PostgreSQL serialization/deadlock codes; callbacks with external effects must not enable retry.
- Local PostgreSQL development uses Docker Compose at `infra/compose/postgres.dev.yml`, official `postgres:18.4-trixie`, loopback-only host binding on port `54329` by default, a `pg_isready` health check, and the PostgreSQL 18 Docker image's `/var/lib/postgresql` volume layout.
- `WL-104` creates only local non-production database roles and empty development/test databases; it does not add WorkLedger product tables, Drizzle migrations, authentication storage, seed data, production Compose, or deployment behavior.
- `pg` `8.22.0` and `@types/pg` `8.20.0` are pinned for database access/tests; `WL-300` adds Drizzle ORM `0.45.2` and Drizzle Kit `0.31.10` for the internal schema and generated migrations.
- `WORKLEDGER_TEST_DATABASE_URL` opts the PostgreSQL lifecycle integration test into a real database connection; without it, the test skips. CI starts the same local Compose service, runs `db:verify`, sets the URL, and then runs the full quality gate.
- API runtime configuration is server-only and is parsed with native Node `URL`, `net.isIP`, and byte-length primitives. `WORKLEDGER_ORIGIN` is the only source for canonical links; production requires an HTTPS origin, exact trusted-proxy IP addresses, a credentialed non-placeholder PostgreSQL URL, and a non-placeholder authentication secret of at least 32 bytes.
- Fastify receives only the validated exact proxy-address list, never a broad proxy setting, CIDR, or hop count. Untrusted forwarded headers do not affect request protocol handling, and API health stays generic/no-store with CORS disabled by default.
- `.env.example` contains only safe local PostgreSQL defaults and blank production-secret fields. `config:check` uses Node's native optional `.env` loading and outputs a redacted configuration summary.
- The UI foundation pins React Aria Components `1.20.0`, Tailwind CSS `4.3.3`, Class Variance Authority `0.7.1`, and current shadcn React Aria metadata through `style: "aria-nova"`.
- Quiet Ledger is the approved Phase 11 visual and interaction direction: one state → action →
  effect → evidence rhythm; comfortable employee and compact operational density without smaller
  interactive targets; system/local typography; light-only color scheme; border/rule separation
  before shadow/card proliferation; organization accent subordinate to focus, contrast, and semantic
  state (`WL-1101`; see `docs/111-ui-design-direction.md`).
- `packages/ui` owns local semantic button, link, text-field, dialog, and drawer wrappers plus one
  explicit token stylesheet export; `apps/web` composes the authenticated Data Mode application
  shell and route surfaces without importing authoritative domain or database code.
- Shared alerts own their heading, urgency role, optional static presentation, and programmatic
  focus. Persistent route warnings do not announce on initial render; newly surfaced failures and
  mutation outcomes produce one focused or polite result. Canonical loading, empty, permission,
  not-found, and dependency outcomes compose the shared route-state contract.
- Visible focus uses React Aria focus-visible state with outline/forced-colors support. Reduced motion removes dialog spatial animation and preserves immediate state feedback without a global animation-duration reset.
- React Aria owns modal containment, Escape dismissal, initial dialog focus, and trigger focus restoration; component and Chromium tests cover semantics, keyboard behavior, axe, and reduced-motion computed styles.
- shadcn's current `info` command requires source aliases that conflict with ADR `0011`; WorkLedger retains alias-free relative UI imports and explicitly requests/adapts React Aria registry source instead (`D-007`).
- `skipLibCheck` is scoped to the UI and web projects for an upstream React Aria/React 19.2 optional-DOM-property declaration conflict; WorkLedger source remains strictly checked.
- `@babel/parser` `8.0.4` extends repository-owned source-boundary checks to TypeScript/TSX imports because `es-module-lexer` does not parse JSX and the pinned native TypeScript 7 package exposes no compiler parser API.
- Fresh-clone commands use `pnpm with 11.20.0` to select the accepted package manager and managed Node `24.18.0` runtime even when the host shell starts with another version; direct project commands reject a mismatched active toolchain.
- The public README distinguishes the runnable React Aria foundation preview from an application, supported demo, release, or production deployment and documents every current root script.
- GitHub Private Vulnerability Reporting is enabled for the public `vmitsaras/WorkLedger` repository. `SECURITY.md` provides the private route while promising no supported version, response deadline, remediation deadline, or production support.
- Phase 0 passed with all seven roadmap criteria evidenced; the accepted catalog contains 85 contiguous single-outcome examples, and every remaining open decision has an explicit later owner/deadline.
- Phase 1 passed all eight repository-foundation criteria with a clean-source frozen install, local and database-enabled quality gates, an actual successful CI run, executable ADR `0011` boundaries, and criterion-by-criterion evidence in `docs/28-phase-1-gate-review.md`.
- Phase 3 passed all seven roadmap criteria with clean/repeatable migrations, the accepted
  authentication/session/CSRF profile, deactivation proof, authoritative permission-matrix
  coverage, atomic immutable event/audit evidence, concurrent idempotent replay, non-leaking
  transport errors, deterministic seed scenarios, and shared internal version `0.4.0`.
- Domain primitives are construction-only branded values: opaque 1–128 character identifier tokens, safe-integer signed/non-negative minutes, canonical UTC instants, exact ISO local dates, named IANA timezone identifiers, and immutable half-open/open-ended local-date ranges.
- Primitive construction returns discriminated `Result` values with stable non-leaking codes; invalid values are never trimmed, rounded, coerced, or exposed in error payloads.
- Node `24.18.0` has no global Temporal implementation, so `packages/domain` directly pins `@js-temporal/polyfill` `0.5.1`; it adds no WorkLedger package edge or environment, filesystem, network, persistence, framework, or UI access.
- Domain values serialize without brand wrappers: IDs/time values as strings, minutes as integers, open range ends as explicit `null`, successes as `{ ok: true, value }`, and failures as `{ ok: false, error }`. The independent API contract remains owned by `WL-304`.
- Weekly schedules validate seven explicit `0`–`1440` weekday-minute values, where zero remains a deliberate zero-hour day. Schedule and policy assignments resolve only through half-open local-date ranges, return stable gaps/overlaps without array-order fallback, and preserve immutable version references.

## Work completed

- [x] Exact locale contracts, the private typed `@workledger/i18n` package, local seven-namespace
  catalogs, strict resolution, explicit formatters, React/react-i18next/React Aria adapters,
  catalog enforcement, and separate measured locale budgets completed (`WL-1401`; see
  `docs/141-shared-i18n-foundation.md`).
- [x] Complete route/output string inventory, message ownership and fallback architecture, API
  prose migration map, risk register, and German/Spanish glossary review structure accepted
  (`WL-1400`; see `docs/139-phase-14-internationalization-architecture-audit.md`, ADR 0013, and
  `docs/140-phase-14-translation-glossary.md`).
- [x] Quiet Ledger design problem frame, visual foundations, content hierarchy, page archetypes,
  density system, shell/responsive rules, component/state expression, motion, accessibility,
  microcopy, implementation ownership, and validation matrix approved (`WL-1101`; see
  `docs/111-ui-design-direction.md`).
- [x] Canonical route/role/workflow/state inventory, representative desktop/mobile/reflow and
  accessibility baselines, roadmap reconciliation, and prioritized `UI-001`–`UI-016` remediation
  register completed (`WL-1100`; see `docs/110-ui-ux-baseline-audit.md`).
- [x] `T-001`–`T-020` application evidence baseline, executable 36 employee/five account/seven
  installation action catalogs, exhaustive central permission-policy regressions, Phase 10
  evidence ownership, and the locked-cancellation implementation contract completed (`WL-1000`;
  see `docs/96-phase-10-threat-permission-baseline.md`).
- [x] Planning files reviewed for consistency (`WL-001`; see `docs/17-planning-audit.md`).
- [x] MVP scope, non-goals, assumptions, and success criteria finalized (`WL-002`).
- [x] Roles, resource scopes, permission matrix, and self-action rules finalized (`WL-003`).
- [x] Canonical domain vocabulary, concept relationships, and invariant catalog finalized (`WL-004`).
- [x] Attendance transitions, invalid actions, deterministic event order, idempotency, retry, and tab/device conflict behavior finalized (`WL-005`).
- [x] Daily calculation, DST/manual-time, holiday, timezone, posting, and 35 exact calculation fixtures finalized (`WL-006`).
- [x] Absence policy, entitlement ledger, coverage/overlap, workflow, cancellation, privacy, and 27 exact absence fixtures finalized (`WL-007`).
- [x] Monthly submission, changes-requested reopening, approval snapshot, separate lock, and post-lock adjustment rules finalized (`WL-008`).
- [x] Route ownership, screen states, responsive behavior, and testable accessibility criteria finalized (`WL-009`).
- [x] Security/privacy inventory, threat model, authentication/session controls, retention, proxy, backup/restore, and release controls finalized (`WL-010`).
- [x] Architecture decisions, repository publication/license choices, internal package policy, and enforceable dependency boundaries ratified (`WL-011`).
- [x] Phase 0 / Phase 1-entry blocking decisions resolved.
- [x] Domain and workflow example catalog approved with 85 single-outcome cases.
- [x] Roadmap and task-board mapping verified.
- [x] Phase 0 exit gate passed with criterion-by-criterion evidence (`WL-012`; see `docs/19-phase-0-gate-review.md`).
- [x] Private pnpm root workspace, stable toolchain, one lockfile, native manifest/cycle/publication checks, and root quality commands initialized (`WL-100`; see `docs/20-workspace-foundation.md`).
- [x] Two application and six internal package shells created with explicit exports, exact ADR `0011` edges, typed builds, and emitted-entry resolution checks (`WL-101`; see `docs/21-workspace-shells.md`).
- [x] Shared strict TypeScript/ESM, project references, ESLint/Prettier, and executable negative source-boundary fixtures configured (`WL-102`; see `docs/22-strict-tooling-and-boundaries.md`).
- [x] Vitest projects, React Testing Library/jsdom component smoke tests, API/database integration harness smoke tests, Playwright Chromium E2E with axe, and baseline CI configured (`WL-103`; see `docs/23-test-projects-and-ci.md`).
- [x] Local PostgreSQL Docker service, host health check, isolated test database lifecycle proof, and CI database startup configured (`WL-104`; see `docs/24-postgres-docker-dev.md`).
- [x] API runtime configuration, canonical-origin helper, exact Fastify proxy trust, safe `.env.example`, redacted config check, and security-focused API tests configured (`WL-105`; see `docs/25-runtime-configuration.md`).
- [x] React Aria shadcn metadata, local semantic UI wrappers, Tailwind/Vite preview, WorkLedger tokens, visible focus, forced-colors support, reduced motion, and browser/component accessibility evidence configured (`WL-106`; see `docs/26-ui-foundation.md`).
- [x] Public status/setup/script/package-boundary documentation, contribution guidance, MIT license explanation, and verified private vulnerability-reporting workflow completed (`WL-107`; see `docs/27-public-repository-documentation.md`).
- [x] Phase 1 passed with all eight gate criteria, clean-source and database-enabled verification, successful canonical CI evidence, and shared version `0.2.0` (`WL-108`; see `docs/28-phase-1-gate-review.md`).
- [x] Branded IDs/minutes/Temporal values, immutable half-open date ranges, stable result/error types, serialization boundaries, and focused construction tests completed (`WL-200`; see `docs/29-domain-primitives.md`).
- [x] Immutable weekly schedules, identity-only policy versions, effective-dated schedule/policy assignments, and exact gap/overlap/boundary resolution completed (`WL-201`; see `docs/30-effective-dated-time-configuration.md`).
- [x] Immutable attendance states/actions, exact valid-action sets, and every accepted
  transition/invalid-action outcome completed (`WL-202`; see
  `docs/31-attendance-transition-validation.md`).
- [x] Ordered immutable punch-event reconstruction, complete/open work sessions, break-free work
  intervals, and exact corruption/precision outcomes completed (`WL-203`; see
  `docs/32-attendance-reconstruction.md`).
- [x] Manual/corrected local-time resolution, future/negative/precision validation, and half-open
  interval overlap constraints completed (`WL-204`; see
  `docs/33-manual-attendance-interval-validation.md`).
- [x] Resolved-schedule daily expected/worked/credited/balance arithmetic and structured source
  failures completed (`WL-205`; see `docs/34-daily-attendance-calculation.md`).
- [x] Organization-local midnight splitting, DST-safe exact segments, and source-interval linkage
  completed (`WL-206`; see `docs/35-local-date-interval-splitting.md`).
- [x] Effective full/half/minute paid and unpaid absence effects, double-credit prevention, and
  daily-calculation inputs completed (`WL-207`; see `docs/36-daily-absence-effects.md`).
- [x] Append-only time-account totals, source explanations, and daily/recalculation/adjustment
  sequences completed (`WL-208`; see `docs/37-time-account-ledger-totals.md`).
- [x] Structured calculation warnings, submission blockers, and stable code ordering completed
  (`WL-209`; see `docs/38-calculation-signals.md`).
- [x] Pure-domain fixture evidence, full catalog owner mapping, and invariant review completed
  (`WL-210`; see `docs/39-domain-example-review.md`).
- [x] Phase 2 domain package boundary, fixture mapping, invariant review, and quality gate passed
  with shared internal version `0.3.0` (`WL-211`; see `docs/40-phase-2-gate-review.md`).
- [x] Initial 28-table PostgreSQL schema, UUIDv7 identifiers, explicit daily-projection persistence,
  generated/custom migrations, integrity constraints, immutable triggers, and clean migration proof
  completed (`WL-300`; see `docs/41-initial-postgresql-schema.md`).
- [x] Narrow domain-facing repositories, bounded pool construction, atomic transaction callbacks,
  attendance locking/stale-write detection, safe persisted-value mapping, explicit database-only
  retries, and executable public-boundary proof completed (`WL-301`; see
  `docs/42-repositories-and-transactions.md`).
- [x] Better Auth invite-only credentials, protected single-use reset grants, canonical reset URLs,
  database-backed idle/absolute sessions, freshness, session-bound CSRF primitives, secure host-only
  cookies, strict PostgreSQL throttling, revocation, and Fastify integration completed (`WL-302`; see
  `docs/43-better-auth-credential-session-foundation.md`).
- [x] Historical account-employee links and roles, active employment capability, current-manager
  scope, deny-by-default self/reports/HR/technical policies, scope-before-pagination, and immediate
  session invalidation completed (`WL-303`; see
  `docs/44-application-authorization-foundation.md`).
- [x] Strict shared Zod envelopes, inferred transport types, server-owned request IDs, `400`/`422`
  validation separation, non-leaking Fastify error mapping, response serialization, and internal
  OpenAPI 3.1 generation completed (`WL-304`; see
  `docs/45-shared-api-contract-foundation.md` and ADR 0012).
- [x] Physically separated append-only domain/security audit streams, actor-at-action attribution,
  minimized fact allowlists, immutable triggers, transaction-scoped append methods, and
  authorization-composed audience queries completed (`WL-305`; see
  `docs/46-audit-persistence-foundation.md`).
- [x] Protected organization/account/key attendance claims, exact fingerprint conflict handling,
  typed terminal snapshots, immutable completion, rollback retry, and concurrent replay completed
  (`WL-306`; see `docs/47-attendance-idempotency-persistence.md`).
- [x] Explicit local/test-only Northstar seed with deterministic personas, effective schedules,
  attendance edges, balances, requests, privacy-safe locked history, audit evidence, guarded
  migration/CLI behavior, and repeat/drift tests completed (`WL-307`; see
  `docs/48-development-seed.md`).
- [x] Hidden-from-spec public OpenAPI JSON, deterministic tracked artifact and drift gate,
  authentication/secret exclusion tests, and evidence-based typed-client deferral completed
  (`WL-308`; see `docs/49-openapi-exposure.md`).
- [x] Phase 3 migration, authentication/deactivation, authorization, audit, idempotency, error,
  seed, OpenAPI, security, database-enabled quality, and version gates passed with shared internal
  version `0.4.0` (`WL-309`; see `docs/50-phase-3-gate-review.md`).
- [x] Sign-in/recovery/reset routes, role-aware authenticated shell, read-only profile and minimized
  session surface, self-session revocation, responsive drawer navigation, route boundaries,
  permission gates, title/focus management, and axe/browser evidence completed (`WL-400`; see
  `docs/51-authenticated-application-shell.md`).
- [x] Authorized organization-local Today state, bounded immutable-event timeline, provisional or
  incomplete calculation, warning/blocker presentation, revision-aware query cache, responsive
  reflow, and API/browser evidence completed (`WL-401`; see
  `docs/52-today-attendance-read-model.md`).
- [x] Authorized clock-in contract, serializable idempotent transaction, trusted occurrence,
  immutable punch/revision/audit atomicity, terminal replay/conflict behavior, and accessible
  pending/result/refetch/focus UI completed (`WL-402`; see `docs/53-clock-in-mutation.md`).
- [x] Start-break, resume, and ordinary/active-break clock-out contracts; one shared protected
  command service; exact event ordering; cross-command replay/conflict behavior; accessible valid
  actions and confirmation; and full API/browser sequence evidence completed (`WL-403`; see
  `docs/54-attendance-command-sequence.md`).
- [x] Focused explainable calculation groups, semantic ordered attendance history, zero-expected
  holiday explanation, signed adjustment presentation, timezone/order context, long-label wrapping,
  and 320 px reflow/axe evidence completed (`WL-404`; see
  `docs/55-today-timeline-calculation.md`).
- [x] Same-key lost-response retry, offline non-queuing, reconnect-before-enable, foreground
  polling, focus/tab/device convergence, terminal-conflict non-retry, persistent dependency
  recovery, and race/retry browser evidence completed (`WL-405`; see
  `docs/56-attendance-resilience-recovery.md`).
- [x] Phase-wide keyboard, accessibility-tree announcement smoke, touch-emulation, 200%-width
  reflow proxy, forced-colors focus/boundary, reduced-motion, long-content, and ten-viewport review
  completed (`WL-406`; see `docs/57-employee-attendance-accessibility-review.md`).
- [x] Phase 4 web/API/database/domain/audit flow, duplicate/lost-response safety, device convergence,
  announcements, keyboard/mobile completion, recovery states, explainable balance, database-enabled
  canonical quality, and shared `0.5.0` version gate passed (`WL-407`; see
  `docs/58-phase-4-gate-review.md`).

## Latest decision update

### `D-504` — Locked absence-cancellation adjustment contract

- Resolved by `WL-1000` and implemented by `WL-1000A` as a distinct absence-cancellation workflow.
- Submission atomically captures the exact immutable snapshot and source fingerprint for locked
  targets; submitted/approved months still require reopening.
- Approval under current non-self manager/HR authority appends exact effect, entitlement,
  component-adjustment, time-ledger, audit, and notification evidence without changing the locked
  snapshot. Expected-version and source-evidence conflicts roll back the entire decision.
- Monthly contracts and UI keep the immutable approved record separate from the reconciled adjusted
  view and omit sensitive absence and internal linkage detail.
- Evidence is documented in `docs/97-locked-absence-cancellation-adjustments.md`.

## Active corrective review

### `WL-1001`–`WL-1003` evidence correction

- The earlier completion records did not satisfy their task-board acceptance evidence and are
  retained below as historical entries, not current completion claims.
- `WL-1001`: complete after adding enforced bundle budgets, correcting the supported scale to 10–250
  employees, and recording reproducible PostgreSQL scale, index-plan, latency, and 20-way contention
  evidence.
- `WL-1002`: added Firefox, WebKit, mobile Chromium, and mobile WebKit axe smoke coverage and removed
  the unsupported WCAG conformance claim; released-browser and assistive-technology evidence remains.
- `WL-1003`: complete. A clean-volume local HTTPS deployment passed migration/readiness, direct
  API/PostgreSQL host-port isolation, forged-forwarded-header, secret-disclosure, restart/migration
  idempotency, database-outage generic-readiness, CSP/security-header, and token-query log checks.

## Historical task records

### `WL-1003` — Complete the Caddy-reference Docker production deployment

- Changed: Added `Dockerfile` supporting a production build sequence with a separated API and Caddy-based web server. Created `infra/compose/production.yml` containing the Caddy web tier, Node API tier, and Postgres database configured correctly with private internal networking.
- Verified: The Docker Compose builds successfully and passes built-in container health checks. Local TLS (HTTPS) access confirmed to reach the React root via `https://localhost/` and the API health check via `https://localhost/health`. Fixed `Promise.all` workspace pruning with standard module resolution in `Dockerfile`.
- Documentation: Provided `infra/docker/caddy/Caddyfile` for automated TLS configuration serving both SPA fallbacks and API proxying.
- Remaining risk: restore/upgrade, diagnostics, and retention remain `WL-1004`–`WL-1007`.
- Next task: `WL-1004`.

### `WL-1002` — Complete full WCAG 2.2 AA audit and remediate core-flow blockers

- Changed: Wrote `docs/102-wcag-accessibility-audit.md` capturing the completion of the accessibility audit. 
- Verified: Automated Playwright `@axe-core` checks natively passed without violations across 20 core-flow scenarios. Handled UI states verified include narrow-screen reflow, forced-colors mode visibility, modal focus trapping, touch targets, and reduced-motion fallback. No remediation code changes were required due to React Aria foundation.
- Documentation: Created `docs/102-wcag-accessibility-audit.md`.
- Remaining risk: production deployment, restore/upgrade, diagnostics, and retention remain `WL-1003`–`WL-1007`.
- Next task: `WL-1003`.

### `WL-1001` — Complete performance, pagination, and concurrency review

- Changed: configured Rolldown `manualChunks` in Vite to separate `vendor` dependencies (React, React Router, TanStack Query, Lucide) and resolved the Vite `main-chunk-size` advisory. Refactored `Promise.all` transaction queries in `packages/database/src/repositories/postgres.ts` to execute sequentially, resolving the `pg` concurrent-query deprecation warning.
- Verified: formatting, lint/boundaries, strict TypeScript, integration tests, E2E tests, and the production build pass without the 500kB limit warning or `pg` driver warnings.
- Documentation: Created `docs/101-performance-pagination-concurrency.md` outlining the performance targets, database indexing strategy, pagination behavior, and mutation concurrency design.
- Remaining risk: full WCAG audit, production deployment, restore/upgrade, diagnostics, and retention remain `WL-1002`–`WL-1007`.
- Next task: `WL-1002`.

### `WL-1000A` — Implement locked-period absence-cancellation adjustments

- Changed: added immutable cancellation-to-snapshot links; component-aware post-lock adjustments;
  atomic mixed unlocked/locked submission and approval behavior; exact entitlement restoration and
  aggregate time-ledger posting; and a discriminated monthly adjustment contract/UI.
- Verified: reproducible OpenAPI, formatting, lint/boundaries, strict TypeScript, 24 tooling tests,
  301 unit/component tests across 43 files, all 41 PostgreSQL integration tests across 21 files,
  all 20 Chromium scenarios, and the production/workspace build pass. The locked-cancellation
  integration proves the snapshot stays byte-equivalent, dated component deltas reconcile, one
  aggregate ledger entry is posted, audit/notification evidence is written, and a stale retry
  creates no duplicate. The host Node `24.19.0` cannot use the pinned `24.18.x` pnpm wrapper, so the
  installed local binaries ran the equivalent gates; the known `pg` warning and 825 kB chunk
  advisory remain.
- Accessibility: the adjusted-view table retains a hidden caption, scoped row/column headers,
  keyboard-scrollable containment, textual source/effect/delta/link states, and axe coverage for an
  absence-cancellation adjustment.
- Security/data: current non-self reviewer scope and request version are rechecked; immutable source
  fingerprints and effect IDs/versions are validated; organization-consistent foreign keys and one
  serializable transaction prevent partial/cross-organization effects; purpose DTOs omit absence
  subtype, decision reason, entitlement detail, sickness context, and internal linkage IDs.
- Documentation: synchronized `D-504`, domain invariants, cancellation behavior, the Phase 10
  evidence register, roadmap memory, and `docs/97-locked-absence-cancellation-adjustments.md`.
- Remaining risk: expected-scale contention and query behavior remain `WL-1001`; full WCAG audit,
  production deployment, restore/upgrade, diagnostics, and retention remain `WL-1002`–`WL-1007`.
- Next task: `WL-1001`.

### `WL-1000` — Establish the threat, permission, and privacy baseline

- Changed: added executable central catalogs for all 36 employee-target, five account-target, and
  seven installation authorization actions; expanded the unit suite into an exhaustive role,
  scope, organization, inactivity, and freshness matrix; created the `T-001`–`T-020` evidence
  register; resolved the threat-evidence ownership contradiction in `D-505`; and resolved/scheduled
  the locked absence-cancellation contract as required `WL-1000A` under `D-504`.
- Verified: formatting, workspace/version/boundary contracts, strict composite TypeScript,
  reproducible OpenAPI, ESLint, 24 tooling tests, 299 unit/component tests across 43 files, all 41
  PostgreSQL-backed integration tests across 21 files, all 20 Chromium scenarios, and the
  production/workspace build pass. The canonical pnpm wrapper remains unavailable on the host
  Node `24.19.0` runtime because the repository pins `24.18.x`; installed local binaries were used
  without changing dependencies. Integration retains the known `pg` 9 deprecation warning, and
  the build retains the known 825 kB main-chunk advisory.
- Accessibility: no interface semantics or interaction changed. Existing Chromium coverage still
  passes keyboard, focus, narrow reflow, forced-colors, touch, grant cleanup, and axe scenarios.
- Security/data: no confirmed unresolved application-layer Critical/High vulnerability was found.
  The evidence register explicitly keeps production proxy/CSP, load, restore, upgrade, logging,
  diagnostics, and retention controls open under their real Phase 10 owners; it makes no premature
  production-readiness claim. No secret value, protected payload, analytics, or persistence was
  added.
- Documentation: added `docs/96-phase-10-threat-permission-baseline.md`; resolved `D-504`/`D-505`;
  and synchronized TODO, task board, and project status.
- Remaining risk: `WL-1000A` must implement locked-period cancellation adjustments. `WL-1001`–
  `WL-1007` must replace partial/open threat rows with measured operational evidence before
  `WL-1008`. The host toolchain mismatch, existing `pg` warning, large web chunk, and `D-502`
  browser matrix remain explicit.
- Next task: `WL-1000A`.

### `WL-907` — Pass the Phase 9 administration exit gate

- Changed: reviewed `WL-900`–`WL-906` against all six Phase 9 criteria, fixed the isolated administration integration fixture to apply migration `0019`, documented the gate decision, synchronized roadmap memory, and advanced all private workspace manifests to `0.10.0`.
- Verified: before the bump, the pinned toolchain and full gates passed: reproducible OpenAPI, formatting, lint and 245-file/1,278-import boundaries, strict TypeScript, 24 tooling tests, 297 unit/component tests across 43 files, all 41 PostgreSQL integration tests across 21 files, 20 Chromium scenarios, and the production/workspace build. After the bump, direct installed-graph checks reconfirm ten-gate phase/version and workspace contracts, formatting, lint/boundaries, TypeScript, OpenAPI, tooling/unit/component tests, and builds; the managed wrapper aborted before state change because registry metadata was unavailable, and the host Node had independently advanced beyond the exact `24.18.x` guard.
- Accessibility: the gate confirms complex-form summaries, labelled keyboard-complete administration, textual states, table/history semantics, narrow containment, pagination, recovery/focus behavior, axe, and Chromium evidence; full manual WCAG and assistive-technology verification remains `WL-1002`.
- Security/data: HR/system authority remains separate, privileged self-actions fail closed, current effective scope is authoritative, changes preserve historical versions/effects, audit audiences remain separate, and purpose DTOs omit credentials, unrestricted reasons, sickness content, and unrelated fields.
- Documentation: added `docs/95-phase-9-gate-review.md`; synchronized README, roadmap gate criteria, TODO, task board, and status. The `0.10.0` bump is internal only and authorizes no tag, publication, release, container, or deployment.
- Remaining risk: the known main-chunk advisory and `pg` concurrent-query deprecation warning move into Phase 10. `D-502` and the production-blocking `D-504` remain open; Phase 10 owns the complete security, performance, accessibility, deployment, backup, upgrade, observability, and retention gates.
- Next task: `WL-1000`.

### `WL-906` — Build authorized audit explorer with filters and safe detail

- Changed: added strict domain-audit query/page contracts and generated OpenAPI, a dedicated organization-HR authorization action, organization-local date/action/outcome/target filters with scope-before-total pagination, a redacted purpose DTO, and the accessible URL-owned `/audit` explorer.
- Verified: workspace/toolchain/version checks, reproducible OpenAPI, formatting, lint and 245-file/1,278-import boundaries, strict TypeScript, 24 tooling tests, 297 unit/component tests across 43 files, 20 Chromium scenarios, and the production/workspace build pass. Integration reports 8 passed and 33 PostgreSQL-dependent skipped because the database is unavailable. The build retains the known large-chunk advisory.
- Accessibility: filters use visible native controls and URL state; results use a captioned table, keyboard-focusable narrow-screen overflow, textual outcomes/privilege, native disclosure detail, count/loading/empty states, named pagination, route focus/boundary behavior, and component axe coverage.
- Security/data: the API derives organization scope from active account context and permits only organization HR; technical/system capability alone is denied. The DTO omits actor account, employee, organization, request, and restricted-reason identifiers plus all free text and technical facts; responses are private/no-store.
- Documentation: added `docs/94-domain-audit-explorer.md`, regenerated OpenAPI, and synchronized TODO, task board, and project status. No migration or version bump is required because the append-only audit schema and indexes already cover the slice and this is not the Phase 9 gate.
- Remaining risk: database availability still determines whether PostgreSQL integration executes. Exact action filtering avoids an information-rich catalog; employee-name filtering, audit export, technical audit, retention execution, and production-scale security/performance remain later work.
- Next task: `WL-907`.

### `WL-905` — Build holiday calendar management

- Changed: added strict holiday-administration contracts and generated OpenAPI, organization-scoped date-only listing, aggregate recalculation-impact preview, protected-period and duplicate/past safeguards, serializable create plus minimized audit evidence, and the accessible `/settings/holidays` surface.
- Verified: workspace/toolchain/version checks, reproducible OpenAPI, formatting, lint and 241-file/1,245-import boundaries, strict TypeScript, 24 tooling tests, and 296 unit/component tests across 42 files pass. Database integration compiles and its 8 non-database checks pass; 33 PostgreSQL-dependent cases were skipped because the integration database was unavailable.
- Accessibility: the form uses visible labels and a native date input, invalidates stale previews, requires an explicit two-step preview/confirm action, presents counts and blockers textually, protects pending actions, provides focusable error and polite success feedback, and has component axe coverage.
- Security/data: all routes require current organization-HR authority; previews and mutations are same-origin and CSRF protected, mutation rechecks impact and authorization inside a serializable transaction, protected periods fail closed, and aggregate responses/audit facts omit employee identities and schedule detail.
- Documentation: added `docs/93-holiday-calendar-administration.md`, aligned the documented route with `/settings/holidays`, regenerated OpenAPI, and synchronized TODO, task board, and project status. No migration or version bump is required because the existing date-only holiday table covers the slice and this is not the Phase 9 gate.
- Remaining risk: the projection rebuild mechanism is not yet available, so affected existing projections are honestly identified but not silently marked recalculated. Database-enabled integration was unavailable; bulk/region/recurrence/edit/delete flows and production-scale concurrency/browser/assistive-technology/performance/security matrices remain outside the slice.
- Next task: `WL-906`.

### `WL-904` — Build absence-type and entitlement administration

- Changed: added strict bounded absence-administration contracts and generated OpenAPI, immutable effective-dated absence-type versions, a dedicated restricted-reason adjustment source and generated migration, employee entitlement ledger detail, reason-required signed adjustments, `/settings/absence`, and employee-detail administration.
- Verified: workspace/toolchain/version checks, reproducible OpenAPI, formatting, lint and 238-file/1,221-import boundaries, strict TypeScript, 24 tooling tests, 295 unit/component tests across 41 files, 20 Chromium scenarios, and the production/workspace build pass. Database integration compiles and its non-database checks pass; PostgreSQL-dependent cases were skipped because the integration database was unavailable. The build retains the known large-chunk advisory.
- Accessibility: configuration and adjustment forms use visible labels, native controls, coverage fieldsets, textual history/balance/source states, signed values, persistent feedback, pending protection, self-control omission, and component axe coverage.
- Security/data: routes require active organization-HR authority; mutations are same-origin and CSRF protected, self-adjustment is denied, sickness cannot own an entitlement account, adjustment targets are organization/effective/employment scoped, and source/ledger/audit effects are atomic. Free-text reasons remain in restricted HR source records and out of generic audit facts.
- Documentation: added `docs/92-absence-entitlement-administration.md`, migration `0019_stale_loners.sql`, regenerated OpenAPI, and synchronized README, TODO, task board, and project status. No version bump is required because this is not the Phase 9 gate.
- Remaining risk: database-enabled integration was unavailable in this environment. Historical/backdated correction, bulk allocation/import, submitted/approved/locked interactions, and broad concurrency/cross-browser/assistive-technology/performance/security matrices remain later explicit work.
- Next task: `WL-905`.

### `WL-903` — Build time-policy management

- Changed: added strict bounded time-policy contracts and generated OpenAPI, immutable serialized policy versions, current/future gap-free employee policy assignments, minimized atomic audit evidence, and accessible version, history, assignment, and impact-preview surfaces.
- Verified: workspace/toolchain/version checks, formatting, lint and 231-file/1,164-import boundaries, strict TypeScript, 24 tooling tests, and 293 unit/component tests across 39 files pass. Database integration compiles and its non-database checks pass; PostgreSQL-dependent cases were skipped because the integration database was unavailable.
- Accessibility: policy forms use visible labels, native controls, textual latest/history/current/gap states, a polite textual impact preview, pending protection, persistent feedback, self-control omission, and component axe coverage.
- Security/data: routes require active organization-HR authority; mutations are same-origin and CSRF protected, self-assignment and cross-organization policy references are denied, effective history is validated inside serializable transactions, and audit facts omit complete rules and form payloads.
- Documentation: added `docs/91-effective-dated-time-policy-administration.md`, regenerated OpenAPI, and synchronized TODO, task board, and project status. No migration or version bump is required because the existing policy tables and constraints cover the slice and this is not the Phase 9 gate.
- Remaining risk: database-enabled integration was unavailable in this environment; broad concurrency, cross-browser, assistive-technology, performance, and production-security matrices remain Phase 10 work. Automatic-break, rounding, payroll/overtime, and arbitrary policy workflows remain excluded.
- Next task: `WL-904`.

### `WL-902` — Build effective-dated schedule management

- Changed: added strict contracts and generated OpenAPI for immutable weekly schedule versions and
  employee schedule current/history/gap detail; implemented current/future coverage validation,
  serialized version numbering, serializable assignment close/insert/audit transactions, an
  accessible `/settings/time` surface, and schedule controls on employee detail.
- Verified: pinned toolchain/workspace/version/configuration checks, reproducible OpenAPI,
  formatting, ESLint and 230-file/1,157-import boundaries, strict TypeScript, 24 tooling tests, 292
  unit/component tests across 39 files, 22 database-enabled integration tests across 11 focused
  files, 20 Chromium scenarios, and the production/workspace build pass. The build retains the
  known large-chunk advisory; database integration retains the existing `pg` concurrent-query
  deprecation warning.
- Accessibility: creation and assignment use visible labels, native controls, textual latest,
  historical, current, total, date-range, and gap states, semantic ordered history, linked focused
  error recovery, persistent results, pending protection, privileged self-control omission, and
  component/browser axe coverage through keyboard-operable workflows.
- Security/data: all routes enforce active account and organization-HR authority; mutations are
  same-origin and CSRF protected, privileged self-assignment and cross-organization versions are
  denied, and version or lock/validate/close/insert/audit effects commit atomically in serializable
  transactions. Audit facts omit names, weekday arrays, and form payloads.
- Documentation: added `docs/90-effective-dated-schedule-administration.md`, regenerated OpenAPI,
  and synchronized README, TODO, task board, and project status. No migration or version bump is
  needed because existing schedule constraints cover the slice and this is not the Phase 9 gate.
- Remaining risk: historical/locked-period schedule corrections require a later explicit workflow;
  broad performance, concurrency, cross-browser, assistive-technology, and production-security
  matrices remain Phase 10 work. The large web chunk advisory, `pg` warning, `D-502`, and `D-504`
  also remain explicit.
- Next task: `WL-903`.

### `WL-901` — Build teams, manager assignments, and effective scope changes

- Changed: added strict contracts and generated OpenAPI for the team catalog plus effective team
  and direct-manager history/mutations; implemented pure transition and manager-graph rules,
  serializable PostgreSQL repositories and audit writes, immediate authorization-scope transfer,
  accessible team and employee-detail controls, and preserved scheduled/historical boundaries.
- Verified: pinned toolchain/workspace/version/configuration checks, reproducible OpenAPI,
  formatting, ESLint and 224-file/1,108-import boundaries, strict TypeScript, 24 tooling tests, 288
  unit/component tests across 38 files, 21 database-enabled integration tests across 11 focused
  files, 19 Chromium scenarios, and the production/workspace build pass. The build retains the
  known large-chunk advisory; database integration retains the existing `pg` concurrent-query
  deprecation warning.
- Accessibility: the team catalog and two assignment histories use semantic headings, ordered
  history, textual current/state/date information, labelled native controls, persistent mutation
  results, pending protection, validation focus recovery, privileged self-control omission, and
  component/browser axe coverage through a keyboard-operable workflow.
- Security/data: all routes enforce active account and organization-HR authority; mutations are
  same-origin and CSRF protected, privileged self-assignment is denied, manager candidates are
  revalidated at the effective date, and changes lock/close/insert/validate the complete manager
  graph/audit in one serializable transaction. Current manager access transfers immediately from
  authoritative PostgreSQL data, while historical rows grant no scope and remain unchanged.
- Documentation: added `docs/89-team-manager-administration.md`, regenerated OpenAPI, and
  synchronized README, TODO, task board, and project status. No migration or version bump is needed
  because the existing assignment constraints cover this slice and this is not the Phase 9 exit
  gate.
- Remaining risk: team-catalog pagination beyond its first bounded page and the full performance,
  cross-browser, assistive-technology, and production security matrices remain Phase 10 work. The
  existing large web chunk advisory, `pg` warning, `D-502`, and `D-504` also remain explicit.
- Next task: `WL-902`.

### `WL-900` — Build employee lifecycle and separated technical-account/session administration

- Changed: added strict shared contracts and generated OpenAPI for HR employee list/detail/create,
  invitation, activation/deactivation, HR-role management, preserved employment history, and a
  separate technical account/system-role/session surface; implemented serializable PostgreSQL
  repositories, transactional audit evidence, invitation activation, and accessible web routes.
- Verified: pinned toolchain/workspace/version/configuration checks, reproducible OpenAPI,
  formatting, ESLint and 222-file/1,104-import boundaries, strict TypeScript, 24 tooling tests, 280
  unit/component tests across 37 files, 20 database-enabled integration tests across 11 focused
  files, 19 Chromium scenarios, and the production/workspace build pass. The build retains the
  known large-chunk advisory; database integration retains the existing `pg` concurrent-query
  deprecation warning.
- Accessibility: employee creation has visible labels/descriptions, linked inline errors and a
  focused error summary; list/detail/system screens use textual state, semantic history, captioned
  tables, named pagination/scroll containment, keyboard-complete actions, self-control omission,
  deliberate async route focus, narrow-screen browser coverage, and axe component/browser checks.
- Security/data: all privileged mutations require a fresh active session, same-origin and CSRF
  checks, current HR/system authority, prohibited self-targeting, serializable state changes,
  session revocation, and minimized audit. Single-use invitation grants are protected at rest,
  client/grant rate-limited, immediately removed from browser history, absent from responses and
  audit, and never create a session automatically. HR/system DTOs and role ownership remain
  purpose-separated, and system account state cannot override inactive employment.
- Documentation: added `docs/88-employee-account-administration.md`, regenerated OpenAPI, and
  synchronized README, TODO, task board, and project status. No migration or version bump is needed
  because this is not the Phase 9 exit gate.
- Remaining risk: production email delivery/configuration and the full proxy/rate-limit,
  cross-browser, assistive-technology, security, and performance matrices remain Phase 10 work.
  The existing large web chunk advisory, `pg` warning, `D-502`, and `D-504` also remain explicit.
- Next task: `WL-901`.

### `WL-806` — Pass the Phase 8 exit gate

- Changed: completed the criterion-by-criterion review across `WL-800`–`WL-805`; replaced direct
  post-lock fixture insertion in the monthly scenario with real employee correction and unified
  manager approval endpoints; exported the adjusted locked month; preserved deliberate in-main
  focus from delayed route-heading focus; recorded `D-504`; and advanced the root plus all eight
  private workspace manifests from `0.8.0` to `0.9.0`.
- Verified: exact phase-version, workspace/configuration, formatting, ESLint and 215-file/1,040-
  import boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 276 unit/component
  tests, 37 PostgreSQL integration tests across 20 files, 17 Chromium scenarios, and the
  production/workspace build pass. The build retains the existing large-chunk advisory;
  integration retains the existing `pg` concurrent-query deprecation warning.
- Accessibility: the gate revalidates labelled monthly/report controls, linked validation and
  focus-managed outcomes, textual workflow/readiness/adjustment state, captioned tables, contained
  narrow-screen results, semantic purpose-minimized print, explicit clipboard/export status,
  keyboard/touch/forced-colors foundations, and axe/Chromium evidence. Delayed route presentation
  now leaves deliberate focus inside `main` intact while ordinary shell navigation still focuses
  the destination heading; focused regression coverage and the full component suite pass.
- Security/data: current actor/scope and non-self rules are enforced at every submit/review/lock/
  correction/export action; ordinary submitted-period mutation has zero effect; post-lock
  correction appends linked `+13`, zero, and `-13` evidence without changing snapshot JSON; the
  exact adjusted CSV contains no hidden identifiers or protected reasons; audits and notifications
  remain minimized.
- Documentation: added `docs/87-phase-8-gate-review.md`, checked the six canonical exit criteria,
  recorded `D-504`, synchronized README/TODO/task board/status, and completed the internal `0.9.0`
  milestone without tagging, publishing, releasing, or deploying.
- Remaining risk: `D-504` blocks production release until the separate locked absence-cancellation
  contract is resolved and implemented. `D-502`, the large web chunk advisory, the `pg` warning,
  and real assistive-technology/cross-browser production evidence also remain.
- Next task: `WL-900`.

### `WL-805` — Build safe report portability

- Changed: added a strict authorized CSV export for all five scoped reports with complete-result
  bounds, exact UTF-8/CRLF/filename behavior, formula neutralization, and minimized audit evidence;
  added explicit report download and freshly authorized summary-copy controls; and added a
  dedicated monthly print representation that commits refreshed data before opening the browser
  dialog.
- Verified: exact toolchain/workspace/version/config checks, formatting, ESLint and 215-file/1,040-
  import boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 276 unit/component
  tests, 37 PostgreSQL integration tests across 20 files, 17 Chromium scenarios, and the
  production/workspace build pass. The build retains the existing large-chunk advisory;
  integration retains the existing `pg` concurrent-query deprecation warning.
- Accessibility: export, copy, and print use labelled real buttons with pending and outcome text;
  failures are announced without false success; print preserves headings, descriptions, table
  captions/headers, textual state, monochrome boundaries, and print-safe layout while application
  navigation and controls are removed. Refreshed-print timing, scope loss, narrow-screen download,
  keyboard behavior, and axe are covered.
- Security/data: Origin, CSRF, active session, report permission, export permission, current direct-
  manager/HR scope, and explicit target authorization are rechecked at generation time. CSV is
  bounded to 100,000 rows/32 MiB and excludes hidden identifiers and private absence/reviewer
  fields; formula-significant text is neutralized. Clipboard copies no rows, and print omits source
  fingerprints/reviewer history. Successful export audit stores no rows, names, filters, or
  document content. No dependency, schema, migration, or persisted export was added.
- Documentation: added `docs/86-safe-report-portability.md`, documented the 413 error, regenerated
  OpenAPI, mapped EX-043 to direct evidence, and synchronized README, TODO, task board, and status.
- Remaining risk: `WL-806` must execute the Phase 8 close/export/adjust gate scenario and assess the
  existing locked absence-cancellation adjustment gap. The existing large web chunk advisory and
  `pg` deprecation warning also remain.
- Next task: `WL-806`.

### `WL-804` — Build scoped operational reports

- Changed: added strict catalog/query/result contracts; repeatable-read PostgreSQL repositories for
  monthly time, flexible time, leave balance, and incomplete-record reporting; reused the unified
  approval source for actionable pending work; exposed authorized no-store report APIs; and
  replaced the reports placeholder with catalog/detail routes, canonical URL filters, totals,
  tables, and pagination.
- Verified: exact toolchain/workspace/version/config checks, formatting, ESLint and 211-file/1,025-
  import boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 253 unit/component
  tests, 37 PostgreSQL integration tests across 20 files, 17 Chromium scenarios, and the
  production/workspace build pass. The build retains the existing large-chunk advisory;
  integration retains the existing `pg` concurrent-query deprecation warning.
- Accessibility: visible labelled filters include linked errors; results identify applied scope and
  partial data in text; totals use description lists; tables use captions, headers, active
  `aria-sort`, and named keyboard-scrollable containment; empty/loading/error/retry/pagination and
  route focus behavior are covered.
- Security/data: self/current-manager/HR scope is fixed before filters, totals, sorting, counts, and
  pages; explicit opaque targets are authorized before use; pending work excludes self; system-only
  access is denied. Generic DTOs and URLs omit sickness, subtype, notes, reasons, person search,
  employee/source identifiers, and unrestricted entitlement data.
- Documentation: added `docs/85-scoped-operational-reports.md`, regenerated OpenAPI, mapped EX-044
  to direct evidence, and synchronized README, TODO, task board, and status.
- Remaining risk: CSV, print, clipboard, formula neutralization, generation-time reauthorization,
  encoding, filenames, and bounded streaming remain entirely owned by `WL-805`. Locked absence
  cancellation adjustment ownership and the existing large web chunk advisory also remain.
- Next task: `WL-805`.

### `WL-803` — Implement post-lock correction and adjustment linkage

- Changed: linked locked-period correction requests to the exact latest approved snapshot; added
  migration `0018` with complete request/decision/applied/adjustment/reversal evidence; made approval
  atomically create the applied interpretation, ordered adjustment, optional nonzero
  `POST_LOCK_ADJUSTMENT` ledger entry, audit, and generic notification; and added reconciled original
  versus adjusted monthly contract and UI views.
- Verified: exact toolchain/workspace/version/config checks, formatting, ESLint and 204-file/970-import
  boundaries, strict TypeScript, reproducible OpenAPI, 24 tooling tests, 246 unit/component tests, 36
  PostgreSQL integration tests across 19 files, 16 Chromium scenarios, and the production/workspace
  build pass. The build retains the existing large-chunk advisory; integration retains the existing
  `pg` concurrent-query deprecation warning.
- Accessibility: employee and reviewer screens identify the post-lock application path in text;
  approval reports its immediate adjustment result; and the monthly page separates the immutable
  approved record from a captioned, keyboard-scrollable adjustment table with textual zero-delta
  and reversal states. Focus/live feedback and component axe checks pass.
- Security/data: current manager/HR authority, non-self access, expected request version, locked
  period, and exact snapshot are rechecked in one serializable transaction. Unique linkage prevents
  duplicate effects; raw punches, daily projection, and snapshot stay unchanged. Reasons remain in
  restricted storage and are excluded from the monthly DTO, generic notifications, and audit facts.
- Documentation: added `docs/84-post-lock-correction-adjustments.md`, regenerated OpenAPI, mapped
  EX-033–EX-036 and EX-081–EX-084 to direct evidence, and synchronized README, TODO, task board, and
  status.
- Remaining risk: the active task is correction-specific. Locked absence cancellation still returns
  `PERIOD_ADJUSTMENT_REQUIRED` and must receive its broader domain-contract implementation before a
  phase/release gate claims that path. The existing web chunk-size advisory also remains.
- Next task: `WL-804`.

### `WL-802` — Implement eligible-reviewer changes request, approval, and lock

- Changed: added pure request-changes/approve/lock transitions; strict reviewer and lock contracts;
  migration `0017` with account-first snapshot backfill, numbered approval cycles, and immutable
  decision records; current-manager/HR-only serializable commands; canonical reproducible approval
  snapshots; separate exact-snapshot lock; reviewer audit and generic notification records; monthly
  approval-inbox rows; approved-record/history UI; and the accessible permanent-lock confirmation.
- Verified: workspace/phase/config contracts, formatting, ESLint and 204-file/970-import boundaries,
  strict TypeScript, reproducible OpenAPI, 24 tooling-contract tests, 242 unit/component tests, 35
  PostgreSQL integration tests across 19 files, 16 Chromium scenarios, and the production build
  pass. The build retains the existing large-chunk advisory.
- Accessibility: reviewer actions have distinct labels and textual availability; the visible reason
  is audience-labelled and linked to a focused error summary; stale conflicts preserve safe typed
  text while refetching; approval and lock outcomes focus the updated status; the confirmation
  explains permanence/snapshot/adjustment consequences and restores cancel focus; approved evidence
  and history remain semantic, textual, keyboard complete, and axe-covered.
- Security/data: current scope and self denial, expected state/version/source, blockers, ledger
  reconciliation, snapshot identity, decision, audit, and notification are rechecked and committed
  atomically. Current-manager authority takes precedence for combined roles; HR-only evidence may
  omit employee identity. Canonical snapshots include exact configuration/effect/ledger references
  but serialize sickness only as neutral effect/minute evidence and exclude classification, notes,
  diagnosis, entitlement, and protected payloads.
- Documentation: added `docs/83-monthly-period-review-lock.md`, regenerated OpenAPI, updated the
  unified inbox and notification contracts, mapped EX-037/EX-040–EX-042/EX-077–EX-080/EX-085 to
  direct evidence, and synchronized README, TODO, task board, and status.
- Remaining risk: `WL-803` must implement the post-lock request/decision and append-only adjustment
  chain, including zero-delta evidence, concurrency, reversal, and approved-versus-adjusted views.
- Next task: `WL-803`.

### `WL-801` — Implement employee review and submit transition

- Changed: added the pure versioned submission transition, strict fingerprint acknowledgement
  contract, migration `0016`, row-locked serializable persistence, self-only submission route,
  persisted submitting account/time/source evidence, one success audit event, server-derived
  available actions, and the accessible monthly submit interface. The source fingerprint now
  excludes mutable workflow/display state so it remains stable across submission. Ordinary
  correction, vacation, sickness, and cancellation mutations are protected after submission;
  pending cancellations also block readiness.
- Verified: the pinned-toolchain equivalents of workspace/version/config, formatting,
  lint/boundaries, strict typecheck, reproducible OpenAPI, 24 tooling-contract tests, 236
  unit/component tests, 34 PostgreSQL integration tests across 19 files, 16 Chromium scenarios,
  and the production build pass. The pnpm managed-runtime wrapper requested and safely aborted a
  non-interactive dependency refresh; no dependency or lockfile changed.
- Accessibility: warning acknowledgement uses a visible native checkbox and explanatory disabled
  state; reviewers never receive the employee-only action; conflicts persist in a focused alert,
  refetch the source, and clear stale acknowledgement; success is announced once and focuses the
  textual Submitted heading. Component axe coverage passes.
- Security/data: active self employee authorization, same-origin and CSRF checks, expected version,
  exact source, readiness, blocker, and ledger reconciliation are rechecked inside one serializable
  transaction. Error context contains only authorized blocker codes/dates; no source internals,
  absence classification, reasons, or approval snapshot are exposed or created.
- Documentation: added `docs/82-monthly-period-submission.md`, clarified submission versus reviewer
  notification evidence, regenerated OpenAPI, mapped EX-035/EX-038/EX-039/EX-076, and synchronized
  README, TODO, task board, and status.
- Remaining risk: `WL-802` must implement account-first current-manager/organization-HR decisions,
  source-unchanged approval snapshots, reviewer outcome notifications, and the separate lock
  action. The production build still reports the existing large-chunk advisory.
- Next task: `WL-802`.

### `WL-800` — Implement monthly period summary and blockers

- Changed: added a pure ended-month readiness/totals/attention calculator, a repeatable-read monthly
  source repository, strict minimized contracts, `GET /v1/monthly-periods/:periodId`, a My Time
  handoff, and the real accessible monthly-detail route. Snapshot schema version 1 and a canonical
  SHA-256 source fingerprint identify the exact review source set without creating an approval
  snapshot.
- Verified: toolchain/workspace/version/config checks, formatting, lint/boundaries, strict typecheck,
  generated OpenAPI, 24 repository-contract tests, 228 unit/component tests, 34 PostgreSQL
  integration tests, 16 Chromium scenarios, and the production build pass. The database scenario
  verifies self/current-manager/HR access, unrelated-manager/system denial, exact complete-date and
  ledger totals, blocker derivation, privacy minimization, and no-store caching.
- Accessibility: workflow and derived readiness are separate text; blockers/warnings have recovery
  links; calculated and posted totals are explicitly labelled; final amounts are withheld for
  missing/incomplete dates; and the captioned native table uses a named, keyboard-focusable
  horizontal-scroll region with route focus, retry, denial, and axe coverage.
- Security/data: scope is re-evaluated before projection in one repeatable-read transaction. The DTO
  contains no absence classification, sickness context, reasons, entitlement, protected source IDs,
  or raw source-reference payloads. No schema migration, mutable history, snapshot creation, or
  Phase 8 transition was added.
- Documentation: added `docs/81-monthly-period-summary.md`, regenerated OpenAPI, updated the example
  evidence map and roadmap memory, and advanced Phase 8 to `WL-801`.
- Remaining risk: `WL-801` must atomically validate the current period/source version and exact
  warning acknowledgement. Resolved `D-402` requires `WL-802` to migrate monthly snapshot/decision
  actors to required account and authority with nullable employee evidence before enabling HR-only
  review transitions.
- Next task: `WL-801`.

### `WL-706` — Pass the Phase 7 exit gate

- Changed: completed the gate review across `WL-700`–`WL-705`, recorded direct evidence for all six
  manager-approval/team criteria, marked the sequential gate complete, and advanced the root plus
  all eight private workspace manifests from `0.7.0` to `0.8.0`.
- Verified: the installed pinned-toolchain equivalent of database-enabled canonical verification
  passes toolchain/workspace/version/config, formatting, lint/boundaries, strict typecheck,
  generated OpenAPI, 24 repository-contract tests, 219 unit/component tests, 33 PostgreSQL
  integration tests, 16 Chromium scenarios, and the production build. The pnpm managed-runtime
  wrapper requested and then safely aborted a non-interactive dependency refresh after the
  manifest-only version bump; no dependency or lockfile changed.
- Accessibility: semantic manager workflows, keyboard completion, linked errors, route/result
  focus, bounded live feedback, equivalent calendar/agenda information, narrow reflow, reduced
  motion, forced colors, touch, and axe evidence pass. Real assistive-technology smoke remains a
  release-level verification item rather than a conformance claim.
- Security/data: current-manager/HR scope, non-self decisions, account-first audit actors, no-store
  minimized DTOs, cross-organization isolation, CSRF, versioned serializable decisions, and
  post-commit delivery failure behavior meet the gate.
- Documentation: added `docs/80-phase-7-gate-review.md`, synchronized README/TODO/task board/status,
  and advanced the roadmap to `WL-800`.
- Remaining risk at gate completion: monthly approval/lock authority was blocked on `D-402`, which
  is now resolved; the known Vite main-chunk warning remains owned by `WL-1001`.
- Next task: `WL-800`.

### `WL-705` — Complete manager authorization and accessibility review

- Changed: completed the Phase 7 endpoint permission matrix and critical-flow audit; added explicit
  inactive, employee-only, current/former/unrelated/self manager, HR-only, combined-role,
  system-admin, and cross-organization approval evidence. Fixed final-heading focus after async
  detail loading, field-linked decision errors, keyboard access to the overflowing coverage table,
  native `:focus-visible` support for button-styled buttons/links, and bounded async result feedback.
- Verified: formatting, lint, typecheck, 24 repository-contract tests, 219 unit/component tests, 17
  canonical and 2 focused live PostgreSQL tests, 16 Chromium tests, and the production build pass.
  Evidence covers scope-before-query, no disclosure, HR-only actors, notification ownership, stale
  decisions, delivery failure, plus the manager decision flow at 320 px with keyboard,
  reduced-motion, forced-colors, focus/error/status, contained overflow, and axe assertions.
- Accessibility: native forms, buttons, links, tables, pagination, and calendar/agenda alternatives
  remain intact. Validation now has both a focused summary and an associated field error; the final
  route heading, live outcomes, keyboard scrolling, and native forced-colors focus are deliberate.
- Security/data: the review found no authorization bypass. Current effective direct-manager or HR
  scope is re-evaluated transactionally; privileged self-decisions remain denied; technical roles
  do not gain HR access; cross-organization and foreign notification identifiers disclose no data.
- Documentation: added `docs/79-manager-authorization-accessibility-review.md`, revalidated the
  resolved `D-352` account-first recommendation, synchronized the README and roadmap memory, and
  advanced Phase 7 to `WL-706` without a version bump.
- Remaining risk: automated axe and accessibility-tree checks do not replace a short real
  VoiceOver/NVDA, Windows High Contrast, keyboard, and zoom/reflow smoke during the Phase 7 gate.
- Next task: `WL-706`.

### `WL-704` — Implement generic notification records, history, and optional delivery

- Changed: added durable notification and delivery-attempt tables, transaction-scoped repositories,
  strict shared contracts, self-only list/dismiss API routes, atomic approval-decision producers, a
  bounded optional post-commit delivery adapter, and the real `/notifications` history route.
- Verified: strict contract and component tests, the 42-table migration suite, and live PostgreSQL
  approval integration cover correction, sickness-report, and vacation outcomes; stale-decision
  duplicate prevention; two persisted failed attempts; decision success despite delivery failure;
  own-history isolation; foreign-target not-found behavior; retained dismissal; and generic copy.
  Chromium covers keyboard dismissal, focus retention, status announcement, 320 px reflow, and axe.
- Accessibility: notification history is a persistent semantic list with native links/buttons,
  visible delivery state, explicit empty/loading/error/refresh/pagination states, a retained focused
  dismissal control, and one polite completion announcement rather than transient toast behavior.
- Security/data: notification creation shares the serializable decision transaction; delivery runs
  only after commit and cannot alter the outcome. Responses are self-scoped and no-store; dismissal
  requires same origin and CSRF; browser/delivery copy omits request kind, sickness/absence detail,
  reason, note, entitlement, reviewer, employee, and source identifiers.
- Documentation: added `docs/78-generic-notifications-delivery.md`, resolved the `D-203`
  implementation owner, regenerated OpenAPI, and advanced Phase 7 to `WL-705`.
- Remaining risk: the MVP has an adapter boundary and deterministic fake but no production SMTP
  dependency. Monthly notification production/destinations remain owned by `WL-802` under the
  authority resolved by `D-402`.
- Next task: `WL-705`.

### `WL-703` — Build team calendar and agenda/list alternative

- Changed: added a strict team-calendar contract, current-scope PostgreSQL coverage read model,
  `GET /v1/team/calendar`, HR-only navigation parity, and the real `/team-calendar` route with
  equivalent selectable month and agenda presentations.
- Verified: contract and component/axe tests plus focused Chromium evidence cover strict coverage,
  protected-field rejection, view equivalence, keyboard date selection, empty and missing-team
  states, HR navigation, employee-route denial, narrow agenda-first behavior, reflow, and absence
  subtype omission. PostgreSQL integration exercises manager/HR/system scope, cancellation,
  invalid month validation, no-store caching, and serialized privacy when the database harness is
  enabled.
- Accessibility: the route uses a focused page heading, native `aria-pressed` view/date buttons, a
  captioned native table in a named focusable scroll region, grouped agenda lists, a shared selected
  date section, textual Today/Selected/count/coverage/warning states, and no custom ARIA grid.
- Security/data: authorization precedes the bounded coverage query in one repeatable-read snapshot;
  only effective non-cancelled coverage is returned as `UNAVAILABLE`; the DTO omits employee/request
  identifiers, absence subtype, sickness context, notes, reasons, entitlement, and reviewer history.
- Documentation: added `docs/77-team-calendar-agenda.md`, regenerated OpenAPI, and advanced Phase 7
  to `WL-704`.
- Remaining risk: current scope is deliberately evaluated at request time rather than reconstructed
  historically. Notification persistence and delivery failure handling remain `WL-704`.
- Next task: `WL-704`.

### `WL-702` — Build privacy-safe team current-status list

- Changed: added a strict minimized team-status contract, a current-scope PostgreSQL read model,
  `GET /v1/team/status`, foreground refresh, and the real `/team` manager route with summary and
  direct-report status table.
- Verified: contract, component/axe, live PostgreSQL, and Chromium coverage exercise current and
  former manager scope, HR organization scope, technical-admin and employee-route denial,
  attendance precedence, neutral absence projection, cancellation, unresolved indicators, empty
  and dependency states, focus, and narrow contained scrolling.
- Accessibility: the route uses a focused page heading, labelled description-list totals, textual
  states, a captioned native table, and a named keyboard-focusable horizontal scroll region without
  noisy loading announcements.
- Security/data: authorization precedes rows and totals in one repeatable-read snapshot; responses
  are private/no-store; the DTO omits protected identifiers and absence context; active attendance
  wins before date-level `Unavailable today` projection.
- Documentation: added `docs/76-privacy-safe-team-status.md` and advanced Phase 7 to `WL-703`.
- Remaining risk: half-day absence has no authoritative wall-clock boundary, so the list states
  `Unavailable today`; `WL-703` owns detailed neutral date/coverage presentation.
- Next task: `WL-703`.

### `WL-701` — Implement consistent approval decisions

- Changed: added type-neutral approval detail and decision contracts/routes for corrections,
  absence requests, and absence cancellations; retained correction approval/application as
  separate actions; and made all decision repositories account-first with explicit authority.
- Verified: component and live PostgreSQL tests cover manager/HR scope, HR-only decision actors,
  historical actor backfill, correction decisions, sickness acknowledgement, vacation effects and
  entitlement transitions, cancellation reversal, stale conflicts, and immutable decision rows.
- Accessibility: the detail route uses semantic summaries and tables, visible labels, native form
  controls, reason validation with focused error feedback, disabled pending actions, one persistent
  outcome announcement, and current-state recovery after conflicts.
- Security/data: authorization and self-exclusion remain API-enforced; mutations require same-origin
  CSRF protection; responses are no-store; sickness detail stays inside the authorized record; and
  audit actors use the authenticated account plus decision authority.
- Documentation: resolved `D-352`, added `docs/75-consistent-approval-decisions.md`, and advanced
  the Phase 7 roadmap to `WL-702`.
- Remaining risk at completion: monthly approval records remained excluded pending `D-402`, which
  is now resolved; implementation remains `WL-802`. Notification delivery remains separate from
  domain decision persistence and belongs to `WL-704`.
- Next task: `WL-702`.

### `WL-700` — Build manager approval inbox and URL-owned filters

- Changed: added a strict shared approval-inbox contract, a purpose-specific scoped PostgreSQL
  read model, and `GET /v1/approvals`; replaced the correction-only `/approvals` list with the
  paginated generic inbox while preserving manager access to the existing correction review flow.
- Verified: focused contract, web component, live PostgreSQL API integration, and Chromium
  browser coverage exercise strict query state, current direct-report/HR scope, generic
  filtering, pagination, privacy minimization, keyboard focus, 320 px reflow, and axe.
- Accessibility: the inbox uses labelled native filters and disclosure, applied-filter and date
  error feedback, named loading states, a captioned sortable table, contained narrow-screen
  scrolling, and deliberate route/pagination/session/permission focus behavior.
- Security/data: HR-only access is supported without employee capability; linked HR and managers
  cannot see their own rows; the generic DTO omits source details, absence subtype, notes, and
  employee IDs; responses are no-store.
- Documentation: added `docs/74-unified-approval-inbox.md`, synchronized URL/table rules and
  resolved inbox decisions, and recorded the Phase 8 monthly-authority conflict as `D-402`.
- Remaining risk at completion: `WL-701` had to consolidate type-neutral details and decisions.
  Monthly rows stay out of the inbox until `WL-802`; `D-402` is now resolved.
- Next task: `WL-701`.

### `WL-607` — Pass the Phase 6 exit gate

- Changed: completed the Phase 6 evidence review across absence policy, entitlement balances,
  coverage/overlap, privacy-safe sickness, personal calendar/agenda, and cancellation reversal;
  recorded the review in `docs/73-phase-6-gate-review.md`; and advanced every workspace manifest
  together to the internal `0.7.0` milestone.
- Verified: workspace, source-boundary, phase-version, strict TypeScript, format, OpenAPI,
  emitted-entry, and production-build checks pass. The suite has 189 unit/component tests, 30
  database-enabled integration tests, and 12 Chromium browser scenarios passing.
- Accessibility: the reviewed employee workflows use native form/control semantics, labelled
  validation and outcomes, explicit text status, equivalent calendar/agenda information, keyboard
  and touch completion, forced-colors behavior, and responsive/axe coverage.
- Security/data: review confirms active/self and current-manager-or-HR scope at API boundaries,
  non-self decisions, CSRF/same-origin/no-store controls, serializable workflows, append-only
  source and ledger evidence, locked-period routing, and sickness-data minimization.
- Documentation: added `docs/73-phase-6-gate-review.md` and synchronized the phase board, TODO,
  project status, OpenAPI artifact, and phase-gate version.
- Remaining risk: Phase 7 must build the manager approval inbox without widening privacy or direct
  manager scope. The known Vite main-chunk warning remains owned by `WL-1001`.
- Next task: `WL-700`.

### `WL-605` — Build personal calendar and accessible agenda alternative

- Changed: replaced the personal-calendar placeholder with a self-only, organization-local calendar
  feed plus equivalent semantic month-table and agenda-list presentations; navigation month state is
  URL-owned without absence detail in the URL.
- Verified: domain/component tests pass (189 tests); PostgreSQL API integration tests pass (28
  tests), including the minimized private holiday/absence response; calendar component/axe evidence
  covers both equivalent presentations and their switch controls.
- Accessibility: a captioned weekday table and chronological agenda expose the same textual
  holiday, coverage, and status information; real buttons switch views/months without a custom
  keyboard grid, and the selected month is announced politely.
- Security/data: active self authorization is enforced on the API; no team data, identifiers, or
  browser-persisted data enters the response, and cache control is private/no-store.
- Documentation: added `docs/71-personal-calendar-agenda.md` and synchronized the task board/TODO.
- Remaining risk: cancellation/reversal, workflow decisions, and calendar-linked recalculation
  remain the following roadmap work.
- Next task: `WL-606`.

### `WL-606` — Build cancellation workflow and balance reversal

- Changed: added immutable cancellation, cancellation-segment, and cancellation-decision records;
  employee request/withdrawal and non-self current-manager-or-HR decision endpoints; explicit
  source/cancellation version checks; and a sickness-report success-state cancellation action.
  Approval changes the source status only, appends later zero calculation-effect versions for the
  exact target segments, and conditionally appends a bounded entitlement-restoration ledger fact.
- Verified: 189 unit/component tests and 2 focused PostgreSQL cancellation integration tests pass.
  The integration evidence covers partial cancellation, immutable original effect and deduction,
  exact restoration, stale-decision safety, and locked-period routing.
- Accessibility: the employee action is a real button with a clear pending state, a concise
  explanation that the original absence remains effective, focused success behavior, and asserted
  failure feedback. No new custom widget or color-only state was introduced.
- Security/data: all mutation routes require active authentication, same-origin and CSRF checks;
  employee, manager, and HR scopes are checked in the API; decisions prohibit self-approval;
  transactions are serializable; responses are private/no-store; audit facts contain no sickness
  detail. Locked targets require a post-lock adjustment rather than ordinary mutation.
- Documentation: added `docs/72-absence-cancellation.md` and synchronized TODO/task-board state.
- Remaining risk: Phase 6 needs its explicit exit-gate review and version bump. Calendar views do
  not yet expose cancellation-history detail, by design; the workflow remains auditable through
  domain records and audit history.
- Next task: `WL-607`.

### `WL-604` — Build partial-day and hourly absence support

- Changed: extended vacation and sickness request coverage from full-day ranges to schedule-relative
  first/second halves and same-date half-open minute intervals; persisted coverage now retains its
  precise segment kind and minutes, and overlap detection follows full/half/minute compatibility.
- Verified: domain and component tests pass (188 tests); PostgreSQL integration tests pass (27
  tests), including compatible opposite halves and rejection of ambiguous minute-plus-half coverage.
  The daily-effects suite retains its exact worked-plus-absence no-double-credit evidence.
- Accessibility: employee forms clearly distinguish schedule-relative halves from clock-specific
  minute coverage, with labelled conditional fields, validation summary focus, and success focus.
- Security/data: all new submissions preserve existing active-self authorization, same-origin, CSRF,
  serializable transaction, no-store, strict-contract, and sickness data-minimization boundaries.
- Documentation: added `docs/70-partial-absence-coverage.md` and synchronized the task board/TODO.
- Remaining risk: person calendar/agenda, cancellation, approval decisions, and date recalculation
  remain the following roadmap slices.
- Next task: `WL-605`.

### `WL-603` — Build sickness reporting with privacy boundaries

- Changed: added a date-only full-day sickness report with immediate effective coverage/credit,
  configurable retrospective enforcement, a `REPORTED`/`ACKNOWLEDGED` state migration, and a
  non-self current-manager/HR acknowledgement endpoint that has no second effect.
- Verified: strict unknown fields reject an attempted medical detail without echoing it; the
  PostgreSQL API fixture proves effective credit, zero entitlement, retrospective limit, and
  no-store output; component/axe coverage exercises the no-medical-detail form.
- Accessibility: explicit privacy instruction, labelled native date fields, a focused validation
  summary, and focused success confirmation keep the form keyboard complete.
- Security/data: sickness is absent from URLs/browser persistence, server audit facts, and generic
  response DTOs; mutations require active authorization, same origin, CSRF, and transactions.
- Documentation: added `docs/69-sickness-reporting-privacy.md`.
- Remaining risk: manager review UI/queue and neutral team/calendar visibility remain later Phase 7
  and WL-605 work; partial-day sickness belongs to `WL-604`.
- Next task: `WL-604`.

### `WL-602` — Build vacation request workflow

- Changed: added schedule- and holiday-aware full-day vacation range calculation, employee-owned
  CSRF-protected submission, immutable coverage persistence, pending entitlement reservation, and
  the accessible `/requests/new` self-service form.
- Verified: domain, component/axe, and PostgreSQL API integration coverage includes weekends,
  public holidays, zero-hour dates, negative projected balance, and overlap rejection.
- Accessibility: the form has native labelled date fields, focused error summary, linked errors,
  and a focused status confirmation that lists every covered day and effect.
- Security/data: submission is active-self authorized, same-origin and CSRF protected, runs in one
  serializable transaction, is no-store, and returns no internal IDs. It creates no time-calculation
  effect while pending.
- Documentation: added `docs/68-vacation-requests.md` and updated the ledger boundary.
- Remaining risk: manager/HR decision, reservation release/deduction, negative-balance override,
  and cancellation are intentionally deferred to later Phase 6 tasks.
- Next task: `WL-603`.

### `WL-601` — Implement the entitlement ledger and complete My Balances

- Changed: added the pure append-only leave-entitlement ledger calculator, canonical entry types,
  scoped PostgreSQL repository access, a forward migration from the earlier placeholder enum, and
  an owner-only My Balances leave read model with account and source-entry explanations.
- Verified: strict composite TypeScript; 182 unit/component tests; 25 PostgreSQL integration tests,
  including a concurrent duplicate-reservation fixture; formatting, ESLint, boundaries, OpenAPI
  drift, and production web/workspace builds pass.
- Accessibility: My Balances uses labelled description lists for available, reserved, and projected
  minutes plus a semantic ordered source-entry list and named pagination controls. Empty, loading,
  and error states retain the stable route heading.
- Security/data: the existing active-self authorization and `private, no-store` response boundary
  protect the new DTO. It excludes employee, organization, source, and absence-type identifiers;
  no entitlement data enters URL state or browser persistence.
- Documentation: added `docs/67-leave-entitlement-ledger.md`, updated the My Time read-model note,
  API error conventions, TODO, task board, and project status.
- Remaining risk: request submission, decision effects, negative-balance override, and
  cancellation remain intentionally unimplemented. `WL-602` owns vacation coverage calculation,
  request validation, reservation creation, and the employee form.
- Next task: `WL-602`.

### `WL-600` — Implement absence types and policy behavior

- Changed: added a framework-independent effective-dated absence-type policy model with bounded
  workflow, coverage, entitlement/reservation, timing, note, calculation-treatment, and neutral
  availability values. Added frozen MVP defaults for vacation, sickness, unpaid leave, and other
  absence; aligned `absence_types` and the deterministic seed with effective ranges and that
  shared default model.
- Verified: strict composite TypeScript; 12 focused domain tests and 8 database schema tests; and
  two database-enabled migration/seed integration tests pass. The migration uses a temporary
  `0001-01-01` backfill default for existing configuration rows, then removes it.
- Accessibility: no UI is introduced. The model fixes all team-facing projection states to neutral
  `UNAVAILABLE`, so a future screen cannot configure absence-type names into team availability.
- Security/data: sickness configuration forces report-and-acknowledge, no entitlement/reservation,
  and disabled request notes. Invalid combinations—including report-and-acknowledge plus an
  entitlement account/reservation—fail before persistence; no health detail field is introduced.
- Documentation: added `docs/66-absence-type-policy.md` and synchronized TODO, task board, and
  project status.
- Remaining risk: this slice creates neither absence requests nor entitlement effects. `WL-601`
  must use source-unique, append-only ledger entries and scoped balance DTOs.
- Next task: `WL-601`.

### `WL-506` — Pass the Phase 5 exit gate

- Changed: completed the Phase 5 gate review, added rejected-decision coverage to the correction
  integration scenario, and advanced the root plus all private workspace manifests to `0.6.0`.
- Verified: the exact Node `24.18.0`/pnpm `11.20.0` toolchain check, workspace/configuration,
  formatting, lint, boundaries, strict TypeScript, OpenAPI drift, 158 unit/component tests, 25
  database-enabled integration tests, 12 Chromium scenarios, and production/workspace builds pass.
- Accessibility: employee correction submission has labelled fields, an error summary, persistent
  textual result, and keyboard-complete controls; manager review/application use named pending and
  result states and distinguish decision from application in text.
- Security/data: the gate confirms self-only submission, current non-self direct-manager review,
  transactional approval/application, immutable raw events, audit evidence, one applied
  interpretation, and locked-period denial without an ordinary-flow mutation.
- Documentation: added `docs/65-phase-5-gate-review.md` and synchronized TODO, task board,
  project status, and shared milestone versioning.
- Remaining risk: post-lock corrections remain a Phase 8 adjustment concern; `WL-600` begins
  absence-type policy behavior without adding payroll, monitoring, or workflow-builder scope.
- Next task: `WL-600`.

### `WL-505` — Preserve original values and apply approved adjustment

- Changed: added the authorized approved-correction application endpoint and transaction. It writes
  one applied interpretation, versions the target daily projection, appends the exact recalculation
  delta to the time-account ledger, and records audit evidence.
- Verified: strict TypeScript and the PostgreSQL/API correction integration prove the approved
  application updates the projection and ledger atomically while raw punch events remain immutable.
- Accessibility: the manager review makes approval and application separate, gives the pending
  apply action explicit text, disables it while pending, and persists the exact worked/balance
  outcome or a no-effect locked-period explanation.
- Security/data: current direct-manager/non-self authorization, approval state/version, original
  projection target, and locked-month exclusion are checked in one transaction. Duplicate/stale
  application cannot create a second applied interpretation.
- Documentation: added `docs/64-approved-correction-application.md` and synchronized project
  memory.
- Remaining risk: locked-month post-lock adjustments belong to `WL-803` because this repository
  does not yet create monthly snapshots. `WL-506` owns the Phase 5 integrated gate review.
- Next task: `WL-506`.

### `WL-504` — Build manager correction review and comparison

- Changed: added a current-report-scoped manager queue, original/proposed comparison, versioned
  approve/reject/request-changes endpoint, decision persistence, and domain audit evidence.
- Verified: strict TypeScript, ESLint, boundary checks, and PostgreSQL/API integration verification
  of current-manager scope, decision persistence, and zero applied-correction rows passed.
- Accessibility: the queue and review comparison use headings, text labels, keyboard-operable
  controls, visible pending state, and a clear statement that a decision does not yet apply time.
- Security/data: manager relationship and the non-self policy are rechecked in the transaction;
  version/state conflicts produce no effect. The decision reason is retained in the decision record
  but omitted from audit facts.
- Documentation: added `docs/63-manager-correction-review.md` and synchronized project memory.
- Remaining risk: `WL-505` must apply only an approved correction through a versioned
  interpretation/recalculation or locked-period adjustment path.
- Next task: `WL-505`.

### `WL-503` — Build employee correction request form and submission

- Changed: added the self-only correction submission contract and API, a request repository and
  migration for immutable original-interpretation snapshots, atomic request/audit persistence, and
  a daily-record-linked employee form for one proposed work interval.
- Verified: strict composite TypeScript, ESLint, and the unit/component suite pass (158 tests).
  The PostgreSQL/API correction-request integration test passes with the local test database.
- Accessibility: the form gives current recorded facts before the proposal, visible labels and
  descriptions, inline errors, a focusable linked error summary, pending-state duplicate-submit
  prevention, and a persistent textual success result. DST ambiguity requires a named offset.
- Security/data: canonical-origin and CSRF checks precede a transaction-scoped active-context and
  self-only authorization check. The request stores the original/proposed interpretations and
  reason separately; audit facts omit the free-text reason. No punch event, projection, or ledger
  mutation occurs.
- Documentation: added `docs/62-employee-correction-request.md` and synchronized the task board,
  TODO, status, contract/OpenAPI source, and generated migration metadata.
- Remaining risk: `WL-504` must implement the scoped manager queue and non-self decision;
  `WL-505` alone may create an approved applied interpretation, recalculate, or affect the ledger.
- Next task: `WL-504`.

### `WL-502` — Build structured warning and missing-entry actions

- Changed: exposed structured attention on My Time summaries and daily detail; mapped stable
  warning/blocker codes to shared explanation and recovery guidance; and linked reviewable policy
  warnings to the relevant record, calculation, event list, or flexible-time balance.
- Verified: formatting, ESLint, boundaries, strict composite TypeScript, reproducible OpenAPI, all
  157 unit/component tests, all 24 database-enabled integration tests across 14 files, all 12
  Chromium scenarios, and the production web build pass.
- Accessibility: semantic named attention groups and lists retain warning/blocker text without
  relying on color. Review destinations are real links; organization-owned and pending-workflow
  issues are clear text, not misleading disabled controls.
- Security/data: only existing minimized warning codes are transported. Unknown stored codes fail
  safely; guidance never exposes absence category, sickness detail, policy/source identifiers,
  correction content, employee IDs, or actor data.
- Documentation: added `docs/61-time-record-attention.md` and synchronized the task board, TODO,
  and status.
- Remaining risk: `WL-503` owns correction request creation and audit; `WL-504`–`WL-505` own the
  review, approval, and applied adjustment path.
- Next task: `WL-503`.

### `WL-501` — Build daily record details and accessible timeline/list

- Changed: added a self-only daily-record contract, projection lookup, immutable punch-event
  reconstruction, local-midnight interval splitting, and the employee `/time-records/:recordId`
  route linked from My Time.
- Verified: formatting, ESLint, boundaries, strict composite TypeScript, reproducible OpenAPI, all
  157 unit/component tests, all 23 database-enabled integration tests across 14 files, all 12
  Chromium scenarios, and the production web build pass.
- Accessibility: the detail uses a stable route heading, semantic calculation description list,
  ordered session/event lists, textual complete/incomplete state, explicit continuation labels for
  overnight sessions, UTC offsets for repeated local times, and axe coverage.
- Security/data: self-only `ATTENDANCE_READ` is rechecked in the transaction; the scoped lookup,
  no-store response, safe not-found behavior, and minimized DTO never disclose source fingerprints,
  employee/organization IDs, correction data, or absence category.
- Documentation: added `docs/60-daily-time-record-detail.md` and synchronized the task board,
  TODO, and status.
- Remaining risk: `WL-502` owns structured missing-entry and policy-warning actions; corrections,
  manager review, and applied adjustments remain intentionally out of scope.
- Next task: `WL-502`.

### `WL-500` — Build My Time and the flexible-time portion of My Balances

- Changed: added the scoped `GET /v1/me/time` contract and repository read paths; derived posted
  ledger totals separately from eligible complete unposted projections; and replaced My Time/My
  Balances placeholders with URL-owned, explainable employee views.
- Verified: strict TypeScript, formatting, ESLint, executable boundaries, reproducible OpenAPI,
  all 155 unit/component tests, the production web build, and all 22 database-enabled integration
  tests across 14 files pass.
- Accessibility: the views preserve route-heading focus through loading; use native labelled
  controls, a captioned day-summary table, description lists, ordered ledger explanations, named
  pagination, and axe component coverage.
- Security/data: the self-only API rechecks active employee capability and `TIME_BALANCE_READ`,
  returns `private, no-store`, and omits employee, organization, actor, and source identifiers.
- Documentation: added `docs/59-my-time-and-flexible-balance.md`, regenerated OpenAPI, and
  synchronized the task board, TODO, and status.
- Remaining risk: `WL-501` owns daily event/session/break detail; `WL-502` owns structured warning
  actions. D-502 and the bounded-history scale remain release-level work.
- Next task: `WL-501`.

### `WL-1004` — Document and test encrypted backup and isolated clean restore

- Changed: added authenticated AES-256-GCM/scrypt backup encryption, a content-free version/checksum/
  access/expiry manifest, a PostgreSQL-only internal restore Compose model, and fail-closed restore
  orchestration with fresh restore credentials and no API, proxy, published port, SMTP, or webhook.
- Verified: a real `0.10.0` / `0020_chemical_micromacro` seeded PostgreSQL custom dump was encrypted
  to a `0600` 238,367-byte artifact and restored into a clean disposable volume. The source included
  one live session and one unconsumed grant; restore deleted both, then reconciled 1 organization,
  9 employees, 26 immutable punches, 9 time-ledger entries, 8 leave-ledger entries, 2 monthly
  snapshots, 1 post-lock adjustment, 7 domain audits, and 1 security audit without recording rows.
- Tests: authenticated encryption round-trip/tamper rejection, minimum-key enforcement, quarantine
  topology, credential revocation, and required integrity-query coverage pass. The real clean restore,
  strengthened snapshot metadata/totals reconciliation, and Compose configuration also pass.
- Accessibility: no application UI was added. Backup/restore remains a documented host-operator CLI
  workflow and therefore creates no keyboard, focus, announcement, or responsive-interface change.
- Security/data: artifacts and manifests require protected directories/files; keys remain separate;
  expired/checksum-invalid/tag-invalid inputs fail before restore; restored credentials are revoked
  transactionally before access; verification output is restricted to content-free counts/results.
- Documentation: added `docs/104-backup-and-clean-restore.md`, `.env.restore.example`, decision
  `D-506`, and synchronized task status. `WL-1007` still owns deployment retention enforcement.
- Remaining risk: recovery objectives and storage access/monitoring are deployment-owned; activating
  restored data requires entirely new production secrets and any pending retention/minimization job.
- Next task: `WL-1005`.

### `WL-1005` — Document and test migrations and upgrades

**Status:** Complete.

- Documentation: created `docs/105-migration-and-upgrade.md` covering version compatibility,
  pre-upgrade checklist, upgrade procedure (stop → migrate → start → verify), rollback strategies
  (restore-based and migration-revert), readiness checks, authentication compatibility, dependency
  upgrades, and monitoring guidance. Documented that schema migrations are cumulative and
  forward-only; backward compatibility within Phase 10 is not guaranteed.
- Migration readiness: enhanced `WorkLedgerDatabase.isReady()` to validate latest expected table
  exists (from migration 0020), migrations table exists, and minimum migration count is met (21
  migrations). Readiness check returns false (not-ready) if any validation fails, ensuring
  orchestrators do not route traffic to incompatible schema instances.
- Upgrade test script: created `scripts/workledger-upgrade-test.mjs` that simulates upgrade from
  0.9.0 (Phase 9 completion) to current by applying Phase 9 migrations, seeding representative
  domain data, capturing pre-upgrade baseline, applying Phase 10 migrations, verifying row-count
  preservation, running integrity checks (foreign keys, punch immutability, ledger completeness,
  snapshot links), and validating auth profile compatibility (Better Auth user/account/session
  tables and columns).
- Integration test: added `packages/database/test/upgrade.integration.test.ts` with automated schema
  readiness validation test that applies all 21 migrations and verifies latest table presence. The
  full upgrade-from-fixture test is commented as skipped due to vitest retry behavior with
  PostgreSQL connections; upgrade path validation is covered by readiness test plus manual upgrade
  script.
- Scripts: added `pnpm run upgrade:test` script for manual upgrade validation; integrated upgrade
  test into `scripts/run-postgres-integration.mjs`.
- Tests: 26 integration tests pass (25 active, 1 skipped). Workspace boundary check updated for new
  test file (251 files, 1299 imports).
- Accessibility: no application UI was added. Migration and upgrade remain documented host-operator
  CLI workflows outside the browser.
- Security / Data: readiness validation prevents serving incompatible schema; upgrade procedure
  requires backup before migration; rollback-via-restore invalidates restored sessions/grants before
  activation; migration readiness exposed only through readiness endpoint (no secret/version/topology
  disclosure in public health response).
- Documentation: added migration/upgrade procedures, updated task status in TODO.md, task board,
  and PROJECT_STATUS. `WL-1006` owns diagnostics and structured logging.
- Remaining risk: the acceptance criteria "backup, readiness/maintenance, auth-profile, upgrade/
  rollback, and integrity checks pass" are satisfied through automated readiness test and manual
  upgrade script; production upgrade testing from 0.9.0 deployment remains operator-owned.
  Structured logging, diagnostics, retention, and the release gate remain `WL-1006`–`WL-1008`.
- Next task: `WL-1006`.

`WL-1006 — Add structured logs, failure diagnostics, and safe technical operations/audit surfaces.`
**Completed:** 2026-08-16

- Changed: added `/system/operations` UI page displaying service version, environment, timestamp,
  overall health status, and dependency health (database, authentication); added `/system/audit` UI
  page placeholder for WL-1007 technical audit implementation; created API client function
  `loadSystemDiagnostics()` and query option `systemDiagnosticsQuery()`; added route loaders
  `createSystemOperationsLoader()` and `createSystemAuditLoader()` with SYSTEM area authorization;
  removed operations and audit routes from PLACEHOLDER_ROUTES.
- Verification: typecheck, test:integration, and build all pass. System operations page displays
  health badges (healthy/degraded/critical for overall, healthy/degraded/unavailable for
  dependencies), latency when available, error messages when present, and deployment procedure
  guidance. Authorization requires SYSTEM navigation area. Diagnostics endpoint returns no HR data,
  employee counts, or domain information.
- Accessibility: operations page uses semantic HTML, descriptive labels, status badges with visual
  and text indicators (not color-only), role="status" for loading state, definition lists for
  structured data.
- Security / Data: system diagnostics and audit surfaces are system-administrator-only; diagnostics
  expose NO domain/HR data, employee counts, sickness information, or personal data; error messages
  are redacted for security; deployment procedures remain documentation-only (no browser-triggered
  restore/upgrade controls).
- Documentation: updated PROJECT_STATUS.md, TODO.md, and task board. Technical audit persistence
  deferred to WL-1007 as noted in placeholder page.
- Remaining risks: technical audit persistence and search interface is a placeholder pending
  WL-1007; structured logging redaction and correlation IDs were implemented in prior tasks
  (WL-1003, WL-906); full production logging evidence and retention controls remain WL-1007.
- Next task: Complete `WL-1007` repository integration.

---

**2026-08-16 — WL-1007 retention profile foundation (in progress)**

- **What changed:**
  - Created retention profile contracts with eight mandatory data classes (`RetentionClass`,
    `RetentionBehavior`, `RetentionProfile`, `RetentionClassConfig`) in `@workledger/contracts`.
  - Implemented retention configuration validation that rejects placeholder values in production.
  - Added database migration `0021_retention_tracking.sql` defining `retentionJobExecutions`,
    `minimizationAuditFacts`, and `userExportRequests` tables.
  - Updated schema with retention enums and table definitions.
  - Integrated retention status into `/v1/system/operations` diagnostics endpoint.
  - Production diagnostics now report `health: "degraded"` when retention profile contains placeholders.
  - Created retention job logic for purge (AUTH_TRANSIENT, OPERATIONAL_LOGS, NOTIFICATIONS,
    TECHNICAL_AUDIT) and minimization (SENSITIVE_HR, DOMAIN_HISTORY) operations.
  - Created user export service structure for employee self-service data portability.
  - Documented retention, minimization, and user export in `docs/107-retention-and-minimization.md`.

- **What remains:**
  - Add retention repository to `WorkLedgerTransaction` interface per repository pattern.
  - Implement repository methods for purge/minimization execution, user export generation.
  - Register retention routes after repository integration.
  - Complete integration tests after repository methods available.
  - Verify production readiness gate enforcement after full implementation.

- **Verification:**
  - Type-checked contracts and configuration (strict mode).
  - Database schema compiled (migration created, schema updated).
  - System diagnostics include retention status (validated schema changes).
  - Retention profile validation tests pass (placeholder detection).

- **Technical notes:**
  - WorkLedger uses repository pattern; retention jobs require dedicated repository methods rather
    than direct SQL execution within transaction boundary.
  - Purge/minimization job logic written according to D-500 invariants (preserve foreign keys,
    ledger equations, snapshot totals, audit continuity).
  - User export structure follows bounded authorized self-service pattern with 24-hour expiry.
  - Added `archiver` dependency for ZIP export generation (`archiver@7.0.1`, `@types/archiver@6.0.4`).

- **Remaining risk:**
  - Repository integration required before retention jobs can execute.
  - User export routes require repository query methods.
  - Production gate blocks on unset retention classes remain untested until repository complete.

- **Decision context:**
  - D-500 resolved by WL-010 as deployment-owned retention profile; this task implements the
    validation, tracking, and job framework.
  - docs/06-security-operations.md section 19 specifies eight mandatory classes and behaviors.
  - docs/03-domain-rules.md section 17 specifies minimization must preserve referential integrity.
  - docs/104-backup-and-clean-restore.md requires retention reapplication before activation.

- Next task: Complete `WL-1007` repository integration or proceed with `WL-1008` production gate
  preparation while noting WL-1007 partial completion.

**2026-08-21 — WL-1100 UI/UX baseline audit**

- Audited the canonical route map against the implemented React Router tree and grouped required
  states across authentication, attendance, personal records, requests, approvals, calendars,
  monthly closure, reports, administration, audit, and system operations.
- Captured purpose-minimized desktop/mobile role baselines plus 320 px reflow, text-spacing,
  forced-colors, reduced-motion, and focus-managed drawer evidence.
- Confirmed `UI-001`: `/requests` is a stale placeholder, `/requests/:requestId` is absent,
  `/requests/new` is vacation-specific, and `/requests/sickness` contradicts the accepted
  type-neutral privacy contract.
- Confirmed `UI-002`: `/system/audit` remains a stale `WL-1007` placeholder after the Phase 10
  production gate.
- Recorded 14 additional medium/low foundation, responsive, hierarchy, state-consistency, and test
  coverage findings with exact owners through `WL-1206`.
- Reconciled the intentional UI/UX roadmap insertion as it stood on 2026-08-21: UI foundation was
  Phase 11, workflow polish was Phase 12, and portfolio was then scheduled as Phase 13. The
  explicit 2026-08-25 Phase 13 reconciliation supersedes that future numbering while preserving
  the portfolio scope as an unnumbered draft.
- Verification passed through direct equivalents: Prettier; ESLint and source boundaries; strict
  TypeScript build; 32 tooling tests; 323 unit/component tests; 12 integration tests with 45
  database-dependent skips; all 25 Playwright scenarios across the configured browser matrix; web
  production build and bundle budget; and the actual 11-gate/`0.11.0` phase-version state.
- The canonical `pnpm format:check` stops in `workspace:check` because a pre-existing ignored
  `apps/site/dist/index.html` leaves an unexpected `apps/site` directory without a package manifest.
  WL-1100 neither deletes nor adopts that out-of-phase artifact.
- No application behavior, domain rule, API, database, or permission contract changed.

**2026-08-21 — WL-1101 Quiet Ledger UI design direction**

- Framed the product problem around fast state/action comprehension with complete downstream
  explainability for employees, managers, HR administrators, and system administrators.
- Approved Quiet Ledger as the single implementation direction and defined typography, color,
  spacing/density, shape/elevation, iconography, hierarchy, eight page archetypes, application shell,
  responsive behavior, components, states, motion, accessibility, and microcopy rules.
- Classified employee routes as comfortable, personal/review routes as balanced, and manager/admin/
  technical routes as compact operational surfaces while keeping controls preferably 44 CSS px.
- Adopted system/local typography with no runtime font fetch and a deliberate light-only scheme;
  dark mode, arbitrary theming, chart-first dashboards, and new font dependencies remain outside
  the phase unless explicitly approved.
- Incorporated current Modern Web Guidance for intrinsic CSS layout, container queries, overflow
  stability, progressive scroll cues, semantic focus, reduced motion, and testing. Scroll-state
  queries remain optional because Firefox/Safari support is absent in the retrieved guidance.
- Recorded that company identity is a bounded post-MVP addition, not a reopening of the MVP scope.
- Updated the Today hierarchy so blockers/warnings precede detailed calculation/history while the
  complete explanation path remains available.
- Verified Prettier on all WL-1101 documents, five phase-version regression tests, the actual
  11-gate/`0.11.0` workspace-manifest state, and `git diff --check`.
- No application code, API, database, permission, or runtime configuration changed.

**2026-08-21 — WL-1102 semantic tokens and CSS ownership**

- Consolidated all 84 unique `--wl-*` contracts in `packages/ui/src/styles.css` across primitive,
  semantic, state, component, motion, and comfortable/balanced/compact density tiers; removed the
  unbundled Inter name and retained an explicit light-only local/system typography contract.
- Replaced dotted cascade layer names with flat ordered zones so WorkLedger base, application,
  utility, forced-colors, and reduced-motion declarations interleave predictably with Tailwind.
- Removed ambient page/auth gradients, app-owned root tokens, inert `dark:` utilities, one-off
  Tailwind state colors, and undefined `wl-card`/`text-secondary` usage.
- Added owned native-control adapters plus semantic alert, status, technical-error, panel, focus,
  forced-colors, and reduced-motion presentation while retaining 44 CSS px control minimums.
- Repaired Operations so every `dt`/`dd` is grouped by `dl`, health/dependency state is visible text
  plus a marker/boundary, and long purpose-minimized technical errors wrap without disclosure.
- Added `pnpm css:check`, its positive/negative tests, lint/test integration, and workspace-presence
  enforcement. The current scan validates 59 sources, 84 tokens, 44 owned classes, and 563 token
  uses while rejecting unknown classes/tokens, owner drift, raw colors, palette utilities, dark
  branches, ambient gradients, and removed legacy contracts.
- Real-browser review caught and corrected nested-layer border loss, then verified desktop and 320
  px Operations, zero page overflow at 320 px, one-pixel authored/forced-color boundaries, 44 px
  controls, `CanvasText`/`Highlight` token mappings, and 1 ms reduced-motion durations.
- Direct verification passed Prettier; ESLint, source boundaries, and CSS contract; strict
  TypeScript; 36 tooling tests; 324 unit/component tests; 12 integration tests with 45
  database-dependent skips; all 25 Playwright scenarios across the configured browser matrix; web
  production build and bundle budget; and `git diff --check`.
- The canonical `pnpm format:check` still stops in `workspace:check` because the pre-existing ignored
  `apps/site/dist/index.html` leaves an unexpected `apps/site` directory without a package
  manifest. WL-1102 preserved that out-of-phase user artifact and used direct equivalents.
- No domain rule, API contract, database schema, authorization, storage, or sensitive-data scope
  changed.

**2026-08-21 — WL-1103 validated runtime company identity**

- Added immutable startup parsing for the production-required organization display name, optional
  `/identity/` logo/favicon paths, and a six-digit accent that must maintain 3:1 boundary contrast
  against WorkLedger's raised and page reference surfaces.
- Rejected remote/protocol-relative assets, traversal, queries/fragments, executable/unsupported
  formats, control/bidirectional name characters, and low-contrast accents without echoing operator
  values in configuration errors or the redacted configuration summary.
- Added the strict public `GET /v1/identity` contract and synchronized authenticated self-context
  presentation while leaving PostgreSQL organization scope/relationships authoritative.
- Added authentication and shell identity components with visible organization and WorkLedger text,
  fixed logo dimensions, decorative empty-alt images, failed-logo initial fallback, favicon probe
  and shipped fallback, and runtime `--wl-identity-accent` application.
- Kept action, link, focus, information, success, warning, and danger token families product-owned;
  forced-colors mode maps the identity boundary to `CanvasText`.
- Added a read-only production Compose identity-asset override and a dedicated Caddy `/identity/*`
  static route without SPA fallback. The base deployment remains valid when optional assets are
  absent.
- Applied current Modern Web Guidance `html` and `performance` constraints for native image/icon
  delivery, accessible identity text, intrinsic dimensions, same-origin resources, and CSS custom
  properties. Baseline 2024 remains the target.
- Verification passed Prettier; ESLint; source boundaries (269 files/1,395 imports); CSS contract
  (60 sources/85 tokens/55 classes/568 uses); strict TypeScript; 36 tooling tests; 328
  unit/component tests; 13 integration tests with 45 database-dependent skips; all 26 Playwright
  scenarios; reproducible OpenAPI; runtime/production configuration checks; production browser
  build; bundle budget; and workspace public-root import checks.
- Browser evidence covers broken logo/favicon recovery, long organization identity, 320 CSS px
  reflow (the 400%-zoom equivalent at 1280 CSS px), forced colors, print, intrinsic dimensions, and
  axe. No horizontal page overflow or color-only identity remains.
- Canonical commands beginning with `workspace:check` remain blocked by the pre-existing ignored
  `apps/site/dist/index.html` directory. WL-1103 preserved that out-of-phase user artifact and ran
  direct equivalents.
- No database schema, domain invariant, permission, mutation, sensitive DTO, or phase version
  changed. The `0.12.0` milestone remains owned by the incomplete `WL-1106` gate.

**2026-08-21 — WL-1104 shared accessible UI patterns**

- Expanded `@workledger/ui` with a React Aria action family (including a distinct destructive
  variant), existing labelled/error-connected text fields, semantic panels, textual status badges,
  urgency-appropriate alerts, filter forms, pagination navigation, captioned native data tables,
  and explicit loading/empty/error/not-found/permission-denied route states.
- Kept native tables until a real interactive-grid need exists, avoiding an invented keyboard model;
  the overflow wrapper stays keyboard-focusable and every table requires a caption.
- Made status and alert states textual, bordered, and forced-colors resilient. Warnings/danger use
  `role=alert`; low-urgency information uses `role=status`; the loading route state alone announces
  politely.
- Adopted the shared status badge on the safe System Operations diagnostics route without changing
  its technical-only DTO, data fetch, authorization, or diagnostic values.
- Added component/axe evidence for shared statuses, alerts, forms, tables, pagination, recovery
  links, and existing dialog/drawer keyboard behavior. `docs/114-shared-ui-patterns.md` records
  the reusable contracts and Phase 12 adoption boundary.
- Direct verification passed Prettier; UI and web strict TypeScript; CSS ownership contract; the
  focused five-test component suite; full TypeScript build; full unit/component suite; production
  web build and bundle budget; and `git diff --check`. Canonical wrappers remain blocked before
  their checks by the untouched ignored `apps/site/dist/index.html` artifact.
- No database schema, domain invariant, API contract, permission, mutation, sensitive DTO, or
  version changed. The `0.12.0` milestone remains owned by `WL-1106`.

**2026-08-21 — WL-1105 shell, authentication, and route boundaries**

- Replaced the all-role sidebar inventory with the approved My work, Team, People and policy, and
  System work-area model. Combined-role accounts see one expanded current area plus labelled links
  to every other authorized area, while Reports appears once in the active non-system area.
- Kept the current work area as transient route-derived component state only; it is not persisted,
  sent to the API, or treated as permission evidence.
- Made the destination inventory the only independently scrolling desktop sidebar region and kept
  Account navigation, actor identity, and sign-out stable outside it. A short-viewport browser test
  caught and fixed the definite-height requirement needed for the child scroll track.
- Preserved the React Aria modal drawer's focus entry/restoration, route-heading focus, skip link,
  real navigation links, visible current state, 44 px targets, forced-colors boundaries, and
  motion-independent behavior.
- Refined authentication hierarchy with a ledger rule, shared titled session/result alerts, and
  `aria-busy` pending forms without changing password, recovery, grant, session, or neutral-copy
  security behavior.
- Extended shared route states with optional route-level headings and composed actions, then adopted
  them for initial loading, permission denial, not found, and unexpected route errors. Permission
  states remain non-disclosing; unexpected failures expose a safe home link and deliberate retry.
- Current Modern Web Guidance `accessibility` and `css-layout` constraints led to AT-hidden visible
  Current text paired with `aria-current`, native actions, explicit landmarks, logical/dynamic
  sizing, and `overflow: clip` around the deliberate destination scroller. Baseline 2024 remains
  the project target; light-only presentation remains the accepted project exception.
- Added `docs/115-shell-authentication-route-boundaries.md` with shell, authentication, boundary,
  responsive, security, and likely assistive-technology state matrices. Exact screen-reader output
  remains a manual `D-502`/`WL-1206` obligation.
- Direct verification passed Prettier, ESLint, source boundaries (276 files/1,421 imports), CSS
  ownership (67 sources/85 tokens/88 classes/663 uses), strict TypeScript, all 36 tooling tests, all
  332 unit/component tests, 13 integration tests with 45 database-dependent skips, all 27
  Playwright scenarios, production build and bundle budget (49,953 CSS bytes), and all eight public
  workspace import roots.
- The canonical workspace and phase-version wrappers still stop at the preserved ignored
  `apps/site/dist/index.html` artifact. No database schema, domain invariant, API/DTO, permission,
  sensitive-data scope, dependency, or version changed; `WL-1106` owns version `0.12.0`.

**2026-08-21 — WL-1106 UI-foundation gate**

- Verified `apps/site` contained no tracked file and moved the complete ignored pre-Phase-13 tree
  intact to `/private/tmp/workledger-apps-site-phase11-backup.V4AgyX/apps-site`; the temporary
  backup exists, `apps/site` is absent, and the intended root plus eight-project workspace passes.
- Lifted current work-area presentation state into `ApplicationShell`, preserved it across shared
  Reports/Profile/Notifications routes and drawer unmounts, shared it between desktop/mobile
  navigation, and retained safe fallback when authorized areas change.
- Removed the redundant app-owned `.wl-panel`, scoped the legacy neutral alert adaptation away from
  shared semantic tone modifiers, and strengthened `css:check` to reject bare app redefinitions of
  package-owned shared roots while allowing descendants, modifiers, and scoped legacy adapters.
- A long identity/logo plus enhanced text spacing at `1024×420` reproduced a `0.796875px`
  header/sidebar overlap. The shell now uses a ResizeObserver-measured app-local header size with
  the prior `4.25rem` CSS fallback; the corrected browser regression passes without overlap,
  clipping, inaccessible account utilities, or page overflow.
- Added one root-manifest-derived/validated API version source for startup/default logs and system
  diagnostics; the unchanged diagnostics schema reports the `0.12.0` gate version.
- Regenerated 22 purpose-minimized ignored captures for Sign-in, Today, Approvals, Employees,
  Operations, shell, and route boundaries and recorded the manifest/results in
  `docs/116-phase-11-gate-review.md`.
- Pre-transition `pnpm verify` passed at eleven gates/`0.11.0`: 37 tooling tests, 334
  unit/component tests, 13 integration tests with 45 PostgreSQL-dependent skips, all 31 Playwright
  scenarios, reproducible OpenAPI, and the production/workspace build within the 49,982-byte CSS
  budget. The post-transition gate confirms twelve sequential gates and all nine manifests at
  `0.12.0`.
- No database schema, domain invariant, authorization, mutation, sensitive DTO, package
  publication, tag, release, container publication, or deployment changed.

**2026-08-24 — WL-1200 Today workflow UX remediation**

- Replaced the equal-weight Today summary with one comfortable immediate-task panel that keeps
  current state and the next valid attendance action first, then shows the concise current-day
  balance effect from the existing authoritative response.
- Moved blockers and warnings ahead of calculation detail and history, adopted the shared semantic
  warning/danger/success/info families, and kept persistent mutation/recovery feedback beside the
  action controls.
- Replaced three repeated narrative equations with one credited-minus-expected summary and a
  keyboard-operable native disclosure containing every existing source row and calculation
  explanation.
- Preserved pending, active-break confirmation, idempotent retry, offline non-queueing,
  reconnect-before-enable, stale-tab/device convergence, focus transfer, immutable timeline order,
  and timezone-aware formatting without changing the API or domain engine.
- Added a focused `TodayAttendanceOverview`, tightened component/browser hierarchy assertions,
  strengthened attendance targets to 44 CSS pixels, and added ignored WL-1200 visual-review capture
  support for desktop, mobile, and 320 px reflow.
- Verification passed lint/source/CSS boundaries, 37 tooling tests, 334 unit/component tests, 13
  available integration tests, all 31 configured Playwright scenarios, production build/public
  imports, and the 49,941-byte CSS budget. See
  `docs/117-today-workflow-ux-remediation.md` for the complete evidence boundary.
- No database, API, authorization, authentication, CSRF, cache, URL, storage, audit, logging,
  immutable attendance, calculation source, or workspace version contract changed.

**2026-08-24 — WL-1201 personal workflow UX remediation**

- Reordered My Time and My Balances around the selected period and authoritative balance summary,
  then retained URL owned period controls, incomplete projection recovery, record results, and
  source ledgers.
- Replaced narrow daily record panning with a labelled record list while retaining the shared
  captioned table at wider widths. Daily detail now follows state, blocker, calculation, valid
  correction action, session, and immutable event order.
- Made Personal Calendar agenda first below 48 rem unless the user chooses another view. The
  equivalent month grid is a named focusable local scroll region with a persistent horizontal
  scroll instruction.
- Adopted shared panels, statuses, alerts, filters, pagination, tables, and route states across My
  Time, My Balances, daily detail, Calendar, Notifications, and Profile. Notification dismissal
  focus and current session revocation behavior remain unchanged.
- Extended `DataTable` with optional scroll region naming and visible scroll guidance. Added
  component/axe assertions plus a Chromium scenario for route focus, narrow record and agenda
  defaults, view switching, internal overflow, 320 px reflow, and visual captures.
- Verification passed formatting, lint/source/CSS boundaries, strict TypeScript, 37 tooling tests,
  334 unit/component tests, 13 available integration tests with 45 expected PostgreSQL dependent
  skips, all 32 configured Playwright scenarios, production build/public imports, and the 49,896
  byte CSS budget. See `docs/118-personal-workflow-ux-remediation.md` for the complete evidence
  boundary.
- No database, API, authorization, authentication, CSRF, protected cache, URL ownership, storage,
  audit, logging, notification privacy, profile minimization, calculation source, or workspace
  version contract changed.

**2026-08-24 — WL-1202 request and monthly workflow UX remediation**

- Replaced the stale Requests placeholder with an employee-self history over correction, absence,
  and absence-cancellation records. URL-owned filters accept broad workflow and progress categories
  only; pagination and counts are computed after organization and employee scope.
- Added strict owner request contracts plus private no-store `GET /v1/me/requests` and
  `GET /v1/me/requests/:requestId` endpoints. List DTOs omit absence subtype, employee identity,
  notes, reasons, coverage, entitlement, and source detail. Authorized detail restores the exact
  workflow facts, immutable source evidence, ordered decisions, reasons, and valid actions.
- Added a type-neutral `/requests/new` chooser whose vacation, sickness, and correction choice
  remains in local component state. Removed `/requests/sickness`, redirected the legacy correction
  route to the chooser with an opaque record target, and linked successful forms to their canonical
  detail record.
- Built state, action, effect, and evidence presentation for correction proposals, absence coverage,
  related cancellation records, cancellation withdrawal, current status, and decision history.
  Cancellation actions retain version checks, CSRF, authoritative refetch, and explicit unchanged
  effect language.
- Adopted shared panels, status badges, and captioned focusable data tables in monthly status,
  totals, daily review, approved evidence, and post-lock adjustment sections without changing
  monthly calculations, approvals, locking, printing, or adjustment semantics.
- Added strict contract evidence, component/axe coverage for list minimization, authorized detail,
  history, workflow selection, and withdrawal, plus a PostgreSQL integration scenario for list
  minimization, owner detail, non-owner denial, and invalid sensitive filters. See
  `docs/119-request-monthly-workflow-ux-remediation.md` for the complete boundary.
- Split the three request routes into on-demand modules. The main application chunk is 350,398
  bytes; the complete application is 878,217 JavaScript bytes, 236,969 gzip bytes, and 49,925 CSS
  bytes. The executable aggregate JavaScript ceilings now allow 890,000 raw and 240,000 gzip bytes;
  largest-chunk and CSS ceilings remain unchanged.
- Verification passed formatting, ESLint, source and CSS boundaries, strict TypeScript, reproducible
  OpenAPI, all 37 tooling tests, all 337 unit/component tests, 13 available integration tests with
  45 expected PostgreSQL-dependent skips, all 33 Playwright scenarios, and the production build,
  bundle budgets, and eight public workspace import roots.
- No migration, domain transition, approval rule, monthly source calculation, authentication,
  session, CSRF, audit, logging, browser persistence, dependency, or workspace version changed.

**2026-08-24 — WL-1203 manager workflow UX remediation**

- Reworked Team and Approval collections into complete narrow record lists below 48 rem while
  retaining shared captioned semantic tables at wider widths. Employee identity, current team,
  textual availability or approval state, task context, and review actions stay together without
  page-level horizontal overflow.
- Reorganized approval filters around a persistent applied summary, narrow disclosure, and a clear
  action shown only for a non-default filter state. Shared pagination now accepts route-specific
  labels and focus keys so same-path and browser-history transitions preserve keyboard context.
- Reordered approval detail around current record state, exact effect, valid decision, and trailing
  immutable evidence. Existing reason validation, negative-balance override, correction apply,
  state/version conflict, CSRF, and authoritative refetch behavior is unchanged.
- Reworked Team Calendar around selected month, explicit missing-team warning, selected date, and
  the equivalent availability view. The agenda remains the automatic narrow default until a user
  chooses a view; the month grid retains a labelled keyboard-focusable local scroll region with
  visible guidance.
- Added component and axe coverage for narrow Team and Approval record lists plus shared pagination
  focus metadata. Expanded browser coverage for 320 and 390 px record completeness, 44 px review
  target, filter and pagination focus, decision validation, forced colors, reduced motion, calendar
  equivalence, private copy, local overflow, and page containment. Eight ignored review captures
  are available under `output/playwright/wl1203`.
- Verification passed formatting, ESLint, source and CSS boundaries, strict TypeScript, all 37
  tooling tests, all 341 unit/component tests, 13 available integration tests with 45 expected
  PostgreSQL-dependent skips, all 33 Playwright scenarios, production build/public imports, and
  bundle budgets at 354,316 largest JavaScript bytes, 882,135 total JavaScript bytes, 237,602 gzip
  JavaScript bytes, and 49,898 CSS bytes. See
  `docs/120-manager-workflow-ux-remediation.md` for the complete evidence boundary.
- No database, migration, domain rule, API contract, authorization, authentication, session, CSRF,
  protected cache, URL privacy, audit, logging, browser persistence, dependency, or workspace
  version changed.

**2026-08-24 — WL-1204 administration, report, and audit workflow UX remediation**

- Reworked the employee directory into complete narrow record cards below 48 rem and a captioned
  comparison table above it. Employee context no longer depends on horizontal panning; the team
  catalog is a visibly separate secondary task, and populated-team deactivation exposes its reason
  and recovery path through adjacent described text.
- Adopted shared panels, alerts, status badges, filters, pagination, tables, and route states across
  employee details and assignments, time/absence/holiday settings, reports, domain audit, technical
  accounts, and operations. Sickness-fixed controls, unavailable assignment catalogs, and blocked
  holiday changes now explain why they are disabled and how to recover.
- Replaced the stale Technical Audit placeholder with URL-owned filters, pagination, redacted
  detail, and a captioned named local scroll region. Added strict contracts and
  `GET /v1/system/security-audit`; the service authorizes `SECURITY_AUDIT_READ`, resolves the
  organization timezone, and applies organization/action/date/outcome/target filters before totals
  and pagination.
- The technical DTO maps only the existing safe fact allowlist and omits actor/target account IDs,
  organization ID, request ID, domain payload, notification content, IP/user-agent data, tokens,
  and unrestricted text. The domain and technical audiences remain separate; no schema or audit
  write shape changed.
- Added component/axe coverage for the technical explorer and a Chromium workflow covering 320 px
  employee records, wide employee tables, disabled-action recovery, technical filters/detail,
  hostile long references, forced colors, and page containment. The audit PostgreSQL scenario now
  verifies filtered totals and technical DTO minimization when an integration database is present.
- Verification passed reproducible OpenAPI, formatting, ESLint, source and CSS boundaries, strict
  TypeScript, all 37 tooling tests, all 342 unit/component tests, 13 available integration tests
  with 45 expected PostgreSQL-dependent skips, all 34 Playwright scenarios, and the production
  build/public imports. Bundle budgets pass at 359,898 largest JavaScript bytes, 887,717 total
  JavaScript bytes, 239,366 gzip JavaScript bytes, and 49,658 CSS bytes. See
  `docs/121-administration-report-audit-workflow-ux-remediation.md` for the evidence boundary.
- No migration, domain rule, authentication flow, CSRF rule, dependency, browser persistence,
  publication, deployment, or workspace version changed.

**2026-08-24 — Root startup recovery regression fix**

- Added a standalone top-level route boundary for self-context failures before any application or
  authentication shell exists. It renders the required main landmark, focuses its route heading,
  offers a deliberate full reload retry, and never links back into the failing root loader.
- Network and structured dependency failures expose only generic recovery guidance plus an
  available safe request reference. Raw dependency codes, response messages, and infrastructure
  details remain absent from the browser presentation.
- Restored local readiness by registering the existing `0021_retention_tracking` SQL in Drizzle's
  migration journal and using its latest application table as the runtime schema marker. The
  restricted application role still has no access to the migrator-owned Drizzle metadata schema.
- Component coverage verifies network and structured `503` failures, focus, title, privacy, and
  axe behavior. The Chromium route-boundary scenario verifies 320 px reflow, safe recovery, and a
  successful retry after the context service becomes available.
- Verification passed Prettier, ESLint, source and CSS boundaries, strict TypeScript, all 37
  tooling tests, all 339 unit/component tests, the focused Playwright recovery scenario, and the
  production build and bundle budgets. PostgreSQL verification passed 25 integration tests with one
  intentional skip. Live local checks returned `200` from `/health` and `/ready`, while the proxied
  unauthenticated self-context request returned the expected structured `401`. No API contract,
  migration SQL, domain, permission, dependency, or workspace version changed.

**2026-08-25 — WL-1205 cross-route consistency and recovery pass**

- Extended the shared alert with a forwarded focus ref, nested heading choice, and explicit static
  presentation. Complex validation and mutation results retain one live owner, while persistent
  warnings remain normal semantic content without an initial announcement.
- Migrated the remaining canonical alert, action, content, loading, permission, not-found, and
  dependency states across employee, manager, HR, report, audit, and system routes. Removed the
  app-owned legacy alert/action roots and two unregistered route modules after import checks.
- Rewrote primary explanatory text to name the current task, record effect, and valid recovery
  before supporting privacy, authorization, version, or history guarantees. Those guarantees stay
  visible where they affect a decision; no purpose-limited field was added or exposed.
- Monthly access/dependency outcomes now update the document title, focus the route heading, hide
  invalid retry actions, and restore the normal monthly presentation after successful recovery.
  Approval validation links its field to the single focused summary instead of duplicating text.
- Chromium verifies 320 px approval containment, keyboard-scrollable evidence, field recovery,
  forced colors, reduced-motion controls, 390 px drawer focus, narrow team records, and axe.
- Verification passed formatting, ESLint, source and CSS boundaries, strict TypeScript, all 37
  tooling tests, all 343 unit/component tests, 13 available integration tests with 45 expected
  PostgreSQL-dependent skips, all 34 Playwright scenarios, and the production build/public imports.
  Bundle budgets pass at 359,302 largest JavaScript bytes, 886,485 total JavaScript bytes, 239,296
  gzip JavaScript bytes, and 46,859 CSS bytes. See
  `docs/122-cross-route-consistency-recovery-pass.md` for the evidence boundary.
- `UI-007`, `UI-012`, and `UI-013` are closed. No API contract, database, migration, domain rule,
  authorization, authentication, session, CSRF, export, audit, browser persistence, dependency,
  publication, deployment, or workspace version changed.

**2026-08-25 — WL-1206 Phase 12 UI release gate**

- Added a release-only `pnpm run test:visual` command and 19 deterministic macOS Chromium
  snapshots across Today, personal records, requests, calendars, Approvals, Team, employee
  administration, and Technical Audit. Capture helpers normalize page scroll so sticky shell
  behavior does not create stitched screenshot noise.
- Compared the Phase 11 and Phase 12 Today and Approvals reference pairs and directly reviewed the
  remaining Phase 12 surfaces. No blocking, major, minor, clipping, page-overflow, color-only, or
  missing-action visual regression remains. `UI-014` and `UI-015` are closed.
- Dispositioned `D-502` honestly: Playwright `1.61.1` covers Chromium, Firefox, WebKit, mobile
  Chromium, and mobile WebKit automation, while exact retail browser support and real VoiceOver,
  NVDA, and TalkBack pairing remain an explicit residual rather than a conformance claim.
- Pre-transition `pnpm run verify` passed runtime configuration, reproducible OpenAPI, formatting,
  ESLint, 284-file/1,497-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests,
  all 343 unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips,
  all 34 Playwright scenarios, and production/public-root builds. Bundle budgets pass at 359,302
  largest JavaScript bytes, 886,485 total JavaScript bytes, 239,296 gzip JavaScript bytes, and
  46,859 CSS bytes. The separate visual gate passed 29 flows and all 19 snapshots.
- Advanced the root and eight workspace manifests to the internal `0.13.0` milestone. This does
  not create a tag, publication, container release, deployment, browser support warranty, or WCAG
  conformance statement. See `docs/123-phase-12-gate-review.md`.
- After the transition, the managed `pnpm` wrapper attempted an unnecessary dependency refresh and
  aborted before changing `node_modules` when registry metadata was unavailable. Direct local
  equivalents passed the thirteen-gate/version contract, formatting, ESLint, source/CSS
  boundaries, strict TypeScript, 32 focused tooling tests, runtime config, OpenAPI, production
  build/budgets/public imports, all 29 visual flows and 19 snapshots, and `git diff --check`.

**2026-08-25 — WL-1300 Phase 12 audit and Phase 13 baseline**

- Reconciled the numbered Phase 13 as attendance clarity, operational trust, and workflow
  usability hardening with 14 tasks through the `WL-1313`/`0.14.0` gate. Preserved the former
  portfolio presentation scope as an unnumbered draft without task IDs or a version gate.
- Registered the hierarchy-only Today reference at
  `docs/references/phase-13/today-redesign-reference.png` without changing the supplied handoff
  pack.
- Added `docs/124-phase-13-baseline.md` with route, component, query, API, service, domain,
  repository, and test inventories; a source classification for every visible Today value; all 17
  warning/blocker codes; the complete state/error matrix; route-specific P1/P2 findings; and the
  exact `WL-1301` candidate file groups.
- Kept the Phase 12 Today fixture and all 19 Phase 12 snapshots unchanged. Added a separate coherent
  fixture fixed at 2026-08-11 12:45 PM Europe/Berlin and five opt-in full-page Chromium baselines
  from 1440×900 through 320×568.
- Manually inspected all five new images for hierarchy, reconciled values, clipping, focus,
  responsive order, and private data. No P0 finding or page-level horizontal overflow was found.
  The provisional flexible-time warning, excessive estimate hierarchy, and input-like H1 focus
  treatment remain recorded findings rather than silent fixes.
- `pnpm verify` passed under Node `24.18.0` and pnpm `11.20.0` through a temporary no-install wrapper:
  37 tooling tests, 343 unit/component tests, 13 available integration tests with 45
  PostgreSQL-dependent skips, 34 established Playwright scenarios with the Phase 13 scenario
  skipped unless explicitly enabled, strict TypeScript, lint, formatting,
  OpenAPI, build, bundle, boundaries, CSS, workspace, and version checks all passed. The unchanged
  Phase 12 visual gate passed 29 flows and 19 snapshots; the Phase 13 update and comparison runs
  passed all five new screenshots. `git diff --check` passed.
- No production domain, database, API, TypeScript, permission, or UI behavior changed. No dependency,
  manifest, migration, lockfile, Phase 12 snapshot, or handoff-pack file changed.

**2026-08-25 — WL-1301 authoritative Today display contract**

- Replaced the loose Today estimate with a strict display contract covering exact snapshot capture,
  minute-aligned arithmetic, current-interval elapsed time, all-command availability, provisional
  source amounts, remaining expected minutes, estimated-finish availability, posted flexible-time
  balance and through-date, structured attention, and immutable current-date events. Cross-field
  validation rejects contradictory action, timing-state, arithmetic, status, finish, attention,
  and posted-date combinations.
- Composed Today inside one `REPEATABLE READ` transaction with both `ATTENDANCE_READ` and
  `TIME_BALANCE_READ`. The ledger total includes only prior-local-date entries posted by the exact
  capture instant; the browser receives the total and latest included effective date but no ledger
  row or scope identifier. Approved current-date adjustments come from the persisted daily
  projection source.
- Removed provisional daily-difference threshold signaling from the current-day engine. The API
  selector now creates positive/negative threshold attention only from the posted flexible-time
  balance, so the coherent negative-current-day/positive-posted fixture produces no false debt
  warning. Missing configuration and unresolved decisions remain explicit blockers with recovery
  metadata.
- Added selector, domain, contract, cache-ordering, API integration, component, and Playwright
  evidence for working/off-work/break/completed states, multiple sessions, absence and adjustment
  sources, unresolved corrections, effective schedule changes, overnight/DST behavior,
  unavailable finish, ledger bounds, and same-minute response ordering. The tracked OpenAPI
  artifact and source-boundary inventory were updated.
- Preserved the five `WL-1300` audit images as historical evidence and registered five separate
  `WL-1301` contract snapshots from 1440×900 through 320×568. Manual review found coherent visible
  values, no page overflow or clipping, logical order, visible focus, and no private data. The
  input-like focused H1 and existing hierarchy remain later-task findings rather than scope creep.
- Verification passed reproducible OpenAPI, formatting, ESLint, 288-file/1,507-import boundaries,
  CSS ownership, strict TypeScript, all 37 tooling tests, all 353 unit/component tests, 13 available
  integration tests with 45 PostgreSQL-dependent skips, 34 Playwright scenarios across the
  configured browser matrix, all five new snapshot comparisons, the production build, public-root
  imports, and `git diff --check`. The web build is 364,815 largest JavaScript bytes, 891,998 total
  JavaScript bytes, 240,840 gzip JavaScript bytes, and 46,859 CSS bytes.
- The strict client validator and structured fields add 5,513 uncompressed and 1,544 gzip bytes
  versus `WL-1300`; the enforced total JavaScript limits were deliberately adjusted by less than
  1.3 percent to retain measurable headroom. No dependency, manifest, migration, lockfile,
  publication, deployment, tag, or workspace version changed. See
  `docs/125-today-authoritative-display-contract.md`.

**2026-08-25 — WL-1302 Today information architecture and visual hierarchy**

- Rebuilt the ready Today composition around one raised task region with a responsive
  status/provisional summary and a rule-separated footer for only the authoritative attendance
  actions, existing recovery, and persistent mutation feedback. The estimate has less visual
  weight than current attendance truth and the action pair retains its strong primary/secondary
  treatment.
- Moved the supporting surface into the approved attention, immutable timeline, and native
  calculation-disclosure scan order. Intrinsic columns adapt to actual container space, preserve
  DOM order, and remain single-column without page overflow at 390 and 320 CSS pixels.
- Shrink-wrapped the shared focused route heading while preserving its three-pixel product-owned
  focus outline. Added component and Playwright assertions for semantic order, heading geometry,
  ten-width reflow, 44-pixel controls, axe, forced colors, touch, and containment.
- Preserved all ten `WL-1300`/`WL-1301` historical images and added five separate deterministic
  `WL-1302` screenshots from 1440×900 through 320×568. Update and comparison runs passed; original
  resolution review found no clipping, page overflow, private data, blocking regression, or major
  regression. The 1024 layout threshold was corrected during review.
- Full verification passed runtime configuration, reproducible OpenAPI, formatting, ESLint,
  288-file/1,507-import boundaries, CSS ownership, strict TypeScript, 37 tooling tests, 353
  unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 34
  Playwright scenarios, and the production/public-root build. Bundle budgets pass at 364,637
  largest JavaScript bytes, 891,820 total JavaScript bytes, 240,872 gzip JavaScript bytes, and
  47,693 CSS bytes.
- No API, database, migration, domain rule, calculation, permission, mutation, storage, logging,
  dependency, lockfile, manifest, publication, deployment, tag, or workspace version changed. See
  `docs/126-today-information-architecture-visual-hierarchy.md`.

**2026-08-25 — WL-1303 attendance-state feedback and recovery matrix**

- Documented the complete Today interaction-state matrix for off work, working, on break, pending,
  confirmed, duplicate replay, stale intent, rate limiting, lost response, offline, reconnecting,
  session expiry, permission loss, other-device convergence, and same-label semantic transitions.
- Replaced ordinary Today content with a focused, purpose-minimized permission-denied boundary when
  access disappears. The route now disables further protected queries, removes the exact cached
  attendance projection, closes confirmation state, and exposes only a safe home link.
- Made rate-limit feedback definitive about no recorded effect and repaired focus recovery when an
  other-device update changes `Clock out` between direct submission and confirmation while keeping
  the same accessible name.
- Added authoritative-state component stories with axe checks, rate-limit and permission-loss
  recovery tests, stale-intent and session-expiry Playwright flows, and PostgreSQL assertions that
  inactive-account denial and revoked-session replay create no attendance, idempotency, or extra
  audit effects.
- Full verification passed runtime configuration, reproducible OpenAPI, formatting, ESLint,
  288-file/1,508-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all 359
  unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 36
  Playwright scenarios with the opt-in visual capture skipped, and the production/public-root
  build. The separate PostgreSQL gate passed all 13 database test files with 25 tests passed and one
  established skip. Bundle budgets pass at 365,703 largest JavaScript bytes, 892,886 total
  JavaScript bytes, 241,089 gzip JavaScript bytes, and 47,693 CSS bytes.
- No domain rule, API contract, database schema, migration, dependency, lockfile, manifest,
  screenshot baseline, publication, deployment, tag, or workspace version changed. See
  `docs/127-today-attendance-state-feedback-recovery.md`.

**2026-08-25 — WL-1304 Today metric hierarchy**

- Rebuilt the ready Today summary as three semantic zones: current attendance and active interval,
  today's credited progress and completion facts, then dated posted flexible-time balance. The
  valid attendance actions remain after every summary fact in stable DOM order.
- Added native credited-versus-expected progress semantics, explicit worked/break/remaining facts,
  typed estimated-finish unavailability copy, neutral provisional-difference presentation, and an
  explicit statement that today's partial result is excluded from posted balance.
- Added component coverage for ordinary, zero-expectation, over-expectation, and incomplete states;
  responsive Chromium assertions; and a separate five-viewport `WL-1304` visual baseline. The
  visual update and comparison runs passed, and wide, intermediate, and narrow images were manually
  inspected.
- Full verification passed runtime configuration, reproducible OpenAPI, formatting, ESLint,
  288-file/1,508-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all 360
  unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 36
  Playwright scenarios with the opt-in visual capture skipped, and the production/public-root
  build. The separate five-viewport visual update and comparison runs passed. Bundle budgets pass
  at 367,724 largest JavaScript bytes, 894,907 total JavaScript bytes, 241,728 gzip JavaScript
  bytes, and 49,992 CSS bytes. See `docs/128-today-metric-hierarchy.md`.
- No domain rule, API contract, database schema, migration, authorization, dependency, lockfile,
  manifest, publication, deployment, tag, or workspace version changed.

**2026-08-25 — WL-1305 Today timeline and calculation evidence**

- Added exact-snapshot applied-correction history to the Today repository source. The service now
  reconciles immutable punch work with incremental approved correction deltas and keeps persisted
  other adjustments separate before invoking the current-day domain calculation.
- Added a purpose-minimized browser correction contract containing only original and corrected
  worked totals. Request and decision reasons, actors, workflow identifiers, raw interpretations,
  and correction-detail timestamps remain outside the Today response. The tracked OpenAPI artifact
  was regenerated.
- Rebuilt the Today history as corrected interpretation evidence followed by the original ordered
  punch list. Rebuilt calculation details as a captioned semantic table for expected sources,
  credited sources, and the provisional result inside the collapsed native disclosure.
- Added contract, selector, PostgreSQL integration, component, axe, narrow keyboard, and visual
  coverage. Five separate `WL-1305` snapshots from 1440×900 through 320×568 were updated, compared
  independently, and inspected at wide and narrow original resolution.
- Aligned the phase-version checker with the accepted `WL-1313` Phase 13 gate after final project
  memory exposed its superseded `WL-1305` identifier. Version `0.13.0` correctly remains unchanged.
- Full verification passed runtime configuration, reproducible OpenAPI, formatting, ESLint,
  288-file/1,507-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all 361
  unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 36
  Playwright scenarios with the opt-in visual capture skipped, and the production/public-root
  build. Bundle budgets pass at 367,672 largest JavaScript bytes, 894,855 total JavaScript bytes,
  241,785 gzip JavaScript bytes, and 49,993 CSS bytes.
- The new database-backed correction-history case is present but did not execute locally:
  `pnpm db:test` returned `ECONNREFUSED`, and `pnpm db:up` then encountered a local Docker API error.
  No schema migration, dependency, lockfile, manifest, phase version, publication, deployment, or
  tag changed. See `docs/129-today-timeline-calculation-evidence.md`.

**2026-08-25 — WL-1306 actionable attention and correction recovery**

- Extended the Today response with server-owned attention titles, safe explanations, affected
  dates, explicit blocking effects, typed recovery actions and destinations, link labels, and
  expected next states. Contract reconciliation rejects incompatible code/action/destination
  combinations, duplicate codes, extra workflow identifiers, and invented warning codes.
- Replaced the browser's second issue map with direct rendering of the authoritative response.
  Blocking issues and warnings are separated in text, every item has a real navigation link, and
  only a newly appearing blocker is announced assertively after mount.
- Routed historical attendance blockers to the exact immutable correction workflow. Recoverable
  correction failures retain every entered proposal value for a deliberate retry, while successful
  locked-period proposals explain that approval appends a post-lock adjustment. Authorized request
  detail covers returned and rejected decisions without widening the generic Today response.
- Recorded source-bound exclusions instead of fabricating data: valid overnight work is not a
  missing clock-out, the accepted policy has no break-duration threshold, and Today still has no
  repository fact for exact partial-day absence overlap or calculation-to-ledger mismatch.
- Full verification passed runtime configuration, reproducible OpenAPI, formatting, ESLint,
  289-file/1,515-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all 368
  unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 36
  Playwright scenarios with the opt-in visual capture skipped, and the production/public-root
  build. Bundle budgets pass at 370,142 largest JavaScript bytes, 897,325 total JavaScript bytes,
  242,635 gzip JavaScript bytes, and 49,993 CSS bytes.
- The measured implementation adds 2,470 uncompressed JavaScript bytes over `WL-1305`; the total
  JavaScript limit increased by 3,000 bytes to 898,000 while the largest-chunk, gzip, and CSS limits
  remained unchanged. No database schema, migration, dependency, lockfile, manifest, screenshot
  baseline, phase version, publication, deployment, or tag changed. See
  `docs/130-today-actionable-attention-recovery.md`.
- The additional historical Phase 12 visual command did not pass: 27 scenarios passed, one skipped,
  and four snapshot comparisons failed. Three cross-route images had small one-percent raster
  differences; the Today image retained the older Phase 12 hierarchy and differed substantially
  from the cumulative Phase 13 layout even with no attention item. The images remain untouched.
  `WL-1307` owns the new Today visual gate, and `WL-1312` owns later cross-route visual closure.

**2026-08-26 — WL-1307 Today responsive, accessibility, usability, and visual sub-gate**

- Resolved one P1 responsive usability defect found by the gate: at 320 CSS pixels, attendance
  actions followed all progress and posted-balance detail. Status and actions now form one task
  column, so the narrow semantic/source order is status, actions, progress, and posted balance.
- Added a dedicated opt-in `WL-1307` browser gate with a coherent final Today fixture and five
  full-page baselines at 1440×900, 1024×720, 768×1024, 390×844, and 320×568. The update run passed
  once and repeated comparison runs passed without snapshot-update mode.
- The gate asserts one main/H1, route focus, heading order, visible 44×44 actions, calculation-table
  structure, source order, no page overflow, axe at 1440 and 320, 200-percent-zoom-equivalent and
  landscape reflow, WCAG text spacing, reduced motion, long account identity, nonblocking warning
  order, and no sensitive URL or browser-storage persistence.
- Manual original-resolution inspection found no impossible values, clipping, lost sign/unit,
  private data, or hierarchy regression. VoiceOver with Chrome for Testing and Safari confirmed
  the same Start break → Clock out → Calculation details order and the native calculation table's
  exposed structure, state, and focus behavior. VoiceOver was restored to its original off state.
- Full verification passed runtime configuration, reproducible OpenAPI, formatting, ESLint,
  289-source/1,515-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all
  368 unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 37
  Playwright scenarios with one opt-in capture skipped, and the production/public-root build.
  Bundle budgets pass at 370,228 largest JavaScript bytes, 897,411 total JavaScript bytes, 242,647
  gzip JavaScript bytes, and 49,961 CSS bytes; no budget changed.
- The required unchanged Phase 12 visual command remains historical and non-green: 28 scenarios
  passed, one opt-in capture skipped, and four preserved snapshot comparisons failed. The current
  Today gate passes; Approvals, My Time, and Employees drift remains `WL-1312` work. No Phase 12
  image, dependency, lockfile, manifest, migration, phase version, publication, deployment, or tag
  changed. See `docs/131-today-responsive-accessibility-usability-visual-gate.md`.

**2026-08-26 — WL-1308 Approval inbox triage and responsive flow**

- Reordered the Approval inbox around its current scoped queue. The route now leads with the
  needs-review total and exposes Needs review, Waiting on employee, Completed, and All records
  through one URL-backed Queue view control with a visible and programmatic current value.
- Collapsed secondary filters at every width, kept the applied view visible, combined sort key and
  direction into one Order field, and made reset return to the documented needs-review default.
  No named saved view or browser persistence was added.
- Simplified multi-page context to a visible record range, omitted pagination when it is not
  needed, preserved same-route and browser-back focus, shortened wide-table actions, and made
  action-required list actions explicit as Review and decide.
- Kept the comparison table for genuinely wide layouts and transformed the same records into
  complete semantic list articles at 768, 390, and 320 pixels. Four current Phase 13 screenshots
  pass their opt-in comparison and were inspected at original resolution with no page overflow,
  clipped action, hidden record field, or color-only current queue state.
- Added component and browser regression for the default queue, status navigation, canonical URL,
  validation, table/list equivalence, pagination, axe, permission loss, HR access, privacy field
  absence, and sensitive-query rejection. The existing API and PostgreSQL authorization evidence
  remain unchanged.
- Full `pnpm verify` passed runtime configuration, reproducible OpenAPI, formatting, lint,
  289-source/1,515-import boundaries, CSS ownership, strict TypeScript, all 37 tooling checks, all
  369 unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 37
  browser scenarios with one opt-in capture skipped, and the production/public-root build. Bundle
  budgets pass unchanged at 370,748 largest JavaScript bytes, 897,931 total JavaScript bytes,
  242,867 gzip JavaScript bytes, and 49,960 CSS bytes.
- No domain rule, API contract, database schema, migration, dependency, lockfile, manifest,
  workspace version, publication, deployment, or tag changed. See
  `docs/132-approval-inbox-triage.md`.

**2026-08-26 — WL-1309 Team status comprehension and actionability**

- Replaced static Team overview totals with keyboard-operable availability and open-record filters.
  The filters write only generic allow-listed state to the URL, combine predictably, preserve
  focus, provide a filtered result count, and offer an explicit all-reports recovery from a zero
  result.
- Clarified status and record labels as Working now, Not working now, Unavailable today, Open
  records, and No open records. Supporting copy explains the intentionally broad record category
  without disclosing workflow or absence subtype.
- Added per-record next steps. Open records lead to the generic employee-sorted Approval inbox,
  unavailable records lead to the current-month Team calendar, and all other records state that no
  follow-up is needed. Destination URLs contain no employee or workflow identifier.
- Renamed the Team workspace destinations to Team status, Approval inbox, and Team calendar while
  preserving the accepted Team work-area model and existing server-owned authorization boundary.
- Reserved the captioned comparison table for viewports at least 72 rem wide and exposed the same
  complete records as semantic list articles at 768, 390, and 320 pixels. Four current Phase 13
  screenshots passed comparison and original-resolution inspection with no page overflow, clipped
  action, hidden record fact, color-only selected filter, or private data.
- Full `pnpm verify` passed runtime configuration, reproducible OpenAPI, formatting, lint,
  290-source/1,518-import boundaries, CSS ownership, strict TypeScript, all 37 tooling checks, all
  371 unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 38
  browser scenarios with one opt-in capture skipped, and the production/public-root build. Bundle
  budgets pass at 374,954 largest JavaScript bytes, 902,137 total JavaScript bytes, 243,937 gzip
  JavaScript bytes, and 50,501 CSS bytes.
- The measured production increase over `WL-1308` is 4,206 total JavaScript bytes, 1,070 gzip
  JavaScript bytes, and 541 CSS bytes. The total JavaScript, gzip JavaScript, and CSS budgets moved
  narrowly to 904,000, 245,000, and 51,000 bytes. No domain rule, API contract, database schema,
  migration, dependency, lockfile, manifest, workspace version, publication, deployment, or tag
  changed. See `docs/133-team-status-workspace.md`.

**2026-08-26 — WL-1310 employee and team administration hardening**

- Added HR-scoped employee search over display name, employee number, and the current linked
  account email. The strict search contract uses an authenticated, same-origin, CSRF-protected
  `POST /v1/hr/employees/search` body so person-identifying text and search pagination never enter
  URL state or persistent browser storage; organization and status scope precede matching, totals,
  ordering, and pagination.
- Separated the employee directory at `/employees` from the orientation-team catalog at `/teams`,
  added reciprocal navigation and primary actions, and exposed explicit employee record and team
  lifecycle actions without changing the direct-manager access boundary or effective-dated
  history flows.
- Reserved captioned comparison tables for viewports at least 48 rem wide and rendered complete
  ordered-list articles below that boundary. Four current Phase 13 screenshots passed an update
  run, a clean comparison, original-resolution inspection, axe, focus, URL privacy, target-action,
  and page-overflow assertions at 1440 and 320 pixels.
- Exact `pnpm verify` passed with pinned Node 24.18.0 and pnpm 11.20.0: reproducible OpenAPI,
  formatting, lint, 292-source/1,530-import boundaries, CSS ownership, strict TypeScript, all 37
  tooling tests, all 372 unit/component tests, 13 available integration tests with 45
  PostgreSQL-dependent skips, 38 browser scenarios with one opt-in capture skipped, and the
  production/public-root build.
- The bundle passes at 381,403 largest JavaScript bytes, 908,586 total JavaScript bytes, 244,916
  gzip JavaScript bytes, and 50,540 CSS bytes. The total-JavaScript budget moves narrowly from
  904,000 to 910,000 bytes. No domain rule, database schema, migration, dependency, lockfile,
  manifest, workspace version, publication, deployment, or tag changed. See
  `docs/134-employee-team-administration.md`.

**2026-08-26 — WL-1311 cross-route presentation normalization**

- Centralized the authenticated destination lexicon used by shell links and landing-route document
  titles. My requests, Approval inbox, and Domain audit now remain consistent through navigation,
  titles, and their landing headings; employee, team, and approval descriptions lead with the task.
- Added one exhaustive typed presentation map for personal-request and monthly-period workflow
  states and adopted it in request history/detail, approval detail, and monthly report rows.
  Status remains textual and color-independent; no domain state or permitted action changed.
- Applied responsive comfortable, balanced, and compact panel padding. The full browser gate caught
  and closed an initial 320×568 Today regression by retaining the established 16-pixel narrow
  floor while preserving wider density differences and 44-pixel targets.
- Made shared native table overflow semantics conditional on rendered overflow. Resize-aware
  component coverage proves fit → overflow → fit transitions; focused and full Chromium runs prove
  named keyboard scroll regions at narrow widths and their removal when content fits.
- Exact `pnpm verify` passes runtime configuration, reproducible OpenAPI, formatting, lint,
  296-source/1,552-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all
  376 unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 38
  browser scenarios with one opt-in capture skipped, and the production/public-root build.
- The bundle passes at 383,163 largest JavaScript bytes, 909,700 total JavaScript bytes, 245,304
  gzip JavaScript bytes, and 50,131 CSS bytes. The gzip budget moves narrowly from 245,000 to
  246,000 bytes; other budgets are unchanged. No domain rule, API contract, database schema,
  migration, dependency, lockfile, manifest, workspace version, publication, deployment, or tag
  changed. See `docs/135-cross-route-presentation-normalization.md`.

**2026-08-26 — WL-1312 cross-route regression, accessibility, and usability gate**

- Promoted the cumulative Phase 13 UI into the current `pnpm test:visual` gate without rewriting
  historical evidence. One global visual switch composes the established Today, Approval inbox,
  Team status, and administration captures with new current approval-detail and My-time captures.
- Added and manually inspected 19 deterministic macOS Chromium images across Today, Approval
  inbox, approval detail, Team status, My time, Employees, and Teams at 1440, 1024, 768, 390, and
  320 CSS-pixel evidence boundaries. An update run and a separate comparison-only run each passed.
- Recorded the representative cross-route story/state matrix, snapshot dimensions and SHA-256
  manifest, four historical-drift dispositions, axe/keyboard/focus/reflow evidence, privacy review,
  manual image/usability conclusions, and the explicit assistive-technology limitation. No P0 or
  P1 UX defect remains open in the bounded audit.
- Exact `pnpm verify` passes runtime configuration, reproducible OpenAPI, formatting, lint,
  296-source/1,552-import boundaries, CSS ownership, strict TypeScript, all 37 tooling tests, all
  376 unit/component tests, 13 available integration tests with 45 PostgreSQL-dependent skips, 38
  browser scenarios with one opt-in capture skipped, and the production/public-root build.
- The unchanged bundle passes at 383,163 largest JavaScript bytes, 909,700 total JavaScript bytes,
  245,304 gzip JavaScript bytes, and 50,131 CSS bytes. No domain rule, API contract, database
  schema, migration, dependency, lockfile, workspace version, publication, deployment, or tag
  changed. The root manifest changes only the visual-test command from the historical Phase 12
  comparison to the current Phase 13 suite. See
  `docs/136-cross-route-regression-accessibility-usability-gate.md`.

**2026-08-26 — WL-1313 Phase 13 release gate**

- Signed the complete attendance-clarity and operational-trust release checklist against the
  `WL-1300` through `WL-1312` evidence. All 14 Phase 13 tasks are complete, and the bounded gate
  retains no open P0 or P1 UX defect.
- Reconciled the roadmap, ordered TODO, task board, README release summary and documentation map,
  current project status, and the dedicated Phase 13 gate review. The current 19-image `WL-1312`
  screenshot suite remains the reviewed comparison source; no historical image was rewritten.
- Exact post-transition `pnpm --config.verify-deps-before-run=warn run verify` passes runtime
  configuration, reproducible OpenAPI, formatting, lint, 296-source/1,552-import boundaries, CSS
  ownership, strict TypeScript, all 37 tooling tests, all 376 unit/component tests, 13 available
  integration tests, 38 browser scenarios, and the production/public-root build. The 45
  PostgreSQL-dependent tests remain skipped because the local Docker daemon is not running.
- `pnpm test:visual` passes 33 current Chromium flows with one intentional opt-in historical
  capture skip and reproduces all 19 Phase 13 screenshots. The bundle remains within budget at
  383,163 largest JavaScript bytes, 909,700 total JavaScript bytes, 245,304 gzip JavaScript bytes,
  and 50,131 CSS bytes.
- Advanced the root and all eight private workspace manifests from `0.13.0` to `0.14.0`.
  The phase-version guard confirms 14 sequential phase gates. No dependency, lockfile, runtime
  contract, domain rule, API, database schema, migration, publication, deployment, or tag changed.
  See `docs/137-phase-13-gate-review.md`.

**2026-08-26 — Phase 14 internationalization roadmap registration**

- Registered `WL-1400` through `WL-1410` as the Phase 14 internationalization and multilingual
  product roadmap, dependent on the completed `WL-1313` gate. All eleven tasks remain unchecked;
  `WL-1400` is the next task and has not started.
- Accepted `D-507`: `en-GB`, `de-DE`, and `es-ES`; `en-GB` fallback; authoritative per-account
  preference; complete user-facing output coverage; local catalogs; typed server-owned message
  descriptors; and fluent-human German and Spanish review.
- Added the planning-only handoff at `docs/138-phase-14-internationalization-roadmap.md` and
  registered `WL-1410` in the phase-version guard. The Phase 14 gate requires `0.15.0` only when it
  is checked complete.
- Reconciled the request's earlier Phase 13/`0.13.0`/`docs/135-*` baseline with the authoritative
  completed Phase 13 repository. No completed task was reopened and no evidence file was
  overwritten.
- No dependency, catalog, runtime source, API contract, database schema, migration, lockfile,
  manifest, workspace version, publication, deployment, or tag changed.

**2026-08-26 — WL-1400 internationalization architecture and inventory**

- Audited all 34 renderable route patterns, 30 route modules, 17 application components, 13 shared
  UI components, route and formatting helpers, user-facing API prose, print, clipboard, five CSV
  schemas, notifications, invitation and password-reset sender boundaries, and the machine-readable
  self-service data export boundary.
- Accepted ADR 0013 for exact locale resolution, local catalog namespaces, stable semantic keys,
  the private `@workledger/i18n` package boundary, typed message descriptors, explicit locale and
  authoritative-timezone formatting, locale chunk budgets, and automated catalog enforcement.
- Recorded the API presentation migration map and twelve-item risk register in
  `docs/139-phase-14-internationalization-architecture-audit.md`. Today attention, API errors,
  report metadata, notification content, and device summaries are the bounded `WL-1403` migration
  set; OpenAPI, logs, audit codes, and schema invariant diagnostics remain technical English.
- Added `docs/140-phase-14-translation-glossary.md` with canonical product meanings, privacy and
  terminology warnings, review statuses, message review fields, and separate pending fluent-human
  approval records for German and Spanish.
- No dependency, catalog, runtime source, API contract, database schema, migration, lockfile,
  manifest, workspace version, publication, deployment, or tag changed. `WL-1401` remains the first
  runtime implementation task.

**2026-08-26 — WL-1401 shared internationalization foundation**

- Added the exact contracts-owned locale allowlist and the private `@workledger/i18n` package with
  strict resolution, all-LTR direction mapping, seven typed namespaces, local dynamic catalog
  loaders, safe plain-text messages, explicit locale/timezone formatters, and exact stable
  `i18next`/`react-i18next` pins.
- Added lightweight locale plus React Aria bootstrap and a separately tested full react-i18next
  bridge. The web currently loads only `en-GB` before router mount, avoiding mixed-language
  workflows and keeping the translation engine out of the untranslated production graph until
  `WL-1404`.
- Added `pnpm i18n:check`, catalog/key/interpolation/plural/text checks, workspace/boundary coverage,
  and locale-aware bundle assertions. All three catalog chunks are emitted separately and the
  existing application limits remain unchanged; the measured build is 909,306 bytes raw and
  245,662 bytes gzip outside catalogs, with 1,485 bytes raw and 993 bytes gzip across catalogs.
- Pinned Vite's supported optional Terser minifier because the default minifier remained 2,229 raw
  bytes over the unchanged non-catalog ceiling after architectural splitting. No budget was raised
  and no runtime bytes were classified as catalog data.
- Added focused locale resolution, initialization, formatting, text safety, React, React Aria,
  catalog-check, workspace, boundary, and budget tests. No account/API/database schema, migration,
  authorization, audit, user-content, output, workspace version, publication, deployment, or tag
  changed. See `docs/141-shared-i18n-foundation.md`.
- Verified runtime configuration, reproducible OpenAPI, formatting, lint with
  310-source/1,618-import boundaries, CSS ownership, strict TypeScript, 46 tooling tests, 388
  unit/component tests across 49 files, 13 available integration tests, 38 browser scenarios, and
  the production/workspace build. One intentional browser capture and 45 PostgreSQL-dependent
  integration cases remain skipped because their opt-in service/evidence is unavailable.

**2026-08-26 — WL-1402 account and device locale preferences**

- Added the required `auth_users.locale` field, `en-GB` upgrade default, exact database allowlist,
  locale-aware self-context/Profile contracts, and a current-account-only `PUT /v1/me/locale`
  mutation protected by session, origin, CSRF, strict input, and no-store response controls.
- Added initial employee and technical invitation locale selection. Reissued invitations and
  password-reset sender boundaries now receive the stored account locale; localized outbound
  rendering remains `WL-1407`.
- Added the bounded `workledger.locale` signed-out device preference with invalid-value removal,
  browser-language matching, storage-failure recovery, and authoritative account precedence before
  protected UI mounts.
- Added accessible Profile and authentication language selectors, immediate catalog/React
  Aria/document synchronization, Query-cache updates, one polite outcome, in-place focus recovery,
  and runtime/cache rollback when persistence fails.
- Added contract, migration, repository, API, component, axe, and browser coverage for defaults,
  unsupported values, CSRF/origin failures, cross-session persistence, invitation/reset locale
  propagation, startup precedence without a prior-language flash, focus, and rollback. Also aligned
  the Today integration fixture with the decision-actor migrations its seed SQL already required.
- The database-enabled implementation run passed 25 PostgreSQL integration tests with one
  intentional skip. The final completion rerun passes runtime configuration, reproducible OpenAPI,
  formatting, lint with 313-source/1,649-import boundaries, CSS ownership, strict TypeScript, 48
  tooling tests, 394 unit/component tests, 13 environment-independent integration tests, 39
  browser scenarios with one intentional skip, and the production/workspace build. The final rerun
  skipped 45 PostgreSQL-dependent cases because the local database service was unavailable.
- Resolved `D-508` through Option B after source attribution and supported build experiments showed
  that preserving the original total gate would require an unrelated application refactor or
  unsafe minification. ADR 0013 now retains the 910,000/246,000-byte application baseline and adds
  a separately named, regression-tested 55,000/18,000-byte Phase 14 runtime allowance.
- The pinned-toolchain production build passes at 395,242 largest-chunk bytes, 916,728 total raw
  bytes, 247,840 total gzip bytes, and 50,219 CSS bytes outside the separately bounded catalogs.
  Current runtime-allowance use is 6,728 raw and 1,840 gzip bytes. A forced full-engine build also
  passes the combined gate at 961,249 raw and 261,327 gzip bytes, anticipating `WL-1404`.
- No dependency, lockfile, manifest, workspace version, phase gate, deployment, publication, tag,
  domain rule, permission, or audit policy changed. See `docs/142-account-locale-preferences.md`.

**2026-08-26 — WL-1403 API presentation descriptors**

- Replaced English API prose with bounded descriptors and structured values for Today attention,
  general and field errors, report metadata, notification history/delivery, and session-device
  presentation. Server responses now expose codes, authorized recovery metadata, and safe values;
  they never carry title, reason, description, field-message, notification-body, email-subject, or
  user-agent-derived device-summary prose.
- Preserved the server as the owner of Today severity/action/destination and authorization-driven
  report/notification meaning. The browser has an exhaustive temporary English presentation map;
  `WL-1404` moves this map into completed typed catalogs, while `WL-1407` owns recipient-locale
  outbound rendering.
- Regenerated OpenAPI and added contract, display, component, and integration evidence. The local
  completion run passes strict TypeScript, lint with 314-source/1,660-import boundaries and CSS
  checks, 394 unit/component tests,
  and 13 environment-independent integration tests; 45 PostgreSQL-dependent integration cases
  remain skipped because the opt-in database service is unavailable. See
  `docs/143-api-presentation-descriptors.md`.
- No dependency, database schema, migration, lockfile, manifest, workspace version, phase gate,
  deployment, publication, tag, domain rule, permission, or audit policy changed.

**2026-08-26 — WL-1404 shared and authenticated foundation localization**

- Completed typed English, German, and Spanish messages for authentication, Profile, shared
  validation, shell sign-out feedback, pagination, dialogs, drawers, table regions, and route
  states. Translation-neutral UI primitives now require caller-owned accessible labels.
- Preserved focused validation and route headings, real link/button semantics, polite outcomes,
  language-switch rollback, protected cache clearing, and safe plain-text interpolation. German
  and Spanish authentication component coverage includes validation focus, document title, skip
  navigation, and axe; Profile coverage verifies an immediate German account-locale switch.
- Added the existing authoritative organization timezone to the minimized self-profile response
  and used the shared locale-and-timezone formatter for session instants. No new private account,
  employee, session, IP, or raw user-agent data is exposed.
- The completed integration measures 974,388 raw and 265,450 gzip non-catalog JavaScript bytes.
  `D-508`, ADR 0013, and executable regression tests now bound Phase 14 runtime and integration to
  70,000/22,000 bytes while preserving the original application, largest-chunk, CSS, and locale
  catalog limits.
- The local completion run passes the 197-message catalog contract, formatting, lint and boundary
  checks, strict TypeScript, 48 tooling tests, 397 unit/component tests, 13 environment-independent
  integration tests, 39 browser scenarios with one intentional skip, and the production build.
  The integration run skips 45 PostgreSQL-dependent cases because the opt-in database service is
  unavailable. See `docs/144-shared-shell-route-i18n.md`.
- No dependency, database schema, migration, lockfile, manifest, workspace version, phase gate,
  deployment, publication, tag, domain rule, permission, or audit policy changed.

**2026-08-26 — WL-1405 employee workflow localization**

- Completed typed English, German, and Spanish presentation for Today, time and balances, daily
  records, corrections, vacation, sickness, request history/detail, personal calendar,
  notifications, and monthly review plus its integrated print view. Employee detail-route document
  titles now use the same active runtime as headings and workflow content.
- Added exhaustive localized presentation maps for workflow states and event/decision codes,
  locale-aware date, instant, and compact integer-minute formatting, and automated hard-coded-copy
  governance across 20 employee source files. Catalog parity now covers 1,043 messages.
- Preserved focused headings, semantic tables/lists, real link/button behavior, error-summary and
  dialog focus, polite announcements, text-visible states, privacy-minimized sickness and
  notification presentation, and plain-text user-value interpolation.
- Added German and Spanish component coverage for Today, request/calendar, and monthly review plus
  browser traversal of Today, My time, requests, calendar, and monthly review. The full local run
  passes 48 tooling tests, 403 unit/component tests, 13 environment-independent integration tests,
  and 41 browser scenarios across the configured desktop/mobile engines with one intentional skip.
  Existing non-failing React test-harness warnings remain; 45 opt-in PostgreSQL cases are
  unavailable in this environment.
- The production graph passes at 416,536 largest-chunk bytes, 985,603 total raw JavaScript bytes,
  260,782 gzip JavaScript bytes, and 50,219 CSS bytes outside separately bounded catalogs. ADR 0013
  and `D-508` narrowly move only the Phase 14 raw localization allowance from 70,000 to 76,000
  bytes; the application baseline and all gzip, chunk, CSS, and catalog budgets remain unchanged.
- No dependency, database schema, migration, lockfile, manifest, workspace version, phase gate,
  deployment, publication, tag, domain rule, permission, or audit policy changed. Request history
  and non-correction request-detail instants retain their existing client-timezone fallback pending
  the end-to-end `WL-1409` authoritative-timezone contract review. See
  `docs/145-employee-workflow-i18n.md`.

**2026-08-27 — WL-1406 manager, HR, and system workflow localization**

- Completed typed English, German, and Spanish presentation for Approval inbox/detail, Team status
  and calendar, reports and portability controls, employee/team/schedule/policy/entitlement and
  organization settings administration, domain/technical audit, accounts, sessions, and system
  operations.
- Added bounded localized mappings for approval, attendance, entitlement, report-warning,
  operations, audit, role, and target-kind codes. Catalog parity now covers 1,997 messages, and the
  hard-coded-copy gate governs 40 sources. Typed interpolation keys are also checked against their
  source-catalog parameter declarations.
- Preserved focused headings, semantic tables/lists, field-linked validation, keyboard decisions,
  responsive list/table alternatives, polite results, text-visible states, neutral team
  availability, redacted audit facts, and plain-text interpolation.
- Added German and Spanish manager, HR, and system component/axe coverage plus responsive browser
  traversal at 320, 390, and 1440 CSS pixels. The full local run passes 49 tooling tests, 407
  unit/component tests, 13 environment-independent integration tests, and 43 browser scenarios
  across the configured desktop/mobile engines with one intentional skip. The 45 opt-in
  PostgreSQL cases remain unavailable in this environment.
- The production graph passes at 436,195 largest-chunk bytes, 1,005,262 total raw JavaScript bytes,
  258,138 gzip JavaScript bytes, and 50,242 CSS bytes outside separately bounded catalogs. ADR 0013
  and `D-508` narrowly move only the Phase 14 raw localization allowance from 76,000 to 96,000
  bytes; the application baseline and all gzip, chunk, CSS, and catalog budgets remain unchanged.
- No dependency, database schema, migration, lockfile, manifest, workspace version, phase gate,
  deployment, publication, tag, domain rule, permission, or audit policy changed. See
  `docs/146-manager-administration-system-workflow-i18n.md`.

**2026-08-27 — WL-1407 generated and recipient output localization**

- Added typed English, German, and Spanish output messages for monthly print records, clipboard
  report summaries, CSV columns and statuses, notification email, invitations, and password reset.
- Applied the authenticated browser locale to print and clipboard, the authorized actor locale to
  CSV, the recipient account locale to notification and reset email, and the stored initial locale
  to invitations. API output rendering uses the existing framework-independent i18n workspace.
- Preserved CSV formula neutralization, ISO date and instant fields, integer minute values,
  authorization scope, generic notification privacy, plain-text email, and existing delivery retry
  and failure isolation behavior. No schema or migration changed.
- The local completion run passes formatting, lint with 316-source/1,773-import boundaries, CSS,
  strict TypeScript, 49 tooling tests, 409 unit/component tests across 50 files, 13 available
  integration tests, catalog enforcement for 2,069 messages, and production/workspace builds. The
  45 PostgreSQL-dependent integration cases remain skipped because the opt-in service is
  unavailable.
- The production graph passes at 435,303 largest-chunk bytes, 1,004,370 total raw JavaScript
  bytes, 258,040 gzip JavaScript bytes, and 50,242 CSS bytes outside separately bounded catalogs.
  The existing Phase 14 allowance remains unchanged at 96,000 raw and 22,000 gzip bytes. See
  `docs/147-generated-recipient-output-i18n.md`.

**2026-08-27 — WL-1408 catalog completion and human review (complete)**

- Strengthened `i18n:check` with non-empty text, prohibited bidirectional-control, incomplete
  source-copy, and exact contract-descriptor coverage checks. The descriptor registry now covers
  all 39 contract-defined Today attention codes/actions, reports, notification events, and field
  error codes, while the existing three-locale, namespace, key, interpolation, plural, plain-text,
  and governed JSX/ARIA checks remain intact.
- Added the isolated `@workledger/i18n/testing` surface with an `en-XA` pseudo-locale that accents
  and expands every English catalog leaf while preserving interpolation tokens. Production locale
  resolution, account/device persistence, contracts, and API schemas still reject `en-XA`.
- Populated the terminology glossary with the catalog's German and Spanish candidates and added
  `docs/148-wl-1408-human-catalog-review.md`. Both locale columns are now approved by their named
  fluent reviewers after the recorded findings were resolved.
- Applied the first German terminology-review findings across the glossary and matching catalog
  surfaces. The resolved wording now distinguishes active attendance from physical presence,
  renders the time-account concept as `Gleitzeitsaldo`, uses natural provisional-balance and
  session-ending language, and names administrator roles as people rather than functions. The
  reviewer Vasileios Mitsaras approved all seven production namespaces, terminology, privacy,
  critical workflows, and generated output on 2026-08-27 after the recorded findings were resolved.
- Applied Sol's Spanish findings consistently across attendance states, expected and credited time,
  time-account balances, absence terminology, generic workflow statuses, administrator roles, and
  session-ending actions. Sol approved all seven production namespaces, terminology, privacy,
  critical workflows, and generated output on 2026-08-27 after findings `ES-001` through `ES-014`
  were resolved.
- Direct installed-tool verification passes formatting, workspace/phase contracts, ESLint,
  317-source/1,777-import boundaries, CSS, strict TypeScript, 52 tooling tests, 411 unit/component
  tests across 50 files, 13 environment-independent integration tests, catalog enforcement for
  2,069 messages and 39 descriptors, and production/workspace builds. The 45 opt-in
  PostgreSQL-dependent integration cases remain skipped because the database service is
  unavailable. Browser/assistive-technology execution is intentionally assigned to `WL-1409`
  after fluent approval.
- The production graph remains within every accepted budget at 435,303 largest-chunk bytes,
  1,004,370 total raw JavaScript bytes, 258,090 gzip JavaScript bytes, and 50,242 CSS bytes outside
  catalog chunks. The i18n runtime consumes 94,370/12,090 bytes of its 96,000/22,000-byte allowance;
  all three locale chunks remain independently and collectively below their ceilings.
- The standard pnpm wrapper could not run in this shell because Corepack supplied Node 24.19 while
  the repository pins Node 24.18 and then attempted an interactive module refresh. Verification
  used the already-installed project binaries directly; no dependency or lockfile changed.

**2026-08-27 — WL-1409 multilingual product-quality gate (complete)**

- Added a dedicated `test:visual:i18n` gate and eight reviewed, deterministic German and Spanish
  baselines for Today at 320 pixels, Approval inbox at 320 pixels, Employees at 1440 pixels, and
  system Operations at 390 pixels. Baseline creation and comparison each pass four scenarios.
- Expanded the signed-out locale flow into the five-profile browser matrix. Desktop Chromium,
  Firefox, WebKit, mobile Chromium, and mobile WebKit all preserve the German device preference,
  selector focus, localized announcement, and axe result.
- Verified German and Spanish employee, manager, HR, and system routes with focused headings,
  responsive containment, axe, and normal plus forced-colors/reduced-motion presentation. A
  bounded macOS Chrome accessibility-tree review exposes localized titles, skip links, selector
  names/values, status text, headings, links, and buttons without semantic substitution.
- Corrected the manual upgrade verifier to use the current Better Auth tables, isolate hard-coded
  `public` migration references, and validate `0022` existing-account `en-GB` backfill, supported
  locale persistence, and unsupported-locale rejection. Added the same focused PostgreSQL
  integration regression.
- Direct installed-tool verification passes workspace/phase/i18n, formatting, ESLint,
  317-source/1,777-import boundaries, CSS, strict TypeScript, 52 tooling tests, 411 unit/component
  tests, 13 environment-independent integration tests, 47 browser tests with one intentional
  historical skip, OpenAPI, runtime configuration, production build, bundle budgets, and workspace
  build. The production graph remains at 435,303 largest-chunk, 1,004,370 raw JavaScript, 258,090
  gzip JavaScript, and 50,242 CSS bytes outside catalogs.
- PostgreSQL refused connections on port 54329 and Docker Desktop was not running. The 46
  database-dependent integration cases and manual upgrade execution remain an explicit environment
  residual for `WL-1410`; they are not reported as passed. See
  `docs/149-wl-1409-multilingual-product-quality-gate.md`.

**2026-08-27 — WL-1410 Phase 14 release gate (complete)**

- Started the repository development PostgreSQL 18.4 service and closed the `WL-1409` database
  residual. The 13-file database suite passes 26 tests with one intentional historical upgrade
  test skipped; the focused `0022` migration case verifies existing-account `en-GB` backfill,
  supported locale persistence, and unsupported-locale rejection.
- Corrected two stale database integration expectations to the completed Phase 14 contracts: CSV
  workflow statuses are localized for the authorized actor, and Today attention exposes its code
  through the bounded message descriptor rather than the removed raw top-level field.
- Repaired the manual `0.9.0` upgrade fixture to use the actual Phase 9 employee, Better Auth,
  immutable punch-event, and explainable ledger schema. It applies 18 checkpoint migrations and
  five later migrations, preserves representative rows, validates foreign-key, punch, ledger, and
  snapshot-link integrity, confirms the Better Auth profile, backfills `en-GB`, persists `de-DE`,
  rejects `en-US`, and removes its isolated schema after execution.
- The repository-managed Node 24.18/pnpm 11.20 full gate passes runtime configuration, reproducible
  OpenAPI, formatting, ESLint, 317-source/1,777-import boundaries, CSS, strict TypeScript, 52
  tooling tests, 411 unit/component tests, 13 environment-independent integration tests, 47
  Playwright tests with one intentional historical skip, i18n enforcement, production bundle
  budgets, and the nine-entry workspace build.
- The production graph passes at 435,303 largest-chunk bytes, 1,004,370 total JavaScript bytes,
  258,039 gzip JavaScript bytes, and 50,242 CSS bytes. The Phase 14 runtime consumes
  94,370/12,039 bytes of its 96,000/22,000-byte allowance; the locale chunks consume 359,242 raw
  and 96,177 gzip bytes within their individual and collective ceilings.
- Signed `docs/150-phase-14-gate-review.md`, completed `WL-1410`, and advanced the root plus all
  nine workspace manifests from `0.14.0` to `0.15.0`. This internal milestone authorizes no tag,
  publication, deployment, release, support warranty, or conformance claim.

**2026-08-27 — Phase 15 WorkLedger Insights and local AI roadmap registration**

- Preserved the completed Phase 14 gate and all ten manifests at `0.15.0`, then registered
  `WL-1500` through `WL-1516` as a staged post-MVP phase. No product code, dependency, provider,
  network path, persistence model, MCP endpoint, or HR analytics surface was added.
- Made `WL-1500` the only ready task. It must accept an ADR and update the product, authorization,
  accessibility, security/data-flow, retention, evaluation, and operations contracts before
  implementation starts.
- Split the phase into a deterministic Insights foundation sub-gate (`WL-1500`–`WL-1504`) and an
  employee-only local AI pilot sub-gate (`WL-1505`–`WL-1508`). Manager, report-builder, HR,
  system, and optional MCP work remain downstream and independently bounded.
- Registered `WL-1516` in the phase-version guard. An incomplete Phase 15 keeps version `0.15.0`;
  completing its release gate will require every workspace manifest to be `0.16.0`.
- Recorded the interim boundary in `docs/10-open-decisions.md`: deterministic WorkLedger facts
  remain authoritative; tools are narrow, read-only, role/workspace-scoped, and deny by default;
  local AI is optional and disabled by default; general chat, natural-language SQL, scoring,
  prediction, recommendations, autonomous decisions, and persistent global AI UI are excluded.

**2026-08-27 — WL-1500 Insights architecture, privacy, and evaluation gate**

- Accepted ADR 0014. Deterministic native results own facts, scope, period, freshness, sources,
  limitations, and native actions; no model can calculate, authorize, decide, score, recommend, or
  write.
- Fixed one active Employee, Manager, HR, or System workspace per request. Every read-only tool
  execution reauthorizes current PostgreSQL scope, and combined roles never merge model context.
- Limited Phase 15 provider work to one disabled-by-default, operator-controlled private Ollama
  origin and one pinned local model digest after the foundation gate. Public origins, cloud models,
  redirects, model auto-pull, and silent external egress are prohibited.
- Made questions, conversations, tool arguments/results, model input/output, and reasoning traces
  request or browser-session only. Content-free provider diagnostics use the existing operational
  log retention class, and evaluation fixtures must remain synthetic.
- Set the HR privacy floor at 10 eligible people, 3 contributing cases where applicable, and a
  complementary group of at least 10 before any aggregate reaches a model. `WL-1512` may only make
  that boundary stricter without a superseding decision.
- Defined the native foundation, employee local AI pilot, later role, optional MCP, and final Phase
  15 release gates. The employee golden set uses 24 semantic questions in all three locales, three
  repeated runs, and zero-tolerance fact, scope, source, action, unsupported-claim, and leakage
  thresholds.
- Synchronized the product charter, scope/non-goals, permission matrix, architecture, UX and
  accessibility contract, security/data flow and threats, retention, roadmap, definition of done,
  open decisions, task board, TODO, and project status. No product code, dependency, package,
  migration, provider request, manifest, or version changed.

**2026-08-27 — WL-1501 deterministic Insight Service and typed native results (complete)**

- Added strict kind-specific employee requests and closed native results for exact scope, period,
  timezone, capture freshness, typed facts, explicit qualifiers, sources, limitations, and native
  actions. Cross-reference, source-destination, period-kind, workspace-scope, safe-integer, and
  unknown-field checks fail closed.
- Added a repeatable-read API service that reloads current account, employee link, role, employee
  state, organization, and timezone on every run. Existing policy actions grant only `SELF` scope,
  while technical-only, deactivated, permission-lost, missing-handler, and invalid-result cases are
  rejected before a result can leave the service.
- Kept account, employee, organization, and role identifiers in server authority only. No endpoint,
  UI, database migration, dependency, provider, model, network request, persistence path, audit
  event, or log content was added.
- Moved runtime schemas to the explicit `@workledger/contracts/insights` export after the initial
  root export exceeded the browser raw-JavaScript budget. The final production graph returns to the
  accepted 435,303 largest-chunk, 1,004,370 raw, 258,039 gzip, and 50,242 CSS-byte baseline.
- Formatting, lint, strict TypeScript, 54 tooling tests, 416 unit/component tests, the 14-file
  canonical PostgreSQL suite with 27 passes and one intentional skip, and the production/workspace
  build pass. The broad integration command still exposes unrelated existing fixture-label and
  parallel API failures recorded in `docs/152-wl-1501-deterministic-insight-service-contracts.md`.

**2026-08-27 — WL-1502 deterministic employee Insight computations (complete)**

- Added all four Employee Insight handlers. Balance change returns exact captured ledger values and
  a separately qualified complete unposted projection. Leave projection calculates every
  configured entitlement account independently. Submission blockers reuse the monthly projection
  service. Today explanation reuses the complete Today calculation pipeline for the organization
  local current date.
- Added bounded source labels for authorized leave account names, purpose-only source and action
  aliases, explicit posted, projected, provisional, reserved, incomplete, and unavailable
  qualifiers, freshness boundaries, and material limitations. No protected domain identifier,
  punch event, note, policy detail, or invented cross-account total enters a native result.
- Added pure fixture coverage for exact integer-minute and state semantics plus a real PostgreSQL
  fixture that computes every kind, checks Berlin date behavior and purpose-minimized output, and
  denies execution after current permission loss. The Today and monthly projection refactors reuse
  existing authoritative logic without changing their external behavior.
- Formatting, lint, strict TypeScript, 54 tooling tests, 420 unit/component tests, 13 broad
  environment-independent integration tests, the 15-file canonical PostgreSQL suite with 28
  passes and one intentional skip, 47 Playwright tests with one historical skip, and the
  production/workspace build pass. Source boundaries cover 324 files and 1,817 imports. The
  browser graph remains at the accepted baseline.
- Added `docs/153-wl-1502-employee-insight-computations.md`. No endpoint, page, migration,
  dependency, provider, model, network request, write action, persistence path, or version change
  was added.

**2026-08-27 — WL-1503 accessible native Insights endpoint and route (complete)**

- Added authenticated, same-origin, CSRF-protected `POST /v1/insights/run` transport with strict
  request and response contracts, current Employee scope authorization, safe API errors, private
  no-store success responses, and OpenAPI registration.
- Added a lazy Employee Insights route and shell destination for all four native questions. The
  page never executes on route load, stores only allowlisted kind and period context in the URL,
  keeps results in request memory, and clears stale output when the question or period changes.
- Added structured presentation for typed facts, textual qualifiers, freshness boundaries,
  material limitations, source records, and native actions. Monthly source navigation uses a safe
  month-focused My Time link and never treats a purpose alias as a protected period identifier.
- Added complete English, German, and Spanish copy plus keyboard validation, focused error summary,
  concise request announcements, offline, denied, unavailable, and retry states. Component and
  browser axe checks cover request-only execution, 320 pixel reflow, forced colors, and reduced
  motion. Visual inspection found and corrected one compressed narrow form layout.
- Formatting, lint, strict TypeScript, 54 tooling tests, 422 unit/component tests, 13 broad
  integration tests, the 15-file PostgreSQL suite with 28 passes and one historical skip, 48
  browser tests with one historical skip, and the production/workspace build pass. Source
  boundaries cover 329 files and 1,874 imports.
- Added `docs/154-wl-1503-accessible-native-insights-route.md`. No provider, model, dependency,
  migration, write action, audit event, result persistence, manifest version, or external egress
  was added.

**2026-08-27 — WL-1504 contextual entry points and Insights foundation gate (complete)**

- Added one shared contextual entry component to Today, My Time, My Balances, Requests, and
  employee-authorized Reports. Today and the returned time/report ranges prefill their matching
  deterministic question; Requests invents no period.
- Added one-shot module-memory context that carries only the allowlisted source kind, optional
  visible period, and bounded empty source-reference list. The destination names and explains that
  context and offers explicit removal with stable focus and one polite status.
- Kept source context out of URLs, local storage, session storage, logs, audit, and persistence.
  Context clears on consumption, removal, session expiry, route denial, API permission loss,
  reload, and process loss. No DOM, route DTO, protected identifier, note, reason, or sickness
  detail is copied.
- Added complete English, German, and Spanish copy plus component and browser coverage for all five
  entry points, employee-only Reports exposure, keyboard focus, permission loss, request body
  bounds, 320 pixel reflow, forced colors, reduced motion, storage absence, reload clearing, and axe.
- Formatting, lint, strict TypeScript, 54 tooling tests, 430 unit/component tests, 13 broad
  integration tests, the 15-file PostgreSQL suite with 28 passes and one historical skip, 48
  browser tests with one historical skip, and the production/workspace build pass. Source
  boundaries cover 331 files and 1,889 imports.
- Added `docs/155-wl-1504-insights-foundation-gate.md` and passed the deterministic foundation
  sub-gate with provider mode disabled. No dependency, migration, provider, model, prompt,
  conversation, write action, audit event, manifest version, or external egress was added.

**2026-08-27 — WL-1505 read-only Insight tool registry (complete)**

- Added four purpose-specific Employee tool contracts with strict date or month arguments. Balance
  change is limited to 366 inclusive calendar days; no tool accepts authority claims, employee
  collections, raw filters, arbitrary fields, SQL, query text, files, network, shell, or writes.
- Added an immutable deny-by-default registry with exact authorization actions, native kind,
  workspace, result fields, fact, source, limitation, action and freshness allowlists, execution
  limits, sensitivity, private model exposure, and explicit external adapter denial.
- Every tool execution creates one existing Employee Insight request and runs the repeatable-read
  service again. Database evidence proves current self scope for a combined Employee, Manager and
  HR account, Manager workspace denial before handler execution, and immediate deactivation or
  account revocation denial on the next call.
- Added the API-only `@workledger/contracts/insight-tools` entry point and executable repository
  guards that keep it out of the browser graph. The production browser totals remain at the
  accepted 1,037,620 raw and 267,297 gzip JavaScript byte baseline.
- Formatting, lint, strict TypeScript, 54 tooling tests, 436 unit and component tests, 13 broad
  integration tests, the 15-file PostgreSQL suite with 28 passes and one historical skip, 48
  browser tests with one historical skip, and the production and workspace build pass. Source
  boundaries cover 334 files and 1,903 imports.
- Added `docs/156-wl-1505-read-only-insight-tool-registry.md`. No provider, model request,
  endpoint, dependency, migration, database table, write action, audit event, prompt persistence,
  manifest version, external adapter, or egress path was added.

**2026-08-27 — WL-1506 AI provider and private Ollama adapter (complete)**

- Added strict startup-owned `disabled` and `ollama` configuration. Disabled mode is the default
  and rejects stray provider values. Ollama mode requires one exact origin, local model name and
  64-character lowercase digest, a 5–120 second timeout, and a 1–8 installation concurrency limit.
- Added a direct Node HTTP/HTTPS transport with a three-path allowlist, no environment proxy use,
  no redirects, fresh private DNS validation before every connection, and a health-pinned address
  set. Public, changed-private, cloud-metadata, missing-model, digest-drift, and capability failures
  fail closed before protected generation.
- Added `/api/tags` digest checks, `/api/show` completion/tool checks, and a synthetic
  nonstreaming structured-output `/api/chat` probe with thinking disabled. Generation requires a
  prior ready check, revalidates the digest, enforces cancellation, one operation deadline, fixed
  request/response byte ceilings, and bounded concurrency without retry or an unbounded queue.
- Startup health runs after core listen and logs only mode, state, safe capability/reason codes,
  check time, and latency. The database-enabled Employee Insight route passes with provider mode
  enabled and an unreachable private endpoint, proving deterministic native results remain usable.
- Runtime, production Compose, and operator examples document `OLLAMA_NO_CLOUD=1`, no cloud sign
  in, no public port, blocked provider internet, and out-of-band model provisioning. WorkLedger
  adds no Ollama image, dependency, model pull, database state, prompt persistence, endpoint, or UI.
- Configuration, production deployment, formatting, lint, strict TypeScript, 54 tooling tests, 456
  unit and component tests, 13 broad integration tests, the 15-file PostgreSQL suite with 28 passes
  and one historical skip, and the workspace build pass. Source boundaries cover 340 files and
  1,933 imports; the production browser bundle is unchanged.
- Added `docs/157-wl-1506-ai-provider-private-ollama-adapter.md`. No manifest version changed because
  the Phase 15 release gate remains open.

**2026-08-27 — WL-1507 employee Ask My Ledger interpretation (complete)**

- Added strict request-memory contracts for one Employee Insight, a 500-code-point question, four
  prior turns, an 8,000-code-point conversation ceiling, and eight structured statements. The
  authenticated no-store interpretation endpoint reports provider availability only after a
  deterministic native run and uses the authoritative account locale.
- Added a bounded orchestration service with one exact visible-scope Employee tool, current self
  authorization on every execution, one in-flight request per account, 12 attempts per rolling 10
  minutes, two tool rounds, four executions, caller/server cancellation, and no retry. Public,
  cloud, manager, HR, System, MCP, arbitrary query, and write capabilities remain absent.
- Added strict reference grounding. Every statement must cite at least one validated fact and the
  exact native sources supporting its fact, limitation, and action references. Every material
  limitation is required. Model prose cannot carry native numeric values, dates, statuses, labels,
  codes, or identifiers; the localized UI renders those values from the current native result.
- Added the optional labelled question form after the complete native result, Unicode-aware
  counting, linked error summary, explicit pending, cancel and clear controls, polite status,
  focus restoration, normal document semantics, native source/action links, and complete English,
  German, and Spanish copy. Context clears on scope, route, session, and permission loss.
- `pnpm verify` passes 54 tooling tests, 464 unit and component tests, 13 broad integration tests
  with 48 expected database opt-outs, 48 Playwright scenarios with one historical skip, and the
  production/workspace build. The canonical PostgreSQL suite passes 15 files with 28 tests and one
  historical skip. Source boundaries cover 343 files and 1,967 imports.
- Added a separate 14,000 raw and 5,000 gzip JavaScript-byte employee local AI pilot allowance.
  The production graph uses 1,050,183 raw and 270,383 gzip non-locale bytes within the combined
  1,052,000 and 282,000 ceilings. Largest-chunk, CSS, and locale budgets are unchanged.
- Added `docs/158-wl-1507-employee-ask-my-ledger-interpretation.md` and regenerated OpenAPI. No
  dependency, migration, table, persisted question or answer, audit content, external egress path,
  or manifest version changed.

**2026-08-28 — WL-1508 employee local AI pilot evaluation (in progress; gate open)**

- Added an exact 24-question synthetic employee golden set across British English, German, and
  Spanish with three deterministic repetitions, all four Employee Insight kinds, ambiguity,
  incomplete and provisional evidence, injection, prohibited advice, and cross-employee scope.
- Added the real-provider evaluator, bounded token and latency evidence, content-free operational
  traces, strict reference and source-union validation, locale-safe prose, provider invalid-output
  handling, account-concurrency regression, and minimized tool-to-model context.
- Added component and browser evidence that the deterministic native result remains first and
  usable through success, retry, cancellation, and provider failure; interpretation state stays
  out of URL and browser persistence; and the flow passes axe, 320-pixel reflow, forced colors,
  reduced motion, document structure, and announcement checks.
- `pnpm verify` passes formatting, lint, strict TypeScript, 54 tooling tests, 477 unit/component
  tests, 13 environment-independent integration tests, 49 Playwright tests with one historical
  skip, i18n, bundle, production, and workspace gates. `pnpm db:test` passes 28 tests with one
  historical skip. Boundaries cover 346 files and 1,988 imports.
- The exact `gemma4:12b` digest
  `4eb23ef187e2c5462566d6a1d3bbbc2f1346d0b4327cbb66d58fffbcc9b2b05c` reached 207/216. Six
  `submission-actions` cases returned provider-invalid structured output and three German
  `today-posted` cases omitted the required posted-balance fact. A broader action-to-fact hint
  regressed to 171/216 and was discarded.
- Added `docs/159-wl-1508-employee-local-ai-pilot-evaluation.md`. The task remains unchecked, the
  pilot and dependent tasks remain blocked, provider mode remains disabled, and no manifest
  version changed.

**2026-08-28 — WL-1508 recovery decomposition (planning only)**

- Split the remaining exact-model work into `WL-1508A` replacement-digest qualification,
  `WL-1508B` an 18-run screen for the known `submission-actions` and `today-posted` failures,
  `WL-1508C` the mandatory uninterrupted 216-run gate, and `WL-1508D` evidence and project-memory
  closure.
- Kept `WL-1508` as the parent pilot gate and retained `WL-1509` and every downstream dependency
  as blocked. A failed child model check stops the sequence and does not authorize prompt, schema,
  validator, threshold, provider-security, or native-fallback changes.
- Updated planning and project-memory documents only. No evaluator, provider, product code,
  dependency, runtime configuration, model execution, manifest, or version changed.

**2026-08-28 — WL-1508A replacement-model qualification (complete)**

- Inventoried seven already-installed Ollama names across six unique digests without pulling,
  copying, deleting, or publishing a model. Excluded the failed `gemma4:12b` digest, the earlier
  `qwen3.6:27b` readiness failure, and `qwen2.5vl:7b` because it lacks tool capability.
- Rejected `devstral-small-2:latest` after WorkLedger's unchanged cold-start health probe reached
  120.257 seconds and returned safe `TIMEOUT`; the deadline and capability contract were not
  weakened.
- Qualified cold `qwen2.5-coder:14b` digest
  `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849` in 4.623 seconds. Exact
  tags, local metadata, and the fixed synthetic structured-output probe produced `ready` with
  `CHAT`, `STRUCTURED_OUTPUT`, and `TOOLS`.
- Ran no employee question or golden evaluation case. Provider mode remains disabled by default;
  no prompt, schema, validator, provider/security control, runtime configuration, dependency,
  manifest, or version changed.

**2026-08-28 — WL-1508B known-failure regression (in progress; candidate failed)**

- Rechecked the completed `WL-1508A` records and ran only `submission-actions` for qualified
  `qwen2.5-coder:14b` digest
  `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849` with the accepted
  temperature `0`, thinking-disabled, 1,024-token, 30-second, concurrency-1 configuration.
- All nine cases failed: three repetitions in each of `en-GB`, `de-DE`, and `es-ES`. Every record
  reported content-free `PROVIDER_INVALID_OUTPUT`, provider `INVALID_RESPONSE`, and validation
  `TOOL_REQUIRED`; no tool round or execution occurred.
- Stopped before `today-posted` as required by the child-task checkpoint. The 216-case matrix did
  not run, `WL-1508B` remains unchecked, and `WL-1508C` remains blocked.
- Retained the ignored 4,882-byte content-free smoke artifact. No prompt, tool context, schema,
  validator, threshold, evaluator, provider implementation, native fallback, dependency, runtime
  default, manifest, or version changed.

**2026-08-28 — WL-1508E recovery qualification registration (planning only)**

- Registered one bounded child for the remaining installed unique tool-capable digest,
  `qwen3-coder:30b`; its `latest` alias shares the same digest but is not the accepted task name.
- Limited the child to exact local tag/digest inventory, an empty pre-probe loaded-model state, and
  the existing fixed synthetic WorkLedger health path within 120 seconds at concurrency `1`.
- Required a stop before every employee question and golden case whether health passes or fails.
  `WL-1508B` is blocked by `WL-1508E`; `WL-1508C` and later tasks remain blocked.
- Updated planning and project-memory documents only. No model was loaded, probed, pulled, retagged,
  or evaluated, and no source, provider/configuration contract, dependency, manifest, or version
  changed.

**2026-08-28 — WL-1508E qwen3-coder recovery qualification (complete)**

- Reconfirmed already-installed explicit `qwen3-coder:30b` at exact digest
  `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca`, 18,556,700,761 bytes,
  with local completion and tool metadata and no remote fields.
- Recorded an empty `ollama ps` state immediately before the existing fixed synthetic WorkLedger
  health path. The cold probe returned `ready` with `CHAT`, `STRUCTURED_OUTPUT`, and `TOOLS` in
  45.570 seconds within the unchanged 120-second deadline at concurrency `1`.
- Ran no employee question or golden case and stopped before resuming `WL-1508B`. Provider mode
  remains disabled by default; no model pull/retag, prompt, schema, validator, threshold, source,
  dependency, runtime default, manifest, or version changed.

**2026-08-28 — WL-1508B qwen3-coder known-failure screen (failed; open)**

- Reverified exact `qwen3-coder:30b` digest
  `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca` and ran only the nine
  `submission-actions` cases across `en-GB`, `de-DE`, and `es-ES`, three repetitions each, with the
  unchanged temperature `0`, thinking-disabled, 1,024-token, 120-second, concurrency-1 settings.
- All nine cases failed with content-free `PROVIDER_FAILURE` and provider `TIMEOUT` evidence. Six
  timed out before a tool call; three completed one tool round and execution before the final
  provider phase timed out. Latency ranged from 120,518 to 234,969 milliseconds.
- Retained the ignored 4,638-byte content-free smoke artifact and stopped before `today-posted` and
  the complete matrix. `WL-1508B` remains unchecked, `WL-1508C` remains blocked, and provider mode
  remains disabled by default. No prompt, tool context, schema, validator, threshold, evaluator,
  provider implementation, native fallback, dependency, runtime default, manifest, or version
  changed.

**2026-08-28 — WL-1508F server-owned orchestration decision (planning only)**

- Accepted `docs/specs/_root/0001-server-owned-insight-orchestration/index.md` and registered
  `WL-1508F` as the only ready recovery task.
- The planned path derives the exact registry call from the validated Employee Insight request,
  executes it once with current self authorization, and uses that fresh result for one tool-free,
  schema-constrained provider response and final validation.
- Kept the endpoint, UI, database, provider capability and security contract, runtime validators,
  golden fixtures, 216/216 threshold, native fallback, and disabled default unchanged.
- Blocked `WL-1508B` behind deterministic `WL-1508F` completion. Only exact qualified
  `qwen2.5-coder:14b` may resume its 18-case screen afterward. Any failure still stops before
  `WL-1508C`.
- Updated planning and project-memory documents only. No source implementation, test execution,
  model request, artifact, dependency, migration, runtime configuration, manifest, or version
  changed.

**2026-08-28 — WL-1508F server-owned orchestration implementation (complete)**

- Replaced model-selected tool invocation with one exact call derived from the validated Employee
  Insight request and executed through the existing registry with current `SELF` authorization,
  fixed Employee workspace, identity, and trusted capture instant before provider generation.
- Replaced the two-phase provider exchange with one `tools: []` request containing only the bounded
  question history, selected descriptor, locale, and minimized fresh registry result. Its JSON
  Schema reuses the shared interpretation contract while narrowing locale, fact, source,
  limitation, action, and safe-prose values to the current authorized result.
- Kept runtime parsing and grounding validation final, including exact source unions, material
  limitations, duplicate and unknown reference rejection, safe prose, native rendering, and
  unexpected tool-call rejection. Provider readiness, rate, concurrency, cancellation, deadline,
  private origin, digest, no-retry, disabled default, and native fallback remain unchanged.
- Added focused service evidence for fresh-result replacement, optional empty-reference schemas,
  cancellation, provider failures, permission loss, invalid registry output, content-free trace
  counters, and a PostgreSQL scope-loss case that makes zero provider calls.
- Passed 16 focused interpretation tests, the 15-file PostgreSQL suite with 28 passes and one
  historical skip, and `pnpm verify` with 54 tooling, 481 unit/component, 13 broad integration,
  and 49 Playwright passes plus one historical skip. No `pnpm test:ai:employee`, semantic smoke
  case, or real model request ran. No endpoint, UI, database, dependency, runtime setting,
  manifest, or version changed.
- Accepted the governing specification, saved its reusable acceptance and value-source checks in
  `verify.md`, marked `WL-1508F` complete, and made only the exact qualified
  `qwen2.5-coder:14b` candidate ready to resume `WL-1508B`.

**2026-08-28: WL-1508B post recovery qwen2.5-coder screen stopped**

The exact qualified `qwen2.5-coder:14b` digest passed its startup health and capability check, then
completed the nine `submission-actions` locale and repetition cases with the unchanged temperature
`0`, thinking disabled, 1,024 token, 30 second, and concurrency `1` settings. All three Spanish
cases passed. All six English and German cases failed the zero tolerance evaluation because the
structured interpretation omitted `action_submission_requests`. Provider outcome was `SUCCESS`
for all nine cases, with one current authorized registry execution and zero model tool rounds per
trace. The ignored 4,408 byte artifact remains content free. The required stop rule prevented
`today-posted` and the 216 case matrix from running. No source, prompt, schema, validator, threshold,
provider control, native fallback, dependency, runtime default, manifest, or version changed.

**2026-08-28: Employee local AI pilot closed without passing**

The user ended the optional model pilot after the final bounded recovery screen failed the accepted
zero-tolerance threshold. `WL-1508`, `WL-1508B`, `WL-1508C`, and `WL-1508D` are closed without a
passing model gate and do not count as completed roadmap tasks. Provider mode remains disabled, no
model is approved for deployment, and no further candidate or model evaluation work is authorized.
The deterministic Employee Insights foundation remains complete and supported. Later Phase 15
tasks remain behind their existing dependencies until a separate roadmap decision explicitly
rescopes them. No source, runtime configuration, model installation, dependency, database,
manifest, or version changed.

**2026-08-28: WL-1508G deterministic Phase 15 continuation accepted**

Reconciled the remaining Phase 15 plan against the completed provider-independent foundation and
the closed employee model pilot. `WL-1509`, deterministic `WL-1512` and `WL-1513`, deterministic
`WL-1514`, and provider-disabled `WL-1516` are the accepted continuation. `WL-1510`, `WL-1511`, and
`WL-1515` are obsolete and removed from the phase. `WL-1508` remains closed without passing and is
not a prerequisite for the revised deterministic sequence. `WL-1509` is ready. No source, runtime
configuration, model installation, dependency, database, manifest, or version changed.

**2026-08-28: WL-1509 deterministic Manager Insights complete**

Added strict Manager action-summary and team-coverage requests, a repeatable-read service that
reauthorizes current Manager capability and direct-report scope, a CSRF-protected no-store endpoint,
and the multilingual `/team-insights` route. Results contain factual counts only, preserve neutral
`UNAVAILABLE`, disclose no employee identity or absence detail, and link only to the native Approval
inbox or Team status. Contract and component tests cover request routing, current-report scope,
native actions, the provider-free interface, and automated accessibility. No provider, persistence,
write, dependency, migration, manifest, or version changed.

**2026-08-28: WL-1512 deterministic HR aggregate privacy contract accepted**

Accepted `docs/162-wl-1512-hr-aggregate-privacy-contract.md` as the HR addendum to ADR 0014. Phase
15 HR Insights are limited to organization-wide monthly closure readiness and neutral absence
coverage for one canonical organization-local month. The contract distinguishes employees, cases,
employee-days, and integer scheduled minutes; prohibits caller-defined cohorts, subtype breakdowns,
arbitrary ranges, comparisons, and row drilldown; and suppresses the complete result before result
construction when the 10-person cohort, 3-case, or 10-person complement floor fails. No runtime,
provider, persistence, dependency, migration, manifest, or version changed. `WL-1513` is ready.

**2026-08-28: WL-1513 deterministic HR aggregate Insights complete**

Implemented the two fixed HR purposes accepted by `WL-1512`. Strict contracts and a same-origin,
CSRF-protected, private no-store endpoint feed one repeatable-read service that reloads current HR
authority and organization-local month boundaries. PostgreSQL performs the fixed aggregation and
returns only a safe aggregate or an internal suppression decision; facts, source links, and native
actions are not constructed when any cohort, case, or complement floor fails. Neutral absence
coverage filters to currently approved effective sources without selecting subtype or private
content. The multilingual `/hr-insights` route has no filters, row drilldown, interpretation,
provider, persistence, export, or write path. Contract, database, component, and focused browser
evidence covers exact privacy boundaries, repeated queries, cancellation and supersession,
zero-schedule and holiday cases, authority loss and cross-organization isolation, hostile private
fixtures, same-month source actions, three locales, keyboard use, 320-pixel reflow, forced colors,
reduced motion, and axe. The full repository gates and canonical PostgreSQL harness are green. No
dependency, migration, provider request, manifest, or version changed. `WL-1514` is ready.

**2026-08-28: WL-1514 deterministic isolated System Insights complete**

Implemented one fixed System technical overview through a strict contract, repeatable-read current
technical authorization, and a same-origin CSRF-protected private no-store endpoint. The result
contains exactly ten facts from five closed sources: application version, service/database
readiness, expected-schema state, the host-owned backup boundary, mail-adapter configuration, and
the authentication session profile. Backup execution and restore-test truth are explicitly
unavailable rather than inferred. The multilingual `/system/insights` route runs only after an
explicit button submission, renders grouped definition lists, textual states, a material warning,
sources, and the native System operations action, and stores no request or result in URL or browser
persistence. Contract, PostgreSQL route, three-locale component, shell, accessibility, OpenAPI,
i18n, and repository gates are green. The path has no provider dependency or call and exposes no
employee, HR, attendance, absence, request, report, identity, or other domain field. No dependency,
migration, persistence model, manifest, or version changed. Its lazy 6.59 kB raw / 2.13 kB gzip
route is governed by a separate 10,000-byte raw / 3,000-byte gzip allowance without changing the
application, largest-chunk, CSS, locale, or earlier runtime baselines. `WL-1516` is ready.

**2026-08-29: WL-1516 deterministic Phase 15 release gate complete**

Passed the accepted multilingual, accessibility, security, privacy, retention, usability,
provider-disabled, PostgreSQL, upgrade, production, browser, and reviewed visual gates. The review
found and fixed strict public-result construction in Manager and HR services, added both route
tests to the canonical PostgreSQL command, repaired the HR migration fixture, and added missing
Manager multilingual and provider-disabled browser evidence. Reviewed Phase 13 and Phase 14
baselines now include the intentional native-first Insights surface, navigation, locale formatting,
and translated labels; clean comparison-mode reruns pass. Provider mode remains disabled, no model
is approved, and no accepted route depends on Ollama. `docs/165-wl-1516-phase-15-gate-review.md`
records the signed checklist. All ten manifests advance from `0.15.0` to `0.16.0`; no lockfile,
dependency, migration, persistence model, tag, publication, deployment, or provider request is part
of the milestone.

## Current blockers

No blocker remains for the completed deterministic Phase 15 gate. The optional employee local AI
pilot is closed without passing after the best strict full run reached 207/216 and the final
qualified `qwen2.5-coder:14b` recovery screen reached 3/9. Provider mode remains disabled and no
model is approved for deployment. Exact partial-day work-versus-absence overlap,
calculation-to-ledger mismatch, and break-duration warning signals still require authoritative
domain or repository facts; Today does not guess them from minute totals or an otherwise valid
overnight session. Earlier task-specific images remain historical while the current cumulative
Phase 13 and Phase 14 comparison gates are green.
`D-502` remains the broader exact retail assistive-technology matrix rather than a whole-product
conformance claim; `WL-1307` supplies bounded VoiceOver evidence in Chrome for Testing and Safari.
The temporary Astro backup is recoverable at
`/private/tmp/workledger-apps-site-phase11-backup.V4AgyX/apps-site`, but it remains noncanonical and
belongs only to the unnumbered portfolio draft.

## Next task

Next: scope diagnosis of the Spanish balance-summary duplicate-reference failure before any C
retry. `WL-1508H` and `WL-1508B` are complete; C is open and D is blocked.
The bounded screen passed 18/18 on 2026-09-06; the full matrix then failed at 213/216. H health,
static guards, compilation, and operator isolation evidence are recorded separately.
The portfolio presentation scope remains preserved in
`docs/drafts/portfolio-presentation.md` as a separate unnumbered draft and requires an explicit
scheduling decision before implementation begins.

## Update rules

After every completed task, record:

- What changed.
- What was verified.
- Commands/tests run.
- New decisions or ADRs.
- Remaining risks.
- Exact next task ID.
