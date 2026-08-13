# Time-Record Attention and Recovery Guidance

**Task:** `WL-502`

**Status:** Complete.

## Scope

Time-record attention is now a structured, code-led presentation rather than an interpretation of
display text. The existing calculation warning and blocker vocabulary remains the only input:

- the Today response already supplies the current date's calculation warning and blocker codes;
- stored daily projections supply their persisted policy-warning codes; and
- daily detail derives attendance-specific blockers from immutable event reconstruction: an open
  session produces `ATTENDANCE_INCOMPLETE`, while invalid event order or minute precision retains
  its specific stable code.

The My Time table shows a warning count next to the affected date and links to its detail. Daily
detail presents the warning/blocker title, plain-language explanation, and the next useful review
or recovery step. No UI reads a human message to decide what it means.

## Guidance and action boundary

Reviewable issues link to the exact calculation, event list, or flexible-time balance that explains
them. Issues that an employee cannot resolve directly state that clearly:

- schedule, policy, and ledger-source issues require organization-administrator resolution;
- pending absence and correction items require their decision workflow; and
- historic immutable attendance remains read-only.

An unfinished attendance item directs the employee to its event list and, when the day is still
open, to Today for the only valid clock action. `WL-503` will add the auditable correction-request
form; this task deliberately does not add a direct edit, client-side mutation, or URL-encoded
correction draft.

## Accessibility and privacy

The reusable attention section uses a named heading, nested labelled groups, and semantic lists.
Titles and guidance identify warnings and blockers in text, so color is supplementary only.
Actionable destinations are real links; non-actionable information remains text instead of a
disabled or misleading control.

Work-during-absence guidance says only that work overlaps credited absence time. It does not expose
absence type, sickness detail, source identifiers, policy identifiers, actor data, or any correction
content. Unknown persisted warning codes fail as a safe service error rather than being silently
mislabelled.

## Evidence

- Formatting, ESLint, import-boundary checks, strict composite TypeScript, and reproducible OpenAPI
  all succeed.
- The full unit/component suite passes 157 tests, including 20 application-shell tests that verify
  complete warning guidance, incomplete attendance guidance, configuration-owned recovery text,
  detail links, and axe coverage.
- The full PostgreSQL/API integration suite passes 24 tests across 14 files, including persisted
  warning-code transfer and the derived `ATTENDANCE_INCOMPLETE` signal for an open attendance
  session.
- The Chromium suite passes all 12 scenarios, and the Vite production build plus public-workspace
  import check succeeds. The existing main-chunk-size advisory remains owned by `WL-1001`.
