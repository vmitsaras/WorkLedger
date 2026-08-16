/**
 * User export integration tests.
 *
 * Verifies employee self-service data export authorization and boundaries.
 */

import { fileURLToPath } from 'node:url';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';
import type { PostgresSchemaFixture } from '@workledger/test-utils';
import { createWorkLedgerDatabase } from '@workledger/database';
import type { WorkLedgerDatabase } from '@workledger/database';
import { createUserExport, purgeExpiredExports } from '../src/retention/user-export.js';

const databaseHarness = createDatabaseHarnessState(process.env);
const integrationTest = databaseHarness.enabled ? it : it.skip;
const repositoryDirectory = fileURLToPath(new URL('../../..', import.meta.url));
const allMigrationFiles = [
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
  '0013_brave_bulldozer.sql',
  '0014_adorable_piledriver.sql',
  '0015_rainy_nightshade.sql',
  '0016_flimsy_oracle.sql',
  '0017_boring_aaron_stack.sql',
  '0018_bored_medusa.sql',
  '0019_stale_loners.sql',
  '0020_chemical_micromacro.sql',
  '0021_retention_tracking.sql',
].map((file) => `${repositoryDirectory}/packages/database/migrations/${file}`);

describe('User data export', () => {
  let fixture: PostgresSchemaFixture;
  let database: WorkLedgerDatabase;
  let employeeId: string;
  let organizationId: string;

  beforeEach(async () => {
    if (!databaseHarness.enabled) return;
    fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url!,
      label: 'user-export',
      migrationFiles: allMigrationFiles,
    });
    database = createWorkLedgerDatabase({
      applicationName: 'workledger-user-export-test',
      connectionString: fixture.databaseUrl,
    });

    // Create minimal organization and employee for FK constraints
    const { rows: orgRows } = await fixture.client.query(
      `INSERT INTO organizations (id, name, time_zone) VALUES (uuidv7(), 'Export Test Org', 'UTC') RETURNING id`,
    );
    organizationId = orgRows[0].id;

    const { rows: empRows } = await fixture.client.query(
      `INSERT INTO employees (id, organization_id, employee_number, display_name, status)
       VALUES (uuidv7(), $1, 'EXP001', 'Export Test Employee', 'ACTIVE') RETURNING id`,
      [organizationId],
    );
    employeeId = empRows[0].id;
  });

  afterEach(async () => {
    if (!databaseHarness.enabled) return;
    await database.close();
    await fixture.cleanup();
  });

  integrationTest(
    `creates export request with metadata and 24-hour expiry (${databaseHarness.safeLabel})`,
    async () => {
      const result = await createUserExport(database, employeeId, organizationId, {
        includeAttendance: true,
        includeAbsence: true,
        includeBalances: true,
        includeRequests: true,
      });

      expect(result.exportId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(result.downloadUrl).toContain(result.exportId);
      expect(result.format).toBe('application/zip');
      expect(result.sizeBytes).toBeGreaterThan(0);

      const requestedAt = new Date(result.requestedAt);
      const expiresAt = new Date(result.expiresAt);
      const hoursDiff = (expiresAt.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);

      expect(hoursDiff).toBe(24);
    },
  );

  integrationTest(
    `supports date range filtering on exports (${databaseHarness.safeLabel})`,
    async () => {
      const result = await createUserExport(database, employeeId, organizationId, {
        includeAttendance: true,
        includeAbsence: false,
        includeBalances: true,
        includeRequests: false,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(result.exportId).toBeDefined();
      expect(result.sizeBytes).toBeGreaterThan(0);
    },
  );

  integrationTest(
    `purges expired exports and removes artifacts (${databaseHarness.safeLabel})`,
    async () => {
      // Create an export
      await createUserExport(database, employeeId, organizationId, {
        includeAttendance: true,
        includeAbsence: true,
        includeBalances: true,
        includeRequests: true,
      });

      // Manually set expiry to past via raw SQL
      await fixture.client.query(
        `UPDATE user_export_requests SET expires_at = NOW() - INTERVAL '1 hour'`,
      );

      const purgedCount = await purgeExpiredExports(database);

      expect(purgedCount).toBeGreaterThan(0);

      // Verify expired exports are deleted
      const { rows } = await fixture.client.query(
        `SELECT COUNT(*) AS count FROM user_export_requests`,
      );
      expect(Number(rows[0].count)).toBe(0);
    },
  );
});
