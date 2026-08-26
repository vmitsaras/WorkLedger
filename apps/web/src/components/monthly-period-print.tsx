import type { MonthlyPeriod } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';

import { workflowStatusMessageKey } from '../app/workflow-status-presentation.js';

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

export function MonthlyPeriodPrintView({ period }: Readonly<{ period: MonthlyPeriod }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <article className="wl-print-only" data-print-monthly-record style={{ display: 'none' }}>
      <header className="grid gap-2 border-b border-[var(--wl-border)] pb-4">
        <p className="m-0 text-sm font-bold uppercase tracking-[0.12em]">{'WorkLedger'}</p>
        <h1 className="m-0 text-3xl font-bold">{t('employee.monthly.print.title')}</h1>
        <p className="m-0">
          {t('employee.monthly.print.dateRange', {
            employee: period.employeeDisplayName,
            end: formatDateOnly(runtime.locale, period.monthEnd),
            start: formatDateOnly(runtime.locale, period.monthStart),
            timeZone: period.timeZone,
          })}
        </p>
        <p className="m-0">
          {t('employee.monthly.print.statusLine', {
            readiness: printReadiness(period, t),
            status: t(workflowStatusMessageKey(period.workflow.status)),
          })}
        </p>
      </header>

      <section aria-labelledby="print-monthly-totals" className="grid gap-3">
        <h2 id="print-monthly-totals" className="m-0 text-xl font-bold">
          {t('employee.monthly.totals.heading')}
        </h2>
        <dl className="m-0 grid grid-cols-2 gap-3">
          <PrintTotal
            label={t('employee.monthly.daily.column.expected')}
            value={period.totals.expectedMinutes}
          />
          <PrintTotal
            label={t('employee.monthly.daily.column.worked')}
            value={period.totals.workedMinutes}
          />
          <PrintTotal
            label={t('employee.monthly.daily.column.break')}
            value={period.totals.breakMinutes}
          />
          <PrintTotal
            label={t('employee.monthly.daily.column.absenceCredit')}
            value={period.totals.absenceCreditMinutes}
          />
          <PrintTotal
            label={t('employee.monthly.daily.column.adjustment')}
            value={period.totals.adjustmentMinutes}
            signed
          />
          <PrintTotal
            label={t('employee.monthly.daily.column.credited')}
            value={period.totals.creditedMinutes}
          />
          <PrintTotal
            label={t('employee.monthly.totals.metric.calculatedBalance')}
            value={period.totals.balanceMinutes}
            signed
          />
          <PrintTotal
            label={t('employee.monthly.totals.metric.postedPeriodDelta')}
            value={period.totals.ledgerPeriodDeltaMinutes}
            signed
          />
          <PrintTotal
            label={t('employee.monthly.totals.metric.postedOpening')}
            value={period.totals.ledgerOpeningBalanceMinutes}
            signed
          />
          <PrintTotal
            label={t('employee.monthly.totals.metric.postedClosing')}
            value={period.totals.ledgerClosingBalanceMinutes}
            signed
          />
        </dl>
      </section>

      <section aria-labelledby="print-monthly-dates" className="grid gap-3">
        <h2 id="print-monthly-dates" className="m-0 text-xl font-bold">
          {t('employee.monthly.daily.heading')}
        </h2>
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            {t('employee.monthly.print.dailyCaption', { employee: period.employeeDisplayName })}
          </caption>
          <thead>
            <tr>
              {dailyColumnLabels(t).map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {period.rows.map((row) => (
              <tr key={row.localDate}>
                <th scope="row">{formatDateOnly(runtime.locale, row.localDate)}</th>
                <td>{dailyStatusLabel(row.status, t)}</td>
                <PrintMinute value={row.expectedMinutes} />
                <PrintMinute value={row.workedMinutes} />
                <PrintMinute value={row.breakMinutes} />
                <PrintMinute value={row.absenceCreditMinutes} />
                <PrintMinute value={row.adjustmentMinutes} signed />
                <PrintMinute value={row.creditedMinutes} />
                <PrintMinute value={row.balanceMinutes} signed />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {period.approvedRecord === null ? null : (
        <section aria-labelledby="print-approved-record" className="grid gap-3">
          <h2 id="print-approved-record" className="m-0 text-xl font-bold">
            {t('employee.monthly.approved.heading')}
          </h2>
          <p className="m-0">
            {t('employee.monthly.print.approvedMetadata', {
              cycle: period.approvedRecord.approvalCycle,
              date: formatInstant(
                runtime.locale,
                period.approvedRecord.approvedAt,
                period.timeZone,
              ),
            })}
          </p>
          <p className="m-0">
            {t('employee.monthly.print.approvedTotals', {
              balance: formatCompactDuration(
                runtime,
                period.approvedRecord.totals.balanceMinutes,
                true,
              ),
              closing: formatCompactDuration(
                runtime,
                period.approvedRecord.totals.ledgerClosingBalanceMinutes,
                true,
              ),
              credited: formatCompactDuration(
                runtime,
                period.approvedRecord.totals.creditedMinutes,
              ),
              expected: formatCompactDuration(
                runtime,
                period.approvedRecord.totals.expectedMinutes,
              ),
            })}
          </p>
        </section>
      )}

      {period.postLockView === null ? null : (
        <section aria-labelledby="print-adjusted-record" className="grid gap-3">
          <h2 id="print-adjusted-record" className="m-0 text-xl font-bold">
            {t('employee.monthly.print.adjustedHeading')}
          </h2>
          <p className="m-0">
            {t('employee.monthly.print.adjustedTotals', {
              adjusted: formatCompactDuration(
                runtime,
                period.postLockView.adjustedClosingBalanceMinutes,
                true,
              ),
              closing: formatCompactDuration(
                runtime,
                period.postLockView.originalClosingBalanceMinutes,
                true,
              ),
              delta: formatCompactDuration(
                runtime,
                period.postLockView.cumulativeDeltaMinutes,
                true,
              ),
            })}
          </p>
          {period.postLockView.adjustments.length === 0 ? null : (
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{t('employee.monthly.print.adjustmentCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('employee.monthly.adjustments.column.version')}</th>
                  <th scope="col">{t('employee.monthly.adjustments.column.date')}</th>
                  <th scope="col">{t('employee.monthly.adjustments.column.balanceDelta')}</th>
                </tr>
              </thead>
              <tbody>
                {period.postLockView.adjustments.map((adjustment) => (
                  <tr key={adjustment.adjustmentVersion}>
                    <th scope="row">{adjustment.adjustmentVersion.toString()}</th>
                    <td>{formatDateOnly(runtime.locale, adjustment.localDate)}</td>
                    <td>{formatCompactDuration(runtime, adjustment.minutes, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <footer className="border-t border-[var(--wl-border)] pt-3 text-sm">
        {t('employee.monthly.print.footer')}
      </footer>
    </article>
  );
}

function PrintTotal({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  const runtime = useWorkLedgerI18n();
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="m-0 tabular-nums">{formatCompactDuration(runtime, value, signed)}</dd>
    </div>
  );
}

function PrintMinute({
  signed = false,
  value,
}: Readonly<{ signed?: boolean; value: number | null }>) {
  const runtime = useWorkLedgerI18n();
  return <td>{value === null ? '—' : formatCompactDuration(runtime, value, signed)}</td>;
}

function printReadiness(period: MonthlyPeriod, t: MessageTranslator): string {
  if (period.readiness.status === 'READY_FOR_SUBMISSION') {
    return t('employee.monthly.print.readiness.ready');
  }
  if (period.readiness.status === 'INCOMPLETE') {
    return t('employee.monthly.print.readiness.notReady');
  }
  return t('employee.monthly.print.readiness.workflow');
}

function dailyColumnLabels(t: MessageTranslator): readonly string[] {
  return [
    t('employee.monthly.daily.column.date'),
    t('employee.monthly.daily.column.status'),
    t('employee.monthly.daily.column.expected'),
    t('employee.monthly.daily.column.worked'),
    t('employee.monthly.daily.column.break'),
    t('employee.monthly.daily.column.absenceCredit'),
    t('employee.monthly.daily.column.adjustment'),
    t('employee.monthly.daily.column.credited'),
    t('employee.monthly.daily.column.balance'),
  ];
}

function dailyStatusLabel(
  status: MonthlyPeriod['rows'][number]['status'],
  t: MessageTranslator,
): string {
  const keys = {
    COMPLETE: 'employee.monthly.daily.status.complete',
    INCOMPLETE: 'employee.monthly.daily.status.incomplete',
    MISSING: 'employee.monthly.daily.status.missing',
    PROVISIONAL: 'employee.monthly.daily.status.provisional',
  } as const satisfies Readonly<Record<MonthlyPeriod['rows'][number]['status'], MessageKey>>;
  return t(keys[status]);
}
