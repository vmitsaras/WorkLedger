import { fileURLToPath } from 'node:url';

import { createPostgresSchemaFixture } from '@workledger/test-utils';

const packageDirectory = fileURLToPath(new URL('..', import.meta.url));
const migrationFiles = [
  '0000_initial_schema.sql',
  '0001_integrity_constraints.sql',
  '0002_auth_foundation.sql',
  '0003_authorization_foundation.sql',
  '0004_audit_foundation.sql',
  '0005_idempotency_foundation.sql',
  '0006_zero_daily_delta.sql',
  '0007_correction_request_snapshots.sql',
  '0008_nappy_bromley.sql',
  '0009_married_justin_hammer.sql',
  '0010_broad_sunfire.sql',
  '0011_nasty_red_hulk.sql',
  '0012_silly_magik.sql',
] as const;

export type MigratedPostgresFixture = Awaited<ReturnType<typeof createMigratedPostgresFixture>>;

export function createMigratedPostgresFixture(connectionString: string, label: string) {
  return createPostgresSchemaFixture({
    connectionString,
    label,
    migrationFiles: migrationFiles.map(
      (migrationFile) => `${packageDirectory}/migrations/${migrationFile}`,
    ),
  });
}
