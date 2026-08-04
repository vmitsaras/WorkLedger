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
- Resource scope loaded from current effective relationships.
- No role trust from client-provided data.
- No direct object access without organization and ownership/scope check.
- Authorization tests accompany every protected endpoint.

## 5. Mutation safety

- Clock mutations use idempotency keys.
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

## 8. CSV export safety

- Authorize the export at generation time.
- Include only fields permitted for the actor.
- Prefix or neutralize cells beginning with formula-significant characters.
- Use explicit encoding and delimiter behavior.
- Record export audit event without storing the exported content.
- Large exports use bounded memory or a controlled job in a later phase.

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
