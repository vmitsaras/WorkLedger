import { useState } from 'react';

import type {
  ReportCatalogItem,
  ReportExportRequest,
  ReportQuery,
  ReportResult,
} from '@workledger/contracts';
import { Button } from '@workledger/ui';

import { ApiClientError, exportReportCsv, type ReportCsvDownload } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

type PortabilityStatus = Readonly<{ kind: 'ERROR' | 'SUCCESS'; message: string }>;

export function ReportPortabilityActions({
  data,
  query,
  refresh,
  report,
}: Readonly<{
  data: ReportResult;
  query: ReportQuery;
  refresh: () => Promise<ReportResult>;
  report: ReportCatalogItem;
}>) {
  const [exportPending, setExportPending] = useState(false);
  const [copyPending, setCopyPending] = useState(false);
  const [status, setStatus] = useState<PortabilityStatus>();

  const exportCsv = async () => {
    setExportPending(true);
    setStatus(undefined);
    try {
      const download = await exportReportCsv(data.key, exportRequest(query));
      startDownload(download);
      setStatus({
        kind: 'SUCCESS',
        message:
          'CSV download started. Formula-significant text was prefixed with an apostrophe before CSV quoting.',
      });
    } catch (error) {
      setStatus({ kind: 'ERROR', message: portabilityErrorMessage(error, 'CSV') });
    } finally {
      setExportPending(false);
    }
  };

  const copySummary = async () => {
    setCopyPending(true);
    setStatus(undefined);
    try {
      const refreshed = await refresh();
      if (navigator.clipboard?.writeText === undefined) {
        throw new Error('Clipboard access is unavailable.');
      }
      await navigator.clipboard.writeText(reportSummaryText(report.title, refreshed));
      setStatus({
        kind: 'SUCCESS',
        message: 'Report summary copied. No table rows or hidden fields were copied.',
      });
    } catch (error) {
      setStatus({ kind: 'ERROR', message: portabilityErrorMessage(error, 'summary copy') });
    } finally {
      setCopyPending(false);
    }
  };

  return (
    <section
      aria-labelledby="report-portability-heading"
      className="grid gap-4 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-4"
    >
      <div>
        <h3 id="report-portability-heading" className="m-0 text-lg font-bold">
          Export and copy
        </h3>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          CSV includes all matching authorized rows and these fields: {includedFields(data.key)}. It
          omits internal identifiers, absence subtype, sickness classification, notes, reasons,
          reviewer comments, and hidden columns.
        </p>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          Copy summary writes only the visible date range, permission scope, full row count, and
          summary values. It never copies table rows automatically.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button isDisabled={exportPending || copyPending} onPress={() => void exportCsv()}>
          {exportPending ? 'Exporting CSV…' : 'Export CSV'}
        </Button>
        <Button
          isDisabled={exportPending || copyPending}
          onPress={() => void copySummary()}
          variant="secondary"
        >
          {copyPending ? 'Copying summary…' : 'Copy report summary'}
        </Button>
      </div>
      <p
        aria-label="Report portability status"
        aria-atomic="true"
        aria-live="polite"
        className={`m-0 min-h-6 text-sm font-semibold ${
          status?.kind === 'ERROR' ? 'text-[var(--wl-danger)]' : 'text-[var(--wl-text-muted)]'
        }`}
        role="status"
      >
        {status?.message ?? ''}
      </p>
    </section>
  );
}

function exportRequest(query: ReportQuery): ReportExportRequest {
  return Object.freeze({
    direction: query.direction,
    ...(query.employeeId === undefined ? {} : { employeeId: query.employeeId }),
    from: query.from,
    sort: query.sort,
    to: query.to,
  });
}

function startDownload(download: ReportCsvDownload): void {
  const objectUrl = URL.createObjectURL(download.blob);
  const link = document.createElement('a');
  link.download = download.filename;
  link.href = objectUrl;
  link.rel = 'noopener';
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    queueMicrotask(() => URL.revokeObjectURL(objectUrl));
  }
}

function reportSummaryText(title: string, data: ReportResult): string {
  return [
    title,
    `Date range: ${formatLocalDate(data.range.from)} through ${formatLocalDate(data.range.to)}`,
    `Scope: ${scopeLabel(data.scope)}`,
    `Matching rows: ${data.pagination.total.toString()}`,
    ...summaryLines(data),
  ].join('\n');
}

function summaryLines(data: ReportResult): readonly string[] {
  switch (data.summary.kind) {
    case 'MONTHLY_TIME':
      return [
        `Expected: ${formatDuration(data.summary.expectedMinutes)}`,
        `Worked: ${formatDuration(data.summary.workedMinutes)}`,
        `Credited: ${formatDuration(data.summary.creditedMinutes)}`,
        `Balance: ${formatDuration(data.summary.balanceMinutes, true)}`,
        `Post-lock change: ${formatDuration(data.summary.postLockDeltaMinutes, true)}`,
        `Incomplete records: ${data.summary.incompleteRecordCount.toString()}`,
      ];
    case 'FLEXIBLE_TIME':
      return [
        `Opening balance: ${formatDuration(data.summary.openingBalanceMinutes, true)}`,
        `Range change: ${formatDuration(data.summary.rangeChangeMinutes, true)}`,
        `Closing balance: ${formatDuration(data.summary.closingBalanceMinutes, true)}`,
      ];
    case 'LEAVE':
      return [
        `Opening available: ${formatDuration(data.summary.openingAvailableMinutes, true)}`,
        `Available change: ${formatDuration(data.summary.availableChangeMinutes, true)}`,
        `Closing available: ${formatDuration(data.summary.closingAvailableMinutes, true)}`,
        `Reserved: ${formatDuration(data.summary.reservedMinutes)}`,
        `Projected remaining: ${formatDuration(data.summary.projectedRemainingMinutes, true)}`,
      ];
    case 'MISSING_RECORD':
      return [`Incomplete records: ${data.summary.recordCount.toString()}`];
    case 'PENDING_APPROVAL':
      return [`Actionable approvals: ${data.summary.itemCount.toString()}`];
  }
}

function includedFields(key: ReportResult['key']): string {
  return {
    'flexible-time': 'employee name and opening, range-change, and closing minutes',
    leave:
      'employee name, leave-account label, available changes, reservations, and projected minutes',
    'missing-records': 'employee name, date, status, expected/worked minutes, and warning codes',
    'monthly-time':
      'employee name, month, workflow status, expected/worked/credited/balance minutes, incomplete count, and post-lock delta',
    'pending-approvals':
      'employee name, broad workflow category, affected dates, and submitted instant',
  }[key];
}

function scopeLabel(scope: ReportResult['scope']): string {
  return {
    ORGANIZATION: 'organization',
    REPORTS: 'current direct reports',
    SELF: 'your own records',
    SELF_AND_REPORTS: 'your own records and current direct reports',
  }[scope];
}

function portabilityErrorMessage(error: unknown, action: 'CSV' | 'summary copy'): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ACCESS_DENIED') {
      return `Your report scope changed. The ${action} was not completed.`;
    }
    if (error.code === 'REPORT_EXPORT_TOO_LARGE') {
      return 'The CSV is too large. Narrow the date range or select one authorized employee.';
    }
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED') {
      return `Your session ended. The ${action} was not completed.`;
    }
  }
  return `The ${action} failed. Nothing new was written to the download or clipboard.`;
}
