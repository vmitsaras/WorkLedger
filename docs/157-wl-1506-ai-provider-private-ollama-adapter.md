# WL 1506 AI Provider and Private Ollama Adapter

**Task:** `WL-1506`  
**Date:** 2026-08-27  
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`  
**Runtime changes:** Disabled provider plus an optional private Ollama adapter

## Outcome

WorkLedger now has one server owned AI provider contract with `disabled` and `ollama` modes.
Disabled is the default. It performs no DNS lookup and no provider request. The Ollama mode cannot
be selected by a browser request, database record, model response, or administration form.

The adapter supports provider health and one provider independent generation operation for the
later employee interpretation service. It does not add `POST /v1/insights/interpret`, a prompt,
conversation state, tool orchestration, grounding, a rendered interface, or any model authored
domain result. Those remain owned by `WL-1507`.

## Configuration Contract

`WORKLEDGER_AI_PROVIDER_MODE` accepts only `disabled` or `ollama`. Provider specific values are
rejected while the provider is disabled, which prevents stale configuration from being silently
ignored.

Ollama mode requires `WORKLEDGER_OLLAMA_ORIGIN`, `WORKLEDGER_OLLAMA_MODEL`, and
`WORKLEDGER_OLLAMA_MODEL_DIGEST`. The origin must be one HTTP or HTTPS origin with no path, query,
fragment, or credentials. Public literal addresses and direct `ollama.com` origins are rejected.
The model must be one exact local name and tag, must not use a cloud suffix, and must have one exact
64 character lowercase digest.

`WORKLEDGER_OLLAMA_TIMEOUT_SECONDS` defaults to 30 and accepts 5 through 120.
`WORKLEDGER_OLLAMA_CONCURRENCY` defaults to 2 and accepts 1 through 8. Required capabilities are
fixed to chat, structured output, and tools. An operator cannot weaken that set through runtime
configuration.

The redacted startup summary includes only provider mode and numeric bounds. It never includes the
origin, model name, model digest, prompt, response, or raw dependency error. The production Compose
file passes the optional values to the API but does not add an Ollama image, public port, model
download, or outbound route. The operator still provisions the model and private service outside
WorkLedger.

## Private Transport and Egress Contract

The adapter uses Node HTTP and HTTPS directly. It never reads environment proxy settings, never
sends proxy authorization, never follows a redirect, and creates a fresh connection for every
request. Only `/api/tags`, `/api/show`, and `/api/chat` exist in its internal path allowlist.

Before the first provider request, every resolved address must be loopback, RFC 1918 IPv4, IPv6
loopback, or IPv6 unique local. The complete private address set is pinned for the health check and
for later generation. Resolution happens again before every connection. A public address, mixed
address set, or change to a different private address fails closed before a connection is opened.

This application control cannot prove that the separate Ollama process stays offline. Production
enablement still requires `OLLAMA_NO_CLOUD=1` or an equivalent setting, no cloud sign in, no
outbound proxy, no public port, and an operator network policy that blocks internet egress.

## Model and Capability Health

The startup check runs after the core API starts listening, so an unavailable optional provider
cannot delay process liveness. It performs these bounded checks.

1. `/api/tags` must contain the exact configured local model name and digest with no remote model
   or remote host metadata.
2. `/api/show` must report completion and tool capabilities with no remote model metadata.
3. `/api/chat` must complete one synthetic nonstreaming structured output probe with thinking
   disabled.

Generation stays unavailable until all three checks pass. Each later generation rechecks
`/api/tags` before `/api/chat`, so model digest drift is rejected before protected context can be
sent. Requests set `stream: false`, `think: false`, and temperature zero. Reasoning content in a
response is rejected. The adapter does not retry automatically.

Health reports only `disabled`, `ready`, `unavailable`, or `misconfigured`, the safe capability
categories, a check instant, and a bounded reason code. Errors retain no provider body, URL, model,
digest, prompt, response, or raw exception text.

## Failure, Cancellation, and Capacity

One operation owns one deadline across DNS, metadata, and model work. Caller cancellation aborts
the active request. The installation concurrency limit covers health and generation work, rejects
excess work immediately, and never creates an unbounded queue. Request and response bodies also
have fixed byte ceilings.

Provider startup health is deliberately outside Fastify readiness and outside the deterministic
Insight Service. The PostgreSQL employee Insight route passes with Ollama mode enabled and an
unreachable private endpoint. Native facts, sources, limitations, freshness, and actions remain
complete and usable.

## Security and Data

The provider receives no employee data in this task. The startup probe contains synthetic fixed
text only. No question, prompt, conversation, tool argument, tool result, model output, reasoning,
source reference, or provider diagnostic is added to PostgreSQL, audit history, browser storage,
cache, backup, or a new log field.

There is no new dependency, package, migration, table, secret, model download, write action,
external provider, cloud API, MCP surface, or browser bundle edge.

## Accessibility

There is no rendered interface change. Native Insights remain the only user visible result. The
later interpretation route must keep that result first and must own cancellation, dependency
failure, announcement, focus, localization, and assistive technology behavior under `WL-1507` and
`WL-1508`.

## Verification

Focused provider and runtime configuration tests pass with 27 tests. They cover disabled no egress,
strict configuration, public origin denial, startup readiness, private DNS rebinding, private
address drift, redirects, cloud metadata, model digest drift, missing capabilities, structured
output probing, generation shape, reasoning rejection boundaries, timeouts, cancellation,
concurrency, and content free health logging.

The full unit and component gate passes 55 files with 456 tests. The broad integration command
passes 13 tests with 48 database opted skips. The canonical PostgreSQL gate passes 15 files with 28
tests and one existing historical skip. The enabled but unreachable provider fixture still returns
the complete authenticated deterministic Employee Insight result.

`pnpm config:check`, `pnpm production:config:check`, `pnpm production:verify`,
`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`,
`pnpm db:test`, and `pnpm build` pass. Source boundaries cover 340 files and 1,933 imports with no
forbidden edge. The browser bundle remains at the accepted 1,037,620 raw and 267,297 gzip
JavaScript byte baseline because the provider is API only.

## Remaining Boundaries

`WL-1507` may now add only employee self Ask My Ledger interpretation through this provider and the
existing Insight tool registry. It must keep questions and prior turns in browser and request
memory, enforce the account rate and one in flight limits, bound tool rounds and executions,
validate structured output against current native references, preserve source attribution, and
keep the native result usable for every provider failure.

Manager, report builder, HR, System, MCP, public provider, cloud model, write, scoring, prediction,
recommendation, and autonomous action work remains behind its named gate.
