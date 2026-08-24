# WL-1204 Administration, Report, and Audit Workflow UX Remediation

**Completed:** 2026-08-24  
**Scope:** Employee administration, time and absence configuration, holiday administration,
reports, domain audit, technical accounts, operations, and technical audit.  
**Version:** `0.12.0` remains unchanged because `WL-1204` is not a phase exit gate.

## Outcome

Dense role surfaces now follow the Quiet Ledger hierarchy and shared component contracts while
preserving their existing domain and permission boundaries. The employee directory becomes a
complete record list below `48rem` and a semantic comparison table at wider widths. Team catalog
work is visually separated from employee search, and a populated team explains both why
deactivation is unavailable and how to make it available.

Time, absence, holiday, employee assignment, system account, operations, report, and domain audit
surfaces now use the shared panel, alert, status, filter, pagination, data-table, and route-state
patterns where their semantics apply. Disabled configuration and assignment actions have adjacent
reasons and recovery guidance. Two-dimensional report and audit comparisons retain named local
scroll regions with visible narrow-screen instructions instead of causing page-level overflow.

The stale `/system/audit` placeholder is replaced with a working technical audit explorer.

## Technical audit boundary

`GET /v1/system/security-audit` is a private no-store system-administrator endpoint. Its bounded
URL-owned filters support organization-local dates, exact action code, outcome, target kind, and
pagination. Authorization uses the existing `SECURITY_AUDIT_READ` installation action inside the
same database transaction that resolves the current account and organization timezone.

The repository applies organization scope and all filters before totals and pagination. The web
DTO includes only action, actor role or trusted system process, occurrence time, outcome,
privileged flag, reason code, target kind/reference, and the existing allowlisted safe facts. It
does not include actor account ID, target account ID, organization ID, request ID, domain payload,
notification content, IP address, user agent, token, or unrestricted text. Domain and technical
audit audiences remain physically and logically separate.

## Accessibility and responsive behavior

- The employee directory keeps employee identity, number, employment, account, and role context in
  each narrow record card. The wider table retains a caption and named local overflow region.
- Report and audit tables have captions, column headers, named focusable scroll regions, and visible
  horizontal-scroll instructions. Outcome and workflow state remain textual and do not depend on
  color.
- Loading and empty states use the shared route-state contract. Mutation messages use deliberate
  status or alert behavior, while persistent record warnings do not create repeated live alerts.
- Sickness-specific disabled settings explain the fixed workflow, disabled notes, absent
  entitlement account, and lack of pending reservation without exposing medical information.
- Populated-team, missing schedule, missing policy, missing entitlement type, and blocked holiday
  controls reference adjacent recovery text.
- Chromium evidence covers 320 px reflow and desktop presentation, forced colors, hostile long
  technical references, page containment, route focus, filters, and axe checks.

## Verification boundary

Focused component coverage passed for employee and technical account administration, time,
absence and holiday settings, entitlement administration, reports, domain audit, and technical
audit. The focused Chromium scenario passed for narrow/wide employee layouts and the technical
audit explorer. The PostgreSQL audit integration scenario is updated to verify filtered technical
results and the absence of account, request, and target-account fields; it remains environment
conditional when no integration database is configured.

The full repository gates are recorded in `PROJECT_STATUS.md`. Systematic screenshot comparison
and manual assistive-technology pairing remain release-gate work under `WL-1206`.

## Change boundary

No migration, audit write shape, domain rule, authentication flow, CSRF rule, dependency, browser
persistence, publication, deployment, or workspace version changed. The database read contract was
extended only to support safe technical-audit filters, totals, and pagination over the existing
security audit table.
