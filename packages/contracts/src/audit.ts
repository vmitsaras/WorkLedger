import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const idSchema = z.string().min(1).max(160);
const localDateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const tokenSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,79}$/u);

export const DOMAIN_AUDIT_TARGET_KINDS = [
  'EMPLOYEE',
  'ATTENDANCE',
  'CORRECTION_REQUEST',
  'ABSENCE_REQUEST',
  'MONTHLY_PERIOD',
  'TIME_ACCOUNT',
  'LEAVE_ENTITLEMENT',
  'TEAM',
  'ASSIGNMENT',
  'CONFIGURATION',
  'EXPORT',
] as const;

export const domainAuditQuerySchema = z
  .strictObject({
    action: tokenSchema.optional(),
    from: localDateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    outcome: z.enum(['SUCCESS', 'DENIED', 'FAILURE']).optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    targetKind: z.enum(DOMAIN_AUDIT_TARGET_KINDS).optional(),
    to: localDateSchema.optional(),
  })
  .refine((value) => value.from === undefined || value.to === undefined || value.from <= value.to, {
    path: ['to'],
  });

export const domainAuditFactSchema = z.strictObject({
  attendanceRevision: z.number().int().nonnegative().optional(),
  effectiveDate: localDateSchema.optional(),
  eventCount: z.number().int().nonnegative().optional(),
  minutes: z.number().int().optional(),
  nextStatus: tokenSchema.optional(),
  previousStatus: tokenSchema.optional(),
  sourceCount: z.number().int().nonnegative().optional(),
  version: z.number().int().positive().optional(),
});

export const domainAuditListItemSchema = z.strictObject({
  action: tokenSchema,
  actor: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('ACCOUNT'), role: z.string().nullable() }),
    z.strictObject({ kind: z.literal('SYSTEM'), process: idSchema }),
  ]),
  facts: domainAuditFactSchema,
  id: idSchema,
  occurredAt: instantSchema,
  outcome: z.enum(['SUCCESS', 'DENIED', 'FAILURE']),
  privileged: z.boolean(),
  reasonCode: tokenSchema.nullable(),
  targetKind: z.enum(DOMAIN_AUDIT_TARGET_KINDS),
  targetReference: idSchema,
});

export const domainAuditPageSchema = z.strictObject({
  items: z.array(domainAuditListItemSchema).max(50),
  pagination: z.strictObject({
    limit: z.number().int().min(1).max(50),
    page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const domainAuditPageEnvelopeSchema = createSuccessEnvelopeSchema(domainAuditPageSchema);

export type DomainAuditQuery = z.infer<typeof domainAuditQuerySchema>;
export type DomainAuditPage = z.infer<typeof domainAuditPageSchema>;
