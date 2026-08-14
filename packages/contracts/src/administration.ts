import { z } from 'zod';

import { selfSessionSummarySchema } from './account.js';
import { createSuccessEnvelopeSchema } from './api.js';

export const HR_MANAGED_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR'] as const;
export const EMPLOYEE_ADMIN_STATUSES = ['ALL', 'ACTIVE', 'INACTIVE'] as const;

const opaqueIdentifierSchema = z.string().min(1).max(128);
const instantSchema = z.iso.datetime({ offset: true });
const localDateSchema = z.iso.date();
const displayTextSchema = z.string().trim().min(1).max(160);
const employeeNumberSchema = z.string().trim().min(1).max(64);
const emailSchema = z.email().max(320);
const inputEmailSchema = emailSchema.transform((value) => value.toLocaleLowerCase('en-US'));

export const hrManagedRoleSchema = z.enum(HR_MANAGED_ROLES);
export const employeeAdminStatusSchema = z.enum(EMPLOYEE_ADMIN_STATUSES);

export const employeeAdminQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  status: employeeAdminStatusSchema.default('ALL'),
});

export const administrationPaginationSchema = z.strictObject({
  limit: z.number().int().min(1).max(50),
  page: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const employmentPeriodSummarySchema = z.strictObject({
  endsOn: localDateSchema.nullable(),
  id: opaqueIdentifierSchema,
  startsOn: localDateSchema,
});

export const employeeAccountSummarySchema = z.strictObject({
  active: z.boolean(),
  email: emailSchema,
  invitationPending: z.boolean(),
});

export const employeeAdminListItemSchema = z.strictObject({
  account: employeeAccountSummarySchema.nullable(),
  currentEmployment: employmentPeriodSummarySchema.nullable(),
  displayName: displayTextSchema,
  employeeNumber: employeeNumberSchema,
  id: opaqueIdentifierSchema,
  roles: z.array(hrManagedRoleSchema).max(HR_MANAGED_ROLES.length),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const employeeAdminPageSchema = z.strictObject({
  items: z.array(employeeAdminListItemSchema).max(50),
  pagination: administrationPaginationSchema,
});

export const employeeAdminDetailSchema = employeeAdminListItemSchema.extend({
  employmentHistory: z.array(employmentPeriodSummarySchema).max(100),
  privilegedActionsAllowed: z.boolean(),
});

export const createEmployeeAdminRequestSchema = z
  .strictObject({
    displayName: displayTextSchema,
    email: inputEmailSchema,
    employeeNumber: employeeNumberSchema,
    employmentStartsOn: localDateSchema,
    roles: z.array(hrManagedRoleSchema).min(1).max(HR_MANAGED_ROLES.length),
  })
  .refine((value) => value.roles.includes('EMPLOYEE'), {
    message: 'Employee-linked accounts require the employee role.',
    path: ['roles'],
  });

export const activateEmployeeAdminRequestSchema = z.strictObject({
  employmentStartsOn: localDateSchema,
});

export const deactivateEmployeeAdminRequestSchema = z.strictObject({
  employmentEndsOn: localDateSchema,
});

export const replaceEmployeeRolesRequestSchema = z
  .strictObject({
    roles: z.array(hrManagedRoleSchema).min(1).max(HR_MANAGED_ROLES.length),
  })
  .refine((value) => value.roles.includes('EMPLOYEE'), {
    message: 'Employee-linked accounts require the employee role.',
    path: ['roles'],
  });

export const invitationActivationRequestSchema = z.strictObject({
  password: z.string().min(1).max(128),
  token: z.string().min(32).max(256),
});

export const invitationActivationResultSchema = z.strictObject({
  activated: z.literal(true),
});

export const systemAccountQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const systemAccountListItemSchema = z.strictObject({
  active: z.boolean(),
  employeeLinked: z.boolean(),
  email: emailSchema,
  id: opaqueIdentifierSchema,
  invitationPending: z.boolean(),
  name: displayTextSchema,
  privilegedActionsAllowed: z.boolean(),
  sessions: z.array(selfSessionSummarySchema.omit({ current: true })).max(50),
  systemAdministrator: z.boolean(),
});

export const systemAccountPageSchema = z.strictObject({
  items: z.array(systemAccountListItemSchema).max(50),
  pagination: administrationPaginationSchema,
});

export const createTechnicalAccountRequestSchema = z.strictObject({
  email: inputEmailSchema,
  name: displayTextSchema,
  systemAdministrator: z.literal(true),
});

export const systemAccountStateRequestSchema = z.strictObject({ active: z.boolean() });
export const systemRoleStateRequestSchema = z.strictObject({ enabled: z.boolean() });

export const administrationActionResultSchema = z.strictObject({
  action: z.enum([
    'ACCOUNT_ACTIVATED',
    'ACCOUNT_DEACTIVATED',
    'EMPLOYEE_ACTIVATED',
    'EMPLOYEE_CREATED',
    'EMPLOYEE_DEACTIVATED',
    'EMPLOYEE_ROLES_REPLACED',
    'INVITATION_REISSUED',
    'SESSION_REVOKED',
    'SYSTEM_ROLE_ASSIGNED',
    'SYSTEM_ROLE_REVOKED',
    'TECHNICAL_ACCOUNT_CREATED',
  ]),
  occurredAt: instantSchema,
  targetId: opaqueIdentifierSchema,
});

export const employeeAdminPageEnvelopeSchema = createSuccessEnvelopeSchema(employeeAdminPageSchema);
export const employeeAdminDetailEnvelopeSchema =
  createSuccessEnvelopeSchema(employeeAdminDetailSchema);
export const systemAccountPageEnvelopeSchema = createSuccessEnvelopeSchema(systemAccountPageSchema);
export const administrationActionEnvelopeSchema = createSuccessEnvelopeSchema(
  administrationActionResultSchema,
);
export const invitationActivationEnvelopeSchema = createSuccessEnvelopeSchema(
  invitationActivationResultSchema,
);

export type EmployeeAdminQuery = z.infer<typeof employeeAdminQuerySchema>;
export type EmployeeAdminPage = z.infer<typeof employeeAdminPageSchema>;
export type EmployeeAdminDetail = z.infer<typeof employeeAdminDetailSchema>;
export type CreateEmployeeAdminRequest = z.infer<typeof createEmployeeAdminRequestSchema>;
export type ActivateEmployeeAdminRequest = z.infer<typeof activateEmployeeAdminRequestSchema>;
export type DeactivateEmployeeAdminRequest = z.infer<typeof deactivateEmployeeAdminRequestSchema>;
export type ReplaceEmployeeRolesRequest = z.infer<typeof replaceEmployeeRolesRequestSchema>;
export type InvitationActivationRequest = z.infer<typeof invitationActivationRequestSchema>;
export type SystemAccountQuery = z.infer<typeof systemAccountQuerySchema>;
export type SystemAccountPage = z.infer<typeof systemAccountPageSchema>;
export type CreateTechnicalAccountRequest = z.infer<typeof createTechnicalAccountRequestSchema>;
export type SystemAccountStateRequest = z.infer<typeof systemAccountStateRequestSchema>;
export type SystemRoleStateRequest = z.infer<typeof systemRoleStateRequestSchema>;
export type AdministrationActionResult = z.infer<typeof administrationActionResultSchema>;
