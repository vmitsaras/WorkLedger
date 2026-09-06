# WL-1508B — Bounded health residency design

**Date:** 2026-09-06  
**Status:** Design complete; implementation and deterministic verification next  
**Decision:** D-516 / spec 0005

The selected recovery changes only the first synthetic health probe to request 120 seconds of idle
model residency. The second still requests immediate unloading. Both retain the single original
120-second operation deadline and concurrency slot. This removes the explicit first-probe unload
request; it does not guarantee that the server will reuse the model or meet the deadline.

Failure before the second request acquires a runner relies on finite idle expiry. Once the second
request acquires it, zero keep-alive requests unloading on idle. No extra cleanup request, background
timer or timeout extension is added. Cancellation remains prompt and readiness remains closed.
The owned pilot server is stopped after failure; the application never kills a shared provider.

The design distinguishes synthetic idle residency from employee retention and immediate erasure.
The [pinned scheduler](https://github.com/ollama/ollama/blob/v0.33.3/server/sched.go) supports finite
idle expiry and residency updates on reuse. Its behavior requires real qualification; mocks can
verify only request policy, ordering and failure handling.

The canonical contract is `docs/specs/_root/0005-insight-health-residency/index.md`. Implementation
must inspect fake-provider routing assumptions, assert the two distinct residency values, preserve
all existing health validation and deterministic deadline/cancellation cases, and verify ordinary
generation is unchanged. Update operations guidance and record deterministic evidence before
requesting any real-model attempt.

Fresh evidence proceeds through separately authorized cold health-only, fresh 18-challenge schema
qualification, then B with its own health and two strict employee groups. Historical K is retained
but cannot stand in for qualification of the amended lifecycle. A health-only success cannot
complete B or supply D-515 semantic evidence.

This task reviewed status, the task board, security guidance, specs, adapter and tests, and pinned
upstream scheduler source. Only design/project-memory documents changed. No tests, model health,
inference, provider startup or configuration changes ran. Documentation whitespace is checked with
`git diff --check`; UI/accessibility, authorization, domain and data behavior are unchanged.

WL-1508B/C/D remain open, provider deployment disabled, and version `0.16.0` unchanged. Next:
implement D-516/spec 0005 and run deterministic checks with real-model flags disabled.
