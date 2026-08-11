# Attendance Idempotency Persistence

`WL-306` establishes the protected, transaction-scoped claim and terminal replay foundation for
later attendance command services. It does not expose a clock endpoint or move authorization,
CSRF, request validation, attendance transition, or audit ordering out of their accepted owners.

## Scope and protected key storage

Migration `0005_idempotency_foundation.sql` replaces the initial placeholder scope with the exact
organization, authenticated actor account, and protected-key uniqueness contract. Command is
stored for terminal evidence but is deliberately absent from the unique key, so reuse for another
attendance command becomes a fingerprint conflict rather than a second claim.

The row also records the resolved employee, canonical request fingerprint, command, original HTTP
status, typed semantic success/error snapshot, creation/completion instants, and terminal state.
The repository validates the raw key against `[A-Za-z0-9._~-]{16,128}` and sends only its lowercase
SHA-256 digest to PostgreSQL. It accepts only lowercase 64-character fingerprints. Raw keys and
fingerprints have no audit, URL, analytics, or logging path.

Organization/employee consistency is enforced by a composite foreign key. A state-shape check
requires claims to have no outcome/status/completion values and terminal rows to have all three.
A trigger permits exactly one claim-to-terminal update and rejects later updates and every delete.
Attendance idempotency records have no expiry in the MVP.

## Transaction repository

`transaction.attendanceIdempotency.claim()` performs an insert against the unique
organization/account/key scope:

- a new insert returns `CLAIMED` with an opaque record ID;
- an existing row with a different fingerprint returns only `CONFLICT`, without original command,
  body, fingerprint, or key detail; and
- an existing matching terminal row returns `REPLAY` with the original HTTP status and validated
  semantic snapshot.

PostgreSQL unique-index arbitration serializes concurrent matching inserts. A follower waits for
the winning transaction; after commit it loads the terminal record under `FOR UPDATE` and replays
it. If the winner rolls back, its claim and every source/audit effect disappear, allowing the same
key to claim normally on retry.

`complete()` requires the claim ID, command, and exact request fingerprint; validates that status,
command, and bounded outcome agree; and performs the only accepted terminal transition. Attendance
success snapshots contain only the command, server occurrence instant, ordered event IDs/types,
resulting state/revision, and valid actions. Error snapshots contain a stable code and optional
allowlisted recovery state, revision, valid actions, and break-confirmation flag. Unknown or
arbitrary payload fields are rejected.

The repository is available only inside `WorkLedgerDatabase.transaction()`. Later attendance
services must claim after current authentication, CSRF, employee capability, authorization, and
request validation, then lock/validate state and commit punches, one revision increment, one audit
event, and terminal completion in the same callback. Replay still follows fresh authorization and
creates no new audit event.

## Evidence and boundaries

PostgreSQL integration tests prove:

- same-key/same-fingerprint replay preserves status and semantic outcome;
- same organization/account/key with a changed command/fingerprint returns a detail-free conflict;
- matching concurrent requests produce one terminal row and one replay;
- one clock-in punch, attendance revision, audit event, and outcome commit atomically;
- rollback removes the claim so the same key may be claimed again;
- an incorrect completion fingerprint cannot terminate a claim;
- only the key digest is persisted;
- cross-organization employee scope is rejected; and
- completed rows reject update and delete.

No user interface changed. Later clock controls own pending text, disabled state, one result
announcement per intent, authoritative refetch, focus continuity, and offline/recovery behavior
from `docs/05-ux-accessibility.md`.
