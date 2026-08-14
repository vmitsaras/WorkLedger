import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Link, useParams } from 'react-router';

import type { MonthlyPeriod } from '@workledger/contracts';

import { ApiClientError, submitMonthlyPeriod } from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { monthlyPeriodQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function MonthlyPeriodPage() {
  const periodId = useParams()['periodId'];
  const query = useQuery(monthlyPeriodQuery(periodId ?? ''));
  const queryClient = useQueryClient();
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const submissionErrorRef = useRef<HTMLDivElement>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const submission = useMutation({
    mutationFn: ({
      acknowledgedSourceFingerprint,
      expectedPeriodVersion,
      id,
    }: Readonly<{
      acknowledgedSourceFingerprint: string;
      expectedPeriodVersion: number;
      id: string;
    }>) => submitMonthlyPeriod(id, { acknowledgedSourceFingerprint, expectedPeriodVersion }),
    onError: (error) => {
      setSuccessMessage(null);
      if (isSubmissionConflict(error)) {
        setWarningAcknowledged(false);
        void query.refetch();
      }
    },
    onSuccess: (period) => {
      queryClient.setQueryData(monthlyPeriodQuery(period.id).queryKey, period);
      setWarningAcknowledged(false);
      setSuccessMessage('Monthly period submitted for review.');
    },
  });
  const resetSubmission = submission.reset;

  useEffect(() => {
    setSuccessMessage(null);
    setWarningAcknowledged(false);
    resetSubmission();
  }, [periodId, resetSubmission]);

  useEffect(() => {
    if (submission.isError) submissionErrorRef.current?.focus();
  }, [submission.isError, submission.error]);

  useEffect(() => {
    if (successMessage !== null) statusHeadingRef.current?.focus();
  }, [successMessage]);

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
            <h2
              id="monthly-status-heading"
              className="m-0 text-xl font-bold"
              ref={statusHeadingRef}
              tabIndex={-1}
            >
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
      <SubmissionSection
        error={submission.error}
        errorRef={submissionErrorRef}
        isPending={submission.isPending}
        onAcknowledgementChange={(checked) => {
          setWarningAcknowledged(checked);
          if (submission.isError) submission.reset();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          submission.mutate({
            acknowledgedSourceFingerprint: period.snapshotVersion.sourceFingerprint,
            expectedPeriodVersion: period.workflow.periodVersion,
            id: period.id,
          });
        }}
        period={period}
        successMessage={successMessage}
        warningAcknowledged={warningAcknowledged}
      />
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
          the submission step.
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

function SubmissionSection({
  error,
  errorRef,
  isPending,
  onAcknowledgementChange,
  onSubmit,
  period,
  successMessage,
  warningAcknowledged,
}: Readonly<{
  error: unknown;
  errorRef: RefObject<HTMLDivElement | null>;
  isPending: boolean;
  onAcknowledgementChange: (checked: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  period: MonthlyPeriod;
  successMessage: string | null;
  warningAcknowledged: boolean;
}>) {
  const canSubmit = period.availableActions.includes('SUBMIT');
  const hasWarnings = period.attention.warnings.length > 0;
  return (
    <section aria-labelledby="monthly-submission-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-submission-heading" className="m-0 text-xl font-bold">
          Submission
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Submission freezes ordinary edits until an eligible reviewer requests changes.
        </p>
      </div>

      {successMessage === null ? null : (
        <p className="wl-alert wl-alert-success m-0 rounded-xl border p-4" role="status">
          {successMessage}
        </p>
      )}
      {error === null ? null : (
        <div
          className="wl-alert wl-alert-error grid gap-2 rounded-xl border p-4"
          ref={errorRef}
          role="alert"
          tabIndex={-1}
        >
          <h3 className="m-0 text-lg font-bold">The month was not submitted</h3>
          <p className="m-0">{submissionErrorMessage(error)}</p>
        </div>
      )}

      {canSubmit ? (
        <form
          className="grid gap-4 rounded-xl border border-[var(--wl-border)] p-4"
          onSubmit={onSubmit}
        >
          {hasWarnings ? (
            <label className="flex items-start gap-3" htmlFor="monthly-warning-acknowledgement">
              <input
                checked={warningAcknowledged}
                className="mt-1 size-5"
                id="monthly-warning-acknowledgement"
                onChange={(event) => onAcknowledgementChange(event.currentTarget.checked)}
                type="checkbox"
              />
              <span>
                I reviewed all {period.attention.warnings.length.toString()} warning
                {period.attention.warnings.length === 1 ? '' : 's'} in this monthly source version.
              </span>
            </label>
          ) : (
            <p className="m-0">No warning acknowledgement is required for this source version.</p>
          )}
          <button
            className="wl-button-primary w-fit"
            disabled={isPending || (hasWarnings && !warningAcknowledged)}
            type="submit"
          >
            {isPending ? 'Submitting…' : 'Submit month'}
          </button>
          {hasWarnings && !warningAcknowledged ? (
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              Review and acknowledge the current warnings to enable submission.
            </p>
          ) : null}
        </form>
      ) : (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          {submissionAvailabilityMessage(period)}
        </p>
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
  if (period.workflow.status === 'SUBMITTED') {
    return 'This period was submitted and is read-only while it waits for reviewer action.';
  }
  if (period.workflow.status === 'APPROVED') {
    return 'This period is approved and remains read-only before its separate lock action.';
  }
  if (period.workflow.status === 'LOCKED') {
    return 'This period is locked. Ordinary edits cannot change its approved record.';
  }
  return 'This period is read-only in its current workflow state.';
}

function submissionAvailabilityMessage(period: MonthlyPeriod): string {
  if (period.workflow.status === 'SUBMITTED') return 'Submitted for reviewer action.';
  if (period.workflow.status === 'APPROVED') return 'Approved; submission is already complete.';
  if (period.workflow.status === 'LOCKED') return 'Locked; submission is already complete.';
  if (period.readiness.status === 'INCOMPLETE') {
    return 'Submission is unavailable until every blocker is resolved and every covered date is complete.';
  }
  return 'Only the employee who owns this monthly period can submit it.';
}

function submissionErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : null;
  switch (code) {
    case 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED':
      return 'The reviewed source changed. Review the refreshed warnings and acknowledge the current version before trying again.';
    case 'PERIOD_NOT_READY':
    case 'PERIOD_LEDGER_MISMATCH':
      return 'The refreshed period is not ready. Resolve its current blockers before trying again.';
    case 'PERIOD_VERSION_CONFLICT':
      return 'The workflow changed while you were reviewing it. Review the refreshed period before trying again.';
    case 'PERIOD_ALREADY_SUBMITTED':
      return 'This period has already been submitted.';
    case 'PERIOD_LOCKED':
    case 'PERIOD_STATE_CONFLICT':
      return 'Submission is no longer available in the current workflow state.';
    case 'ACCESS_DENIED':
      return 'Your current account cannot submit this monthly period.';
    default:
      return 'The monthly period could not be submitted. Check your connection and try again.';
  }
}

function isSubmissionConflict(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    [
      'PERIOD_ALREADY_SUBMITTED',
      'PERIOD_LEDGER_MISMATCH',
      'PERIOD_LOCKED',
      'PERIOD_NOT_READY',
      'PERIOD_STATE_CONFLICT',
      'PERIOD_VERSION_CONFLICT',
      'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED',
    ].includes(error.code)
  );
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
