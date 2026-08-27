# WL 1505 Read Only Insight Tool Registry

**Task:** `WL-1505`  
**Date:** 2026-08-27  
**Decision:** `docs/adr/0014-deterministic-insights-and-local-ai-boundary.md`  
**Runtime changes:** Strict tool contracts and an internal API registry only

## Outcome

WorkLedger now has one internal registry for the four Employee Insight tools. Each definition owns
one stable code, one strict argument schema, one purpose, one active workspace, current authority
metadata, exact result fields, source and output allowlists, sensitivity and private model exposure
metadata, freshness rules, execution limits, and an explicit external adapter denial.

Tool schemas use the explicit `@workledger/contracts/insight-tools` entry point. Repository checks
allow that entry point only from the API, so provider tooling cannot silently enter the browser
graph. The existing `@workledger/contracts/insights` browser entry point remains unchanged.

Every execution converts validated tool arguments into one existing Employee Insight request and
runs it through the repeatable read Insight Service. The service reloads current PostgreSQL account,
employee, role, organization, and permission facts for each call. A prior native result, prior tool
success, combined role, browser state, or future model choice cannot authorize another execution.

This task adds no provider, model request, network path, endpoint, database table, migration,
dependency, write action, audit event, log content, prompt store, conversation store, or external
tool surface.

## Registered tools

| Code | Strict arguments | Current purpose and scope | Result sources |
| --- | --- | --- | --- |
| `employee_balance_change` | `startDate` and `endDate`, at most 366 inclusive calendar days | Explain the current employee self balance change | Time account ledger and eligible daily time records |
| `employee_leave_projection` | One date | Explain the current employee self leave projection | Purpose limited leave entitlement ledgers with the configured account label only |
| `employee_submission_blockers` | One first of month date | Explain the current employee self monthly submission blockers | Monthly period, bounded daily records, and personal request source categories |
| `employee_today_explanation` | One date | Explain the current employee self Today result | Today attendance and posted time account ledger |

Every tool is read only and accepts only the Employee workspace. Manager, HR, and System workspace
calls are denied because their later purpose specific tools have not passed their named gates. The
schema has no account, employee, organization, role, employee collection, field list, raw filter,
SQL, query text, file, network, shell, or mutation argument.

## Deny By Default Registry Contract

Each definition records the exact existing employee target action or actions that the Insight
Service must authorize with `SELF` scope. It also records the native Insight kind, allowed fact,
limitation, source, action, and freshness codes, maximum collection sizes, and all required native
result fields. The registry validates the complete result again after service execution. A wrong
kind, period, capture instant, scope, source pair, optional source label, fact code, limitation code,
action pair, freshness boundary, or collection limit becomes a safe internal failure with no
partial result.

External adapter exposure is `DENIED` for every definition. Private local model exposure is metadata
only. `WL-1506` still owns provider configuration and capability checks, and `WL-1507` still owns
interpretation orchestration. This registry does not make a provider call and does not authorize an
MCP adapter.

## Security and Data

The successful combined role database fixture uses one account with Employee, Manager, and HR
roles. Employee workspace execution returns only current `SELF` scope. The same employee tool is
denied in Manager workspace before the handler runs. Employee deactivation and account revocation
are observed on the next tool call because each execution enters the existing current authority
transaction again.

Unknown tool codes fail closed. A known code with malformed or excess arguments fails strict
validation. Globally valid native output that falls outside the selected tool purpose is rejected.
Only the leave projection tool permits a configured source label, and no tool permits protected
identifiers or stored free text.

## Accessibility

There is no rendered interface change. Tool results remain the same typed native facts, explicit
qualifiers, freshness boundaries, sources, limitations, and actions used by the accessible Insights
route. A later interpretation layer can reference these values without parsing prose or replacing
the native result.

## Verification

The focused contract and registry tests pass. They cover all four schemas, the 366 day inclusive
range boundary, rejected authority and SQL shaped arguments, complete metadata, immutability,
request construction, workspace isolation, strict output allowlists, and safe failures.

The canonical PostgreSQL suite passes 15 files with 28 tests passed and one intentional historical
skip. Its Insight service fixture proves current authority on every registry execution and combined
role workspace isolation.

`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`,
`pnpm test:e2e`, `pnpm db:test`, and `pnpm build` pass. Repository tooling has 54 passing tests. The
unit and component suite has 436 passing tests across 54 files. The environment independent
integration suite has 13 passing tests and 48 database opted skips. Playwright has 48 passing tests
and one intentional historical screenshot skip. Source boundaries cover 334 files and 1,903
imports with no forbidden edge.

The production browser graph remains at the accepted foundation baseline. It contains 1,037,620
raw and 267,297 gzip JavaScript bytes plus 50,520 CSS bytes. The separate internationalization
runtime uses 95,620 raw and 12,297 gzip bytes. The registry and its schemas are absent from the
browser graph.

## Remaining Boundaries

`WL-1506` may now implement only the provider abstraction and private Ollama adapter. Provider mode
must remain disabled by default. No Ask My Ledger interpretation, manager tool, report builder, HR
aggregate, System Insight, MCP exposure, external provider, or write capability is enabled by this
task.
