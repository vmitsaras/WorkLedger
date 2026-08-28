# Verify: Server owned employee Insight orchestration · spec 0001 · updated 2026-08-28

_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [ ] Run one Employee interpretation, then inspect the mocked provider request. Expect one exact
  registry execution before one provider request with `tools: []`. Expect the registry call to use
  the validated Insight kind and period, fixed `EMPLOYEE` workspace, authenticated identity, and
  trusted capture instant. → AC-1, AC-3
- [ ] Change the current Employee to inactive after the initial native read but before registry
  execution. Expect `403`, zero provider calls, zero completed registry executions in the trace,
  and no partial interpretation. → AC-2
- [ ] Return a fresh registry result that differs from the initial native read. Expect provider
  context and final validation to use only the fresh facts, sources, limitations, and actions. →
  AC-1, AC-3, AC-4
- [ ] Vary the account locale and authorized references, including a result with no optional action
  or limitation references. Expect the output schema to fix the locale and safe prose, allow only
  current references, preserve contract cardinality, and require empty optional arrays with
  `maxItems: 0`. → AC-3
- [ ] Return an unexpected model tool call, unknown or duplicate references, a missing material
  limitation, a wrong source union, or prose outside the locale allowlist. Expect safe rejection,
  unchanged native evidence, and no weakened runtime validation. → AC-4
- [ ] Inspect success, registry failure, cancellation, timeout, busy, invalid output, unavailable,
  rate, and concurrency traces. Expect content free fields only. A success has one registry
  execution and zero model tool rounds. A registry failure has zero completed executions. → AC-5,
  AC-6
- [ ] Confirm the next model screen names only exact qualified `qwen2.5-coder:14b` digest
  `9ec8897f747e246e970bc5cfdda85d22f1123dc2e3d34978a010a75968716849`.
  Confirm no other model, tag, or digest is made eligible. → AC-8

## Commands

- [ ] `pnpm exec vitest run apps/api/test/employee-insight-interpretation.unit.test.ts` → 16 focused
  orchestration cases pass, covering exact call selection, fresh context, schema bounds, runtime
  validation, trace values, cancellation, provider failure, and no retry. → AC-1, AC-3, AC-4,
  AC-5, AC-6
- [ ] `pnpm db:test` → the canonical PostgreSQL suite passes, including current scope loss between
  the initial read and registry execution with zero provider calls. → AC-2, AC-7
- [ ] `pnpm verify` → configuration, reproducible OpenAPI, formatting, lint, TypeScript, unit,
  integration, browser, accessibility, internationalization, bundle, and build gates pass without
  changing the endpoint, browser flow, database schema, runtime configuration, or provider health
  contract. → AC-6, AC-7
- [ ] `git diff --check` → no whitespace errors. Inspect `git diff --name-only` and confirm there is
  no model artifact, evaluator output, migration, manifest, dependency, environment, or provider
  configuration change. Do not run `pnpm test:ai:employee`. → AC-7, AC-8

## Acceptance criteria coverage

- AC-1 is covered by the exact registry call, fresh result, and focused orchestration steps.
- AC-2 is covered by the inactive Employee and PostgreSQL scope loss steps.
- AC-3 is covered by the tool free request, fresh context, locale, reference, prose, and empty array
  schema steps.
- AC-4 is covered by the malformed and ungrounded provider output steps.
- AC-5 is covered by the content free success and failure trace steps.
- AC-6 is covered by provider failure, cancellation, rate, concurrency, configuration, and full
  repository checks.
- AC-7 is covered by the PostgreSQL and full compatibility gates.
- AC-8 is covered by the exact candidate review and explicit no real model boundary.
