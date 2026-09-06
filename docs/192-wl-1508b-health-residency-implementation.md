# WL-1508B — Bounded health residency implementation

**Date:** 2026-09-06  
**Decision:** D-516 / spec 0005

The capability probe now requests a named internal `120s` idle residency. The compact probe
retains zero keep-alive. Production changes only that first request setting; both validations,
identity/address restrictions, shared deadline, concurrency slot and ordinary generation remain
unchanged. There is no cleanup request, retry, new timer, endpoint, configuration or dependency.

Fake-provider routing now recognizes synthetic schema shapes instead of assuming zero keep-alive.
Coverage asserts both emitted bodies and their order, ordinary generation without a residency
override, invalid capability output, malformed JSON, transport failure and cancellation at either
probe, address drift between probes, identity rejection before chat, and closed readiness.
The controlled-timer case retains the original overall deadline and slot, attempts a late schema
response, and verifies generation stays denied. Already-aborted follow-up health confirms slot
release without network work. Existing safe-error and profile checks remain.

Verification used pinned Node 24.18.0 and pnpm 11.20.0. Both
`WORKLEDGER_RUN_AI_EVALUATION` and `WORKLEDGER_RUN_SCHEMA_QUALIFICATION` were set to `0`:

- Scoped adapter run: 28/28 passed.
- Forced TypeScript project build: passed.
- Lint, workspace, phase-version, source-boundary and CSS contracts: passed.
- Combined unit/component/integration run: 539 passed, 52 gated skips. The command exited 1
  because two component workers timed out before starting (`application-shell` and `insights`).
- Targeted rerun of those two files with one worker: 72/72 passed, exit 0. Across the initial run
  and targeted recovery, all 611 executed tests passed; the initial worker errors remain recorded.
- Scoped TypeScript Prettier check and final `git diff --check`: passed.

No browser E2E, real-model suite, full product build or repository-wide formatting check was run
for this backend request-policy slice. Markdown review was scoped to the changed documentation.

These tests establish emitted policy and adapter behavior, not real unloading, erasure, runner
reuse or latency. Operations guidance now distinguishes finite idle expiry from verified cleanup.
Employee data retention, authorization, public contracts, UI and domain behavior are unchanged.

No real-model inference or deployment ran. Next is a separately continued cold synthetic health-only
attempt with exact candidate, ownership, firewall and empty-loaded-model preflight and the unchanged
120-second budget. It cannot automatically proceed into schema qualification or employee cases.
Fresh cold health plus 18-challenge qualification is separately gated before B's 9/9 then 9/9 screen.
WL-1508B remains open without D-515 real-model evidence; C/D remain open, historical K remains
complete for its old lifecycle, and provider deployment stays disabled at `0.16.0`.
