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
