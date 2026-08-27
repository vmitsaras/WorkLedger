# Phase 14 Gate Review: Internationalization and Multilingual Product Experience

**Gate task:** `WL-1410` Pass the Phase 14 release gate.  
**Completed:** 2026-08-27  
**Version advance:** `0.14.0` to `0.15.0`  
**Outcome:** Pass. All 11 Phase 14 tasks are complete, the full repository and database-backed
quality gates are green, and no mixed-language workflow or open P0/P1 multilingual defect remains
in the bounded release evidence.

## Scope and boundary

Phase 14 ships the repository-local `en-GB`, `de-DE`, and `es-ES` product experience across the
shared application foundation, employee, manager, HR, and system workflows, and generated or
recipient-facing output. Account locale is authoritative after sign-in; the signed-out device
preference remains non-sensitive and bounded. Domain codes, authorization, audit facts, and
user-authored content remain language-neutral or verbatim at their established ownership boundary.

This gate reconciles the completed evidence, closes the PostgreSQL migration and upgrade residual,
and advances the internal workspace version. It does not add a locale, introduce RTL production
content, change domain behavior, publish a package or container, create a tag or release, deploy an
instance, or claim whole-product WCAG or assistive-technology conformance.

## Signed release checklist

| Criterion | Status | Evidence |
| --- | --- | --- |
| Canonical routes, roles, states, and output surfaces have catalog coverage | **Pass** | `docs/139-phase-14-internationalization-architecture-audit.md` through `docs/147-generated-recipient-output-i18n.md` record the audited ownership and completed workflow/output migrations. |
| Production catalogs and descriptors are structurally complete | **Pass** | `pnpm run i18n:check` validates 2,069 messages, seven namespaces, three locales, 39 descriptors, matching parameters/plurals, plain-text safety, and governed sources. |
| German and Spanish terminology and privacy language have fluent-human approval | **Pass** | `docs/148-wl-1408-human-catalog-review.md` records German approval by Vasileios Mitsaras and Spanish approval by Sol on 2026-08-27. |
| Locale precedence, switching, startup, focus, and announcement behavior pass | **Pass** | Unit/component tests and the five-profile Playwright matrix cover signed-out resolution, account authority, refresh, rollback, protected startup, selector focus, and localized announcements. |
| Formatting preserves authoritative timezone and integer-minute semantics | **Pass** | Shared formatter, workflow, output, unit, component, integration, and browser tests remain green for all shipped locales. |
| Descriptor-driven API presentation remains language-neutral and purpose-minimized | **Pass** | Contract enforcement and Today, error, report, notification, and device-summary tests validate bounded descriptors without browser inference from raw prose. |
| Generated and recipient output preserves security and privacy contracts | **Pass** | Print, clipboard, CSV, notification, invitation, reset, and optional-email tests retain authorization, actor/recipient locale ownership, formula neutralization, ISO dates, integer minutes, and field minimization. |
| Responsive, visual, accessibility, and usability evidence passes | **Pass** | `docs/149-wl-1409-multilingual-product-quality-gate.md` records German/Spanish cross-role axe, focus, 320-pixel reflow, forced-colors, reduced-motion, native accessibility-tree, and eight-image visual evidence. |
| Database migration and prior-release upgrade evidence passes | **Pass** | The Docker-backed 13-file integration suite passes 26 tests with one intentional historical skip. The manual `0.9.0` fixture applies 18 checkpoint and five later migrations, preserves rows, validates integrity/auth compatibility, backfills `en-GB`, persists `de-DE`, and rejects `en-US`. |
| Complete repository quality gate passes | **Pass** | Configuration, OpenAPI, formatting, lint/boundaries/CSS, strict TypeScript, tooling, unit/component, integration, Playwright, i18n, production bundle, and workspace build checks pass. |
| Project memory and version state are synchronized | **Pass** | `PROJECT_STATUS.md`, `TODO.md`, `docs/07-roadmap.md`, `docs/08-task-board.md`, `docs/105-migration-and-upgrade.md`, `docs/138-phase-14-internationalization-roadmap.md`, this review, and `README.md` are current; all ten manifests are `0.15.0`. |

## Verification

The gate used repository-managed Node `24.18.0`, pnpm `11.20.0`, PostgreSQL `18.4` in the
development Compose service, and Playwright `1.61.1`.

```text
pnpm run db:test
  13 database-enabled files passed; 26 tests passed; 1 intentional historical upgrade test skipped

pnpm run upgrade:test -- --database-url <local test database>
  0.9.0 fixture passed 18 checkpoint migrations, 5 later migrations, row preservation,
  integrity checks, auth-profile compatibility, locale backfill, and locale constraint checks

pnpm run verify
  runtime configuration and reproducible OpenAPI passed
  formatting, ESLint, 317-source/1,777-import boundaries, and CSS ownership passed
  strict TypeScript passed
  52 tooling tests passed
  411 unit/component tests across 50 files passed
  13 environment-independent integration tests passed; database cases are covered by db:test above
  47 Playwright tests passed across Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit;
    1 opt-in historical capture skipped
  i18n, production bundle, and 9-entry workspace build passed
```

The production graph remains within every accepted ceiling: 435,303 largest JavaScript bytes,
1,004,370 total application/runtime JavaScript bytes, 258,039 gzip JavaScript bytes, and 50,242 CSS
bytes. The Phase 14 runtime consumes 94,370 raw and 12,039 gzip bytes of its 96,000/22,000-byte
allowance. Locale chunks total 359,242 raw and 96,177 gzip bytes and remain within their individual
and collective budgets.

After the version transition, `pnpm run phase:check` confirms 15 sequential completed gates and
workspace version `0.15.0`. Targeted formatting, lint, type, test, integration, browser, and build
checks remain the final protection against documentation or manifest transition drift.

## Accessibility

The gate preserves semantic structure, keyboard completion, localized route/result focus,
language-switch focus continuity, deliberate live announcements, visible text-plus-boundary state,
320-pixel reflow, forced colors, reduced motion, touch targets, React Aria locale synchronization,
and the cumulative axe coverage. The native macOS accessibility-tree review is bounded evidence;
`D-502` remains the broader retail screen-reader/browser matrix and no conformance claim is made.

## Security and data

Locale persistence remains current-account-only, allowlisted, same-origin, CSRF-protected, and
`private, no-store`. It grants no domain permission and creates no security or domain decision.
Generated outputs retain their existing permission, purpose-minimization, formula-neutralization,
and recipient/actor ownership rules. The gate fixture uses fictional local data and records no
password, token, production identifier, sickness detail, or private reason.

The repaired upgrade verifier now matches the actual Phase 9 schema and validates immutable punch
events, explainable ledger entries, Better Auth table compatibility, the `0022` account-locale
backfill, and the supported-locale constraint in an isolated schema that is dropped after execution.

## Versioning and release meaning

Completing `WL-1410` is the fifteenth zero-indexed phase gate. The root plus `apps/api`, `apps/web`,
`packages/config`, `packages/contracts`, `packages/database`, `packages/domain`, `packages/i18n`,
`packages/test-utils`, and `packages/ui` advance together from `0.14.0` to `0.15.0`. The lockfile
does not change because workspace versions are not stored in importer metadata.

`0.15.0` is an internal milestone only. It authorizes no commit, tag, GitHub release, npm
publication, container publication, deployment, supported-version promise, browser warranty, or
accessibility conformance statement.

## Remaining boundaries

- `D-502` remains the explicit broader assistive-technology and retail-browser evidence boundary.
- RTL production content, another locale, translation management, per-employee timezone display,
  and jurisdiction-specific behavior remain deferred by ADR 0013.
- Exact partial-day work-versus-absence overlap, calculation-to-ledger mismatch, and break-duration
  attention require authoritative source facts and remain outside this presentation phase.
- No later numbered roadmap task is assigned. The portfolio presentation scope remains preserved
  in `docs/drafts/portfolio-presentation.md` pending an explicit scheduling decision.
