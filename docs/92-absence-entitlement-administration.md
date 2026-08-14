# Absence-Type and Entitlement Administration

**Task:** `WL-904`

**Status:** Complete

## Scope

`WL-904` replaces the `/settings/absence` placeholder with organization-HR administration for bounded immutable absence-type versions. Employee detail now includes entitlement accounts, derived available/reserved/projected totals, immutable source history, and reason-required manual adjustments.

The slice does not expose absence requests or sickness records as configuration, create arbitrary workflows, edit existing ledger entries, or permit privileged self-adjustment.

## Absence-type versions

The transport and service reuse the domain validator accepted in `WL-600`. Versions are constrained to the four MVP codes, two workflows, three coverage units, three time treatments, three note modes, fixed neutral availability, bounded lead/retrospective days, and the accepted entitlement/reservation relationships. Sickness remains report-and-acknowledge with notes disabled and no entitlement account.

An ordinary version begins on the current organization-local date or later. Creation locks the organization, serializes the next code version, rejects an existing boundary or a no-effect replacement, closes only the version containing the new boundary, and preserves already scheduled later versions. Existing requests retain the exact absence-type version they captured.

## Entitlement adjustments

Manual adjustments are non-zero signed integer minutes and may take effect only on the current organization-local date or a future employed date. The selected absence-type version must be active and effective on that date, belong to the organization, have an entitlement account, and not be sickness.

One serializable transaction locks the active employee, writes a dedicated `entitlement_adjustments` source containing the required restricted HR reason and actor account, appends one linked `MANUAL_ADJUSTMENT` ledger entry, recalculates the account through the pure ledger engine, and appends minimized audit evidence. Earlier ledger entries are never changed or removed. Generic audit facts contain the signed minutes and effective date but not the free-text reason; `restrictedReasonId` points to the protected adjustment source.

Migration `0019_stale_loners.sql` creates the reason source with organization, employee, absence-type, actor, non-zero-minute, trimmed-reason-length, and lookup-index constraints.

## Authorization, privacy, and accessibility

Reads require current organization-HR authority. Mutations additionally require same-origin and CSRF protection and repeat authorization inside the transaction. Employee adjustments use the existing non-self configuration permission, so combined HR/employee roles cannot adjust their own balance. Technical/system roles receive no domain fallback.

Sickness configuration is visible only as bounded organization configuration; no sickness request, medical context, diagnosis, note, attachment, entitlement, or person detail enters the settings DTO. The adjustment form explicitly warns against entering medical details.

Both surfaces use visible labels, native controls, fieldsets, textual latest/historical/current/balance states, persistent success/error feedback, disabled pending actions, and document-order layouts. Totals and signed changes are textual rather than color-only, and component axe checks cover configuration and adjustment workflows.

## Evidence and remaining limits

Unit/component evidence covers bounded sickness-safe configuration, immutable history presentation, ledger explanations, reasoned signed adjustment requests, focusable error feedback, and axe checks. PostgreSQL/API integration covers version validation, adjustment persistence, derived totals, reason retrieval, audit linkage, and self-denial when a database is available.

Historical backdated entitlement correction, submitted/approved/locked-period interaction beyond the current/future ordinary boundary, bulk allocations, imports, and production-scale concurrency remain outside this slice. `WL-905` owns holiday calendar management.
