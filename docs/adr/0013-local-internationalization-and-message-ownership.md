# ADR 0013: Local Internationalization and Message Ownership

**Status:** Accepted by `WL-1400`; bundle accounting amended by `WL-1402`, `WL-1404`, and `D-508`

## Context

WorkLedger currently renders British English product copy directly in React routes, shared
components, API responses, CSV documents, print views, clipboard summaries, notifications, and
authentication communication. Several API contracts also carry finished English prose for Today
attention, report metadata, notifications, errors, and device summaries. That prose makes the API
the accidental owner of browser presentation and prevents one coherent locale from governing the
whole experience.

The product must add German and Spanish without moving domain meaning into the browser, exposing
private data through translation parameters, relying on a remote translation service, or weakening
the existing timezone, audit, accessibility, and self hosting contracts.

## Decision

### Supported locales and fallback

Production supports exactly `en-GB`, `de-DE`, and `es-ES`. `en-GB` is the source locale and the
only runtime fallback. A missing German or Spanish message falls back to the matching British
English message, while catalog checks fail the build so fallback cannot hide an incomplete shipped
catalog.

All three locales use left to right direction. Direction remains an explicit locale property so
React, React Aria, `<html lang>`, and `<html dir>` share one resolved value.

### Locale resolution and persistence

Authenticated requests use the current account locale as the only authority. The account context
response supplies that locale, and the protected application shell does not mount until the locale
catalog is ready. Browser or device preferences cannot override an authenticated account.

Signed out pages resolve locale in this order:

1. An allowlisted value in the non sensitive `workledger.locale` device preference.
2. The first supported match in `navigator.languages`, with any English variant mapped to
   `en-GB`, any German variant to `de-DE`, and any Spanish variant to `es-ES`.
3. `en-GB`.

An unsupported device value is removed and ignored. An unsupported stored account value is a data
integrity failure and must not silently become a different preference. Existing accounts migrate to
`en-GB`. New employee and technical account invitations select an initial locale and default to
`en-GB`.

Locale changes preserve the current route, safe search parameters, form state, and focus. The
initiating control keeps focus and one polite status message reports success or failure. A failed
account update restores the prior locale and cache state.

Account locale changes are authenticated, same origin, current account only, allowlisted, and
CSRF protected. They grant no domain permission and create no domain or security audit event. The
signed out device preference stores only the locale value and no identity or workflow data.

### Package and catalog ownership

`@workledger/contracts` will own the transport locale allowlist plus descriptor codes and parameter
schemas. A new private workspace package named `@workledger/i18n` will consume those contracts and
own direction, typed message keys, local catalog loaders, fallback behavior, locale aware
formatters, and the React adapter. It may expose framework neutral entry points plus a React entry
point. It will pin stable `i18next` and `react-i18next` versions when `WL-1401` begins. This one way
dependency prevents contracts and catalogs from importing each other.

Catalogs are repository files loaded by resolved locale. The production namespace set is:

| Namespace | Ownership |
|---|---|
| `shared` | Common actions, states, validation, navigation, route boundaries, accessibility text |
| `auth` | Sign in, activation, password reset, and signed out account communication |
| `employee` | Today, time, balances, requests, absences, notifications, and monthly review |
| `manager` | Approval and team workflows |
| `admin` | HR employees, teams, schedules, policies, absences, holidays, reports, and domain audit |
| `system` | Accounts, sessions, operations, retention, and technical audit presentation |
| `output` | Print, clipboard, CSV, notification email, invitation, and password reset output |

Keys use stable semantic segments in the form
`<namespace>.<feature>.<element>[.<state-or-action>]`. Keys never use English source text, route
paths, database identifiers, or array positions. Examples are
`employee.today.attendance.clockIn`, `shared.route.permissionDenied.title`, and
`output.report.monthlyTime.columns.balanceMinutes`.

`@workledger/ui` stays independent of `i18next` and `react-i18next`. Shared components receive all
visible labels, descriptions, accessible names, and actions from their caller. Existing implicit
English defaults in shared components must be removed or supplied by an application adapter during
`WL-1404`.

### Message ownership and API boundary

Domain packages, database records, audit events, logs, identifiers, and OpenAPI descriptions do not
own translated prose. They keep stable codes and language neutral structured values.

When the server must choose product meaning, contracts use a bounded descriptor:

```ts
type MessageDescriptor<Code extends MessageCode> = Readonly<{
  code: Code;
  parameters: MessageParameters[Code];
}>;
```

Each code has one compile time parameter shape. Parameters may contain only allowlisted structured
values needed for the message. They never contain HTML, preformatted prose, sickness
classification, unrestricted notes, decision reasons, or identifiers that the current surface is
not already authorized to expose.

The ownership map is:

| Surface | Meaning owner | Rendering owner |
|---|---|---|
| Today attention and recovery | API selects code, severity, action, destination, and safe parameters | Browser catalog |
| API and field errors | API and contract select stable error and field codes plus safe context | Browser catalog for interactive UI |
| Report catalog | API selects report key, available sorts, scope, and structured summary | Browser catalog |
| Generic notifications | Stored event code and safe parameters | Browser for history, API for recipient email |
| Session device summary | API supplies bounded browser and platform codes | Browser catalog |
| CSV | API supplies authorized structured rows and renders with the current actor locale | API output catalog |
| Invitation and password reset | API supplies recipient locale and safe link data | API output catalog |

The browser must not infer Today recovery, report meaning, notification meaning, or error recovery
from minute totals, English text, or combinations of generic statuses. OpenAPI summaries and
descriptions, internal exceptions, schema invariant diagnostics, logs, and audit codes remain
technical English because they are engineering interfaces rather than product copy.

### Formatting

Every user facing formatter receives the resolved locale explicitly. Date and time formatting also
receives the authoritative domain timezone. Date only values remain date only, real events remain
instants, and calculation code continues to use Temporal semantics. No locale work may introduce
JavaScript `Date` arithmetic or floating point hours.

Numbers use `Intl.NumberFormat`, lists use `Intl.ListFormat`, and minute durations use catalog
messages with locale plural rules. User entered organization, employee, team, schedule, holiday,
absence type, note, and reason text remains verbatim through safe text bindings. Translation values
cannot contain executable or user supplied HTML.

### Loading, budgets, and enforcement

Only the resolved locale is loaded. The pre-internationalization application baseline remains
910,000 bytes raw and 246,000 bytes gzip for total non-catalog JavaScript, with the existing
500,000-byte largest-chunk and 51,000-byte CSS ceilings unchanged. Phase 14 has a separate bounded
internationalization-runtime allowance of 70,000 bytes raw and 22,000 bytes gzip, producing
combined non-catalog gates of 980,000 bytes raw and 268,000 bytes gzip. The allowance covers only
localization runtime and integration behavior; it is not general application headroom and it does
not classify runtime code as catalog data.

`D-508` selected this accounting after the complete `WL-1402` integration measured 916,728 bytes
raw and 247,840 bytes gzip under the pinned toolchain. A forced production activation of the
already-pinned i18next/react-i18next bridge measured 961,249 bytes raw and 261,327 bytes gzip. Both
fit the bounded allowance while leaving unrelated largest-chunk and CSS limits unchanged. The
budget checker reports allowance consumption explicitly and regression tests keep the baseline,
allowance, and combined ceilings linked. `WL-1404` amended the provisional allowance after the
complete authenticated/shared integration measured 974,388 bytes raw and 265,450 bytes gzip. The
15,000-byte raw and 4,000-byte gzip extension is bounded to the same localization ownership; it
does not change the application baseline or create general feature headroom.

Each locale chunk is limited to 150 KiB raw and 50 KiB gzip. All three locale chunks together are
limited to 450 KiB raw and 150 KiB gzip.

The implementation must add an `i18n:check` quality gate that verifies the locale allowlist,
namespace and key parity, interpolation parameter parity, plural forms, descriptor coverage, and
the absence of untranslated product copy in governed JSX, accessibility attributes, and generated
output. A test only pseudo locale exposes clipping, concatenation, hidden literals, and unsafe
interpolation. It cannot be accepted by persistence or production contracts.

## Options considered

### Application specific catalogs

Separate browser and API catalogs would keep each application simple at first. They would also
duplicate locale rules, formatting, terminology, and output keys, making mixed language and drift
more likely.

### One internal internationalization package

One framework neutral package with a bounded React adapter provides one locale contract and one
catalog type system while keeping domain and UI packages clean. It adds a workspace package and
requires deliberate subpath boundaries.

### Remote translation management at runtime

A hosted translation source could simplify editorial updates. It would add network dependency,
external data handling, cache and failure modes, and a second source of truth that conflicts with
self hosting.

## Consequences

1. Phase 14 can migrate one workflow family at a time without changing domain codes or allowing the
   browser to invent server owned meaning.
2. Account, invitation, notification, and API contracts require bounded changes in later tasks.
3. Existing English defaults and enum humanization are migration debt. They cannot remain as a
   production fallback pattern after their owning task completes.
4. The build gains catalog, pseudo locale, bundle, and human review gates.
5. German and Spanish cannot release until separate fluent reviewers approve terminology and
   privacy sensitive language.
6. Runtime translation services, user supplied HTML translations, translated public documentation,
   RTL production content, and per employee timezone display remain outside Phase 14.

## Evidence

The current route and output audit is recorded in
`docs/139-phase-14-internationalization-architecture-audit.md`. The review glossary structure is in
`docs/140-phase-14-translation-glossary.md`.
