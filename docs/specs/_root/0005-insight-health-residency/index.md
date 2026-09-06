# 0005. Bounded synthetic health residency

**Date:** 2026-09-06  
**Status:** Implemented and deterministically verified in report 192; fresh inference evidence pending
**Decision:** D-516  
**Evidence:** Reports 189–191

## Selected change

Change only the cooperative capability health request from `keep_alive: 0` to the literal
`keep_alive: '120s'`. Keep the subsequent compact-schema health request at `keep_alive: 0`.
Use a named internal constant; do not add an environment setting or expose a configurable duration.
The finite idle residency covers the largest remaining portion of the existing 120-second health
operation without using indefinite residency or the server's default five-minute interval.
It is independent of, and does not extend, the configured operation timeout.

Keep both probes, their ordering, prompts, schemas, validation, token limits, thinking disabled,
temperature zero, shared concurrency slot and single original deadline. Keep version, digest,
capability, private-address, redirect and response-size checks. No retry, warm-up, third cleanup
request, additional endpoint, background adapter timer or process-control code is introduced.
Ordinary generation and qualification-challenge request construction remain unchanged.

This amends the immediate-unload behavior retained by spec 0003. It does not amend spec 0004's
employee evidence acceptance. No claim is made that the change guarantees health latency.

## Lifecycle and failure contract

| State or result | Required behavior |
| --- | --- |
| Before the capability request | Existing identity/address checks apply; failed checks send no chat |
| Capability running | Use the same health signal and deadline; request finite 120-second idle residency |
| Capability valid | Immediately issue the unchanged compact challenge with zero keep-alive |
| Capability invalid or interrupted | Fail health, leave readiness unset, issue no further request; finite idle expiry is the fallback if a runner was acquired |
| Compact challenge acquired a runner | Its zero keep-alive requests unloading when the runner becomes idle, including cancellation |
| Compact challenge fails before acquisition | First request's finite idle expiry remains the fallback; do not assume zero keep-alive took effect |
| Both probes validate | Admit readiness as today; the second request has requested unloading, not attested its completion |
| Deadline or caller cancellation | Return existing safe failure promptly, clear readiness and release the adapter slot; do not extend the deadline to await cleanup |

The pinned scheduler updates residency when reusing a runner and schedules expiry after its active
references finish. Consequently the 120 seconds is an idle interval, not a hard wall-clock bound
from request start or a secure-erasure guarantee. Other clients can affect residency. These semantics
are supported by [Ollama 0.33.3 scheduler source](https://github.com/ollama/ollama/blob/v0.33.3/server/sched.go).

The provider has no exclusive ownership of an arbitrary server. It must not unload another client's
model through an extra cleanup call or kill a process. Bounded pilot execution uses the existing
dedicated owned portable server, no competing requests, and exact-owned-process cleanup after a
failed attempt. A stuck external server is an operational failure, not something an idle expiry can
guarantee to resolve. The wrapper must record cleanup failure and stop if ownership cannot be verified.

Only fixed synthetic probe content receives this changed residency request. This does not promise
that a reused server contains no earlier content; cold qualification must establish an empty loaded
model list on the isolated candidate before health. Production `checkHealth()` does not itself
enforce coldness or acquire a new `/api/ps` permission. Employee data retention and logs stay unchanged.

## Deterministic implementation and verification

Expected code scope: `apps/api/src/ai/ollama-adapter.ts`,
`apps/api/test/ai-provider.unit.test.ts`, and any existing fake-provider helpers whose routing assumed
that every health request has zero keep-alive. Search those assumptions before editing. Identify
synthetic requests in mocks by their explicit shape or ordered protocol, never interpret any positive
keep-alive as an employee request. Do not change production validation to accommodate mock routing.

Required cases:

1. Successful health sends exactly two chats in order: first `'120s'`, second `0`; assert unchanged
   synthetic bodies and request settings, then readiness. Ordinary generation keeps its current body
   with no new keep-alive override.
2. Invalid capability, malformed response, transport failure and cancellation during the first probe
   prevent the second probe and generation. No cleanup request or retry follows.
3. Failed identity/address checks send zero chats. A failure between probes leaves readiness unset.
4. Compact-schema invalid output, transport failure and cancellation preserve their existing safe
   codes and deny generation. No extra request follows even if the server never acquired the runner.
5. The existing controlled-timer test still proves one deadline across both probes and one slot;
   expiration is not restarted for the second chat. Check caller cancellation separately from timeout,
   including an already-aborted caller. Completion cannot restore readiness after a timeout.
6. Retain content-free error/log assertions and exact profile checks. Fake-server tests verify emitted
   policy and adapter behavior; they cannot prove actual unloading, memory erasure or load speed.

Run scoped tests first, then applicable deterministic typecheck, lint, unit/component and available
integration checks with both real-model flags disabled. Update operations guidance to distinguish
requested idle expiry from verified cleanup. Record actual results and any gated skips. No dependency,
public DTO, error enum, artifact schema, UI, domain or database change is required.

## Fresh evidence gates

Historical K remains complete for its original lifecycle. It cannot qualify the amended behavior.
After deterministic implementation, a separate user continuation may authorize one cold synthetic
health-only attempt: exact candidate/profile, firewall and ownership checks, empty loaded-model list,
unchanged 120-second deadline and one slot. Do not automatically continue into employee cases or the
18-challenge qualification suite from that health-only authorization.

Retain only approved content-free metadata: source hashes, lifecycle identifier
`synthetic-health-residency-v1`, health outcome and elapsed time, identity/isolation checks, ordinary
server lifecycle timing and cleanup outcome. Never retain request/response bodies or enable request
debugging. Distinguish a failed health attempt from an employee semantic result.

If health passes, separately authorize and execute fresh schema qualification under this lifecycle:
one cold health plus all 18 fixed challenges with existing stop rules, identity checks and cleanup.
Only after that evidence passes may separately continued B run submission-actions 9/9 followed by
today-posted 9/9. B itself retains mandatory health. Any failure stops its sequence without retries.
C and D retain their existing prerequisites. No deployment, phase or version change is authorized.
