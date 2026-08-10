# Security, Privacy, and Operations

## 1. Security posture and classification

WorkLedger is a self-hosted web application that processes high-sensitivity authentication, employment, attendance, benefit, health-related absence, approval, and audit data. Its primary data flow is browser → same-origin reverse proxy → web/API → PostgreSQL, with optional outbound email carrying generic notification or one-time account links only.

The privacy status is **conditionally acceptable for implementation**. Production release remains blocked until the controls and tests in this document are implemented, a deployment-specific retention profile is configured, and backup/restore plus authorization evidence passes the production gate.

| Class | Examples | Baseline control |
|---|---|---|
| Authentication secrets | Password hashes, session tokens, CSRF tokens, reset/invitation grants, application/auth secrets, database credentials | Never expose through normal APIs, UI, URLs after required one-time handling, logs, audit payloads, exports, analytics, or backups without backup-level protection. Restrict storage and process access; revoke/rotate on compromise. |
| Sensitive HR data | Sickness classification, absence notes, decision reasons, entitlement details, privileged corrections, employment status | Purpose-specific server authorization and DTOs, shortest applicable retention class, no shared/browser persistence, no generic/team/technical exposure. |
| Personal operational data | Punches, attendance, balances, requests, monthly records, notifications, employee identity | Owner/current-manager/HR scope as defined in `docs/02-roles-permissions.md`; source-linked history; protected response caching; auditable changes. |
| Security/technical metadata | Account/session identifiers, normalized IP data, user-agent/device summary, security audit, request IDs, delivery and health status | Technical purpose only, separately authorized from HR data, minimized and short-lived where possible; never used for productivity monitoring. |
| Organization configuration | Schedules, policies, teams, holidays, timezone, absence-type versions | Readable only where required for the actor's purpose; writable by eligible non-self HR with validation and audit. |
| Public/non-sensitive configuration | Generic liveness result, product name, public version compatibility statement | May be public but must not reveal dependency versions, topology, migrations, hostnames, secrets, tenant/employee counts, or error internals. |

No classification weakens the organization, current-scope, field-minimization, self-action, immutable-history, or transaction rules elsewhere in the planning pack.

## 2. MVP data inventory

PostgreSQL is the authoritative store for account/session records and domain facts. The browser holds authorized server data in memory only unless a row explicitly permits a low-sensitivity display preference. A backup inherits the highest sensitivity of every included row.

| Data | Source | Storage / transfer | Sensitivity | Purpose | Retention class | User control | Main risk | Required control |
|---|---|---|---:|---|---|---|---|---|
| Password verifier | Employee/technical account credential | Better Auth PostgreSQL tables; never returned | Authentication secret | Credential verification | Account credential | Reset replaces verifier; deactivation disables use | Offline cracking or accidental disclosure | Better Auth memory-hard password hashing; restricted DB role; no plaintext/reversible storage/logging/export |
| Session and CSRF material | Successful sign-in/session bootstrap | PostgreSQL plus `HttpOnly` session cookie; CSRF token held in page memory | Authentication secret | Authenticate and protect same-origin mutations | Authentication transient | Self/system revoke; sign-out; automatic expiry | Theft, fixation, replay, cached revocation delay | Database-backed revocable sessions, no stateless/cookie cache, rotation, timeout, cookie and CSRF contract |
| Reset/invitation grant | Password recovery or HR invitation | Better Auth/verification storage; one-time email URL; same-origin reset/activation form | Authentication secret | Establish or recover a credential | Authentication transient | Expires, single use, reissue/revoke | URL/referrer/log/browser-history leakage and account takeover | Protected stored representation, configured origin, short expiry, no third-party resources, URL cleanup/redaction, rate limit |
| Account and security metadata | Authentication/system administration | PostgreSQL; purpose-specific self/technical DTO | Security/technical; personal | Account state, session list, revocation, rate limiting, incident review | Account/security metadata | Self session revoke; eligible administrator action; deactivation | Technical role learning HR facts or storing excessive IP/device history | Separate DTOs; opaque session IDs; never return token; minimize IP/UA; technical authorization |
| Employee/employment identity | HR administration | PostgreSQL; self/manager/HR minimized DTOs | Sensitive HR/personal | Capability, employment history, profile context | Domain identity/history | Read-only self; non-self HR versioned management | Identity leakage or destructive deletion | Organization/scope checks; history-preserving deactivation; export/anonymization rules |
| Team/manager/role assignments | HR/system role administration | PostgreSQL; scoped API | Sensitive authorization data | Determine current capability and report scope | Domain authorization history | Eligible non-self HR/system administrator | Stale manager access, self-role escalation | Effective-dated/current evaluation on every request; role separation; audit; session invalidation where specified |
| Schedule, policy, holiday, timezone | HR configuration | PostgreSQL; affected-user/HR DTO | Organization configuration; personal when assigned | Calculate obligations and explain records | Domain configuration history | Eligible non-self HR; impact preview | Rewriting history or unauthorized schedule inference | Effective dating; version references; timezone lock; authorization and audit |
| Punches, sessions, intervals, daily calculations | Employee action/domain engine | PostgreSQL source facts/projections; self/manager/HR DTOs | Personal operational | Attendance and explainable daily totals | Domain source/ledger history | Correction workflow, never raw-event edit | Surveillance misuse, cross-employee disclosure, silent mutation | Immutable punches; minimized scope; no fine-grained monitoring analytics; source fingerprints |
| Correction and privileged-adjustment data | Employee/eligible reviewer/HR | PostgreSQL workflow/source links | Sensitive HR/personal operational | Preserve original/proposed/decided history | Sensitive workflow/domain history | Versioned request; eligible non-self decision/adjustment | Free-text leakage, self-adjustment, source rewrite | Plain text/length limit; reason where required; purpose DTO; non-self authorization; append-only effect |
| Absence type, coverage, workflow | Employee plus snapshotted HR policy | PostgreSQL; purpose-specific API DTOs | Personal operational; sickness is sensitive HR | Absence calculation, entitlement, availability, approval/cancellation | Sensitive workflow/domain history | Versioned correction/cancellation; no source deletion | Coverage reveals routines; type reveals health/family context | Type-neutral routes; scoped read; neutral team/generic DTO; no shared cache |
| Optional absence/request note | Employee, only for policies that allow it | PostgreSQL; owner and authorized decision DTO only | High in practice | Operational decision context | Sensitive free text | Preview; later version/cancellation, not silent overwrite | Unnecessary medical/family disclosure | Sickness schema has no note; other notes plain-text/length-limited with audience warning; no generic sinks |
| Decision/override reason | Eligible non-self reviewer/HR | PostgreSQL decision plus data-minimized domain audit reference | Sensitive HR/personal operational | Explain rejection, changes, cancellation, or override | Sensitive free text/audit | Actor previews; correction appends | Sensitive speculation reused outside purpose | Required only where policy says; plain text/length limit; no logs/team/generic export |
| Time and leave ledger entries/balances | Domain transaction/HR allocation | PostgreSQL ledgers; self/decision-need manager/HR DTOs | Sensitive employment/benefit data | Explain balances and decisions | Domain source/ledger history | Self view; non-self HR reasoned adjustment | Hidden mutable total or team/technical disclosure | Append-only source-linked entries; separate DTOs; posted/projected distinction |
| Monthly period and approved snapshot | Employee/reviewer workflow | PostgreSQL period/snapshot/adjustments | Personal operational | Reconcile, approve, lock, export, adjust | Domain snapshot/history | Review/request change; no ordinary delete/unlock | Tampering or protected absence leakage | Immutable reconciled snapshot; neutral absence references; signed adjustment trail |
| Audit events | Trusted application/operations | PostgreSQL domain/security audit stores | Personal operational or security metadata; sometimes sensitive | Accountability and incident review | Domain audit or security audit | Authorized read; no ordinary edit/delete | Audit becomes surveillance or leaks payload | Separate audiences, action codes and safe summaries; append-only app permissions; no complete bodies/tokens |
| Notification and email-delivery metadata | Trusted post-outcome process | PostgreSQL notifications/delivery status; optional SMTP | Personal operational; high if wording implies sickness | User-visible outcome and delivery diagnostics | Notification/delivery | Recipient read/dismiss; delivery retry | Lock-screen/email/technical leak | Generic copy; restricted detail fetched after authorization; delivery failure never rolls back domain outcome |
| Idempotency key/fingerprint/outcome | Attendance client and mutation transaction | PostgreSQL protected record | Authentication-adjacent operational secret | Retry safety and replay | Attendance idempotency history | No direct UI; matching retry only | Replay, cross-command inference, log leak | Organization/actor scope; protected key representation where possible; no URL/log/audit/analytics |
| Operational logs/metrics/health | API, database, proxy, mail/deployment process | Controlled log sink/console and health endpoints | Security/technical metadata | Availability, diagnostics, incident response | Operational diagnostics | Host operator retention/rotation | HR payload, token, URL query, or employee-surveillance log | Allowlisted structured fields; redaction; generic route templates; access/rotation; no interaction telemetry |
| CSV/print/clipboard result | Explicit authorized user action | Streamed response, browser download/print/clipboard | Same class as included source fields | User-controlled report portability | Export is not server-retained; local copy is recipient-controlled | Actor initiates and chooses destination | Formula execution, hidden metadata, excessive fields | Generation-time authorization, purpose DTO, formula neutralization, clear included-field copy, no hidden content |
| Database backup | Host operator scheduled/manual action | Encrypted protected backup storage | Highest aggregate sensitivity | Disaster recovery | Backup retention | Host operator lifecycle; no app-user download | Complete breach or resurrected credentials/deleted data | Encryption, access isolation, inventory/expiry, restore quarantine, session/grant invalidation, integrity test |

## 3. Privacy boundary matrix

| Area | Data involved | Prohibited behavior | Severity | Required behavior |
|---|---|---|---:|---|
| Forms | Credentials, sickness, notes/reasons, entitlement | Persisting values by default, asking for diagnosis/medical details, hidden submission, auto-copy | Critical/High | Visible labels/audience, minimum fields, sickness coverage only, password-manager/paste support, safe validation without echoing secrets |
| Browser storage/cache | Credentials, sessions, HR/domain DTOs, drafts | `localStorage`, `sessionStorage`, IndexedDB, Cache API, persisted Query cache, or service-worker caching | Critical/High | Sensitive data remains in memory; protected responses use `Cache-Control: private, no-store`; clear Query/form memory on sign-out, expiry, account/role invalidation |
| Low-sensitivity preferences | Theme/density/agenda preference | Combining with account, employee, request, search, or route history | Moderate | Only documented display preferences may persist locally under versioned keys; provide reset and tolerate storage failure |
| URL/history/referrer | Reset/invite grant, sickness/type, notes/reasons, entitlement, person-identifying search | Treating secrets or sensitive form values as ordinary route state; raw query logging; unvalidated redirects | Critical/High | Only opaque authorized IDs and approved generic filters; one-time grants get special cleanup/redaction; fixed/allowlisted same-origin callbacks; `Referrer-Policy: no-referrer` |
| Team/calendar views | Effective absence | Returning request ID, type, sickness, note, reason, entitlement, reviewer history | High | Employee display identity plus coverage needed for neutral `UNAVAILABLE` only |
| Notification/email | Request/decision outcome | Subject/preview reveals sickness, type, reason, entitlement, or full employee data | High | Generic attention/outcome copy; restricted detail fetched after current authorization; optional SMTP cannot determine transaction success |
| Logs/technical audit | HTTP/auth/domain activity | Request/response bodies, raw query strings, cookies, authorization/CSRF/idempotency/reset tokens, passwords, notes/reasons, sickness codes, entitlement values | Critical/High | Generic route template, safe code/status, request ID, latency, opaque actor/account ID only where justified; redaction tests and restricted access |
| Export/print/clipboard | Report/domain data | Automatic export/copy, hidden fields/metadata, sickness-specific export, formula-active cells | High | Explicit user action and included-field explanation; same authorization/DTO as screen; safe filename; formula neutralization; success/failure feedback |
| Analytics/network | Any employee/domain/browser activity | Third-party analytics, pixels, remote error payloads, external AI/decision calls, undisclosed webhooks | High | No telemetry by default and no third-party runtime scripts; only configured WorkLedger API and optional privacy-safe SMTP communication |
| Retention/deletion | All persisted classes | Universal legal claim, cascade history deletion, silent indefinite retention, backup exemption | High | Deployment-configured class profile, documented user control, source-preserving anonymization/minimization, backup expiry, tested retention job |
| Host/backup | Complete database and secrets | Public storage, unencrypted portable copy, production restore exposed to network/email, restoring valid sessions/grants | Critical | Least-privilege operators, encryption/access isolation, clean restore network, new secrets, revoke sessions/grants, verify ledger/snapshot/audit integrity |

Sickness has no diagnosis, symptoms, treatment, clinician, unrestricted note, or attachment field. A manager's limited review may receive classification and coverage only where the decision requires it; team, generic notification, generic report, technical audit, and operational logging surfaces remain neutral.

## 4. Trust boundaries and data flows

```text
untrusted browser/device
        │ HTTPS; cookie + CSRF + validated payload
        ▼
trusted reverse proxy boundary
        │ private network; overwritten forwarded headers
        ├──────────────► static web assets
        ▼
WorkLedger API/auth process
        │ validated contracts; current authorization; transactions
        ▼
PostgreSQL authority

WorkLedger process ── generic one-time/outcome mail ──► optional SMTP relay
host operator ── explicit backup/restore/migrate ──► protected backup store
```

- The browser, URL, forwarded headers, client clocks, IDs, role claims, and mutation versions are untrusted input.
- Production serves web and API under one canonical HTTPS origin. Cross-origin authenticated browser deployment is outside the MVP default and requires an ADR/security review.
- The API port and PostgreSQL are not publicly reachable. Only the configured reverse proxy reaches the application; only the application/authorized operator reaches PostgreSQL.
- The canonical public origin is validated configuration, not inferred from an arbitrary `Host` or forwarded header. Proxy headers are trusted only from exact configured proxy addresses, and the proxy overwrites client-supplied forwarded values.
- SMTP is an outbound adapter. It receives only the destination and generic message or a single-use account link; delivery failure never changes a domain decision.
- Host access and backups are out-of-band operational privileges, not application roles. A system-administrator role does not itself grant shell, database, backup, or secret access.

## 5. Threat model

Severity reflects plausible impact before controls: `Critical` can enable broad account/system compromise or unrecoverable integrity loss; `High` can expose or alter protected employee data; `Medium` has bounded operational/privacy impact. Release requires no unresolved Critical or High control gap.

| ID | Threat and attack path | Severity | Required controls | Required verification / residual risk |
|---|---|---:|---|---|
| T-001 | Credential stuffing, brute force, common password, or account enumeration through sign-in/recovery | High | Invite-only signup; password floor; generic/timing-neutral outcomes; per-route rate limit by trusted client signal and account where safe; no hard lockout disclosure | Integration/load fixtures for known/unknown/inactive accounts, IPv4/IPv6/proxy cases; distributed attack remains a deployment-monitoring risk |
| T-002 | Reset/invitation grant leaks through query log, referrer, browser history, email preview, replay, or open redirect | Critical | Random protected single-use grant; fixed canonical origin; allowlisted callback; short expiry; no raw query logs/third-party assets; URL cleanup; no auto sign-in; revoke sessions after reset | Invalid/expired/used/cross-origin/replayed links; inspect history/referrer/proxy logs. Recipient mailbox compromise remains out of app control |
| T-003 | Session theft, fixation, overlong lifetime, stale cookie cache, or token returned to UI | Critical | `__Host-` secure HttpOnly cookie; database session; no stateless/cookie cache; rotate at auth/reauth; idle/absolute/freshness limits; opaque session-management DTO | Cookie/header assertions; revoke/deactivate/reset/role-change tests; stolen active session remains usable until detection/timeout |
| T-004 | CSRF/login CSRF or state change by safe method | High | Same-origin deployment; Better Auth CSRF/origin/Fetch Metadata checks remain enabled; session-bound app CSRF token; strict Origin/Referer validation; no mutation on GET; SameSite defense in depth | Cross-origin form/fetch, missing/bad token/origin, simple-content-type, GET mutation inventory |
| T-005 | Host/proxy/header spoofing bypasses HTTPS, origin checks, secure cookies, IP rate limit, or redirect allowlist | Critical | Fixed public origin; exact trusted-proxy list; strip/overwrite forwarded headers; private app port; TLS redirect; no broad trusted networks | Direct-origin denied; forged `X-Forwarded-*` tests; multi-proxy documentation review |
| T-006 | Broken object-level authorization or cross-organization/employee ID substitution | High | Central deny-by-default policy; organization/current scope and purpose DTO before lookup result; explicit `403`; scope before counts/pagination | Full permission matrix for every protected endpoint; opaque ID is not authorization |
| T-007 | Former manager, combined role, self-approval, privileged self-adjustment, or self-role escalation | High | Current effective scope on every request; prohibited self-actions override role union; HR/system separation; non-self role assignment; authorization version and session invalidation | Former/new manager, combined-role, role removal, technical-only, bootstrap recovery tests |
| T-008 | Duplicate/replayed/racing mutation creates punches, ledger entries, approvals, or adjustments twice | High | Scoped idempotency, expected revisions/versions, row locks/unique semantic sources, one transaction, safe replay order | Same/different key, same/different device, dependency rollback, post-lock concurrency integration tests |
| T-009 | Ordinary edit, migration, or privileged actor silently rewrites punch/ledger/snapshot/audit history | Critical | Immutable events/snapshots, append-only ledgers/adjustments, constrained DB role, migrations, audit, backup before change | DB constraint/repository tests, snapshot reconciliation, upgrade/restore integrity checks. Host DB superuser remains a trusted operational risk |
| T-010 | Stored/reflected XSS or HTML injection through names, notes, reasons, imports, error context, or audit | High | Schema length/type validation; plain-text rendering/escaping; no arbitrary HTML/Markdown; CSP; no third-party scripts; safe error serialization | Payload fixtures across screen/print/export/notification; CSP test; dependency UI review |
| T-011 | Sensitive HR data leaks through URL, browser persistence, shared cache, team DTO, generic notification, clipboard, telemetry, or technical logs | High | Inventory/privacy matrix, type-neutral routes, no-store protected responses, purpose DTOs, neutral copy, no telemetry, logout/expiry cache clear | Field-absence contract tests and manual browser/network/storage/log/clipboard inspection |
| T-012 | SQL injection, mass assignment, unknown fields, or unsafe sort/filter drives unauthorized query | High | Contract validation and response serialization, unknown-field rejection, parameterized Drizzle queries, allowlisted sort/filter, no database rows returned directly | Schema/contract and injection fixtures; code review of raw SQL escape hatches |
| T-013 | CSV formula injection, excessive export, printable hidden fields, unsafe filename, or export after scope loss | High | Generation-time authorization, bounded scope/pagination, purpose DTO, formula neutralization, safe filename/encoding, export audit without content | Formula-prefix matrix, role/scope change, large export, print/clipboard field inspection |
| T-014 | Audit/log forging, newline injection, secret leakage, or audit used for employee surveillance | High | Structured allowlisted fields, safe codes, escaping, append-only app permissions, separate domain/technical access, retention and alert review | Malicious text fixtures, redaction snapshots, role access tests; database/host operators remain trusted |
| T-015 | Backup theft, incomplete restore, restore of live sessions/grants, or production email from test restore | Critical | Encrypted restricted backup, manifest/retention, isolated clean restore, new deployment secrets, revoke sessions/grants, outbound email disabled, integrity verification | Scheduled restore exercise with row/ledger/snapshot/audit checks and network/email assertions |
| T-016 | Committed/default secret, malicious dependency/image, vulnerable auth default, or unsafe upgrade | Critical | `.env` ignored; placeholder example; secret injection/rotation; lockfile and pinned images; stable dependencies; vulnerability/license review; migration/rollback procedure | Secret scan, clean build, dependency/image scan, auth configuration assertions, prior-version upgrade test |
| T-017 | Expensive report/export/filter, request body, login, or mutation flood exhausts app/database | Medium/High | Body/query limits, pagination, timeouts, connection pool, rate limits, bounded export, health/readiness, resource limits | Boundary/load/concurrency tests at expected 10–250 employee scale; distributed DoS depends on deployment edge controls |
| T-018 | Public health/error/operations endpoint reveals topology, versions, migration state, record counts, or secrets | Medium | Generic public liveness only; detailed readiness/diagnostics authorized to technical role/host; safe request ID; production errors | Anonymous/employee/HR/system-admin response-shape tests and error snapshot review |
| T-019 | Notification/reset email leaks domain detail, allows header/content injection, or retries duplicate domain action | High | Generic fixed templates, validated address/header handling, no raw note/reason/type, one-time link controls, delivery record separate from outcome | Message snapshot/privacy tests, SMTP failure/retry, malicious display name/address fixtures |
| T-020 | Host, database-superuser, mailbox, endpoint device, or deployment-owner compromise bypasses application controls | Critical residual | Least privilege, host hardening, encryption, operator separation, backup protection, incident/rotation docs | Documented trust assumption; cannot be eliminated by application authorization alone |

### Deferred-surface triggers

Attachments, public API/webhooks, OIDC/LDAP, telemetry, S3, Redis/queues, multi-organization SaaS, mobile/native clients, cross-origin app hosting, and external AI are outside the MVP. Introducing one requires an ADR plus a new data-flow/threat review before implementation. No dormant attachment URL, upload, remote-script, analytics, or webhook code is included in the MVP.

## 6. Credential and account security contract

### Account creation and passwords

- Public self-sign-up is disabled. Eligible HR or system administrators create/invite the account types their role permits; neither can assign their own privileged role.
- Passwords are at least 15 characters and at most 128 characters because MFA is not an MVP requirement. Spaces and Unicode are accepted; paste and password managers are supported. No composition rule or routine periodic change is required.
- A local/offline common-password denylist rejects known weak values without sending plaintext or a password-derived value to a third party. A breach-screening network service is not part of the MVP.
- Better Auth's supported memory-hard password verifier is used and benchmarked during `WL-302`; no custom reversible encryption or fast hash is permitted. If the selected stable Better Auth version cannot meet the accepted security floor, record an ADR instead of silently weakening it.
- Authentication responses and recovery requests use one generic result for unknown, inactive, deactivated, or incorrect accounts. Timing is kept materially equivalent through the same asynchronous control path; no UI, status code, or email-delivery result enumerates an account.
- Authentication, recovery, invitation, and activation have production-enabled route-specific rate limits. Rate limiting uses proxy-validated client IP/subnet plus an account key only after safe normalization; it never hard-locks an account solely from unauthenticated attempts. `429` includes safe retry guidance.

### Reset and invitation grants

- Password-reset grants expire after 30 minutes. Invitation/activation grants expire after 24 hours. Both are cryptographically random, stored through the auth/verification boundary as a protected single-use value, scoped to one account and purpose, and invalidated on success or explicit reissue.
- Recovery request copy is identical for known and unknown email addresses. Email sending is asynchronous enough that the HTTP response does not expose account existence or SMTP result.
- The link origin comes only from validated deployment configuration. Callback/return paths are allowlisted same-origin paths; arbitrary absolute URLs are rejected and Better Auth origin/CSRF checks are never disabled.
- Better Auth currently returns the reset grant to the configured reset page as a query value. The reset/activation page has no third-party resource, analytics, or service-worker cache; sends `Referrer-Policy: no-referrer` and `Cache-Control: private, no-store`; reads the grant only for the same-origin reset operation; and immediately replaces the visible history entry with the clean route. Proxy/application logs redact the entire raw query string for these routes.
- The form holds the grant only in component memory, never local/session storage, persisted query cache, analytics, error context, or audit. Invalid/expired/consumed states do not echo it.
- Successful password reset sets `revokeSessionsOnPasswordReset: true`, invalidates all reset grants, and returns the actor to normal sign-in rather than automatically creating a session. A reset and an invitation/activation create security-audit evidence without storing the grant.

## 7. Session, cookie, and client-cache contract

### Accepted session profile

- Better Auth sessions are stored in PostgreSQL. Stateless sessions, secondary session storage, and Better Auth cookie/session caching are disabled in the MVP so revocation and account changes take effect on the next request.
- Session cookies use the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`. Production HTTP redirects to HTTPS before authentication and never accepts a non-secure session cookie.
- The MVP has no persistent “remember me” option. The cookie is browser-session scoped and the server enforces both a 30-minute idle timeout and a 12-hour absolute lifetime. Passive background polling does not extend the idle deadline.
- A session is fresh for 15 minutes after sign-in or explicit reauthentication. Fresh authentication is required for password/account recovery changes, revoking other sessions, assigning/removing privileged roles, combining HR and system-administrator roles, deactivating an account, and technical bootstrap/recovery. Routine clocking, requests, reviews, and approvals require an active authorized session but not repeated freshness prompts.
- The session identifier rotates on successful authentication and reauthentication and is never accepted from URL/body input. Session/list DTOs expose opaque session IDs, device/browser summary and timestamps needed for recognition, never the session token or complete user-agent header.

### Revocation and authorization change

- Sign-out revokes the current server session and clears the cookie. “Sign out other sessions” and technical revocation identify sessions by safe opaque ID and reauthorize the current actor; they never round-trip the token through UI data.
- Password reset, account deactivation, employee/account unlink, and privileged role assignment/removal revoke all sessions for the account. Current manager/team/schedule/policy changes are enforced from authoritative WorkLedger data on every request and do not rely on cached session claims.
- A revoked/expired session fails before authorization, idempotency replay, or domain lookup. Sensitive Query/form state is cleared and the UI follows the session-expiry focus/announcement contract in `docs/05-ux-accessibility.md`.
- Session expiry/revocation is authoritative server state. Client clocks and browser-close events are usability hints only.

### Browser storage and response caching

- TanStack Query holds protected responses in memory only. Persistence adapters, local/session storage, IndexedDB, Cache API, and service-worker caching of authenticated HTML/API responses are prohibited.
- Protected HTML/API responses, auth/reset/activation routes, exports, and errors containing actor-specific data send `Cache-Control: private, no-store`. Static fingerprinted assets may use long-lived public caching because they contain no user data.
- On sign-out, session expiry, deactivation, or account/privilege invalidation, clear protected query/form/error state before rendering another account context. A subsequent browser-history restoration must revalidate the session before displaying protected content.
- Only low-sensitivity display preferences such as theme, density, or calendar view may persist locally. Keys are versioned and organization/account-independent, values are validated, failure is non-fatal, and Profile offers a reset; no route/search/person/request history accompanies them.

## 8. CSRF, origin, browser, and transport controls

- Production uses one canonical HTTPS origin for web and API. CORS is disabled by default; no wildcard or reflected credentialed origin is permitted. A future cross-origin browser deployment requires an ADR.
- Better Auth's CSRF, Origin, redirect/callback, and Fetch Metadata checks remain enabled. `disableCSRFCheck`, `disableOriginCheck`, broad `trustedOrigins`, and untrusted forwarded-origin inference are prohibited.
- Every WorkLedger unsafe request (`POST`, `PUT`, `PATCH`, `DELETE`) requires an Origin/Referer match against the configured canonical origin and a cryptographically random session-bound CSRF token supplied in a custom header. The synchronizer token is returned only after session validation, kept in memory, rotated with the session, and compared without leaking it.
- No `GET`, `HEAD`, or `OPTIONS` route changes server state. JSON/content-type requirements and Fetch Metadata are defense in depth, not substitutes for token and origin validation.
- The baseline response-header contract includes a tested Content Security Policy without remote scripts or `unsafe-eval`, `frame-ancestors 'none'`, `object-src 'none'`, constrained `base-uri`/`form-action`/`connect-src`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a restrictive Permissions Policy disabling camera/microphone/geolocation, and HSTS on production HTTPS after deployment validation.
- Application pages cannot be framed. Redirect destinations and return paths are server allowlists, never raw client-provided absolute URLs.

## 9. Authorization contract

- Central server policies deny by default and enforce the complete matrix in `docs/02-roles-permissions.md`.
- Every protected request checks active account, active employee link where needed, organization, role, target, current effective manager relationship, record state, field purpose, and prohibited self-action. Client role/navigation state is not authoritative.
- Explicit unauthorized targets return `403 ACCESS_DENIED`; authorized missing targets return `404`. Collections apply scope before filters, totals, sorting, and pagination.
- HR and system-administrator capabilities remain separate. Technical operations/session access does not expose employee, attendance, absence, balance, report, notification content, or domain audit payloads.
- Role/scope changes take effect without waiting for client-cache expiry. The API serializes only purpose-specific fields and reauthorizes downloads, notification links, print views, and audit detail at use time.

## 10. Mutation safety and integrity

- Every clock mutation requires the `Idempotency-Key` and `expectedAttendanceRevision` contract in `docs/03-domain-rules.md` section 9 and `docs/13-api-error-conventions.md`.
- Session, CSRF, current employee capability, organization, authorization, and request-schema validation occur before idempotency replay. Possession of a key grants no access.
- The idempotency claim, locked state, domain effects, one revision increment, data-minimized audit event, and terminal outcome commit atomically. Same-key concurrency produces one outcome; different-key stale contenders receive safe current state.
- Raw idempotency keys/fingerprints are excluded from URLs, browser persistence, analytics, audit, and normal logs. Retryable dependency failures are not stored as terminal unless a transaction committed.
- Approvals, cancellations, corrections, ledger effects, entitlement changes, period transitions, snapshot creation, lock, and post-lock effects validate the expected version/current scope and run in one transaction with unique source constraints.
- Only complete past dates post. Posted/projected balances remain separate, and an incomplete date never disappears inside an authoritative total.
- Raw punches, prior ledger entries, decisions, approved snapshots, and adjustments are never updated/deleted by ordinary endpoints. Reversal appends compensation.

## 11. Input, output, and content safety

- Validate every body, path, query, header, date, ID, enum, sort, pagination, and content type; reject unknown fields for security-sensitive commands. Serialize every response through a purpose contract.
- User-authored names, notes, reasons, and labels are bounded plain text. Render by normal framework escaping; no raw HTML, untrusted Markdown, template evaluation, style/script URL, or DOM injection.
- Error envelopes expose stable safe codes and recovery context only. Never include stack, SQL, filesystem path, environment value, cookie, CSRF/idempotency/reset/session token, complete input, unrelated record, or authentication enumeration detail.
- Request body and query size, page size, export range, date range, sort keys, and database execution time have bounded validated limits. Exact values are selected/tested in their implementation task for the expected 10–250 employee scale.

## 12. Audit, logging, and observability

### Domain and security audit

Record only the data needed for the audience:

- opaque actor/account/target/organization identity,
- action code and success/denial outcome,
- timestamp/effective date where relevant,
- reason code or restricted reason reference where required,
- safe before/after summary,
- request/correlation ID,
- privileged-action indicator,
- session/account security action metadata where needed.

Domain audit and security/technical audit use separate authorization/projections. A system administrator receives no domain payload; an HR administrator receives no technical credential/session secret. Audit events are append-only to normal application roles, escape hostile text, and never replace source history.

Required security events include sign-in success/failure in non-enumerating form, recovery/invitation request and completion, password reset, session revoke/expiry, account activation/deactivation, privileged role change/bootstrap, repeated authorization denial, export, backup/restore/upgrade outcome, and secret rotation. Failed unknown-account attempts use generic/aggregated metadata rather than creating a discoverable person record.

`WL-305` implements the separated append/query persistence boundary and minimized fact allowlists;
see `docs/46-audit-persistence-foundation.md`. Later feature producers remain responsible for
appending each required event in the same transaction as its source action where applicable.

### Operational logs and diagnostics

Operational logs answer service-health questions, not employee activity questions. Allowlisted structured fields include timestamp, level, service/version family, generic route template, HTTP status, stable safe error code, request ID, latency, dependency category, and opaque actor/account ID only when necessary.

Never log raw request URL/query, bodies, responses, cookies/headers containing secrets, passwords, session/reset/CSRF/idempotency values, notes/reasons, sickness/type/coverage, entitlement, report rows, exports, notification content, or database statements with bound personal values. Redaction occurs before serialization, including exceptions and dependency errors.

## 13. Export, print, clipboard, and notification safety

- Export/print is explicit and reauthorized at generation time through the same minimized source query. The UI states the included fields and scope; server output contains no hidden columns/metadata.
- Neutralize CSV cells that could be interpreted as formulas, including leading formula-significant characters after whitespace/control inspection, through the exact apostrophe-prefix contract in `EX-043`. Then apply ordinary CSV quoting. Use explicit UTF-8, delimiter, line ending, content type, and safe non-person-identifying filename behavior.
- Stream or bound exports; the server does not retain generated content. Audit only actor, report type, scope summary, time, and outcome.
- Clipboard writes occur only after a labelled user action, contain the described visible information, and announce success/failure. No automatic copy or hidden tracking payload is permitted.
- Generic reports/prints/notifications omit sickness classification, request/decision notes, medical inferences, entitlement details outside an authorized leave report, and reviewer comments. A sickness-specific export is excluded.

## 14. Secrets, configuration, and supply chain

- Environment configuration has a validated schema and fails closed in production. `.env.example` contains only safe local defaults plus blank/placeholder production values; `.env*` other than the example remains ignored. Secrets are never committed, built into images, exposed to the browser, printed on startup, or returned by diagnostics.
- `WL-105` validates `WORKLEDGER_ENVIRONMENT`, `WORKLEDGER_ORIGIN`, `WORKLEDGER_TRUSTED_PROXY_ADDRESSES`, `WORKLEDGER_DATABASE_URL`, and `WORKLEDGER_AUTH_SECRET` before API startup. Production requires one HTTPS canonical origin, one or more exact proxy IP addresses, database credentials, and a non-placeholder authentication secret of at least 32 bytes. The checker reports only variable names and configuration state, never a connection string or secret value.
- The API consumes the canonical origin only from validated configuration. It passes only the validated exact proxy address list to Fastify; `trustProxy: true`, hop counts, CIDR ranges, wildcard networks, and Host/forwarded-origin inference are not accepted. The parser reads an already-resolved process environment; secret-file mounting and production container wiring remain deployment work.
- Production supports secret injection through the deployment environment or mounted secret files. Authentication secrets support documented versioned rotation; database and SMTP credentials have least privilege and separate values per environment.
- The initial/bootstrap privileged-account procedure is one-time, deployment-controlled, produces audit evidence, never prints a generated password/token to ordinary logs, and is disabled after eligible administrators exist.
- Lock exact dependency versions, use stable supported releases, pin production image versions/digests, run dependency/image/secret scans in CI/release review, and record upgrade/remediation decisions. No runtime CDN scripts or remote code.
- PostgreSQL application, migration, backup, and restore privileges are separate where practical. The application role cannot create/drop schemas, read host files, or bypass row/purpose authorization through a public database port.

## 15. Self-hosting and reverse-proxy contract

The shipped reference deployment uses Caddy because it provides a concise automatic-HTTPS reverse-proxy example. WorkLedger remains proxy-agnostic: another proxy is supported only when it satisfies the same observable contract.

```text
Internet
   │ HTTPS only
   ▼
Caddy reference proxy
   ├── /assets and web application
   └── /api and auth → private API service
                              │
                              ▼
                        private PostgreSQL
```

- One canonical HTTPS origin serves web and API. HTTP redirects to HTTPS; TLS certificate/renewal is the deployment's responsibility through Caddy or an equivalent proxy.
- Only the proxy publishes ports. API and PostgreSQL bind to the private Compose/network boundary and are not exposed on the public host interface.
- The proxy overwrites/sanitizes `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`. The application trusts only configured proxy addresses and a validated public origin; direct untrusted forwarded headers never affect cookie security, callback URLs, rate limits, or audit identity.
- Apply request/body/header limits, timeouts, HSTS and security headers consistently. Do not disable upstream TLS verification when TLS is used between proxy and application.
- Production containers run as non-root where supported, use minimal pinned images, avoid host Docker socket/mutable source mounts, use health/readiness checks and resource limits, and persist only documented database/backup volumes.
- Optional SMTP is configured separately. Redis, workers, S3, attachment storage, and analytics are not part of the MVP reference deployment.

## 16. Health, readiness, and incident diagnostics

- Public liveness answers only whether the service process can respond. It contains no dependency version, database state, migration identifier, organization/employee count, host/path, or exception.
- Readiness verifies required dependencies and compatible migrations but exposes detail only to the orchestrator/host operator or authorized `/system/operations` DTO. A non-ready instance does not accept normal traffic.
- Detailed diagnostics use request IDs and safe categories. They never return environment variables, connection strings, SQL, secrets, protected counts, or domain payloads.
- Document incident steps for suspected credential/session secret, database, email, backup, or host compromise: isolate, preserve safe evidence, rotate affected secrets, revoke sessions/grants, verify audit/integrity, restore if necessary, and communicate through deployment-owned procedures.

## 17. Backup and restore

Production release requires an executed, documented restore—not only a backup command.

- Back up PostgreSQL with a consistent supported method and a manifest containing application/schema version, time, checksum, encryption status, and retention class without sensitive row content.
- Encrypt backups in transit and at rest, restrict storage/operators, keep them outside the application public network, monitor success/failure, and expire copies according to the deployment retention profile.
- Restore into a clean isolated environment with outbound email/webhooks disabled and no public exposure. Use new deployment/auth/database/SMTP secrets; invalidate all restored sessions and unconsumed reset/invitation grants before access.
- Apply the matching application/schema version, then verify migrations, organization/employee/source row counts, foreign keys, immutable punches, time/leave ledger reconciliation, monthly snapshot fingerprints/totals, post-lock links, audit continuity, and ability to authenticate only through newly established sessions.
- Record the restore test date, backup/version, duration, checks performed, failures, and operator. Do not record exported domain content in the evidence.
- The deployment owner defines recovery point/time objectives; WorkLedger does not make a universal guarantee. A procedure that cannot meet the declared objectives or has not restored successfully blocks production readiness.

## 18. Migration and upgrade

- Commit generated SQL migrations. Never edit a migration already applied to a released installation; add a new one.
- Validate compatible source/target versions, read release notes, back up before migration, test on a production-shaped copy, and define rollback/forward-recovery behavior before changing production.
- During incompatible migration, readiness fails and ordinary traffic is drained or shown a maintenance state. Do not run two application versions against an incompatible schema.
- Test upgrade from at least the previous supported release and re-run authorization, ledger/snapshot integrity, auth/session configuration, and backup/restore checks.
- Dependency or auth-library upgrades that alter cookies, hashing, sessions, token URLs, CSRF, database schema, or defaults trigger an ADR/security review.

## 19. Retention, deletion, anonymization, and user control

WorkLedger makes no universal legal-retention claim. Before a production deployment is accepted, its owner must explicitly configure and document these classes; unset placeholders fail the production-readiness check:

1. authentication transient records (expired sessions, reset/invitation grants, rate-limit state),
2. account/security metadata,
3. operational logs/diagnostics,
4. notifications and email-delivery attempts,
5. sensitive HR free text/classification,
6. domain source, workflow, ledger, snapshot, and domain audit history,
7. security/technical audit,
8. database backups.

The profile records the duration/expiry rule, deletion versus minimization behavior, operator, backup effect, and jurisdiction/policy owner for each class. A documented explicit retention choice is required; silent indefinite retention is not.

- Expired sessions, grants, rate-limit records, notification delivery attempts, and operational logs may be purged independently when no longer needed.
- Punches, decisions, ledger entries, approved snapshots, linked adjustments, and audit evidence required for explainability are not cascade-deleted by ordinary account/employee/request operations. End users use correction, cancellation, export, and deactivation controls.
- When the configured domain retention period ends, the `WL-1007` process minimizes/anonymizes personal identity and sensitive free text where permitted while preserving referential, ledger, snapshot, and audit integrity. It records the action without copying removed content into audit.
- Backup copies retain removed data only until their configured expiry; restore procedures must reapply retention jobs before any restored environment becomes active.
- Legal-hold/case-management automation is not an MVP feature. A deployment that requires it must define an operational procedure and later product work rather than assuming WorkLedger provides legal compliance.

## 20. Verification and release controls

### Required automated evidence

- Credential policy, generic account responses, reset/invitation expiry/single use, rate limit, redirect/origin, password-reset session revocation.
- Cookie attributes, database-backed session configuration, idle/absolute/freshness, rotation, self/admin revoke, deactivation/role-change invalidation, no raw token in DTO.
- CSRF token/origin enforcement, no unsafe GET mutation, CORS denial, security headers, cache headers, and browser storage prohibition.
- Every protected endpoint against the permission matrix, purpose-field omissions, scope-before-count/pagination, stale scope and combined-role self-action.
- Idempotency/concurrency/transaction rollback, immutable history, ledger/snapshot reconciliation.
- Input/response serialization, XSS/plain-text, error redaction, log/audit redaction, notification/email field minimization.
- CSV formula/encoding/filename, reauthorization after scope change, bounded export.
- Proxy-header spoof, direct app/database exposure check, health/readiness response shapes, production config/secret validation.
- Backup encryption/access manifest and clean restore with credential/session/grant invalidation plus ledger/snapshot/audit integrity.
- Retention profile validation, class-specific purge/minimization, backup-expiry behavior, and no cascade history loss.

### Required manual evidence

- Inspect browser URL/history/referrer, cookies, local/session storage, IndexedDB, Cache API, service worker, network caching, clipboard, downloaded/printed fields, and session restoration after logout/expiry.
- Inspect proxy/application/database/mail logs and technical/domain audit views for secrets, raw queries, sensitive absence data, and hostile text.
- Exercise former-manager, combined-role, technical-only, deactivated, restored-backup, dependency-failure, and maintenance scenarios.
- Review production proxy/TLS, network exposure, trusted headers, secret injection/rotation, backup store, restore isolation, retention profile, and incident contacts.

### Release blockers

- Any unresolved Critical/High threat control or failing authorization/privacy contract.
- Auth/security-library configuration not pinned and proven against the accepted contract.
- Production secret, canonical origin, proxy-trust, retention, backup, or SMTP setting left at a sample/unsafe value.
- No successful clean restore or integrity/revocation evidence.
- Sensitive data found in URL persistence, browser storage/cache, generic/team/system DTO, export, notification, clipboard, audit, or operational logs outside its permitted purpose.

## 21. Primary references

- Better Auth security, session management, email/password reset, rate-limit, and configuration documentation: <https://better-auth.com/docs/reference/security>, <https://better-auth.com/docs/concepts/session-management>, <https://better-auth.com/docs/authentication/email-password>, <https://better-auth.com/docs/concepts/rate-limit>, <https://better-auth.com/docs/reference/options>.
- OWASP Authentication, Session Management, Forgot Password, CSRF Prevention, Password Storage, and HTTP Headers Cheat Sheets: <https://cheatsheetseries.owasp.org/>.
- MDN cookie header reference: <https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie>.
- Caddy automatic HTTPS and reverse-proxy documentation: <https://caddyserver.com/docs/caddyfile/options>, <https://caddyserver.com/docs/caddyfile/directives/reverse_proxy>.

The selected stable dependency versions and exact supported browser versions must be rechecked during implementation and before release; this document defines the security floor, not permission to trust a library default without verification.
