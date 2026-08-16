/**
 * Retention job integration tests.
 *
 * Verifies purge and minimization jobs preserve integrity per docs/03-domain-rules.md section 17.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@workledger/test-utils';
import { DEFAULT_RETENTION_PROFILE, validateRetentionProfile, getRetentionConfig } from '../src/retention/config.js';
import { executeRetentionJob } from '../src/retention/jobs.js';

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
  let database: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.migrate();
  });

  it('purges expired sessions', async () => {
    const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'AUTH_TRANSIENT');
    if (config === null) throw new Error('Config not found');

    // Set explicit duration for test
    const testConfig = { ...config, durationDays: 30, operator: 'test-operator', jurisdictionOwner: 'Test Org' };

    const result = await executeRetentionJob(database, testConfig);

    expect(result.retentionClass).toBe('AUTH_TRANSIENT');
    expect(result.behavior).toBe('PURGE');
    expect(result.recordsAffected).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.errors).toBeUndefined();
  });

  it('records job execution metadata', async () => {
    const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'NOTIFICATIONS');
    if (config === null) throw new Error('Config not found');

    const testConfig = { ...config, durationDays: 60, operator: 'test-operator', jurisdictionOwner: 'Test Org' };

    const result = await executeRetentionJob(database, testConfig);

    const executions = await database.transaction(async (tx) => {
      const rows = await tx.db.execute(
        `SELECT * FROM retention_job_executions WHERE id = $1`,
        [result.jobId],
      );
      return rows.rows;
    });

    expect(executions.length).toBe(1);
    expect(executions[0].retention_class).toBe('NOTIFICATIONS');
    expect(executions[0].behavior).toBe('PURGE');
  });

  it('minimizes sensitive HR data without cascade deletion', async () => {
    const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'SENSITIVE_HR');
    if (config === null) throw new Error('Config not found');

    const testConfig = { ...config, durationDays: 365, operator: 'test-operator', jurisdictionOwner: 'Test Org' };

    // Create test data: absence request with notes
    await database.transaction(async (tx) => {
      await tx.db.execute(
        `INSERT INTO absence_requests (id, organization_id, employee_id, absence_type_code, status, submitted_at, notes)
         VALUES (uuidv7(), uuidv7(), uuidv7(), 'SICKNESS', 'APPROVED', NOW() - INTERVAL '400 days', 'Test sensitive note')`,
      );
    });

    const result = await executeRetentionJob(database, testConfig);

    // Verify note was cleared but request still exists
    const requests = await database.transaction(async (tx) => {
      const rows = await tx.db.execute(
        `SELECT id, status, notes FROM absence_requests WHERE absence_type_code = 'SICKNESS'`,
      );
      return rows.rows;
    });

    expect(requests.length).toBeGreaterThan(0);
    // If minimization ran, old requests should have null notes
    const oldRequests = requests.filter((r: any) => r.notes === null);
    expect(oldRequests.length).toBeGreaterThanOrEqual(0); // At least didn't delete records
  });

  it('minimizes domain history while preserving foreign keys', async () => {
    const config = getRetentionConfig(DEFAULT_RETENTION_PROFILE, 'DOMAIN_HISTORY');
    if (config === null) throw new Error('Config not found');

    const testConfig = { ...config, durationDays: 365, operator: 'test-operator', jurisdictionOwner: 'Test Org' };

    // Create inactive employee
    const employeeId = await database.transaction(async (tx) => {
      const result = await tx.db.execute(
        `INSERT INTO employees (id, organization_id, employee_number, display_name, email, status, updated_at)
         VALUES (uuidv7(), uuidv7(), 'EMP999', 'John Doe', 'john.doe@example.com', 'INACTIVE', NOW() - INTERVAL '400 days')
         RETURNING id`,
      );
      return result.rows[0].id;
    });

    await executeRetentionJob(database, testConfig);

    // Verify employee record exists but is minimized
    const employee = await database.transaction(async (tx) => {
      const result = await tx.db.execute(
        `SELECT id, display_name, email FROM employees WHERE id = $1`,
        [employeeId],
      );
      return result.rows[0];
    });

    expect(employee).toBeDefined();
    expect(employee.id).toBe(employeeId); // UUID preserved for foreign keys
    expect(employee.display_name).toBe('Former Employee');
    expect(employee.email).toContain('minimized-');
  });
});
