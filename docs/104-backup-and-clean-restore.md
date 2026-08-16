# 104. Encrypted backup and isolated clean restore

## Status and boundary

`WL-1004` supplies a host-operator procedure. It does not add a browser backup control or grant the
WorkLedger system-administrator application role host/database access. Backups contain the highest
sensitivity class in the system and must stay outside the repository and public application network.

## Create an encrypted backup

Create a host-only directory with mode `0700` and a separate encryption-key file containing at least
32 random bytes with mode `0600`. The key must not share the backup's storage or lifecycle. From the
checked-out application version that matches the running deployment, run:

```sh
pnpm run backup:create -- \
  --env-file /etc/workledger/workledger.env \
  --output-dir /srv/workledger-backups \
  --encryption-key-file /etc/workledger/secrets/backup_key \
  --retention-days 30 \
  --operator host-operator-01
```

The command streams a consistent PostgreSQL custom-format dump into a temporary `0600` file, then
publishes only an authenticated AES-256-GCM encrypted artifact and a `0600` JSON manifest. The
manifest contains no row data or secrets: it records application/schema version, timestamps,
explicit expiry/retention class, operator identifier, encryption profile, artifact size, checksum,
and access mode. A failed dump or encryption does not publish a manifest. Inventory the pair in the
deployment's restricted backup store, monitor command success, and delete both at `expiresAt` under
the deployment retention profile owned by `WL-1007`.

## Restore in quarantine

Copy `.env.restore.example` outside the repository and point it at a newly generated restore-only
PostgreSQL password. Use the original backup key through its separate protected channel. Do not use
production database, authentication, SMTP, or proxy secrets.

```sh
pnpm run backup:restore -- \
  --manifest /srv/workledger-backups/workledger-YYYYMMDDTHHMMSSZ.dump.enc.manifest.json \
  --encryption-key-file /etc/workledger/secrets/backup_key \
  --env-file /etc/workledger/restore.env
```

The restore model contains only PostgreSQL on an internal Docker network: it has no published port,
API, proxy, SMTP configuration, webhook, or outbound-capable network. The command rejects expired,
unrecognized, unencrypted, checksum-mismatched, or authentication-tag-invalid artifacts before
restore. It restores with `--no-owner --no-privileges`, deletes all restored sessions and reset/
invitation verification grants in the verification transaction, and checks foreign-key validation,
daily credited/balance equations, post-lock snapshot linkage/component totals, and content-free row
counts for organizations, employees, immutable punches, time/leave ledgers, snapshots, adjustments,
and both audit stores.

Do not attach an API or permit operator access until verification succeeds and the deployment owner
has installed entirely new application/authentication/database/SMTP secrets. Any later activation
must establish new sessions through normal authentication. Apply the `WL-1007` retention/minimization
job before activation whenever the restored point predates a completed purge.

## Evidence and cleanup

Record date, application/schema version, manifest identifier/checksum, declared expiry, duration,
operator identifier, each check's pass/fail result, recovery-point/time observations, and failures.
Never copy domain rows, credentials, query output containing personal data, or secret values into the
evidence. After recording evidence, remove the quarantine with the same explicit restore Compose
file and project:

```sh
docker compose --env-file /etc/workledger/restore.env -f infra/compose/restore.yml down --volumes
```

This deletes the disposable restored database volume; the encrypted source backup remains governed
by its manifest expiry. A failed or uncleaned restore, a missing/expired backup, or recovery results
outside deployment-owned objectives blocks production readiness.

