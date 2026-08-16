# Phase 10 threat, permission, and privacy baseline

`WL-1000` establishes the production-hardening evidence register. WorkLedger is a self-hosted
application carrying high-sensitivity authentication, employment, attendance, benefit,
sickness-related absence, approval, audit, export, and backup data. Its primary flow is browser →
same-origin proxy → API → PostgreSQL, with optional purpose-minimized email delivery.

This baseline found no confirmed unresolved application-layer Critical or High vulnerability. It
does **not** declare WorkLedger production-ready: several controls require deployment, load,
restore, upgrade, logging, or retention evidence that later Phase 10 tasks must add. `WL-1008` is
the only final threat-control gate.

## Evidence register

| Threat | Current evidence | Status after `WL-1000` | Remaining owner |
|---|---|---|---|
| `T-001` | Password-policy, generic authentication outcome, atomic throttle, inactive-account, and trusted-client tests in `auth-security.unit.test.ts` and `authentication.integration.test.ts` | Application verified; distributed abuse remains an edge/monitoring risk | `WL-1001`, `WL-1003`, `WL-1006` |
| `T-002` | Single-use/expiry/replay, canonical-origin link construction, protected stored grant, session revocation, and browser URL-cleanup tests | Application verified | `WL-1003`, `WL-1006` inspect proxy/referrer/log behavior |
| `T-003` | Pinned Better Auth profile, host-only cookie assertions, database sessions, timeout/freshness, reset/deactivation/role-change revocation, and opaque self-session DTO tests | Application verified | `WL-1003` verifies deployed cookie/TLS behavior |
| `T-004` | Same-origin, Fetch Metadata, session-bound CSRF, missing/bad token, and unsafe-method integration coverage | Application verified | `WL-1003` verifies through the reference proxy |
| `T-005` | Fixed-origin and exact-proxy configuration tests plus forged-forwarded-header health tests | Partial; no direct production-port/isolation evidence yet | `WL-1003` |
| `T-006` | Deny-by-default policy, organization/target checks, purpose DTO tests, explicit `403`, and scoped collection tests; `authorization-policy.unit.test.ts` now enumerates every central action | Application verified | Downstream tasks retain the same policy checks |
| `T-007` | Current/former manager, role removal, session invalidation, technical/HR separation, fresh-session, and combined-role self-prohibition tests | Application verified | `WL-1000A` applies the same rules to locked cancellation |
| `T-008` | Attendance idempotency/concurrency, approval versioning, unique ledger sources, cancellation stale replay, and post-lock adjustment transaction tests | Application verified for implemented mutations | `WL-1000A`, `WL-1001` add locked-cancellation and scale races |
| `T-009` | Immutable-history database triggers, append-only repository contracts, snapshot reconciliation, and migration integration tests | Application/database verified; restore/upgrade proof open | `WL-1004`, `WL-1005` |
| `T-010` | Strict bounded text contracts, React text rendering, safe error serialization, and hostile-text audit/export fixtures; no arbitrary HTML/Markdown API exists | Partial; deployed CSP is not yet evidenced | `WL-1003`, `WL-1006` |
| `T-011` | Type-neutral URLs, memory-only server state, no browser persistence, no-store responses, minimized team/report/notification/print/clipboard contracts, and field-absence tests | Application verified; deployed logs/cache inspection open | `WL-1003`, `WL-1006`, `WL-1007` |
| `T-012` | Strict Zod request/response schemas, unknown-field rejection, allowlisted filters/sorts, parameterized Drizzle queries, safe schema errors, and repository SQL review | Application verified | `WL-1001` exercises expensive query boundaries |
| `T-013` | Generation-time scope refresh, CSRF POST export, row/byte bounds, formula neutralization, generic filenames, purpose DTOs, and explicit print/clipboard action tests | Application verified | `WL-1001` verifies expected-scale bounds |
| `T-014` | Separate append-only domain/security audit stores, allowlisted facts, role-separated reads, hostile-text/redaction tests, and no request-body logger | Partial; production structured logging does not yet exist | `WL-1006`, `WL-1007` |
| `T-015` | Backup/restore security contract only | Open release evidence; no safe production backup is shipped or claimed | `WL-1004` |
| `T-016` | Ignored environment files, safe example config, secret-free config output, frozen lockfile, pinned stable dependencies, private packages, and auth-profile assertions | Partial; image/secret/dependency scan and prior-version upgrade remain open | `WL-1003`, `WL-1005` |
| `T-017` | Request schemas, bounded pagination/export, atomic throttle buckets, and database pool configuration | Partial; expected-scale load/concurrency measurements remain open | `WL-1001`, `WL-1003` |
| `T-018` | Generic no-store liveness, request IDs, safe error envelopes, and authorization separation tests | Partial; authenticated readiness/diagnostics are not implemented | `WL-1006` |
| `T-019` | Fixed generic notification content, purpose-minimized DTOs, delivery separated from domain outcome, and delivery failure/retry tests | Application verified; production transport review open | `WL-1006` |
| `T-020` | Explicit trusted-host/operator/mailbox/device assumptions and least-privilege deployment contract | Accepted residual risk; operational mitigations still need evidence | `WL-1003`–`WL-1006` |

“Partial” and “open release evidence” mean the production gate is blocked, not that a test was
silently waived. A downstream owner must replace the status with evidence or record a confirmed
finding and remediation before `WL-1008`.

## Permission regression baseline

The central policy has 36 employee-target, five account-target, and seven installation actions.
The action catalogs are executable constants and their TypeScript action types derive from those
constants. The exhaustive unit matrix now checks every catalog entry for applicable inactive,
cross-organization, employee-self, unrelated-target, current-manager, unrelated-manager, HR,
system-administrator, and fresh-session outcomes. Existing PostgreSQL-backed service tests remain
responsible for record state, current effective scope, collection-before-pagination behavior,
field minimization, and transaction effects at each protected surface.

The test does not imply that UI route hiding authorizes an operation. API services continue to
resolve current account, organization, employee capability, roles, target, relationship, and
prohibited self-action from PostgreSQL when the request is handled.

## Privacy inventory and findings

| Data/surface | Storage or transfer | Sensitivity | Current control | Remaining check |
|---|---|---:|---|---|
| Sessions, CSRF, invitation/reset grants | PostgreSQL, secure cookie, one-time same-origin link, browser memory | High | Protected storage, no token DTO/log/audit, URL cleanup, expiry/revocation | Deployed proxy/referrer/log inspection |
| Attendance, absence, balances, approvals, snapshots | PostgreSQL and purpose-specific no-store DTOs | High | Current scope, immutable/source-linked history, no browser persistence | Retention/minimization execution |
| URL state | Bounded dates, paging, allowlisted sort/filter, opaque authorized target | Moderate | No notes, reasons, sickness subtype, names, tokens after grant capture, or protected source IDs | Manual browser-history inspection |
| CSV, print, clipboard | User-initiated transient output | High | Action-time authorization, purpose DTO, formula neutralization, generic filename, success/failure feedback | Expected-scale and deployed cache checks |
| Audit, diagnostics, notification delivery | Separate PostgreSQL stores; logging currently disabled | High | Allowlisted facts, separate domain/technical audiences, generic notification copy | Structured log/redaction/retention evidence |
| Backups | Not yet shipped | Highest inherited | Contract only | Encrypted isolated restore exercise |

No hidden analytics, telemetry, third-party runtime script, service worker cache, local storage,
session storage, IndexedDB, or automatic clipboard write was found. The repository intentionally
keeps server state in memory and disables API request logging until the allowlisted structured
logging task is complete.

## `D-504` resolution and release blockers

Locked-period cancellation remains fail-closed with no partial effect. `D-504` now defines the
required snapshot-linked, non-self-authorized, append-only adjustment behavior, and `WL-1000A` is a
required dependency of the production gate. This is a product-completeness blocker, not a known
confidentiality or integrity vulnerability in the current denial path.

Release remains blocked by `WL-1000A` and the evidence owners named above. In particular, this
baseline does not claim deployed CSP/network isolation, encrypted restore, upgrade safety,
structured log redaction, expected-scale resilience, or retention execution.

## Manual verification carried forward

- Inspect browser history, referrer, storage, cache, and network after activation/reset and logout.
- Inspect CSV, print, and clipboard output for field absence and hostile formula/text fixtures.
- Exercise former/new manager and role-loss behavior from separate live sessions.
- Verify direct API/database ports and forged forwarded headers against the production Compose.
- Inspect structured logs and diagnostics with hostile text and authentication/HR payloads.
- Execute the isolated encrypted restore with new secrets, revoked grants/sessions, and outbound
  mail disabled.

No publish, push, tag, upload, release, or remote write command was run. No secret value is printed
in this review.
