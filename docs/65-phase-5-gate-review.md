# Phase 5 Gate Review

**Review date:** 2026-08-13

**Task:** `WL-506`

**Outcome:** Passed. The time-record and correction slice is complete. Phase 6 may begin with
`WL-600`; this gate does not authorize payroll, post-lock ordinary edits, production deployment,
package publication, a Git tag, a container release, or a supported external release.

## Reviewed scope

The review covers `WL-500` through `WL-505`: the employee My Time and flexible-time balance
views, daily record detail and attention, correction submission, current-direct-manager review,
and approved-correction application. It also covers the shared database, domain, audit,
authorization, OpenAPI, browser, accessibility, privacy, task-board, and definition-of-done
contracts that apply to that slice.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| Time records and flexible-time balances remain explainable | Pass | The server returns authoritative integer-minute projection and ledger summaries; My Time and My Balances present captioned tables, semantic source entries, and calculation context without treating a browser cache as a source of truth. |
| An employee can submit a bounded correction without changing history | Pass | The API accepts a self-only, validated proposal with a preserved original interpretation and reason; it creates a correction request and minimized audit event without mutating punch events, daily projections, or ledger entries. |
| A current, non-self manager can review and reject or approve a request | Pass | The PostgreSQL/API scenario verifies current direct-manager scope and decision versioning. It proves an approved request is not applied until the distinct application action and a rejected request produces no applied correction. |
| Approved application updates the correction interpretation and balance atomically | Pass | The integration scenario proves one approved application changes the projection from 120 to 60 worked minutes, appends the resulting -60 minute ledger delta, preserves raw punches, records audit evidence, and rejects duplicate application. |
| Locked periods cannot be changed through the ordinary application path | Pass | The same integration scenario creates a locked monthly period before application and receives `PERIOD_ADJUSTMENT_REQUIRED` with zero applied-correction rows; the unlocked retry then applies exactly once. |

## Cross-cutting review

| Area | Gate conclusion |
|---|---|
| Domain and transactions | Raw punch events stay immutable. Original and proposed interpretations are separately preserved. Approval is distinct from application, application is versioned and idempotent, recalculation uses integer minutes, and the projection/ledger/audit changes share one transaction boundary. |
| Authorization and privacy | Submission is active-employee self service. Queue, decision, and application enforce current direct-manager scope and non-self approval inside the transaction. Browser DTOs and audit facts omit correction reasons and internal identifiers not needed by the consumer. |
| Accessibility | Employee correction forms expose recorded facts, visible labels, descriptions, inline errors, a linked error summary, named pending state, and a textual result. Manager review/application controls are native labelled controls with distinct decision/application text and named outcomes; color is not the sole status signal. |
| Scope | The phase adds no payroll calculation, monitoring, geolocation, biometric data, multi-tenant billing, native mobile app, arbitrary workflow builder, or post-lock ordinary edit path. |

## Verification

The exact pinned toolchain passed with Node `24.18.0` and pnpm `11.20.0`. The following checks
also passed:

- workspace and configuration checks, Prettier, ESLint, boundary analysis, strict composite
  TypeScript, and generated OpenAPI drift;
- 158 unit/component tests and 25 database-enabled integration tests;
- 12 Chromium scenarios; and
- Vite production build plus all eight emitted workspace entries.

The Vite build retains the known main-chunk-size warning. It remains owned by `WL-1001`, is not
suppressed, and is not a Phase 5 correctness, accessibility, or security failure.

## Versioning

Completing `WL-506` is the sixth zero-indexed phase gate. The root and all eight private workspace
manifests advance together from `0.5.0` to `0.6.0`; the canonical phase-version guard confirms six
sequentially completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image,
GitHub release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The next task is `WL-600`: implement the absence-type configuration model and policy validation
with MVP defaults and invalid-combination tests. It must preserve the existing effective-dated,
privacy, authorization, ledger, and immutable-history contracts.
