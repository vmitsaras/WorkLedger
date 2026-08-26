# Approval inbox triage, filtering, and responsive evidence

**Task:** `WL-1308`  
**Completed:** 2026-08-26  
**Outcome:** The Approval inbox now opens as a needs-review queue, keeps alternate workflow states
in one compact Queue view control, places the result count and next task before secondary controls,
and presents every record and Review action without page-level horizontal scrolling at supported
narrow widths.

## Scope and authority

This task changes the Approval inbox collection presentation, route tests, responsive browser
evidence, and project memory. It does not change the approval API, collection authorization,
decision rules, domain state, database schema, migration, dependency, or workspace version.

The existing scoped API remains authoritative for items, current-team options, counts, sorting, and
pagination. Managers receive only current effective direct reports and cannot act on themselves.
HR receives organization scope with the same self-exclusion rule. Scope still applies before
filtering, totals, sorting, and pagination.

## Triage and interaction decisions

| Concern | Result |
|---|---|
| Default task | `/approvals` resolves to `ACTION_REQUIRED` and leads with the server total, such as `Needs review: 41`. |
| Alternate states | A labelled Queue view select exposes Needs review, Waiting on employee, Completed, and All records. Changing it writes the accepted status to the URL, resets pagination, and keeps focus on the control. |
| Applied state | The visible summary names generic status, broad category, authorized current-team name, affected-date range, and human-readable order. The URL retains the opaque team ID only. |
| Secondary filtering | One native disclosure contains category, current team, paired affected dates, and order. It is collapsed at every width so filters do not dominate the first viewport. |
| Sort language | Six understandable Order choices replace separate sort-key and direction controls while preserving the accepted API query pair. |
| Reset | A visible `Reset to needs review` action appears only when the route differs from the documented default. |
| Record action | Action-required records use `Review and decide` in complete record lists. The comparison table uses the concise visible label `Review`; every link keeps a record-specific accessible name. |
| Pagination | One-page and empty views omit pagination. Multi-page views state the visible range, such as `Showing 21–40 of 41`, while previous and next controls retain focus through URL changes and browser history. |
| Saved views | The privacy-safe URL is the restorable and shareable view state. This task adds no named view, account preference, local storage, or second source of truth. |

## Responsive and visual evidence

The application uses the complete record list until the viewport reaches `72rem`, where the shell's
content column can hold the stable comparison columns and visible action. This resolves the prior
768-pixel condition where the viewport met the old table threshold but the usable content region
did not. At wider sizes, the table remains in a named focusable region as a keyboard-safe fallback
for intermediate content fit.

The opt-in comparison command is:

```text
WORKLEDGER_E2E_PORT=4174 WORKLEDGER_ASSERT_PHASE_13_APPROVALS=1 pnpm exec playwright test apps/web/e2e/application-shell.spec.ts --project=chromium --grep "prioritizes needs-review approvals"
```

| Viewport | Presentation | Full-page file | Raster size | SHA-256 |
|---|---|---|---:|---|
| 1440×900 | Comparison table | `approval-inbox-1440x900-chromium-darwin.png` | 1440×900 | `624d69bd087ef7e6b0da1986c6810520503246766b7e4b626ab4b3a9404df151` |
| 768×1024 | Complete record list | `approval-inbox-768x1024-chromium-darwin.png` | 768×1024 | `4cc13ff6c592eb3a9554b5db903de705b5e5aacd204fe8bcd9f333b478b4b374` |
| 390×844 | Complete record list | `approval-inbox-390x844-chromium-darwin.png` | 390×1052 | `bc2e2f3f763d106803f1259ae4d78d82ae3fdad7dff73b06e425bb186cb79bd2` |
| 320×900 | Complete record list | `approval-inbox-320x900-chromium-darwin.png` | 320×1052 | `4829abf7fdf20ea44b74edc2cd589d9a677b202980243d9c8cc0065e48983150` |

Manual original-resolution inspection found no page-level horizontal overflow, clipped label,
hidden record field, inaccessible action, color-only current view, or filter-first hierarchy. The
1440 table keeps employee and current team in one row header, then workflow, status, affected date,
submitted time, and Review. The 768, 390, and 320 lists preserve the same employee, workflow,
status, affected dates, submitted time, current team, and action relationships in source order.

The Phase 12 Approval images remain preserved as historical evidence. The files above are the
current `WL-1308` acceptance baseline.

## Accessibility evidence

- One visible route `h1` remains the navigation focus target.
- The native Queue view select supports browser history, retains focus, and exposes the current
  generic status through its visible label and selected option without color dependence.
- The filter disclosure is native `details` and `summary`; its form keeps visible labels, paired
  date errors, an error alert, and apply-button focus after URL navigation.
- Wide results retain a captioned table, row and column headers, `aria-sort`, a named focusable
  scroll region, and visible actions.
- Narrow results use a semantic ordered list of articles and definition-list facts. They do not
  duplicate or omit the table's record meaning.
- Record and pagination actions meet the 44-pixel target. The 320 browser case asserts no page
  overflow and runs axe after keyboard filter, pagination, and responsive transitions.
- Background result refresh remains a polite status update without moving focus. Stable results do
  not reserve an empty visual status row.
- Empty, filtered-zero, loading, recoverable dependency error, permission loss, session expiry,
  manager, and HR variants remain covered in component tests.

## Privacy and permission regression

- The only Approval URL state remains generic status, broad workflow category, opaque authorized
  team ID, paired local dates, allow-listed sort and direction, page, and limit.
- Sickness classification, absence subtype, note, reason, entitlement, employee search text, name,
  and email do not enter the URL or filter controls.
- Browser tests inspect every Approval request for forbidden `absenceType`, employee search, and
  sickness or vacation query values.
- Component tests reject sensitive or unknown query keys and reload the canonical needs-review
  default. They also verify that generic collection rows contain no sickness or vacation wording.
- Permission loss replaces the collection with a focused neutral denial and no item, filter,
  request-reference, or target detail. HR collection access still works without an employee link.
- Existing PostgreSQL-backed Approval integration coverage remains the server evidence for current
  manager scope, former and unrelated manager exclusion, self-exclusion, HR scope, field
  minimization, scope-before-count behavior, and explicit detail denials.

## Verification

- The Approval inbox component file passes all 11 cases, including axe, default needs-review state,
  URL hydration, status navigation and browser back, broad filter validation, focus-preserving
  pagination, complete narrow records, privacy rejection, permission loss, HR access, dependency
  recovery, and session expiry.
- The targeted Chromium flow passes with the four current snapshots, keyboard interaction,
  canonical URL assertions, action target measurement, no page overflow, and axe.
- Strict TypeScript and the workspace graph pass. CSS ownership passes without introducing a new
  route-specific class family.
- Full `pnpm verify` passes runtime configuration, reproducible OpenAPI, formatting, lint,
  boundaries, CSS ownership, strict TypeScript, 37 tooling checks, 369 unit/component tests, 13
  available integration tests with 45 PostgreSQL-dependent skips, 37 browser scenarios with one
  opt-in capture skipped, and the production/public-root build. Bundle budgets pass at 370,748
  largest JavaScript bytes, 897,931 total JavaScript bytes, 242,867 gzip JavaScript bytes, and
  49,960 CSS bytes without changing a budget.

## Remaining boundaries

`WL-1311` still owns cross-route label, heading-focus, status, card-density, and conditional table
overflow normalization. `WL-1312` owns the broader deterministic cross-route state and visual gate.
This task does not claim a complete assistive-technology matrix or whole-product WCAG conformance.
