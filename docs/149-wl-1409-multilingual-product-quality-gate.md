# WL-1409 multilingual product quality gate

**Date:** 2026-08-27  
**Scope:** British English, German, and Spanish application and output integration across employee,
manager, HR, system, accessibility, responsive, visual, usability, security, migration, and upgrade
boundaries  
**Outcome:** The bounded multilingual gate passes with no open P0 or P1 defect. The PostgreSQL
runtime could not be started in this environment, so database-backed cases remain an explicit
environment residual rather than a claimed pass.

**Follow-up:** `WL-1410` subsequently closed this environment residual with the database-enabled
integration suite and manual prior-release upgrade verifier. See `docs/150-phase-14-gate-review.md`.

## 1. Gate boundary

`WL-1409` verifies the cumulative Phase 14 implementation after fluent-human catalog approval. It
does not add a locale, change a domain rule, widen authorization, localize a domain code, or advance
the workspace version. `WL-1410` still owns the final full quality gate, release checklist,
documentation reconciliation, and `0.15.0` version transition.

The gate combines automated contracts, component and integration tests, real browser interaction,
deterministic screenshots, original-resolution review, and a bounded macOS accessibility-tree
review. It is not a whole-product WCAG or screen-reader conformance statement. The exact retail
assistive-technology matrix remains the documented `D-502` residual.

## 2. Cross-role and locale evidence

| Area | Evidence | Result |
| --- | --- | --- |
| Locale resolution | Signed-out storage, browser fallback, account authority, refresh, failed-save rollback, and protected-shell startup tests | Pass |
| Employee | German and Spanish Today, My time, requests, calendar, and monthly-review traversal with localized focus targets, states, actions, formatting, and axe checks | Pass |
| Manager | German and Spanish Approval inbox at 320 CSS pixels with complete records, no page overflow, forced colors, reduced motion, focused heading, and axe | Pass |
| HR | German and Spanish employee administration at 1440 CSS pixels with localized search, table semantics, actions, focus, and axe | Pass |
| System | German and Spanish operations at 390 CSS pixels with localized state presentation, purpose-minimized technical detail, no page overflow, focus, and axe | Pass |
| Browser matrix | Signed-out German selection, persistence, focus continuity, announcement, and axe in desktop Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit profiles | Pass |
| Output | Print, clipboard, CSV, notification, invitation, password reset, and email locale/security tests from `WL-1407` remain green in the cumulative suite | Pass |
| Catalogs and descriptors | 2,069 messages, seven namespaces, three production locales, and all 39 descriptors pass key, interpolation, plural, plain-text, and governed-source enforcement | Pass |

User-authored fixture values such as `Client Services`, and bounded technical diagnostics such as
`Bounded readiness timeout.`, remain verbatim by design. They are not product-copy fallback or a
mixed-language defect.

## 3. Visual and responsive evidence

`pnpm test:visual:i18n` is the dedicated Phase 14 comparison entry point. The local evidence run
used the installed Playwright binary because the standard pnpm wrapper detected Node `24.19.0`
instead of the repository-pinned `24.18.0` and attempted an interactive module refresh. The update
run wrote eight files under `phase-14/wl1409`; the comparison run reproduced all eight.

| Image | Rendered size | SHA-256 |
| --- | ---: | --- |
| `de-DE-approvals-320x900` | 320×1391 | `e82824f706b1aaf3a41f3796a0042762af9b388c411c70a52b5462e95877eaaa` |
| `de-DE-employees-1440x900` | 1440×900 | `3583f2f70bb03b46fb326167b387b8083279bf22a58ffb4656f94c8a128895ca` |
| `de-DE-operations-390x844` | 390×1687 | `92b12a638209f29751eda67bd96fc4a7fb1a6d4fe2bb6457fc279788b706b6d5` |
| `de-DE-today-320x900` | 320×2276 | `da98be9b752ec553c13b88c862756adeec39129065deabc7501c9c5f4ac2c37b` |
| `es-ES-approvals-320x900` | 320×1399 | `9de0074d079316c0c4417d199c30d2600d7db59500f8f3206df7bd421ca5fef6` |
| `es-ES-employees-1440x900` | 1440×900 | `44613f2f629b47280aaa3d81fbc755de0424d529dcff1dc425f4a1dc3b1e9073` |
| `es-ES-operations-390x844` | 390×1683 | `9792ce25ea0fc61935c8c6fef8a2ce7daeffaee2a259f9729d8fb38e65e1b167` |
| `es-ES-today-320x900` | 320×2232 | `5c2ef882bf42f22d2ce1ecf610f459aa9c574a9e10d93d14a00388ee28e0e5fe` |

All eight images were reviewed at original resolution. No translated heading, action, status,
record fact, or recovery instruction is clipped or hidden. Today preserves action-first ordering
and reconciled values at 320 pixels. Approval records remain complete without page-level panning.
Desktop administration uses the available width without losing table context. Mobile operations
keeps warnings, dependency status, and operator guidance in logical order.

## 4. Accessibility and usability evidence

- Automated axe checks report no detected violation in the German and Spanish employee, manager,
  HR, system, and signed-out scenarios.
- Route transitions focus the localized `h1`. Locale changes keep focus on the language selector
  and emit one localized status announcement.
- German and Spanish Approval inbox checks run at 320 CSS pixels in normal presentation and with
  forced colors plus reduced motion. Statuses retain text, border, and marker.
- The macOS Chrome accessibility tree exposes localized German and Spanish document titles, skip
  links, selector names and values, status text, level-one error headings, recovery links, and real
  buttons. No unlabeled translated control or semantic substitution was found.
- The existing `WL-1307` bounded VoiceOver evidence remains applicable to the unchanged Today
  semantic structure. This task does not claim a new whole-product VoiceOver matrix.

## 5. Security, privacy, formatting, and upgrade evidence

- Locale mutation remains current-account-only, same-origin, CSRF-protected, allowlisted, and
  `private, no-store`. Cross-origin, missing-CSRF, unsupported-locale, and caller-supplied-account
  requests remain rejected by the existing database-enabled integration coverage.
- Translation values remain plain text. Catalog enforcement rejects markup, bidirectional control
  characters, missing parameters, copied source catalogs, and hard-coded governed JSX/ARIA copy.
- Recipient and actor locale ownership remains explicit for email and CSV. Formula neutralization,
  ISO values, integer minutes, authorization, and purpose minimization remain covered.
- The manual upgrade verifier now uses the current `auth_users`, `auth_accounts`, and
  `auth_sessions` schema, safely remaps hard-coded `public` migration references into its isolated
  schema, and checks existing-account `en-GB` backfill, supported-locale persistence, and rejection
  of `en-US`.
- A focused database integration regression creates an account before migration `0022`, applies
  the locale migration, and verifies the same backfill and constraint behavior when the PostgreSQL
  harness is available.

The local PostgreSQL service refused connections on port `54329`, and Docker Desktop was not
running, so the new database-backed regression and the upgraded manual verifier could not execute
here. The environment-independent integration suite passed 13 tests and skipped 46
PostgreSQL-dependent tests. This is retained as an environment residual for `WL-1410`, not converted
into a pass.

## 6. Verification

The environment-independent completion run produced:

```text
Workspace, phase, i18n, formatting, lint, boundary, and CSS contracts
  pass; 317 sources and 1,777 imports

Tooling tests
  52 passed

Unit and component tests
  50 files passed; 411 tests passed

Integration tests
  4 files and 13 tests passed; 22 files and 46 PostgreSQL-dependent tests skipped

Playwright
  47 passed; 1 opt-in historical screenshot capture skipped

Phase 14 visual update and comparison
  4 scenarios passed per run; 8 screenshots written and then reproduced

TypeScript, OpenAPI, runtime configuration, production web build, bundle budgets, workspace build
  pass
```

The production graph remains within every accepted budget: 435,303 largest-chunk bytes, 1,004,370
raw JavaScript bytes, 258,090 gzip JavaScript bytes, and 50,242 CSS bytes outside catalogs. The i18n
runtime consumes 94,370/12,090 bytes of its 96,000/22,000-byte allowance. Catalog chunks total
359,242 raw and 96,399 gzip bytes and remain within their individual and collective ceilings.

## 7. Gate decision and next task

`WL-1409` passes with no open P0 or P1 multilingual defect in the bounded audit. At completion,
`WL-1410` was next and owned the final release checklist, complete wrapper quality gate under the
pinned toolchain, database-enabled residual, project-memory reconciliation, and workspace version
transition to `0.15.0`. That follow-up is now complete in `docs/150-phase-14-gate-review.md`.
