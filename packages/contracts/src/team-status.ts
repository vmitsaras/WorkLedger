import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const TEAM_AVAILABILITY_STATES = ['WORKING', 'ON_BREAK', 'UNAVAILABLE', 'OFF_WORK'] as const;

export const teamAvailabilityStateSchema = z.enum(TEAM_AVAILABILITY_STATES);

export const teamStatusMemberSchema = z.strictObject({
  availability: teamAvailabilityStateSchema,
  displayName: z.string().min(1).max(160),
  hasUnresolvedRecords: z.boolean(),
  teamName: z.string().min(1).max(160).nullable(),
});

export const teamStatusSummarySchema = z.strictObject({
  offWork: z.number().int().min(0).max(1_000),
  onBreak: z.number().int().min(0).max(1_000),
  total: z.number().int().min(0).max(1_000),
  unavailable: z.number().int().min(0).max(1_000),
  unresolved: z.number().int().min(0).max(1_000),
  working: z.number().int().min(0).max(1_000),
});

export const teamStatusSchema = z.strictObject({
  asOf: z.iso.datetime({ offset: true }),
  localDate: z.iso.date(),
  members: z.array(teamStatusMemberSchema).max(1_000),
  summary: teamStatusSummarySchema,
  timeZone: z.string().min(1).max(255),
});

export const teamStatusEnvelopeSchema = createSuccessEnvelopeSchema(teamStatusSchema);

export type TeamAvailabilityState = z.infer<typeof teamAvailabilityStateSchema>;
export type TeamStatus = z.infer<typeof teamStatusSchema>;
export type TeamStatusMember = z.infer<typeof teamStatusMemberSchema>;
