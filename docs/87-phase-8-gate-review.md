# Phase 8 Gate Review

**Review date:** 2026-08-14

**Task:** `WL-806`

**Outcome:** Passed. The monthly closure and reporting slice is complete. Phase 9 may begin with
`WL-900`; this gate does not authorize production deployment, package publication, a Git tag, a
container release, a supported external release, payroll behavior, or ordinary mutation of locked
history.

## Reviewed scope

The review covers `WL-800` through `WL-805`: monthly projection/readiness, employee submission,
current-manager or organization-HR request-changes/approval/lock transitions, immutable approval
snapshots, post-lock correction adjustments, scoped operational reports, authorized bounded CSV,
the printable monthly record, and explicit safe clipboard behavior. It also covers their contracts,
PostgreSQL repositories and transactions, current authorization, audit/notification evidence,
OpenAPI, accessibility, privacy boundaries, browser behavior, documentation, and roadmap state.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| A complete seeded month can be submitted, approved, locked, and exported | Pass | The PostgreSQL/API gate scenario derives a complete June month, submits it as the employee, exercises changes-requested/resubmission cycles, approves through current-manager and HR-capable paths, separately locks the exact approved version, applies a real employee post-lock correction through the unified manager decision route, and exports the adjusted locked month through the CSRF-protected CSV endpoint. The exact CSV row reports `LOCKED`, expected `960`, worked `508`, credited `988`, balance `28`, and post-lock delta `13`. |
| Ordinary edits are rejected after submission/lock according to state | Pass | Submission freezes the month and an ordinary correction returns `409 PERIOD_REOPEN_REQUIRED` with zero request/audit effects. Repeat/stale submission and review/lock versions are rejected. Once locked, the same correction route selects `POST_LOCK_ADJUSTMENT`; it never rewrites the daily projection or approved record. Locked absence cancellation remains a safe no-effect `PERIOD_ADJUSTMENT_REQUIRED` denial under `D-504`. |
| Post-lock correction creates a linked adjustment | Pass | The gate scenario now uses the real employee correction and manager approval endpoints for `+13`, zero, and `-13` outcomes. Serializable application creates source-linked request/decision/applied/adjustment evidence, one ledger entry only for each nonzero delta, ordered versions, explicit reversal linkage, minimized audit, and generic notification. Existing concurrency evidence proves one winning semantic effect. |
| Approved snapshot remains reproducible | Pass | Lock references the latest immutable approval snapshot without rebuilding it. The gate stores the exact snapshot JSON before the correction chain and proves byte-equivalent structured content afterward while the monthly response and report separately derive the current adjusted view. Original and adjusted closing balances remain explicit. |
| CSV formula injection tests pass | Pass | `EX-043` unit coverage checks `=`, `+`, `-`, `@`, tab, carriage return, line feed, leading whitespace/control/Unicode space, quote ordering, numeric negatives, UTF-8 bytes, CRLF, filename, row/byte bounds, and hidden-field absence. PostgreSQL/API evidence covers hostile employee text, exact headers, generation-time scope loss, minimized audit, and strict-input rejection. |
| Reports are scoped, paginated, and accessible | Pass | Self/current-report/organization scope is applied before filters, totals, sorting, counts, and pagination; explicit unauthorized targets fail. Report routes use canonical URL state, labelled filters, textual totals/partial/empty/error states, captioned sortable tables, named keyboard-scroll containment, narrow-screen coverage, explicit portability actions, route focus, and axe checks. |

## Cross-cutting review

| Area | Gate conclusion |
|---|---|
| Domain and transactions | Period readiness, submission, reviewer transitions, snapshots, lock, correction application, append-only time-account effects, and audit/notification writes use explicit versions and transactional boundaries. Raw punches, approved snapshots, and older adjustment evidence remain immutable; zero effects are represented without fabricating a ledger delta. |
| Authorization and privacy | Active self, current effective direct-manager, or organization-HR authority is re-evaluated at each action. Self review, unrelated/former manager, system-only access, stale scope, unsafe export, and foreign explicit targets are denied. Monthly/report/export/print/clipboard/notification DTOs omit sickness classification, protected reasons, reviewer comments, source fingerprints where not required, and hidden identifiers. |
| Accessibility | Monthly review and reports provide semantic headings, visible labels/descriptions, linked validation, focus-managed errors/outcomes, textual workflow/readiness states, captioned tables, keyboard-complete actions, narrow reflow/scroll containment, forced-colors/reduced-motion foundations, purpose-minimized print semantics, polite portability status, and axe/Chromium evidence. Exact-runtime verification also found and fixed a delayed route-heading focus race: deliberate focus already placed inside main content is now preserved, while ordinary navigation still transfers focus from the persistent shell to the destination heading. |
| UX and recovery | Complete, incomplete, warning, blocker, loading, empty, partial, submitted, changes-requested, approved, locked, adjusted, stale, denied, dependency-failure, oversize-export, clipboard-failure, and print-refresh states are explicit. The product distinguishes approved baseline, current adjusted result, calculated amounts, and posted ledger amounts. |
| Scope | The phase adds no ordinary unlock, snapshot rewrite, payroll, billing, surveillance, geolocation, biometrics, rotating shifts, native app, multi-tenant SaaS billing, arbitrary workflow builder, or AI-generated approval/HR decision. |

## Locked absence-cancellation assessment

`D-504` records the remaining production-blocking design gap. An ordinary cancellation that touches
a locked period still returns `409 PERIOD_ADJUSTMENT_REQUIRED` before any cancellation decision,
coverage/effect version, entitlement restoration, time-account entry, notification, or audit success
is written. That fail-closed behavior is tested and is safer than inventing a correction-shaped
absence adjustment.

This does not fail the Phase 8 gate: the roadmap's exact exit criterion is “Post-lock correction
creates a linked adjustment,” and `WL-803` is explicitly correction-scoped. It does mean WorkLedger
cannot claim a complete production cancellation recovery path. `WL-1000` owns resolution of the
permission/privacy/domain contract and must schedule any implementation before `WL-1008`; the
production gate remains blocked while `D-504` is open.

## Verification

The database-enabled canonical verification passes:

- pinned toolchain, workspace topology, nine-gate phase-version contract, runtime configuration,
  formatting, ESLint, 215-file/1,040-import source boundaries, strict TypeScript, generated OpenAPI
  reproducibility, and workspace/public-entry builds;
- 24 repository-contract tests and 276 unit/component tests;
- 37 PostgreSQL-backed integration tests across 20 files, including the strengthened complete
  submit/approve/lock/correct/export scenario, immutable snapshot, scope, formula, audit,
  notification, and concurrency evidence; and
- 17 Chromium scenarios covering authenticated workflows, report download, keyboard, 320/390 px
  behavior, touch, forced colors, focus/status behavior, and axe.

After the manifest version bump, the managed `pnpm` wrapper requested a noninteractive dependency
refresh and aborted before changing repository state. The canonical checks were therefore run with
the official pinned Node `24.18.0` runtime and the installed pinned pnpm dependency graph; no
dependency or lockfile change was required.

The production build passes and retains the known main-chunk-size advisory owned by `WL-1001`.
Integration retains the existing `pg` concurrent-query deprecation warning. Neither is suppressed;
both remain explicit follow-up work. Automated axe/accessibility-tree checks do not establish WCAG
conformance, and the cross-browser/assistive-technology production matrix remains owned by
`WL-1002`/`D-502`.

## Versioning

Completing `WL-806` is the ninth zero-indexed phase gate. The root and all eight private workspace
manifests advance together from `0.8.0` to `0.9.0`; the canonical phase-version guard confirms nine
sequentially completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image,
GitHub release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The next task is `WL-900`: build HR employee create/invite/activate/deactivate/history plus
separated technical-account, system-role, and session administration routes. It must preserve
approved history, revoke sessions on deactivation, keep HR employment facts separate from technical
account authority, prohibit privileged self-role mutation, and provide accessible complex-form
recovery.
