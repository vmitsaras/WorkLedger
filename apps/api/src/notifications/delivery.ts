import type {
  NotificationDestinationPath,
  NotificationRecord,
  WorkLedgerDatabase,
} from '@workledger/database';
import {
  isSupportedLocale,
  type NotificationEvent,
  type SupportedLocale,
} from '@workledger/contracts';

import { createOutputMessageTranslator, type OutputMessageKey } from '../i18n/output.js';
import { notificationContent, type GenericNotificationContent } from './content.js';

export const NOTIFICATION_DELIVERY_FAILURE_CODES = [
  'DELIVERY_DEPENDENCY_FAILED',
  'DELIVERY_REJECTED',
] as const;

export type NotificationDeliveryFailureCode = (typeof NOTIFICATION_DELIVERY_FAILURE_CODES)[number];

export type NotificationDeliveryMessage = Readonly<{
  content: GenericNotificationContent;
  destinationPath: NotificationDestinationPath;
  locale: SupportedLocale;
  notificationId: string;
  recipientEmail: string;
  subject: string;
  text: string;
}>;

export type NotificationDeliveryResult =
  | Readonly<{ outcome: 'DELIVERED' }>
  | Readonly<{ failureCode: NotificationDeliveryFailureCode; outcome: 'FAILED' }>;

export interface NotificationDeliveryAdapter {
  readonly configured: boolean;
  deliver(message: NotificationDeliveryMessage): Promise<NotificationDeliveryResult>;
}

export interface NotificationDeliveryDiagnostics {
  attemptPersistenceFailed(): void;
}

export const disabledNotificationDeliveryAdapter: NotificationDeliveryAdapter = Object.freeze({
  configured: false,
  async deliver() {
    return Object.freeze({ failureCode: 'DELIVERY_REJECTED', outcome: 'FAILED' as const });
  },
});

export const stderrNotificationDeliveryDiagnostics: NotificationDeliveryDiagnostics = Object.freeze(
  {
    attemptPersistenceFailed() {
      process.stderr.write(
        '[workledger] Notification delivery attempt diagnostics could not be persisted.\n',
      );
    },
  },
);

export async function deliverCommittedNotification(
  database: WorkLedgerDatabase,
  adapter: NotificationDeliveryAdapter,
  notification: NotificationRecord,
  diagnostics: NotificationDeliveryDiagnostics = stderrNotificationDeliveryDiagnostics,
): Promise<void> {
  const recipientEmail = notification.recipientEmail;
  const recipientLocale = notification.recipientLocale;
  if (!notification.deliveryRequested || recipientEmail === null) {
    return;
  }
  const content = notificationContent(notification.event);

  for (let attemptNumber = 1; attemptNumber <= 2; attemptNumber += 1) {
    const result = await attemptDelivery(adapter, async () => {
      if (!isSupportedLocale(recipientLocale)) {
        throw new Error('Notification recipient locale is invalid.');
      }
      const rendered = await renderNotificationEmail(notification.event, recipientLocale);
      return {
        content,
        destinationPath: notification.destinationPath,
        locale: recipientLocale,
        notificationId: notification.id,
        recipientEmail,
        subject: rendered.subject,
        text: rendered.text,
      };
    });
    try {
      await database.transaction(async (transaction) => {
        await transaction.notifications.appendDeliveryAttempt({
          attemptedAt: notification.occurredAt,
          attemptNumber,
          failureCode: result.outcome === 'FAILED' ? result.failureCode : null,
          notificationId: notification.id,
          organizationId: notification.organizationId,
          outcome: result.outcome,
        });
      });
    } catch {
      // Delivery diagnostics must not replace or roll back the committed domain outcome.
      diagnostics.attemptPersistenceFailed();
    }
    if (result.outcome === 'DELIVERED') return;
  }
}

const NOTIFICATION_EMAIL_KEYS = Object.freeze({
  ITEM_ACKNOWLEDGED: {
    subject: 'output.communication.notification.acknowledged.subject',
    text: 'output.communication.notification.acknowledged.body',
  },
  ITEM_APPROVED: {
    subject: 'output.communication.notification.approved.subject',
    text: 'output.communication.notification.approved.body',
  },
  ITEM_CHANGES_REQUESTED: {
    subject: 'output.communication.notification.changesRequested.subject',
    text: 'output.communication.notification.changesRequested.body',
  },
  ITEM_REJECTED: {
    subject: 'output.communication.notification.rejected.subject',
    text: 'output.communication.notification.rejected.body',
  },
} as const satisfies Readonly<
  Record<NotificationEvent, Readonly<{ subject: OutputMessageKey; text: OutputMessageKey }>>
>);

async function renderNotificationEmail(event: NotificationEvent, locale: SupportedLocale) {
  const t = await createOutputMessageTranslator(locale);
  const keys = NOTIFICATION_EMAIL_KEYS[event];
  return Object.freeze({ subject: t(keys.subject), text: t(keys.text) });
}

async function attemptDelivery(
  adapter: NotificationDeliveryAdapter,
  message: () => Promise<NotificationDeliveryMessage>,
): Promise<NotificationDeliveryResult> {
  try {
    return await adapter.deliver(await message());
  } catch {
    return Object.freeze({
      failureCode: 'DELIVERY_DEPENDENCY_FAILED',
      outcome: 'FAILED' as const,
    });
  }
}
