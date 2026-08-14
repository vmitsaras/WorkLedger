import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';
import {
  CALCULATION_BLOCKER_CODES,
  CALCULATION_WARNING_CODES,
  calculationBlockerCodeSchema,
  calculationWarningCodeSchema,
} from './today.js';

export const REPORT_KEYS = [
  'monthly-time',
  'flexible-time',
  'leave',
  'missing-records',
  'pending-approvals',
] as const;
export const REPORT_SORTS = ['EMPLOYEE', 'DATE', 'VALUE', 'STATUS'] as const;
export const REPORT_DIRECTIONS = ['ASC', 'DESC'] as const;
export const REPORT_SCOPES = ['SELF', 'REPORTS', 'SELF_AND_REPORTS', 'ORGANIZATION'] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const opaqueIdentifierSchema = z.uuid();
const signedMinuteSchema = z.number().int().safe();
const nonNegativeMinuteSchema = z.number().int().safe().min(0);
const employeeDisplayNameSchema = z.string().min(1).max(160);

export const reportKeySchema = z.enum(REPORT_KEYS);
export const reportSortSchema = z.enum(REPORT_SORTS);
export const reportDirectionSchema = z.enum(REPORT_DIRECTIONS);
export const reportScopeSchema = z.enum(REPORT_SCOPES);
export const reportRecordIssueCodeSchema = z.union([
  calculationWarningCodeSchema,
  calculationBlockerCodeSchema,
]);

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

export const reportQuerySchema = z
  .strictObject({
    direction: reportDirectionSchema.default('ASC'),
    employeeId: opaqueIdentifierSchema.optional(),
    from: dateSchema,
    limit: z.coerce.number().int().min(10).max(50).default(20),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    sort: reportSortSchema.default('EMPLOYEE'),
    to: dateSchema,
  })
  .superRefine((value, context) => {
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

export const reportCatalogItemSchema = z
  .strictObject({
    availableSorts: z.array(reportSortSchema).min(1).max(REPORT_SORTS.length),
    defaultSort: reportSortSchema,
    description: z.string().min(1).max(320),
    key: reportKeySchema,
    title: z.string().min(1).max(120),
  })
  .superRefine((value, context) => {
    if (!value.availableSorts.includes(value.defaultSort)) {
      context.addIssue({
        code: 'custom',
        message: 'The default sort must be available for the report.',
        path: ['defaultSort'],
      });
    }
  });

export const reportCatalogSchema = z.strictObject({
  defaultRange: z.strictObject({ from: dateSchema, to: dateSchema }),
  reports: z.array(reportCatalogItemSchema).min(1).max(REPORT_KEYS.length),
  timeZone: z.string().min(1).max(255),
});

export const reportPaginationSchema = z.strictObject({
  limit: z.number().int().min(10).max(50),
  page: z.number().int().min(1).max(10_000),
  total: z.number().int().safe().min(0),
  totalPages: z.number().int().safe().min(0),
});

const monthlyTimeReportRowSchema = z.strictObject({
  balanceMinutes: signedMinuteSchema,
  creditedMinutes: nonNegativeMinuteSchema,
  employeeDisplayName: employeeDisplayNameSchema,
  expectedMinutes: nonNegativeMinuteSchema,
  incompleteRecordCount: z.number().int().safe().min(0).max(31),
  kind: z.literal('MONTHLY_TIME'),
  monthStart: dateSchema,
  monthlyPeriodId: opaqueIdentifierSchema,
  postLockDeltaMinutes: signedMinuteSchema,
  workedMinutes: nonNegativeMinuteSchema,
  workflowStatus: z.enum(['OPEN', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'LOCKED']),
});

const flexibleTimeReportRowSchema = z.strictObject({
  closingBalanceMinutes: signedMinuteSchema,
  employeeDisplayName: employeeDisplayNameSchema,
  kind: z.literal('FLEXIBLE_TIME'),
  openingBalanceMinutes: signedMinuteSchema,
  rangeChangeMinutes: signedMinuteSchema,
});

const leaveReportRowSchema = z.strictObject({
  accountName: z.string().min(1).max(160),
  availableChangeMinutes: signedMinuteSchema,
  closingAvailableMinutes: signedMinuteSchema,
  employeeDisplayName: employeeDisplayNameSchema,
  kind: z.literal('LEAVE'),
  openingAvailableMinutes: signedMinuteSchema,
  projectedRemainingMinutes: signedMinuteSchema,
  reservedMinutes: nonNegativeMinuteSchema,
});

const missingRecordReportRowSchema = z.strictObject({
  employeeDisplayName: employeeDisplayNameSchema,
  expectedMinutes: nonNegativeMinuteSchema,
  kind: z.literal('MISSING_RECORD'),
  localDate: dateSchema,
  status: z.literal('INCOMPLETE'),
  warningCodes: z
    .array(reportRecordIssueCodeSchema)
    .max(CALCULATION_WARNING_CODES.length + CALCULATION_BLOCKER_CODES.length),
  workedMinutes: nonNegativeMinuteSchema,
});

const pendingApprovalReportRowSchema = z.strictObject({
  affectedEndDate: dateSchema,
  affectedStartDate: dateSchema,
  approvalId: opaqueIdentifierSchema,
  approvalKind: z.enum(['CORRECTION', 'ABSENCE', 'CANCELLATION', 'MONTHLY_PERIOD']),
  employeeDisplayName: employeeDisplayNameSchema,
  kind: z.literal('PENDING_APPROVAL'),
  submittedAt: instantSchema,
  version: z.number().int().positive(),
});

export const reportRowSchema = z.discriminatedUnion('kind', [
  monthlyTimeReportRowSchema,
  flexibleTimeReportRowSchema,
  leaveReportRowSchema,
  missingRecordReportRowSchema,
  pendingApprovalReportRowSchema,
]);

const reportSummarySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    balanceMinutes: signedMinuteSchema,
    creditedMinutes: nonNegativeMinuteSchema,
    expectedMinutes: nonNegativeMinuteSchema,
    incompleteRecordCount: z.number().int().safe().min(0),
    kind: z.literal('MONTHLY_TIME'),
    postLockDeltaMinutes: signedMinuteSchema,
    workedMinutes: nonNegativeMinuteSchema,
  }),
  z.strictObject({
    closingBalanceMinutes: signedMinuteSchema,
    kind: z.literal('FLEXIBLE_TIME'),
    openingBalanceMinutes: signedMinuteSchema,
    rangeChangeMinutes: signedMinuteSchema,
  }),
  z.strictObject({
    availableChangeMinutes: signedMinuteSchema,
    closingAvailableMinutes: signedMinuteSchema,
    kind: z.literal('LEAVE'),
    openingAvailableMinutes: signedMinuteSchema,
    projectedRemainingMinutes: signedMinuteSchema,
    reservedMinutes: nonNegativeMinuteSchema,
  }),
  z.strictObject({
    kind: z.literal('MISSING_RECORD'),
    recordCount: z.number().int().safe().min(0),
  }),
  z.strictObject({
    itemCount: z.number().int().safe().min(0),
    kind: z.literal('PENDING_APPROVAL'),
  }),
]);

const reportRowKindByKey = {
  'flexible-time': 'FLEXIBLE_TIME',
  leave: 'LEAVE',
  'missing-records': 'MISSING_RECORD',
  'monthly-time': 'MONTHLY_TIME',
  'pending-approvals': 'PENDING_APPROVAL',
} as const;

export const reportResultSchema = z
  .strictObject({
    generatedAt: instantSchema,
    key: reportKeySchema,
    pagination: reportPaginationSchema,
    partial: z.boolean(),
    range: z.strictObject({ from: dateSchema, to: dateSchema }),
    rows: z.array(reportRowSchema).max(50),
    scope: reportScopeSchema,
    summary: reportSummarySchema,
    timeZone: z.string().min(1).max(255),
  })
  .superRefine((value, context) => {
    const expectedKind = reportRowKindByKey[value.key];
    const expectedTotalPages = Math.ceil(value.pagination.total / value.pagination.limit);
    if (value.pagination.totalPages !== expectedTotalPages) {
      context.addIssue({
        code: 'custom',
        message: 'The report page count must match the total and limit.',
        path: ['pagination', 'totalPages'],
      });
    }
    if (value.rows.length > value.pagination.limit || value.rows.length > value.pagination.total) {
      context.addIssue({
        code: 'custom',
        message: 'The report page contains more rows than its pagination permits.',
        path: ['rows'],
      });
    }
    if (value.summary.kind !== expectedKind) {
      context.addIssue({
        code: 'custom',
        message: 'The report summary does not match the report key.',
        path: ['summary', 'kind'],
      });
    }
    for (const [index, row] of value.rows.entries()) {
      if (row.kind !== expectedKind) {
        context.addIssue({
          code: 'custom',
          message: 'The report row does not match the report key.',
          path: ['rows', index, 'kind'],
        });
      }
    }
    const expectedPartial =
      value.summary.kind === 'MONTHLY_TIME' && value.summary.incompleteRecordCount > 0;
    if (value.partial !== expectedPartial) {
      context.addIssue({
        code: 'custom',
        message: 'The partial flag must match incomplete monthly records.',
        path: ['partial'],
      });
    }
  });

export const reportCatalogEnvelopeSchema = createSuccessEnvelopeSchema(reportCatalogSchema);
export const reportResultEnvelopeSchema = createSuccessEnvelopeSchema(reportResultSchema);

export type ReportCatalog = z.infer<typeof reportCatalogSchema>;
export type ReportCatalogItem = z.infer<typeof reportCatalogItemSchema>;
export type ReportDirection = z.infer<typeof reportDirectionSchema>;
export type ReportKey = z.infer<typeof reportKeySchema>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ReportResult = z.infer<typeof reportResultSchema>;
export type ReportRow = z.infer<typeof reportRowSchema>;
export type ReportScope = z.infer<typeof reportScopeSchema>;
export type ReportSort = z.infer<typeof reportSortSchema>;
