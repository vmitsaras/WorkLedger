import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  apiRecoveryContextSchema,
  createSuccessEnvelopeSchema,
  workspaceDependencies,
  workspacePackage,
} from '../src/index.js';

test('exposes the contracts package boundary identity', () => {
  expect(workspacePackage).toBe('@workledger/contracts');
  expect(workspaceDependencies).toEqual([]);
});

test('validates strict success and safe error envelopes from one schema source', () => {
  const requestId = randomUUID();
  const successSchema = createSuccessEnvelopeSchema(
    z.strictObject({ employeeId: z.string().min(1) }),
  );

  expect(
    successSchema.parse({
      data: { employeeId: 'employee-1' },
      meta: { requestId },
    }),
  ).toEqual({ data: { employeeId: 'employee-1' }, meta: { requestId } });
  expect(() =>
    successSchema.parse({
      data: { employeeId: 'employee-1', leaked: true },
      meta: { requestId },
    }),
  ).toThrow();

  expect(
    apiErrorEnvelopeSchema.parse({
      error: {
        code: 'ATTENDANCE_STATE_CHANGED',
        context: { attendanceRevision: 7, validActions: ['START_BREAK', 'CLOCK_OUT'] },
        message: 'The attendance state changed.',
        requestId,
      },
    }),
  ).toMatchObject({ error: { code: 'ATTENDANCE_STATE_CHANGED', requestId } });
});

test('rejects nested, oversized, and unbounded recovery context', () => {
  expect(() => apiRecoveryContextSchema.parse({ nested: { secret: 'no' } })).toThrow();
  expect(() => apiRecoveryContextSchema.parse({ unsafe_key: 'no' })).toThrow();
  expect(() =>
    apiRecoveryContextSchema.parse(
      Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`field${index}`, index])),
    ),
  ).toThrow();
});
