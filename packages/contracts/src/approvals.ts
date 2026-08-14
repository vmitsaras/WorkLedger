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
export const APPROVAL_INBOX_TYPES = ['ALL', 'CORRECTION', 'ABSENCE', 'CANCELLATION'] as const;
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

export type ApprovalInboxStatus = z.infer<typeof approvalInboxStatusSchema>;
export type ApprovalInboxItemStatus = z.infer<typeof approvalInboxItemStatusSchema>;
export type ApprovalInboxType = z.infer<typeof approvalInboxTypeSchema>;
export type ApprovalInboxSort = z.infer<typeof approvalInboxSortSchema>;
export type ApprovalInboxDirection = z.infer<typeof approvalInboxDirectionSchema>;
export type ApprovalInboxQuery = z.infer<typeof approvalInboxQuerySchema>;
export type ApprovalInboxItem = z.infer<typeof approvalInboxItemSchema>;
export type ApprovalInbox = z.infer<typeof approvalInboxSchema>;
