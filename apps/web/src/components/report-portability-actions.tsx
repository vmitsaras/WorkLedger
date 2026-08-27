import { useState } from 'react';

import type {
  ReportCatalogItem,
  ReportExportRequest,
  ReportQuery,
  ReportResult,
  SupportedLocale,
} from '@workledger/contracts';
import { formatDateOnly, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button } from '@workledger/ui';

import { ApiClientError, exportReportCsv, type ReportCsvDownload } from '../app/api-client.js';
import { formatDuration } from '../app/date-time-format.js';
import { reportPresentation } from '../app/presentation-codes.js';

type PortabilityStatus = Readonly<{ kind: 'ERROR' | 'SUCCESS'; message: string }>;

const SUMMARY_LABEL_KEYS = Object.freeze({
  ActionableApprovals: 'manager.report.portability.summary.actionableApprovals',
  AvailableChange: 'manager.report.portability.summary.availableChange',
  Balance: 'manager.report.portability.summary.balance',
  Closing: 'manager.report.portability.summary.closing',
  ClosingAvailable: 'manager.report.portability.summary.closingAvailable',
  ClosingBalance: 'manager.report.portability.summary.closingBalance',
  Credited: 'manager.report.portability.summary.credited',
  DateRange: 'manager.report.portability.summary.dateRange',
  Expected: 'manager.report.portability.summary.expected',
  IncompleteRecords: 'manager.report.portability.summary.incompleteRecords',
  MatchingRows: 'manager.report.portability.summary.matchingRows',
  OpeningAvailable: 'manager.report.portability.summary.openingAvailable',
  OpeningBalance: 'manager.report.portability.summary.openingBalance',
  PostLockChange: 'manager.report.portability.summary.postLockChange',
  ProjectedRemaining: 'manager.report.portability.summary.projectedRemaining',
  RangeChange: 'manager.report.portability.summary.rangeChange',
  Reserved: 'manager.report.portability.summary.reserved',
  Scope: 'manager.report.portability.summary.scope',
  Worked: 'manager.report.portability.summary.worked',
} as const satisfies Readonly<Record<string, MessageKey>>);

const INCLUDED_FIELD_KEYS = Object.freeze({
  'flexible-time': 'manager.report.portability.fields.flexibleTime',
  leave: 'manager.report.portability.fields.leave',
  'missing-records': 'manager.report.portability.fields.missingRecords',
  'monthly-time': 'manager.report.portability.fields.monthlyTime',
  'pending-approvals': 'manager.report.portability.fields.pendingApprovals',
} as const satisfies Readonly<Record<ReportResult['key'], MessageKey>>);

const SCOPE_KEYS = Object.freeze({
  ORGANIZATION: 'manager.report.common.scope.organization',
  REPORTS: 'manager.report.common.scope.currentDirectReports',
  SELF: 'manager.report.common.scope.self',
  SELF_AND_REPORTS: 'manager.report.common.scope.selfAndDirectReports',
} as const satisfies Readonly<Record<ReportResult['scope'], MessageKey>>);

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
  const locale = runtime.locale as SupportedLocale;
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
        reportSummaryText(reportPresentation(report.key, t).title, refreshed, locale, t),
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
  locale: SupportedLocale,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return [
    title,
    `${t(SUMMARY_LABEL_KEYS.DateRange)}: ${formatDateOnly(locale, data.range.from, {
      dateStyle: 'full',
    })} ${t('manager.report.detail.filter.applied.through')} ${formatDateOnly(
      locale,
      data.range.to,
      { dateStyle: 'full' },
    )}`,
    `${t(SUMMARY_LABEL_KEYS.Scope)}: ${t(SCOPE_KEYS[data.scope])}`,
    `${t(SUMMARY_LABEL_KEYS.MatchingRows)}: ${data.pagination.total.toString()}`,
    ...summaryLines(data, t),
  ].join('\n');
}

function summaryLines(
  data: ReportResult,
  t: ReturnType<typeof useWorkLedgerMessage>,
): readonly string[] {
  switch (data.summary.kind) {
    case 'MONTHLY_TIME':
      return [
        `${t(SUMMARY_LABEL_KEYS.Expected)}: ${formatDuration(data.summary.expectedMinutes)}`,
        `${t(SUMMARY_LABEL_KEYS.Worked)}: ${formatDuration(data.summary.workedMinutes)}`,
        `${t(SUMMARY_LABEL_KEYS.Credited)}: ${formatDuration(data.summary.creditedMinutes)}`,
        `${t(SUMMARY_LABEL_KEYS.Balance)}: ${formatDuration(data.summary.balanceMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.PostLockChange)}: ${formatDuration(data.summary.postLockDeltaMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.IncompleteRecords)}: ${data.summary.incompleteRecordCount.toString()}`,
      ];
    case 'FLEXIBLE_TIME':
      return [
        `${t(SUMMARY_LABEL_KEYS.OpeningBalance)}: ${formatDuration(data.summary.openingBalanceMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.RangeChange)}: ${formatDuration(data.summary.rangeChangeMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.ClosingBalance)}: ${formatDuration(data.summary.closingBalanceMinutes, true)}`,
      ];
    case 'LEAVE':
      return [
        `${t(SUMMARY_LABEL_KEYS.OpeningAvailable)}: ${formatDuration(data.summary.openingAvailableMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.AvailableChange)}: ${formatDuration(data.summary.availableChangeMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.ClosingAvailable)}: ${formatDuration(data.summary.closingAvailableMinutes, true)}`,
        `${t(SUMMARY_LABEL_KEYS.Reserved)}: ${formatDuration(data.summary.reservedMinutes)}`,
        `${t(SUMMARY_LABEL_KEYS.ProjectedRemaining)}: ${formatDuration(data.summary.projectedRemainingMinutes, true)}`,
      ];
    case 'MISSING_RECORD':
      return [`${t(SUMMARY_LABEL_KEYS.IncompleteRecords)}: ${data.summary.recordCount.toString()}`];
    case 'PENDING_APPROVAL':
      return [`${t(SUMMARY_LABEL_KEYS.ActionableApprovals)}: ${data.summary.itemCount.toString()}`];
  }
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
