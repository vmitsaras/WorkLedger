import type { MonthlyPeriod } from '@workledger/contracts';

import { formatDuration, formatLocalDate } from '../app/date-time-format.js';

export function MonthlyPeriodPrintView({ period }: Readonly<{ period: MonthlyPeriod }>) {
  return (
    <article className="wl-print-only" data-print-monthly-record style={{ display: 'none' }}>
      <header className="grid gap-2 border-b border-[var(--wl-border)] pb-4">
        <p className="m-0 text-sm font-bold uppercase tracking-[0.12em]">WorkLedger</p>
        <h1 className="m-0 text-3xl font-bold">Monthly record</h1>
        <p className="m-0">
          {period.employeeDisplayName} · {formatLocalDate(period.monthStart)} through{' '}
          {formatLocalDate(period.monthEnd)} · {period.timeZone}
        </p>
        <p className="m-0">
          Status: {humanize(period.workflow.status)} · {printReadiness(period)}
        </p>
      </header>

      <section aria-labelledby="print-monthly-totals" className="grid gap-3">
        <h2 id="print-monthly-totals" className="m-0 text-xl font-bold">
          Complete-date totals
        </h2>
        <dl className="m-0 grid grid-cols-2 gap-3">
          <PrintTotal label="Expected" value={period.totals.expectedMinutes} />
          <PrintTotal label="Worked" value={period.totals.workedMinutes} />
          <PrintTotal label="Break" value={period.totals.breakMinutes} />
          <PrintTotal label="Absence credit" value={period.totals.absenceCreditMinutes} />
          <PrintTotal label="Adjustment" value={period.totals.adjustmentMinutes} signed />
          <PrintTotal label="Credited" value={period.totals.creditedMinutes} />
          <PrintTotal label="Calculated balance" value={period.totals.balanceMinutes} signed />
          <PrintTotal
            label="Posted period delta"
            value={period.totals.ledgerPeriodDeltaMinutes}
            signed
          />
          <PrintTotal
            label="Posted opening balance"
            value={period.totals.ledgerOpeningBalanceMinutes}
            signed
          />
          <PrintTotal
            label="Posted closing balance"
            value={period.totals.ledgerClosingBalanceMinutes}
            signed
          />
        </dl>
      </section>

      <section aria-labelledby="print-monthly-dates" className="grid gap-3">
        <h2 id="print-monthly-dates" className="m-0 text-xl font-bold">
          Daily record
        </h2>
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Purpose-minimized daily monthly record for {period.employeeDisplayName}
          </caption>
          <thead>
            <tr>
              {[
                'Date',
                'Status',
                'Expected',
                'Worked',
                'Break',
                'Absence credit',
                'Adjustment',
                'Credited',
                'Balance',
              ].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {period.rows.map((row) => (
              <tr key={row.localDate}>
                <th scope="row">{formatLocalDate(row.localDate)}</th>
                <td>{humanize(row.status)}</td>
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
            Approved record
          </h2>
          <p className="m-0">
            Approved cycle {period.approvedRecord.approvalCycle.toString()} · approved{' '}
            {formatInstant(period.approvedRecord.approvedAt, period.timeZone)}
          </p>
          <p className="m-0">
            Expected {formatDuration(period.approvedRecord.totals.expectedMinutes)} · credited{' '}
            {formatDuration(period.approvedRecord.totals.creditedMinutes)} · balance{' '}
            {formatDuration(period.approvedRecord.totals.balanceMinutes, true)} · posted closing{' '}
            {formatDuration(period.approvedRecord.totals.ledgerClosingBalanceMinutes, true)}
          </p>
        </section>
      )}

      {period.postLockView === null ? null : (
        <section aria-labelledby="print-adjusted-record" className="grid gap-3">
          <h2 id="print-adjusted-record" className="m-0 text-xl font-bold">
            Current adjusted record
          </h2>
          <p className="m-0">
            Approved closing balance{' '}
            {formatDuration(period.postLockView.originalClosingBalanceMinutes, true)} · cumulative
            post-lock delta {formatDuration(period.postLockView.cumulativeDeltaMinutes, true)} ·
            adjusted closing balance{' '}
            {formatDuration(period.postLockView.adjustedClosingBalanceMinutes, true)}
          </p>
          {period.postLockView.adjustments.length === 0 ? null : (
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Purpose-minimized post-lock adjustment chain</caption>
              <thead>
                <tr>
                  <th scope="col">Version</th>
                  <th scope="col">Date</th>
                  <th scope="col">Balance delta</th>
                </tr>
              </thead>
              <tbody>
                {period.postLockView.adjustments.map((adjustment) => (
                  <tr key={adjustment.adjustmentVersion}>
                    <th scope="row">{adjustment.adjustmentVersion.toString()}</th>
                    <td>{formatLocalDate(adjustment.localDate)}</td>
                    <td>{formatDuration(adjustment.minutes, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <footer className="border-t border-[var(--wl-border)] pt-3 text-sm">
        This print contains the visible monthly status, totals, daily values, approved baseline, and
        post-lock deltas where present. It contains no internal identifiers, source fingerprints,
        sickness classification, notes, decision reasons, or reviewer comments.
      </footer>
    </article>
  );
}

function PrintTotal({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="m-0 tabular-nums">{formatDuration(value, signed)}</dd>
    </div>
  );
}

function PrintMinute({
  signed = false,
  value,
}: Readonly<{ signed?: boolean; value: number | null }>) {
  return <td>{value === null ? '—' : formatDuration(value, signed)}</td>;
}

function printReadiness(period: MonthlyPeriod): string {
  if (period.readiness.status === 'READY_FOR_SUBMISSION') return 'ready for submission';
  if (period.readiness.status === 'INCOMPLETE') return 'not ready';
  return 'workflow record';
}

function humanize(value: string): string {
  const normalized = value.toLocaleLowerCase().replaceAll('_', ' ');
  return normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1);
}

function formatInstant(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}
