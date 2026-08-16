# 103. Production deployment baseline

## Status

`WL-1003` remains in progress until the clean-host HTTPS and adversarial deployment checks are
executed. The reference Compose model now fails closed on missing public origin and secret paths,
applies migrations before API startup, and uses database-backed readiness.

## Operator configuration

Copy `.env.production.example` to a host-only environment file and create three root-readable secret
files outside the repository:

- `auth_secret`: a unique high-entropy Better Auth secret;
- `postgres_password`: a unique PostgreSQL password;
- `database_url`: the matching PostgreSQL URL using host `postgres`.

Never commit those files. Validate the model with:

```sh
docker compose --env-file /path/to/workledger.env -f infra/compose/production.yml config --quiet
```

Then build and start the deployment with the same arguments and `up --build --wait`. Only Caddy ports
are published. PostgreSQL is confined to an internal data network; the API spans the data and edge
networks, and trusts only Caddy's fixed edge address.

## Startup and health behavior

The one-shot `migrate` service waits for PostgreSQL, applies generated migrations, and must exit zero
before the API starts. `/health` is process liveness. The API container health check uses `/ready`,
which returns 200 only when PostgreSQL is reachable and the expected schema is present; dependency
details are never returned.

The API runs as the unprivileged Node user with a read-only filesystem, dropped capabilities, a
bounded temporary filesystem, and `no-new-privileges`. Caddy adds CSP, HSTS, referrer, permissions,
framing, and MIME-sniffing defenses, normalizes forwarded headers, redirects HTTP to HTTPS, and
disables access logs because reset and invitation grants currently use query parameters; allowlisted
redacted logging belongs to `WL-1006`.

## Required completion evidence

- clean-volume build, migration, readiness, and HTTPS SPA/API access;
- direct API/PostgreSQL host-port access fails;
- forged forwarding headers do not change origin, client identity, or authorization;
- secrets are absent from `docker compose config`, image history, environment inspection, and logs;
- missing/incorrect schema and unavailable PostgreSQL make readiness fail generically;
- restart preserves data and reapplies migrations idempotently;
- CSP/security-header and token-query logging checks pass.
