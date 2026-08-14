import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import type { MonthlyPeriod } from '@workledger/contracts';

import { ApiClientError } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { monthlyPeriodQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function MonthlyPeriodPage() {
  const periodId = useParams()['periodId'];
  const query = useQuery(monthlyPeriodQuery(periodId ?? ''));

  if (query.isPending)
    return (
      <MonthlyPeriodFrame>
        <MonthlyLoading />
      </MonthlyPeriodFrame>
    );
  if (query.isError || query.data === undefined) {
    return (
      <MonthlyPeriodFrame>
        <MonthlyError error={query.error} retry={() => void query.refetch()} />
      </MonthlyPeriodFrame>
    );
  }

  const period = query.data;
  return (
    <MonthlyPeriodFrame period={period}>
      <section
        aria-labelledby="monthly-status-heading"
        className="grid gap-4 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface)] p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="monthly-status-heading" className="m-0 text-xl font-bold">
              {workflowLabel(period.workflow.status)}
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              Workflow version {period.workflow.periodVersion.toString()} · snapshot schema{' '}
              {period.snapshotVersion.schemaVersion.toString()}
            </p>
          </div>
          <span className="rounded-full border border-[var(--wl-border)] px-3 py-1 text-sm font-semibold">
            {readinessLabel(period)}
          </span>
        </div>
        <p className="m-0">{readinessExplanation(period)}</p>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {period.readiness.completeDateCount.toString()} of{' '}
          {period.readiness.coveredDateCount.toString()} covered employment dates have complete
          daily calculations. The source fingerprint changes whenever the reviewed source set
          changes.
        </p>
      </section>

      <AttentionSection period={period} />
      <TotalsSection totals={period.totals} />
      <DailyRows rows={period.rows} monthStart={period.monthStart} />
    </MonthlyPeriodFrame>
  );
}

function MonthlyPeriodFrame({
  children,
  period,
}: Readonly<{ children: ReactNode; period?: MonthlyPeriod }>) {
  return (
    <section className="grid max-w-6xl gap-8">
      <PageHeader
        eyebrow="Monthly record"
        title="Monthly period"
        description={
          period === undefined
            ? 'Review monthly calculations, blockers, warnings, and ledger reconciliation.'
            : `${period.employeeDisplayName} · ${formatLocalDate(period.monthStart)} to ${formatLocalDate(period.monthEnd)} · ${period.timeZone}`
        }
      />
      {children}
    </section>
  );
}

function AttentionSection({ period }: Readonly<{ period: MonthlyPeriod }>) {
  const { blockers, warnings } = period.attention;
  return (
    <section aria-labelledby="monthly-attention-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-attention-heading" className="m-0 text-xl font-bold">
          Review attention
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Blockers prevent submission. Warnings preserve calculated values but must be reviewed in
          the later submission step.
        </p>
      </div>
      {blockers.length === 0 ? (
        <p className="wl-alert wl-alert-success m-0 rounded-xl border p-4">
          No calculation or ledger blocker is present in this review version.
        </p>
      ) : (
        <div className="wl-alert wl-alert-error rounded-xl border p-4">
          <h3 className="m-0 text-lg font-bold">
            {blockers.length.toString()} blocker{blockers.length === 1 ? '' : 's'}
          </h3>
          <ul className="mb-0 mt-3 grid gap-2 pl-5">
            {blockers.map((blocker, index) => (
              <li key={`${blocker.localDate ?? 'period'}-${blocker.code}-${index.toString()}`}>
                <strong>{attentionLabel(blocker.code)}</strong>
                {blocker.localDate === null ? (
                  ' — whole-period reconciliation'
                ) : (
                  <>
                    {' — '}
                    {blocker.recordId === null ? (
                      formatLocalDate(blocker.localDate)
                    ) : (
                      <Link to={`/time-records/${encodeURIComponent(blocker.recordId)}`}>
                        {formatLocalDate(blocker.localDate)} — review daily record
                      </Link>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length === 0 ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          No non-blocking warning is present in this review version.
        </p>
      ) : (
        <div className="wl-alert wl-alert-warning rounded-xl border p-4">
          <h3 className="m-0 text-lg font-bold">
            {warnings.length.toString()} warning{warnings.length === 1 ? '' : 's'}
          </h3>
          <ul className="mb-0 mt-3 grid gap-2 pl-5">
            {warnings.map((warning) => (
              <li key={`${warning.localDate}-${warning.code}-${warning.recordId}`}>
                <strong>{attentionLabel(warning.code)}</strong>
                {' — '}
                <Link to={`/time-records/${encodeURIComponent(warning.recordId)}`}>
                  {formatLocalDate(warning.localDate)} — review daily record
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TotalsSection({ totals }: Readonly<{ totals: MonthlyPeriod['totals'] }>) {
  return (
    <section aria-labelledby="monthly-totals-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-totals-heading" className="m-0 text-xl font-bold">
          Complete-date totals
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Incomplete and missing dates are excluded. Posted ledger balances remain separately
          labelled.
        </p>
      </div>
      <dl
        aria-label="Monthly calculated totals"
        className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Total label="Expected" value={totals.expectedMinutes} />
        <Total label="Worked" value={totals.workedMinutes} />
        <Total label="Break" value={totals.breakMinutes} />
        <Total label="Absence credit" value={totals.absenceCreditMinutes} />
        <Total label="Adjustment" value={totals.adjustmentMinutes} signed />
        <Total label="Credited" value={totals.creditedMinutes} />
        <Total label="Calculated balance" value={totals.balanceMinutes} signed />
        <Total label="Posted period delta" value={totals.ledgerPeriodDeltaMinutes} signed />
      </dl>
      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
        Posted opening balance {formatDuration(totals.ledgerOpeningBalanceMinutes, true)}; posted
        closing balance {formatDuration(totals.ledgerClosingBalanceMinutes, true)}.
      </p>
    </section>
  );
}

function DailyRows({
  monthStart,
  rows,
}: Readonly<{ monthStart: string; rows: MonthlyPeriod['rows'] }>) {
  return (
    <section aria-labelledby="monthly-dates-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-dates-heading" className="m-0 text-xl font-bold">
          Daily review
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Final amounts appear only for complete dates. A dash means the date is not final.
        </p>
      </div>
      <div
        className="overflow-x-auto rounded-xl border border-[var(--wl-border)]"
        role="region"
        aria-label="Scrollable monthly daily review"
        tabIndex={0}
      >
        <table className="w-full min-w-[58rem] border-collapse text-left">
          <caption className="sr-only">
            Per-date monthly calculation for {formatLocalDate(monthStart)}
          </caption>
          <thead>
            <tr className="border-b border-[var(--wl-border)] text-sm">
              {[
                'Date',
                'Status',
                'Expected',
                'Worked',
                'Absence credit',
                'Adjustment',
                'Credited',
                'Balance',
              ].map((label) => (
                <th key={label} scope="col" className="p-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.localDate} className="border-b border-[var(--wl-border)] last:border-0">
                <th scope="row" className="p-3 font-medium">
                  {row.recordId === null ? (
                    formatLocalDate(row.localDate)
                  ) : (
                    <Link to={`/time-records/${encodeURIComponent(row.recordId)}`}>
                      {formatLocalDate(row.localDate)}
                    </Link>
                  )}
                </th>
                <td className="p-3">{dailyStatusLabel(row.status)}</td>
                <MinuteCell value={row.expectedMinutes} />
                <MinuteCell value={row.workedMinutes} />
                <MinuteCell value={row.absenceCreditMinutes} />
                <MinuteCell value={row.adjustmentMinutes} signed />
                <MinuteCell value={row.creditedMinutes} />
                <MinuteCell value={row.balanceMinutes} signed />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Total({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  return (
    <div>
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 mt-1 text-xl font-bold tabular-nums">{formatDuration(value, signed)}</dd>
    </div>
  );
}

function MinuteCell({
  value,
  signed = false,
}: Readonly<{ signed?: boolean; value: number | null }>) {
  return (
    <td className="p-3 tabular-nums">{value === null ? '—' : formatDuration(value, signed)}</td>
  );
}

function MonthlyLoading() {
  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label="Loading monthly period"
      className="h-2 rounded-full bg-[var(--wl-surface-subtle)]"
    />
  );
}

function MonthlyError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const code = error instanceof ApiClientError ? error.code : null;
  const message =
    code === 'ACCESS_DENIED'
      ? 'Your current role or reporting scope cannot view this monthly period.'
      : code === 'ROUTE_NOT_FOUND'
        ? 'This monthly period is unavailable.'
        : 'The monthly period could not be loaded. Check your connection and try again.';
  return (
    <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
      <p className="m-0">{message}</p>
      {code !== 'ACCESS_DENIED' && code !== 'ROUTE_NOT_FOUND' ? (
        <button className="wl-button-secondary w-fit" type="button" onClick={retry}>
          Try again
        </button>
      ) : null}
      <Link to="/my-time">Return to My time</Link>
    </div>
  );
}

function workflowLabel(status: MonthlyPeriod['workflow']['status']): string {
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./u, (value) => value.toUpperCase());
}

function readinessLabel(period: MonthlyPeriod): string {
  if (period.readiness.status === 'READY_FOR_SUBMISSION') return 'Ready for submission';
  if (period.readiness.status === 'INCOMPLETE') return 'Not ready';
  return workflowLabel(period.workflow.status);
}

function readinessExplanation(period: MonthlyPeriod): string {
  if (!period.readiness.monthEnded) {
    return 'This month is still in progress. Readiness can only become final after the organization-local month ends.';
  }
  if (period.readiness.status === 'READY_FOR_SUBMISSION') {
    return 'Every covered date is complete, posted, and reconciled, with no submission blocker.';
  }
  if (period.readiness.status === 'INCOMPLETE') {
    return 'Resolve every listed blocker and complete every covered date before submission.';
  }
  return 'This period is read-only in its current workflow state. Later Phase 8 tasks add its permitted transition actions.';
}

function attentionLabel(code: string): string {
  const labels: Readonly<Record<string, string>> = {
    ABSENCE_APPROVAL_PENDING: 'Absence approval pending',
    ATTENDANCE_INCOMPLETE: 'Attendance is incomplete',
    ATTENDANCE_INVALID_EVENT_ORDER: 'Attendance event order is invalid',
    ATTENDANCE_INVALID_EVENT_PRECISION: 'Attendance event precision is invalid',
    ATTENDANCE_OVERLAP: 'Attendance intervals overlap',
    CORRECTION_UNRESOLVED: 'Correction request unresolved',
    FLEX_NEGATIVE_THRESHOLD_EXCEEDED: 'Negative flexible-time threshold exceeded',
    FLEX_POSITIVE_THRESHOLD_EXCEEDED: 'Positive flexible-time threshold exceeded',
    LEDGER_SOURCE_MISMATCH: 'Calculated and posted time do not reconcile',
    POLICY_ASSIGNMENT_OVERLAP: 'Time policy assignments overlap',
    POLICY_CONFIGURATION_INVALID: 'Time policy configuration is invalid',
    POLICY_NOT_ASSIGNED: 'Time policy is missing',
    SCHEDULE_ASSIGNMENT_OVERLAP: 'Schedule assignments overlap',
    SCHEDULE_NOT_ASSIGNED: 'Schedule is missing',
    WORK_DURING_ABSENCE: 'Work overlaps approved absence',
    WORK_ON_HOLIDAY: 'Work was recorded on a holiday',
    WORK_ON_ZERO_EXPECTED_DAY: 'Work was recorded on a zero-expected day',
  };
  return labels[code] ?? code.replaceAll('_', ' ').toLowerCase();
}

function dailyStatusLabel(status: MonthlyPeriod['rows'][number]['status']): string {
  if (status === 'MISSING') return 'Missing daily result';
  return status.toLowerCase().replace(/^./u, (value) => value.toUpperCase());
}
