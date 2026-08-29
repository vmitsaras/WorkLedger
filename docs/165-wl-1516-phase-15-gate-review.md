# Phase 15 Gate Review: Deterministic WorkLedger Insights

**Gate task:** `WL-1516`  
**Completed:** 2026-08-29  
**Version advance:** `0.15.0` to `0.16.0`  
**Outcome:** Pass. All 10 accepted deterministic Phase 15 tasks are complete, provider mode remains
disabled, no model is approved, and no accepted route depends on Ollama.

## Scope and boundary

Phase 15 ships deterministic, read-only Employee, Manager, privacy-suppressed HR aggregate, and
isolated System Insights. Each route uses strict purpose contracts, reloads current authorization,
renders native facts and sources, persists no request or result, and remains complete without a
model. The optional employee local model pilot closed without passing and is not a release
prerequisite. Retained provider and interpretation code remains inactive and ineligible for
deployment.

This gate does not enable a provider, approve a model, add Manager or HR interpretation, expose an
MCP surface, add natural-language SQL or report generation, publish an artifact, deploy an
instance, or claim whole-product WCAG or assistive-technology conformance.

## Signed release checklist

| Criterion | Status | Evidence |
| --- | --- | --- |
| Every accepted deterministic task and provider-disabled role path passes | **Pass** | `docs/152-wl-1501-deterministic-insight-service-contracts.md` through `docs/164-wl-1514-system-insights.md`, excluding the explicitly closed or obsolete model-dependent tasks, record the accepted contracts and task gates. |
| Manager scope is current direct reports only | **Pass** | The canonical PostgreSQL route test reauthorizes current Manager capability and direct-report assignment, rejects HR-only and revoked actors, excludes self and former reports, and returns no identity or private absence field. |
| HR suppression occurs before result construction | **Pass** | PostgreSQL aggregation returns only a fixed safe aggregate or internal suppression decision; cohort, case, and complement floors pass repeated-query, cross-scope, hostile-fixture, and generic-unavailable tests. |
| System Insights contains technical data only | **Pass** | The fixed technical overview exposes exactly ten allowlisted facts from five closed sources and no employee, HR, attendance, absence, request, report, or identity field. |
| Provider-disabled operation is complete | **Pass** | Runtime configuration validates with `aiProvider=disabled`; accepted Manager, HR, and System routes have no provider dependency or call path; browser evidence exposes no interpretation control. |
| Prohibited capability remains absent | **Pass** | No unrestricted query, SQL, write, scoring, prediction, recommendation, autonomous action, public provider, cloud model, or unreviewed MCP surface exists. |
| Multilingual and accessibility evidence passes | **Pass** | English, German, and Spanish component and browser coverage includes keyboard submission, focus, announcements, axe, 320-pixel reflow, forced colors, reduced motion, touch, and reproducible reviewed screenshots. |
| Security, privacy, retention, and browser non-persistence pass | **Pass** | Same-origin session and CSRF protection, private no-store responses, strict schemas, current authorization, purpose minimization, suppression, neutral states, clean URL/history/storage, content-free diagnostics, and existing retention controls pass. |
| Database, upgrade, production, and rollback evidence passes | **Pass** | The 18-file PostgreSQL gate, isolated `0.9.0` upgrade rehearsal, production Compose validation, static deployment verification, backup/restore contracts, and documented rollback boundary pass. |
| Project memory and version state are synchronized | **Pass** | `PROJECT_STATUS.md`, `TODO.md`, roadmap, task board, permissions, migration, retention, architecture/evaluation records, this review, and `README.md` are current; all ten manifests are `0.16.0`. |

## Gate defects closed

The release review found that Manager and HR services spread the internal `freshnessBoundaries`
field into the strict public native-result object. Valid available results therefore failed final
schema validation and returned the safe service-unavailable response. The services now remove that
internal field before constructing the public `freshness` object. Canonical PostgreSQL tests cover
both routes and prove available, suppressed, denied, revoked, provider-disabled, and minimized
responses.

The review also found that the HR PostgreSQL test was absent from the canonical database command
and used an incomplete migration fixture. The canonical command now runs both Manager and HR route
tests against migrations `0000` through `0022`.

## Verification

The gate used repository-managed Node `24.18.0`, pnpm `11.20.0`, local PostgreSQL on the Compose
development service, and Playwright Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit
profiles.

```text
pnpm verify
  runtime configuration and reproducible OpenAPI passed
  formatting, ESLint, 356-source/2,093-import boundaries, and CSS ownership passed
  strict TypeScript passed
  54 tooling tests passed
  489 unit/component tests across 58 files passed
  13 environment-independent integration tests passed
  52 Playwright tests passed across the browser matrix; 1 opt-in capture skipped
  i18n, production bundle, and 9-entry workspace build passed

pnpm db:verify
  PostgreSQL connectivity passed
  18 database-enabled files passed; 31 tests passed; 1 historical test skipped

pnpm upgrade:test -- --database-url <local test database>
  0.9.0 fixture applied 18 checkpoint migrations and 5 later migrations
  row preservation, integrity, and authentication-profile compatibility passed

pnpm production:config:check
pnpm production:verify
  Compose, private-network, Caddy hardening, and deployment evidence passed

pnpm test:visual
  43 Chromium workflows and reviewed Phase 13 cross-route baselines passed;
  1 intentional historical capture skipped

pnpm test:visual:i18n
  4 German and Spanish multilingual visual workflows passed
```

The production build remains within every accepted ceiling: 439,663 largest JavaScript bytes,
1,076,442 total non-locale JavaScript bytes, 279,114 gzip JavaScript bytes, and 50,593 CSS bytes.
The combined named runtime allowances consume 134,442 of 135,000 raw bytes and 24,114 of 35,000
gzip bytes. Locale chunks remain separately bounded.

## Visual baseline review

The Phase 13 and Phase 14 baseline differences were reviewed before replacement. They represent
the intentional native-first “Understand this page” surface, the Insights navigation destination,
locale-correct date and time presentation, and translated ledger labels. The current images retain
all content, primary actions, hierarchy, responsive containment, focus evidence, and textual state.
The user explicitly approved updating these baselines on 2026-08-29. Clean comparison-mode reruns
then passed.

## Accessibility

Manager, HR, and System routes preserve semantic headings and forms, keyboard completion, result
focus and meaningful announcements, visible labels and non-color states, 320-pixel reflow, forced
colors, reduced motion, touch targets, and automated axe coverage in all supported locales. The
native-first contextual surface increases page length in reviewed screenshots without hiding or
clipping content. `D-502` remains the broader retail browser and assistive-technology evidence
boundary, so this gate makes no conformance claim.

## Security and data

Every accepted endpoint remains authenticated, same-origin, CSRF protected, private, `POST` only,
strictly validated, and `no-store`. Manager authorization is limited to current direct reports; HR
results are whole-result suppressed before construction; System results use a closed technical
allowlist. URLs, browser persistence, logs, audit, exports, backups, and analytics receive no
question, prompt, result, tool content, model output, or reasoning trace.

The gate made no provider request. Provider mode remains disabled, no model is approved, restored
environments remain provider-disabled until their independent operational gates pass, and no
production or personal data entered the fixtures or release evidence.

## Versioning and release meaning

Completing `WL-1516` is the sixteenth zero-indexed phase gate. The root plus `apps/api`, `apps/web`,
`packages/config`, `packages/contracts`, `packages/database`, `packages/domain`, `packages/i18n`,
`packages/test-utils`, and `packages/ui` advance together from `0.15.0` to `0.16.0`. The lockfile
does not change because workspace versions are absent from importer metadata.

`0.16.0` is an internal milestone only. It authorizes no commit, tag, GitHub release, npm or
container publication, deployment, supported-version promise, browser warranty, provider
enablement, model approval, or accessibility conformance statement.

## Remaining boundaries

- The optional employee local model pilot remains closed without passing; provider mode remains
  disabled and no accepted route depends on it.
- `D-502` remains the broader assistive-technology and retail-browser evidence boundary.
- Exact partial-day work-versus-absence overlap, calculation-to-ledger mismatch, and break-duration
  attention still require authoritative source facts and remain outside the Insights gate.
- No later numbered roadmap task is assigned. The portfolio presentation scope remains an
  unnumbered draft pending an explicit scheduling decision.

No commit, push, tag, publication, deployment, provider request, or remote write was performed.
