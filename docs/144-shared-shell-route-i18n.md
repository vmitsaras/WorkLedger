# Shared shell and route presentation localization

**Task:** `WL-1404` (partial implementation)  
**Date:** 2026-08-26  
**Workspace version:** `0.14.0`

## Scope completed in this slice

The application’s shared navigation and route-state foundation now read from the active local
catalog instead of retaining English-only presentation at the shell boundary.

- The typed `shared` catalog now owns shell skip-link text, the organization-home accessible name,
  drawer trigger/title, work-area navigation labels, and desktop/mobile destination descriptions.
- Canonical catalog-backed route titles remain the single source for shell destinations and update
  `document.title` when the active account locale changes.
- Initial route loading, root failure, ordinary unavailable, permission-denied, and not-found
  states now use typed catalog messages for headings, descriptions, and recovery actions.
- The root localization-load failure remains a deliberately English, dependency-free last-resort
  surface because a failed catalog cannot render its own translation.

## Accessibility and security

- The existing focused-`h1`, route-title, real-link/retry-button, alert, and drawer-dialog
  contracts are unchanged. The localized drawer retains its distinct dialog title and trigger
  label so its accessible name remains stable.
- Organization identity remains a plain-text interpolation parameter for the accessible home link;
  no user-supplied HTML enters the catalog or DOM.
- No locale persistence, authorization, protected response, audit, route, or URL behavior changed.

## Verification

- `node_modules/.bin/node node_modules/typescript/bin/tsc --build --pretty false --force`
- `node_modules/.bin/node node_modules/vitest/vitest.mjs run --project component apps/web/test/application-shell.component.test.tsx`
- `node_modules/.bin/node scripts/check-i18n.mjs`

The localized shell/boundary component evidence covers German document title, skip link,
navigation label, canonical destination, not-found title, recovery link, heading focus, and axe.

## Remaining ownership

`WL-1404` still owns authentication, Profile, common validation, dialogs, and announcements.
Employee, manager/HR/system workflow copy, and generated output remain assigned to `WL-1405`,
`WL-1406`, and `WL-1407` respectively.
