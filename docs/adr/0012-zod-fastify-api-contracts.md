# ADR 0012 — Zod and Fastify API Contracts

**Status:** Accepted

## Context

WorkLedger needs one source for runtime request validation, response serialization, inferred
TypeScript types, and reproducible OpenAPI generation. D-200 required a bounded comparison between
a Zod Fastify provider and JSON Schema/TypeBox before the first shared transport contract. D-204
also required one status for syntactically valid requests that fail schema validation.

The accepted frontend architecture already uses Zod with React Hook Form for complex forms. Fastify
5 supports type providers, `fastify-type-provider-zod` provides request and response compilers plus
an OpenAPI transform, and `@fastify/swagger` 9 supports Fastify 5 dynamic OpenAPI generation.
TypeBox would provide a strong JSON Schema-first path, but would introduce a second form-schema
language or require duplicated web adapters for this project.

## Decision

- `packages/contracts` owns strict Zod request, response, envelope, error-code, and DTO schemas.
- TypeScript transport types are inferred from those schemas; matching manual interfaces are not
  maintained.
- `apps/api` installs the Zod validator and serializer compilers and registers OpenAPI 3.1
  generation before application routes.
- `WL-304` leaves the generated document testable in process but unexposed; `WL-308` owns the
  follow-up exposure and typed-client evaluation.
- Syntactically valid JSON that fails request-schema validation returns `422 VALIDATION_FAILED`.
  Malformed JSON returns `400 MALFORMED_REQUEST`.
- Unknown object fields are rejected. Validation output uses bounded safe field codes and canonical
  messages; it never forwards provider messages, submitted values, or unknown field names.
- Every API response exposes a server-generated UUID request identifier in `X-Request-Id`. Normal
  success envelopes repeat it in `meta.requestId`; error envelopes repeat it in
  `error.requestId`. Client-supplied request identifiers are ignored.
- Response-serialization failures and unknown thrown values become a generic non-leaking
  `500 INTERNAL_ERROR`.

Pinned stable dependencies at acceptance are Zod `4.4.3`, `fastify-type-provider-zod` `7.0.0`, and
`@fastify/swagger` `9.8.1`.

## Consequences

- API routes obtain validation, serialization, inference, and OpenAPI from the same schema.
- The web application can reuse the same transport schemas without importing Fastify or server
  code.
- Contract schemas are runtime dependencies and must remain purpose-specific; a broad entity schema
  must not accidentally authorize or serialize additional fields.
- Provider/OpenAPI upgrades require contract and generated-document regression tests.
- Field-error presentation, focus movement, and localized user-facing prose remain web concerns;
  stable field codes and paths provide their transport input.

## Implementation note

`WL-308` exposes selected contracts as hardened JSON and adds a deterministic tracked artifact.
Typed-client generation is deferred because the narrow mature generator's peer range excludes the
pinned TypeScript 7 compiler and the broader candidate is pre-1.0; see
`docs/49-openapi-exposure.md`. This does not change Zod schema ownership or add handwritten DTOs.
