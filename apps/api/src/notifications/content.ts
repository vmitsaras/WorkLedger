import type { NotificationEvent } from '@workledger/contracts';

export type GenericNotificationContent = Readonly<{
  body: string;
  emailSubject: string;
  title: string;
}>;

const CONTENT: Readonly<Record<NotificationEvent, GenericNotificationContent>> = Object.freeze({
  ITEM_ACKNOWLEDGED: Object.freeze({
    body: 'An item you submitted was acknowledged.',
    emailSubject: 'A WorkLedger item was acknowledged',
    title: 'Item acknowledged',
  }),
  ITEM_APPROVED: Object.freeze({
    body: 'An item you submitted was approved.',
    emailSubject: 'A WorkLedger item was approved',
    title: 'Item approved',
  }),
  ITEM_CHANGES_REQUESTED: Object.freeze({
    body: 'An item you submitted needs changes.',
    emailSubject: 'A WorkLedger item needs changes',
    title: 'Changes requested',
  }),
  ITEM_REJECTED: Object.freeze({
    body: 'An item you submitted was not approved.',
    emailSubject: 'A WorkLedger item was not approved',
    title: 'Item not approved',
  }),
});

export function notificationContent(event: NotificationEvent): GenericNotificationContent {
  return CONTENT[event];
}
