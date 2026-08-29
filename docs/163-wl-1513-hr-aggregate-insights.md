# WL-1513 Deterministic HR Aggregate Insights

**Task:** `WL-1513`  
**Status:** Complete  
**Contract:** `docs/162-wl-1512-hr-aggregate-privacy-contract.md` and ADR 0014  
**Date:** 2026-08-28

## Outcome

WorkLedger now provides exactly two provider-independent HR aggregate Insights: monthly closure
readiness and neutral absence coverage. Each request contains one literal HR workspace, one fixed
purpose, and one canonical organization-local calendar month. Unknown fields, caller-selected
cohorts, filters, comparisons, groups, ranges, identities, and free text are rejected.

The API reloads the active account, current organization, current HR role, organization scope,
timezone, month boundaries, and capture instant inside one repeatable-read transaction. The route is
same-origin, session and CSRF protected, private, `POST` only, and `no-store`.

## Aggregation and suppression

PostgreSQL calculates each fixed cohort from authoritative effective employment, schedules, daily
projections, monthly periods, and currently approved effective absence effects. The repository
returns only one safe purpose-specific aggregate or an internal `SUPPRESSED` decision. It never
returns employee rows or hidden threshold counts to the service.

The service constructs no fact, source, freshness boundary, limitation, or action until all three
fixed controls pass:

- at least 10 eligible employees;
- at least 3 contributing cases;
- at least 10 people in the non-contributing complement.

Suppression returns only purpose, month, capture instant, and
`PRIVACY_THRESHOLD_NOT_MET`. It does not identify the failed control, reveal proximity, publish a
partial metric, or retain a prior successful result.

Monthly closure readiness exposes eligible, locked, open, submitted, changes-requested, and
approved employee counts plus missing or incomplete employee-days. Missing monthly period state is
treated as open for an otherwise eligible employee, so the state counts remain exhaustive. Its sole
native action opens the Monthly time report for the same month.

Neutral absence coverage exposes eligible and covered employees, effective approved case count,
positive covered employee-days, and covered scheduled minutes. Holiday and zero-schedule effects
remain cases but do not add days or minutes. Latest cancellation or superseding effects remove the
source. Submitted or otherwise unapproved sources do not contribute. Its sole native action opens
the Team calendar for the same month.

The absence query does not select classification, subtype, absence name, reason, note, attachment,
diagnosis, entitlement account, identity, team, manager, or browser-visible row identifier.

## Browser and accessibility behavior

The authorized HR navigation area exposes `/hr-insights`. The page offers only the two fixed
purposes and a month control. It keeps requests and results in TanStack Query mutation memory and
does not add query parameters, local storage, session storage, saved views, export, clipboard,
interpretation, provider, or write controls.

Available results reuse the native factual presentation with explicit employee, case,
employee-day, and minute labels. Suppression is one complete textual warning rather than zero,
blank, color-only, or threshold-specific output. Loading and completion use a polite status, complex
form failures use the existing focused error summary, and authorization or validation failures use
textual alerts. English, German, and Spanish catalogs own every visible and accessibility string.

Component and real-browser evidence covers keyboard submission, route-heading focus, 320-pixel
reflow without horizontal page overflow, forced colors, reduced motion, generic suppression, clean
URL and browser storage, and automated axe checks.

## Security and privacy evidence

- Every run reauthorizes the current HR role and organization-wide report scope. Manager-only,
  revoked-role, deactivated-account, and cross-organization paths cannot reuse prior authority.
- Boundary fixtures exercise 9 and 10 eligible employees, 2 and 3 effective cases, and 9 and 10
  complement employees. Suppressed outputs remain the same shape at adjacent boundaries.
- Repeated identical reads are deterministic. Cancellation and supersession remove effective
  sources before threshold checks.
- Hostile sickness names and private notes are present in database fixtures and absent from the
  serialized result. An unapproved source with an effective row is also excluded.
- Source actions contain only the canonical month. They carry no employee, team, manager, absence
  type, request, or arbitrary filter.
- The service has no provider dependency, tool registration, persistence, audit event, export,
  notification, migration, or new package.

## Verification

The following gates passed on 2026-08-28:

```text
pnpm openapi:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm db:test
pnpm build
pnpm test:e2e
pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project=chromium --grep "keeps an HR aggregate suppressed"
```

The canonical PostgreSQL harness passed 15 files with 28 tests passed and one historical skip. The
unit and component gate passed 57 files and 486 tests. The broad integration gate passed 13 tests
with database-dependent cases separately covered by `pnpm db:test`. The full browser gate passed 50
tests with one governed historical visual capture skipped, including the focused HR scenario.

The production build emits the HR route as a lazy 4.23 kB raw, 1.63 kB gzip chunk. A bounded
8,000-byte raw and 3,000-byte gzip HR aggregate allowance covers the route and shared presentation
growth while preserving the existing largest-chunk, CSS, locale, and application baselines.

## Residual limits

This is bounded implementation evidence, not a whole-product WCAG conformance statement. Retail
assistive-technology coverage remains governed by `D-502`. Adjacent months can still be queried
independently, but each month uses the same fixed cohort algebra and independently passes every
privacy floor; WorkLedger provides no comparison or delta operation.

No publish, push, tag, deployment, provider request, or remote write was performed. No manifest or
workspace version changed because `WL-1513` is not a phase gate.

## Phase 15 gate confirmation

`WL-1516` restored the complete `0000` through `0022` migration fixture, added this route to the
canonical PostgreSQL command, and fixed final native-result construction so internal freshness
boundaries do not leak into or invalidate the strict public result. Available and suppressed HR
routes now pass the final database-backed release evidence recorded in
`docs/165-wl-1516-phase-15-gate-review.md`.
