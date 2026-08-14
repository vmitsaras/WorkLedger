import type {
  DismissedNotification,
  NotificationHistory,
  NotificationItem,
  NotificationQuery,
} from '@workledger/contracts';
import { parseDomainId, parseTimeZoneId, type DomainId, type Instant } from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  NotificationListItemRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { WorkLedgerApiError } from '../http/errors.js';
import { notificationContent } from './content.js';

export type NotificationIdentity = Readonly<{ accountId: DomainId<'Account'> }>;

export function createNotificationService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async dismiss(
      identity: NotificationIdentity,
      notificationIdValue: string,
      at: Instant,
    ): Promise<DismissedNotification> {
      const notificationId = parseDomainId<'Notification'>(notificationIdValue);
      if (!notificationId.ok) throw notFound();
      return database.transaction(async (transaction) => {
        const context = requireActiveContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const item = await transaction.notifications.dismiss({
          accountId: context.accountId,
          dismissedAt: at,
          employeeId: context.employee?.id ?? null,
          notificationId: notificationId.value,
          organizationId: context.organization.id,
        });
        if (item === null) throw notFound();
        if (item.dismissedAt === null) throw internalError();
        return Object.freeze({ dismissedAt: item.dismissedAt, id: item.id, status: 'DISMISSED' });
      });
    },

    async list(
      identity: NotificationIdentity,
      query: NotificationQuery,
      at: Instant,
    ): Promise<NotificationHistory> {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw internalError();
          const page = await transaction.notifications.list({
            accountId: context.accountId,
            employeeId: context.employee?.id ?? null,
            limit: query.limit,
            offset: (query.page - 1) * query.limit,
            organizationId: context.organization.id,
          });
          return Object.freeze({
            items: page.items.map(toNotificationItem),
            pagination: Object.freeze({
              limit: query.limit,
              page: query.page,
              total: page.total,
              totalPages: page.total === 0 ? 0 : Math.ceil(page.total / query.limit),
            }),
            timeZone: timeZone.value,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseNotificationIdentity(accountIdValue: string): NotificationIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value });
}

function toNotificationItem(item: NotificationListItemRecord): NotificationItem {
  const content = notificationContent(item.event);
  return Object.freeze({
    body: content.body,
    deliveryStatus: item.deliveryStatus,
    destinationPath: item.destinationPath,
    dismissedAt: item.dismissedAt,
    event: item.event,
    id: item.id,
    occurredAt: item.occurredAt,
    status: item.dismissedAt === null ? 'ACTIVE' : 'DISMISSED',
    title: content.title,
  });
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function notFound() {
  return new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
}

function internalError() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
