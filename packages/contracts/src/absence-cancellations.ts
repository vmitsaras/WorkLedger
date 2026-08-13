import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const opaqueIdentifierSchema = z.uuid();
const cancellationStatusSchema = z.enum([
  'PENDING_DECISION',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN',
]);

export const submitAbsenceCancellationSchema = z.strictObject({
  coverageSegmentIds: z.array(opaqueIdentifierSchema).min(1).max(366).optional(),
  expectedRequestVersion: z.number().int().positive(),
});

export const absenceCancellationSchema = z.strictObject({
  id: opaqueIdentifierSchema,
  status: cancellationStatusSchema,
  version: z.number().int().positive(),
});
export const submittedAbsenceCancellationEnvelopeSchema =
  createSuccessEnvelopeSchema(absenceCancellationSchema);

export const decideAbsenceCancellationSchema = z
  .strictObject({
    action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(1).max(2_000).optional(),
  })
  .superRefine((value, context) => {
    if (value.action !== 'APPROVE' && value.reason === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A reason is required when rejecting or requesting changes.',
        path: ['reason'],
      });
    }
  });
export const decidedAbsenceCancellationEnvelopeSchema =
  createSuccessEnvelopeSchema(absenceCancellationSchema);

export const withdrawAbsenceCancellationSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
});
export const withdrawnAbsenceCancellationEnvelopeSchema =
  createSuccessEnvelopeSchema(absenceCancellationSchema);

export type AbsenceCancellation = z.infer<typeof absenceCancellationSchema>;
export type SubmitAbsenceCancellation = z.infer<typeof submitAbsenceCancellationSchema>;
export type DecideAbsenceCancellation = z.infer<typeof decideAbsenceCancellationSchema>;
export type WithdrawAbsenceCancellation = z.infer<typeof withdrawAbsenceCancellationSchema>;
