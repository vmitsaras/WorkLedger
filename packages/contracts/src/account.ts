import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

export const APPLICATION_ROLES = [
  'EMPLOYEE',
  'MANAGER',
  'HR_ADMINISTRATOR',
  'SYSTEM_ADMINISTRATOR',
] as const;

export const NAVIGATION_AREAS = ['EMPLOYEE', 'MANAGER', 'HR', 'SYSTEM'] as const;

export const PASSWORD_MINIMUM_LENGTH = 15;
export const PASSWORD_MAXIMUM_LENGTH = 128;

export const applicationRoleSchema = z.enum(APPLICATION_ROLES);
export const navigationAreaSchema = z.enum(NAVIGATION_AREAS);

const opaqueIdentifierSchema = z.string().min(1).max(128);
const displayTextSchema = z.string().min(1).max(160);
const emailSchema = z.email().max(320);
const instantSchema = z.iso.datetime({ offset: true });

export const accountSummarySchema = z.strictObject({
  email: emailSchema,
  name: displayTextSchema,
});

export const employeeSelfSummarySchema = z.strictObject({
  displayName: displayTextSchema,
  employeeNumber: z.string().min(1).max(64),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const organizationSummarySchema = z.strictObject({
  name: displayTextSchema,
});

export const selfContextSchema = z.strictObject({
  account: accountSummarySchema,
  defaultPath: z.enum(['/today', '/employees', '/system/operations', '/profile']),
  employee: employeeSelfSummarySchema.nullable(),
  navigationAreas: z.array(navigationAreaSchema).max(NAVIGATION_AREAS.length),
  organization: organizationSummarySchema,
  roles: z.array(applicationRoleSchema).max(APPLICATION_ROLES.length),
});

export const selfSessionSummarySchema = z.strictObject({
  createdAt: instantSchema,
  current: z.boolean(),
  deviceSummary: z.string().min(1).max(96),
  expiresAt: instantSchema,
  id: opaqueIdentifierSchema,
  lastActiveAt: instantSchema,
});

export const selfProfileSchema = selfContextSchema.extend({
  sessions: z.array(selfSessionSummarySchema).max(50),
});

export const csrfBootstrapSchema = z.strictObject({
  token: z.string().min(32).max(256),
});

export const revokeSelfSessionResultSchema = z.strictObject({
  revokedCurrentSession: z.boolean(),
  revokedSessionId: opaqueIdentifierSchema,
});

export const selfContextEnvelopeSchema = createSuccessEnvelopeSchema(selfContextSchema);
export const selfProfileEnvelopeSchema = createSuccessEnvelopeSchema(selfProfileSchema);
export const csrfBootstrapEnvelopeSchema = createSuccessEnvelopeSchema(csrfBootstrapSchema);
export const revokeSelfSessionEnvelopeSchema = createSuccessEnvelopeSchema(
  revokeSelfSessionResultSchema,
);

export type ApplicationRole = z.infer<typeof applicationRoleSchema>;
export type NavigationArea = z.infer<typeof navigationAreaSchema>;
export type SelfContext = z.infer<typeof selfContextSchema>;
export type SelfProfile = z.infer<typeof selfProfileSchema>;
export type SelfSessionSummary = z.infer<typeof selfSessionSummarySchema>;
