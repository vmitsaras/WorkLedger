import { z } from 'zod';

import { administrationActionResultSchema } from './administration.js';
import { createSuccessEnvelopeSchema } from './api.js';

const idSchema = z.string().min(1).max(128);
const localDateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });

export const absenceTypeCodeAdminSchema = z.enum(['VACATION', 'SICKNESS', 'UNPAID', 'OTHER']);
export const absenceCoverageUnitAdminSchema = z.enum(['FULL_DAY', 'HALF_DAY', 'MINUTES']);
export const absenceTypePolicyAdminSchema = z.strictObject({
  allowedCoverageUnits: z.array(absenceCoverageUnitAdminSchema).min(1).max(3),
  availabilityState: z.literal('UNAVAILABLE'),
  entitlementAccountCategory: z.string().trim().min(1).max(64).nullable(),
  maximumRetrospectiveCalendarDays: z.number().int().min(0).max(365).nullable(),
  minimumLeadCalendarDays: z.number().int().min(0).max(365),
  pendingReservationBehavior: z.enum(['NONE', 'RESERVE_PENDING']),
  requestNoteMode: z.enum(['DISABLED', 'OPTIONAL', 'REQUIRED']),
  timeTreatment: z.enum([
    'CREDIT_COVERED_EXPECTATION',
    'REDUCE_COVERED_EXPECTATION',
    'NO_TIME_EFFECT',
  ]),
  workflow: z.enum(['APPROVAL_REQUIRED', 'REPORT_AND_ACKNOWLEDGE']),
});

export const absenceTypeVersionAdminSummarySchema = z.strictObject({
  active: z.boolean(),
  code: absenceTypeCodeAdminSchema,
  id: idSchema,
  latestVersion: z.boolean(),
  name: z.string().trim().min(1).max(160),
  policy: absenceTypePolicyAdminSchema,
  validFrom: localDateSchema,
  validTo: localDateSchema.nullable(),
  version: z.number().int().positive(),
});

export const absenceSettingsAdminDetailSchema = z.strictObject({
  asOfLocalDate: localDateSchema,
  versions: z.array(absenceTypeVersionAdminSummarySchema).max(250),
});

export const createAbsenceTypeVersionAdminRequestSchema = z.strictObject({
  active: z.boolean(),
  code: absenceTypeCodeAdminSchema,
  effectiveFrom: localDateSchema,
  name: z.string().trim().min(1).max(160),
  policy: absenceTypePolicyAdminSchema,
});

export const entitlementEntryAdminSummarySchema = z.strictObject({
  effectiveOn: localDateSchema,
  entryType: z.enum([
    'ALLOCATION',
    'PENDING_RESERVATION',
    'RESERVATION_RELEASE',
    'APPROVED_DEDUCTION',
    'CANCELLATION_RESTORATION',
    'CARRYOVER',
    'EXPIRY',
    'MANUAL_ADJUSTMENT',
  ]),
  id: idSchema,
  minutes: z.number().int(),
  postedAt: instantSchema,
  reason: z.string().min(1).max(1_000).nullable(),
});

export const employeeEntitlementAccountAdminSchema = z.strictObject({
  absenceTypeId: idSchema,
  absenceTypeName: z.string().trim().min(1).max(160),
  availableMinutes: z.number().int(),
  entries: z.array(entitlementEntryAdminSummarySchema).max(500),
  projectedRemainingMinutes: z.number().int(),
  reservedMinutes: z.number().int(),
});

export const employeeEntitlementAdminDetailSchema = z.strictObject({
  accounts: z.array(employeeEntitlementAccountAdminSchema).max(100),
  adjustableAbsenceTypes: z.array(absenceTypeVersionAdminSummarySchema).max(100),
  asOfLocalDate: localDateSchema,
  privilegedActionsAllowed: z.boolean(),
});

export const createEntitlementAdjustmentAdminRequestSchema = z.strictObject({
  absenceTypeId: idSchema,
  effectiveOn: localDateSchema,
  minutes: z
    .number()
    .int()
    .min(-10_080_000)
    .max(10_080_000)
    .refine((value) => value !== 0),
  reason: z.string().trim().min(1).max(1_000),
});

export const absenceSettingsAdminDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  absenceSettingsAdminDetailSchema,
);
export const employeeEntitlementAdminDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  employeeEntitlementAdminDetailSchema,
);
export const absenceAdministrationActionEnvelopeSchema = createSuccessEnvelopeSchema(
  administrationActionResultSchema,
);

export type AbsenceTypePolicyAdmin = z.infer<typeof absenceTypePolicyAdminSchema>;
export type AbsenceTypeVersionAdminSummary = z.infer<typeof absenceTypeVersionAdminSummarySchema>;
export type AbsenceSettingsAdminDetail = z.infer<typeof absenceSettingsAdminDetailSchema>;
export type CreateAbsenceTypeVersionAdminRequest = z.infer<
  typeof createAbsenceTypeVersionAdminRequestSchema
>;
export type EmployeeEntitlementAdminDetail = z.infer<typeof employeeEntitlementAdminDetailSchema>;
export type CreateEntitlementAdjustmentAdminRequest = z.infer<
  typeof createEntitlementAdjustmentAdminRequestSchema
>;
