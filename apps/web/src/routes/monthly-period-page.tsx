import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { Link, useParams } from 'react-router';

import type { MonthlyPeriod } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, DataTable, Dialog, Panel, RouteState, StatusBadge } from '@workledger/ui';

import {
  ApiClientError,
  lockMonthlyPeriod,
  reviewMonthlyPeriod,
  submitMonthlyPeriod,
} from '../app/api-client.js';
import { attentionPresentation } from '../app/presentation-codes.js';
import { monthlyPeriodQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { workflowStatusMessageKey } from '../app/workflow-status-presentation.js';
import { MonthlyPeriodPrintView } from '../components/monthly-period-print.js';
import { PageHeader } from '../components/page-header.js';

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

export function MonthlyPeriodPage() {
  const t = useWorkLedgerMessage();
  const periodId = useParams()['periodId'];
  const query = useQuery(monthlyPeriodQuery(periodId ?? ''));
  useBoundaryPresentation(
    query.isError ? t(monthlyErrorTitleKey(query.error)) : t('employee.monthly.frame.title'),
  );
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
      setSuccessMessage(t('employee.monthly.submission.success'));
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
          ? t('employee.monthly.reviewer.success.approved')
          : t('employee.monthly.reviewer.success.changesRequested'),
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
      setReviewSuccessMessage(t('employee.monthly.reviewer.success.locked'));
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
            setPrintStatus(t('employee.monthly.print.opened'));
          } catch (error) {
            setPrintStatus(printErrorMessage(error, t));
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
                {t(workflowStatusMessageKey(period.workflow.status))}
              </h2>
              <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                {t('employee.monthly.readiness.reviewVersion', {
                  version: period.workflow.periodVersion,
                })}
              </p>
            </div>
            <StatusBadge
              tone={period.readiness.status === 'READY_FOR_SUBMISSION' ? 'success' : 'warning'}
            >
              {readinessLabel(period, t)}
            </StatusBadge>
          </div>
          <p className="m-0">{readinessExplanation(period, t)}</p>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('employee.monthly.readiness.completeDates', {
              complete: period.readiness.completeDateCount,
              covered: period.readiness.coveredDateCount,
            })}
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
              setReviewReasonError(t('employee.monthly.reviewer.reason.error'));
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <section className="grid max-w-6xl gap-8">
      <div className="wl-screen-only">
        <PageHeader
          eyebrow={t('employee.monthly.frame.eyebrow')}
          title={t('employee.monthly.frame.title')}
          description={
            period === undefined
              ? t('employee.monthly.frame.description')
              : t('employee.monthly.frame.periodDescription', {
                  employee: period.employeeDisplayName,
                  end: formatDateOnly(runtime.locale, period.monthEnd),
                  start: formatDateOnly(runtime.locale, period.monthStart),
                  timeZone: period.timeZone,
                })
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
                {printAction.isPending
                  ? t('employee.monthly.action.preparePrint')
                  : t('employee.monthly.action.print')}
              </Button>
              <p className="m-0 max-w-2xl text-sm text-[var(--wl-text-muted)]">
                {t('employee.monthly.frame.printHelp')}
              </p>
              {printAction.status === null ? null : (
                <p
                  aria-label={t('employee.monthly.frame.printStatusLabel')}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const { blockers, warnings } = period.attention;
  return (
    <section aria-labelledby="monthly-attention-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-attention-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.attention.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.attention.description')}
        </p>
      </div>
      {blockers.length === 0 ? (
        <Alert
          announce={false}
          headingLevel="h3"
          title={t('employee.monthly.attention.noBlockers.title')}
          tone="success"
        >
          <p>{t('employee.monthly.attention.noBlockers.description')}</p>
        </Alert>
      ) : (
        <Alert
          announce={false}
          headingLevel="h3"
          title={t('employee.monthly.attention.blockers', { count: blockers.length })}
          tone="danger"
        >
          <ul className="mb-0 mt-3 grid gap-2 pl-5">
            {blockers.map((blocker, index) => (
              <li key={`${blocker.localDate ?? 'period'}-${blocker.code}-${index.toString()}`}>
                <strong>{attentionPresentation(blocker.code, t).title}</strong>
                {blocker.localDate === null ? (
                  ` — ${t('employee.monthly.attention.wholePeriod')}`
                ) : (
                  <>
                    {' — '}
                    {blocker.recordId === null ? (
                      formatDateOnly(runtime.locale, blocker.localDate)
                    ) : (
                      <Link to={`/time-records/${encodeURIComponent(blocker.recordId)}`}>
                        {t('employee.monthly.attention.reviewDaily', {
                          date: formatDateOnly(runtime.locale, blocker.localDate),
                        })}
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
          {t('employee.monthly.attention.noWarnings')}
        </p>
      ) : (
        <Alert
          announce={false}
          headingLevel="h3"
          title={t('employee.monthly.attention.warnings', { count: warnings.length })}
          tone="warning"
        >
          <ul className="mb-0 mt-3 grid gap-2 pl-5">
            {warnings.map((warning) => (
              <li key={`${warning.localDate}-${warning.code}-${warning.recordId}`}>
                <strong>{attentionPresentation(warning.code, t).title}</strong>
                {' — '}
                <Link to={`/time-records/${encodeURIComponent(warning.recordId)}`}>
                  {t('employee.monthly.attention.reviewDaily', {
                    date: formatDateOnly(runtime.locale, warning.localDate),
                  })}
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
  const t = useWorkLedgerMessage();
  const canSubmit = period.availableActions.includes('SUBMIT');
  const hasWarnings = period.attention.warnings.length > 0;
  return (
    <section aria-labelledby="monthly-submission-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-submission-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.submission.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.submission.description')}
        </p>
      </div>

      {successMessage === null ? null : (
        <Alert
          headingLevel="h3"
          title={t('employee.monthly.submission.successTitle')}
          tone="success"
        >
          <p>{successMessage}</p>
        </Alert>
      )}
      {error === null ? null : (
        <Alert
          className="outline-none"
          headingLevel="h3"
          ref={errorRef}
          tabIndex={-1}
          title={t('employee.monthly.submission.error.title')}
          tone="danger"
        >
          <p className="m-0">{submissionErrorMessage(error, t)}</p>
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
                {t('employee.monthly.submission.acknowledgement', {
                  count: period.attention.warnings.length,
                })}
              </span>
            </label>
          ) : (
            <p className="m-0">{t('employee.monthly.submission.noAcknowledgement')}</p>
          )}
          <Button
            className="w-fit"
            isDisabled={isPending || (hasWarnings && !warningAcknowledged)}
            type="submit"
          >
            {isPending
              ? t('employee.monthly.action.submitting')
              : t('employee.monthly.action.submit')}
          </Button>
          {hasWarnings && !warningAcknowledged ? (
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              {t('employee.monthly.submission.enableHint')}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          {submissionAvailabilityMessage(period, t)}
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
  const t = useWorkLedgerMessage();
  const canRequestChanges = period.availableActions.includes('REQUEST_CHANGES');
  const canApprove = period.availableActions.includes('APPROVE');
  const canLock = period.availableActions.includes('LOCK');
  const hasReviewerAction = canRequestChanges || canApprove || canLock;
  return (
    <section aria-labelledby="monthly-reviewer-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-reviewer-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.reviewer.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.reviewer.description')}
        </p>
      </div>
      {successMessage === null ? null : (
        <Alert
          headingLevel="h3"
          title={t('employee.monthly.reviewer.success.title')}
          tone="success"
        >
          <p>{successMessage}</p>
        </Alert>
      )}
      {error === null && reasonError === null ? null : (
        <Alert
          className="outline-none"
          headingLevel="h3"
          ref={errorRef}
          tabIndex={-1}
          title={t('employee.monthly.reviewer.error.noAction')}
          tone="danger"
        >
          <p className="m-0">
            {reasonError ?? reviewErrorMessage(error, t)}
            {reasonError === null ? null : (
              <>
                {' '}
                <a href="#monthly-review-reason">{t('employee.monthly.reviewer.reason.goTo')}</a>
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
                {t('employee.monthly.reviewer.reason.label')}
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
                {t('employee.monthly.reviewer.reason.help')}
              </p>
              <Button
                className="w-fit"
                isDisabled={isPending}
                onPress={onRequestChanges}
                variant="secondary"
              >
                {isPending
                  ? t('employee.monthly.action.recording')
                  : t('employee.monthly.action.requestChanges')}
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {canApprove ? (
              <Button isDisabled={isPending} onPress={onApprove}>
                {isPending
                  ? t('employee.monthly.action.recording')
                  : t('employee.monthly.action.approve')}
              </Button>
            ) : null}
            {canLock && period.approvedRecord !== null ? (
              <Dialog
                actions={({ close }) => (
                  <>
                    <Button isDisabled={isPending} onPress={close} variant="secondary">
                      {t('employee.monthly.action.cancel')}
                    </Button>
                    <Button isDisabled={isPending} onPress={onLock}>
                      {isPending
                        ? t('employee.monthly.action.locking')
                        : t('employee.monthly.action.permanentlyLock')}
                    </Button>
                  </>
                )}
                isDismissable={!isPending}
                isOpen={lockConfirmationOpen}
                onOpenChange={(open) => {
                  if (!isPending || open) onLockConfirmationChange(open);
                }}
                title={t('employee.monthly.reviewer.lock.title')}
                triggerIsDisabled={isPending}
                triggerLabel={t('employee.monthly.action.lock')}
                triggerVariant="primary"
              >
                <p className="m-0">
                  {t('employee.monthly.reviewer.lock.description', {
                    cycle: period.approvedRecord.approvalCycle,
                  })}
                </p>
              </Dialog>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          {reviewerAvailabilityMessage(period, t)}
        </p>
      )}
    </section>
  );
}

function ApprovedRecordSection({ period }: Readonly<{ period: MonthlyPeriod }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const record = period.approvedRecord;
  if (record === null && period.reviewHistory.length === 0) return null;
  return (
    <section aria-labelledby="monthly-approved-record-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-approved-record-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.approved.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.approved.description')}
        </p>
      </div>
      {record === null ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          {t('employee.monthly.approved.empty')}
        </p>
      ) : (
        <Panel className="grid gap-4" density="balanced">
          <p className="m-0">
            <strong>
              {t('employee.monthly.approved.metadata', {
                cycle: record.approvalCycle,
                engine: record.calculationEngineVersion,
                schemaVersion: record.schemaVersion,
                workflowVersion: record.periodVersion,
              })}
            </strong>
          </p>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('employee.monthly.approved.summary', {
              approvedAt: formatInstant(runtime.locale, record.approvedAt, period.timeZone),
              balance: formatCompactDuration(runtime, record.totals.balanceMinutes, true),
              closing: formatCompactDuration(
                runtime,
                record.totals.ledgerClosingBalanceMinutes,
                true,
              ),
              credited: formatCompactDuration(runtime, record.totals.creditedMinutes),
              expected: formatCompactDuration(runtime, record.totals.expectedMinutes),
            })}
          </p>
        </Panel>
      )}
      {period.reviewHistory.length === 0 ? null : (
        <ol
          className="m-0 grid gap-3 pl-5"
          aria-label={t('employee.monthly.approved.historyLabel')}
        >
          {period.reviewHistory.map((decision) => (
            <li key={`${decision.version.toString()}-${decision.action}`}>
              <strong>
                {t('employee.monthly.approved.historyItem', {
                  action: reviewActionLabel(decision.action, t),
                  authority: authorityLabel(decision.actorAuthority, t),
                  date: formatInstant(runtime.locale, decision.decidedAt, period.timeZone),
                  version: decision.version,
                })}
              </strong>
              {decision.reason === null ? null : <p className="mb-0 mt-1">{decision.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PostLockAdjustmentsSection({ period }: Readonly<{ period: MonthlyPeriod }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const view = period.postLockView;
  if (view === null) return null;
  return (
    <section aria-labelledby="monthly-adjusted-view-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-adjusted-view-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.adjustments.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.adjustments.description')}
        </p>
      </div>
      <Panel density="balanced">
        <dl
          aria-label={t('employee.monthly.adjustments.ariaLabel')}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Total
            label={t('employee.monthly.adjustments.metric.originalClosing')}
            value={view.originalClosingBalanceMinutes}
            signed
          />
          <Total
            label={t('employee.monthly.adjustments.metric.cumulativeDelta')}
            value={view.cumulativeDeltaMinutes}
            signed
          />
          <Total
            label={t('employee.monthly.adjustments.metric.adjustedClosing')}
            value={view.adjustedClosingBalanceMinutes}
            signed
          />
          <div>
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('employee.monthly.adjustments.metric.viewVersion')}
            </dt>
            <dd className="m-0 mt-1 text-xl font-bold tabular-nums">
              {view.currentViewVersion.toString()}
            </dd>
          </div>
        </dl>
      </Panel>
      {view.adjustments.length === 0 ? (
        <p className="m-0 rounded-xl border border-[var(--wl-border)] p-4">
          {t('employee.monthly.adjustments.empty')}
        </p>
      ) : (
        <DataTable
          caption={t('employee.monthly.adjustments.caption')}
          className="min-w-[52rem]"
          scrollHint={t('employee.monthly.adjustments.scrollHint')}
          scrollLabel={t('employee.monthly.adjustments.scrollLabel')}
        >
          <thead>
            <tr className="border-b border-[var(--wl-border)] text-sm">
              {adjustmentColumnLabels(t).map((label) => (
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
                <td className="p-3">{formatDateOnly(runtime.locale, adjustment.localDate)}</td>
                <td className="p-3">
                  {adjustment.kind === 'CORRECTION'
                    ? t('employee.monthly.adjustments.source.correction')
                    : t('employee.monthly.adjustments.source.absenceCancellation')}
                </td>
                <td className="p-3 tabular-nums">
                  {adjustment.kind === 'CORRECTION'
                    ? t('employee.monthly.adjustments.correctionEffect', {
                        previous: formatCompactDuration(
                          runtime,
                          adjustment.previousAdjustedWorkedMinutes,
                        ),
                        proposed: formatCompactDuration(runtime, adjustment.proposedWorkedMinutes),
                      })
                    : t('employee.monthly.adjustments.absenceEffect', {
                        credit: formatCompactDuration(
                          runtime,
                          adjustment.absenceCreditMinutesDelta,
                          true,
                        ),
                        expected: formatCompactDuration(
                          runtime,
                          adjustment.expectedMinutesDelta,
                          true,
                        ),
                      })}
                </td>
                <td className="p-3 tabular-nums">
                  {formatCompactDuration(runtime, adjustment.minutes, true)}
                </td>
                <td className="p-3">
                  {adjustment.kind === 'ABSENCE_CANCELLATION'
                    ? adjustment.minutes === 0
                      ? t('employee.monthly.adjustments.link.zeroCancellation')
                      : t('employee.monthly.adjustments.link.cancellation')
                    : adjustment.reversesAdjustmentId === null
                      ? adjustment.minutes === 0
                        ? t('employee.monthly.adjustments.link.zeroCorrection')
                        : t('employee.monthly.adjustments.link.correction')
                      : t('employee.monthly.adjustments.link.reverses', {
                          version: reversedVersion(view, adjustment.reversesAdjustmentId, t),
                        })}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </section>
  );
}

function reversedVersion(
  view: NonNullable<MonthlyPeriod['postLockView']>,
  adjustmentId: string,
  t: MessageTranslator,
): string {
  return (
    view.adjustments.find(({ id }) => id === adjustmentId)?.adjustmentVersion.toString() ??
    t('employee.monthly.adjustments.link.unknownVersion')
  );
}

function TotalsSection({ totals }: Readonly<{ totals: MonthlyPeriod['totals'] }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="monthly-totals-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-totals-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.totals.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.totals.description')}
        </p>
      </div>
      <Panel density="balanced">
        <dl
          aria-label={t('employee.monthly.totals.ariaLabel')}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Total
            label={t('employee.monthly.daily.column.expected')}
            value={totals.expectedMinutes}
          />
          <Total label={t('employee.monthly.daily.column.worked')} value={totals.workedMinutes} />
          <Total label={t('employee.monthly.daily.column.break')} value={totals.breakMinutes} />
          <Total
            label={t('employee.monthly.daily.column.absenceCredit')}
            value={totals.absenceCreditMinutes}
          />
          <Total
            label={t('employee.monthly.daily.column.adjustment')}
            value={totals.adjustmentMinutes}
            signed
          />
          <Total
            label={t('employee.monthly.daily.column.credited')}
            value={totals.creditedMinutes}
          />
          <Total
            label={t('employee.monthly.totals.metric.calculatedBalance')}
            value={totals.balanceMinutes}
            signed
          />
          <Total
            label={t('employee.monthly.totals.metric.postedPeriodDelta')}
            value={totals.ledgerPeriodDeltaMinutes}
            signed
          />
        </dl>
      </Panel>
      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
        {t('employee.monthly.totals.postedBalances', {
          closing: formatCompactDuration(runtime, totals.ledgerClosingBalanceMinutes, true),
          opening: formatCompactDuration(runtime, totals.ledgerOpeningBalanceMinutes, true),
        })}
      </p>
    </section>
  );
}

function DailyRows({
  monthStart,
  rows,
}: Readonly<{ monthStart: string; rows: MonthlyPeriod['rows'] }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="monthly-dates-heading" className="grid gap-4">
      <div>
        <h2 id="monthly-dates-heading" className="m-0 text-xl font-bold">
          {t('employee.monthly.daily.heading')}
        </h2>
        <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
          {t('employee.monthly.daily.description')}
        </p>
      </div>
      <DataTable
        caption={t('employee.monthly.daily.caption', {
          month: formatDateOnly(runtime.locale, monthStart),
        })}
        className="min-w-[58rem]"
        scrollHint={t('employee.monthly.daily.scrollHint')}
        scrollLabel={t('employee.monthly.daily.scrollLabel')}
      >
        <thead>
          <tr className="border-b border-[var(--wl-border)] text-sm">
            {dailyColumnLabels(t, false).map((label) => (
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
                  formatDateOnly(runtime.locale, row.localDate)
                ) : (
                  <Link to={`/time-records/${encodeURIComponent(row.recordId)}`}>
                    {formatDateOnly(runtime.locale, row.localDate)}
                  </Link>
                )}
              </th>
              <td className="p-3">
                <StatusBadge tone={row.status === 'COMPLETE' ? 'success' : 'warning'}>
                  {dailyStatusLabel(row.status, t)}
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
  const runtime = useWorkLedgerI18n();
  return (
    <div>
      <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 mt-1 text-xl font-bold tabular-nums">
        {formatCompactDuration(runtime, value, signed)}
      </dd>
    </div>
  );
}

function MinuteCell({
  value,
  signed = false,
}: Readonly<{ signed?: boolean; value: number | null }>) {
  const runtime = useWorkLedgerI18n();
  return (
    <td className="p-3 tabular-nums">
      {value === null ? '—' : formatCompactDuration(runtime, value, signed)}
    </td>
  );
}

function MonthlyLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('employee.monthly.loading.title')}>
      <p>{t('employee.monthly.loading.description')}</p>
    </RouteState>
  );
}

function MonthlyError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const code = error instanceof ApiClientError ? error.code : null;
  const title = t(monthlyErrorTitleKey(error));
  const message =
    code === 'ACCESS_DENIED'
      ? t('employee.monthly.error.load.denied')
      : code === 'ROUTE_NOT_FOUND'
        ? t('employee.monthly.error.load.missing')
        : t('employee.monthly.error.load.unavailable');
  const state = (
    <RouteState
      actions={
        code !== 'ACCESS_DENIED' && code !== 'ROUTE_NOT_FOUND' ? (
          <Button type="button" onPress={retry} variant="secondary">
            {t('employee.monthly.action.retry')}
          </Button>
        ) : undefined
      }
      actionHref="/my-time"
      actionLabel={t('employee.records.backToTime')}
      kind={
        code === 'ACCESS_DENIED'
          ? 'permission-denied'
          : code === 'ROUTE_NOT_FOUND'
            ? 'not-found'
            : 'error'
      }
      title={
        code === 'ACCESS_DENIED'
          ? t('employee.monthly.error.state.denied')
          : code === 'ROUTE_NOT_FOUND'
            ? t('employee.monthly.error.state.missing')
            : t('employee.monthly.error.state.unavailable')
      }
    >
      <p className="m-0">{message}</p>
    </RouteState>
  );
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow={t('employee.monthly.frame.eyebrow')}
        title={title}
        description={
          code === 'ACCESS_DENIED'
            ? t('employee.monthly.error.description.denied')
            : t('employee.monthly.error.description.recovery')
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

function monthlyErrorTitleKey(error: unknown): MessageKey {
  const code = error instanceof ApiClientError ? error.code : null;
  if (code === 'ACCESS_DENIED') return 'employee.monthly.error.boundary.denied';
  if (code === 'ROUTE_NOT_FOUND') return 'employee.monthly.error.boundary.missing';
  return 'employee.monthly.error.boundary.unavailable';
}

function printErrorMessage(error: unknown, t: MessageTranslator): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ACCESS_DENIED') {
      return t('employee.monthly.error.print.denied');
    }
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED') {
      return t('employee.monthly.error.print.session');
    }
  }
  return t('employee.monthly.error.print.unavailable');
}

function readinessLabel(period: MonthlyPeriod, t: MessageTranslator): string {
  if (period.readiness.status === 'READY_FOR_SUBMISSION') {
    return t('employee.monthly.readiness.label.ready');
  }
  if (period.readiness.status === 'INCOMPLETE') {
    return t('employee.monthly.readiness.label.notReady');
  }
  return t(workflowStatusMessageKey(period.workflow.status));
}

function readinessExplanation(period: MonthlyPeriod, t: MessageTranslator): string {
  if (!period.readiness.monthEnded) {
    return t('employee.monthly.readiness.explanation.inProgress');
  }
  if (period.readiness.status === 'READY_FOR_SUBMISSION') {
    return t('employee.monthly.readiness.explanation.ready');
  }
  if (period.readiness.status === 'INCOMPLETE') {
    return t('employee.monthly.readiness.explanation.incomplete');
  }
  if (period.workflow.status === 'SUBMITTED') {
    return t('employee.monthly.readiness.explanation.submitted');
  }
  if (period.workflow.status === 'APPROVED') {
    return t('employee.monthly.readiness.explanation.approved');
  }
  if (period.workflow.status === 'LOCKED') {
    return period.postLockView?.status === 'ADJUSTED_AFTER_LOCK'
      ? t('employee.monthly.readiness.explanation.lockedAdjusted')
      : t('employee.monthly.readiness.explanation.locked');
  }
  return t('employee.monthly.readiness.explanation.readOnly');
}

function submissionAvailabilityMessage(period: MonthlyPeriod, t: MessageTranslator): string {
  if (period.workflow.status === 'SUBMITTED') {
    return t('employee.monthly.submission.availability.submitted');
  }
  if (period.workflow.status === 'APPROVED') {
    return t('employee.monthly.submission.availability.approved');
  }
  if (period.workflow.status === 'LOCKED') {
    return t('employee.monthly.submission.availability.locked');
  }
  if (period.readiness.status === 'INCOMPLETE') {
    return t('employee.monthly.submission.availability.incomplete');
  }
  return t('employee.monthly.submission.availability.ownerOnly');
}

function submissionErrorMessage(error: unknown, t: MessageTranslator): string {
  const code = error instanceof ApiClientError ? error.code : null;
  switch (code) {
    case 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED':
      return t('employee.monthly.submission.error.warningsChanged');
    case 'PERIOD_NOT_READY':
    case 'PERIOD_LEDGER_MISMATCH':
      return t('employee.monthly.submission.error.notReady');
    case 'PERIOD_VERSION_CONFLICT':
      return t('employee.monthly.submission.error.versionChanged');
    case 'PERIOD_ALREADY_SUBMITTED':
      return t('employee.monthly.submission.error.alreadySubmitted');
    case 'PERIOD_LOCKED':
    case 'PERIOD_STATE_CONFLICT':
      return t('employee.monthly.submission.error.stateChanged');
    case 'ACCESS_DENIED':
      return t('employee.monthly.submission.error.denied');
    default:
      return t('employee.monthly.submission.error.generic');
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

function reviewerAvailabilityMessage(period: MonthlyPeriod, t: MessageTranslator): string {
  if (period.workflow.status === 'SUBMITTED') {
    return t('employee.monthly.reviewer.availability.submitted');
  }
  if (period.workflow.status === 'CHANGES_REQUESTED') {
    return t('employee.monthly.reviewer.availability.changesRequested');
  }
  if (period.workflow.status === 'APPROVED') {
    return t('employee.monthly.reviewer.availability.approved');
  }
  if (period.workflow.status === 'LOCKED') {
    return t('employee.monthly.reviewer.availability.locked');
  }
  return t('employee.monthly.reviewer.availability.open');
}

function reviewErrorMessage(error: unknown, t: MessageTranslator): string {
  const code = error instanceof ApiClientError ? error.code : null;
  switch (code) {
    case 'PERIOD_SOURCE_CHANGED':
      return t('employee.monthly.reviewer.error.sourceChanged');
    case 'PERIOD_VERSION_CONFLICT':
      return t('employee.monthly.reviewer.error.versionChanged');
    case 'PERIOD_LEDGER_MISMATCH':
    case 'PERIOD_NOT_READY':
      return t('employee.monthly.reviewer.error.notReady');
    case 'PERIOD_STATE_CONFLICT':
      return t('employee.monthly.reviewer.error.stateChanged');
    case 'APPROVAL_SELF_NOT_ALLOWED':
      return t('employee.monthly.reviewer.error.self');
    case 'ACCESS_DENIED':
      return t('employee.monthly.reviewer.error.denied');
    default:
      return t('employee.monthly.reviewer.error.generic');
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

function reviewActionLabel(
  action: MonthlyPeriod['reviewHistory'][number]['action'],
  t: MessageTranslator,
): string {
  if (action === 'REQUEST_CHANGES') return t('employee.monthly.approved.action.requestChanges');
  if (action === 'APPROVE') return t('employee.monthly.approved.action.approve');
  return t('employee.monthly.approved.action.lock');
}

function authorityLabel(
  authority: MonthlyPeriod['reviewHistory'][number]['actorAuthority'],
  t: MessageTranslator,
): string {
  return authority === 'CURRENT_MANAGER'
    ? t('employee.monthly.approved.authority.manager')
    : t('employee.monthly.approved.authority.hr');
}

function adjustmentColumnLabels(t: MessageTranslator): readonly string[] {
  return [
    t('employee.monthly.adjustments.column.version'),
    t('employee.monthly.adjustments.column.date'),
    t('employee.monthly.adjustments.column.source'),
    t('employee.monthly.adjustments.column.effect'),
    t('employee.monthly.adjustments.column.balanceDelta'),
    t('employee.monthly.adjustments.column.link'),
  ];
}

function dailyColumnLabels(t: MessageTranslator, includeBreak: boolean): readonly string[] {
  return [
    t('employee.monthly.daily.column.date'),
    t('employee.monthly.daily.column.status'),
    t('employee.monthly.daily.column.expected'),
    t('employee.monthly.daily.column.worked'),
    ...(includeBreak ? [t('employee.monthly.daily.column.break')] : []),
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
