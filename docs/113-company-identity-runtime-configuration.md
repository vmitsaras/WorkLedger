# Company identity runtime configuration

**Task:** `WL-1103`  
**Status:** Implemented  
**Baseline:** WCAG 2.2 AA and Baseline 2024

## 1. Outcome and boundary

WorkLedger now accepts a bounded company identity at API startup and presents it consistently on
public authentication surfaces and in the authenticated application shell. Operators can change
the organization display name, optional logo, optional favicon, and a decorative accent through
deployment configuration and a read-only asset mount; editing TypeScript, HTML, or CSS source is
not required.

This is not a theme or white-label system. WorkLedger product attribution remains visible. The
configured accent does not replace action, link, focus, success, warning, danger, or information
colors. The PostgreSQL organization record remains authoritative for organization scope and domain
relationships; runtime identity is the installation's presentation name and media layer.

## 2. Runtime values

| Variable | Development/test | Production | Validation |
|---|---|---|---|
| `WORKLEDGER_ORGANIZATION_NAME` | Optional; falls back to `WorkLedger` | Required | Trimmed, 1–80 visible characters; control and bidirectional-formatting characters fail startup |
| `WORKLEDGER_ORGANIZATION_LOGO_PATH` | Optional | Optional | Same-origin `/identity/` path; AVIF, PNG, SVG, or WebP only |
| `WORKLEDGER_ORGANIZATION_FAVICON_PATH` | Optional | Optional | Same-origin `/identity/` path; ICO, PNG, or SVG only |
| `WORKLEDGER_ORGANIZATION_ACCENT_COLOR` | Optional; stable WorkLedger fallback | Optional | Six-digit hexadecimal color with at least 3:1 contrast against the raised and page reference surfaces |

Asset paths reject absolute/protocol-relative URLs, query strings, fragments, traversal segments,
unsupported extensions, and non-ASCII path syntax. The parser reports variable names and safe
failure reasons without echoing display names, asset locations, credentials, or secret values.

The normalized public DTO is available from `GET /v1/identity`. It contains only the four identity
values and a request identifier, requires no session, enables no CORS response, and is cacheable for
five minutes. Authenticated self-context/profile responses use the same normalized identity so the
sign-in page, shell, and profile cannot disagree about the displayed installation name.

## 3. Supplying assets without source changes

Keep identity files in a host directory outside the repository and mount it read-only into Caddy:

```text
/etc/workledger/identity/
├── logo.webp
└── favicon.svg
```

Set the environment values to `/identity/logo.webp` and `/identity/favicon.svg`, set
`WORKLEDGER_IDENTITY_ASSETS_DIRECTORY=/etc/workledger/identity`, then include the shipped override:

```sh
docker compose --env-file .env.production \
  -f infra/compose/production.yml \
  -f infra/compose/identity-assets.yml \
  config

docker compose --env-file .env.production \
  -f infra/compose/production.yml \
  -f infra/compose/identity-assets.yml \
  up -d
```

The base production deployment needs no identity mount when both optional asset paths are empty.
Caddy serves `/identity/*` as static files without the SPA fallback, keeps the mount read-only, and
applies the existing same-origin CSP and `nosniff` response policy. Restart the API after changing
runtime values. Replace files atomically when updating mounted assets.

SVG assets remain external images: WorkLedger never injects or executes their markup. Deployment
operators must still use optimized, trusted files. Logo dimensions are reserved in the layout to
avoid content shift; the visible organization name supplies the accessible identity, so the logo is
decorative and has an empty alternative. Missing or undecodable logos become a bordered initial
mark, while a failed favicon probe restores the shipped WorkLedger favicon.

## 4. Accent and accessibility contract

- `--wl-identity-accent` is the only runtime-set CSS property.
- It is used for the non-semantic fallback mark boundary only.
- Product-owned action, link, focus, and state token families do not derive from it.
- Forced-colors mode overrides it with `CanvasText`; the initial remains readable without color.
- Organization and WorkLedger names remain text at every width and in print.
- Long names wrap within the header rather than causing page-level horizontal scrolling.
- Fixed `width` and `height` attributes plus bounded CSS boxes reserve logo space.
- No animation, focus movement, live-region announcement, storage, or client-side mutation is added.

Automated evidence covers missing/broken logo and favicon assets, a long organization name, 320
CSS-pixel reflow (equivalent to 400% zoom at a 1280 CSS-pixel desktop viewport), forced colors,
print presentation, accessible names, intrinsic image dimensions, axe, and schema/API boundaries.

## 5. Current web guidance applied

The repository is a mixed TypeScript monorepo; the relevant feature areas are HTML metadata,
browser images, CSS custom properties, performance, and accessibility. On 2026-08-21,
`modern-web-guidance` searches for accessible organization logos/favicons and broken-image fallback
selected the `html` and `performance` guides. Applied constraints include native `<img>` and
`<link rel="icon">`, visible or programmatically available identity text, empty alternative text for
decorative images, fixed image dimensions to prevent layout shift, same-origin delivery, and a CSS
custom property for validated runtime visual data. The implementation intentionally does not add a
loader library, remote asset host, third-party script, custom ARIA, or lazy loading for above-fold
identity assets.

## 6. Verification map

| Concern | Evidence |
|---|---|
| Environment parsing, contrast, redaction, unsafe name/path rejection | `apps/api/test/runtime-config.unit.test.ts` |
| Public response minimization and cache/CORS boundary | `apps/api/test/health.integration.test.ts` |
| Authenticated identity consistency | `apps/api/test/account-self-service.integration.test.ts` |
| Strict transport paths | `packages/contracts/test/index.unit.test.ts` |
| Text/logo/favicon fallbacks and axe | `apps/web/test/application-shell.component.test.tsx` |
| Long-name reflow, broken assets, forced colors, print | `apps/web/e2e/application-shell.spec.ts` |
| Same-origin static asset boundary | `infra/docker/caddy/Caddyfile` and `infra/compose/identity-assets.yml` |

