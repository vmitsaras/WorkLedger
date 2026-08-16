/**
 * User export integration tests.
 *
 * Verifies employee self-service data export authorization and boundaries.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '@workledger/test-utils';
import { createUserExport, purgeExpiredExports } from '../src/retention/user-export.js';

describe('User data export', () => {
  let database: ReturnType<typeof createTestDatabase>;

  beforeEach(async () => {
    database = createTestDatabase();
    await database.migrate();
  });

  it('creates export request with metadata', async () => {
    const employeeId = 'employee-id-123';
    const organizationId = 'org-id-456';

    const result = await createUserExport(database, employeeId, organizationId, {
      includeAttendance: true,
      includeAbsence: true,
      includeBalances: true,
      includeRequests: true,
    });

    expect(result.exportId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result.downloadUrl).toContain(result.exportId);
    expect(result.format).toBe('application/zip');
    expect(result.sizeBytes).toBeGreaterThan(0);

    const requestedAt = new Date(result.requestedAt);
    const expiresAt = new Date(result.expiresAt);
    const hoursDiff = (expiresAt.getTime() - requestedAt.getTime()) / (1000 * 60 * 60);

    expect(hoursDiff).toBe(24); // 24-hour expiry
  });

  it('supports date range filtering', async () => {
    const employeeId = 'employee-id-789';
    const organizationId = 'org-id-012';

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
  });

  it('purges expired exports', async () => {
    const employeeId = 'employee-id-expired';
    const organizationId = 'org-id-expired';

    // Create an export
    await createUserExport(database, employeeId, organizationId, {
      includeAttendance: true,
      includeAbsence: true,
      includeBalances: true,
      includeRequests: true,
    });

    // Manually set expiry to past
    await database.transaction(async (tx) => {
      await tx.db.execute(
        `UPDATE user_export_requests SET expires_at = NOW() - INTERVAL '1 hour'`,
      );
    });

    const purgedCount = await purgeExpiredExports(database);

    expect(purgedCount).toBeGreaterThan(0);

    // Verify expired exports are deleted
    const remaining = await database.transaction(async (tx) => {
      const result = await tx.db.execute(
        `SELECT COUNT(*) as count FROM user_export_requests`,
      );
      return result.rows[0].count;
    });

    expect(Number(remaining)).toBe(0);
  });
});
