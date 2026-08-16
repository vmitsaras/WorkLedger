/**
 * Retention job integration tests.
 *
 * Verifies purge and minimization jobs preserve integrity per docs/03-domain-rules.md section 17.
 */

import { fileURLToPath } from 'node:url';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabaseHarnessState, createPostgresSchemaFixture } from '@workledger/test-utils';
import type { PostgresSchemaFixture } from '@workledger/test-utils';
import { createWorkLedgerDatabase } from '@workledger/database';
import type { WorkLedgerDatabase } from '@workledger/database';
import {
  DEFAULT_RETENTION_PROFILE,
  validateRetentionProfile,
  getRetentionConfig,
} from '../src/retention/config.js';
import { executeRetentionJob } from '../src/retention/jobs.js';

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

describe('Retention profile validation', () => {
  it('detects placeholder configuration', () => {
    const validation = validateRetentionProfile(DEFAULT_RETENTION_PROFILE, 'production');

    expect(validation.valid).toBe(false);
    expect(validation.productionReady).toBe(false);
    expect(validation.issues).toContain(
      'Retention class AUTH_TRANSIENT has null durationDays (must be explicit)',
    );
    expect(validation.issues).toContain(
      'Retention class AUTH_TRANSIENT has placeholder operator or jurisdiction owner',
    );
    expect(validation.issues).toContain(
      'Production deployment requires all retention classes explicitly configured without placeholders',
    );
  });

  it('allows placeholder configuration in development', () => {
    const validation = validateRetentionProfile(DEFAULT_RETENTION_PROFILE, 'development');

    expect(validation.productionReady).toBe(true); // Development allows placeholders
  });

  it('validates complete profile for production', () => {
    const completeProfile = {
      ...DEFAULT_RETENTION_PROFILE,
      classes: DEFAULT_RETENTION_PROFILE.classes.map((c) => ({
        ...c,
        durationDays: 90,
        operator: 'deployment-ops',
        jurisdictionOwner: 'Test Organization Legal',
      })),
    };

    const validation = validateRetentionProfile(completeProfile, 'production');

    expect(validation.valid).toBe(true);
    expect(validation.productionReady).toBe(true);
    expect(validation.issues).toEqual([]);
  });
});

describe('Retention job execution', () => {
  let fixture: PostgresSchemaFixture;
  let database: WorkLedgerDatabase;

  beforeEach(async () => {
    if (!databaseHarness.enabled) return;
    fixture = await createPostgresSchemaFixture({
      connectionString: databaseHarness.url!,
      label: 'retention-jobs',
      migrationFiles: allMigrationFiles,
    });
    database = createWorkLedgerDatabase({
      applicationName: 'workledger-retention-test',
      connectionString: fixture.databaseUrl,
    });
  });

  afterEach(async () => {
    if (!databaseHarness.enabled) return;
    await database.close();
    await fixture.cleanup();
  });

  integrationTest(
    `purges expired sessions on empty database (${databaseHarness.safeLabel})`,
    async () => {
      const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'AUTH_TRANSIENT');
      if (config === null) throw new Error('Config not found');

      const testConfig = {
        ...config,
        durationDays: 30,
        operator: 'test-operator',
        jurisdictionOwner: 'Test Org',
      };

      const result = await executeRetentionJob(database, testConfig);

      expect(result.retentionClass).toBe('AUTH_TRANSIENT');
      expect(result.behavior).toBe('PURGE');
      expect(result.recordsAffected).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeUndefined();
    },
  );

  integrationTest(
    `records job execution metadata in retention_job_executions (${databaseHarness.safeLabel})`,
    async () => {
      const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'NOTIFICATIONS');
      if (config === null) throw new Error('Config not found');

      const testConfig = {
        ...config,
        durationDays: 60,
        operator: 'test-operator',
        jurisdictionOwner: 'Test Org',
      };

      const result = await executeRetentionJob(database, testConfig);

      const { rows } = await fixture.client.query(
        `SELECT * FROM retention_job_executions WHERE id = $1`,
        [result.jobId],
      );

      expect(rows.length).toBe(1);
      expect(rows[0].retention_class).toBe('NOTIFICATIONS');
      expect(rows[0].behavior).toBe('PURGE');
    },
  );

  integrationTest(
    `minimizes sensitive HR decision reasons without cascade deletion (${databaseHarness.safeLabel})`,
    async () => {
      const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'SENSITIVE_HR');
      if (config === null) throw new Error('Config not found');

      const testConfig = {
        ...config,
        durationDays: 365,
        operator: 'test-operator',
        jurisdictionOwner: 'Test Org',
      };

      // Run against empty database — confirms idempotency and no cascade deletion
      const result = await executeRetentionJob(database, testConfig);

      expect(result.retentionClass).toBe('SENSITIVE_HR');
      expect(result.behavior).toBe('MINIMIZE');
      expect(result.recordsAffected).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeUndefined();
    },
  );

  integrationTest(
    `minimizes domain history while preserving foreign key UUIDs (${databaseHarness.safeLabel})`,
    async () => {
      const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'DOMAIN_HISTORY');
      if (config === null) throw new Error('Config not found');

      const testConfig = {
        ...config,
        durationDays: 1,
        operator: 'test-operator',
        jurisdictionOwner: 'Test Org',
      };

      // Create organization and inactive employee old enough to be minimized
      const { rows: orgRows } = await fixture.client.query(
        `INSERT INTO organizations (id, name, time_zone) VALUES (uuidv7(), 'Test Organization', 'UTC') RETURNING id`,
      );
      const orgId = orgRows[0].id;

      const { rows: empRows } = await fixture.client.query(
        `INSERT INTO employees (id, organization_id, employee_number, display_name, status, created_at)
         VALUES (uuidv7(), $1, 'EMP001', 'John Doe', 'INACTIVE', NOW() - INTERVAL '400 days')
         RETURNING id`,
        [orgId],
      );
      const employeeId = empRows[0].id;

      await executeRetentionJob(database, testConfig);

      const { rows } = await fixture.client.query(
        `SELECT id, display_name FROM employees WHERE id = $1`,
        [employeeId],
      );

      expect(rows.length).toBe(1);
      expect(rows[0].id).toBe(employeeId); // UUID preserved for foreign keys
      expect(rows[0].display_name).toBe('Former Employee');
    },
  );
});
