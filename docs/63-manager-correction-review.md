# Manager Correction Review

**Task:** `WL-504`

**Status:** Complete.

Managers can view only pending correction requests for their current direct reports. The queue and
decision transaction resolve the current manager assignment at the time of access/decision; the
central policy also prohibits self-decisions, including for combined privileged roles.

The review surface compares stored immutable event/calculation facts with the proposed interval and
shows the employee's request reason. Approve, reject, and request-changes actions require a factual
reason and the request version. One transaction updates only the request workflow status/version,
appends the decision and a minimized audit event. It never alters a punch event, projection,
time-account entry, or `applied_corrections` record.

The queue is keyboard-operable, uses textual status/action labels, retains a visible explanation
that approval has not applied a correction, and disables all decision controls while the mutation
is pending.
