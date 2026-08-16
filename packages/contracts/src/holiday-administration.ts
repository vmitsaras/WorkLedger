import { z } from 'zod';

import { administrationActionResultSchema } from './administration.js';
import { createSuccessEnvelopeSchema } from './api.js';

const idSchema = z.string().min(1).max(128);
const localDateSchema = z.iso.date();

export const holidayAdminSummarySchema = z.strictObject({
  holidayDate: localDateSchema,
  id: idSchema,
  name: z.string().trim().min(1).max(160),
});

export const holidaySettingsAdminDetailSchema = z.strictObject({
  asOfLocalDate: localDateSchema,
  holidays: z.array(holidayAdminSummarySchema).max(500),
});

export const holidayImpactPreviewAdminRequestSchema = z.strictObject({
  holidayDate: localDateSchema,
  name: z.string().trim().min(1).max(160),
});

export const holidayImpactPreviewAdminSchema = z.strictObject({
  affectedEmployeeCount: z.number().int().nonnegative(),
  affectedProjectionCount: z.number().int().nonnegative(),
  alreadyConfigured: z.boolean(),
  blockedPeriodCount: z.number().int().nonnegative(),
  holidayDate: localDateSchema,
  mutationAllowed: z.boolean(),
});

export const createHolidayAdminRequestSchema = holidayImpactPreviewAdminRequestSchema.extend({
  impactAcknowledged: z.literal(true),
});

export const holidaySettingsAdminDetailEnvelopeSchema = createSuccessEnvelopeSchema(
  holidaySettingsAdminDetailSchema,
);
export const holidayImpactPreviewAdminEnvelopeSchema = createSuccessEnvelopeSchema(
  holidayImpactPreviewAdminSchema,
);
export const holidayAdministrationActionEnvelopeSchema = createSuccessEnvelopeSchema(
  administrationActionResultSchema,
);

export type HolidaySettingsAdminDetail = z.infer<typeof holidaySettingsAdminDetailSchema>;
export type HolidayImpactPreviewAdminRequest = z.infer<
  typeof holidayImpactPreviewAdminRequestSchema
>;
export type HolidayImpactPreviewAdmin = z.infer<typeof holidayImpactPreviewAdminSchema>;
export type CreateHolidayAdminRequest = z.infer<typeof createHolidayAdminRequestSchema>;
