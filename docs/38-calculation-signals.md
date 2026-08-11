# Calculation Signals

**Task:** `WL-209`

**Outcome:** Complete. `packages/domain` now derives deterministic, structured warning and
submission-blocker code sets from already identified daily calculation facts.

## Scope

`calculateDailyCalculationSignals(input)` returns two frozen, canonically ordered code lists:

- warnings: `WORK_ON_ZERO_EXPECTED_DAY`, `WORK_ON_HOLIDAY`, `WORK_DURING_ABSENCE`, and the
  positive/negative flexible-time threshold warnings;
- submission blockers: incomplete or conflicting attendance, missing/overlapping schedule or
  policy assignments, invalid policy configuration, unresolved correction or approval-required
  absence, and source-to-ledger mismatch.

A holiday work fact produces `WORK_ON_HOLIDAY`, never the more generic zero-expected-day code.
Threshold signals compare the supplied signed balance to the configured non-negative threshold but
never modify, cap, or reclassify that balance. Repeated conflict facts yield one stable blocker
code only.

## Boundaries

The caller supplies explicit facts; this module does not infer a missing punch, configuration gap,
correction state, absence approval state, holiday, source mismatch, or absence/work intersection.
It also does not calculate a daily result, determine whether a date is provisional or complete,
create a warning acknowledgement, authorize submission, append a ledger entry, or persist data.

Unavailable final expected/worked/balance values produce no amount-derived warning. The caller's
explicit blocker facts remain authoritative, allowing later calculation/status code to distinguish
an incomplete past date from a current provisional date.

## Evidence

Focused unit tests cover holiday precedence, ordinary zero-hour work, positive/negative threshold
signals, work during absence, a combined missing-punch/schedule/policy/correction/absence/ledger
conflict set, unavailable final values, de-duplication, canonical ordering, and frozen outputs.
