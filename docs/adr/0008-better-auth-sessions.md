# ADR 0008 — Better Auth for Credentials and Sessions

**Status:** Accepted with implementation spike in Phase 3

## Context

Custom password, reset-token, session-cookie, and revocation code is high-risk and not WorkLedger’s differentiating domain.

## Decision

Use Better Auth for credential authentication and secure sessions. Keep WorkLedger employee identity, manager relationships, and application permissions in WorkLedger-owned tables and policies.

## Consequences

- Reduced custom authentication surface.
- Schema and migration integration must be reviewed with Drizzle/PostgreSQL.
- Library defaults must be audited rather than trusted blindly.
- System administrator/auth account role remains separate from HR permission.
