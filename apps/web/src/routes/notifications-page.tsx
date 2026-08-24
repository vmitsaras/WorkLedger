import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';

import type {
  DismissedNotification,
  NotificationHistory,
  NotificationItem,
  NotificationQuery,
} from '@workledger/contracts';
import {
  Alert,
  Button,
  Pagination,
  Panel,
  RouteState,
  StatusBadge,
  buttonVariants,
} from '@workledger/ui';

import { ApiClientError, clearSessionMemory, dismissNotification } from '../app/api-client.js';
import { notificationHistoryQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

export function NotificationsPage() {
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
      setDismissError('The notification could not be dismissed. Try again.');
    },
    onSuccess: (result: DismissedNotification) => {
      setDismissError('');
      setStatusMessage('Notification dismissed. It remains in your history.');
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
        eyebrow="Account"
        title="Notifications"
        description="Review account outcomes and open the related record when you need details."
      />
      <p
        className="sr-only"
        role="status"
        aria-label="Notification action status"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </p>
      {dismissError === '' ? null : (
        <Alert title="Notification not dismissed" tone="danger">
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
  return (
    <section className="grid gap-4" aria-labelledby="notification-history-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="notification-history-heading" className="m-0 text-xl font-bold">
            Outcome history
          </h2>
          <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
            {data.pagination.total} notification{data.pagination.total === 1 ? '' : 's'}.
          </p>
        </div>
        <p
          className="m-0 min-h-6 text-sm text-[var(--wl-text-muted)]"
          role="status"
          aria-label="Notification history status"
          aria-live="polite"
          aria-atomic="true"
        >
          {refreshing
            ? 'Refreshing history…'
            : `History current with ${data.pagination.total.toString()} notification${data.pagination.total === 1 ? '' : 's'}.`}
        </p>
      </div>
      {data.items.length === 0 ? (
        <RouteState kind="empty" title="No notification history">
          <p>Account outcomes will appear here after a request or monthly-period decision.</p>
        </RouteState>
      ) : (
        <ol className="m-0 grid gap-3 p-0" aria-label="Generic notification history">
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
        summary={`Notification history page ${data.pagination.page} of ${data.pagination.totalPages}`}
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
  const dismissed = item.status === 'DISMISSED';
  const unavailable = dismissed || pending;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-bold">{item.title}</h3>
          <p className="m-0 mt-1">{item.body}</p>
        </div>
        <StatusBadge tone={dismissed ? 'neutral' : 'info'}>
          {dismissed ? 'Dismissed' : 'Active'}
        </StatusBadge>
      </div>
      <dl className="m-0 grid gap-1 text-sm text-[var(--wl-text-muted)]">
        <div className="flex flex-wrap gap-2">
          <dt className="font-semibold">Recorded</dt>
          <dd className="m-0">{formatInstant(item.occurredAt, timeZone)}</dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <dt className="font-semibold">Email delivery</dt>
          <dd className="m-0">{deliveryLabel(item.deliveryStatus)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: 'secondary' })} to={item.destinationPath}>
          {item.destinationPath.startsWith('/monthly-periods/')
            ? 'Open monthly period'
            : 'Open requests'}
        </Link>
        <Button
          type="button"
          aria-disabled={unavailable}
          variant="secondary"
          onPress={() => {
            if (!unavailable) onDismiss();
          }}
        >
          {pending ? 'Dismissing…' : dismissed ? 'Dismissed' : 'Dismiss notification'}
        </Button>
      </div>
    </>
  );
}

function NotificationLoading() {
  return (
    <RouteState kind="loading" title="Loading notification history">
      <p>Checking your account outcome records.</p>
    </RouteState>
  );
}

function NotificationError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <RouteState
      actions={
        <Button variant="secondary" onPress={retry}>
          Try again
        </Button>
      }
      kind="error"
      title="Notification history is unavailable"
    >
      <p>No notification content was displayed. Try loading your history again.</p>
    </RouteState>
  );
}

function deliveryLabel(status: NotificationItem['deliveryStatus']): string {
  if (status === 'NOT_CONFIGURED') return 'Email not configured; in-app record available';
  if (status === 'PENDING') return 'Email attempt pending; in-app record available';
  if (status === 'DELIVERED') return 'Delivered';
  return 'Delivery failed; in-app record unaffected';
}

function formatInstant(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value));
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
