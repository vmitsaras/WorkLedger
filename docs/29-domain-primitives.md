# Domain Primitives and Result Types

**Task:** `WL-200`

**Outcome:** Complete. `packages/domain` now exposes construction-only branded primitives for
opaque identifiers, integer minutes, instants, local dates, named timezone identifiers, and
half-open local-date ranges, together with stable discriminated result/error types.

## Scope

This task establishes the value boundary used by later domain-engine work. It does not implement
schedule or policy resolution, attendance transitions, interval reconstruction, calculations,
persistence, API contracts, authorization, or UI behavior.

The public API is available only through the `@workledger/domain` package root. Internal
`src/shared` modules are implementation details and are not package export subpaths.

## Construction contract

| Value | Accepted construction | Stable failure code |
|---|---|---|
| `DomainId<Entity>` | A 1–128 character opaque ASCII token matching `[A-Za-z0-9][A-Za-z0-9._~-]{0,127}` | `INVALID_DOMAIN_ID` |
| `SignedMinutes` | A JavaScript safe integer, including negative values | `INVALID_SIGNED_MINUTES` |
| `NonNegativeMinutes` | A JavaScript safe integer greater than or equal to zero | `INVALID_NON_NEGATIVE_MINUTES` |
| `Instant` | A Temporal-compatible ISO instant string containing an offset or `Z` | `INVALID_INSTANT` |
| `LocalDate` | An exact, possible ISO calendar date in `YYYY-MM-DD` form | `INVALID_LOCAL_DATE` |
| `TimeZoneId` | A named timezone identifier recognized by the pinned Temporal/runtime timezone data; fixed numeric offsets are rejected | `INVALID_TIME_ZONE_ID` |
| `LocalDateRange` | `validFrom` plus a later exclusive `validTo`, or `null` for no end | `INVALID_LOCAL_DATE_RANGE` |

Constructors accept `unknown` at trust boundaries and return `Result`; invalid values are not
rounded, trimmed, coerced, or thrown back as parser exceptions. Primitive error payloads contain
only their stable code and never echo rejected input.

The identifier token boundary does not resolve `D-201`: it selects neither UUID, ULID, database
column type, nor generator. Any later physical identifier choice must serialize to the accepted
opaque token and remain stable, organization-scoped, and never reused.

`SignedMinutes` and `NonNegativeMinutes` use JavaScript safe integers because no database integer
width has been selected yet. Negative zero is normalized to zero. Business-specific bounds and
minute alignment belong to the domain rule that owns them; the generic instant primitive therefore
preserves sub-minute precision and does not pretend every instant is a punch occurrence.

## Temporal behavior

Node `24.18.0` does not provide a global `Temporal` implementation. The domain package therefore
pins `@js-temporal/polyfill` `0.5.1`, the stable Temporal polyfill anticipated by ADR `0006`.

- Accepted instants are canonicalized with `Temporal.Instant.toString()` to UTC `Z` form while
  preserving available fractional-second precision.
- Local dates remain date-only ISO values and are never converted to midnight timestamps.
- Timezone construction uses named timezone data, normalizes identifier casing when the runtime
  supplies a canonical spelling, and rejects fixed-offset timezone strings.
- Later DST, local-time disambiguation, local-midnight splitting, and elapsed-time calculation remain
  owned by `WL-204`–`WL-206`.

The polyfill is an external runtime dependency of `packages/domain`; it adds no WorkLedger package
edge and does not introduce environment, filesystem, network, database, framework, or UI access.

## Serialization boundary

Brands exist only in TypeScript and add no wrapper fields at runtime. JSON serialization therefore
uses these canonical representations:

| Value | JSON representation |
|---|---|
| `DomainId<Entity>` | String |
| `SignedMinutes` / `NonNegativeMinutes` | Integer number |
| `Instant` | Canonical UTC ISO string ending in `Z` |
| `LocalDate` | `YYYY-MM-DD` string |
| `TimeZoneId` | Named timezone string |
| `LocalDateRange` | `{ "validFrom": "YYYY-MM-DD", "validTo": "YYYY-MM-DD" \| null }` |
| Success | `{ "ok": true, "value": ... }` |
| Failure | `{ "ok": false, "error": { "code": "..." } }` |

`validTo` is always present in a serialized range. `null` explicitly means open-ended; a finite
range contains `validFrom` and excludes `validTo`.

These are domain value representations, not API DTO schemas. `packages/contracts` and the API must
still validate and explicitly map their independent wire contracts in `WL-304`.

## Evidence

- Strict domain-package build covers all public declarations.
- Focused unit tests cover accepted and rejected ID shapes, signed/non-negative safe integer
  boundaries, negative-zero normalization, instant canonicalization, impossible local dates, named
  timezone validation, numeric-offset rejection, half-open/open-ended range boundaries,
  immutability, non-leaking errors, and JSON shapes.
- Repository boundary checks prove that Temporal is declared by its direct importer and that no new
  WorkLedger package edge was added.
- `pnpm with 11.20.0 run verify` passes configuration, formatting, linting, the 43-file/87-import
  boundary scan, strict typechecking, 24 native tests, 21 unit/component tests, 4 non-database
  integration tests with the expected PostgreSQL opt-in skip, 2 Chromium tests, and all builds.
