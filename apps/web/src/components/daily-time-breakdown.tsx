import type { TodayAttendance, TodayProvisionalCalculation } from '@workledger/contracts';

import { formatDuration } from '../app/date-time-format.js';

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
  const sources = provisional.calculationSources;
  return (
    <section className="grid gap-4" aria-labelledby="calculation-breakdown-title">
      <div className="grid gap-2">
        <h2 id="calculation-breakdown-title" className="m-0 text-xl font-bold">
          How today is calculated
        </h2>
        <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {status === 'PROVISIONAL'
            ? 'Provisional, not posted, and still changing.'
            : 'Incomplete. Resolve every blocker before relying on this result.'}
        </p>
      </div>

      {provisional.expectedMinutesToday === 0 ? (
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

      <div className="wl-table-scroll">
        <table className="wl-data-table wl-calculation-table">
          <caption className="sr-only">
            Source amounts and server-calculated results for today
          </caption>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <CalculationGroup
            rows={[
              ['Scheduled time', sources.scheduledMinutes],
              ['Public holiday reduction', sources.holidayExpectedReductionMinutes],
              ['Absence reduction', sources.absenceExpectedReductionMinutes],
              ['Expected today', provisional.expectedMinutesToday, false, true],
            ]}
            title="Expected time"
          />
          <CalculationGroup
            rows={[
              ['Recorded work', sources.workedMinutesToday],
              ['Breaks already excluded', sources.breakMinutesToday],
              ['Approved corrections', sources.approvedCorrectionMinutes, true],
              ['Absence credit', sources.absenceCreditMinutes],
              ['Other approved adjustments', sources.otherApprovedAdjustmentMinutes, true],
              ['Credited today', provisional.creditedMinutesToday, false, true],
            ]}
            title="Credited time"
          />
          <CalculationGroup
            rows={[
              ['Provisional difference', provisional.provisionalDifferenceMinutes, true, true],
            ]}
            title="Today’s result"
          />
        </table>
      </div>
      <p className="m-0 text-xs leading-5 text-[var(--wl-text-muted)]">
        Breaks are already excluded from recorded work. Corrections preserve original punch events.
      </p>
    </section>
  );
}

function CalculationGroup({
  rows,
  title,
}: Readonly<{
  rows: readonly CalculationRow[];
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
          <td>{formatDuration(value, signed === true)}</td>
        </tr>
      ))}
    </tbody>
  );
}
