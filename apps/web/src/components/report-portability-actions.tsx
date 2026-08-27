import { useState } from 'react';

import type {
  ReportCatalogItem,
  ReportExportRequest,
  ReportQuery,
  ReportResult,
} from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatNumber,
  type I18nRuntime,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button } from '@workledger/ui';

import { ApiClientError, exportReportCsv, type ReportCsvDownload } from '../app/api-client.js';

type PortabilityStatus = Readonly<{ kind: 'ERROR' | 'SUCCESS'; message: string }>;

const INCLUDED_FIELD_KEYS = Object.freeze({
  'flexible-time': 'manager.report.portability.fields.flexibleTime',
  leave: 'manager.report.portability.fields.leave',
  'missing-records': 'manager.report.portability.fields.missingRecords',
  'monthly-time': 'manager.report.portability.fields.monthlyTime',
  'pending-approvals': 'manager.report.portability.fields.pendingApprovals',
} as const satisfies Readonly<Record<ReportResult['key'], MessageKey>>);

const SCOPE_KEYS = Object.freeze({
  ORGANIZATION: 'output.clipboard.report.scope.organisation',
  REPORTS: 'output.clipboard.report.scope.currentDirectReports',
  SELF: 'output.clipboard.report.scope.self',
  SELF_AND_REPORTS: 'output.clipboard.report.scope.selfAndDirectReports',
} as const satisfies Readonly<Record<ReportResult['scope'], MessageKey>>);

const REPORT_TITLE_KEYS = Object.freeze({
  'flexible-time': 'output.clipboard.report.title.flexibleTime',
  leave: 'output.clipboard.report.title.leave',
  'missing-records': 'output.clipboard.report.title.missingRecords',
  'monthly-time': 'output.clipboard.report.title.monthlyTime',
  'pending-approvals': 'output.clipboard.report.title.pendingApprovals',
} as const satisfies Readonly<Record<ReportResult['key'], MessageKey>>);

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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();

  const exportCsv = async () => {
    setExportPending(true);
    setStatus(undefined);
    try {
      const download = await exportReportCsv(data.key, exportRequest(query));
      startDownload(download);
      setStatus({
        kind: 'SUCCESS',
        message: t('manager.report.portability.status.exportSuccess'),
      });
    } catch (error) {
      setStatus({ kind: 'ERROR', message: portabilityErrorMessage(error, 'csv', t) });
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
        throw new Error(t('manager.report.portability.error.clipboardUnavailable'));
      }
      await navigator.clipboard.writeText(
        reportSummaryText(t(REPORT_TITLE_KEYS[report.key]), refreshed, runtime, t),
      );
      setStatus({
        kind: 'SUCCESS',
        message: t('manager.report.portability.status.copySuccess'),
      });
    } catch (error) {
      setStatus({ kind: 'ERROR', message: portabilityErrorMessage(error, 'summaryCopy', t) });
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
          {t('manager.report.portability.heading')}
        </h3>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('manager.report.portability.description.csv', {
            fields: t(INCLUDED_FIELD_KEYS[data.key]),
          })}
        </p>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          {t('manager.report.portability.description.copy')}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button isDisabled={exportPending || copyPending} onPress={() => void exportCsv()}>
          {exportPending
            ? t('manager.report.portability.action.exportPending')
            : t('manager.report.portability.action.export')}
        </Button>
        <Button
          isDisabled={exportPending || copyPending}
          onPress={() => void copySummary()}
          variant="secondary"
        >
          {copyPending
            ? t('manager.report.portability.action.copyPending')
            : t('manager.report.portability.action.copy')}
        </Button>
      </div>
      <p
        aria-label={t('manager.report.portability.status.label')}
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

function reportSummaryText(
  title: string,
  data: ReportResult,
  runtime: I18nRuntime,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return [
    title,
    t('output.clipboard.report.line.dateRange', {
      from: formatDateOnly(runtime.locale, data.range.from, { dateStyle: 'full' }),
      to: formatDateOnly(runtime.locale, data.range.to, { dateStyle: 'full' }),
    }),
    t('output.clipboard.report.line.scope', { value: t(SCOPE_KEYS[data.scope]) }),
    t('output.clipboard.report.line.matchingRows', {
      value: formatNumber(runtime.locale, data.pagination.total),
    }),
    ...summaryLines(data, runtime, t),
  ].join('\n');
}

function summaryLines(
  data: ReportResult,
  runtime: I18nRuntime,
  t: ReturnType<typeof useWorkLedgerMessage>,
): readonly string[] {
  switch (data.summary.kind) {
    case 'MONTHLY_TIME':
      return [
        outputLine(t, 'expected', formatCompactDuration(runtime, data.summary.expectedMinutes)),
        outputLine(t, 'worked', formatCompactDuration(runtime, data.summary.workedMinutes)),
        outputLine(t, 'credited', formatCompactDuration(runtime, data.summary.creditedMinutes)),
        outputLine(t, 'balance', formatCompactDuration(runtime, data.summary.balanceMinutes, true)),
        outputLine(
          t,
          'postLockChange',
          formatCompactDuration(runtime, data.summary.postLockDeltaMinutes, true),
        ),
        outputLine(
          t,
          'incompleteRecords',
          formatNumber(runtime.locale, data.summary.incompleteRecordCount),
        ),
      ];
    case 'FLEXIBLE_TIME':
      return [
        outputLine(
          t,
          'openingBalance',
          formatCompactDuration(runtime, data.summary.openingBalanceMinutes, true),
        ),
        outputLine(
          t,
          'rangeChange',
          formatCompactDuration(runtime, data.summary.rangeChangeMinutes, true),
        ),
        outputLine(
          t,
          'closingBalance',
          formatCompactDuration(runtime, data.summary.closingBalanceMinutes, true),
        ),
      ];
    case 'LEAVE':
      return [
        outputLine(
          t,
          'openingAvailable',
          formatCompactDuration(runtime, data.summary.openingAvailableMinutes, true),
        ),
        outputLine(
          t,
          'availableChange',
          formatCompactDuration(runtime, data.summary.availableChangeMinutes, true),
        ),
        outputLine(
          t,
          'closingAvailable',
          formatCompactDuration(runtime, data.summary.closingAvailableMinutes, true),
        ),
        outputLine(t, 'reserved', formatCompactDuration(runtime, data.summary.reservedMinutes)),
        outputLine(
          t,
          'projectedRemaining',
          formatCompactDuration(runtime, data.summary.projectedRemainingMinutes, true),
        ),
      ];
    case 'MISSING_RECORD':
      return [
        outputLine(t, 'incompleteRecords', formatNumber(runtime.locale, data.summary.recordCount)),
      ];
    case 'PENDING_APPROVAL':
      return [
        outputLine(t, 'actionableApprovals', formatNumber(runtime.locale, data.summary.itemCount)),
      ];
  }
}

type OutputLineName =
  | 'actionableApprovals'
  | 'availableChange'
  | 'balance'
  | 'closingAvailable'
  | 'closingBalance'
  | 'credited'
  | 'expected'
  | 'incompleteRecords'
  | 'openingAvailable'
  | 'openingBalance'
  | 'postLockChange'
  | 'projectedRemaining'
  | 'rangeChange'
  | 'reserved'
  | 'worked';

function outputLine(
  t: ReturnType<typeof useWorkLedgerMessage>,
  name: OutputLineName,
  value: string,
): string {
  return t(`output.clipboard.report.line.${name}`, { value });
}

function portabilityErrorMessage(
  error: unknown,
  action: 'csv' | 'summaryCopy',
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  const actionLabel =
    action === 'csv'
      ? t('manager.report.portability.action.csvLabel')
      : t('manager.report.portability.action.summaryCopyLabel');
  if (error instanceof ApiClientError) {
    if (error.code === 'ACCESS_DENIED') {
      return t('manager.report.portability.error.accessDenied', { action: actionLabel });
    }
    if (error.code === 'REPORT_EXPORT_TOO_LARGE') {
      return t('manager.report.portability.error.tooLarge');
    }
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED') {
      return t('manager.report.portability.error.sessionEnded', { action: actionLabel });
    }
  }
  return t('manager.report.portability.error.failed', { action: actionLabel });
}
