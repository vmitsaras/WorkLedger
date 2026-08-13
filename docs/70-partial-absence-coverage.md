# Partial Absence Coverage

**Task:** `WL-604`

## Outcome

Vacation requests and sickness reports now support three explicit coverage choices:

- `FULL_DAY`: an inclusive local-date range;
- `FIRST_HALF` or `SECOND_HALF`: one schedule-relative half of a local date; and
- `MINUTE_INTERVAL`: one same-date, half-open local minute interval.

The API creates immutable coverage segments for each choice. Vacation submission continues to
reserve only nominal covered entitlement while it awaits approval. Sickness reporting continues to
create one immediate effective absence record with no entitlement effect. Neither workflow exposes
medical-detail inputs.

## Coverage arithmetic and overlap

The domain resolves coverage against the effective weekly schedule and holiday calendar. First half
uses `floor(expected / 2)` and second half receives the remainder, so an odd 481-minute day becomes
240 and 241 minutes without rounding loss. Holiday and zero-hour coverage is retained visibly with
zero default entitlement or credit. A minute interval must be ordered, minute-aligned, contained in
one local date, and no longer than that date's non-zero scheduled expectation.

The persisted overlap check applies across all blocking absence states, including acknowledged
sickness. A full day conflicts with every segment on its date. The same half conflicts with itself,
opposite halves may coexist, and minute ranges may coexist only when half-open ranges are disjoint.
Minute coverage cannot mix with full/half coverage on the same date.

`calculateDailyAbsenceEffects` remains the source of truth for applying effective coverage to daily
calculation: quantity coverage is capped by unworked expected time and minute coverage subtracts the
exact worked intersection. This preserves the no-double-credit invariant when calculation sources
are evaluated.

## Accessibility and privacy

Both employee forms use a labelled coverage selector, conditional labelled native date/time inputs,
visible explanation that halves are not morning/afternoon, linked errors, a focus-managed error
summary, disabled pending submission, and focused success confirmation. Exact-time inputs are used
only for clock-specific coverage. Sickness continues to omit diagnosis, note, attachment, symptom,
and treatment fields.

## Evidence

- Domain tests cover exact odd-minute half partitioning, half-open minute coverage, and invalid
  over-schedule minute coverage.
- PostgreSQL API coverage proves both disjoint half requests persist and a minute request cannot mix
  with same-date half coverage.
- The existing daily-absence-effect suite proves worked-plus-absence credit never double-counts the
  same covered time.
