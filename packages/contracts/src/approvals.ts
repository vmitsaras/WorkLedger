import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const APPROVAL_INBOX_STATUSES = [
  'ALL',
  'ACTION_REQUIRED',
  'WAITING_ON_EMPLOYEE',
  'COMPLETED',
] as const;
export const APPROVAL_INBOX_ITEM_STATUSES = [
  'ACTION_REQUIRED',
  'WAITING_ON_EMPLOYEE',
  'COMPLETED',
] as const;
export const APPROVAL_INBOX_TYPES = [
  'ALL',
  'CORRECTION',
  'ABSENCE',
  'CANCELLATION',
  'MONTHLY_PERIOD',
] as const;
export const APPROVAL_INBOX_SORTS = ['SUBMITTED_AT', 'AFFECTED_DATE', 'EMPLOYEE'] as const;
export const APPROVAL_INBOX_DIRECTIONS = ['ASC', 'DESC'] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.uuid();

export const approvalInboxStatusSchema = z.enum(APPROVAL_INBOX_STATUSES);
export const approvalInboxItemStatusSchema = z.enum(APPROVAL_INBOX_ITEM_STATUSES);
export const approvalInboxTypeSchema = z.enum(APPROVAL_INBOX_TYPES);
export const approvalInboxSortSchema = z.enum(APPROVAL_INBOX_SORTS);
export const approvalInboxDirectionSchema = z.enum(APPROVAL_INBOX_DIRECTIONS);

function gregorianDayNumber(value: string): number {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const shiftedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;

  return (
    era * 146_097 +
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear
  );
}

export const approvalInboxQuerySchema = z
  .strictObject({
    direction: approvalInboxDirectionSchema.default('DESC'),
    from: dateSchema.optional(),
    limit: z.coerce.number().int().min(10).max(50).default(20),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    sort: approvalInboxSortSchema.default('SUBMITTED_AT'),
    status: approvalInboxStatusSchema.default('ACTION_REQUIRED'),
    team: opaqueIdentifierSchema.optional(),
    to: dateSchema.optional(),
    type: approvalInboxTypeSchema.default('ALL'),
  })
  .superRefine((value, context) => {
    if ((value.from === undefined) !== (value.to === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'The from and to dates must be provided together.',
        path: [value.from === undefined ? 'from' : 'to'],
      });
      return;
    }

    if (value.from === undefined || value.to === undefined) {
      return;
    }

    const fromDay = gregorianDayNumber(value.from);
    const toDay = gregorianDayNumber(value.to);

    if (fromDay > toDay) {
      context.addIssue({
        code: 'custom',
        message: 'The from date must not be after the to date.',
        path: ['to'],
      });
      return;
    }

    if (toDay - fromDay + 1 > 366) {
      context.addIssue({
        code: 'custom',
        message: 'The date range must not exceed 366 inclusive calendar days.',
        path: ['to'],
      });
    }
  });

export const approvalInboxTeamSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  name: z.string().min(1).max(160),
});

const approvalInboxItemCommonShape = {
  affectedEndDate: dateSchema,
  affectedStartDate: dateSchema,
  employeeDisplayName: z.string().min(1).max(160),
  id: opaqueIdentifierSchema,
  status: approvalInboxItemStatusSchema,
  submittedAt: instantSchema,
  team: approvalInboxTeamSchema.optional(),
  version: z.number().int().positive(),
};

export const approvalInboxItemSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...approvalInboxItemCommonShape,
    kind: z.literal('CORRECTION'),
  }),
  z.strictObject({
    ...approvalInboxItemCommonShape,
    kind: z.literal('ABSENCE'),
  }),
  z.strictObject({
    ...approvalInboxItemCommonShape,
    kind: z.literal('CANCELLATION'),
  }),
  z.strictObject({
    ...approvalInboxItemCommonShape,
    kind: z.literal('MONTHLY_PERIOD'),
  }),
]);

export const approvalInboxPaginationSchema = z.strictObject({
  limit: z.number().int().min(10).max(50),
  page: z.number().int().min(1).max(10_000),
  total: z.number().int().safe().min(0),
  totalPages: z.number().int().safe().min(0),
});

export const approvalInboxFilterOptionsSchema = z.strictObject({
  teams: z.array(approvalInboxTeamSchema),
});

export const approvalInboxSchema = z.strictObject({
  filterOptions: approvalInboxFilterOptionsSchema,
  items: z.array(approvalInboxItemSchema).max(50),
  pagination: approvalInboxPaginationSchema,
  timeZone: z.string().min(1).max(255),
});

export const approvalInboxEnvelopeSchema = createSuccessEnvelopeSchema(approvalInboxSchema);

export const APPROVAL_DECISION_ACTIONS = [
  'APPROVE',
  'REJECT',
  'REQUEST_CHANGES',
  'ACKNOWLEDGE',
] as const;
export const APPROVAL_DETAIL_ACTIONS = [...APPROVAL_DECISION_ACTIONS, 'APPLY_CORRECTION'] as const;
export const approvalDecisionActionSchema = z.enum(APPROVAL_DECISION_ACTIONS);
export const approvalDetailActionSchema = z.enum(APPROVAL_DETAIL_ACTIONS);

const approvalCoverageSchema = z.strictObject({
  endsAtMinute: z.number().int().min(1).max(1_440).nullable(),
  kind: z.enum(['FULL_DAY', 'FIRST_HALF', 'SECOND_HALF', 'MINUTE_INTERVAL']),
  localDate: dateSchema,
  minutes: z.number().int().min(0).max(1_440),
  startsAtMinute: z.number().int().min(0).max(1_439).nullable(),
});

const approvalDetailCommonShape = {
  affectedEndDate: dateSchema,
  affectedStartDate: dateSchema,
  availableActions: z.array(approvalDetailActionSchema).max(APPROVAL_DETAIL_ACTIONS.length),
  employeeDisplayName: z.string().min(1).max(160),
  id: opaqueIdentifierSchema,
  submittedAt: instantSchema,
  version: z.number().int().positive(),
};

export const approvalDetailSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...approvalDetailCommonShape,
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
  }),
  z.strictObject({
    ...approvalDetailCommonShape,
    absenceTypeName: z.string().min(1).max(160),
    availableEntitlementMinutes: z.number().int().nullable(),
    canOverrideNegativeBalance: z.boolean(),
    coverage: z.array(approvalCoverageSchema).min(1).max(366),
    kind: z.literal('ABSENCE'),
    projectedRemainingMinutes: z.number().int().nullable(),
    requestedEntitlementMinutes: z.number().int().min(0).nullable(),
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
    ...approvalDetailCommonShape,
    absenceTypeName: z.string().min(1).max(160),
    coverage: z.array(approvalCoverageSchema).min(1).max(366),
    kind: z.literal('CANCELLATION'),
    status: z.enum(['PENDING_DECISION', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN']),
  }),
]);
export const approvalDetailEnvelopeSchema = createSuccessEnvelopeSchema(approvalDetailSchema);

export const approvalDecisionRequestSchema = z
  .strictObject({
    action: approvalDecisionActionSchema,
    expectedVersion: z.number().int().positive(),
    negativeBalanceOverride: z.boolean().default(false),
    reason: z.string().trim().min(10).max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.action !== 'ACKNOWLEDGE' && value.reason === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A decision reason of at least 10 characters is required.',
        path: ['reason'],
      });
    }
    if (value.negativeBalanceOverride && value.action !== 'APPROVE') {
      context.addIssue({
        code: 'custom',
        message: 'A negative-balance override is valid only for approval.',
        path: ['negativeBalanceOverride'],
      });
    }
  });
export const approvalDecisionResultSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  kind: z.enum(['CORRECTION', 'ABSENCE', 'CANCELLATION']),
  status: z.string().min(1).max(40),
  version: z.number().int().positive(),
});
export const approvalDecisionEnvelopeSchema = createSuccessEnvelopeSchema(
  approvalDecisionResultSchema,
);

export type ApprovalInboxStatus = z.infer<typeof approvalInboxStatusSchema>;
export type ApprovalInboxItemStatus = z.infer<typeof approvalInboxItemStatusSchema>;
export type ApprovalInboxType = z.infer<typeof approvalInboxTypeSchema>;
export type ApprovalInboxSort = z.infer<typeof approvalInboxSortSchema>;
export type ApprovalInboxDirection = z.infer<typeof approvalInboxDirectionSchema>;
export type ApprovalInboxQuery = z.infer<typeof approvalInboxQuerySchema>;
export type ApprovalInboxItem = z.infer<typeof approvalInboxItemSchema>;
export type ApprovalInbox = z.infer<typeof approvalInboxSchema>;
export type ApprovalDetail = z.infer<typeof approvalDetailSchema>;
export type ApprovalDetailAction = z.infer<typeof approvalDetailActionSchema>;
export type ApprovalDecisionAction = z.infer<typeof approvalDecisionActionSchema>;
export type ApprovalDecisionRequest = z.infer<typeof approvalDecisionRequestSchema>;
export type ApprovalDecisionResult = z.infer<typeof approvalDecisionResultSchema>;
