import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const PERSONAL_REQUEST_FILTER_STATUSES = ['ALL', 'IN_PROGRESS', 'COMPLETED'] as const;
export const PERSONAL_REQUEST_TYPES = ['ALL', 'CORRECTION', 'ABSENCE', 'CANCELLATION'] as const;
export const PERSONAL_REQUEST_ITEM_STATUSES = [
  'SUBMITTED',
  'REPORTED',
  'ACKNOWLEDGED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
  'PARTIALLY_CANCELLED',
  'CANCELLED',
  'PENDING_DECISION',
  'APPLIED',
] as const;
export const PERSONAL_REQUEST_ACTIONS = ['REQUEST_CANCELLATION', 'WITHDRAW_CANCELLATION'] as const;
export const PERSONAL_REQUEST_HISTORY_ACTIONS = [
  'SUBMITTED',
  'REPORTED',
  'ACKNOWLEDGE',
  'APPROVE',
  'CANCEL',
  'REJECT',
  'REQUEST_CHANGES',
  'WITHDRAW',
  'APPLY',
] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.uuid();

export const personalRequestFilterStatusSchema = z.enum(PERSONAL_REQUEST_FILTER_STATUSES);
export const personalRequestTypeSchema = z.enum(PERSONAL_REQUEST_TYPES);
export const personalRequestItemStatusSchema = z.enum(PERSONAL_REQUEST_ITEM_STATUSES);
export const personalRequestActionSchema = z.enum(PERSONAL_REQUEST_ACTIONS);
export const personalRequestHistoryActionSchema = z.enum(PERSONAL_REQUEST_HISTORY_ACTIONS);

export const personalRequestQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(10).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  status: personalRequestFilterStatusSchema.default('ALL'),
  type: personalRequestTypeSchema.default('ALL'),
});

export const personalRequestListItemSchema = z.strictObject({
  affectedEndDate: dateSchema,
  affectedStartDate: dateSchema,
  id: opaqueIdentifierSchema,
  kind: z.enum(['CORRECTION', 'ABSENCE', 'CANCELLATION']),
  status: personalRequestItemStatusSchema,
  submittedAt: instantSchema,
  version: z.number().int().positive(),
});

export const personalRequestPaginationSchema = z.strictObject({
  limit: z.number().int().min(10).max(50),
  page: z.number().int().min(1).max(10_000),
  total: z.number().int().safe().min(0),
  totalPages: z.number().int().safe().min(0),
});

export const personalRequestHistorySchema = z.strictObject({
  action: personalRequestHistoryActionSchema,
  actor: z.enum(['SELF', 'REVIEWER', 'SYSTEM']),
  occurredAt: instantSchema,
  reason: z.string().min(1).max(2_000).nullable(),
});

export const personalRequestCoverageSchema = z.strictObject({
  endsAtMinute: z.number().int().min(1).max(1_440).nullable(),
  kind: z.enum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'MINUTE_INTERVAL']),
  localDate: dateSchema,
  minutes: z.number().int().min(0).max(1_440),
  startsAtMinute: z.number().int().min(0).max(1_439).nullable(),
});

export const relatedCancellationSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  status: z.enum(['PENDING_DECISION', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  submittedAt: instantSchema,
});

const personalRequestDetailCommonShape = {
  affectedEndDate: dateSchema,
  affectedStartDate: dateSchema,
  availableActions: z.array(personalRequestActionSchema).max(PERSONAL_REQUEST_ACTIONS.length),
  history: z.array(personalRequestHistorySchema),
  id: opaqueIdentifierSchema,
  submittedAt: instantSchema,
  version: z.number().int().positive(),
};

export const personalRequestDetailSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...personalRequestDetailCommonShape,
    applicationMode: z.enum(['ORDINARY_CORRECTION', 'POST_LOCK_ADJUSTMENT']),
    events: z.array(
      z.strictObject({
        occurredAt: instantSchema,
        sequence: z.number().int().positive(),
        type: z.string().min(1).max(32),
      }),
    ),
    kind: z.literal('CORRECTION'),
    originalCalculation: z.strictObject({
      balanceMinutes: z.number().int(),
      breakMinutes: z.number().int().min(0),
      creditedMinutes: z.number().int().min(0),
      expectedMinutes: z.number().int().min(0),
      workedMinutes: z.number().int().min(0),
    }),
    proposedEndsAt: instantSchema,
    proposedStartsAt: instantSchema,
    requestReason: z.string().min(1).max(1_000),
    status: z.enum([
      'SUBMITTED',
      'CHANGES_REQUESTED',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'APPLIED',
    ]),
    timeZone: z.string().min(1).max(255),
  }),
  z.strictObject({
    ...personalRequestDetailCommonShape,
    absenceTypeName: z.string().min(1).max(160),
    coverage: z.array(personalRequestCoverageSchema).min(1).max(366),
    kind: z.literal('ABSENCE'),
    relatedCancellations: z.array(relatedCancellationSchema).max(100),
    status: z.enum([
      'SUBMITTED',
      'REPORTED',
      'ACKNOWLEDGED',
      'CHANGES_REQUESTED',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'PARTIALLY_CANCELLED',
      'CANCELLED',
    ]),
    workflow: z.enum(['APPROVAL_REQUIRED', 'REPORT_AND_ACKNOWLEDGE']),
  }),
  z.strictObject({
    ...personalRequestDetailCommonShape,
    absenceRequestId: opaqueIdentifierSchema,
    absenceTypeName: z.string().min(1).max(160),
    coverage: z.array(personalRequestCoverageSchema).min(1).max(366),
    kind: z.literal('CANCELLATION'),
    status: z.enum(['PENDING_DECISION', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  }),
]);

export const personalRequestHistoryPageSchema = z.strictObject({
  items: z.array(personalRequestListItemSchema).max(50),
  pagination: personalRequestPaginationSchema,
});

export const personalRequestHistoryEnvelopeSchema = createSuccessEnvelopeSchema(
  personalRequestHistoryPageSchema,
);
export const personalRequestDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  personalRequestDetailSchema,
);

export type PersonalRequestFilterStatus = z.infer<typeof personalRequestFilterStatusSchema>;
export type PersonalRequestType = z.infer<typeof personalRequestTypeSchema>;
export type PersonalRequestItemStatus = z.infer<typeof personalRequestItemStatusSchema>;
export type PersonalRequestAction = z.infer<typeof personalRequestActionSchema>;
export type PersonalRequestHistoryAction = z.infer<typeof personalRequestHistoryActionSchema>;
export type PersonalRequestQuery = z.infer<typeof personalRequestQuerySchema>;
export type PersonalRequestListItem = z.infer<typeof personalRequestListItemSchema>;
export type PersonalRequestHistory = z.infer<typeof personalRequestHistorySchema>;
export type PersonalRequestDetail = z.infer<typeof personalRequestDetailSchema>;
export type PersonalRequestHistoryPage = z.infer<typeof personalRequestHistoryPageSchema>;
