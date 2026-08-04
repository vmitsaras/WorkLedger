# Security, Privacy, and Operations

## 1. Data classification

### Authentication secrets

Examples: password hashes, reset tokens, session secrets.

- Highest protection.
- Never exposed to normal application APIs or logs.

### Sensitive HR data

Examples: sickness records, protected attachments, privileged corrections, employment status.

- Strict role and resource scope.
- Minimize collection.
- Team views show only availability where possible.

### Personal operational data

Examples: attendance events, balances, absence requests, manager comments.

- Owner, authorized manager, and HR scope.
- Audited changes.

### Organization configuration

Examples: schedules, policies, holidays.

- Readable by affected users where useful.
- Writable only by authorized HR administrators.

### Public/non-sensitive configuration

Examples: product version, locale options, public health endpoint status.

- Must still avoid leaking infrastructure or secret details.

### Absence data inventory

Absence workflows are server-backed HR workflows, not client-side preference features. PostgreSQL stores the minimum authoritative facts needed for calculation, approval, entitlement, cancellation, audit, and locked-record explainability. High-sensitivity data is never copied into browser persistence, URLs, generic exports, telemetry, or operational logs.

| Data | Source | Storage/transfer | Sensitivity | Purpose | Retention | User control | Risk | Required control |
|---|---|---|---:|---|---|---|---|---|
| Absence type version, coverage, and workflow status | Employee request plus HR policy | PostgreSQL; purpose-specific authenticated API DTOs | Personal operational | Calculate availability/time and run workflow | Historical source retained under the configured `D-500` class | Employee may correct through a new version or request partial/full cancellation; no history deletion | Coverage can reveal personal routines | Scope every read; no public cache; minimize collection fields |
| Sickness classification | Employee report | PostgreSQL; self, limited current-manager review, and limited HR DTO only | High: health-related HR data | Administer sickness workflow and calculation policy | Configurable sensitive-HR retention; historical minimization must preserve required source links | Employee can view, correct, or cancel through recorded workflow | Disclosure through team UI, logs, URLs, notifications, or exports | No diagnosis/note/attachment; neutral downstream DTOs; field-level authorization tests |
| Vacation/unpaid/other request note | Employee, only when effective policy permits | PostgreSQL; self and authorized decision DTOs | High in practice because free text may contain health/family data | Optional operational context for a decision | Same request-history class unless later minimized under `D-500` | Preview before submit; replace only through a preserved request version | Oversharing and uncontrolled reuse | Length limit, plain text, visible warning, no team/log/generic export; sickness disables notes |
| Decision or override reason | Eligible non-self reviewer/HR actor | PostgreSQL domain decision and data-minimized audit reference | High/personal operational | Explain rejection, changes request, cancellation, or privileged negative-balance override | Decision/audit class configured by `D-500` | Actor previews before submit; correction appends, never silently overwrites | Reason may contain sensitive speculation | Plain text, length limit, purpose-specific DTO, no operational log or team projection |
| Entitlement allocations, reservations, deductions, and balances | HR allocation plus workflow transactions | PostgreSQL ledger; self, approval-need manager DTO, HR DTO | High: employment benefit data | Validate requests and explain balance | Ledger/source retention required for explainability; exact period set by `D-500` | Employee can view; non-self HR may append reasoned adjustment | Team or system-administrator exposure | Separate DTOs; deny team/technical access; no hidden mutable total |
| Neutral availability | Derived from still-effective coverage | Authenticated team status/calendar/agenda API | Moderate | Show staffing availability without revealing reason | Derived; not stored as a second source of truth | Cancellation/correction changes the source workflow | Joins or labels could re-identify sickness | Serialize only employee display identity, coverage needed for availability, and `UNAVAILABLE` |
| Domain audit and notification metadata | Trusted application transaction | PostgreSQL; domain-authorized audit/in-app recipients | Personal operational; high when action implies sickness | Accountability and user-visible workflow feedback | Configured audit/notification classes under `D-500` | Notifications can be read/dismissed; audit is not user-deletable | Action names or message previews can reveal sickness | Generic absence action outside the restricted domain view; never store complete payloads |

### Absence privacy risk controls

| Area | Data involved | Prohibited behavior | Severity | Required behavior |
|---|---|---|---:|---|
| Forms | Sickness and free-text context | Asking for diagnosis, symptoms, treatment, clinician, unrestricted sickness note, or attachment | High | Sickness form collects only type-implied workflow data and coverage; other notes explain audience and are plain-text/length-limited |
| Browser storage/cache | Sickness, notes, entitlement, decisions | `localStorage`, `sessionStorage`, IndexedDB, service-worker cache, or shared HTTP cache persistence | High | TanStack Query may hold authorized data in memory; sensitive responses use private/no-store behavior and clear on logout/session expiry |
| URL state | Type, sickness classification, note, reason, entitlement, person-identifying search | Query/hash/path values that reveal sensitive content | High | URLs may contain opaque record IDs and non-sensitive pagination/sort/generic status/date-range filters only; never absence type or free text |
| Team views | Effective absence | Returning absence type, sickness, note, decision reason, entitlement, request ID, or reviewer history | High | Return only current report identity plus neutral `UNAVAILABLE` coverage needed by the availability view |
| Notifications/email | Workflow outcome | Lock-screen/email subject or preview revealing sickness/type/reason | High | External/generic copy says an absence item needs attention or changed; restricted in-app detail is fetched after authorization |
| Logs/technical audit | Request body, query, DTO, action code | Logging absence payloads, sickness-specific codes, notes, reasons, coverage, entitlement, or response bodies | High | Log generic route template/outcome, safe error code, actor/account ID when needed, request ID, latency; technical audit uses generic absence actions |
| Export/print/clipboard | Sickness, notes, reasons, entitlement | Including sensitive fields in generic team/monthly/CSV output or hidden copied metadata | High | User-initiated scoped exports state included fields; generic reports use neutral absence totals/availability; no sickness-specific export in MVP |
| Analytics/network | Any absence data | Third-party analytics, telemetry, pixels, or remote AI/decision transmission | High | No telemetry by default; absence data is sent only to the configured WorkLedger API over protected transport |
| Retention/deletion | Workflow, ledgers, audit | Universal legal period, cascade deletion, or indefinite undocumented retention | High | Configure by data class before production; cancellation/correction supplies user control while immutable source links remain explainable |

The risk is high because sickness is health-related and absence coverage can reveal personal routines. The MVP privacy status is acceptable for implementation only when every row above is covered by contract, authorization, serialization, cache, export, logging, and manual UI tests. `D-500` remains a production blocker for exact retention and anonymization periods.

## 2. Threats to address

- Broken object-level authorization.
- Manager access after scope changes.
- Self-approval.
- Cross-employee or cross-organization data leaks.
- Session theft or fixation.
- CSRF against mutations.
- Duplicate clock actions and replay.
- Race conditions from multiple tabs/devices.
- Silent alteration of locked records.
- Attachment URL exposure.
- CSV formula injection.
- Sensitive data in logs or error responses.
- Unprotected backups.
- Unsafe migration or restore procedures.
- Excessive administrator access.

## 3. Authentication requirements

- Secure credential storage through the selected authentication library.
- HTTP-only secure cookies in production.
- Appropriate same-site policy.
- Session expiration and revocation.
- Password reset with expiring single-use tokens.
- Login rate limiting.
- Generic authentication failure messages.
- Reauthentication for selected high-risk actions if later required.
- Optional TOTP/passkeys are post-MVP.

## 4. Authorization requirements

- Central server-side authorization policies.
- Deny by default.
- Resource scope loaded from the current effective direct-manager relationship; delegation grants no MVP access.
- No role trust from client-provided data.
- No direct object access without organization and ownership/scope check.
- Explicit unauthorized targets return `403 ACCESS_DENIED`; collection scope is applied before counts and pagination.
- Self-approval and privileged self-adjustment prohibitions override combined roles.
- System-administrator capability alone grants no HR/domain data access.
- Authorization tests accompany every protected endpoint.

## 5. Mutation safety

- Every clock mutation requires the `Idempotency-Key` header and `expectedAttendanceRevision` defined in `docs/03-domain-rules.md` section 9 and `docs/13-api-error-conventions.md`.
- Authentication, current employee capability, organization scope, authorization, and CSRF validation occur before idempotency replay; possession of a key grants no access.
- The idempotency claim, locked attendance-state validation, all punch events, one revision increment, one data-minimized audit event, and the terminal outcome are committed atomically.
- A clock command uses one trusted server occurrence instant. It never trusts a device time, and detected server-clock regression fails without an attendance effect.
- Same-key concurrent retries serialize to one terminal outcome; different-key tab/device races permit one valid revision to commit and return `ATTENDANCE_STATE_CHANGED` to stale contenders.
- Raw idempotency keys and request fingerprints are sensitive operational metadata and are excluded from normal logs, analytics, URLs, and audit payloads.
- Offline clock queues are excluded from the MVP. Clients refetch authoritative state after reconnecting and reuse a key only while retrying the same unresolved intent.
- Ordinary organization-timezone change is blocked after the first time-dependent employee fact; a future migration cannot be disguised as a settings edit.
- Only `COMPLETE` past-date calculations may post. The base daily source key and later recalculation source keys are unique, and ledger entry, source link, posting result, and audit evidence commit atomically.
- Posted and projected balances are separately serialized; incomplete dates cannot be hidden inside a seemingly authoritative total.
- Approvals, cancellations, ledger changes, and locking run in transactions.
- Concurrency conflicts return a stable error and current version/state.
- Destructive administrative actions require reason and audit where appropriate.
- Never perform a balance mutation without its source record in the same transaction.

## 6. Audit events

Record:

- actor,
- action code,
- target type and identifier,
- organization,
- timestamp,
- effective date where relevant,
- reason code/text where required,
- safe before/after summary,
- request/correlation identifier,
- privileged-action indicator.

Do not put passwords, tokens, diagnoses, full attachment data, or unnecessarily complete payloads into audit events.

## 7. Logging and observability

Operational logs answer:

- Is the API healthy?
- Did a migration fail?
- Did a background email fail?
- Are authorization failures spiking?
- Did a calculation projection fail?
- Is PostgreSQL unavailable?

They do not record every UI interaction or become productivity surveillance.

Use:

- structured logs,
- correlation/request IDs,
- redaction,
- controlled log levels,
- health and readiness endpoints,
- version and migration status diagnostics without secrets.

Absence routes log a generic route template and safe result/error code, never raw query strings, request/response bodies, absence type, coverage, notes, decision reasons, entitlement values, or sickness-specific action names. Domain audit may record a restricted action against opaque source IDs, but technical operators do not receive the domain payload.

## 8. CSV export safety

- Authorize the export at generation time.
- Include only fields permitted for the actor.
- Prefix or neutralize cells beginning with formula-significant characters.
- Use explicit encoding and delimiter behavior.
- Record export audit event without storing the exported content.
- Large exports use bounded memory or a controlled job in a later phase.
- Generic monthly, team, balance, and leave exports omit sickness classification, request/decision notes, medical inferences, and reviewer comments. A sickness-specific export is not part of the MVP.

## 9. Attachments

Attachments are not required for the initial MVP.

Before adding them:

- storage abstraction,
- authorization checks for every download,
- non-public object keys,
- content type and size limits,
- malware scanning strategy,
- encryption and backup behavior,
- retention/deletion policy,
- restricted sickness-document role scope,
- safe filename handling.

## 10. Self-hosting baseline

Supported initial model:

```text
reverse proxy / TLS
        │
        ├── web
        ├── api
        └── PostgreSQL
```

Optional later services:

- SMTP relay,
- worker,
- Redis,
- S3-compatible object storage.

## 11. Configuration

- Environment variables have a validated schema.
- `.env.example` contains placeholders only.
- Secrets are never committed.
- Startup fails clearly when required configuration is missing.
- Production defaults favor security.
- No telemetry is enabled by default.

## 12. Backup and restore

Production release requires documented and tested procedures for:

- PostgreSQL backup,
- attachment backup when attachments exist,
- encryption and storage expectations,
- restore into a clean environment,
- version compatibility,
- integrity verification,
- rollback plan.

A backup procedure is incomplete until restore has been tested.

## 13. Migration and upgrade

- Commit generated SQL migrations.
- Never edit a migration already applied to released installations; add a new migration.
- Document upgrade order.
- Back up before destructive migrations.
- Provide health/readiness behavior during migrations.
- Test upgrade from at least the previous supported release.

## 14. Retention and deletion

Before production release, define:

- retention periods by data class,
- deactivation versus deletion,
- anonymization/export behavior,
- audit-log retention,
- backup retention,
- attachment deletion,
- legal hold or administrative override if later needed.

Do not hardcode a universal legal retention period.

Until `D-500` is resolved, WorkLedger must not claim a production-ready retention default. Ordinary delete endpoints are unavailable for absence requests, decisions, cancellations, entitlement entries, daily source effects, and audit records needed for explainability. Employees instead use versioned correction and partial/full cancellation; authorized HR uses append-only correction/adjustment. A future anonymization or erasure process must be documented, scoped by data class, preserve required ledger/snapshot integrity, include backup expiry behavior, and be verified against self-host jurisdiction requirements.
