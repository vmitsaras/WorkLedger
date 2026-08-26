# API presentation descriptors

**Task:** `WL-1403`  
**Status:** Complete  
**Date:** 2026-08-26  
**Workspace version:** `0.14.0`

## Outcome

Product-facing API responses no longer carry server-authored English prose for the bounded Phase
14 migration set. Contracts expose stable codes and purpose-minimized structured values; the API
continues to own the business decision, authorization, severity, recovery action, and destination.
The browser owns the current English presentation map until `WL-1404` moves these exact mappings
into completed locale catalogs.

## Contract changes

- Today attention carries a strict `message` descriptor (`code` plus an empty, allowlisted
  parameter object), severity, source, affected date, submission effect, recovery action, and
  destination. It no longer returns title, reason, action label, or next-step prose.
- API errors now contain error codes, field codes, request identifiers, and bounded recovery
  context only. Fastify validation and custom form validation no longer serialize English error
  messages.
- Report catalogs expose report keys, authorized sorts, and structured defaults only; title and
  description remain browser presentation.
- Notification history exposes its event code and approved route/status/time data rather than
  stored title/body text. The delivery adapter receives the event descriptor rather than an
  English email subject/body. `WL-1407` will render localized outbound content for the recipient
  locale.
- Self-service and system-account session records expose a bounded browser code and nullable
  platform code rather than a user-agent-derived English device summary. Raw user-agent and IP
  data remain excluded.

No descriptor permits HTML, free-form notes, sickness classification, reviewer identity, raw user
agent, or arbitrary request data.

## Security and accessibility

The change preserves the existing same-origin, CSRF, authorization, no-store, route-scope, and
privacy controls. Browser mappings are exhaustive for the new bounded descriptor sets, so UI does
not infer recovery from calculations or parse English prose. Existing explicit labels, status
badges, destination links, validation association, and urgent-attention announcements remain
semantic and keyboard complete.

## Evidence

- Contract tests reject former prose fields and accept only the bounded descriptors.
- Today display, notification history, report catalog, device presentation, error envelope, and
  form-validation component coverage exercise the new response shape.
- Environment-independent integration tests validate the generated contract and safe error
  behavior. Database-dependent integration coverage remains opt-in when PostgreSQL is available.
- `openapi/workledger.openapi.json` was regenerated from the changed contracts.

## Remaining ownership

`WL-1404` migrates the transitional browser presentation map into the shared typed catalog layer
and translates shared/authenticated UI. `WL-1407` provides recipient-locale rendering for email,
CSV, print, and clipboard output.
