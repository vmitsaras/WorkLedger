# ADR 0009 — Single Organization per Installation

**Status:** Accepted for MVP

## Context

Multi-tenant SaaS adds tenant provisioning, billing, cross-tenant isolation, branding, quotas, and operational complexity unrelated to the first product goal.

## Decision

Each self-hosted installation operates one organization. Core records still carry organization identity where useful for integrity and future migration.

## Consequences

- Simpler setup and permission model.
- No SaaS billing or tenant UI.
- Future multi-organization support requires a new ADR and migration plan.
