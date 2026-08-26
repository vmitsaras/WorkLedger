import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import type {
  DismissedNotification,
  NotificationHistory,
  NotificationItem,
  NotificationQuery,
} from '@workledger/contracts';
import { formatInstant, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, StatusBadge, buttonVariants } from '@workledger/ui';
import { Pagination } from '../components/pagination.js';

import { ApiClientError, clearSessionMemory, dismissNotification } from '../app/api-client.js';
import { notificationHistoryQuery } from '../app/query.js';
import { notificationPresentation } from '../app/presentation-codes.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

const DELIVERY_KEYS = {
  DELIVERED: 'employee.notifications.delivery.delivered',
  FAILED: 'employee.notifications.delivery.failed',
  NOT_CONFIGURED: 'employee.notifications.delivery.notConfigured',
  PENDING: 'employee.notifications.delivery.pending',
} as const satisfies Readonly<Record<NotificationItem['deliveryStatus'], MessageKey>>;

export function NotificationsPage() {
  const t = useWorkLedgerMessage();
  const queryInput = useLoaderData<NotificationQuery>();
  const options = notificationHistoryQuery(queryInput);
  const query = useQuery(options);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('');
  const [dismissError, setDismissError] = useState('');
  const dismiss = useMutation({
    mutationFn: dismissNotification,
    onError: () => {
      setStatusMessage('');
      setDismissError(t('employee.notifications.dismiss.error'));
    },
    onSuccess: (result: DismissedNotification) => {
      setDismissError('');
      setStatusMessage(t('employee.notifications.dismiss.success'));
      queryClient.setQueryData<NotificationHistory>(options.queryKey, (current) =>
        current === undefined
          ? current
          : {
              ...current,
              items: current.items.map((item) =>
                item.id === result.id
                  ? { ...item, dismissedAt: result.dismissedAt, status: result.status }
                  : item,
              ),
            },
      );
    },
  });

  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') {
      setPendingSignInNotice('SESSION_EXPIRED');
    }
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('employee.notifications.page.eyebrow')}
        title={t('shared.route.title.notifications')}
        description={t('employee.notifications.page.description')}
      />
      <p
        className="sr-only"
        role="status"
        aria-label={t('employee.notifications.actionStatus')}
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </p>
      {dismissError === '' ? null : (
        <Alert title={t('employee.notifications.dismiss.errorTitle')} tone="danger">
          <p className="m-0">{dismissError}</p>
        </Alert>
      )}
      {query.isPending ? (
        <NotificationLoading />
      ) : query.isError || query.data === undefined ? (
        <NotificationError retry={() => void query.refetch()} />
      ) : (
        <NotificationHistoryView
          data={query.data}
          dismissingId={dismiss.isPending ? dismiss.variables : undefined}
          onDismiss={(notificationId) => {
            if (dismiss.isPending) return;
            setDismissError('');
            setStatusMessage('');
            dismiss.mutate(notificationId);
          }}
          onPage={(page) => {
            setSearchParams({ limit: queryInput.limit.toString(), page: page.toString() });
          }}
          refreshing={query.isFetching}
        />
      )}
    </section>
  );
}

function NotificationHistoryView({
  data,
  dismissingId,
  onDismiss,
  onPage,
  refreshing,
}: Readonly<{
  data: NotificationHistory;
  dismissingId: string | undefined;
  onDismiss: (notificationId: string) => void;
  onPage: (page: number) => void;
  refreshing: boolean;
}>) {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid gap-4" aria-labelledby="notification-history-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="notification-history-heading" className="m-0 text-xl font-bold">
            {t('employee.notifications.history.heading')}
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {t('employee.notifications.history.total', { count: data.pagination.total })}
          </p>
        </div>
        <p
          className="m-0 min-h-6 text-sm text-[var(--wl-text-muted)]"
          role="status"
          aria-label={t('employee.notifications.history.status')}
          aria-live="polite"
          aria-atomic="true"
        >
          {refreshing
            ? t('employee.notifications.history.refreshing')
            : t('employee.notifications.history.current', { count: data.pagination.total })}
        </p>
      </div>
      {data.items.length === 0 ? (
        <RouteState kind="empty" title={t('employee.notifications.empty.title')}>
          <p>{t('employee.notifications.empty.description')}</p>
        </RouteState>
      ) : (
        <ol
          className="m-0 grid gap-3 p-0"
          aria-label={t('employee.notifications.history.listLabel')}
        >
          {data.items.map((item) => (
            <li key={item.id} className="list-none">
              <Panel as="article" className="grid gap-3" density="balanced">
                <NotificationCard
                  item={item}
                  pending={dismissingId === item.id}
                  onDismiss={() => onDismiss(item.id)}
                  timeZone={data.timeZone}
                />
              </Panel>
            </li>
          ))}
        </ol>
      )}
      <Pagination
        currentPage={data.pagination.page}
        onPageChange={onPage}
        pageCount={data.pagination.totalPages}
        summary={t('employee.notifications.pagination', {
          current: data.pagination.page,
          total: data.pagination.totalPages,
        })}
      />
    </section>
  );
}

function NotificationCard({
  item,
  onDismiss,
  pending,
  timeZone,
}: Readonly<{
  item: NotificationItem;
  onDismiss: () => void;
  pending: boolean;
  timeZone: string;
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const dismissed = item.status === 'DISMISSED';
  const unavailable = dismissed || pending;
  const presentation = notificationPresentation(item.event, t);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-bold">{presentation.title}</h3>
          <p className="m-0 mt-1">{presentation.body}</p>
        </div>
        <StatusBadge tone={dismissed ? 'neutral' : 'info'}>
          {dismissed
            ? t('employee.notifications.status.dismissed')
            : t('employee.notifications.status.active')}
        </StatusBadge>
      </div>
      <dl className="m-0 grid gap-1 text-sm text-[var(--wl-text-muted)]">
        <div className="flex flex-wrap gap-2">
          <dt className="font-semibold">{t('employee.notifications.card.recorded')}</dt>
          <dd className="m-0">{formatInstant(runtime.locale, item.occurredAt, timeZone)}</dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <dt className="font-semibold">{t('employee.notifications.card.emailDelivery')}</dt>
          <dd className="m-0">{t(DELIVERY_KEYS[item.deliveryStatus])}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: 'secondary' })} to={item.destinationPath}>
          {item.destinationPath.startsWith('/monthly-periods/')
            ? t('employee.notifications.card.openMonthlyPeriod')
            : t('employee.notifications.card.openRequests')}
        </Link>
        <Button
          type="button"
          aria-disabled={unavailable}
          variant="secondary"
          onPress={() => {
            if (!unavailable) onDismiss();
          }}
        >
          {pending
            ? t('employee.notifications.card.dismissing')
            : dismissed
              ? t('employee.notifications.card.dismissed')
              : t('employee.notifications.card.dismiss')}
        </Button>
      </div>
    </>
  );
}

function NotificationLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('employee.notifications.loading.title')}>
      <p>{t('employee.notifications.loading.description')}</p>
    </RouteState>
  );
}

function NotificationError({ retry }: Readonly<{ retry: () => void }>) {
  const t = useWorkLedgerMessage();
  return (
    <RouteState
      actions={
        <Button variant="secondary" onPress={retry}>
          {t('shared.action.tryAgain')}
        </Button>
      }
      kind="error"
      title={t('employee.notifications.error.title')}
    >
      <p>{t('employee.notifications.error.description')}</p>
    </RouteState>
  );
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
