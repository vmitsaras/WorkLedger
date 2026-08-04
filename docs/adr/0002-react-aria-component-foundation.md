# ADR 0002 — React Aria Component Foundation

**Status:** Accepted

## Context

WorkLedger needs accessible date ranges, time fields, comboboxes, tables, dialogs, menus, forms, and keyboard interactions while retaining a custom visual identity.

## Decision

Use React Aria Components as the primitive foundation and shadcn/ui React Aria source components as local starting code. Style through Tailwind CSS and WorkLedger tokens.

## Consequences

- Strong focus, keyboard, selection, date, and internationalization behavior.
- Components remain local and customizable.
- WorkLedger owns maintenance and accessibility after copying components.
- Avoid mixing Radix, Base UI, Headless UI, and React Aria versions without an explicit exception.
