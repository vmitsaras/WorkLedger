import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  apiRecoveryContextSchema,
  createSuccessEnvelopeSchema,
  selfProfileEnvelopeSchema,
  workspaceDependencies,
  workspacePackage,
} from '../src/index.js';

test('exposes the contracts package boundary identity', () => {
  expect(workspacePackage).toBe('@workledger/contracts');
  expect(workspaceDependencies).toEqual([]);
});

test('keeps self-profile and session transport fields purpose-minimized', () => {
  const profile = {
    data: {
      account: { email: 'employee@example.test', name: 'Employee Example' },
      defaultPath: '/today',
      employee: {
        displayName: 'Employee Example',
        employeeNumber: 'EX-001',
        status: 'ACTIVE',
      },
      navigationAreas: ['EMPLOYEE'],
      organization: { name: 'Example Organization' },
      roles: ['EMPLOYEE'],
      sessions: [
        {
          createdAt: '2026-08-11T08:00:00Z',
          current: true,
          deviceSummary: 'Chrome on macOS',
          expiresAt: '2026-08-11T20:00:00Z',
          id: 'session-1',
          lastActiveAt: '2026-08-11T09:00:00Z',
        },
      ],
    },
    meta: { requestId: randomUUID() },
  };

  expect(selfProfileEnvelopeSchema.parse(profile)).toEqual(profile);
  expect(() =>
    selfProfileEnvelopeSchema.parse({
      ...profile,
      data: {
        ...profile.data,
        sessions: [{ ...profile.data.sessions[0], ipAddress: '192.0.2.1' }],
      },
    }),
  ).toThrow();
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
