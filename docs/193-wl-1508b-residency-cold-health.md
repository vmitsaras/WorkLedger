# WL-1508B — D-516 cold synthetic health evidence

**Date:** 2026-09-06

The user's continuation authorized one cold synthetic health-only attempt under spec 0005.
It passed in 25,828 ms with status `ready`, all three required capabilities and null reason code.
No employee case, standalone qualification challenge, retry or tuning ran. This is health evidence,
not D-515 employee semantic acceptance or fresh 18-challenge qualification.

The clean starting revision was `6cab193955072639218be81e6e996484d17933c1`.
Pinned Node 24.18.0/pnpm 11.20.0 workspace, phase-version and forced TypeScript build checks passed.
Both evaluation flags remained zero. The ignored bounded runner invoked the compiled application
adapter's `checkHealth()` exactly once with the unchanged 120,000 ms deadline, one concurrency
slot and profile `ollama-0333-qwen36-schema-v1`. No production configuration changed.

Before startup, all three portable executable hashes and valid signatures matched report 189;
model manifest `07d35212591fc27746f0a317c975a6d68754fb38e9053d82e25f06057af28522`
and configuration `5d1c86a949f7f3b5e75370e129765af7526f0cc1812a9de21a541da042596faa`
matched. All three exact executable outbound-block rules were active for all profiles/addresses,
and all firewall profiles were enabled. No portable process or port 11435 listener existed;
the installed server's loaded-model list was empty.

The owned portable server started hidden with a cleaned Ollama/proxy environment, cloud disabled,
request debugging disabled and one inference slot. Its sole server listener was verified as
127.0.0.1:11435 owned by PID 69236. API version 0.33.3, exact qwen3.6:latest digest and an empty
loaded-model list passed immediately before health. The run lasted from 14:15:40.910 to
14:16:06.741 UTC. Ordinary access logs record the two successful health chats at 20.819 and
4.707 seconds. First-probe 120-second idle residency and second-probe zero keep-alive came from
the unchanged D-516 adapter. Six source/compiled-module hashes matched after the run; final API
identity passed and `/api/ps` reported zero loaded models. This point-in-time observation does not
prove secure erasure or guarantee future latency.

Evidence directory:
`output/insights/wl1508b-residency-health-ff73e36c-99ee-48fc-aa17-57acc36aae84`.

| Evidence | SHA-256 |
| --- | --- |
| `health.json` | `b981ef9843d85de5d127f3b68e60244a61a8328fc724ea99d4b020111f1cc9df` |
| `cleanup.json` | `4f223af059138e413c53d280dab793e3575f17350168590926cd7a63825c4d92` |

The directory also retains startup/process metadata, source hashes and ordinary server lifecycle
logs. No request/response body, employee context or raw model output was retained. After rechecking
the executable, command line and listener ownership, exact-PID tree cleanup stopped server 69236
and child 68920. Final checks found zero portable processes, no port 11435 listener, no installed
server loaded models and unchanged firewall protection. The installed server was left running.

Only evidence and project memory changed. No UI/accessibility, domain, authorization, database,
dependency, phase or version change occurred. No deterministic suite was repeated beyond workspace
and compilation checks; report 192 retains implementation verification. Final diff checks passed.

Next: separately continued fresh schema qualification, beginning cold with mandatory health and
then all 18 fixed challenges under spec 0005's existing stop rules. This health-only authorization
does not cover that suite. Only successful fresh qualification permits separately continued B's
submission-actions 9/9 then today-posted 9/9. B/C/D remain open; historical K remains complete for
its original lifecycle. Provider deployment remains disabled at `0.16.0`.
