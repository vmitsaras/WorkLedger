import type {
  NotificationDestinationPath,
  NotificationRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { notificationContent } from './content.js';

export const NOTIFICATION_DELIVERY_FAILURE_CODES = [
  'DELIVERY_DEPENDENCY_FAILED',
  'DELIVERY_REJECTED',
] as const;

export type NotificationDeliveryFailureCode = (typeof NOTIFICATION_DELIVERY_FAILURE_CODES)[number];

export type NotificationDeliveryMessage = Readonly<{
  body: string;
  destinationPath: NotificationDestinationPath;
  notificationId: string;
  recipientEmail: string;
  subject: string;
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
  if (!notification.deliveryRequested || notification.recipientEmail === null) return;
  const content = notificationContent(notification.event);

  for (let attemptNumber = 1; attemptNumber <= 2; attemptNumber += 1) {
    const result = await attemptDelivery(adapter, {
      body: content.body,
      destinationPath: notification.destinationPath,
      notificationId: notification.id,
      recipientEmail: notification.recipientEmail,
      subject: content.emailSubject,
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

async function attemptDelivery(
  adapter: NotificationDeliveryAdapter,
  message: NotificationDeliveryMessage,
): Promise<NotificationDeliveryResult> {
  try {
    return await adapter.deliver(message);
  } catch {
    return Object.freeze({
      failureCode: 'DELIVERY_DEPENDENCY_FAILED',
      outcome: 'FAILED' as const,
    });
  }
}
