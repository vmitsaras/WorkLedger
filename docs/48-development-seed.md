# Deterministic Development Seed

`WL-307` adds an explicit, local-only Northstar Studio seed for development, integration tests, and
later portfolio workflows. Production startup never invokes it, and the seed service rejects
`production` mode. In development mode it additionally requires a loopback PostgreSQL host and the
exact `workledger_dev` database name.

## Run it

Start PostgreSQL and invoke the seed explicitly:

```sh
pnpm with 11.20.0 run db:up
pnpm with 11.20.0 run db:seed:development
```

The command uses the dedicated local `workledger_migrator` credentials, applies committed
migrations, and inserts all seed rows in one transaction. The Compose initialization grants the
normal `workledger_app` role data access to tables created by that migrator. A repeated command
validates the stable seed identity and returns `ALREADY_PRESENT`; it does not duplicate or rewrite
history. If the expected seed is only partially present or has drifted, the command stops.

`WORKLEDGER_POSTGRES_PORT` changes the default local port. A non-default local migrator URL may be
supplied through `WORKLEDGER_MIGRATION_DATABASE_URL`; do not use the normal application credential
for migrations.

The explicit destructive local reset remains `pnpm run db:reset`. No automatic demo reset is added;
the safe portfolio demo-reset workflow remains owned by `WL-1301`.

## Development credentials

All active accounts use this shared, development-only password:

```text
Northstar-Demo-2026!
```

| Persona | Email | Role/story |
|---|---|---|
| Emma Reed | `emma@northstar.test` | Employee; positive balance, varied attendance, approved vacation |
| Leon Papas | `leon@northstar.test` | Part-time employee; negative time balance and pending vacation |
| Sofia Marin | `sofia@northstar.test` | Employee; effective schedule change and half-day vacation |
| Daniel Cole | `daniel@northstar.test` | Employee; forgotten clock-out and correction history |
| Mina Georgiou | `mina@northstar.test` | Employee; reported sickness and privacy-minimized locked snapshot |
| Alex Morgan | `alex@northstar.test` | Current manager for Emma, Leon, Sofia, Daniel, and Mina |
| Priya Shah | `priya@northstar.test` | HR administrator with a reasoned balance adjustment |
| Nora Blake | `nora@northstar.test` | Former manager with historical attribution but no current report scope |
| Sam Rivera | `sam@northstar.test` | Technical-only system administrator with no employee link |
| Owen Ford | `owen@northstar.test` | Deactivated account/employee with preserved locked history |

These credentials are public test data, never production defaults. The password is stored only as
a Better Auth-compatible scrypt hash in PostgreSQL and is not printed by the seed command.

Emma is the default interactive attendance persona. Her deterministic history ends in a completed
session and her attendance head starts `OFF_WORK`, so a freshly seeded installation can exercise
Clock in, Start break, Resume, and Clock out against the trusted current server time.

## Deterministic scenario anchor

The canonical calculation anchor is Monday `2026-02-02` in `Europe/Athens`. Stable opaque UUIDs,
dates, instants, fingerprints, and source IDs make fresh seed results reproducible. The data covers:

- full-time, part-time, zero-hour Friday, and mid-month effective schedule change;
- normal, positive, negative, multiple-session, overnight, spring/fall DST, holiday-work,
  forgotten-clock-out, working, and on-break attendance states;
- complete and incomplete daily projections, a posted zero-minute daily delta, an unlocked
  recalculation delta, posted/projected balance evidence, and a privileged reasoned adjustment;
- approved, pending, half-day, sickness, unpaid, and partially cancelled absence histories with
  reservation, deduction, restoration, credit, and expected-reduction minutes;
- pending and rejected corrections;
- open, submitted, and locked monthly periods, deactivated-employee history, a neutral
  sickness-safe snapshot, and a post-lock adjustment; and
- domain audit evidence for role change, correction, approval, lock, export, and balance adjustment,
  plus separate technical account-deactivation evidence.

The seed is representative persistence evidence, not a substitute for later application-service,
API, accessibility, concurrency, and workflow tests. It does not make not-yet-built screens or
commands operational.

## Verification

PostgreSQL integration tests create two independent migrated schemas and compare deterministic
scenario summaries. They also prove repeat safety, fixed credential validity, current/former manager
history, Leon's exact entitlement ledger, sickness-field absence from the monthly snapshot, drift
rejection, and the production/non-local target guards.
