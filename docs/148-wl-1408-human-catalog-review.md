# WL-1408 Human Catalog Review Guide

**Task:** `WL-1408`
**Status:** German and Spanish fluent-human reviews approved on 2026-08-27
**Review locales:** `de-DE`, `es-ES`
**Source locale:** `en-GB`

## Summary

This guide is the reproducible human-review procedure for the WorkLedger production catalogs. One
fluent German reviewer approves `de-DE`, and one fluent Spanish reviewer approves `es-ES`. A
reviewer approves only their own fluent locale. Translation software may help locate or draft text,
but it cannot supply the approval.

The review answers four questions:

1. Does the candidate preserve the exact WorkLedger product meaning of the English source?
2. Is it fluent, concise, consistent, and appropriate for an office time-record product?
3. Does it preserve privacy, authorization, destructive-action, and immutable-history boundaries?
4. Do parameters, plurals, accessible names, announcements, and generated output read as complete
   natural messages in context?

This is a linguistic and meaning review. Cross-browser visual, responsive, assistive-technology,
security, migration, and no-mixed-language execution belongs to `WL-1409`.

## Test scope

- In scope: all seven locale namespaces, the glossary, critical and privacy-sensitive message
  families, generated/recipient output, interpolation in complete sentences, and plural wording.
- Out of scope: changing domain behavior, legal localization, policy semantics, user-authored text,
  technical logs, OpenAPI prose, and adding another production locale.
- Main reviewer goal: give a dated `APPROVED` or `CHANGES_REQUIRED` decision backed by exact keys
  and notes.
- Highest-risk areas: credited versus worked time, posted versus projected balances, sickness
  privacy, changes-requested versus rejected, locking versus deletion, role scope, destructive
  actions, errors, and recipient communications.

## Review environment

- Use the catalog files under `packages/i18n/src/catalogs/locales/`.
- Keep the matching `en-GB` namespace open beside the locale being reviewed.
- Read [the translation glossary](140-phase-14-translation-glossary.md) before reviewing catalog
  prose.
- Review UTF-8 source directly. Do not paste catalogs into a public translation service because
  message parameters and privacy wording are part of the product contract.
- If running repository commands, use the pinned Node and pnpm versions from `package.json`.

The seven namespace pairs are reviewed in this order:

| Order | Namespace | Main content |
|---:|---|---|
| 1 | `shared.json` | Common actions, roles, workflow states, validation, navigation, profile/session copy |
| 2 | `auth.json` | Sign-in, activation, recovery, and reset UI |
| 3 | `employee.json` | Attendance, calculations, records, requests, absences, calendar, notifications, monthly review |
| 4 | `manager.json` | Approvals, Team, team calendar, and reports |
| 5 | `admin.json` | Employees, teams, schedules, policies, absence settings, holidays, and audit |
| 6 | `system.json` | Accounts, sessions, operations, and technical audit presentation |
| 7 | `output.json` | CSV, print, clipboard, invitation, password reset, and notification email |

## Scenario index

| ID | Scenario | Priority | Evidence |
|---|---|---:|---|
| `QA-I18N-001` | Approve glossary terminology | Critical | Every glossary row has an outcome for the reviewed locale |
| `QA-I18N-002` | Review every catalog leaf | Critical | No skipped namespace or unresolved finding |
| `QA-I18N-003` | Review privacy-sensitive messages | Critical | Sickness and neutral team/notification wording reveal no protected detail |
| `QA-I18N-004` | Review time and workflow semantics | Critical | Distinct domain concepts remain distinct |
| `QA-I18N-005` | Review errors, actions, and announcements | High | Wording states the action/outcome without false success or blame |
| `QA-I18N-006` | Review generated and recipient output | Critical | Output is fluent and preserves machine-significant values |
| `QA-I18N-007` | Record reviewer approval | Critical | Name, date, scope, outcome, and notes are complete |

## Review procedure

### QA-I18N-001 — Approve the terminology glossary

1. Open `docs/140-phase-14-translation-glossary.md`.
2. Read the product meaning and “Avoid or protect” column before judging the candidate.
3. Compare the candidate with its actual use in the locale catalog.
4. For each row in your locale, set the status to:
   - `APPROVED` only when the term is correct for every stated context;
   - `CHANGES_REQUIRED` when the candidate is wrong, ambiguous, unnatural, or context dependent.
5. When changes are required, add an exact catalog key and proposed replacement to the findings
   table below. Do not approve a preferred term until all affected keys use it consistently.

Expected result: every glossary row for the reviewed locale is explicitly decided. No row remains
`DRAFTED` or `NOT_DRAFTED` at approval time.

Failure signs include translating “credited” as “worked”, making flexible time sound like payroll
overtime, treating “off work” as an absence, or using deletion language for correction/locking.

### QA-I18N-002 — Review every catalog leaf

For each namespace in the ordered table:

1. Compare the `en-GB` and target-locale JSON structures from top to bottom.
2. Read every target string, including loading, empty, partial, success, warning, offline,
   permission-denied, validation, and error states.
3. Treat `{{parameter}}` values as variable user or system data. Read the complete sentence with a
   realistic replacement and check grammar around the parameter.
4. For `_one`, `_many`, and `_other` leaves, test mentally with `1`, `2`, and a large value. The
   exact plural leaves are enforced automatically; the human decides whether each sentence is
   idiomatic.
5. Check punctuation, capitalization, register, gender/number agreement, sentence fragments,
   terminology consistency, and button length.
6. Record every problem with its full semantic key, not a line number alone.

Expected result: the reviewer has read all seven namespace files and can state that the target is
complete and fluent. The English fallback must not be used to excuse an awkward or missing target
message.

### QA-I18N-003 — Review privacy-sensitive wording

Review these families as a single privacy pass:

| Family | Representative keys | Required meaning |
|---|---|---|
| Sickness self-service | `employee.absence.sickness.*` | Ask only for coverage; do not request or imply diagnosis/detail |
| Team availability | `manager.team.status.availability.*`, `manager.team.calendar.*` | Use neutral unavailability; never expose an absence subtype |
| Notifications | `employee.notifications.presentation.*` | Hide workflow type, sickness class, reason, and reviewer detail where designed |
| Approval lists | `manager.approval.inbox.*` | Keep list wording generic; detailed private context belongs only on authorized detail surfaces |
| Reports/exports | `manager.report.*`, `output.csv.*`, `output.clipboard.*` | Do not suggest hidden fields are present; preserve purpose-minimized scope |
| Recipient messages | `output.communication.*` | No reason, sickness detail, secret handling claim, or wider record disclosure |

Expected result: a colleague seeing only the translated team, notification, report, or email copy
cannot infer sickness classification, reasons, notes, reviewer comments, or unauthorized scope.

### QA-I18N-004 — Review time and workflow semantics

Read complete related families together, rather than approving isolated labels:

- `employee.today.calculation.*`, `employee.today.overview.*`, `employee.time.*`, and
  `employee.dailyRecord.*` must keep expected, worked, credited, daily difference, posted balance,
  projected balance, and flexible time distinct.
- `shared.workflow.status.*`, `employee.monthly.*`, and `manager.approval.*` must keep pending,
  submitted, changes requested, rejected, approved, locked, and adjusted states distinct.
- Correction wording must say that original punch events remain preserved.
- A locked month is protected from ordinary mutation, but it can receive a traceable post-lock
  adjustment. It is not deleted or absolutely unchangeable.
- Manager and HR wording must not imply that a role alone grants wider employee access or
  self-approval.

Expected result: no translated label collapses two domain states or promises payment, deletion,
finality, access, or approval that the application does not provide.

### QA-I18N-005 — Review actions, errors, and accessibility copy

1. Review every action label beside its pending, success, no-effect, and failure messages.
2. Confirm “Request changes” is an instruction to create a new version and is not phrased as
   rejection.
3. Confirm deactivation preserves history and is not called deletion.
4. Confirm session revocation is distinct from account deactivation and attendance clock-out.
5. Review `ariaLabel`, `label`, `caption`, `scrollHint`, dialog title, validation, focus, and live
   announcement keys as user-facing copy—not as developer metadata.
6. Check that failures never claim an action succeeded and uncertain clock responses tell the user
   to inspect current authoritative state before retrying.

Expected result: labels are understandable without surrounding colour/icon cues, announcements are
complete but concise, and destructive or uncertain outcomes are unambiguous.

### QA-I18N-006 — Review generated and recipient output

Review `output.json` separately because these messages leave the normal page context:

1. CSV column/status labels: wording is clear, while ISO dates and integer-minute values remain
   machine-significant and untranslated.
2. Monthly print: headings, statuses, totals, and post-lock explanation form a coherent record.
3. Clipboard report: each line is a complete sentence or labelled value, not concatenated grammar.
4. Invitation and password reset: subject and body are natural; the recipient name and URL
   parameters fit grammatically; no message promises automatic sign-in.
5. Notification email: approved, rejected, changes-requested, and acknowledged remain distinct and
   privacy safe.
6. Use a long name, a name with accents, and a long organization name when considering parameter
   placement. User-entered text must remain verbatim.

Expected result: each artifact makes sense when read outside WorkLedger and does not weaken the
existing privacy or security meaning.

### QA-I18N-007 — Record the decision

When no blocking finding remains:

1. Update every glossary status for your locale to `APPROVED`.
2. Add your real name, ISO date (`YYYY-MM-DD`), the exact reviewed scope, outcome, and material notes
   to the “Fluent review approvals” table in the glossary.
3. Add a row to the reviewer log below.
4. Run or ask the implementation owner to run `pnpm i18n:check` after any catalog edits.
5. Do not check off `WL-1408` unless both locale approvals exist and all automated checks pass.

## Findings

Add one row per issue. Keep resolved rows as evidence.

| ID | Locale | Namespace and key | Severity | Problem | Required wording or decision | Status |
|---|---|---|---:|---|---|---|
| `DE-001` | `de-DE` | `employee.today.attendance.state.working` | High | “Bei der Arbeit” can imply physical presence | Use “Arbeitszeit läuft” | Resolved |
| `DE-002` | `de-DE` | `employee.today.attendance.state.onBreak`, `manager.team.status.availability.onBreak` | Medium | “In Pause” is not fully idiomatic | Use “In der Pause” | Resolved |
| `DE-003` | `de-DE` | `employee.today.attendance.state.offWork` | Critical | “Nicht bei der Arbeit” can imply location or absence | Use “Keine aktive Arbeitszeit” | Resolved |
| `DE-004` | `de-DE` | `employee.time.entryType.dailyDelta` | High | “Tägliche Saldoänderung” is unnatural for the defined one-day result | Use “Tagessaldo” | Resolved |
| `DE-005` | `de-DE` | `employee.today.overview.flexibleTime`, `manager.report.catalog.flexibleTime.title`, `output.clipboard.report.title.flexibleTime` | Critical | “Gleitzeit” names the work model rather than the time-account balance | Use “Gleitzeitsaldo” | Resolved |
| `DE-006` | `de-DE` | `employee.time.balance.projected` and related explanatory title | High | “Projizierter Saldo” is overly literal and weakly communicates provisional status | Use “Voraussichtlicher Saldo” | Resolved |
| `DE-007` | `de-DE` | `employee.dailyRecord.incomplete.title` and paired complete-state label | Medium | “Datensatz” sounds database-oriented in ordinary UI | Use “Eintrag” | Resolved |
| `DE-008` | `de-DE` | `shared.profile.role.hrAdministrator`, `shared.profile.role.systemAdministrator` | Critical | Existing nouns describe organizational functions, not roles held by people | Use “HR-Administrator” and “Systemadministrator” | Resolved |
| `DE-009` | `de-DE` | `employee.time.entryType.postLockAdjustment` | Medium | Missing article makes the phrase less natural | Use “Anpassung nach der Sperrung” | Resolved |
| `DE-010` | `de-DE` | `shared.profile.session.revoke` and matching session result/recovery copy | High | “Sitzung widerrufen” is an overly literal rendering of revoke | Use “Sitzung beenden/beendet” according to action or result | Resolved |
| `ES-001` | `es-ES` | Attendance state labels in `employee.today` and `manager.team` | Critical | “Fuera del trabajo” can imply physical location; “Trabajando” can imply productivity | Use “Sin jornada activa” and “Jornada activa” | Resolved |
| `ES-002` | `es-ES` | Expected-time labels and related summaries across employee, manager, and output catalogs | Critical | “Tiempo previsto” can sound like shift planning | Use “Tiempo objetivo” and the contextual forms “objetivo/objetivos” | Resolved |
| `ES-003` | `es-ES` | Credited-time labels and related summaries across employee, manager, and output catalogs | Critical | “Abonado” can imply paid/remunerated time | Use “Tiempo computado” and the contextual forms “computado/computados” | Resolved |
| `ES-004` | `es-ES` | `employee.time.entryType.dailyDelta` | High | “Cambio diario del saldo” is unnecessarily indirect | Use “Saldo diario” | Resolved |
| `ES-005` | `es-ES` | Flexible-time balance labels, reports, warnings, and generated output | Critical | “Horario flexible” names a schedule model rather than a time-account balance | Use “Saldo de horas” | Resolved |
| `ES-006` | `es-ES` | `employee.time.balance.projected` and related explanatory title | High | “Saldo proyectado” is overly literal and weakly communicates provisional status | Use “Saldo estimado” | Resolved |
| `ES-007` | `es-ES` | `admin.absenceSettings.type.unpaid` | High | “Permiso” can imply a jurisdiction-specific legal right | Use “Ausencia no remunerada” | Resolved |
| `ES-008` | `es-ES` | `shared.workflow.status.approved` | High | Feminine form assumes an unstated noun | Use generic “Aprobado” | Resolved |
| `ES-009` | `es-ES` | `shared.workflow.status.rejected` | High | Feminine form assumes an unstated noun | Use generic “Rechazado” | Resolved |
| `ES-010` | `es-ES` | `shared.workflow.status.submitted` | High | The monthly subject is masculine | Use “Enviado” | Resolved |
| `ES-011` | `es-ES` | `shared.workflow.status.locked` | High | The monthly subject is masculine | Use “Bloqueado” | Resolved |
| `ES-012` | `es-ES` | `shared.profile.role.hrAdministrator` | Critical | Existing noun describes a function or department, not a person’s role | Use “Administrador de RR. HH.” | Resolved |
| `ES-013` | `es-ES` | `shared.profile.role.systemAdministrator` | Critical | Existing noun describes an activity, not a person’s role | Use “Administrador del sistema” | Resolved |
| `ES-014` | `es-ES` | `shared.profile.session.revoke` and matching session result/recovery copy | High | “Revocar” is technically valid but unnecessarily technical in user-facing copy | Use “Finalizar sesión/finalizada” according to action or result | Resolved |

Severity is `Critical` for changed meaning, privacy exposure, unsafe action/outcome, or a false
domain claim; `High` for misleading or materially unnatural workflow text; `Medium` for localized
consistency or grammar; and `Low` for non-blocking polish.

## Reviewer log

| Locale | Reviewer | Date | Namespaces reviewed | Glossary | Critical/privacy families | Generated output | Outcome | Notes |
|---|---|---|---|---|---|---|---|---|
| `de-DE` | Vasileios Mitsaras | 2026-08-27 | All seven production namespaces | Approved | Approved | Approved | Approved | Terminology findings `DE-001` through `DE-010` resolved before approval |
| `es-ES` | Sol | 2026-08-27 | All seven production namespaces | Approved | Approved | Approved | Approved | Terminology findings `ES-001` through `ES-014` resolved before approval |

## Automated companion evidence

Human review complements, but does not replace, these controls:

- `pnpm i18n:check` enforces the three-locale production allowlist, seven namespaces, typed key and
  interpolation parity, locale plural categories, non-empty plain text, prohibited bidirectional
  controls, source-copy threshold, 39 contract descriptor mappings, and governed JSX/ARIA copy.
- `@workledger/i18n/testing` creates the isolated `en-XA` pseudo-locale. It accents and expands
  source messages while preserving interpolation tokens. Production locale resolution, API
  contracts, and persistence still reject `en-XA`.
- The pseudo-locale is test support. Responsive and assistive-technology execution with expanded
  copy is part of `WL-1409`.

## Release decision

**Decision:** Pass. Vasileios Mitsaras approved `de-DE`, Sol approved `es-ES`, all recorded findings
are resolved, and the completion checks passed on 2026-08-27.

`WL-1408` passes only when:

- both named fluent reviewers have approved their own locale;
- no glossary row remains `DRAFTED`, `NOT_DRAFTED`, or `CHANGES_REQUIRED`;
- no Critical or High finding remains open;
- catalog edits pass the automated i18n, type, unit, and build checks; and
- the project-memory files record the evidence without claiming the later `WL-1409` product-quality
  gate.
