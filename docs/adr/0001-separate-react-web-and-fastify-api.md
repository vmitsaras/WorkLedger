# ADR 0001 — Separate React Web Application and Fastify API

**Status:** Accepted for initial architecture

## Context

WorkLedger is an authenticated, dashboard-heavy application with persistent navigation, tables, forms, approvals, and server-owned state. The public portfolio/documentation site has different rendering needs.

## Decision

Use:

- React + Vite for `apps/web`.
- Fastify for `apps/api`.
- Astro only for the later public `apps/site`.

## Consequences

- Clear frontend/backend boundaries.
- API can be tested independently and serve future clients.
- Production still uses one canonical HTTPS origin; the service boundary does not authorize broad CORS or cross-origin cookies.
- Deployment uses separate private web/API services behind the accepted reverse-proxy contract.

## Rejected alternatives

- Astro as the authenticated application shell: most screens would hydrate React and gain little from island rendering.
- Full-stack React framework: not selected because the project intentionally demonstrates a separate API and self-hosted service architecture.
