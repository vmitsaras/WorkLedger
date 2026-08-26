import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import type { PersonalRequestDetail, PersonalRequestHistory } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, buttonVariants } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  submitAbsenceCancellation,
  withdrawAbsenceCancellation,
} from '../app/api-client.js';
import { personalRequestDetailQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { workflowStatusMessageKey } from '../app/workflow-status-presentation.js';
import { PageHeader } from '../components/page-header.js';
import { WorkflowStatusBadge } from '../components/workflow-status-badge.js';

type RequestCoverage = Extract<PersonalRequestDetail, { kind: 'ABSENCE' }>['coverage'];

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

const HISTORY_ACTION_KEYS = {
  ACKNOWLEDGE: 'employee.requests.detail.history.action.acknowledge',
  APPLY: 'employee.requests.detail.history.action.apply',
  APPROVE: 'employee.requests.detail.history.action.approve',
  CANCEL: 'employee.requests.detail.history.action.cancel',
  REJECT: 'employee.requests.detail.history.action.reject',
  REPORTED: 'employee.requests.detail.history.action.reported',
  REQUEST_CHANGES: 'employee.requests.detail.history.action.requestChanges',
  SUBMITTED: 'employee.requests.detail.history.action.submitted',
  WITHDRAW: 'employee.requests.detail.history.action.withdraw',
} as const satisfies Readonly<Record<PersonalRequestHistory['action'], MessageKey>>;

const HISTORY_ACTOR_KEYS = {
  REVIEWER: 'employee.requests.detail.history.actor.reviewer',
  SELF: 'employee.requests.detail.history.actor.self',
  SYSTEM: 'employee.requests.detail.history.actor.system',
} as const satisfies Readonly<Record<PersonalRequestHistory['actor'], MessageKey>>;

export function RequestDetailPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const requestId = useParams()['requestId'];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    ...personalRequestDetailQuery(requestId ?? ''),
    enabled: requestId !== undefined,
  });
  const action = useMutation({
    mutationFn: async (detail: PersonalRequestDetail) => {
      if (detail.kind === 'ABSENCE') {
        await submitAbsenceCancellation(detail.id, { expectedRequestVersion: detail.version });
        return t('employee.requests.detail.action.success.cancel');
      }
      if (detail.kind === 'CANCELLATION') {
        await withdrawAbsenceCancellation(detail.id, detail.version);
        return t('employee.requests.detail.action.success.withdraw');
      }
      throw new Error('Unsupported personal request action');
    },
    onSuccess: async () => {
      if (requestId === undefined) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['self', 'request', requestId] }),
        queryClient.invalidateQueries({ queryKey: ['self', 'requests'] }),
      ]);
    },
  });

  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') setPendingSignInNotice('SESSION_EXPIRED');
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);

  if (requestId === undefined) return <RequestNotFound />;
  if (query.isPending) {
    return (
      <section className="grid max-w-4xl gap-6">
        <PageHeader
          eyebrow={t('employee.requests.history.eyebrow')}
          title={t('employee.requests.detail.pageTitle')}
          description={t('employee.requests.detail.loading.description')}
        />
        <RouteState kind="loading" title={t('employee.requests.detail.loading.title')}>
          <p>{t('employee.requests.detail.loading.message')}</p>
        </RouteState>
      </section>
    );
  }
  if (query.isError || query.data === undefined) {
    const denied = query.error instanceof ApiClientError && query.error.code === 'ACCESS_DENIED';
    const missing = query.error instanceof ApiClientError && query.error.code === 'ROUTE_NOT_FOUND';
    return (
      <section className="grid max-w-4xl gap-6">
        <PageHeader
          eyebrow={t('employee.requests.history.eyebrow')}
          title={
            denied
              ? t('employee.requests.detail.error.denied.title')
              : missing
                ? t('employee.requests.detail.error.missing.title')
                : t('employee.requests.detail.error.unavailable.title')
          }
          description={
            denied
              ? t('employee.requests.detail.error.denied.description')
              : missing
                ? t('employee.requests.detail.error.missing.description')
                : t('employee.requests.detail.error.unavailable.description')
          }
        />
        {denied || missing ? (
          <Link className={`${buttonVariants({ variant: 'secondary' })} w-fit`} to="/requests">
            {t('employee.requests.detail.back')}
          </Link>
        ) : (
          <Button className="w-fit" onPress={() => void query.refetch()}>
            {t('shared.action.tryAgain')}
          </Button>
        )}
      </section>
    );
  }

  const detail = query.data;
  return (
    <section className="grid max-w-5xl gap-8">
      <PageHeader
        eyebrow={t('employee.requests.history.eyebrow')}
        title={detailTitle(detail, t)}
        description={dateRange(runtime.locale, detail.affectedStartDate, detail.affectedEndDate, t)}
      >
        <Link className="w-fit font-semibold" to="/requests">
          {t('employee.requests.detail.back')}
        </Link>
      </PageHeader>

      <section aria-labelledby="request-state-heading" className="grid gap-3">
        <h2 id="request-state-heading" className="m-0 text-xl font-bold">
          {t('employee.requests.detail.currentState')}
        </h2>
        <Panel className="grid gap-4" density="balanced">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <WorkflowStatusBadge status={detail.status} />
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              {t('employee.requests.detail.submitted', {
                date: formatInstant(runtime.locale, detail.submittedAt, detailTimeZone(detail)),
              })}
            </p>
          </div>
          <p className="m-0">{stateExplanation(detail, t)}</p>
        </Panel>
      </section>

      {action.isSuccess ? (
        <Alert title={t('employee.requests.detail.action.successTitle')} tone="success">
          <p className="m-0">{action.data}</p>
        </Alert>
      ) : null}
      {action.isError ? (
        <Alert title={t('employee.requests.detail.action.errorTitle')} tone="danger">
          <p className="m-0">{actionError(action.error, t)}</p>
        </Alert>
      ) : null}

      {detail.availableActions.length === 0 ? null : (
        <section aria-labelledby="request-actions-heading" className="grid gap-3">
          <h2 id="request-actions-heading" className="m-0 text-xl font-bold">
            {t('employee.requests.detail.action.available')}
          </h2>
          <Panel className="grid gap-3" density="balanced">
            <p className="m-0">{actionEffect(detail, t)}</p>
            <Button
              className="w-fit"
              isDisabled={action.isPending}
              onPress={() => action.mutate(detail)}
              variant="secondary"
            >
              {action.isPending
                ? t('employee.requests.detail.action.pending')
                : actionLabel(detail, t)}
            </Button>
          </Panel>
        </section>
      )}

      {detail.kind === 'CORRECTION' ? <CorrectionEvidence detail={detail} /> : null}
      {detail.kind === 'ABSENCE' ? <AbsenceEvidence detail={detail} /> : null}
      {detail.kind === 'CANCELLATION' ? <CancellationEvidence detail={detail} /> : null}
      <DecisionHistory history={detail.history} />
    </section>
  );
}

function CorrectionEvidence({
  detail,
}: Readonly<{ detail: Extract<PersonalRequestDetail, { kind: 'CORRECTION' }> }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="correction-evidence-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="correction-evidence-heading" className="m-0 text-xl font-bold">
          {t('employee.requests.detail.correction.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.requests.detail.correction.description')}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel as="article" className="grid gap-3" density="balanced">
          <h3 className="m-0 text-lg font-bold">
            {t('employee.requests.detail.correction.original')}
          </h3>
          <dl className="grid grid-cols-2 gap-2">
            <Metric
              label={t('employee.requests.detail.metric.expected')}
              value={detail.originalCalculation.expectedMinutes}
            />
            <Metric
              label={t('employee.requests.detail.metric.worked')}
              value={detail.originalCalculation.workedMinutes}
            />
            <Metric
              label={t('employee.requests.detail.metric.break')}
              value={detail.originalCalculation.breakMinutes}
            />
            <Metric
              label={t('employee.requests.detail.metric.credited')}
              value={detail.originalCalculation.creditedMinutes}
            />
            <Metric
              label={t('employee.requests.detail.metric.balance')}
              signed
              value={detail.originalCalculation.balanceMinutes}
            />
          </dl>
        </Panel>
        <Panel as="article" className="grid gap-3" density="balanced">
          <h3 className="m-0 text-lg font-bold">
            {t('employee.requests.detail.correction.proposed')}
          </h3>
          <dl className="grid grid-cols-2 gap-2">
            <dt className="font-semibold">{t('employee.requests.detail.correction.starts')}</dt>
            <dd className="m-0">
              {formatClockTimeWithOffset(runtime, detail.proposedStartsAt, detail.timeZone)}
            </dd>
            <dt className="font-semibold">{t('employee.requests.detail.correction.ends')}</dt>
            <dd className="m-0">
              {formatClockTimeWithOffset(runtime, detail.proposedEndsAt, detail.timeZone)}
            </dd>
            <dt className="font-semibold">
              {t('employee.requests.detail.correction.applicationLabel')}
            </dt>
            <dd className="m-0">
              {detail.applicationMode === 'POST_LOCK_ADJUSTMENT'
                ? t('employee.requests.detail.correction.application.postLock')
                : t('employee.requests.detail.correction.application.ordinary')}
            </dd>
          </dl>
        </Panel>
      </div>
      <Panel className="grid gap-3" density="balanced">
        <h3 className="m-0 text-lg font-bold">{t('employee.requests.detail.correction.reason')}</h3>
        <p className="m-0">{detail.requestReason}</p>
      </Panel>
      <Panel className="grid gap-3" density="balanced">
        <h3 className="m-0 text-lg font-bold">
          {t('employee.requests.detail.correction.events.heading')}
        </h3>
        {detail.events.length === 0 ? (
          <p className="m-0">{t('employee.requests.detail.correction.events.empty')}</p>
        ) : (
          <ol className="m-0 grid gap-2 pl-5">
            {detail.events.map((event) => (
              <li key={event.sequence}>
                {t('employee.requests.detail.event', {
                  event: eventLabel(event.type, t),
                  time: formatClockTimeWithOffset(runtime, event.occurredAt, detail.timeZone),
                })}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </section>
  );
}

function AbsenceEvidence({
  detail,
}: Readonly<{ detail: Extract<PersonalRequestDetail, { kind: 'ABSENCE' }> }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="absence-evidence-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="absence-evidence-heading" className="m-0 text-xl font-bold">
          {t('employee.requests.detail.absence.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.requests.detail.absence.description')}
        </p>
      </div>
      <Panel className="grid gap-3" density="balanced">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('employee.requests.detail.absence.type')}
            </dt>
            <dd className="m-0 mt-1 font-bold">{detail.absenceTypeName}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('employee.requests.detail.absence.workflowLabel')}
            </dt>
            <dd className="m-0 mt-1 font-bold">
              {detail.workflow === 'REPORT_AND_ACKNOWLEDGE'
                ? t('employee.requests.detail.absence.workflow.report')
                : t('employee.requests.detail.absence.workflow.approval')}
            </dd>
          </div>
        </dl>
        <CoverageList coverage={detail.coverage} />
      </Panel>
      {detail.relatedCancellations.length === 0 ? null : (
        <Panel className="grid gap-3" density="balanced">
          <h3 className="m-0 text-lg font-bold">
            {t('employee.requests.detail.absence.cancellations')}
          </h3>
          <ul className="m-0 grid gap-2 pl-5">
            {detail.relatedCancellations.map((cancellation) => (
              <li key={cancellation.id}>
                <Link to={`/requests/${cancellation.id}`}>
                  {t('employee.requests.detail.absence.cancellationLink', {
                    date: formatInstant(
                      runtime.locale,
                      cancellation.submittedAt,
                      detailTimeZone(detail),
                    ),
                    status: t(workflowStatusMessageKey(cancellation.status)),
                  })}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </section>
  );
}

function CancellationEvidence({
  detail,
}: Readonly<{ detail: Extract<PersonalRequestDetail, { kind: 'CANCELLATION' }> }>) {
  const t = useWorkLedgerMessage();
  return (
    <section aria-labelledby="cancellation-evidence-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="cancellation-evidence-heading" className="m-0 text-xl font-bold">
          {t('employee.requests.detail.cancellation.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.requests.detail.cancellation.description')}
        </p>
      </div>
      <Panel className="grid gap-3" density="balanced">
        <p className="m-0">
          {t('employee.requests.detail.cancellation.absenceType', {
            type: detail.absenceTypeName,
          })}
        </p>
        <CoverageList coverage={detail.coverage} />
        <Link className="w-fit font-semibold" to={`/requests/${detail.absenceRequestId}`}>
          {t('employee.requests.detail.cancellation.viewOriginal')}
        </Link>
      </Panel>
    </section>
  );
}

function CoverageList({ coverage }: Readonly<{ coverage: RequestCoverage }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  return (
    <ul className="m-0 grid gap-2 pl-5" aria-label={t('employee.absence.coverage.label')}>
      {coverage.map((segment) => (
        <li key={`${segment.localDate}-${segment.kind}-${segment.startsAtMinute ?? ''}`}>
          {t('employee.absence.coverage.line', {
            coverage: coverageLabel(segment.kind, segment.startsAtMinute, segment.endsAtMinute, t),
            date: formatDateOnly(runtime.locale, segment.localDate),
            duration: formatCompactDuration(runtime, segment.minutes),
            note: '',
          })}
        </li>
      ))}
    </ul>
  );
}

function DecisionHistory({ history }: Readonly<{ history: readonly PersonalRequestHistory[] }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const clientTimeZone = currentClientTimeZone();
  return (
    <section aria-labelledby="decision-history-heading" className="grid gap-4">
      <div className="grid gap-1">
        <h2 id="decision-history-heading" className="m-0 text-xl font-bold">
          {t('employee.requests.detail.history.heading')}
        </h2>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.requests.detail.history.description')}
        </p>
      </div>
      <ol className="m-0 grid list-none gap-3 p-0">
        {history.map((item, index) => (
          <li key={`${item.action}-${item.occurredAt}-${index}`}>
            <Panel as="article" className="grid gap-2" density="compact">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="m-0 text-base font-bold">{t(HISTORY_ACTION_KEYS[item.action])}</h3>
                <time className="text-sm text-[var(--wl-text-muted)]" dateTime={item.occurredAt}>
                  {formatInstant(runtime.locale, item.occurredAt, clientTimeZone)}
                </time>
              </div>
              <p className="m-0 text-sm">
                {t('employee.requests.detail.history.by', {
                  actor: t(HISTORY_ACTOR_KEYS[item.actor]),
                })}
              </p>
              {item.reason === null ? null : (
                <p className="m-0 text-sm">
                  {t('employee.requests.detail.history.reason', { reason: item.reason })}
                </p>
              )}
            </Panel>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Metric({
  label,
  signed = false,
  value,
}: Readonly<{ label: string; signed?: boolean; value: number }>) {
  const runtime = useWorkLedgerI18n();
  return (
    <>
      <dt className="font-semibold">{label}</dt>
      <dd className="m-0 text-right">{formatCompactDuration(runtime, value, signed)}</dd>
    </>
  );
}

function RequestNotFound() {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid max-w-3xl gap-6">
      <PageHeader
        eyebrow={t('employee.requests.history.eyebrow')}
        title={t('employee.requests.detail.error.missing.title')}
        description={t('employee.requests.detail.missingIdentifier.description')}
      />
      <Link className={`${buttonVariants({ variant: 'secondary' })} w-fit`} to="/requests">
        {t('employee.requests.detail.back')}
      </Link>
    </section>
  );
}

function detailTitle(detail: PersonalRequestDetail, t: MessageTranslator): string {
  if (detail.kind === 'CORRECTION') return t('employee.requests.detail.title.correction');
  if (detail.kind === 'CANCELLATION') return t('employee.requests.detail.title.cancellation');
  return detail.absenceTypeName;
}

function stateExplanation(detail: PersonalRequestDetail, t: MessageTranslator): string {
  if (detail.kind === 'CORRECTION') {
    if (detail.status === 'APPLIED') return t('employee.requests.detail.state.correction.applied');
    if (detail.status === 'APPROVED')
      return t('employee.requests.detail.state.correction.approved');
    if (detail.status === 'CHANGES_REQUESTED')
      return t('employee.requests.detail.state.correction.changesRequested');
    if (detail.status === 'REJECTED' || detail.status === 'WITHDRAWN')
      return t('employee.requests.detail.state.correction.complete');
    return t('employee.requests.detail.state.correction.pending');
  }
  if (detail.kind === 'CANCELLATION') {
    if (detail.status === 'APPROVED')
      return t('employee.requests.detail.state.cancellation.approved');
    if (detail.status === 'WITHDRAWN')
      return t('employee.requests.detail.state.cancellation.withdrawn');
    if (detail.status === 'REJECTED')
      return t('employee.requests.detail.state.cancellation.rejected');
    if (detail.status === 'CHANGES_REQUESTED')
      return t('employee.requests.detail.state.cancellation.changesRequested');
    return t('employee.requests.detail.state.cancellation.pending');
  }
  if (detail.status === 'REPORTED' || detail.status === 'ACKNOWLEDGED')
    return t('employee.requests.detail.state.absence.reported');
  if (detail.status === 'APPROVED' || detail.status === 'PARTIALLY_CANCELLED')
    return t('employee.requests.detail.state.absence.approved');
  if (detail.status === 'CANCELLED') return t('employee.requests.detail.state.absence.cancelled');
  if (detail.status === 'REJECTED' || detail.status === 'WITHDRAWN')
    return t('employee.requests.detail.state.absence.complete');
  if (detail.status === 'CHANGES_REQUESTED')
    return t('employee.requests.detail.state.absence.changesRequested');
  return t('employee.requests.detail.state.absence.pending');
}

function actionLabel(detail: PersonalRequestDetail, t: MessageTranslator): string {
  return detail.kind === 'CANCELLATION'
    ? t('employee.requests.detail.action.label.withdraw')
    : t('employee.requests.detail.action.label.cancel');
}

function actionEffect(detail: PersonalRequestDetail, t: MessageTranslator): string {
  return detail.kind === 'CANCELLATION'
    ? t('employee.requests.detail.action.effect.withdraw')
    : t('employee.requests.detail.action.effect.cancel');
}

function actionError(error: unknown, t: MessageTranslator): string {
  if (error instanceof ApiClientError && error.code === 'PERIOD_ADJUSTMENT_REQUIRED')
    return t('employee.requests.detail.action.error.locked');
  if (
    error instanceof ApiClientError &&
    (error.code === 'ABSENCE_CANNOT_CANCEL' || error.code === 'ABSENCE_STATE_CHANGED')
  )
    return t('employee.requests.detail.action.error.changed');
  return t('employee.requests.detail.action.error.generic');
}

function dateRange(
  locale: Parameters<typeof formatDateOnly>[0],
  start: string,
  end: string,
  t: MessageTranslator,
): string {
  const formattedStart = formatDateOnly(locale, start);
  if (start === end) return formattedStart;
  return t('employee.requests.history.dateRange', {
    end: formatDateOnly(locale, end),
    start: formattedStart,
  });
}

function coverageLabel(
  kind: 'FIRST_HALF' | 'FULL_DAY' | 'MINUTE_INTERVAL' | 'SECOND_HALF',
  startsAt: number | null,
  endsAt: number | null,
  t: MessageTranslator,
): string {
  if (kind === 'FULL_DAY') return t('employee.absence.coverage.name.fullDay');
  if (kind === 'FIRST_HALF') return t('employee.absence.coverage.name.firstHalf');
  if (kind === 'SECOND_HALF') return t('employee.absence.coverage.name.secondHalf');
  return t('employee.requests.detail.timeRange', {
    end: formatMinute(endsAt, t),
    start: formatMinute(startsAt, t),
  });
}

function formatMinute(value: number | null, t: MessageTranslator): string {
  if (value === null) return t('employee.requests.detail.unknownTime');
  if (value === 1_440) return '24:00';
  const hours = Math.floor(value / 60) % 24;
  const minutes = value % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_SESSION_EXPIRED')
  );
}

function eventLabel(value: string, t: MessageTranslator): string {
  if (value === 'CLOCK_IN') return t('employee.records.event.clockIn');
  if (value === 'BREAK_START') return t('employee.records.event.breakStart');
  if (value === 'BREAK_END') return t('employee.records.event.breakEnd');
  if (value === 'CLOCK_OUT') return t('employee.records.event.clockOut');
  return t('employee.requests.detail.correction.events.event');
}

function formatClockTimeWithOffset(
  runtime: ReturnType<typeof useWorkLedgerI18n>,
  instant: string,
  timeZone: string,
): string {
  return formatInstant(runtime.locale, instant, timeZone, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  });
}

function currentClientTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function detailTimeZone(detail: PersonalRequestDetail): string {
  return detail.kind === 'CORRECTION' ? detail.timeZone : currentClientTimeZone();
}
