# Authenticated Application Shell and Route Boundaries

**Task:** `WL-400`  
**Completed:** 2026-08-11  
**Outcome:** Complete locally. WorkLedger now has accessible credential routes, a role-aware
authenticated shell, a read-only profile/session surface, and PostgreSQL-backed self-service API
contracts. Attendance feature routes remain bounded placeholders owned by later roadmap tasks.

## Scope delivered

- React Router Data Mode owns public/protected loaders, redirects, nested route boundaries,
  permission gates, scroll restoration, document titles, and deterministic heading focus.
- TanStack Query owns in-memory self-context/profile remote state and mutations. Signing out,
  revoking the current session, or observing session expiry clears protected query data.
- Sign-in, neutral account recovery, and password reset routes use visible labels, password-manager
  autocomplete, paste-friendly inputs, focused error summaries, and generic non-enumerating errors.
- The reset grant is captured before router construction, removed immediately from the URL and
  browser history, retained only in module memory for the submission, and cleared afterward.
- The authenticated shell provides a skip link, semantic landmarks, role-derived desktop
  navigation, a React Aria modal mobile drawer, account utilities, route loading UI, explicit `403`,
  `404`, authentication-expiry, and dependency-error outcomes.
- The profile route is read-only. Account, active employee, application-role, and session facts are
  displayed without presenting HR-owned employment data as editable self-service fields.

## Server and data boundary

Shared strict contracts define the active self context, read-only profile, minimized session
summary, CSRF bootstrap, and session-revocation response. The API resolves these through a narrow
transaction repository and the established authorization/session foundation:

- `GET /v1/me/context`
- `GET /v1/me/profile`
- `GET /v1/me/csrf`
- `POST /v1/me/sessions/:sessionId/revoke`

All responses are `no-store`. Mutations require same-origin request evidence plus the
session-bound WorkLedger CSRF value. A user may revoke only a session owned by the current account;
revoking another session requires a fresh current session. Revocation and its minimized
`SESSION_SELF_REVOKED` security-audit event commit in the same WorkLedger transaction. Revoking the
current session also clears its cookie.

The browser DTO intentionally excludes IP addresses, raw user-agent strings, authentication
secrets, reset grants, employee medical data, and mutable HR fields. Device information is reduced
to an approximate browser/platform label before transport. Organization-local employment
resolution uses Temporal semantics rather than JavaScript `Date` arithmetic.

## Accessibility behavior

- Route navigation updates the document title and focuses the persistent `h1` after completion;
  the same history entry does not receive duplicate focus.
- Complex submission errors receive a focused summary while field errors remain programmatically
  associated with their inputs. Async success and failure states are announced only when
  meaningful.
- The mobile drawer contains focus, supports Escape/dismissal, restores trigger focus, preserves
  DOM/reading order, and removes spatial animation under `prefers-reduced-motion`.
- Focus indicators remain visible in forced-colors mode, controls meet the accepted target sizing,
  and state is never conveyed through color alone.
- Component and Chromium flows run axe checks. Desktop and mobile service-unavailable/not-found
  boundaries were visually inspected for readable reflow.

## Dependency decision

React Router `8.3.0` and TanStack Query `5.101.4` were the current compatible stable releases checked
on 2026-08-11 and are pinned exactly. Router Data Mode is needed for the repository's accepted route
ownership, boundary, and focus contract. TanStack Query is needed for explicit validated remote
state, invalidation, and mutation ownership. Native History/fetch primitives do not provide these
lifecycles without recreating framework behavior. No browser-persistent store, global client store,
React Hook Form, or additional authentication library was added.

## Verification evidence

- Shared contracts reject over-broad profile/session data.
- PostgreSQL integration covers active context/profile mapping, raw-client-metadata exclusion,
  current/other session revocation, ownership denial, freshness denial, and transactional audit.
- Component tests cover focused authentication errors, role-aware navigation/title/focus,
  non-leaking permission denial, read-only profile behavior, session state clearing, drawer focus,
  and axe.
- Four Chromium scenarios cover sign-in errors, reset-grant URL cleanup, mobile drawer/reduced
  motion, and current-session revocation/expiry behavior.
- The database-enabled canonical repository gate passes 24 native checks, 129 unit/component tests,
  18 integration tests, four Chromium scenarios, formatting, lint/boundaries, strict TypeScript,
  OpenAPI drift, and the production build.

## Deferred ownership

- `WL-401` replaces the Today placeholder with the first authorized attendance read model.
- `WL-405` expands offline, stale, retry, and multi-tab/device behavior for attendance mutations.
- `WL-406` performs the full employee-attendance screen-reader, zoom, forced-colors, reduced-motion,
  keyboard, and mobile review.
- `WL-1001` owns measured scale/performance review, including the current successful build's
  509.16 kB minified entry-chunk warning and any justified route code splitting.
- Phase 10 owns a coordinated production listener, same-origin Caddy composition, deployment
  headers, operations, and release hardening.
