# WL-1105 — Shell, authentication, and route-boundary contract

**Status:** Implemented on 2026-08-21.  
**Scope:** The authenticated shell, work-area navigation, account utilities, authentication entry
surfaces, initial route loading, permission denial, not found, and unexpected route failures.

## Implementation decision

The shell now presents one expanded work area at a time: **My work**, **Team**, **People and
policy**, or **System**. A combined-role account receives a labelled work-area list whose links move
to a stable landing route; the selected area is identified with `aria-current` plus visible,
assistive-technology-hidden “Current” text so the state is not announced twice. The selected area's
authorized destinations remain ordinary router links. Reports
appears once in the active non-system area rather than being duplicated by role.

Desktop destination inventory is the only independently scrolling part of the sidebar. Account
navigation, account identity, and sign-out remain in a stable utility region outside that scroller.
The narrow layout retains the React Aria modal drawer, the same work-area and destination order,
Escape/Close focus restoration, and route-heading focus after navigation. Current-area state is
transient local presentation owned by `ApplicationShell`: area-specific routes update it, shared
Reports/Profile/Notifications routes preserve it, and authorization-area changes fall back to the
first currently allowed area. Desktop and drawer navigation consume that same state, including
after the drawer unmounts. It is not authorization evidence and is not written to a URL, browser
storage, or server record.

The shell measures its sticky header with `ResizeObserver` and exposes the result as an app-local
CSS custom property. The original `4.25rem` value remains the CSS fallback. This replaces a fixed
offset assumption that produced a subpixel header/sidebar overlap under the long-identity,
`1024×420`, and enhanced text-spacing combination.

Authentication retains visible organization and WorkLedger identity, a single focal form, native
form semantics, password-manager-compatible autocomplete, connected field errors, and neutral
account-recovery copy. Session-expiry, sign-out, activation, and password-reset results now use the
shared alert/status contract. Pending forms expose `aria-busy` without claiming an authoritative
account transition early.

Initial loading and all route-level boundaries now compose the shared `RouteState`. Boundary titles
are focused `h1` elements; permission and not-found states expose one safe home/parent link, while an
unexpected failure additionally exposes a real retry button. Permission copy does not disclose the
existence, type, owner, or state of restricted records.

## Interaction state matrix

### Shell and navigation

| State | Trigger / entry condition | Visual UI | DOM / semantic state | Keyboard behavior | Likely screen-reader behavior | CSS/classes | Event | Automated evidence | Docs | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| Single work area | One authorized navigation area | One labelled destination group; no redundant switcher | Labelled `nav`, list, real links, current destination from React Router | Ordinary Tab/Enter navigation | Navigation and current page are expected to be exposed without a redundant area list | `wl-navigation-*`, `wl-nav-link-active` | Router navigation | Component shell/axe | This document | Low |
| Combined roles | Two or more authorized areas | Compact Work areas list plus one expanded current-area inventory | Separate labelled `nav`; visible AT-hidden Current text plus `aria-current="true"` | Tab reaches every area link and current-area destination | Current work area is expected to be exposed once through `aria-current`; manual AT verification remains | `wl-work-area-*` | Router navigation; no custom lifecycle event | Combined-role component/axe and Playwright | This document | Medium if an area or destination disappears |
| Work-area change | Actor follows another area landing link | New area becomes current and its destinations replace the prior inventory | Active route remains authoritative; transient local area state follows it | Enter activates a real link; destination route heading receives focus | Expected to announce the destination heading after routing | `wl-work-area-link-active` | Router navigation | Drawer navigation and route-focus E2E | This document | Medium if focus stays in stale navigation |
| Shared-route persistence | Actor opens Reports, Profile, or Notifications after selecting a work area | Shared destination appears while the prior work area remains current | Shell-owned transient state is shared by desktop/drawer instances and validated against current authorization areas | Ordinary link navigation; route heading receives focus; reopening the drawer restores the same area inventory | Current work area is expected to remain exposed once through `aria-current` | `wl-work-area-*`, `wl-navigation-*` | Router navigation | Component drawer-remount regression and desktop/mobile-transition Playwright | This document | Medium if drawer unmount resets orientation |
| Current destination | Route matches one destination | Narrow active-location rule and surface fill | Router `NavLink` supplies `aria-current="page"` | No custom key model | Current page is expected to be exposed by link state | `wl-nav-link-active` | Router navigation | Shell component/E2E | Design direction | Low |
| Short desktop viewport | Sidebar inventory exceeds available height or the header grows | Destination inventory scrolls; Account and Sign out remain stable; sidebar begins below the measured header | Aside landmark; deliberate internal overflow only; ResizeObserver updates an app-local size property | Tab can reach off-screen destinations and stable utilities | Landmarks and link order remain unchanged; no scroll announcement is added | `wl-desktop-navigation`, `wl-navigation-destinations` | Native scroll plus header resize observation | Long identity/logo + text spacing at 1024×420, forced colors, no overlap/page overflow | This document | Medium if utilities move below the viewport |
| Narrow drawer closed/open | Viewport below desktop breakpoint; Menu/Close/Escape | One Menu trigger; modal drawer when open | React Aria dialog with accessible title and modal semantics | Trigger opens; focus enters dialog; Escape/Close restores trigger | Dialog name and controls are expected to be exposed; manual AT verification remains | `wl-dialog-*`, `wl-mobile-navigation` | React Aria dialog state | UI keyboard test; reduced-motion/narrow E2E | Shared UI doc + this document | High if focus escapes or is not restored |
| Sign-out pending/error/success | Sign out is activated | Pending label and disabled control; persistent inline error or sign-in notice | React Aria button; error `role=alert`; protected Query state clears before success navigation | Focus stays on action while valid; sign-in `h1` receives focus after success | One error or result is expected, without repeated announcements | Shared button/alert plus navigation utility classes | Mutation and router navigation | Existing profile/session and shell coverage | Security/UX docs | High if protected state survives |

### Authentication and boundaries

| State | Trigger / entry condition | Visual UI | DOM / semantic state | Keyboard behavior | Likely screen-reader behavior | CSS/classes | Event | Automated evidence | Docs | Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| Authentication ready | Public route/session check completes signed out | Identity, concise task heading, form, secondary recovery | Main landmark, visible `h1`, labelled fields, real form/button/link | DOM order matches visual order; paste/password managers remain supported | Identity, task, descriptions, and field relationships are expected to be exposed | `wl-auth-*`, shared fields/actions | Form submit/router navigation | Component/axe and browser-matrix E2E | UX/security docs | Low |
| Authentication pending | Sign-in/recovery/reset/activation submitted | Submit label changes; no optimistic account-state claim | Form `aria-busy="true"`; submit disabled through React Aria | Focus stays in the form; duplicate submit is unavailable | Busy form and pending button text are expected to expose progress once | Shared action/form classes | Mutation | Existing auth E2E and component behavior | This document | Medium if duplicate activation occurs |
| Validation or request failure | Client validation or safe API error | Focused error summary before fields; safe generic request error | `role=alert`, linked errors, `aria-invalid`/descriptions | Summary links return to invalid controls | Summary and connected field errors are expected; manual SR flow remains | Shared field/error contracts | Failed submit | Component/axe and auth E2E | UX/security docs | High if credentials or account existence leak |
| Session/result notice | Expiry, sign out, activation, or reset redirects to sign in | Persistent titled warning/info/success state | Shared `Alert`; expiry is assertive, other results use status semantics | Focus moves to Sign in `h1`, not the notice | One concise result is expected; repeated live updates are avoided | `wl-alert*` | Router redirect | Session-expiry/reset/profile tests | Security docs | High if sensitive memory remains |
| Initial loading | Router hydration/session and area resolution are pending | Stable loading state without invented user data | Main `aria-busy`; shared loading route state and `h1` | No interactive trap or fabricated control | One polite loading state is expected | `wl-route-state--loading` | Loader completion | Shared component/axe; build | Shared UI doc | Medium if loading never exits |
| Permission denied | Authenticated loader rejects current capability/scope | Explicit denial and safe home action; no target fields | Focused route `h1`; shared permission route state | Tab reaches only safe recovery | Denial and recovery are expected without target disclosure | `wl-route-state--permission-denied` | Loader error boundary | Component focus/axe and permission regressions | UX/security docs | High if restricted details render |
| Not found | Unknown route or authorized missing route | Not-found state and safe return link | Focused route `h1`; shared not-found route state | Enter follows real return link | State and recovery are expected to be exposed | `wl-route-state--not-found` | Router boundary | Component focus/axe | This document | Medium if confused with explicit 403 |
| Unexpected failure | Loader throws a non-403/404 failure | Page unavailable, safe context, home and retry actions | Focused route `h1`; one wrapping `role=alert`; real button reload | Tab reaches home and retry; retry is deliberate | One urgent route failure is expected, not raw exception detail | `wl-route-state--error` | Loader error boundary/reload | Component focus/axe | Security docs | High if raw technical detail leaks |
| Forced colors / reduced motion | User preference media features active | Current/boundary/focus borders remain; drawer travel removed | Semantics and DOM order unchanged | All actions remain keyboard complete | No meaning depends on authored color or animation | System-color tokens; reduced-motion dialog rules | Media query | Forced-colors combined-role and reduced-motion drawer E2E | Design direction | Medium pending manual AT |

No custom navigation keyboard model or lifecycle event is introduced. These are ordinary document
links and a React Aria dialog; React Router remains responsible for route completion, document title,
focus placement, and history behavior.

## Modern web guidance check

- **Repository classification:** mixed TypeScript monorepo; React SPA plus local React Aria UI
  package.
- **Feature areas:** responsive application shell, navigation/dialog focus, form status, async route
  state, forced colors, and reduced motion.
- **Baseline target:** Baseline 2024 plus the repository's configured stable browser matrix.
- **Command attempted:** `npx modern-web-guidance@latest search "responsive application shell
  navigation drawer work area switcher focus restoration"`.
- **Result:** the first workspace attempt was blocked by WorkLedger's exact Node `24.18.0`
  developer-engine contract under the task's Node `24.19.0` runtime. Running the CLI outside the
  workspace then required an approved network retry and succeeded.
- **Guidance retrieved:** current `accessibility` and `css-layout` guides, supplementing the
  approved `size-aware-styling` and `scrollability-affordance-hints` constraints already recorded
  in `docs/111-ui-design-direction.md`.

Must-follow constraints applied here are native links/buttons, DOM-order parity, explicit landmarks
and focus, no duplicated ARIA state in accessible names, a complete narrow default, logical
properties and dynamic viewport sizing, deliberate `overflow: auto` only on the destination
scroller, `overflow: clip` on its fixed container, color-independent current/error states, and
motion-independent drawer behavior. No package or custom focus trap was added.

The `WL-1106` gate follow-up retrieved current navigation-drawer and CSS cascade guidance. It kept
the existing React Aria drawer, lifted only the shared presentation state, and used an explicit
scoped `:not()` adaptation so app-owned legacy alert styling cannot neutralize package-owned tone
modifiers.

## Security and data boundary

- Navigation remains a convenience view over the already authorized `SelfContext`; the API remains
  the authority for every route and record.
- Work-area selection is transient local UI state only. It is not persisted or included in URL,
  logs, DTOs, or storage.
- Authentication grants, credentials, errors, and protected Query state retain their existing
  memory/no-store cleanup boundaries.
- Permission and unexpected-error presentation includes no target identifiers, restricted facts,
  stack, SQL, filesystem, configuration, token, or request payload detail.

## Remaining manual evidence

Automated coverage verifies semantic/axe behavior, route-heading focus, combined-role destination
presence, shared-route area persistence across drawer remounts and desktop/mobile transitions,
long-identity text-spacing behavior at `1024×420`, 320/390 px drawer behavior, forced colors,
reduced motion, and page-overflow containment. Manual VoiceOver, NVDA, and TalkBack evidence
remains assigned to `D-502`/`WL-1206`; this task makes no unsupported claim about exact
announcement strings.
