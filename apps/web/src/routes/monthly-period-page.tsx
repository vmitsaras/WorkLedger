import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Link, useParams } from 'react-router';

import type { MonthlyPeriod } from '@workledger/contracts';
import { Alert, Button, DataTable, Dialog, Panel, RouteState, StatusBadge } from '@workledger/ui';

import {
  ApiClientError,
  lockMonthlyPeriod,
  reviewMonthlyPeriod,
  submitMonthlyPeriod,
} from '../app/api-client.js';
import { formatDuration, formatLocalDate } from '../app/date-time-format.js';
import { monthlyPeriodQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { MonthlyPeriodPrintView } from '../components/monthly-period-print.js';
import { PageHeader } from '../components/page-header.js';

export function MonthlyPeriodPage() {
  const periodId = useParams()['periodId'];
  const query = useQuery(monthlyPeriodQuery(periodId ?? ''));
  useBoundaryPresentation(query.isError ? monthlyErrorTitle(query.error) : 'Monthly period');
  const queryClient = useQueryClient();
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const submissionErrorRef = useRef<HTMLElement>(null);
  const reviewErrorRef = useRef<HTMLElement>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewReasonError, setReviewReasonError] = useState<string | null>(null);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);
  const [lockConfirmationOpen, setLockConfirmationOpen] = useState(false);
  const [printPending, setPrintPending] = useState(false);
  const [printPeriod, setPrintPeriod] = useState<MonthlyPeriod | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
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
  const review = useMutation({
    mutationFn: ({
      action,
      period,
    }: Readonly<{
      action: 'APPROVE' | 'REQUEST_CHANGES';
      period: MonthlyPeriod;
    }>) =>
      reviewMonthlyPeriod(
        period.id,
        action === 'APPROVE'
          ? {
              action,
              expectedPeriodVersion: period.workflow.periodVersion,
              expectedSourceFingerprint: period.snapshotVersion.sourceFingerprint,
            }
          : {
              action,
              expectedPeriodVersion: period.workflow.periodVersion,
              expectedSourceFingerprint: period.snapshotVersion.sourceFingerprint,
              reason: reviewReason.trim(),
            },
      ),
    onError: (error) => {
      setReviewSuccessMessage(null);
      if (isReviewConflict(error)) void query.refetch();
    },
    onSuccess: (period, variables) => {
      queryClient.setQueryData(monthlyPeriodQuery(period.id).queryKey, period);
      setReviewReason('');
      setReviewReasonError(null);
      setReviewSuccessMessage(
        variables.action === 'APPROVE'
          ? 'Monthly period approved. The approved baseline is ready for a separate lock.'
          : 'Changes requested. The employee can now correct and resubmit the month.',
      );
    },
  });
  const lock = useMutation({
    mutationFn: (period: MonthlyPeriod) => {
      if (period.approvedRecord === null) throw new Error('Approved record is required.');
      return lockMonthlyPeriod(period.id, {
        expectedPeriodVersion: period.workflow.periodVersion,
        expectedSnapshotFingerprint: period.approvedRecord.snapshotFingerprint,
        expectedSourceFingerprint: period.snapshotVersion.sourceFingerprint,
      });
    },
    onError: (error) => {
      setReviewSuccessMessage(null);
      if (isReviewConflict(error)) void query.refetch();
    },
    onSuccess: (period) => {
      queryClient.setQueryData(monthlyPeriodQuery(period.id).queryKey, period);
      setLockConfirmationOpen(false);
      setReviewSuccessMessage(
        'Monthly period locked. Its approved record is permanent; later changes require an adjustment.',
      );
    },
  });
  const resetSubmission = submission.reset;
  const resetReview = review.reset;
  const resetLock = lock.reset;

  useEffect(() => {
    setSuccessMessage(null);
    setReviewSuccessMessage(null);
    setReviewReason('');
    setReviewReasonError(null);
    setLockConfirmationOpen(false);
    setPrintPeriod(null);
    setPrintStatus(null);
    setPrintPending(false);
    setWarningAcknowledged(false);
    resetSubmission();
    resetReview();
    resetLock();
  }, [periodId, resetLock, resetReview, resetSubmission]);

  useEffect(() => {
    if (submission.isError) submissionErrorRef.current?.focus();
  }, [submission.isError, submission.error]);

  useEffect(() => {
    if (review.isError || lock.isError) reviewErrorRef.current?.focus();
    if (reviewReasonError !== null) reviewErrorRef.current?.focus();
  }, [lock.error, lock.isError, review.error, review.isError, reviewReasonError]);

  useEffect(() => {
    if (successMessage !== null || reviewSuccessMessage !== null) {
      statusHeadingRef.current?.focus();
    }
  }, [reviewSuccessMessage, successMessage]);

  if (query.isPending)
    return (
      <MonthlyPeriodFrame>
        <MonthlyLoading />
      </MonthlyPeriodFrame>
    );
  if (query.isError || query.data === undefined) {
    return <MonthlyError error={query.error} retry={() => void query.refetch()} />;
  }

  const period = query.data;
  return (
    <MonthlyPeriodFrame
      period={period}
      printAction={{
        isPending: printPending,
        onPrint: async () => {
          setPrintPending(true);
          setPrintStatus(null);
          try {
            const refreshed = await query.refetch({ throwOnError: true });
            if (refreshed.data === undefined) {
              throw new Error('Monthly period refresh returned no data.');
            }
            flushSync(() => setPrintPeriod(refreshed.data));
            window.print();
            setPrintStatus('Print dialog opened with the latest monthly record.');
          } catch (error) {
            setPrintStatus(printErrorMessage(error));
          } finally {
            setPrintPending(false);
          }
        },
        status: printStatus,
      }}
    >
      <div className="wl-screen-only grid gap-8">
        <Panel aria-labelledby="monthly-status-heading" className="grid gap-4" density="balanced">
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
                Review version {period.workflow.periodVersion.toString()}
              </p>
            </div>
            <StatusBadge
              tone={period.readiness.status === 'READY_FOR_SUBMISSION' ? 'success' : 'warning'}
            >
              {readinessLabel(period)}
            </StatusBadge>
          </div>
          <p className="m-0">{readinessExplanation(period)}</p>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {period.readiness.completeDateCount.toString()} of{' '}
            {period.readiness.coveredDateCount.toString()} covered employment dates have complete
            daily calculations. If a source record changes, review the updated month before taking
            the next action.
          </p>
        </Panel>

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
        <ReviewerSection
          error={review.error ?? lock.error}
          errorRef={reviewErrorRef}
          isPending={review.isPending || lock.isPending}
          lockConfirmationOpen={lockConfirmationOpen}
          onApprove={() => review.mutate({ action: 'APPROVE', period })}
          onLock={() => lock.mutate(period)}
          onLockConfirmationChange={setLockConfirmationOpen}
          onReasonChange={(value) => {
            setReviewReason(value);
            if (reviewReasonError !== null) setReviewReasonError(null);
            if (review.isError) review.reset();
          }}
          onRequestChanges={() => {
            if (reviewReason.trim().length < 10) {
              setReviewReasonError('Enter a reason of at least 10 characters.');
              return;
            }
            setReviewReasonError(null);
            review.mutate({ action: 'REQUEST_CHANGES', period });
          }}
          period={period}
          reason={reviewReason}
          reasonError={reviewReasonError}
          successMessage={reviewSuccessMessage}
        />
        <ApprovedRecordSection period={period} />
        <PostLockAdjustmentsSection period={period} />
      </div>
      <MonthlyPeriodPrintView period={printPeriod ?? period} />
    </MonthlyPeriodFrame>
  );
}

function MonthlyPeriodFrame({
  children,
  period,
  printAction,
}: Readonly<{
  children: ReactNode;
  period?: MonthlyPeriod;
  printAction?: Readonly<{
    isPending: boolean;
    onPrint: () => Promise<void>;
    status: string | null;
  }>;
}>) {
  return (
    <section className="grid max-w-6xl gap-8">
      <div className="wl-screen-only">
        <PageHeader
          eyebrow="Monthly record"
          title="Monthly period"
          description={
            period === undefined
              ? 'Review the month’s status, totals, issues, and available decisions.'
              : `${period.employeeDisplayName} · ${formatLocalDate(period.monthStart)} to ${formatLocalDate(period.monthEnd)} · ${period.timeZone}`
          }
        >
          {printAction === undefined ? null : (
            <div className="grid gap-2">
              <Button
                className="w-fit"
                isDisabled={printAction.isPending}
                onPress={() => void printAction.onPrint()}
                variant="secondary"
              >
                {printAction.isPending ? 'Preparing print…' : 'Print monthly record'}
              </Button>
              <p className="m-0 max-w-2xl text-sm text-[var(--wl-text-muted)]">
                The print uses the latest monthly status, totals, daily values, approved baseline,
                and later adjustments. Private absence details and decision reasons are omitted.
              </p>
              {printAction.status === null ? null : (
                <p
                  aria-label="Monthly print status"
                  aria-atomic="true"
                  aria-live="polite"
                  className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]"
                  role="status"
                >
                  {printAction.status}
                </p>
              )}
            </div>
          )}
        </PageHeader>
      </div>
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
        <Alert announce={false} headingLevel="h3" title="No blockers" tone="success">
          <p>This review version has no issue that prevents submission.</p>
        </Alert>
      ) : (
        <Alert
          announce={false}
          headingLevel="h3"
          title={`${blockers.length.toString()} blocker${blockers.length === 1 ? '' : 's'}`}
          tone="danger"
        >
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
        </Alert>
      )}
      {warnings.length === 0 ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          No non-blocking warning is present in this review version.
        </p>
      ) : (
        <Alert
          announce={false}
          headingLevel="h3"
          title={`${warnings.length.toString()} warning${warnings.length === 1 ? '' : 's'}`}
          tone="warning"
        >
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
        </Alert>
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
  errorRef: RefObject<HTMLElement | null>;
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
        <Alert headingLevel="h3" title="Month submitted" tone="success">
          <p>{successMessage}</p>
        </Alert>
      )}
      {error === null ? null : (
        <Alert
          className="outline-none"
          headingLevel="h3"
          ref={errorRef}
          tabIndex={-1}
          title="The month was not submitted"
          tone="danger"
        >
          <p className="m-0">{submissionErrorMessage(error)}</p>
        </Alert>
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
          <Button
            className="w-fit"
            isDisabled={isPending || (hasWarnings && !warningAcknowledged)}
            type="submit"
          >
            {isPending ? 'Submitting…' : 'Submit month'}
          </Button>
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

function ReviewerSection({
  error,
  errorRef,
  isPending,
  lockConfirmationOpen,
  onApprove,
  onLock,
  onLockConfirmationChange,
  onReasonChange,
  onRequestChanges,
  period,
  reason,
  reasonError,
  successMessage,
}: Readonly<{
  error: unknown;
  errorRef: RefObject<HTMLElement | null>;
  isPending: boolean;
  lockConfirmationOpen: boolean;
  onApprove: () => void;
  onLock: () => void;
  onLockConfirmationChange: (open: boolean) => void;
  onReasonChange: (value: string) => void;
  onRequestChanges: () => void;
  period: MonthlyPeriod;
  reason: string;
  reasonError: string | null;
  successMessage: string | null;
}>) {
  const canRequestChanges = period.availableActions.includes('REQUEST_CHANGES');
  const canApprove = period.availableActions.includes('APPROVE');
  const canLock = period.availableActions.includes('LOCK');
  const hasReviewerAction = canRequestChanges || canApprove || canLock;
  return (
    <section aria-labelledby="monthly-reviewer-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-reviewer-heading" className="m-0 text-xl font-bold">
          Reviewer decision
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          Approve when the month is ready. Lock month is a separate permanent action.
        </p>
      </div>
      {successMessage === null ? null : (
        <Alert headingLevel="h3" title="Monthly record updated" tone="success">
          <p>{successMessage}</p>
        </Alert>
      )}
      {error === null && reasonError === null ? null : (
        <Alert
          className="outline-none"
          headingLevel="h3"
          ref={errorRef}
          tabIndex={-1}
          title="No reviewer action was recorded"
          tone="danger"
        >
          <p className="m-0">
            {reasonError ?? reviewErrorMessage(error)}
            {reasonError === null ? null : (
              <>
                {' '}
                <a href="#monthly-review-reason">Go to decision reason.</a>
              </>
            )}
          </p>
        </Alert>
      )}
      {hasReviewerAction ? (
        <div className="grid gap-5 rounded-xl border border-[var(--wl-border)] p-4">
          {canRequestChanges ? (
            <div className="grid gap-3">
              <label className="grid gap-2 font-semibold" htmlFor="monthly-review-reason">
                Reason for requesting changes
                <textarea
                  aria-describedby="monthly-review-reason-help"
                  aria-invalid={reasonError === null ? undefined : true}
                  className="min-h-28 rounded-lg border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-3 font-normal"
                  disabled={isPending}
                  id="monthly-review-reason"
                  maxLength={2_000}
                  onChange={(event) => onReasonChange(event.currentTarget.value)}
                  value={reason}
                />
              </label>
              <p
                className="m-0 text-sm text-[var(--wl-text-muted)]"
                id="monthly-review-reason-help"
              >
                At least 10 characters. The employee can read this reason on their monthly detail;
                it is omitted from notifications and the approval inbox.
              </p>
              <Button
                className="w-fit"
                isDisabled={isPending}
                onPress={onRequestChanges}
                variant="secondary"
              >
                {isPending ? 'Recording…' : 'Request changes'}
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {canApprove ? (
              <Button isDisabled={isPending} onPress={onApprove}>
                {isPending ? 'Recording…' : 'Approve month'}
              </Button>
            ) : null}
            {canLock && period.approvedRecord !== null ? (
              <Dialog
                actions={({ close }) => (
                  <>
                    <Button isDisabled={isPending} onPress={close} variant="secondary">
                      Cancel
                    </Button>
                    <Button isDisabled={isPending} onPress={onLock}>
                      {isPending ? 'Locking…' : 'Permanently lock month'}
                    </Button>
                  </>
                )}
                isDismissable={!isPending}
                isOpen={lockConfirmationOpen}
                onOpenChange={(open) => {
                  if (!isPending || open) onLockConfirmationChange(open);
                }}
                title="Permanently lock this month?"
                triggerIsDisabled={isPending}
                triggerLabel="Lock month"
                triggerVariant="primary"
              >
                <p className="m-0">
                  Locking preserves approval cycle {period.approvedRecord.approvalCycle.toString()}{' '}
                  as the permanent baseline. There is no ordinary unlock; later accepted changes use
                  the post-lock adjustment path. Cancel to leave the month approved.
                </p>
              </Dialog>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          {reviewerAvailabilityMessage(period)}
        </p>
      )}
    </section>
  );
}

function ApprovedRecordSection({ period }: Readonly<{ period: MonthlyPeriod }>) {
  const record = period.approvedRecord;
  if (record === null && period.reviewHistory.length === 0) return null;
  return (
    <section aria-labelledby="monthly-approved-record-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-approved-record-heading" className="m-0 text-xl font-bold">
          Approved record
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          This approved baseline stays available if changes are requested later.
        </p>
      </div>
      {record === null ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          No approval snapshot has been created for the current review cycle.
        </p>
      ) : (
        <Panel className="grid gap-4" density="balanced">
          <p className="m-0">
            <strong>Approval cycle {record.approvalCycle.toString()}</strong> · workflow version{' '}
            {record.periodVersion.toString()} · schema {record.schemaVersion.toString()} · engine{' '}
            {record.calculationEngineVersion}
          </p>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Approved {formatInstant(record.approvedAt, period.timeZone)}. Snapshot totals: expected{' '}
            {formatDuration(record.totals.expectedMinutes)}, credited{' '}
            {formatDuration(record.totals.creditedMinutes)}, balance{' '}
            {formatDuration(record.totals.balanceMinutes, true)}, closing posted balance{' '}
            {formatDuration(record.totals.ledgerClosingBalanceMinutes, true)}.
          </p>
        </Panel>
      )}
      {period.reviewHistory.length === 0 ? null : (
        <ol className="m-0 grid gap-3 pl-5" aria-label="Monthly reviewer history">
          {period.reviewHistory.map((decision) => (
            <li key={`${decision.version.toString()}-${decision.action}`}>
              <strong>{reviewActionLabel(decision.action)}</strong> ·{' '}
              {authorityLabel(decision.actorAuthority)} ·{' '}
              {formatInstant(decision.decidedAt, period.timeZone)} · version{' '}
              {decision.version.toString()}
              {decision.reason === null ? null : <p className="mb-0 mt-1">{decision.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PostLockAdjustmentsSection({ period }: Readonly<{ period: MonthlyPeriod }>) {
  const view = period.postLockView;
  if (view === null) return null;
  return (
    <section aria-labelledby="monthly-adjusted-view-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-adjusted-view-heading" className="m-0 text-xl font-bold">
          Current adjusted view
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          The approved baseline above stays unchanged. This view adds the accepted corrections and
          absence cancellations in order.
        </p>
      </div>
      <Panel density="balanced">
        <dl
          aria-label="Post-lock balance reconciliation"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Total
            label="Original closing balance"
            value={view.originalClosingBalanceMinutes}
            signed
          />
          <Total label="Cumulative post-lock delta" value={view.cumulativeDeltaMinutes} signed />
          <Total
            label="Adjusted closing balance"
            value={view.adjustedClosingBalanceMinutes}
            signed
          />
          <div>
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
              Current view version
            </dt>
            <dd className="m-0 mt-1 text-xl font-bold tabular-nums">
              {view.currentViewVersion.toString()}
            </dd>
          </div>
        </dl>
      </Panel>
      {view.adjustments.length === 0 ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          No post-lock adjustment has been accepted. The current view equals the approved baseline.
        </p>
      ) : (
        <DataTable
          caption="Ordered post-lock corrections and absence cancellations applied to the approved monthly baseline"
          className="min-w-[52rem]"
          scrollHint="Scroll horizontally to review every adjustment column."
          scrollLabel="Scrollable post-lock adjustment history"
        >
          <thead>
            <tr className="border-b border-[var(--wl-border)] text-sm">
              {['Version', 'Date', 'Source', 'Effect', 'Balance delta', 'Link'].map((label) => (
                <th className="p-3" key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.adjustments.map((adjustment) => (
              <tr className="border-b border-[var(--wl-border)] last:border-0" key={adjustment.id}>
                <th className="p-3" scope="row">
                  {adjustment.adjustmentVersion.toString()}
                </th>
                <td className="p-3">{formatLocalDate(adjustment.localDate)}</td>
                <td className="p-3">
                  {adjustment.kind === 'CORRECTION' ? 'Time correction' : 'Absence cancellation'}
                </td>
                <td className="p-3 tabular-nums">
                  {adjustment.kind === 'CORRECTION'
                    ? `${formatDuration(adjustment.previousAdjustedWorkedMinutes)} → ${formatDuration(adjustment.proposedWorkedMinutes)} worked`
                    : `Absence credit ${formatDuration(adjustment.absenceCreditMinutesDelta, true)}; expected ${formatDuration(adjustment.expectedMinutesDelta, true)}`}
                </td>
                <td className="p-3 tabular-nums">{formatDuration(adjustment.minutes, true)}</td>
                <td className="p-3">
                  {adjustment.kind === 'ABSENCE_CANCELLATION'
                    ? adjustment.minutes === 0
                      ? 'Zero-delta cancellation evidence'
                      : 'Cancellation adjustment'
                    : adjustment.reversesAdjustmentId === null
                      ? adjustment.minutes === 0
                        ? 'Zero-delta evidence'
                        : 'Correction adjustment'
                      : `Reverses version ${reversedVersion(view, adjustment.reversesAdjustmentId)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </section>
  );
}

function reversedVersion(view: NonNullable<MonthlyPeriod['postLockView']>, adjustmentId: string) {
  return (
    view.adjustments.find(({ id }) => id === adjustmentId)?.adjustmentVersion.toString() ??
    'unknown'
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
      <Panel density="balanced">
        <dl
          aria-label="Monthly calculated totals"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
      </Panel>
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
      <DataTable
        caption={`Per-date monthly calculation for ${formatLocalDate(monthStart)}`}
        className="min-w-[58rem]"
        scrollHint="Scroll horizontally to review all daily calculation columns."
        scrollLabel="Scrollable monthly daily review"
      >
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
              <td className="p-3">
                <StatusBadge tone={row.status === 'COMPLETE' ? 'success' : 'warning'}>
                  {dailyStatusLabel(row.status)}
                </StatusBadge>
              </td>
              <MinuteCell value={row.expectedMinutes} />
              <MinuteCell value={row.workedMinutes} />
              <MinuteCell value={row.absenceCreditMinutes} />
              <MinuteCell value={row.adjustmentMinutes} signed />
              <MinuteCell value={row.creditedMinutes} />
              <MinuteCell value={row.balanceMinutes} signed />
            </tr>
          ))}
        </tbody>
      </DataTable>
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
    <RouteState kind="loading" title="Loading monthly period">
      <p>Preparing the current status, totals, issues, and available actions.</p>
    </RouteState>
  );
}

function MonthlyError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const code = error instanceof ApiClientError ? error.code : null;
  const title = monthlyErrorTitle(error);
  const message =
    code === 'ACCESS_DENIED'
      ? 'Your current role or reporting scope cannot view this monthly period.'
      : code === 'ROUTE_NOT_FOUND'
        ? 'This monthly period is unavailable.'
        : 'The monthly period could not be loaded. Check your connection and try again.';
  const state = (
    <RouteState
      actions={
        code !== 'ACCESS_DENIED' && code !== 'ROUTE_NOT_FOUND' ? (
          <Button type="button" onPress={retry} variant="secondary">
            Try again
          </Button>
        ) : undefined
      }
      actionHref="/my-time"
      actionLabel="Return to My time"
      kind={
        code === 'ACCESS_DENIED'
          ? 'permission-denied'
          : code === 'ROUTE_NOT_FOUND'
            ? 'not-found'
            : 'error'
      }
      title={
        code === 'ACCESS_DENIED'
          ? 'This monthly record is outside your review scope'
          : code === 'ROUTE_NOT_FOUND'
            ? 'This monthly record is not available'
            : 'The monthly record could not be loaded'
      }
    >
      <p className="m-0">{message}</p>
    </RouteState>
  );
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow="Route status"
        title={title}
        description={
          code === 'ACCESS_DENIED'
            ? 'This monthly record is outside your current review scope.'
            : 'Choose a recovery action to continue your monthly work.'
        }
      />
      {code === 'ACCESS_DENIED' || code === 'ROUTE_NOT_FOUND' ? (
        state
      ) : (
        <div role="alert">{state}</div>
      )}
    </section>
  );
}

function monthlyErrorTitle(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : null;
  if (code === 'ACCESS_DENIED') return 'Permission denied';
  if (code === 'ROUTE_NOT_FOUND') return 'Monthly period not found';
  return 'Monthly period unavailable';
}

function printErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ACCESS_DENIED') {
      return 'Your reporting scope changed. The print dialog was not opened.';
    }
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED') {
      return 'Your session ended. The print dialog was not opened.';
    }
  }
  return 'The monthly record could not be refreshed. The print dialog was not opened.';
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
    return period.postLockView?.status === 'ADJUSTED_AFTER_LOCK'
      ? 'This period is locked and has accepted post-lock adjustments. The approved record remains unchanged; current totals include the ordered adjustment chain.'
      : 'This period is locked. Ordinary edits cannot change its approved record.';
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

function reviewerAvailabilityMessage(period: MonthlyPeriod): string {
  if (period.workflow.status === 'SUBMITTED') {
    return 'Waiting for an eligible current manager or organization HR reviewer.';
  }
  if (period.workflow.status === 'CHANGES_REQUESTED') {
    return 'Changes were requested. The employee must correct and resubmit before another approval.';
  }
  if (period.workflow.status === 'APPROVED') {
    return 'This month is approved. Only a currently eligible non-self reviewer can request changes or lock it.';
  }
  if (period.workflow.status === 'LOCKED') {
    return 'This month is permanently locked. Later accepted changes use post-lock adjustments.';
  }
  return 'Reviewer actions become available after employee submission.';
}

function reviewErrorMessage(error: unknown): string {
  const code = error instanceof ApiClientError ? error.code : null;
  switch (code) {
    case 'PERIOD_SOURCE_CHANGED':
      return 'The monthly sources changed. Review the refreshed period; no decision was recorded.';
    case 'PERIOD_VERSION_CONFLICT':
      return 'The workflow changed in another tab or device. Review the refreshed status; no decision was recorded.';
    case 'PERIOD_LEDGER_MISMATCH':
    case 'PERIOD_NOT_READY':
      return 'The current monthly sources do not reconcile. Resolve the refreshed blockers before approval or lock.';
    case 'PERIOD_STATE_CONFLICT':
      return 'This reviewer action is no longer available in the refreshed workflow state.';
    case 'APPROVAL_SELF_NOT_ALLOWED':
      return 'You cannot review or lock your own monthly period.';
    case 'ACCESS_DENIED':
      return 'Your current role or reporting scope cannot perform this reviewer action.';
    default:
      return 'The reviewer action could not be recorded. Check your connection and try again.';
  }
}

function isReviewConflict(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    [
      'PERIOD_LEDGER_MISMATCH',
      'PERIOD_NOT_READY',
      'PERIOD_SOURCE_CHANGED',
      'PERIOD_STATE_CONFLICT',
      'PERIOD_VERSION_CONFLICT',
    ].includes(error.code)
  );
}

function reviewActionLabel(action: MonthlyPeriod['reviewHistory'][number]['action']): string {
  if (action === 'REQUEST_CHANGES') return 'Changes requested';
  if (action === 'APPROVE') return 'Approved';
  return 'Locked';
}

function authorityLabel(
  authority: MonthlyPeriod['reviewHistory'][number]['actorAuthority'],
): string {
  return authority === 'CURRENT_MANAGER' ? 'Current manager' : 'Organization HR';
}

function formatInstant(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
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
