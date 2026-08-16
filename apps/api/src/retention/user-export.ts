/**
 * User data export service.
 *
 * Implements employee self-service data export per docs/06-security-operations.md section 19.
 * Exports are authorized, bounded, expire automatically, and respect privacy boundaries.
 */

import type { WorkLedgerDatabase } from '@workledger/database';
import type { UserExportRequest, UserExportMetadataResponse } from '@workledger/contracts';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import archiver from 'archiver';

const EXPORT_EXPIRY_HOURS = 24;
const EXPORT_STORAGE_PATH = process.env.WORKLEDGER_EXPORT_STORAGE ?? '/tmp/workledger-exports';

/**
 * Create a user data export request.
 */
export async function createUserExport(
  database: WorkLedgerDatabase,
  employeeId: string,
  organizationId: string,
  request: UserExportRequest,
): Promise<UserExportMetadataResponse> {
  const exportId = randomUUID();
  const requestedAt = new Date();
  const expiresAt = new Date(requestedAt.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000);

  await database.transaction(async (tx) => {
    await tx.db.execute(
      `INSERT INTO user_export_requests 
       (id, employee_id, organization_id, requested_at, expires_at, 
        include_attendance, include_absence, include_balances, include_requests,
        start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        exportId,
        employeeId,
        organizationId,
        requestedAt.toISOString(),
        expiresAt.toISOString(),
        request.includeAttendance,
        request.includeAbsence,
        request.includeBalances,
        request.includeRequests,
        request.startDate ?? null,
        request.endDate ?? null,
      ],
    );
  });

  // Generate export asynchronously in production; for MVP, generate synchronously
  const artifactPath = await generateExportArtifact(
    database,
    exportId,
    employeeId,
    organizationId,
    request,
  );

  const stats = await import('node:fs/promises').then((fs) => fs.stat(artifactPath));
  const sizeBytes = stats.size;

  await database.transaction(async (tx) => {
    await tx.db.execute(
      `UPDATE user_export_requests 
       SET generated_at = $1, artifact_path = $2, size_bytes = $3
       WHERE id = $4`,
      [new Date().toISOString(), artifactPath, sizeBytes, exportId],
    );
  });

  return {
    exportId,
    requestedAt: requestedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    downloadUrl: `/v1/account/exports/${exportId}/download`,
    sizeBytes,
    format: 'application/zip',
  };
}

/**
 * Generate the export artifact as a ZIP containing JSON files.
 */
async function generateExportArtifact(
  database: WorkLedgerDatabase,
  exportId: string,
  employeeId: string,
  organizationId: string,
  request: UserExportRequest,
): Promise<string> {
  await mkdir(EXPORT_STORAGE_PATH, { recursive: true });
  const artifactPath = join(EXPORT_STORAGE_PATH, `${exportId}.zip`);

  const output = createWriteStream(artifactPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise<string>((resolve, reject) => {
    output.on('close', () => resolve(artifactPath));
    archive.on('error', reject);

    archive.pipe(output);

    database.transaction(async (tx) => {
      try {
        // Export metadata
        const metadata = {
          exportId,
          exportedAt: new Date().toISOString(),
          employeeId,
          organizationId,
          includedSections: {
            attendance: request.includeAttendance,
            absence: request.includeAbsence,
            balances: request.includeBalances,
            requests: request.includeRequests,
          },
          dateRange: {
            startDate: request.startDate ?? null,
            endDate: request.endDate ?? null,
          },
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'export-metadata.json' });

        // Export attendance data
        if (request.includeAttendance) {
          const punchesData = await exportPunches(tx, employeeId, request);
          archive.append(JSON.stringify(punchesData, null, 2), { name: 'attendance/punches.json' });
        }

        // Export absence data
        if (request.includeAbsence) {
          const absenceData = await exportAbsence(tx, employeeId, request);
          archive.append(JSON.stringify(absenceData, null, 2), { name: 'absence/requests.json' });
        }

        // Export balances
        if (request.includeBalances) {
          const timeBalanceData = await exportTimeBalance(tx, employeeId, request);
          archive.append(JSON.stringify(timeBalanceData, null, 2), {
            name: 'balances/time-account.json',
          });

          const leaveBalanceData = await exportLeaveBalance(tx, employeeId, request);
          archive.append(JSON.stringify(leaveBalanceData, null, 2), {
            name: 'balances/leave-entitlements.json',
          });
        }

        // Export requests/corrections
        if (request.includeRequests) {
          const correctionsData = await exportCorrections(tx, employeeId, request);
          archive.append(JSON.stringify(correctionsData, null, 2), {
            name: 'requests/corrections.json',
          });
        }

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function exportPunches(
  tx: any,
  employeeId: string,
  request: UserExportRequest,
): Promise<any> {
  const dateFilter = request.startDate && request.endDate
    ? `AND occurred_at >= $2 AND occurred_at < $3`
    : '';

  const params = request.startDate && request.endDate
    ? [employeeId, request.startDate, request.endDate]
    : [employeeId];

  const result = await tx.db.execute(
    `SELECT 
       event_type,
       occurred_at,
       recorded_at
     FROM punch_events
     WHERE employee_id = $1 ${dateFilter}
     ORDER BY occurred_at ASC`,
    params,
  );

  return {
    punches: result.rows.map((row: any) => ({
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      recordedAt: row.recorded_at,
    })),
  };
}

async function exportAbsence(
  tx: any,
  employeeId: string,
  request: UserExportRequest,
): Promise<any> {
  const dateFilter = request.startDate && request.endDate
    ? `AND submitted_at >= $2 AND submitted_at < $3`
    : '';

  const params = request.startDate && request.endDate
    ? [employeeId, request.startDate, request.endDate]
    : [employeeId];

  const result = await tx.db.execute(
    `SELECT 
       absence_type_code,
       status,
       submitted_at,
       notes
     FROM absence_requests
     WHERE employee_id = $1 ${dateFilter}
     ORDER BY submitted_at DESC`,
    params,
  );

  return {
    absenceRequests: result.rows.map((row: any) => ({
      absenceTypeCode: row.absence_type_code,
      status: row.status,
      submittedAt: row.submitted_at,
      notes: row.notes,
    })),
  };
}

async function exportTimeBalance(
  tx: any,
  employeeId: string,
  request: UserExportRequest,
): Promise<any> {
  const dateFilter = request.startDate && request.endDate
    ? `AND posted_at >= $2 AND posted_at < $3`
    : '';

  const params = request.startDate && request.endDate
    ? [employeeId, request.startDate, request.endDate]
    : [employeeId];

  const result = await tx.db.execute(
    `SELECT 
       entry_type,
       local_date,
       delta_minutes,
       running_balance_minutes,
       posted_at
     FROM time_account_ledger
     WHERE employee_id = $1 ${dateFilter}
     ORDER BY posted_at ASC`,
    params,
  );

  return {
    timeAccountEntries: result.rows.map((row: any) => ({
      entryType: row.entry_type,
      localDate: row.local_date,
      deltaMinutes: row.delta_minutes,
      runningBalanceMinutes: row.running_balance_minutes,
      postedAt: row.posted_at,
    })),
  };
}

async function exportLeaveBalance(
  tx: any,
  employeeId: string,
  request: UserExportRequest,
): Promise<any> {
  const dateFilter = request.startDate && request.endDate
    ? `AND posted_at >= $2 AND posted_at < $3`
    : '';

  const params = request.startDate && request.endDate
    ? [employeeId, request.startDate, request.endDate]
    : [employeeId];

  const result = await tx.db.execute(
    `SELECT 
       absence_type_code,
       entry_type,
       local_date,
       delta_minutes,
       running_balance_minutes,
       posted_at
     FROM leave_entitlement_ledger
     WHERE employee_id = $1 ${dateFilter}
     ORDER BY posted_at ASC`,
    params,
  );

  return {
    leaveEntitlementEntries: result.rows.map((row: any) => ({
      absenceTypeCode: row.absence_type_code,
      entryType: row.entry_type,
      localDate: row.local_date,
      deltaMinutes: row.delta_minutes,
      runningBalanceMinutes: row.running_balance_minutes,
      postedAt: row.posted_at,
    })),
  };
}

async function exportCorrections(
  tx: any,
  employeeId: string,
  request: UserExportRequest,
): Promise<any> {
  const dateFilter = request.startDate && request.endDate
    ? `AND submitted_at >= $2 AND submitted_at < $3`
    : '';

  const params = request.startDate && request.endDate
    ? [employeeId, request.startDate, request.endDate]
    : [employeeId];

  const result = await tx.db.execute(
    `SELECT 
       target_local_date,
       status,
       submitted_at,
       notes
     FROM correction_requests
     WHERE employee_id = $1 ${dateFilter}
     ORDER BY submitted_at DESC`,
    params,
  );

  return {
    correctionRequests: result.rows.map((row: any) => ({
      targetLocalDate: row.target_local_date,
      status: row.status,
      submittedAt: row.submitted_at,
      notes: row.notes,
    })),
  };
}

/**
 * Purge expired user export artifacts.
 */
export async function purgeExpiredExports(database: WorkLedgerDatabase): Promise<number> {
  const now = new Date();
  let purgedCount = 0;

  await database.transaction(async (tx) => {
    const result = await tx.db.execute<{ artifact_path: string }>(
      `SELECT artifact_path 
       FROM user_export_requests 
       WHERE expires_at < $1 AND artifact_path IS NOT NULL`,
      [now.toISOString()],
    );

    // Delete artifacts from filesystem
    const fs = await import('node:fs/promises');
    for (const row of result.rows) {
      try {
        await fs.unlink(row.artifact_path);
      } catch {
        // Artifact may have already been deleted; continue
      }
    }

    // Delete expired export requests
    const deleteResult = await tx.db.execute(
      `DELETE FROM user_export_requests WHERE expires_at < $1`,
      [now.toISOString()],
    );

    purgedCount = deleteResult.rowCount ?? 0;
  });

  return purgedCount;
}
