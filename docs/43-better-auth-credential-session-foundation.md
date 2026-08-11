# Better Auth credential and session foundation

**Task:** `WL-302`  
**Outcome:** Complete locally.

## Boundary and dependency

WorkLedger pins Better Auth `1.6.26`, the current stable release verified for this task. The API owns
the Better Auth configuration and Fastify Fetch-handler bridge; `packages/database` owns the five
PostgreSQL authentication tables, adapter construction, session operations, and atomic rate-limit
storage. Better Auth owns credentials and technical sessions only. Employee links, roles, manager
scope, and domain authorization remain `WL-303` work.

The API project alone enables `skipLibCheck` because Better Auth's published multi-runtime
declarations reference optional browser, Bun, and Cloudflare types that are not installed in this
Node-only project. WorkLedger source remains strict and is checked normally.

## Accepted profile implemented

- Email/password self-sign-up and automatic post-reset sign-in are disabled. The wrapper forces
  `rememberMe: false`, and the cookie remains browser-session scoped.
- Passwords accept spaces and Unicode, require 15–128 characters, reject a local known-common set,
  and use Better Auth's default scrypt verifier. Responses never return password or token fields.
- Sessions are stored only in PostgreSQL. Cookie caching, stateless sessions, and secondary storage
  are absent. A create hook gives a 30-minute idle deadline; passive reads do not extend it, and an
  explicit active read extends it by 30 minutes without crossing the 12-hour absolute limit.
- Freshness is derived from the authoritative creation instant and expires after 15 minutes.
  Deactivated accounts fail session reads, and revocation deletes authoritative session rows.
- The session cookie is explicitly named `__Host-workledger.session` with `Secure`, `HttpOnly`,
  `SameSite=Lax`, `Path=/`, and no `Domain`, persistence expiry, or maximum age. Better Auth's
  automatic secure prefixing is deliberately disabled because the complete `__Host-` name and all
  required attributes are supplied explicitly and asserted over the Fastify boundary.
- Better Auth origin and CSRF checks remain enabled for its routes and trust only the configured
  canonical origin. The API bridge constructs requests from that origin rather than `Host`, removes
  inbound forwarding headers, and forwards only Fastify's proxy-validated client address.
- WorkLedger exposes a constant-time HMAC session-bound CSRF primitive for later unsafe domain
  routes. Those routes and their token bootstrap surface remain owned by `WL-304`/`WL-400`.
- Protected responses use `Cache-Control: private, no-store`; recursive response sanitation removes
  session, reset, password, access, refresh, and ID token fields.

## Reset, revocation, and throttling

Reset requests receive generic results for known and unknown addresses. Better Auth creates a
cryptographically random 30-minute single-use grant; the Drizzle verification-identifier codec
stores only its SHA-256 representation, including for lookup parameters. The outbound sender gets a
canonical `/reset-password?token=...` URL regardless of caller input. Common-password rejection
happens before grant consumption; successful reset replaces the scrypt verifier, consumes the
grant, revokes all sessions, and does not create a new session. Replay and expiry fail safely.

Production/test throttling uses route-specific rules. A WorkLedger-owned PostgreSQL consumer locks
each bucket and performs check/increment in one transaction, closing concurrent stale-read bypasses.
This custom storage is necessary because the pinned Better Auth Drizzle adapter's generic atomic
increment path rejected a second request in PostgreSQL during integration testing. The public
security behavior remains Better Auth's supported custom-storage contract and the table remains
internal to `packages/database`.

Invitation delivery and 24-hour activation grants remain part of the employee lifecycle in
`WL-900`; this task only prevents public self-registration.

## Persistence

Migration `0002_auth_foundation.sql` adds authentication users, accounts, sessions, verification
grants, and rate-limit buckets. UUIDv7 identifiers, unique
credential/provider keys, user-session expiry indexes, cascaded technical cleanup, and database
checks for positive idle/absolute session lifetimes support the application contract. Raw punch,
ledger, absence, monthly, and audit ownership is unchanged.

## Verification evidence

Unit tests pin every security-sensitive option, cookie setting, password boundary, Better Auth
hash/verify behavior, and session-bound CSRF behavior. PostgreSQL integration tests apply all three
migrations and exercise canonical-origin rejection, invite-only sign-up denial, generic credential
and recovery failures, secret-free responses, cookie attributes, passive/active/absolute/fresh
session behavior, protected reset storage, replay/expiry, reset revocation, and five-attempt
route throttling. `WL-309` adds direct deactivation evidence: the account becomes inactive, its
sessions are deleted atomically, and its prior cookie resolves to no session. The shared PostgreSQL
fixture was moved to `@workledger/test-utils` so database and API integration tests use one
isolated-schema lifecycle without crossing source boundaries.

A local three-sample benchmark on the pinned Node `24.18.0` runtime measured Better Auth's default
scrypt hash at 38 ms, 36 ms, and 37 ms on the development host. This is implementation evidence,
not a deployment-wide latency guarantee; production capacity and abuse controls still require
environment-specific load verification.

## Remaining work

`WL-303` completed employee-account links, WorkLedger roles, current-manager scope, permission
policy, and invalidation on privilege changes. `WL-304` adds the shared API error/validation/CSRF envelope;
`WL-305` adds audience-separated security audit; `WL-400` adds accessible sign-in, recovery, reset,
reauthentication, and session-management UI; `WL-900` adds invitation and account lifecycle flows.
