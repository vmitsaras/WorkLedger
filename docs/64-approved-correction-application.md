# Approved Correction Application

**Task:** `WL-505`

**Status:** Complete.

An authorized current non-self manager can apply an approved correction exactly once. The operation
is separate from approval so the review record remains clear before an authoritative daily outcome
changes.

For an unlocked month, one transaction verifies current direct-manager scope, approved request
status/version, its recorded approval decision, and the original target projection. It then writes
one source-linked `applied_corrections` interpretation, replaces the daily projection at its next
version, appends the resulting `DAILY_RECALCULATION_DELTA` when non-zero, and records minimized
audit evidence. The applied interpretation and ledger source link back to the approved correction;
raw punch events are never changed.

The supported proposal represents a replacement daily work interval. The new worked minutes are
the exact elapsed minutes between the approved proposal instants. Credited and balance minutes
preserve all non-work projection inputs and change by the resulting worked-minute delta. This is a
narrow interpretation application, not a rewrite of the event stream.

If the employee's target month is locked, application returns `PERIOD_ADJUSTMENT_REQUIRED` without
writing an applied correction, projection, or ledger entry. The post-lock adjustment workflow is
reserved for `WL-803`, after monthly snapshots exist.
