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
const EXPORT_STORAGE_PATH = process.env['WORKLEDGER_EXPORT_STORAGE'] ?? '/tmp/workledger-exports';

/**
 * Create a user data export request and generate the ZIP artifact synchronously.
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
    await tx.retention.createExportRequest({
      id: exportId,
      employeeId,
      organizationId,
      requestedAt: requestedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      includeAttendance: request.includeAttendance,
      includeAbsence: request.includeAbsence,
      includeBalances: request.includeBalances,
      includeRequests: request.includeRequests,
      ...(request.startDate !== undefined ? { startDate: request.startDate } : {}),
      ...(request.endDate !== undefined ? { endDate: request.endDate } : {}),
    });
  });

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
    await tx.retention.updateExportArtifact(
      exportId,
      new Date().toISOString(),
      artifactPath,
      sizeBytes,
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

    database
      .transaction(async (tx) => {
        try {
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

          if (request.includeAttendance) {
            const punches = await tx.retention.queryPunchEvents(
              employeeId,
              request.startDate,
              request.endDate,
            );
            archive.append(JSON.stringify({ punches }, null, 2), {
              name: 'attendance/punches.json',
            });
          }

          if (request.includeAbsence) {
            const absenceRequests = await tx.retention.queryAbsenceRequests(
              employeeId,
              request.startDate,
              request.endDate,
            );
            archive.append(JSON.stringify({ absenceRequests }, null, 2), {
              name: 'absence/requests.json',
            });
          }

          if (request.includeBalances) {
            const timeAccountEntries = await tx.retention.queryTimeAccountEntries(
              employeeId,
              request.startDate,
              request.endDate,
            );
            archive.append(JSON.stringify({ timeAccountEntries }, null, 2), {
              name: 'balances/time-account.json',
            });

            const leaveEntitlementEntries = await tx.retention.queryLeaveEntitlementEntries(
              employeeId,
              request.startDate,
              request.endDate,
            );
            archive.append(JSON.stringify({ leaveEntitlementEntries }, null, 2), {
              name: 'balances/leave-entitlements.json',
            });
          }

          if (request.includeRequests) {
            const correctionRequests = await tx.retention.queryCorrectionRequests(
              employeeId,
              request.startDate,
              request.endDate,
            );
            archive.append(JSON.stringify({ correctionRequests }, null, 2), {
              name: 'requests/corrections.json',
            });
          }

          await archive.finalize();
        } catch (error) {
          reject(error);
        }
      })
      .catch(reject);
  });
}

/**
 * Purge expired user export artifacts and their filesystem files.
 */
export async function purgeExpiredExports(database: WorkLedgerDatabase): Promise<number> {
  const now = new Date().toISOString();

  const paths = await database.transaction((tx) => tx.retention.findExpiredExportPaths(now));

  const fs = await import('node:fs/promises');
  for (const artifactPath of paths) {
    try {
      await fs.unlink(artifactPath);
    } catch {
      // Artifact may have already been deleted; continue
    }
  }

  return database.transaction((tx) => tx.retention.deleteExpiredExports(now));
}
