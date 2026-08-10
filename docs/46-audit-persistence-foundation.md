# Audit Persistence Foundation

`WL-305` establishes append-only, audience-separated audit persistence and querying. It provides
the transaction and authorization foundation for later authentication, attendance, workflow,
administration, export, and operations producers; it does not invent those feature services early.

## Physical audience separation

Migration `0004_audit_foundation.sql` creates two tables rather than one discriminator-filtered
event stream:

- `domain_audit_events` stores employee/domain history visible only through self, current-report,
  or HR domain-history authorization; and
- `security_audit_events` stores technical authentication/account/session/operations evidence
  visible only through system-administrator security-audit authorization.

The tables have different target enums, different fact shapes, and different repository query
methods. A system administrator cannot obtain domain rows through the audit service, and an HR
administrator cannot obtain security rows unless the same account separately has the technical
role and uses that authorization path. The system role still grants no domain payload.

## Attribution and minimization

Each event records:

- organization and occurrence instant;
- an account actor plus role-at-action, or a named trusted system process;
- stable action and outcome codes;
- one audience-specific target kind and opaque target identifier;
- optional employee/account query scope;
- optional safe reason code and, for domain events, an opaque restricted-reason reference;
- optional server request identifier;
- a privileged-action flag; and
- a small audience-specific allowlist of structured facts.

Domain facts are limited to attendance revision, effective date, counts, signed minutes, prior/next
status, and version. Security facts are limited to authentication method, changed role, failure
category, HTTP status, safe opaque session ID, and scope. Values are bounded tokens or safe
integers. Passwords, cookies, session tokens, CSRF/reset/invitation/idempotency values, sickness,
notes, reasons, request bodies, URLs, stack/SQL text, and arbitrary metadata keys have no storage
field.

The repository validates every event before SQL. Hostile control/markup strings and unknown fact
keys are rejected without echoing their values. PostgreSQL additionally constrains actor shape,
action/reason/target tokens, JSON object/size, organization relationships, and enum values.

## Immutability and atomic writes

Both tables use the existing `reject_immutable_record_change()` trigger for every `UPDATE` and
`DELETE`. Normal correction therefore appends new evidence; it never rewrites an event.

`transaction.audit.appendDomain()` and `appendSecurity()` exist only inside a
`WorkLedgerDatabase.transaction()` callback. A producer can write its source/domain effect and
audit evidence in the same transaction. The integration fixture proves a punch plus its audit event
both disappear on rollback.

Account/employee deactivation does not cascade audit rows. Account actors retain their opaque
identity and role-at-action; trusted system actors retain a bounded process identifier.

## Safe querying

Repository queries require organization scope and apply employee/audience filtering before
descending occurrence-time pagination. Limits are integers from 1 through 100 and offsets are
non-negative safe integers.

`createAuditService()` composes the query with authoritative actor/current-manager resolution in
the same database transaction:

- employee domain history uses the central `DOMAIN_HISTORY_READ` self/current-report/HR policy;
- former/unrelated managers and technical-only system administrators are denied;
- security history uses `SECURITY_AUDIT_READ`; and
- HR-only accounts are denied technical security history.

Feature routes added later must serialize purpose-specific audit DTOs through the shared contract
foundation. They must not expose the database records directly or merge the two audiences.

## Evidence

Schema and PostgreSQL tests cover:

- separate tables, enums, and audience-specific indexes;
- clean migration to 37 tables;
- cross-organization employee rejection;
- immutable update/delete behavior;
- hostile target/fact rejection without persistence;
- source-plus-audit rollback atomicity;
- scope-before-pagination for employee history;
- owner/current manager/HR domain grants;
- former manager/system domain denial;
- HR security denial and system security grant; and
- organization isolation for technical audit rows.

No UI changed. Later audit/history views must render codes and identifiers as escaped plain text,
state audience and scope clearly, use semantic tables/lists, and preserve keyboard, reflow, focus,
and error-state behavior from `docs/05-ux-accessibility.md`.
