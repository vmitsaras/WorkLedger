import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  apiErrorEnvelopeSchema,
  apiRecoveryContextSchema,
  clockInEnvelopeSchema,
  clockInRequestSchema,
  createSuccessEnvelopeSchema,
  selfProfileEnvelopeSchema,
  todayAttendanceEnvelopeSchema,
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

test('keeps the Today contract provisional, bounded, and free of account identity fields', () => {
  const response = {
    data: {
      asOf: '2026-08-11T10:30:00Z',
      attendance: {
        activeSince: '2026-08-11T08:00:00Z',
        attendanceRevision: 1,
        state: 'WORKING',
        validActions: ['START_BREAK', 'CLOCK_OUT'],
      },
      calculation: {
        blockers: [],
        estimate: {
          absenceCreditMinutes: 0,
          absenceExpectedReductionMinutes: 0,
          adjustmentMinutes: 0,
          balanceMinutes: -390,
          breakMinutes: 0,
          creditedMinutes: 90,
          expectedMinutes: 480,
          holidayExpectedReductionMinutes: 0,
          scheduledMinutes: 480,
          workedMinutes: 90,
        },
        holidayName: null,
        status: 'PROVISIONAL',
        warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
      },
      localDate: '2026-08-11',
      timeZone: 'Europe/Berlin',
      timeline: [{ id: 'punch-1', occurredAt: '2026-08-11T08:00:00Z', type: 'CLOCK_IN' }],
      timelineTruncated: false,
    },
    meta: { requestId: randomUUID() },
  };

  expect(todayAttendanceEnvelopeSchema.parse(response)).toEqual(response);
  expect(() =>
    todayAttendanceEnvelopeSchema.parse({
      ...response,
      data: { ...response.data, employeeId: 'not-for-browser-transport' },
    }),
  ).toThrow();
});

test('keeps clock-in input strict and returns only its authoritative semantic outcome', () => {
  expect(clockInRequestSchema.parse({ expectedAttendanceRevision: 0 })).toEqual({
    expectedAttendanceRevision: 0,
  });
  expect(() =>
    clockInRequestSchema.parse({
      clientOccurredAt: '2026-08-11T08:00:00Z',
      expectedAttendanceRevision: 0,
    }),
  ).toThrow();

  const response = {
    data: {
      attendanceRevision: 1,
      command: 'CLOCK_IN',
      createdEvents: [{ id: 'punch-1', type: 'CLOCK_IN' }],
      occurredAt: '2026-08-11T08:00:00Z',
      resultingState: 'WORKING',
      validActions: ['START_BREAK', 'CLOCK_OUT'],
    },
    meta: { idempotentReplay: true, requestId: randomUUID() },
  };
  expect(clockInEnvelopeSchema.parse(response)).toEqual(response);
  expect(() =>
    clockInEnvelopeSchema.parse({
      ...response,
      data: { ...response.data, organizationId: 'not-for-browser-transport' },
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
