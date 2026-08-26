# Shared internationalization foundation

**Task:** `WL-1401`  
**Status:** Complete  
**Date:** 2026-08-26  
**Workspace version:** `0.14.0`

## Scope completed

`WL-1401` establishes the local, typed presentation foundation accepted in ADR 0013 without
starting account persistence, API descriptor migration, or workflow translation.

- `@workledger/contracts` owns the exact `en-GB`, `de-DE`, and `es-ES` transport allowlist, the
  `en-GB` default, the Zod schema, and the type guard.
- The new private `@workledger/i18n` package owns direction, strict locale validation, signed-out
  resolution, typed message keys, the seven production namespaces, local catalog loading,
  formatters, the i18next runtime, and the React adapter.
- `i18next` `26.4.0` and `react-i18next` `17.0.12` are exact stable pins. The package depends only
  on contracts at the WorkLedger runtime boundary; domain, database, contracts, and UI do not
  import it.
- Catalogs are repository JSON imported through literal locale-specific dynamic imports. There is
  no runtime download, translation service, telemetry, user override, or HTML message path.
- Dates, instants, numbers, lists, and integer-minute durations require explicit locale input;
  instant formatting also requires an authoritative IANA timezone. Date-only formatting does not
  introduce JavaScript `Date` arithmetic into domain calculations.

## Incremental web activation

The existing application copy is still English and belongs to `WL-1404` through `WL-1407`.
Activating German or Spanish before those migrations would create a misleading mixed-language
product. The web composition root therefore loads only the `en-GB` locale catalog and mounts the
lightweight locale provider before creating the router. That provider synchronizes React Aria,
`<html lang>`, and `<html dir>`.

The complete i18next plus react-i18next provider is already implemented and component-tested in
the same package. It remains out of the production graph until translated product messages begin
to consume it. This keeps the accepted non-catalog application budgets intact instead of hiding
translation-engine code inside catalog chunks. `WL-1402` owns account/device locale selection and
`WL-1404` owns activation for shared translated workflows.

If the initial local catalog cannot load, the browser renders a focused, keyboard-usable English
failure surface with an alert and a real reload button. This last-resort message cannot depend on
the resource whose load failed.

## Catalog and source checks

`pnpm i18n:check` enforces the foundation contract:

- the exact production locale allowlist and `en-GB` fallback,
- all seven namespaces for every locale,
- semantic typed-key parity,
- interpolation-parameter parity,
- locale-correct plural categories,
- text-only messages,
- descriptor-map references when descriptors are introduced, and
- no hard-coded JSX or accessible-name copy in the current i18n React adapter.

The descriptor map is intentionally empty until `WL-1403`. The hard-coded source scan is
intentionally limited to the new adapter in this slice; each workflow migration expands governed
source ownership rather than treating the known English inventory as newly compliant.

## Bundle contract

The build emits one catalog chunk for each production locale. The budget checker excludes only
those filename-verified catalog chunks from the existing application totals, then enforces:

| Scope | Raw budget | Gzip budget |
|---|---:|---:|
| Each locale | 150 KiB | 50 KiB |
| All locale chunks | 450 KiB | 150 KiB |
| Existing non-catalog JavaScript | 910,000 bytes | 246,000 bytes |

Vite's default minifier left the non-catalog graph 2,229 bytes over the unchanged raw ceiling even
after the translation engine was kept out of the untranslated production graph. The build
therefore pins Vite's supported optional `terser` `5.50.0` minifier with deterministic production
settings. Native/default minification was measured first and was insufficient; no budget was
raised and no runtime or catalog bytes were misclassified.

The verified production build is 909,306 non-catalog JavaScript bytes raw and 245,662 bytes gzip.
The three locale chunks total 1,485 bytes raw and 993 bytes gzip; the largest individual locale is
537 bytes raw and 342 bytes gzip.

## Accessibility and security review

- React Aria and document language/direction consume the same runtime locale. All current
  production locales are explicitly `ltr`; direction remains typed and synchronized for future
  decisions.
- Locale initialization completes before router content mounts, preventing a later locale flip in
  this English-only activation stage.
- Translation interpolation remains plain text. React binding tests prove user-authored markup is
  rendered as text rather than executable DOM.
- Unsupported stored/account values throw an integrity error. Unsupported device values are
  discarded before browser-language matching and the documented `en-GB` fallback.
- No account field, cookie, local-storage value, API payload, database migration, authorization
  path, audit record, or user-authored content changed in this task.

## Verification

The canonical quality sequence passes in this environment:

- runtime configuration and reproducible OpenAPI checks,
- formatting, ESLint, 310-source/1,618-import boundaries, and CSS ownership,
- strict TypeScript and workspace/public-entry builds,
- 46 tooling tests,
- 388 unit/component tests across 49 files,
- 13 available integration tests; 45 PostgreSQL-dependent cases skipped because the local database
  service is unavailable,
- 38 Playwright browser scenarios; one intentional opt-in historical-capture scenario skipped, and
- the production build plus existing application and new locale budget gates.

The browser command required the existing Vite test server to run outside the filesystem/network
sandbox so it could bind `127.0.0.1:4173`; the permitted rerun passed.

## Remaining ownership

- `WL-1402`: account and invitation locale persistence, signed-out device preference, selection,
  immediate switching, focus, and failure recovery.
- `WL-1403`: bounded API message descriptors and presentation parameters.
- `WL-1404`–`WL-1407`: shared, workflow, and output message migration.
- `WL-1408`: complete catalogs, pseudo-locale enforcement, and named fluent-human German and
  Spanish review.
