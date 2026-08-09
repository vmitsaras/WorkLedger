# WL-105 Runtime Configuration and Proxy Trust

**Review date:** 2026-08-09

**Task:** `WL-105`

**Outcome:** Complete locally. WorkLedger now validates the API runtime configuration before it is used, fixes all externally visible links to one configured canonical origin, and passes only exact configured proxy addresses to Fastify. This task does not add authentication, CSRF tokens, database connections/pools, product schema, migrations, production Compose, or container deployment behavior.

## 1. Configuration contract

The parser lives in `apps/api/src/config.ts`. It consumes an already-resolved process environment and returns an immutable server-only configuration object. It never reads from browser build variables, `localStorage`, request Host headers, or forwarded headers. `config:check` uses Node's native `--env-file-if-exists=.env` option for an optional local ignored file; no dotenv package is installed.

| Variable | Development/test behavior | Production requirement |
|---|---|---|
| `WORKLEDGER_ENVIRONMENT` | Optional; defaults to `development` | Exactly `production` when deployed |
| `WORKLEDGER_ORIGIN` | Optional; defaults to `http://127.0.0.1:5173` | Required HTTPS origin with no path, query, fragment, or credentials |
| `WORKLEDGER_TRUSTED_PROXY_ADDRESSES` | Optional; no proxy headers are trusted when absent | Required comma-separated exact IPv4/IPv6 addresses; CIDRs, wildcard networks, hop counts, and duplicates fail |
| `WORKLEDGER_DATABASE_URL` | Optional PostgreSQL URL | Required PostgreSQL URL with username and password; known local/example values fail |
| `WORKLEDGER_AUTH_SECRET` | Optional until authentication is added | Required, at least 32 bytes, and neither a placeholder nor one repeated character |

`WORKLEDGER_DATABASE_URL` and `WORKLEDGER_AUTH_SECRET` are server-only secrets. They never appear in the summary printed by `config:check`, API health data, test failure assertions, browser code, or this documentation. The production validator reports only variable names and general failure reasons.

`resolveCanonicalUrl` builds future reset/invitation and application links only from `WORKLEDGER_ORIGIN`; it rejects absolute and protocol-relative attacker-controlled targets. Later authentication work must use this helper or an equivalent reviewed same-origin boundary rather than infer a public URL from `Host` or `X-Forwarded-Host`.

## 2. Proxy boundary

`apps/api/src/server.ts` passes the validated exact address list to Fastify's `trustProxy` option. With no configured proxy, forwarding headers are ignored. A request received directly from an address not on the list cannot make Fastify treat a supplied `X-Forwarded-Proto` as trusted transport metadata.

The application still treats request-derived IP, host, and protocol values as untrusted input for authorization, callbacks, cookies, audit identity, and rate limits. A later production proxy must overwrite client-supplied forwarding headers and keep the API/database private, as required by `docs/06-security-operations.md`. This task deliberately does not ship that proxy or any public listener.

No CORS plugin or wildcard/origin reflection is configured. The single public `/health` route returns only `{ "status": "ok" }` with `Cache-Control: no-store` and no CORS response header.

## 3. Safe local configuration

The tracked `.env.example` is intentionally limited to local development defaults and the non-production PostgreSQL role created by `WL-104`. It has a blank authentication-secret field. Copy it to the ignored root `.env` to use those values with `config:check`; it is never a deployment template.

Production secrets must be injected by the deployment environment after secure generation and must not be committed, baked into an image, or logged. This code validates resolved values only; secret-file mount locations, rotation orchestration, image construction, Docker networking, and deployment startup are later tasks.

## 4. Commands and evidence

| Command | Responsibility |
|---|---|
| `pnpm run config:check` | Builds the workspace, validates the active API configuration, and prints a redacted summary |
| `pnpm run verify` | Runs `config:check` before the existing formatting, lint, type, unit/component, integration, E2E, and build gates |

Focused tests cover development defaults, missing production configuration, malformed/non-HTTPS origins, placeholder secrets, local database values in production, CIDR rejection, secret-free summary output, canonical URL construction, generic health data, CORS absence, and trusted/untrusted forwarded protocol behavior.

## 5. References

- Fastify documents `trustProxy` as the boundary that enables forwarded request metadata; passing an exact address list is supported by its factory options. <https://fastify.dev/docs/v5.10.x/Reference/Server/#trustproxy>
- Node's WHATWG `URL` implementation provides structured origin parsing and resolution. <https://nodejs.org/api/url.html>
- Node's `net.isIP` accepts only valid IPv4/IPv6 literal addresses, which supports rejection of CIDR and malformed proxy values. <https://nodejs.org/api/net.html#netisipinput>
- Node's `--env-file-if-exists` option loads an optional local environment file without a dotenv dependency. <https://nodejs.org/api/cli.html#--env-file-if-existsconfig>
- OWASP's secrets guidance covers non-hardcoded secret provisioning, rotation, and keeping plaintext secret values out of logs. <https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html>

## 6. Handoff

The next task is `WL-106`: initialize the React Aria shadcn base and design tokens. It must not expose runtime secrets or create a browser-side configuration path for them.
