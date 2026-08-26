import type { TodayAttendance, TodayProvisionalCalculation } from '@workledger/contracts';
import { formatCompactDuration, type I18nRuntime } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';

type CalculationRow = readonly [label: string, value: number, signed?: boolean, total?: boolean];

export function DailyTimeBreakdown({
  holidayName,
  provisional,
  status,
}: Readonly<{
  holidayName: string | null;
  provisional: TodayProvisionalCalculation;
  status: TodayAttendance['calculation']['status'];
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const sources = provisional.calculationSources;
  return (
    <section className="grid gap-4" aria-labelledby="calculation-breakdown-title">
      <div className="grid gap-2">
        <h2 id="calculation-breakdown-title" className="m-0 text-xl font-bold">
          {t('employee.today.calculation.heading')}
        </h2>
        <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {status === 'PROVISIONAL'
            ? t('employee.today.calculation.statusProvisional')
            : t('employee.today.calculation.statusIncomplete')}
        </p>
      </div>

      {provisional.expectedMinutesToday === 0 ? (
        <div className="wl-zero-expected-note rounded-xl border border-[var(--wl-border-strong)] bg-[var(--wl-surface-subtle)] p-4">
          <h3 className="m-0 text-base font-bold">
            {t('employee.today.calculation.zeroExpected.heading')}
          </h3>
          <p className="mb-0 mt-1 text-sm leading-6">
            {holidayName === null
              ? t('employee.today.calculation.zeroExpected.generic')
              : t('employee.today.calculation.zeroExpected.holiday', { holidayName })}{' '}
            {t('employee.today.calculation.zeroExpected.workCredit')}
          </p>
        </div>
      ) : null}

      <div className="wl-table-scroll">
        <table className="wl-data-table wl-calculation-table">
          <caption className="sr-only">{t('employee.today.calculation.caption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('employee.today.calculation.source')}</th>
              <th scope="col">{t('employee.today.calculation.time')}</th>
            </tr>
          </thead>
          <CalculationGroup
            rows={[
              [t('employee.today.calculation.row.scheduledTime'), sources.scheduledMinutes],
              [
                t('employee.today.calculation.row.holidayReduction'),
                sources.holidayExpectedReductionMinutes,
              ],
              [
                t('employee.today.calculation.row.absenceReduction'),
                sources.absenceExpectedReductionMinutes,
              ],
              [
                t('employee.today.calculation.row.expectedToday'),
                provisional.expectedMinutesToday,
                false,
                true,
              ],
            ]}
            runtime={runtime}
            title={t('employee.today.calculation.group.expected')}
          />
          <CalculationGroup
            rows={[
              [t('employee.today.calculation.row.recordedWork'), sources.workedMinutesToday],
              [t('employee.today.calculation.row.breaksExcluded'), sources.breakMinutesToday],
              [
                t('employee.today.calculation.row.approvedCorrections'),
                sources.approvedCorrectionMinutes,
                true,
              ],
              [t('employee.today.calculation.row.absenceCredit'), sources.absenceCreditMinutes],
              [
                t('employee.today.calculation.row.otherAdjustments'),
                sources.otherApprovedAdjustmentMinutes,
                true,
              ],
              [
                t('employee.today.calculation.row.creditedToday'),
                provisional.creditedMinutesToday,
                false,
                true,
              ],
            ]}
            runtime={runtime}
            title={t('employee.today.calculation.group.credited')}
          />
          <CalculationGroup
            rows={[
              [
                t('employee.today.calculation.row.provisionalDifference'),
                provisional.provisionalDifferenceMinutes,
                true,
                true,
              ],
            ]}
            runtime={runtime}
            title={t('employee.today.calculation.group.result')}
          />
        </table>
      </div>
      <p className="m-0 text-xs leading-5 text-[var(--wl-text-muted)]">
        {t('employee.today.calculation.footnote')}
      </p>
    </section>
  );
}

function CalculationGroup({
  rows,
  runtime,
  title,
}: Readonly<{
  rows: readonly CalculationRow[];
  runtime: I18nRuntime;
  title: string;
}>) {
  return (
    <tbody>
      <tr>
        <th colSpan={2}>{title}</th>
      </tr>
      {rows.map(([label, value, signed, total]) => (
        <tr key={label} className={total === true ? 'font-bold' : undefined}>
          <th scope="row">{label}</th>
          <td>{formatCompactDuration(runtime, value, signed === true)}</td>
        </tr>
      ))}
    </tbody>
  );
}
