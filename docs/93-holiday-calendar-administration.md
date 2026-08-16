# Holiday Calendar Administration

**Task:** `WL-905`

**Status:** Complete

## Scope

`WL-905` replaces the HR holiday-calendar placeholder with organization-wide, date-only holiday administration. HR can list configured holidays, enter a bounded name and local calendar date, review the calculation impact, and explicitly confirm creation.

The ordinary flow is intentionally append-only. It does not rename or delete holidays, backdate changes, reinterpret protected monthly periods, or claim that existing daily projections have already been rebuilt.

## Impact and historical integrity

The preview is calculated inside the authorized organization scope. It returns aggregate counts only: employees who are employed and scheduled for positive minutes on the date, existing daily projections on the date, and submitted, approved, or locked periods in the containing month. It never returns employee identities, schedule details, or absence information.

A holiday can be created only on or after the current organization-local date, when that date is not already configured and no protected period exists. Creation re-runs the impact check in the same serializable transaction, inserts the date-only row, and appends minimized audit evidence. Existing projections are reported as affected work for a later recalculation mechanism; this slice does not silently mutate or mark them recalculated.

## Authorization, security, and accessibility

Reads and previews require current organization-HR configuration authority. Mutations also require same-origin and CSRF protection, and authorization is repeated in the transaction. The API returns private, no-store responses and generic aggregate impact.

The page uses visible labels and native date input, invalidates a preview after either field changes, requires an explicit preview before confirmation, exposes impact and blockers as text, prevents duplicate pending actions, preserves a stable heading hierarchy, and provides focusable error plus polite success feedback. Component axe coverage exercises the complete preview-and-create path.

## Evidence and remaining limits

Contract, component, and API/database integration evidence covers strict date-only input, aggregate preview, scheduled-employee counting, future creation, duplicate/past denial, listing, and one minimized audit event. Database-backed cases compile but are skipped when PostgreSQL is unavailable.

Bulk holiday import, regional calendars, recurrence rules, renaming/deletion, and automatic bulk projection rebuilding remain outside this slice. `WL-906` owns the authorized audit explorer; Phase 10 owns production-scale concurrency, browser, assistive-technology, performance, and security matrices.
