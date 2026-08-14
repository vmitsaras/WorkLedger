import { z } from 'zod';

import { administrationActionResultSchema } from './administration.js';
import { createSuccessEnvelopeSchema } from './api.js';

const opaqueIdentifierSchema = z.string().min(1).max(128);
const localDateSchema = z.iso.date();
const scheduledDayMinutesSchema = z.number().int().min(0).max(1_440);

export const timePolicyRulesSchema = z.strictObject({
  breakHandling: z.literal('MANUAL_WITH_WARNINGS'),
  flexibleTimeWarningMinutes: z.number().int().min(0).max(1_440),
  rounding: z.literal('NONE'),
});

export const weeklyScheduleMinutesSchema = z.strictObject({
  FRIDAY: scheduledDayMinutesSchema,
  MONDAY: scheduledDayMinutesSchema,
  SATURDAY: scheduledDayMinutesSchema,
  SUNDAY: scheduledDayMinutesSchema,
  THURSDAY: scheduledDayMinutesSchema,
  TUESDAY: scheduledDayMinutesSchema,
  WEDNESDAY: scheduledDayMinutesSchema,
});

export const scheduleVersionAdminSummarySchema = z.strictObject({
  id: opaqueIdentifierSchema,
  latestVersion: z.boolean(),
  name: z.string().trim().min(1).max(160),
  scheduledMinutes: weeklyScheduleMinutesSchema,
  version: z.number().int().positive(),
  weeklyTotalMinutes: z.number().int().min(0).max(10_080),
});

export const timeSettingsAdminDetailSchema = z.strictObject({
  policyVersions: z
    .array(
      z.strictObject({
        id: opaqueIdentifierSchema,
        latestVersion: z.boolean(),
        name: z.string().trim().min(1).max(160),
        rules: timePolicyRulesSchema,
        version: z.number().int().positive(),
      }),
    )
    .max(250),
  scheduleVersions: z.array(scheduleVersionAdminSummarySchema).max(250),
});

export const createTimePolicyVersionAdminRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  rules: timePolicyRulesSchema,
});

export const createScheduleVersionAdminRequestSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  scheduledMinutes: weeklyScheduleMinutesSchema,
});

export const scheduleAssignmentAdminSummarySchema = z.strictObject({
  endsOn: localDateSchema.nullable(),
  id: opaqueIdentifierSchema,
  schedule: scheduleVersionAdminSummarySchema,
  startsOn: localDateSchema,
});

export const scheduleCoverageGapSchema = z.strictObject({
  endsOn: localDateSchema.nullable(),
  startsOn: localDateSchema,
});

export const employeeScheduleAdminDetailSchema = z.strictObject({
  asOfLocalDate: localDateSchema,
  assignableSchedules: z.array(scheduleVersionAdminSummarySchema).max(250),
  coverageGaps: z.array(scheduleCoverageGapSchema).max(100),
  currentAssignment: scheduleAssignmentAdminSummarySchema.nullable(),
  history: z.array(scheduleAssignmentAdminSummarySchema).max(100),
  privilegedActionsAllowed: z.boolean(),
});

export const policyVersionAdminSummarySchema = z.strictObject({
  id: opaqueIdentifierSchema,
  latestVersion: z.boolean(),
  name: z.string().trim().min(1).max(160),
  rules: timePolicyRulesSchema,
  version: z.number().int().positive(),
});

export const policyAssignmentAdminSummarySchema = z.strictObject({
  endsOn: localDateSchema.nullable(),
  id: opaqueIdentifierSchema,
  policy: policyVersionAdminSummarySchema,
  startsOn: localDateSchema,
});

export const employeePolicyAdminDetailSchema = z.strictObject({
  asOfLocalDate: localDateSchema,
  assignablePolicies: z.array(policyVersionAdminSummarySchema).max(250),
  coverageGaps: z.array(scheduleCoverageGapSchema).max(100),
  currentAssignment: policyAssignmentAdminSummarySchema.nullable(),
  history: z.array(policyAssignmentAdminSummarySchema).max(100),
  privilegedActionsAllowed: z.boolean(),
});

export const replacePolicyAssignmentAdminRequestSchema = z.strictObject({
  effectiveFrom: localDateSchema,
  policyId: opaqueIdentifierSchema,
});

export const replaceScheduleAssignmentAdminRequestSchema = z.strictObject({
  effectiveFrom: localDateSchema,
  scheduleId: opaqueIdentifierSchema,
});

export const timeSettingsAdminDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  timeSettingsAdminDetailSchema,
);
export const employeeScheduleAdminDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  employeeScheduleAdminDetailSchema,
);
export const employeePolicyAdminDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  employeePolicyAdminDetailSchema,
);
export const scheduleAdministrationActionEnvelopeSchema = createSuccessEnvelopeSchema(
  administrationActionResultSchema,
);

export type WeeklyScheduleMinutes = z.infer<typeof weeklyScheduleMinutesSchema>;
export type TimePolicyRules = z.infer<typeof timePolicyRulesSchema>;
export type PolicyVersionAdminSummary = z.infer<typeof policyVersionAdminSummarySchema>;
export type ScheduleVersionAdminSummary = z.infer<typeof scheduleVersionAdminSummarySchema>;
export type TimeSettingsAdminDetail = z.infer<typeof timeSettingsAdminDetailSchema>;
export type CreateScheduleVersionAdminRequest = z.infer<
  typeof createScheduleVersionAdminRequestSchema
>;
export type CreateTimePolicyVersionAdminRequest = z.infer<
  typeof createTimePolicyVersionAdminRequestSchema
>;
export type EmployeeScheduleAdminDetail = z.infer<typeof employeeScheduleAdminDetailSchema>;
export type EmployeePolicyAdminDetail = z.infer<typeof employeePolicyAdminDetailSchema>;
export type ReplaceScheduleAssignmentAdminRequest = z.infer<
  typeof replaceScheduleAssignmentAdminRequestSchema
>;
export type ReplacePolicyAssignmentAdminRequest = z.infer<
  typeof replacePolicyAssignmentAdminRequestSchema
>;
