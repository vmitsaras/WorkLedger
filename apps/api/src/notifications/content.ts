import type { NotificationEvent } from '@workledger/contracts';

export type GenericNotificationContent = Readonly<{
  event: NotificationEvent;
  parameters: Readonly<Record<never, never>>;
}>;

const CONTENT: Readonly<Record<NotificationEvent, GenericNotificationContent>> = Object.freeze({
  ITEM_ACKNOWLEDGED: Object.freeze({
    event: 'ITEM_ACKNOWLEDGED',
    parameters: {},
  }),
  ITEM_APPROVED: Object.freeze({
    event: 'ITEM_APPROVED',
    parameters: {},
  }),
  ITEM_CHANGES_REQUESTED: Object.freeze({
    event: 'ITEM_CHANGES_REQUESTED',
    parameters: {},
  }),
  ITEM_REJECTED: Object.freeze({
    event: 'ITEM_REJECTED',
    parameters: {},
  }),
});

export function notificationContent(event: NotificationEvent): GenericNotificationContent {
  return CONTENT[event];
}
