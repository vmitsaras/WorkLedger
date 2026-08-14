# Monthly Period Summary and Blockers

**Task:** `WL-800`

**Status:** Complete

## Scope

`WL-800` adds the read-only monthly review projection used by the remaining Phase 8 workflows. It
does not submit, approve, request changes, lock, reopen, adjust, report, print, export, or copy a
period. Those mutations and secondary surfaces remain owned by `WL-801`–`WL-805`.

## Projection contract

The framework-independent monthly calculator consumes one persisted monthly period plus identified
employment, configuration-assignment, daily-projection, unresolved-workflow, and time-account
facts. It derives:

- organization-local month end and covered employment dates;
- `INCOMPLETE` or `READY_FOR_SUBMISSION` only for `OPEN`/`CHANGES_REQUESTED` periods;
- complete-date expected, worked, break, absence-credit, adjustment, credited, and balance totals;
- posted opening balance, closing balance, and in-period delta;
- date-scoped warnings and blockers, including missing/incomplete daily results, missing or
  overlapping assignments, unresolved corrections, approval-required absence, and ledger-source
  mismatch; and
- snapshot schema version `1` plus a canonical SHA-256 fingerprint of the exact repeatable-read
  source set.

Readiness requires an ended organization-local month, at least one covered employment date, a final
`COMPLETE` result for every covered date, an exact base posting and net posting for every complete
date, matching calculated/ledger period deltas, and no blocker. Missing and non-final dates expose no
final minute amounts and are excluded from totals.

## Data and authorization

`GET /v1/monthly-periods/:periodId` loads all facts in one repeatable-read transaction and applies
`MONTHLY_PERIOD_READ` authorization to self, a current effective direct manager, or organization HR.
System-only, unrelated, former-manager, inactive, cross-organization, and malformed/unknown targets
do not receive monthly data. The response is `private, no-store` and omits absence classification,
sickness context, request/reviewer reasons, entitlement values, protected source identifiers, and
raw source-reference payloads.

The service reads the existing Phase 3 monthly-period, daily-projection, assignment, workflow, and
ledger tables; no migration or history rewrite is required. `D-402` remains open because this task
adds read authorization only and does not select an approval/lock authority for `WL-802`.

## User experience and accessibility

The real `/monthly-periods/:periodId` route is linked from an available month on My Time. It exposes:

- persisted workflow state separately from derived readiness;
- textual readiness and read-only explanations;
- blocker and warning sections with authorized daily-record recovery links;
- separately labelled calculated totals and posted-ledger reconciliation values; and
- a captioned native table in a named, keyboard-focusable horizontal-scroll region. Final amounts
  appear only for complete dates; missing/non-final values use a described dash rather than color.

Loading, permission-denied, not-found/dependency failure, retry, ready, warning, and blocker states
remain textual. Route heading focus follows the shared route-presentation contract, and automated axe
coverage exercises the ready view.

## Verification evidence

- Domain unit fixtures cover a reconciled ready month, missing/incomplete dates, unresolved
  correction/absence blockers, posting mismatches, and non-open workflow readiness.
- Strict contract tests reject protected fields and invalid monthly response shapes.
- Live PostgreSQL/API integration creates deterministic complete and incomplete months and verifies
  self/current-manager/HR access, unrelated-manager/system denial, exact totals, blockers,
  fingerprint shape, privacy minimization, and `private, no-store` caching.
- Component tests cover route focus, status/readiness text, totals, blocker/warning recovery links,
  the captioned focusable table, permission denial, dependency retry, and axe.
- OpenAPI is regenerated from the strict Zod/Fastify contract.
- The full quality gate passes 24 repository-contract tests, 228 unit/component tests, 34 live
  PostgreSQL integration tests, 16 Chromium scenarios, strict static checks, and the production
  build.

## Remaining work

`WL-801` owns warning acknowledgement and the versioned employee submission transition. `WL-802`
must first resolve `D-402`, then add manager changes-requested, approval snapshot creation, and the
separate lock transition. This read model does not claim that an approved snapshot already exists for
an open period; `snapshotVersion` identifies the future canonical schema and current source set only.
