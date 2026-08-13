# Absence-Type Policy Model

**Task:** `WL-600`

## Outcome

The framework-independent domain package now owns one bounded, effective-dated absence-type
policy model. It supplies the MVP default versions for vacation, sickness, unpaid leave, and
other absence, validates unsafe combinations before persistence, and leaves request, decision,
ledger, calculation-effect, and UI workflows to later Phase 6 tasks.

## Version shape

An `AbsenceTypeVersion` contains its stable MVP code, display name, active flag, and a half-open
`effectiveRange`. Its policy has only the accepted fields: workflow, allowed coverage units,
entitlement account category, pending-reservation behavior, time treatment, lead and
retrospective limits, request-note mode, and neutral availability state.

The resolver requires exactly one version for the requested type and local date. An overlap or
gap is `POLICY_CONFIGURATION_INVALID`; a sole matching inactive version is
`ABSENCE_POLICY_INACTIVE`. This prevents selection by insertion order and preserves the
effective-date rule from `docs/03-domain-rules.md`.

## Bounded validation

- Coverage is a non-empty, duplicate-free subset of `FULL_DAY`, `HALF_DAY`, and `MINUTES`.
- Workflow is only `APPROVAL_REQUIRED` or `REPORT_AND_ACKNOWLEDGE`.
- Time treatment is one of the existing daily-calculation treatments.
- An entitlement account requires `APPROVAL_REQUIRED`; `RESERVE_PENDING` also requires that
  account. This rejects the invalid `REPORT_AND_ACKNOWLEDGE` plus entitlement/reservation
  combination in `EX-075`.
- Sickness is report-and-acknowledge, has no entitlement/reservation, and forces note mode
  `DISABLED`. Its default retrospective limit is seven calendar days; configurable timing limits
  are integer calendar-day values from zero through 365.
- Team-facing state is fixed to neutral `UNAVAILABLE`; policy names never control team exposure.

The model intentionally does not permit arbitrary transitions, custom team states, attachments,
diagnosis/medical fields, or a generic workflow builder.

## MVP defaults

| Type | Workflow | Entitlement / reservation | Time treatment | Note mode |
|---|---|---|---|---|
| Vacation | `APPROVAL_REQUIRED` | `VACATION` / `RESERVE_PENDING` | `CREDIT_COVERED_EXPECTATION` | `OPTIONAL` |
| Sickness | `REPORT_AND_ACKNOWLEDGE` | None | `CREDIT_COVERED_EXPECTATION` | `DISABLED` |
| Unpaid leave | `APPROVAL_REQUIRED` | None | `REDUCE_COVERED_EXPECTATION` | `OPTIONAL` |
| Other | `APPROVAL_REQUIRED` | None | `NO_TIME_EFFECT` | `OPTIONAL` |

All defaults permit full-day, half-day, and minute coverage and project neutral unavailability.
`OTHER` can be entitlement-backed only when its workflow remains approval-required.

## Persistence alignment

`absence_types` now persists `valid_from` and nullable `valid_to` next to the already-versioned
row. The migration gives historic rows the conservative open-start date `0001-01-01` while it
adds the non-null field, then removes the temporary database default. The database rejects an
empty or reversed range. Development seed policies now consume the shared MVP defaults rather
than keeping a second, incomplete JSON policy shape.

## Evidence

Domain unit tests cover the four defaults, frozen values, half-open resolution, gap/overlap and
inactive configurations, every bounded invalid combination, and the valid entitlement-backed
`OTHER` case. Database schema and migration tests cover the effective-range columns and check.
