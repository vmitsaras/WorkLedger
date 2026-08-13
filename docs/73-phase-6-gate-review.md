# Phase 6 Gate Review

**Review date:** 2026-08-13

**Task:** `WL-607`

**Outcome:** Passed. The absence and leave-balance slice is complete. Phase 7 may begin with
`WL-700`; this gate does not authorize payroll, production deployment, package publication, a Git
tag, a container release, or a supported external release.

## Reviewed scope

The review covers `WL-600` through `WL-606`: effective-dated absence policy, entitlement ledger,
vacation requests, privacy-minimized sickness reporting, full/half/minute coverage, personal
calendar and agenda views, and cancellation/reversal. It also covers their database migrations,
authorization, audit, OpenAPI, accessibility, browser, security, documentation, and roadmap
contracts.

## Exit-criterion evidence

| Criterion | Result | Evidence |
|---|---|---|
| Balances remain explainable and integer-minute based | Pass | The append-only entitlement ledger derives available, reserved, and projected balances from scoped source entries. My Balances presents a labelled source-entry view; browser state is not a second ledger. |
| Effective absence coverage is correct and non-overlapping | Pass | Domain, API, and PostgreSQL tests cover effective-date policy resolution, holidays/zero-hour dates, full-day, obligation-half, and exact minute intervals. Overlap rules reject incompatible or intersecting coverage and allow only compatible distinct halves. |
| Vacation and sickness enforce distinct workflow/privacy contracts | Pass | Vacation validates entitlement and creates a pending reservation; sickness is effective once on report and acknowledgement adds no effect. Sickness contracts and UI deliberately contain no diagnosis, note, clinician, attachment, or sensitive DTO field. |
| Calendar information remains accessible and equivalent | Pass | The personal calendar uses a captioned semantic table plus equivalent agenda/list presentation, URL-owned non-sensitive month state, native controls, labelled navigation, and private/no-store owner-only API data. |
| Cancellation preserves history and reverses balances safely | Pass | PostgreSQL/API evidence proves exact target coverage, immutable original effects and deduction, a later zero calculation-effect version, bounded restoration only when a prior approved deduction exists, stale-decision safety, and locked-period routing to `PERIOD_ADJUSTMENT_REQUIRED`. |

## Cross-cutting review

| Area | Gate conclusion |
|---|---|
| Domain and transactions | Absence request coverage, decisions, effects, and ledger facts remain append-only. Coverage and cancellation use version checks; submissions/decisions/reversals run within serializable transactions. The calculation reads latest effect versions while preserving older evidence. |
| Authorization and privacy | Employee submission/cancellation is active-self only. Current direct managers and HR decide where permitted, with non-self decisions enforced in the API. Responses are purpose-minimized and private/no-store; sickness-sensitive detail is neither collected nor returned. |
| Accessibility | Forms use visible labels, descriptions, inline errors and summaries. Result/pending/failure states use text as well as visual treatment. Calendar has an equivalent agenda. The cancellation action is a native button with named pending and failure feedback; no workflow depends on color or custom keyboard behavior. |
| Scope | The phase adds no payroll, employee monitoring, geolocation, biometrics, native mobile app, multi-tenant SaaS billing, arbitrary workflow builder, or post-lock ordinary edit. |

## Verification

The available local checks passed:

- workspace contract, phase-version prerequisite, source-boundary scan, strict composite TypeScript,
  Prettier, generated OpenAPI reproducibility, emitted workspace entries, and Vite production build;
- 189 unit/component tests;
- 30 PostgreSQL-backed integration tests, including the cancellation and locked-period cases; and
- 12 Chromium scenarios, including keyboard, touch, responsive, forced-colors, and axe coverage.

The Vite build retains its known main-chunk-size warning. It remains owned by `WL-1001`, is not
suppressed, and is not a Phase 6 correctness, accessibility, or security failure.

The root `pnpm` wrapper itself attempted a dependency refresh and was unable to reach the registry
in this environment. The already-installed toolchain ran the equivalent project checks directly;
no dependency, lockfile, or package-manager state was changed.

## Versioning

Completing `WL-607` is the seventh zero-indexed phase gate. The root and all eight private
workspace manifests advance together from `0.6.0` to `0.7.0`; the canonical phase-version guard
confirms seven sequentially completed gates and the shared version.

This is an internal milestone only. It creates no Git tag, npm publication, container image,
GitHub release, deployment, supported-version promise, or compatibility guarantee.

## Handoff

The next task is `WL-700`: build the manager approval inbox with URL-owned status, type, team, and
date filters. It must preserve current direct-manager scope, non-self decisions, explicit privacy
boundaries, immutable source history, and the Phase 6 absence contracts.
