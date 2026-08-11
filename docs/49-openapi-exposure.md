# Stable OpenAPI Exposure

`WL-308` exposes the selected WorkLedger transport contracts as OpenAPI 3.1 without introducing a
second handwritten request or response source.

## Runtime route

`GET /openapi.json` returns the same document produced in process by `@fastify/swagger`. The route
is intentionally hidden from its own document and serves JSON only; WorkLedger does not add a
Swagger UI or another interactive documentation dependency.

The response uses `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. It inherits the
server-owned request identifier and does not enable cross-origin access. The document contains no
environment-specific server URL, credential, database value, or runtime secret. The Better Auth
adapter route remains hidden because it is provider-owned rather than a WorkLedger Zod contract.

Only routes with selected, purpose-specific WorkLedger schemas belong in this document. Adding a
route to OpenAPI does not weaken its authentication or authorization requirements, and the
document is never an authorization source.

## Reproducible artifact

The tracked artifact is [`openapi/workledger.openapi.json`](../openapi/workledger.openapi.json).
It is generated from the built API server under deterministic test configuration, then recursively
sorts object keys while preserving array order. It is not independently edited.

```sh
pnpm with 11.20.0 run openapi:generate
pnpm with 11.20.0 run openapi:check
```

`openapi:check` rebuilds the typed workspace, regenerates the document in memory, and rejects any
byte-level drift. It is part of `pnpm run verify`, so a route/schema change must update the tracked
artifact in the same change.

## Typed-client evaluation

A generated client is deliberately deferred at this boundary:

- `openapi-typescript` `7.13.0` is the mature narrow type generator evaluated on 2026-08-11, but
  its published package metadata declares a TypeScript `^5.x` peer while WorkLedger pins
  TypeScript `7.0.2`.
- `@hey-api/openapi-ts` `0.99.0` supports broader SDK generation but is still pre-1.0 and would add
  a substantially larger generator/plugin surface for the current single documented health
  operation.
- The openapi-typescript maintainers announced maintenance mode for their runtime fetch client in
  their 2026 roadmap, so that runtime is not adopted as a new web dependency.

Installing an unsupported peer combination or a pre-1.0 SDK generator would violate the stable
dependency policy. Later API vertical slices must continue to infer transport types directly from
the Zod contracts. A generated client may be reconsidered when a stable generator supports the
pinned compiler and enough purpose-specific operations exist to justify the runtime/tooling
surface. This decision creates no parallel handwritten DTOs.

Official evaluation sources:

- https://openapi-ts.dev/cli
- https://github.com/openapi-ts/openapi-typescript/blob/main/packages/openapi-typescript/package.json
- https://github.com/openapi-ts/openapi-typescript/discussions/2559
- https://github.com/hey-api/hey-api/blob/main/packages/openapi-ts/package.json

## Evidence

API integration tests prove that the public response exactly matches the in-process document, the
utility route is excluded from its own paths, expected hardening headers are present, CORS remains
disabled, and configured authentication internals/database/authentication secrets are absent.
Workspace contract tests require the generator, tracked artifact, and both root commands.

No UI changed. This task adds developer-facing machine-readable documentation only and does not
claim an accessible interactive documentation experience.
