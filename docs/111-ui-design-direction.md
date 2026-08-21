# WL-1101 UI Design Direction — Quiet Ledger

**Status:** Phase 11 foundation complete; Phase 12 workflow adoption approved
**Completed:** 2026-08-21  
**Applies to:** `apps/web`, `packages/ui`, company-identity configuration, and the Phase 12 workflow polish tasks  
**Evidence:** Product charter, role/permission model, UX/accessibility contract, current UI source, and `docs/110-ui-ux-baseline-audit.md`  
**Implementation boundary:** This document defines the direction. Token, component, shell, identity, and route changes remain owned by `WL-1102`–`WL-1206`.

---

## 1. Executive decision

WorkLedger adopts **Quiet Ledger** as its visual and interaction direction.

Quiet Ledger is a calm operational language built around clear task order, aligned time and balance
values, restrained blue action, neutral paper-like surfaces, explicit semantic states, and thin
ledger-like rules. It expresses trust through legibility and explainability rather than decoration.
Employee routes use comfortable spacing and one dominant task. Manager, HR, report, and technical
routes use denser structures, but never by shrinking interactive targets, hiding context, or making
the application feel like a generic admin template.

The direction deliberately avoids bento dashboards, decorative charts, glass effects, ambient
gradients, oversized KPI tiles, celebratory balance treatments, ornamental dark mode, and a card
around every section.

## 2. Evidence labels

| Label        | Meaning                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Existing** | A product, domain, accessibility, architecture, or implementation constraint already accepted by the repository. |
| **Derived**  | A design requirement inferred directly from the product and WL-1100 evidence.                                    |
| **Approved** | The implementation direction selected by WL-1101.                                                                |

## 3. Design problem frame

### Core problem

WorkLedger already exposes complex, trustworthy operational data, but its interface gives too many
surfaces equal visual weight and implements recurring patterns independently. It must become easier
to understand the current state and next safe action without reducing the calculation detail,
history, permission clarity, or administrative density that makes the product credible.

### Problem statement

> We need one coherent interface system for employees, managers, HR administrators, and system
> administrators so each actor can understand current state, complete the next authorized task, and
> inspect the supporting evidence without sacrificing privacy, accessibility, or historical truth.

### Design challenge

> How might we make trustworthy operational complexity feel calm and direct for frequent employee
> work while remaining compact and scan-efficient for managerial and administrative work?

### Purpose

**Primary:** Make current state and the next valid action understandable without detective work.

**Secondary:** Make the resulting calculation, workflow state, and preserved history easy to verify.

**Supporting:** Make role scope and system boundaries credible without turning implementation or
privacy assurances into the primary task copy.

### Audience by situation

| Audience             | Situation                                                                    | Primary need                                                                 | Friction to remove                                                                                  |
| -------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Employee             | Starts or ends work, checks a warning, requests a change, or reviews a month | Confidence about current state, valid action, and balance effect             | Repetition, long explanations before action, uncertainty about provisional versus final values      |
| Manager              | Processes a queue between other work                                         | Rapid prioritization, sufficient decision context, clear outcome             | Off-canvas actions, dense filters, repeated scanning, privacy language competing with task language |
| HR administrator     | Maintains records and effective-dated configuration                          | High information density with explicit scope, effect, and history            | Long mixed-purpose pages, inconsistent states and controls, weak recovery cues                      |
| System administrator | Diagnoses service/account state                                              | Clear severity, affected dependency, and valid recovery path without HR data | Styling/semantic drift, raw technical presentation, missing audit workflow                          |

### Primary message

> Your current state, next valid action, and supporting record are clear and trustworthy.

### Communication sequence

1. **Orientation:** Where am I, whose or which record is in scope, and what period applies?
2. **Current state:** What is true now, and is it provisional, submitted, approved, locked, stale, or unavailable?
3. **Next task:** What can or must I do now?
4. **Problems and recovery:** What blocks safe completion, and how can I resolve it?
5. **Effect:** What time, balance, entitlement, availability, or system consequence follows?
6. **Evidence:** Which source rows, decisions, calculations, versions, and history explain the result?

### Desired perception

| Attribute       | Experiential meaning                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Trustworthy** | States, totals, and actions are explicit; nothing important depends on decoration or optimistic inference.        |
| **Calm**        | The interface has one clear focal task, stable layouts, restrained color, and no constant motion.                 |
| **Precise**     | Time, dates, balances, status, and versioned history align and scan consistently.                                 |
| **Respectful**  | The product never celebrates overwork, surveils activity, exposes sensitive context, or treats warnings as blame. |
| **Operational** | Dense work remains efficient, sortable, filterable, recoverable, and suited to repeated real use.                 |

### Anti-attributes

- Not playful, gamified, or celebratory about overtime.
- Not a generic SaaS analytics dashboard or component-gallery collage.
- Not austere to the point of weak hierarchy, tiny targets, or hidden recovery.
- Not legalistic or implementation-led in its primary copy.

### Central tensions

- **Calm employee work** ↔ **dense administrative work**
- **Concise task copy** ↔ **complete explainability**
- **Stable shared patterns** ↔ **different workflow semantics**
- **Configurable identity** ↔ **guaranteed contrast and state meaning**
- **Responsive transformation** ↔ **preserved data relationships and DOM order**

### Success criteria

Critical:

1. A first-time or infrequent user can identify the current state and next valid action before reading supporting history.
2. A frequent manager or administrator can scan and act without opening unnecessary detail.
3. The same visual language works at 320 CSS px, 200% zoom, forced colors, reduced motion, and keyboard-only input.
4. No direction weakens the accepted privacy, authorization, immutable-history, or explainable-calculation contracts.
5. A developer can implement tokens, components, and archetypes without inventing visual rules.

Important:

- Page types have recognizable task order.
- Semantic states remain textual and color-independent.
- Dense surfaces preserve row identity, comparison, and actions.
- Company identity is visible but never overrides product usability or state colors.
- Loading, empty, stale, success, warning, and error presentation feel related across routes.

## 4. The Quiet Ledger signature

### Visual character

- Near-neutral ink text on cool, low-chroma canvas and white raised surfaces.
- One deep blue/teal action family used for navigation, links, and primary actions.
- Strong tabular numerals and aligned label/value pairs for time, balances, dates, latency, and counts.
- Thin rules and section bands create ledger-like structure; shadow is reserved for genuinely
  elevated or focal content.
- Short orientation labels, decisive headings, and compact status lines replace repeated prose.
- Status colors are restrained and always paired with a label and, where useful, an icon or shape.

### What makes it recognizably WorkLedger

- A narrow active-location rule in navigation and selected records.
- A repeated **state → action → effect → evidence** rhythm across workflow pages.
- Calculation and history surfaces use aligned ledger rows rather than decorative KPI tiles.
- Provisional, posted, approved, locked, and adjusted states use explicit language and stable
  structural placement.
- Organization identity appears in the shell and authentication context without replacing the
  WorkLedger product attribution.

## 5. Visual foundations

### 5.1 Typography

**Approved font strategy:** Use a local system sans-serif stack. Do not fetch a web font at runtime.
The current `Inter` token may remain only if Inter is actually bundled; otherwise WL-1102 removes
the phantom family name and relies on the system stack. A new font dependency requires its own
documented need.

| Role                   | Approved treatment                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Route `h1`             | `clamp(1.875rem, 1.6rem + 1vw, 2.5rem)`, 700 weight, tight but readable leading; no display-scale hero type in the application |
| Section `h2`           | `1.5rem` wide and `1.375rem` narrow, 700 weight                                                                                |
| Subsection `h3`        | `1.125rem`–`1.25rem`, 650/700 weight                                                                                           |
| Body                   | `1rem/1.5`; primary instructions never smaller                                                                                 |
| Dense table/form body  | `0.875rem/1.35rem`; interactive labels remain at least this size                                                               |
| Metadata/orientation   | `0.75rem`–`0.8125rem`; short phrases only, 600/700 weight                                                                      |
| Primary numeric result | `clamp(1.75rem, 1.5rem + 1vw, 2.5rem)`, 700 weight, tabular lining numerals                                                    |
| Ledger/table number    | Tabular lining numerals, end-aligned when comparison benefits                                                                  |
| Technical code/error   | Local monospace stack, `0.875rem`, wrapping allowed; never raw red text without a labelled state container                     |

Rules:

- Keep paragraphs at approximately `45ch`–`70ch`; explanatory prose never spans a full dense table.
- Use sentence case. Reserve uppercase/letter spacing for short navigation-group or eyebrow labels.
- Use 400, 600, and 700 as the normal weights; avoid making every label bold.
- A focused route heading retains a strong visible focus indicator, but the visual treatment must
  not make the heading resemble a text input.

### 5.2 Color and identity

| Token role                  | Direction                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Canvas                      | Cool, low-chroma light surface that separates the application from raised content without a decorative gradient |
| Raised surface              | White or near-white; reserved for controls, primary task regions, and bounded records                           |
| Subtle surface              | Low-chroma blue/gray for active navigation, grouped rows, and neutral status—not every section                  |
| Ink                         | Near-neutral dark navy/charcoal; stable across product and organization identities                              |
| Muted ink                   | Still meets text contrast; used for supporting context, never for critical state/action text                    |
| Action                      | Deep blue/teal with defined default, hover, active, and disabled relationships                                  |
| Focus                       | Product-owned high-contrast focus color independent of organization accent and semantic states                  |
| Success/warning/danger/info | Separate semantic families with text, icon/shape, border, and surface roles                                     |
| Organization accent         | Validated identity accent; never the only status signal and never allowed to reduce contrast                    |

**Color-mode decision:** Phase 11 supports a deliberate light color scheme only. Remove inert
`dark:` utilities and retain `color-scheme: light`. Dark mode is not added as ornamental scope; it
requires a later explicit task with full state, chart/media, forced-colors, and visual-regression
evidence.

**Company accent decision:** WL-1103 may derive brand and action tokens from the configured accent
only when every required text, boundary, hover, active, focus-adjacent, and disabled relationship
passes validation. Otherwise the stable WorkLedger action family remains active and the configured
accent is restricted to non-semantic identity details. Semantic state colors never derive from the
organization accent.

### 5.3 Spacing and density

Use a four-pixel base with named steps: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, and
`64` CSS px equivalents. WL-1102 may refine names, not introduce an unrelated scale.

| Density             | Routes                                                                 | Section rhythm | Container padding      | Interactive target                                        |
| ------------------- | ---------------------------------------------------------------------- | -------------- | ---------------------- | --------------------------------------------------------- |
| Comfortable         | Today, profile, request forms, authentication, recovery                | `32`–`40`      | `20` mobile, `24` wide | Prefer `44` minimum                                       |
| Balanced            | Personal records, balances, calendars, approval detail, monthly review | `24`–`32`      | `16`–`24`              | Prefer `44` minimum                                       |
| Compact operational | Approval queue, reports, employee/settings/audit/operations            | `20`–`24`      | `12`–`20`              | Keep actions/controls at `44`; static rows may be tighter |

Density comes from shorter copy, stronger grouping, aligned columns, and less empty space between
related records—not from smaller body text, clipped labels, icon-only actions, or reduced targets.

### 5.4 Shape and elevation

- Controls: `0.375rem`–`0.5rem` radius.
- Panels and bounded record groups: `0.625rem`–`0.75rem` radius.
- Dialogs/drawers: up to `0.875rem` where the viewport permits.
- Pills are reserved for short status/category tags, not buttons, containers, or arbitrary metadata.
- Use one-pixel borders/dividers as the normal separation mechanism.
- Use shadow only for overlays, the primary Today task region, or a genuinely floating sticky
  surface. Adjacent data sections should normally use rules, surface shifts, and whitespace.
- Avoid nested card-on-card construction. A bordered parent should usually contain borderless rows
  or separated sections.

### 5.5 Icons and imagery

- Use Lucide at `16` or `20` CSS px with consistent stroke weight and alignment.
- Meaningful icons accompany text or have an accessible name; decorative icons are hidden from the
  accessibility tree.
- Do not add photography, avatars, mascots, decorative illustrations, or generic empty-state art to
  authenticated operational routes.
- Company logos are identity assets, not navigation labels. The organization name remains visible
  or programmatically associated when a logo is present.
- Charts remain exceptional. A number, comparison, ledger, or table is preferred whenever it
  explains the information more directly.

## 6. Global hierarchy rules

Every route follows the communication sequence, adjusted to its task:

1. **Route header:** short area label when useful, `h1`, concise task description, optional route-level action.
2. **State line:** scope, period, applied filters, last update, workflow state, or data freshness.
3. **Primary task region:** current valid action, decision, form, or result collection.
4. **Problems/recovery:** blockers before warnings; warning before supporting history when action is required.
5. **Effect/summary:** time, balance, entitlement, availability, or system result.
6. **Evidence/history:** detailed calculation, source records, prior decisions, audit, or technical metadata.

Rules:

- Only one visually primary action exists within one task region.
- Destructive or irreversible actions are never promoted by color alone and remain separated from
  the ordinary continuation action.
- A page may have several semantic sections without turning every section into a raised card.
- Privacy and history guarantees appear where they affect a decision, not as repeated opening copy.
- Provisional/final, pending/approved/locked, and healthy/degraded/critical distinctions appear near
  the value or task they qualify.

## 7. Page archetypes

### A. Immediate task

**Routes:** Today and future single-task recovery surfaces.

**Order:** orientation → current status → valid action → current estimate/effect → blockers/warnings
→ concise calculation → event history → next absence.

**Wide:** status/action and current effect may share a two-column summary, but the valid action is
first in DOM and visual order.  
**Narrow:** one column; action remains near the first viewport without hiding status or recovery.

### B. Personal collection

**Routes:** My time, My balances, Requests, Notifications, Profile history.

**Order:** scope/period → summary → filters/view control → records → pagination → supporting ledger
or history.  
**Wide:** compact toolbar plus list/table.  
**Narrow:** list transformation for independent records; a named scroll region only where
two-dimensional comparison is essential.

### C. Decision queue

**Routes:** Approvals and pending-approval report.

**Order:** actionable count → applied-filter summary → filter control → prioritized results → row
action → pagination. Waiting/completed work is available through filters but does not compete with
action-required work.

**Wide:** table with stable employee, workflow, status, affected period, and action columns.  
**Narrow:** a labelled record list is preferred when each item is an independent decision; every
item exposes identity, workflow, status, affected period, and Review without horizontal panning. If
a table remains necessary, preserve a named focusable region and provide a visible scroll cue.

### D. Record detail and decision

**Routes:** Daily record, request detail, approval detail, monthly period.

**Order:** state/scope → primary record summary → blockers → comparison/effect → decision form or
valid next action → versioned history.

Original/proposed and approved/current records retain explicit headings and a signed difference
summary. Side-by-side presentation is optional at wide sizes; DOM and narrow order remain original,
proposed/current, difference.

### E. Administration and configuration

**Routes:** Employees, employee detail, time/absence/holiday settings, system accounts.

**Order:** object/scope → primary create or edit task → current records → effective-dated history →
secondary catalog maintenance.

Independent tasks do not share one undifferentiated card. Employee directory and team catalog, for
example, need separate landmarks and stronger task separation even if they remain on one route.
Disabled actions always have an adjacent reason and the valid recovery path.

### F. Calendar and agenda

**Routes:** Personal and team calendars.

**Order:** month/date context → view switch → selected-date summary → agenda/grid → navigation.
Agenda is the narrow default. Grid and agenda expose equivalent authorized information and preserve
selection where possible.

### G. Report, audit, and technical operations

**Routes:** Reports, domain audit, technical audit, Operations.

**Order:** scope/freshness → health or result summary → filters → results → detail/recovery →
technical metadata or export.

Name/value data uses valid definition lists or tables. Technical errors render in a labelled state
container with wrapping, cause category, and safe recovery; raw red monospace text is insufficient.

### H. Authentication and route boundary

**Routes:** Sign-in, password recovery/activation, permission denied, not found, session expiry,
dependency error.

**Order:** organization identity/product attribution → task heading → concise context → form or
recovery action → persistent result/error → secondary help.

Authentication remains visually calm and focused. Route boundaries use the same status and action
language as authenticated routes; they are not blank technical exception pages.

## 8. Application shell direction

### Header

- Keep a compact global header with WorkLedger product attribution and configured organization
  identity. The organization may lead visually after WL-1103, but WorkLedger remains available as
  product context.
- Keep account/session utilities out of the main task heading.
- Do not place decorative search, notification bells, or user-avatar menus without a real task need.

### Desktop navigation

- Use a stable left navigation for the current work area.
- Group destinations as **My work**, **Team**, **People and policy**, **System**, and **Account**.
- For combined-role accounts, show the current area in full and provide a compact, labelled work-area
  switcher/list for the other authorized areas. No destination disappears solely due to role count
  or viewport height.
- Keep Account utilities outside the independently scrolling destination region when possible.
- Reports is one authorized cross-role destination, not duplicated in several groups.

### Narrow navigation

- Retain one labelled Menu trigger and a focus-managed modal drawer.
- Preserve the same group and destination order as desktop.
- Closing restores trigger focus; selecting a route follows the route-heading focus contract.
- Motion is optional orientation feedback, never required to understand open/closed state.

## 9. Responsive and layout rules

- Use media queries for global shell changes and user preferences. Use container queries for
  reusable component adaptations based on their actual inline size.
- Container queries are a progressive enhancement; default small-container layouts are complete.
- Use intrinsic sizing, logical properties, `minmax()`, `fit-content()`, and `min-inline-size: 0`
  before adding fixed widths or route-specific media queries.
- Never use CSS `order`, reverse flex direction, or dense grid packing for interactive content.
- Suggested content measures:
  - form/reading route: `44rem`–`52rem`,
  - detail/review route: `64rem`,
  - dense collection/report: up to `80rem`,
  - supporting prose: `70ch` maximum.
- Preserve `100dvh`/logical viewport behavior for shell and overlays; avoid `100vw` page widths.
- Use `overflow: auto`, `scrollbar-gutter: stable`, and `overscroll-behavior: contain` on deliberate
  internal scroll regions.
- Scroll-state query hints may progressively enhance horizontal tables, but they are not Baseline
  2024 and are unsupported in Firefox/Safari. A persistent textual/visual cue or a tested
  IntersectionObserver fallback is required when discoverability depends on the hint.
- Page-level horizontal scrolling is never an accepted responsive strategy.

## 10. Component expression

| Family               | Direction                                                                           | Required states/behavior                                                            |
| -------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Primary action       | Filled deep action color, concise verb, one per task region                         | Hover, focus, pressed, pending, disabled with reason where consequential            |
| Secondary action     | Bordered or subtle surface; same target size                                        | Hover, focus, pressed, pending, disabled                                            |
| Quiet/link action    | Text/link treatment for low-emphasis navigation or reset                            | Underline or another non-color affordance; visible focus                            |
| Danger action        | Not the default primary; explicit text and confirmation proportional to consequence | Focus, pending, domain conflict, cancel/restore focus                               |
| Panel/section        | Border/whitespace first; raised surface only for bounded task or record             | Default, selected/current, disabled/read-only, stale where applicable               |
| Status badge         | Short text plus optional icon/dot; semantic color is supplemental                   | Neutral, info, success, warning, danger, locked, provisional                        |
| Alert/status message | Persistent title, concise effect, recovery action                                   | Info, warning, blocking error, success; live behavior based on urgency              |
| Form field           | Visible label, optional hint, stable control boundary                               | Focus, filled, invalid, disabled, read-only, pending dependency                     |
| Error summary        | Precedes complex form; links to invalid fields                                      | Focused on failed submission, retains safe input                                    |
| Filter set           | Applied-filter summary remains visible; controls can disclose at narrow sizes       | Default, dirty, applying, applied, zero results, clear                              |
| Table                | Caption/name, strong header, stable row identity, tabular numbers                   | Sort, focusable overflow, selected/detail where applicable, empty, partial, loading |
| Record list          | Label/value pairs and explicit row action; not a misleading card table              | Default, actionable, waiting, completed, disabled/read-only                         |
| Pagination           | Adjacent to result count and state                                                  | First/last disabled, pending page, URL/back-forward focus retention                 |
| Dialog/drawer        | Clear title, bounded actions, selective elevation                                   | Opening focus, Escape/cancel, pending, error, closing focus restore                 |
| Loading              | Stable region geometry or concise status; no indefinite shimmer                     | Initial, background refresh, partial, retry                                         |
| Empty state          | Names what is empty and whether that is expected; one valid next action             | Unfiltered, filtered-zero, permission-limited                                       |

## 11. Interaction and motion

### Interaction principles

1. **Authoritative before optimistic:** Do not visually claim a domain transition until the accepted
   mutation contract permits it.
2. **One intent, one result:** One user action yields one concise persistent result and at most one
   meaningful announcement.
3. **Preserve context:** Filters, pagination, dialogs, and background refresh retain logical focus and
   stable spatial context.
4. **Reveal, do not hide:** Progressive disclosure reduces initial density but keeps applied state,
   recovery, and task-critical context visible.
5. **Explain unavailability:** Disabled/read-only/locked actions include the reason and next valid
   path; absence of permission never leaks target existence.
6. **No pointer privilege:** Hover, swipe, context menus, drag, and precise pointer placement are
   never the only path.

### Motion character

- Frequent state feedback: immediate or up to `120ms`.
- Disclosure and small component transitions: `120ms`–`160ms`.
- Dialog/drawer entrance or exit: up to `180ms`; no bounce or overshoot.
- No route entrance animation, parallax, animated counters, balance celebration, or continuous
  “working” pulse.
- Do not animate layout for large dense tables or long pages.
- Reduced motion removes translation, scale, and decorative opacity travel while preserving the
  final state and immediate feedback. Static loading/status alternatives remain understandable.

## 12. Accessibility requirements embedded in the direction

- Preserve semantic HTML and React Aria behavior; do not reproduce native controls with styled
  generic elements.
- Focus is a first-class semantic token, never derived from company accent or status color.
- Maintain at least WCAG 2.2 AA text/non-text contrast and verify authored boundaries in every
  interactive state.
- Maintain visible labels, descriptions, errors, summaries, captions, headings, and landmarks.
- Keep visual order equal to DOM reading/focus order.
- At 320 CSS px and 200% zoom, the full workflow remains available without page-level horizontal
  scrolling. Deliberate two-dimensional data regions remain named and keyboard focusable.
- Use text plus icon/shape/border for state; never color alone.
- Keep controls preferably `44px` high while recognizing the WCAG 2.2 AA minimum/exception rules.
- Forced colors use system colors and retain boundaries, current selection, focus, and status text.
- Live regions announce meaningful outcomes only. Background loading and running timers remain
  quiet unless the user needs the change to continue safely.
- Manual VoiceOver, NVDA, and TalkBack evidence remains required or explicitly dispositioned at
  `WL-1206` under `D-502`.

## 13. Content and microcopy direction

- Lead with the user's task and observable state; place implementation/privacy guarantees only
  where they change a decision or expectation.
- Prefer **Working since 11:15** over a paragraph describing the attendance engine.
- Prefer **3 approvals need action** over **23 authorized items after scope and filters** as the
  primary queue summary; authorized-scope detail can remain supporting text.
- Use **provisional**, **posted**, **submitted**, **approved**, **locked**, and **adjusted**
  consistently. Do not invent synonyms for core domain states.
- Warning copy follows: **What happened → effect → valid recovery**. Avoid blame.
- Success copy names the committed result and next state, not merely “Success.”
- Empty copy distinguishes expected emptiness, filter-zero, permission scope, and unavailable data.
- Technical errors identify the affected dependency and safe operator action without secrets,
  stack traces, or raw database/authentication payload.

## 14. Modern web guidance constraints

### Classification

- **Repository:** Mixed TypeScript monorepo with a React SPA and local component package.
- **Feature areas:** CSS layout, component responsiveness, dense-table overflow cues, focus, motion,
  and accessibility states.
- **Baseline target:** Baseline 2024 plus the repository's supported stable browser matrix.

### Guidance retrieved

- `css-layout` — intrinsic layout, logical properties, Grid/Flexbox choice, container queries,
  overflow stability, dynamic viewport units, and DOM-order constraints.
- `size-aware-styling` — container queries with a complete small-container default.
- `scrollability-affordance-hints` — progressive scroll-state hints and support limitations.
- `accessibility` — semantic controls, visible focus, naming, contrast, live-region restraint,
  reduced motion, zoom, and keyboard/manual testing.

### Must follow

- Use source/DOM order as reading and focus order; never reorder interactive content only in CSS.
- Use logical properties, intrinsic sizing, and complete narrow defaults.
- Preserve explicit focus and semantic relationships.
- Use `overflow: auto` only inside deliberate scroll regions and retain stable context.
- Support reduced motion and color-independent states.

### Should follow

- Use container queries for component adaptations and media queries for shell/user preferences.
- Reserve scrollbar space and contain overscroll where internal scrolling is intentional.
- Use native and React Aria primitives before custom keyboard/focus behavior.

### Optional progressive enhancement

- Container scroll-state queries for visual overflow hints. They cannot be the only affordance
  because Firefox and Safari support is absent in the retrieved guidance.

### Explicit project decision

The general guidance recommends dark-mode support. WorkLedger does not adopt it in Phase 11 because
the repository currently declares light-only, the task does not fund the complete state/media test
matrix, and ornamental dark mode conflicts with the scope contract. The direction removes partial
dark branches instead of implying unsupported behavior.

## 15. Implementation sequence and ownership

### WL-1102 — Tokens and CSS ownership

**Implementation status:** Complete. See `docs/112-semantic-tokens-css-contract.md` for the
authoritative inventory, ownership rules, route exceptions, and executable validation boundary.

1. Define primitive, semantic, component, state, motion, and density token tiers.
2. Consolidate app/package token ownership and document allowed route-level exceptions.
3. Remove undefined classes, one-off state values, inert dark branches, and the ambient page/auth
   gradients that conflict with Quiet Ledger.
4. Add executable unknown WorkLedger class/token checks.

### WL-1103 — Company identity

**Implementation status:** Complete. See `docs/113-company-identity-runtime-configuration.md`.

1. Validate organization display name, optional logo/favicon, and accent.
2. Map the accent only to permitted identity/action roles with a safe WorkLedger fallback.
3. Verify missing/broken assets, long names, narrow headers, contrast, forced colors, and print.

### WL-1104 — Local UI system

**Implementation status:** Foundation complete. See `docs/114-shared-ui-patterns.md`; route-level
adoption remains assigned to Phase 12.

Build from proven repeated call sites: actions, fields/errors, sections/panels, statuses, alerts,
definition lists, filter sets, table/scroll regions, record lists, pagination, loading, empty, and
route-state presentation. Document state matrices and responsive contracts for each.

### WL-1105 — Shell, authentication, and boundaries

**Implementation status:** Complete. See `docs/115-shell-authentication-route-boundaries.md` for
the work-area, account-utility, authentication-result, boundary-state, and responsive evidence.

Apply the work-area navigation model, organization/product identity, Quiet Ledger header, stable
account utilities, route-heading focus treatment, authentication hierarchy, and shared boundary
states.

### WL-1106 — UI foundation gate

**Implementation status:** Complete. See `docs/116-phase-11-gate-review.md`.

Validate Today, Approvals, Employees, Operations, Sign-in, and route boundaries as reference
archetypes across roles, supported widths, zoom, forced colors, reduced motion, keyboard, and
automated accessibility before version `0.12.0`.

### Phase 12 — Workflow adoption

- `WL-1200`: immediate-task archetype and calculation disclosure on Today.
- `WL-1201`: personal collection, balance/ledger, personal calendar, notification, and profile.
- `WL-1202`: type-neutral request hub/detail and record-decision archetypes.
- `WL-1203`: decision queue, team status/calendar, filters, and responsive row action.
- `WL-1204`: compact operational administration, reports, domain/technical audit, and Operations.
- `WL-1205`: cross-route copy, responsive, state, motion, and recovery consistency.
- `WL-1206`: visual, usability, accessibility, and manual-AT release evidence.

## 16. Validation matrix

| Reference surface          | Direction question                                                        | Required evidence                                                                                       |
| -------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Today                      | Is state/action first, with complete but progressive explanation?         | All attendance states; desktop/mobile/320; warnings; forced colors; reduced motion; keyboard/touch      |
| Approvals                  | Can a manager prioritize and review without hidden action/context?        | Action-required/waiting/empty; filters; wide table; narrow list/scroll strategy; text spacing; keyboard |
| Employees/settings         | Does compact density remain legible and recoverable?                      | Long names/roles; empty/filter-zero; disabled reason; complex-form errors; zoom/reflow                  |
| Operations/technical audit | Are status, dependency, recovery, and semantics coherent without HR data? | Healthy/degraded/critical/error; valid `dl`/table; hostile wrapping; forced colors; permission denial   |
| Sign-in/recovery           | Are organization identity and the task clear without decoration?          | Missing/long identity; invalid/pending/success/session-expiry; keyboard; autofill; mobile               |
| Shell                      | Do single and combined roles retain orientation and every destination?    | All role combinations; short/tall desktop; drawer; zoom; active route; sign-out error                   |
| Shared states              | Do routes look and behave like one product?                               | Loading, empty, partial, stale, success, warning, error, permission denied, not found, offline, locked  |

## 17. Approval and change control

Quiet Ledger is approved as the implementation direction for `WL-1102`–`WL-1206`.

The following are not reopened by routine implementation:

- light-only color scheme for this phase,
- system/local typography with no runtime font fetch,
- state → action → effect → evidence task rhythm,
- comfortable employee versus compact operational density without smaller interactive targets,
- border/rule separation before shadow/card proliferation,
- one primary action per task region,
- progressive but never essential motion,
- accessible narrow defaults and stable DOM order,
- organization accent subordinate to contrast, focus, and semantic state.

A materially different visual language, dark mode, new font dependency, chart-first dashboard,
arbitrary theming, or navigation architecture that hides authorized destinations requires an
explicit task/decision update before implementation.
