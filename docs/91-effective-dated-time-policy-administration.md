# Effective-Dated Time-Policy Administration

**Task:** `WL-903`

**Status:** Complete

## Scope

`WL-903` adds organization-HR administration for immutable time-policy versions and effective-dated employee policy assignments. The MVP policy shape is deliberately bounded to manual break handling with warnings, an integer flexible-time warning threshold from `0` through `1,440` minutes, and exact arithmetic with no rounding. This is a warning configuration; it never caps, discards, or reclassifies worked time.

## Version and assignment behavior

Reusing a policy name with changed rules creates the next serialized immutable version. An identical repeat is rejected. Creating a version changes no assignment. Ordinary employee changes may begin only on the current organization-local date or a future employed date, preserve earlier and already scheduled later boundaries, and must leave every current/future employed date covered. Historical and locked records retain the policy-version references captured by their source calculation or snapshot.

## Preview, authorization, and privacy

The employee form presents a textual impact preview before submission: selected version, effective boundary, warning threshold, manual-break behavior, no-rounding behavior, and the preservation of earlier dates. The preview derives only from already-authorized employee configuration data and exposes no attendance, balance, sickness, or approval detail.

All reads require current organization-HR authority. Mutations additionally require same-origin and CSRF protection, re-resolve authorization inside a serializable transaction, prohibit privileged self-assignment, validate organization ownership and full employment coverage, and atomically close/insert the assignment with minimized domain audit evidence. Audit facts omit policy names, complete rules, employee names, and form payloads.

## Accessibility

Forms use visible labels, native select/date controls, disabled pending states, textual current/history/gap information, and persistent status or alert feedback. Preview updates use a polite live region and communicate every policy effect in text without color dependence. Historical versions remain visible and labelled as latest or historical.

## Evidence and limits

Contract and component tests cover strict bounded rules, immutable version requests, textual preview, persistent success, and axe checks. Database/API integration covers version increments, identical-version rejection, current/future coverage, preserved half-open history, and atomic assignment paths when PostgreSQL is available. Broader cross-browser, assistive-technology, concurrency, performance, and production-security matrices remain Phase 10 work.

`WL-904` owns absence-type and entitlement administration. This task does not introduce payroll, overtime, automatic-break, rounding, or arbitrary policy-workflow behavior.
