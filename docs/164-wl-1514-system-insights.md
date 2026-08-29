# WL-1514 Deterministic Isolated System Insights

**Task:** `WL-1514`  
**Status:** Complete  
**Contract:** ADR 0014 and `docs/160-wl-1508g-phase-15-deterministic-continuation.md`  
**Date:** 2026-08-28

## Outcome

WorkLedger now provides one provider-independent System Insight at `/system/insights`. The browser
can submit only `{ kind: "SYSTEM_TECHNICAL_OVERVIEW", workspace: "SYSTEM" }` to
`POST /v1/insights/system/run`. The strict request rejects dates, filters, free text, identifiers,
employee scope, HR scope, and unknown fields.

Every run reloads the active account, organization, current roles, organization timezone, and
`TECHNICAL_OPERATIONS_MANAGE` authority inside a repeatable-read transaction. The endpoint is
authenticated, same-origin and CSRF protected, `POST` only, private, and `no-store`. It is
registered with System operations rather than the optional provider-backed Insight routes and has
no provider dependency or call path.

## Exact technical allowlist

The native result must contain each of these facts exactly once:

| Fact | Authoritative source | Value boundary |
|---|---|---|
| Application version | Application manifest | Valid WorkLedger semantic version |
| Service health | Database readiness | `HEALTHY` or `CRITICAL` |
| Database health | Database readiness | `HEALTHY` or `UNAVAILABLE` |
| Expected schema status | Database readiness | `READY` or `NOT_READY` |
| Backup management | Host-operator procedures | `HOST_OPERATOR_MANAGED` |
| Mail delivery configuration | Mail-adapter configuration | `CONFIGURED` or `NOT_CONFIGURED` |
| Session idle timeout | Authentication security profile | Integer minutes |
| Session absolute timeout | Authentication security profile | Integer minutes |
| Session freshness window | Authentication security profile | Integer minutes |
| Persistent remember-me | Authentication security profile | Boolean; currently disabled |

The source list is also closed and exact: application manifest, database readiness,
host-operator procedures, mail-adapter configuration, and authentication security profile. The
only native action opens `/system/operations` and references all five sources.

WorkLedger does not own an authoritative in-application source for backup execution, recency,
integrity, restore-test recency, storage, retention, or operator alert state. The result therefore
states only that backups are host-operator managed and always presents the material
`BACKUP_RUNTIME_STATUS_HOST_OWNED` limitation. It never fabricates a healthy or recent backup.

## Isolation and minimization

The System result schema has no extension point for account, organization, employee, attendance,
time, balance, absence, sickness, request, report, notification-content, audit-payload, provider,
model, prompt, or tool data. Strict validation requires the exact fact, source, limitation, and
action sets before a result can leave the service.

The existing public `/health` and `/ready` DTOs are unchanged and remain minimal. Detailed facts
stay behind the current System role. An active non-System role is denied, and revoking the current
System role invalidates the next run even when the browser still holds its prior session and
result.

## Browser and accessibility behavior

The System navigation area now exposes `/system/insights`. Nothing runs on route load. A real
button submits the fixed request, stays disabled while pending, and produces one polite running or
completion status. English, German, and Spanish catalogs own every visible and accessibility
string.

The result uses a visible heading, localized capture time, four semantic definition-list groups,
textual status badges, a persistent material backup warning, a real source list, and a normal
router link to System operations. Status is never conveyed by color alone. Session expiry clears
in-memory query state and returns to sign-in; permission and service failures remain explicit text
alerts. Request and result state stays in mutation memory and is not written to URL state, local
storage, session storage, exports, clipboard, or persistence.

## Verification

The implementation is covered by:

- strict contract acceptance, unknown-field rejection, exact-set validation, and forbidden-field
  regression tests;
- PostgreSQL route evidence for authentication, origin, CSRF, current System authorization,
  current-role revocation, private no-store caching, technical-field isolation, and zero provider
  calls;
- multilingual component checks for explicit submission, exact request shape, ten facts, five
  sources, material backup warning, clean browser storage, and automated axe verification; and
- application-shell, route-label, OpenAPI, i18n-governance, type, lint, build, integration, and
  browser gates.

The production build emits the lazy System route as a 6.59 kB raw, 2.13 kB gzip chunk. A bounded
10,000-byte raw and 3,000-byte gzip System Insights allowance covers the route and its shared
integration while preserving the existing application baseline, largest-chunk, CSS, locale, and
earlier runtime allowances.

The following gates passed on 2026-08-28:

```text
pnpm openapi:check
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm db:test
pnpm build
WORKLEDGER_E2E_PORT=4187 pnpm test:e2e
git diff --check
```

The unit and component gate passed 58 files and 488 tests. The broad integration gate passed 13
environment-independent cases; the canonical PostgreSQL harness passed 16 files with 29 tests and
one historical skip, including the new System authorization and isolation route. The full browser
gate passed 51 cases with one governed historical visual capture skipped, including the focused
System keyboard, reflow, forced-colors, reduced-motion, storage, and axe scenario. Port 4187 was the
configured collision-free local test port for this run.

The production build measures 1,076,442 raw and 279,114 gzip bytes of non-locale JavaScript. The
combined named runtime allowances consume 134,442 of 135,000 raw bytes and 24,114 of 35,000 gzip
bytes; the largest JavaScript chunk, CSS, and all three locale chunks remain within their unchanged
limits.

No dependency, migration, persistence model, manifest, or workspace version changed during
`WL-1514`. The later `WL-1516` exit gate completed the final release checklist and advanced all
workspace manifests to `0.16.0`; see `docs/165-wl-1516-phase-15-gate-review.md`.

## Residual limits

System Insight health and schema facts are a current readiness snapshot, not monitoring history.
Mail configuration states whether the delivery adapter is configured, not whether a particular
message was delivered. Backup and restore truth remains exclusively in the documented
host-operator workflow until a future accepted design adds an authoritative, privacy-reviewed
runtime source.

This is bounded implementation evidence, not a whole-product WCAG conformance statement. Retail
assistive-technology coverage remains governed by `D-502`. No publish, push, tag, deployment,
provider request, or remote write was performed.
