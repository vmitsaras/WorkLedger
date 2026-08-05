# ADR 0008 — Better Auth for Credentials and Sessions

**Status:** Accepted with mandatory security-profile spike in Phase 3

## Context

Custom password, reset-token, session-cookie, and revocation code is high-risk and not WorkLedger’s differentiating domain.

## Decision

Use Better Auth for invite-only credential authentication, password recovery, and secure sessions. Keep WorkLedger employee identity, manager relationships, application permissions, prohibited self-actions, and domain authorization in WorkLedger-owned tables and policies.

The accepted security profile is canonical in `docs/06-security-operations.md` sections 6–8:

- PostgreSQL-backed revocable sessions only; stateless sessions, secondary session storage, and Better Auth cookie/session caching are disabled in the MVP.
- No persistent “remember me”; 30-minute idle, 12-hour absolute, and 15-minute freshness boundaries.
- `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`, root-path, host-only session cookie.
- Better Auth CSRF/origin/redirect checks remain enabled; WorkLedger domain mutations additionally require configured-origin validation and a session-bound CSRF token.
- 15–128 character password boundary, local common-password rejection, 30-minute reset grants, 24-hour invitation grants, generic recovery responses, production rate limiting, and full session revocation after password reset/account deactivation/privileged-role changes.
- Reset/invitation URLs are same-origin, no-store/no-referrer, redacted from logs, removed from visible history immediately after capture, and never persisted as ordinary browser state.

`WL-302` must pin and inspect the selected stable Better Auth version, assert every setting/default, and implement a narrow WorkLedger wrapper where the library does not supply a required control. A material mismatch requires an ADR; it is not permission to weaken the profile.

## Consequences

- Reduced custom authentication surface.
- Schema, timeout, freshness, revocation, CSRF, proxy, and migration integration must be reviewed with Drizzle/PostgreSQL and the deployment topology.
- Library defaults are audited rather than trusted blindly; current documented defaults for password length, session lifetime/refresh, remember-me, reset revocation, and reset expiry are deliberately overridden where this profile is stricter.
- Database validation on each session request is an accepted availability/performance cost for immediate revocation at the MVP scale.
- System administrator/auth account role remains separate from HR permission.
