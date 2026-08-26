import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';
import {
  companyIdentityAccentSchema,
  companyIdentityFaviconPathSchema,
  companyIdentityLogoPathSchema,
} from './company-identity.js';
import { supportedLocaleSchema } from './locales.js';

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
  accentColor: companyIdentityAccentSchema.optional(),
  faviconPath: companyIdentityFaviconPathSchema.nullable().optional(),
  logoPath: companyIdentityLogoPathSchema.nullable().optional(),
  name: displayTextSchema,
});

export const selfContextSchema = z.strictObject({
  account: accountSummarySchema,
  defaultPath: z.enum(['/today', '/employees', '/system/operations', '/profile']),
  employee: employeeSelfSummarySchema.nullable(),
  locale: supportedLocaleSchema,
  navigationAreas: z.array(navigationAreaSchema).max(NAVIGATION_AREAS.length),
  organization: organizationSummarySchema,
  roles: z.array(applicationRoleSchema).max(APPLICATION_ROLES.length),
});

export const selfSessionSummarySchema = z.strictObject({
  browser: z.enum(['EDGE', 'FIREFOX', 'CHROME', 'SAFARI', 'BROWSER', 'UNRECOGNIZED']),
  createdAt: instantSchema,
  current: z.boolean(),
  expiresAt: instantSchema,
  id: opaqueIdentifierSchema,
  lastActiveAt: instantSchema,
  platform: z.enum(['IOS', 'ANDROID', 'MACOS', 'WINDOWS', 'LINUX']).nullable(),
});

export const selfProfileSchema = selfContextSchema.extend({
  sessions: z.array(selfSessionSummarySchema).max(50),
  timeZone: z.string().min(1).max(255),
});

export const csrfBootstrapSchema = z.strictObject({
  token: z.string().min(32).max(256),
});

export const revokeSelfSessionResultSchema = z.strictObject({
  revokedCurrentSession: z.boolean(),
  revokedSessionId: opaqueIdentifierSchema,
});

export const updateSelfLocaleRequestSchema = z.strictObject({
  locale: supportedLocaleSchema,
});

export const updateSelfLocaleResultSchema = z.strictObject({
  locale: supportedLocaleSchema,
});

export const selfContextEnvelopeSchema = createSuccessEnvelopeSchema(selfContextSchema);
export const selfProfileEnvelopeSchema = createSuccessEnvelopeSchema(selfProfileSchema);
export const csrfBootstrapEnvelopeSchema = createSuccessEnvelopeSchema(csrfBootstrapSchema);
export const revokeSelfSessionEnvelopeSchema = createSuccessEnvelopeSchema(
  revokeSelfSessionResultSchema,
);
export const updateSelfLocaleEnvelopeSchema = createSuccessEnvelopeSchema(
  updateSelfLocaleResultSchema,
);

export type ApplicationRole = z.infer<typeof applicationRoleSchema>;
export type NavigationArea = z.infer<typeof navigationAreaSchema>;
export type SelfContext = z.infer<typeof selfContextSchema>;
export type SelfProfile = z.infer<typeof selfProfileSchema>;
export type SelfSessionSummary = z.infer<typeof selfSessionSummarySchema>;
export type UpdateSelfLocaleRequest = z.infer<typeof updateSelfLocaleRequestSchema>;
export type UpdateSelfLocaleResult = z.infer<typeof updateSelfLocaleResultSchema>;
