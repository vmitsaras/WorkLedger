# Employee Attendance Accessibility and Mobile Review

**Task:** `WL-406`  
**Completed:** 2026-08-12  
**Outcome:** Complete locally. The authenticated employee-attendance slice now has phase-wide
keyboard, accessibility-tree, announcement, reflow, touch-emulation, forced-colors, reduced-motion,
long-content, and multi-viewport evidence.

## Scope and method

The review covered sign-in entry, the authenticated application shell, responsive navigation,
Today loading and ready structure, every authoritative attendance state, the complete clock
sequence, active-break clock-out confirmation, pending/success/conflict/replay feedback, offline and
dependency recovery, calculation groups, warnings, and the immutable event timeline.

Evidence combined source inspection, the Modern Web Guidance accessibility guide, component
semantics/focus/live-region assertions, axe in ordinary rendering, Chromium keyboard and touch
flows, Playwright CLI accessibility-tree snapshots, computed-style checks, and visual inspection of
forced-colors output. No new ARIA widget or custom keyboard model was introduced.

## Findings and fixes

Two implementation defects were confirmed and fixed:

1. Desktop and drawer navigation group labels used `h2` elements. This placed navigation labels
   before the route `h1` in the browser accessibility-tree heading sequence. The labels are now
   ordinary text inside already-labelled navigation landmarks, so `Today` is the first page heading
   and the route's `h1`–`h3` hierarchy describes only route content. This likely affected WCAG 1.3.1
   and 2.4.6.
2. Shared React Aria controls received `data-focus-visible`, an outline width, and a system focus
   color, but computed `outline-style` remained `none`. The shared button, link, and field foundation
   now explicitly paints a solid outline; route and attendance status focus targets also use an
   explicit solid outline. This likely affected WCAG 2.4.7 and 1.4.11, especially in forced colors.

The expanded regression suite reproduces both findings: the route heading must be first in the
heading sequence, and a keyboard-focused control in forced colors must expose a non-transparent,
solid outline distinct from its background.

## Expected announcement matrix

This is an accessibility-tree and DOM-contract smoke test, not a claim about a particular screen
reader and browser pairing.

| User action or change | Visual result | Expected screen-reader information | Verified exposure after review |
|---|---|---|---|
| Open a route | Destination renders | Unique title and `h1`; focus on the `h1` | Route title changes and `Today` receives focus without preceding navigation headings |
| Submit empty sign-in | Error summary renders | One assertive summary, then linked field errors | Focus moves to the single `alert`; labels and summary links remain exposed |
| Start a clock intent | Initiating label becomes pending and controls disable | Updated action name and busy state without a separate retry announcement | `Clocking in…`/equivalent is disabled and its form has `aria-busy="true"` |
| Clock command succeeds | Authoritative state and valid actions replace the old control | One concise polite result and current status context | Exactly one `status`; focus moves to the status heading because the prior action disappeared |
| Open active-break clock-out confirmation | Named modal dialog opens | Dialog title, explanation, Cancel, and confirm action | Named `dialog` receives focus; Escape restores focus to `Clock out` |
| Terminal stale conflict | No effect is claimed; authoritative state refetches | One assertive no-effect explanation and request reference | Exactly one `alert`; status receives focus only when the prior action is no longer valid |
| Lost response resolves as replay | One authoritative success appears | One success, not a second event or retry narration | One `status`; both requests use the same idempotency key |
| Connection is lost | Existing data remains; actions disable | One assertive offline/no-queue explanation | One `alert`; disabled controls have adjacent recovery text |
| Connection returns | Current state refetches before actions enable | One polite recovery or material device-change result | `status` identifies refresh/convergence; focus moves only if the old action disappeared |
| Background dependency refresh fails | Stale content stays visible; actions disable | One assertive persistent failure with a safe retry | One `alert` with request reference and `Try again`; route content remains available |
| Poll or automatic retry occurs | Visible data may update | No announcement unless actor-relevant attendance changes | Polling/retry loops do not create live-region messages |

Actual VoiceOver, NVDA, JAWS, Narrator, and TalkBack output was not claimed. Their calibrated
browser pairings remain appropriate release-level manual confirmation; no known markup, focus, or
announcement defect remains from this smoke review.

## Responsive, zoom, long-content, and touch evidence

Today was exercised at 320, 360, 390, 430, 640, 768, 1024, 1280, 1440, and 1920 CSS pixels.
The 640 px case represents the available CSS width of a 1280 px viewport at 200% browser zoom, while
the 320 px case provides the stricter WCAG reflow boundary. Every width retained the current status,
valid actions, calculation, and timeline without page-level horizontal scrolling. Source order kept
status and actions before the calculation and timeline at every layout.

The long-content fixture uses a deliberately long holiday name, multiple warning messages, all
calculation groups, and several timeline events at 320 px. Labels wrap without clipping or changing
definition relationships. English is the only shipped MVP locale, so no unsupported translated UI
was manufactured; overflow-prone server content is represented by the long holiday fixture.

Chromium touch emulation completed clock-in at 390 × 844 without hover, mouse, drag, or precision
pointer behavior. Clock controls measured 42 px high and exceeded the WCAG 2.2 AA 24 × 24 CSS pixel
minimum across the complete viewport matrix. Physical mobile hardware was not used.

## Forced colors and reduced motion

At 390 × 844 with Chromium forced colors, panels, alerts, active navigation, timeline markers,
button boundaries, text, and the keyboard focus outline remained perceivable through system colors
and explicit borders. Meaning continued to come from text and structure rather than color.
Chromium/axe system-color contrast calculation is not reliable under emulation, so axe runs in the
ordinary rendering scenarios while the forced-colors case asserts computed system boundaries and
focus styles directly and was visually inspected.

Normal preference retains the short dialog entrance animation. Under `prefers-reduced-motion:
reduce`, the drawer and dialog have no animation or spatial transform, shared transition duration is
reduced to 1 ms, the skip link has no transition, and the complete navigation workflow remains
immediate and keyboard complete. No attendance meaning depends on animation.

## Security and data review

This task changed presentation semantics, focus styling, and browser tests only. It added no API,
database, authentication, authorization, cache, URL, storage, logging, telemetry, or audit data
path. The existing session, CSRF, no-store, organization/employee scope, immutable-event,
idempotency, offline non-queueing, and revision-aware cache boundaries remain unchanged.

## Verification evidence

- Component coverage verifies accessible pending names/busy state, one result region, dialog focus
  entry/restoration, terminal-conflict alert behavior, offline and dependency recovery, replay
  deduplication, device convergence, route focus, and axe.
- Chromium covers the full keyboard attendance sequence, dialog Escape/confirmation, touch clock-in,
  320 px long content, the ten-width reflow/target matrix, forced-colors focus and boundaries,
  normal versus reduced motion, replay/offline/device recovery, route headings, and ordinary-mode
  axe checks.
- Playwright CLI inspection confirms landmark, navigation, heading, region, definition-list,
  ordered-list, accessible-name, and focus exposure for the ready Today screen.
- The database-enabled canonical gate passes 24 native checks, 153 unit/component tests,
  21 integration tests, 12 Chromium scenarios, reproducible OpenAPI, formatting, lint/boundaries,
  strict TypeScript, and the production build.

## Deferred ownership

- `WL-407` owns the complete Phase 4 exit-gate review and the required `0.5.0` internal milestone
  bump if the gate passes.
- D-502 still owns final supported browser/version targets. Actual OS screen-reader/browser pairings,
  physical touch hardware, and browser-chrome zoom remain release-level manual confirmations rather
  than automated claims.
- `WL-1001` retains the existing production bundle-size and long-history scale work.
