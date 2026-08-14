import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import {
  approvalInboxEnvelopeSchema,
  approvalInboxItemSchema,
  approvalInboxQuerySchema,
  apiErrorEnvelopeSchema,
  apiRecoveryContextSchema,
  clockInEnvelopeSchema,
  clockInRequestSchema,
  clockOutEnvelopeSchema,
  clockOutRequestSchema,
  createSuccessEnvelopeSchema,
  resumeAttendanceEnvelopeSchema,
  notificationHistoryEnvelopeSchema,
  notificationQuerySchema,
  selfProfileEnvelopeSchema,
  startBreakEnvelopeSchema,
  teamCalendarEnvelopeSchema,
  teamCalendarQuerySchema,
  teamStatusEnvelopeSchema,
  todayAttendanceEnvelopeSchema,
  workspaceDependencies,
  workspacePackage,
} from '../src/index.js';

test('keeps notification history generic, strict, and pagination-bounded', () => {
  const response = {
    data: {
      items: [
        {
          body: 'An item you submitted needs changes.',
          deliveryStatus: 'FAILED',
          destinationPath: '/requests',
          dismissedAt: null,
          event: 'ITEM_CHANGES_REQUESTED',
          id: randomUUID(),
          occurredAt: '2026-08-14T09:30:00Z',
          status: 'ACTIVE',
          title: 'Changes requested',
        },
      ],
      pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
      timeZone: 'Europe/Berlin',
    },
    meta: { requestId: randomUUID() },
  };

  expect(notificationQuerySchema.parse({})).toEqual({ limit: 20, page: 1 });
  expect(notificationQuerySchema.parse({ limit: '50', page: '10000' })).toEqual({
    limit: 50,
    page: 10_000,
  });
  expect(() => notificationQuerySchema.parse({ limit: '51' })).toThrow();
  expect(() => notificationQuerySchema.parse({ absenceType: 'SICKNESS' })).toThrow();
  expect(notificationHistoryEnvelopeSchema.parse(response)).toEqual(response);
  expect(() =>
    notificationHistoryEnvelopeSchema.parse({
      ...response,
      data: {
        ...response.data,
        items: [{ ...response.data.items[0], destinationPath: '/sickness/record' }],
      },
    }),
  ).toThrow();
  expect(() =>
    notificationHistoryEnvelopeSchema.parse({
      ...response,
      data: {
        ...response.data,
        items: [{ ...response.data.items[0], dismissedAt: '2026-08-14T10:00:00Z' }],
      },
    }),
  ).toThrow();
  for (const protectedField of [
    'absenceType',
    'employeeId',
    'reason',
    'reviewer',
    'sourceId',
    'entitlementMinutes',
  ]) {
    expect(() =>
      notificationHistoryEnvelopeSchema.parse({
        ...response,
        data: {
          ...response.data,
          items: [{ ...response.data.items[0], [protectedField]: 'private' }],
        },
      }),
    ).toThrow();
  }
});

test('keeps team calendar coverage strict, neutral, and free of protected absence fields', () => {
  const response = {
    data: {
      days: Array.from(
        { length: 31 },
        (_, index) => `2026-08-${(index + 1).toString().padStart(2, '0')}`,
      ),
      entries: [
        {
          availability: 'UNAVAILABLE',
          coverageKind: 'MINUTE_INTERVAL',
          employeeDisplayName: 'Employee Example',
          endsAtMinute: 720,
          localDate: '2026-08-14',
          startsAtMinute: 540,
          teamName: 'Operations',
        },
      ],
      leadingEmptyDays: 5,
      month: '2026-08',
      scopeAsOfLocalDate: '2026-08-14',
      timeZone: 'Europe/Berlin',
    },
    meta: { requestId: randomUUID() },
  };

  expect(teamCalendarQuerySchema.parse({ month: '2026-08' })).toEqual({ month: '2026-08' });
  expect(() => teamCalendarQuerySchema.parse({ view: 'AGENDA' })).toThrow();
  expect(teamCalendarEnvelopeSchema.parse(response)).toEqual(response);
  expect(() =>
    teamCalendarEnvelopeSchema.parse({
      ...response,
      data: {
        ...response.data,
        entries: [{ ...response.data.entries[0], availability: 'SICKNESS' }],
      },
    }),
  ).toThrow();
  expect(() =>
    teamCalendarEnvelopeSchema.parse({
      ...response,
      data: {
        ...response.data,
        entries: [{ ...response.data.entries[0], endsAtMinute: null }],
      },
    }),
  ).toThrow();
  for (const protectedField of [
    'employeeId',
    'requestId',
    'absenceType',
    'sicknessClassification',
    'reason',
    'entitlementMinutes',
    'reviewerHistory',
  ]) {
    expect(() =>
      teamCalendarEnvelopeSchema.parse({
        ...response,
        data: {
          ...response.data,
          entries: [{ ...response.data.entries[0], [protectedField]: 'private' }],
        },
      }),
    ).toThrow();
  }
});

test('keeps team status bounded, strict, and free of protected absence fields', () => {
  const response = {
    data: {
      asOf: '2026-08-14T09:30:00+02:00',
      localDate: '2026-08-14',
      members: [
        {
          availability: 'UNAVAILABLE',
          displayName: 'Employee Example',
          hasUnresolvedRecords: true,
          teamName: 'Operations',
        },
      ],
      summary: {
        offWork: 0,
        onBreak: 0,
        total: 1,
        unavailable: 1,
        unresolved: 1,
        working: 0,
      },
      timeZone: 'Europe/Berlin',
    },
    meta: { requestId: randomUUID() },
  };

  expect(teamStatusEnvelopeSchema.parse(response)).toEqual(response);
  for (const protectedField of [
    'employeeId',
    'requestId',
    'absenceType',
    'reason',
    'entitlementMinutes',
  ]) {
    expect(() =>
      teamStatusEnvelopeSchema.parse({
        ...response,
        data: {
          ...response.data,
          members: [{ ...response.data.members[0], [protectedField]: 'private' }],
        },
      }),
    ).toThrow();
  }
});

test('applies bounded approval-inbox URL-filter defaults', () => {
  expect(approvalInboxQuerySchema.parse({})).toEqual({
    direction: 'DESC',
    limit: 20,
    page: 1,
    sort: 'SUBMITTED_AT',
    status: 'ACTION_REQUIRED',
    type: 'ALL',
  });
  expect(
    approvalInboxQuerySchema.parse({
      direction: 'ASC',
      limit: '50',
      page: '10000',
      sort: 'EMPLOYEE',
      status: 'COMPLETED',
      type: 'CANCELLATION',
    }),
  ).toMatchObject({ direction: 'ASC', limit: 50, page: 10_000, sort: 'EMPLOYEE' });

  expect(() => approvalInboxQuerySchema.parse({ limit: '9' })).toThrow();
  expect(() => approvalInboxQuerySchema.parse({ page: '10001' })).toThrow();
  expect(() => approvalInboxQuerySchema.parse({ employee: 'not-url-safe-filter-state' })).toThrow();
});

test('requires a correctly ordered approval-inbox date pair of at most 366 calendar days', () => {
  expect(approvalInboxQuerySchema.parse({ from: '2024-01-01', to: '2024-12-31' })).toMatchObject({
    from: '2024-01-01',
    to: '2024-12-31',
  });
  expect(approvalInboxQuerySchema.parse({ from: '2023-03-01', to: '2024-02-29' })).toMatchObject({
    from: '2023-03-01',
    to: '2024-02-29',
  });

  expect(() => approvalInboxQuerySchema.parse({ from: '2024-01-01' })).toThrow();
  expect(() => approvalInboxQuerySchema.parse({ to: '2024-01-01' })).toThrow();
  expect(() => approvalInboxQuerySchema.parse({ from: '2024-01-02', to: '2024-01-01' })).toThrow();
  expect(() => approvalInboxQuerySchema.parse({ from: '2024-01-01', to: '2025-01-01' })).toThrow();
});

test('keeps unified approval-inbox items strict, discriminated, and purpose-minimized', () => {
  const team = { id: randomUUID(), name: 'Operations' };
  const baseItem = {
    affectedEndDate: '2026-08-13',
    affectedStartDate: '2026-08-12',
    employeeDisplayName: 'Employee Example',
    id: randomUUID(),
    status: 'ACTION_REQUIRED' as const,
    submittedAt: '2026-08-13T09:15:00+02:00',
    team,
    version: 1,
  };

  for (const kind of ['CORRECTION', 'ABSENCE', 'CANCELLATION'] as const) {
    expect(approvalInboxItemSchema.parse({ ...baseItem, kind })).toMatchObject({ kind });
  }
  expect(
    approvalInboxItemSchema.parse({
      affectedEndDate: baseItem.affectedEndDate,
      affectedStartDate: baseItem.affectedStartDate,
      employeeDisplayName: baseItem.employeeDisplayName,
      id: baseItem.id,
      kind: 'CORRECTION',
      status: baseItem.status,
      submittedAt: baseItem.submittedAt,
      version: baseItem.version,
    }),
  ).not.toHaveProperty('team');
  expect(() => approvalInboxItemSchema.parse({ ...baseItem, kind: 'MONTHLY_PERIOD' })).toThrow();
  expect(() =>
    approvalInboxItemSchema.parse({
      ...baseItem,
      kind: 'ABSENCE',
      team: { ...team, managerId: randomUUID() },
    }),
  ).toThrow();

  const forbiddenFields = {
    absenceSubtype: 'SICKNESS',
    employeeId: randomUUID(),
    entitlementMinutes: 480,
    events: [],
    reason: 'Purpose-incompatible detail',
    sourceStatus: 'SUBMITTED',
  };
  for (const [field, value] of Object.entries(forbiddenFields)) {
    expect(() =>
      approvalInboxItemSchema.parse({ ...baseItem, [field]: value, kind: 'ABSENCE' }),
    ).toThrow();
  }
});

test('validates the strict, paginated approval-inbox response shape', () => {
  const response = {
    data: {
      filterOptions: { teams: [{ id: randomUUID(), name: 'Operations' }] },
      items: [
        {
          affectedEndDate: '2026-08-13',
          affectedStartDate: '2026-08-13',
          employeeDisplayName: 'Employee Example',
          id: randomUUID(),
          kind: 'CANCELLATION',
          status: 'WAITING_ON_EMPLOYEE',
          submittedAt: '2026-08-13T09:15:00Z',
          version: 2,
        },
      ],
      pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
      timeZone: 'Europe/Berlin',
    },
    meta: { requestId: randomUUID() },
  };

  expect(approvalInboxEnvelopeSchema.parse(response)).toEqual(response);
  expect(() =>
    approvalInboxEnvelopeSchema.parse({
      ...response,
      data: { ...response.data, organizationId: randomUUID() },
    }),
  ).toThrow();
});

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

test('keeps break, resume, and clock-out outcomes correlated with exact immutable events', () => {
  const meta = { idempotentReplay: false, requestId: randomUUID() };
  const base = {
    attendanceRevision: 2,
    occurredAt: '2026-08-11T12:00:00Z',
  };

  expect(
    startBreakEnvelopeSchema.parse({
      data: {
        ...base,
        command: 'START_BREAK',
        createdEvents: [{ id: 'punch-2', type: 'BREAK_START' }],
        resultingState: 'ON_BREAK',
        validActions: ['RESUME', 'CLOCK_OUT'],
      },
      meta,
    }),
  ).toMatchObject({ data: { command: 'START_BREAK', resultingState: 'ON_BREAK' } });

  expect(
    resumeAttendanceEnvelopeSchema.parse({
      data: {
        ...base,
        command: 'RESUME',
        createdEvents: [{ id: 'punch-3', type: 'BREAK_END' }],
        resultingState: 'WORKING',
        validActions: ['START_BREAK', 'CLOCK_OUT'],
      },
      meta,
    }),
  ).toMatchObject({ data: { command: 'RESUME', resultingState: 'WORKING' } });

  expect(clockOutRequestSchema.parse({ expectedAttendanceRevision: 4 })).toEqual({
    expectedAttendanceRevision: 4,
  });
  expect(
    clockOutRequestSchema.parse({ confirmActiveBreak: true, expectedAttendanceRevision: 4 }),
  ).toEqual({ confirmActiveBreak: true, expectedAttendanceRevision: 4 });
  expect(() =>
    clockInRequestSchema.parse({ confirmActiveBreak: true, expectedAttendanceRevision: 4 }),
  ).toThrow();

  const confirmedClockOut = {
    data: {
      ...base,
      attendanceRevision: 5,
      command: 'CLOCK_OUT',
      createdEvents: [
        { id: 'punch-4', type: 'BREAK_END' },
        { id: 'punch-5', type: 'CLOCK_OUT' },
      ],
      resultingState: 'OFF_WORK',
      validActions: ['CLOCK_IN'],
    },
    meta,
  };
  expect(clockOutEnvelopeSchema.parse(confirmedClockOut)).toEqual(confirmedClockOut);
  expect(() =>
    clockOutEnvelopeSchema.parse({
      ...confirmedClockOut,
      data: {
        ...confirmedClockOut.data,
        createdEvents: [...confirmedClockOut.data.createdEvents].reverse(),
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
