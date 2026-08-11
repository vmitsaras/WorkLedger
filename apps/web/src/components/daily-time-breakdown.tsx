import type { TodayAttendance, TodayAttendanceEstimate } from '@workledger/contracts';

import { formatDuration } from '../app/date-time-format.js';

type CalculationRow = Readonly<{
  label: string;
  signed?: boolean;
  total?: boolean;
  value: number;
}>;

export function DailyTimeBreakdown({
  estimate,
  holidayName,
  status,
}: Readonly<{
  estimate: TodayAttendanceEstimate;
  holidayName: string | null;
  status: TodayAttendance['calculation']['status'];
}>) {
  const expectedEquation = `Expected time equals ${formatDuration(estimate.scheduledMinutes)} scheduled, minus ${formatDuration(estimate.holidayExpectedReductionMinutes)} public-holiday reduction, minus ${formatDuration(estimate.absenceExpectedReductionMinutes)} absence reduction: ${formatDuration(estimate.expectedMinutes)}.`;
  const creditedEquation = `Credited time equals ${formatDuration(estimate.workedMinutes)} worked, plus ${formatDuration(estimate.absenceCreditMinutes)} absence credit, ${formatAdjustment(estimate.adjustmentMinutes)}: ${formatDuration(estimate.creditedMinutes)}.`;
  const balanceEquation = `Estimated balance equals ${formatDuration(estimate.creditedMinutes)} credited, minus ${formatDuration(estimate.expectedMinutes)} expected: ${formatDuration(estimate.balanceMinutes, true)}.`;

  return (
    <section className="grid gap-4" aria-labelledby="calculation-breakdown-title">
      <div className="grid gap-1">
        <h2 id="calculation-breakdown-title" className="m-0 text-2xl font-bold">
          Calculation breakdown
        </h2>
        <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {status === 'PROVISIONAL'
            ? 'This is a provisional estimate for today, not a posted or locked balance.'
            : 'This estimate is incomplete and cannot become a posted balance until every blocker is resolved.'}{' '}
          Every source amount remains visible below in hours and minutes.
        </p>
      </div>

      {estimate.expectedMinutes === 0 ? (
        <div className="wl-zero-expected-note rounded-xl border border-[var(--wl-border-strong)] bg-[var(--wl-surface-subtle)] p-4">
          <h3 className="m-0 text-base font-bold">Why expected time is zero</h3>
          <p className="mb-0 mt-1 text-sm leading-6">
            {holidayName === null
              ? 'Today’s schedule and reductions result in zero expected time.'
              : `${holidayName} reduces today’s scheduled expectation to zero.`}{' '}
            Recorded work remains credited separately and is not labelled as payroll overtime.
          </p>
        </div>
      ) : null}

      <div className="wl-calculation-groups grid gap-4">
        <CalculationGroup
          description="Scheduled time minus holiday and absence reductions."
          equation={expectedEquation}
          rows={[
            { label: 'Scheduled time', value: estimate.scheduledMinutes },
            {
              label: 'Public-holiday reduction',
              value: estimate.holidayExpectedReductionMinutes,
            },
            {
              label: 'Absence reduction',
              value: estimate.absenceExpectedReductionMinutes,
            },
            { label: 'Expected time', total: true, value: estimate.expectedMinutes },
          ]}
          title="Expected time"
        />
        <CalculationGroup
          description="Worked time plus absence credit and approved adjustments. Break time is already excluded from worked time and is not subtracted again."
          equation={creditedEquation}
          rows={[
            { label: 'Worked time', value: estimate.workedMinutes },
            { label: 'Break time', value: estimate.breakMinutes },
            { label: 'Absence credit', value: estimate.absenceCreditMinutes },
            {
              label: 'Approved adjustments',
              signed: true,
              value: estimate.adjustmentMinutes,
            },
            { label: 'Credited time', total: true, value: estimate.creditedMinutes },
          ]}
          title="Credited time"
        />
        <CalculationGroup
          description="Credited time minus expected time. The result may be positive, zero, or negative."
          equation={balanceEquation}
          rows={[
            { label: 'Credited time', value: estimate.creditedMinutes },
            { label: 'Expected time', value: estimate.expectedMinutes },
            {
              label: 'Estimated balance',
              signed: true,
              total: true,
              value: estimate.balanceMinutes,
            },
          ]}
          title="Estimated balance"
        />
      </div>
    </section>
  );
}

function CalculationGroup({
  description,
  equation,
  rows,
  title,
}: Readonly<{
  description: string;
  equation: string;
  rows: readonly CalculationRow[];
  title: string;
}>) {
  return (
    <article className="wl-panel grid min-w-0 content-start gap-4">
      <div className="grid gap-1">
        <h3 className="m-0 text-lg font-bold">{title}</h3>
        <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">{description}</p>
      </div>
      <dl className="m-0 grid gap-0">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex min-w-0 items-baseline justify-between gap-4 border-b border-[var(--wl-border)] py-3 last:border-0 ${row.total === true ? 'font-bold' : ''}`}
          >
            <dt className="min-w-0 text-sm text-[var(--wl-text-muted)]">{row.label}</dt>
            <dd className="m-0 shrink-0 tabular-nums">
              {formatDuration(row.value, row.signed === true)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 border-t border-[var(--wl-border-strong)] pt-3 text-sm font-semibold leading-6">
        {equation}
      </p>
    </article>
  );
}

function formatAdjustment(minutes: number): string {
  if (minutes < 0) return `minus ${formatDuration(Math.abs(minutes))} approved adjustments`;
  return `plus ${formatDuration(minutes)} approved adjustments`;
}
