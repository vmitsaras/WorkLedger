import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const NOTIFICATION_EVENTS = [
  'ITEM_APPROVED',
  'ITEM_REJECTED',
  'ITEM_CHANGES_REQUESTED',
  'ITEM_ACKNOWLEDGED',
] as const;
export const NOTIFICATION_DELIVERY_STATUSES = [
  'NOT_CONFIGURED',
  'PENDING',
  'DELIVERED',
  'FAILED',
] as const;

export const notificationQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(10).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const notificationEventSchema = z.enum(NOTIFICATION_EVENTS);
export const notificationDeliveryStatusSchema = z.enum(NOTIFICATION_DELIVERY_STATUSES);

export const notificationItemSchema = z
  .strictObject({
    body: z.string().min(1).max(240),
    deliveryStatus: notificationDeliveryStatusSchema,
    destinationPath: z.literal('/requests'),
    dismissedAt: z.iso.datetime({ offset: true }).nullable(),
    event: notificationEventSchema,
    id: z.uuid(),
    occurredAt: z.iso.datetime({ offset: true }),
    status: z.enum(['ACTIVE', 'DISMISSED']),
    title: z.string().min(1).max(80),
  })
  .superRefine((item, context) => {
    if ((item.status === 'ACTIVE') !== (item.dismissedAt === null)) {
      context.addIssue({
        code: 'custom',
        message: 'Notification status and dismissal timestamp must agree.',
        path: ['dismissedAt'],
      });
    }
  });

export const notificationPaginationSchema = z.strictObject({
  limit: z.number().int().min(10).max(50),
  page: z.number().int().min(1).max(10_000),
  total: z.number().int().safe().min(0),
  totalPages: z.number().int().safe().min(0),
});

export const notificationHistorySchema = z.strictObject({
  items: z.array(notificationItemSchema).max(50),
  pagination: notificationPaginationSchema,
  timeZone: z.string().min(1).max(255),
});
export const notificationHistoryEnvelopeSchema =
  createSuccessEnvelopeSchema(notificationHistorySchema);

export const dismissedNotificationSchema = z.strictObject({
  dismissedAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  status: z.literal('DISMISSED'),
});
export const dismissedNotificationEnvelopeSchema = createSuccessEnvelopeSchema(
  dismissedNotificationSchema,
);

export type NotificationDeliveryStatus = z.infer<typeof notificationDeliveryStatusSchema>;
export type NotificationEvent = z.infer<typeof notificationEventSchema>;
export type NotificationHistory = z.infer<typeof notificationHistorySchema>;
export type NotificationItem = z.infer<typeof notificationItemSchema>;
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
export type DismissedNotification = z.infer<typeof dismissedNotificationSchema>;
