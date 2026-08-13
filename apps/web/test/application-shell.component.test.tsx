import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type {
  DailyTimeRecord,
  MyTime,
  SelfContext,
  SelfProfile,
  TodayAttendance,
} from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { createWorkLedgerQueryClient, todayAttendanceQuery } from '../src/app/query.js';
import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
let routerSequence = 0;
const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'emma@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};
const TODAY_ATTENDANCE: TodayAttendance = {
  asOf: '2026-08-11T09:30:00Z',
  attendance: {
    activeSince: '2026-08-11T09:15:00Z',
    attendanceRevision: 3,
    state: 'WORKING',
    validActions: ['START_BREAK', 'CLOCK_OUT'],
  },
  calculation: {
    blockers: [],
    estimate: {
      absenceCreditMinutes: 0,
      absenceExpectedReductionMinutes: 0,
      adjustmentMinutes: 0,
      balanceMinutes: -285,
      breakMinutes: 15,
      creditedMinutes: 195,
      expectedMinutes: 480,
      holidayExpectedReductionMinutes: 0,
      scheduledMinutes: 480,
      workedMinutes: 195,
    },
    holidayName: null,
    status: 'PROVISIONAL',
    warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
  },
  localDate: '2026-08-11',
  timeZone: 'Europe/Berlin',
  timeline: [
    {
      id: '123e4567-e89b-42d3-a456-426614174201',
      occurredAt: '2026-08-11T07:00:00Z',
      type: 'CLOCK_IN',
    },
    {
      id: '123e4567-e89b-42d3-a456-426614174202',
      occurredAt: '2026-08-11T09:00:00Z',
      type: 'BREAK_START',
    },
    {
      id: '123e4567-e89b-42d3-a456-426614174203',
      occurredAt: '2026-08-11T09:15:00Z',
      type: 'BREAK_END',
    },
  ],
  timelineTruncated: false,
};

const MY_TIME: MyTime = {
  balance: {
    eligibleProjectedMinutes: 15,
    excludedIncompleteDates: ['2026-08-13'],
    postedBalanceMinutes: 630,
    projectedBalanceMinutes: 645,
  },
  ledger: {
    entries: [
      {
        balanceAfterMinutes: 600,
        effectiveDate: '2026-08-01',
        entryType: 'OPENING_BALANCE',
        explanationCode: 'OPENING_BALANCE',
        minutes: 600,
        postedAt: '2026-08-01T08:00:00Z',
      },
      {
        balanceAfterMinutes: 630,
        effectiveDate: '2026-08-11',
        entryType: 'DAILY_DELTA',
        explanationCode: 'DAILY_CALCULATION',
        minutes: 30,
        postedAt: '2026-08-11T17:00:00Z',
      },
    ],
    limit: 20,
    page: 1,
    total: 2,
  },
  period: { endDate: '2026-08-16', startDate: '2026-08-10', view: 'WEEK' },
  records: [
    {
      balanceMinutes: 30,
      creditedMinutes: 510,
      expectedMinutes: 480,
      localDate: '2026-08-11',
      recordId: '123e4567-e89b-42d3-a456-426614174301',
      status: 'COMPLETE',
    },
    {
      balanceMinutes: null,
      creditedMinutes: null,
      expectedMinutes: null,
      localDate: '2026-08-13',
      recordId: '123e4567-e89b-42d3-a456-426614174302',
      status: 'INCOMPLETE',
    },
  ],
  summary: { completeBalanceMinutes: 30, incompleteRecordCount: 1, recordedDayCount: 2 },
  timeZone: 'Europe/Berlin',
};

const DAILY_TIME_RECORD: DailyTimeRecord = {
  calculation: {
    absenceCreditMinutes: 0,
    adjustmentMinutes: 0,
    balanceMinutes: 30,
    breakMinutes: 30,
    creditedMinutes: 510,
    expectedMinutes: 480,
    workedMinutes: 510,
  },
  events: [
    { occurredAt: '2026-08-11T07:00:00Z', sequence: 1, type: 'CLOCK_IN' },
    { occurredAt: '2026-08-11T11:00:00Z', sequence: 2, type: 'BREAK_START' },
    { occurredAt: '2026-08-11T11:30:00Z', sequence: 3, type: 'BREAK_END' },
    { occurredAt: '2026-08-11T16:00:00Z', sequence: 4, type: 'CLOCK_OUT' },
  ],
  localDate: '2026-08-11',
  sessions: [
    {
      breaks: [
        {
          durationMinutes: 30,
          endsAt: '2026-08-11T11:30:00Z',
          startsAt: '2026-08-11T11:00:00Z',
        },
      ],
      continuesFromPreviousDate: false,
      continuesToNextDate: false,
      workIntervals: [
        {
          durationMinutes: 240,
          endsAt: '2026-08-11T11:00:00Z',
          startsAt: '2026-08-11T07:00:00Z',
        },
        {
          durationMinutes: 270,
          endsAt: '2026-08-11T16:00:00Z',
          startsAt: '2026-08-11T11:30:00Z',
        },
      ],
    },
  ],
  status: 'COMPLETE',
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  onlineManager.setOnline(true);
  vi.unstubAllGlobals();
});

test('shows accessible sign-in validation without attempting authentication', async () => {
  const fetchMock = vi.fn(async () => authenticationErrorResponse('AUTH_REQUIRED'));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  const { container } = renderApplication('/sign-in');

  const heading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Sign in | WorkLedger');
  expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute(
    'autocomplete',
    'username',
  );

  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  const summary = screen.getByRole('alert');
  await waitFor(() => expect(summary).toHaveFocus());
  expect(screen.getByRole('link', { name: 'Enter your email address.' })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await expectNoAxeViolations(container);
});

test('renders the role-aware shell and focuses each completed route navigation', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const todayHeading = await screen.findByRole('heading', { name: 'Today' });
  await waitFor(() => expect(todayHeading).toHaveFocus());
  expect(document.title).toBe('Today | WorkLedger');
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('link', { name: 'Operations' })).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Working' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '−4h 45m' })).toBeVisible();
  expect(
    screen.queryByText('The calculation source does not match its recorded ledger entry.'),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/below your configured flexible-time warning threshold/u)).toBeVisible();
  expect(screen.getByText('Clocked in')).toBeVisible();

  await user.click(screen.getByRole('link', { name: 'My time' }));
  const timeHeading = await screen.findByRole('heading', { name: 'My time' });
  await waitFor(() => expect(timeHeading).toHaveFocus());
  expect(document.title).toBe('My time | WorkLedger');
  await expectNoAxeViolations(container);
});

test('renders URL-owned time records and keeps posted and projected balance separate', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/my-time?date=2026-08-11&view=WEEK&page=1&limit=20');

  expect(await screen.findByRole('heading', { name: 'My time' })).toBeVisible();
  expect(await screen.findByText('Posted balance')).toBeVisible();
  expect(screen.getByText('10h 30m')).toBeVisible();
  expect(screen.getByText('Projected balance')).toBeVisible();
  expect(screen.getByText('10h 45m')).toBeVisible();
  expect(screen.getByText(/Projected balance excludes incomplete records/u)).toBeVisible();
  expect(screen.getByRole('table', { name: /Daily time record summaries/u })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Posted ledger entries' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('presents a daily record with calculation, exact session intervals, and offset-aware event list', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/time-records/123e4567-e89b-42d3-a456-426614174301');

  expect(await screen.findByRole('heading', { name: /August 11, 2026/u })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Calculation' })).toBeVisible();
  expect(screen.getAllByText('8h 30m')).not.toHaveLength(0);
  expect(screen.getByRole('heading', { name: 'Work sessions and breaks' })).toBeVisible();
  expect(screen.getByText(/Intervals that cross midnight/u)).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Recorded events' })).toBeVisible();
  expect(screen.getByText(/Recorded order 4/u)).toBeVisible();
  await expectNoAxeViolations(container);
});

test('explains incomplete overnight record slices without presenting a final calculation', async () => {
  const overnightRecord: DailyTimeRecord = {
    ...DAILY_TIME_RECORD,
    events: [{ occurredAt: '2026-08-12T00:30:00Z', sequence: 5, type: 'CLOCK_OUT' }],
    localDate: '2026-08-12',
    sessions: [
      {
        breaks: [],
        continuesFromPreviousDate: true,
        continuesToNextDate: false,
        workIntervals: [
          {
            durationMinutes: 150,
            endsAt: '2026-08-12T00:30:00Z',
            startsAt: '2026-08-11T22:00:00Z',
          },
        ],
      },
    ],
    status: 'INCOMPLETE',
  };
  vi.stubGlobal('fetch', authenticatedFetch(TODAY_ATTENDANCE, overnightRecord));
  const { container } = renderApplication('/time-records/123e4567-e89b-42d3-a456-426614174302');

  expect(
    await screen.findByText(
      'This record is incomplete. Its calculation is not a final posted result.',
    ),
  ).toBeVisible();
  expect(screen.getByText('Continues from the previous local date.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Calculation' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('explains the daily arithmetic and preserves attendance event order in semantic groups', async () => {
  const completedSequence: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    attendance: {
      activeSince: null,
      attendanceRevision: 4,
      state: 'OFF_WORK',
      validActions: ['CLOCK_IN'],
    },
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      estimate:
        TODAY_ATTENDANCE.calculation.estimate === null
          ? null
          : {
              ...TODAY_ATTENDANCE.calculation.estimate,
              adjustmentMinutes: -30,
              balanceMinutes: -315,
              creditedMinutes: 165,
            },
    },
    timeline: [
      ...TODAY_ATTENDANCE.timeline,
      {
        id: '123e4567-e89b-42d3-a456-426614174204',
        occurredAt: '2026-08-11T09:15:00Z',
        type: 'CLOCK_OUT',
      },
    ],
  };
  vi.stubGlobal('fetch', authenticatedFetch(completedSequence));
  const { container } = renderApplication('/today');

  await screen.findByRole('heading', { name: 'Off work' });
  const breakdown = screen.getByRole('region', { name: 'Calculation breakdown' });
  expect(within(breakdown).getByRole('heading', { name: 'Expected time' })).toBeVisible();
  expect(within(breakdown).getByRole('heading', { name: 'Credited time' })).toBeVisible();
  expect(within(breakdown).getByRole('heading', { name: 'Estimated balance' })).toBeVisible();
  expect(breakdown).toHaveTextContent(
    'Expected time equals 8h 00m scheduled, minus 0h 00m public-holiday reduction, minus 0h 00m absence reduction: 8h 00m.',
  );
  expect(breakdown).toHaveTextContent(
    'Credited time equals 3h 15m worked, plus 0h 00m absence credit, minus 0h 30m approved adjustments: 2h 45m.',
  );
  expect(breakdown).toHaveTextContent(
    'Estimated balance equals 2h 45m credited, minus 8h 00m expected: −5h 15m.',
  );
  expect(breakdown).toHaveTextContent('Approved adjustments−0h 30m');
  expect(breakdown).toHaveTextContent(
    'Break time is already excluded from worked time and is not subtracted again.',
  );

  const timeline = screen.getByRole('region', { name: 'Today’s timeline' });
  expect(timeline).toHaveTextContent('Times are shown in Europe/Berlin');
  expect(timeline).toHaveTextContent('Events sharing one time keep their recorded order.');
  const events = within(timeline).getAllByRole('listitem');
  expect(events).toHaveLength(4);
  expect(events.map((event) => event.textContent)).toEqual([
    'Clocked in9:00 AMWork session started.',
    'Break started11:00 AMWorking time paused.',
    'Break ended11:15 AMWorking time resumed.',
    'Clocked out11:15 AMWork session ended.',
  ]);
  await expectNoAxeViolations(container);
});

test('explains zero expected time before presenting credited work', async () => {
  const holidayToday: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    calculation: {
      blockers: [],
      estimate: {
        absenceCreditMinutes: 0,
        absenceExpectedReductionMinutes: 0,
        adjustmentMinutes: 0,
        balanceMinutes: 60,
        breakMinutes: 0,
        creditedMinutes: 60,
        expectedMinutes: 0,
        holidayExpectedReductionMinutes: 480,
        scheduledMinutes: 480,
        workedMinutes: 60,
      },
      holidayName: 'German Unity Day',
      status: 'PROVISIONAL',
      warnings: ['WORK_ON_HOLIDAY', 'WORK_ON_ZERO_EXPECTED_DAY'],
    },
  };
  vi.stubGlobal('fetch', authenticatedFetch(holidayToday));
  const { container } = renderApplication('/today');

  expect(await screen.findByRole('heading', { name: '+1h 00m' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Why expected time is zero' })).toBeVisible();
  expect(
    screen.getByText(/German Unity Day reduces today’s scheduled expectation to zero/u),
  ).toBeVisible();
  expect(screen.getByText(/not labelled as payroll overtime/u)).toBeVisible();
  await expectNoAxeViolations(container);
});

test('shows an incomplete calculation without inventing an estimate', async () => {
  const incompleteToday: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    attendance: {
      activeSince: null,
      attendanceRevision: 0,
      state: 'OFF_WORK',
      validActions: ['CLOCK_IN'],
    },
    calculation: {
      blockers: ['SCHEDULE_NOT_ASSIGNED'],
      estimate: null,
      holidayName: null,
      status: 'INCOMPLETE',
      warnings: [],
    },
    timeline: [],
  };
  vi.stubGlobal('fetch', authenticatedFetch(incompleteToday));
  const { container } = renderApplication('/today');

  expect(await screen.findByRole('heading', { name: 'Off work' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Not available' })).toBeVisible();
  expect(screen.getByText('No work schedule is assigned for today.')).toBeVisible();
  expect(screen.getByText('No attendance events have been recorded today.')).toBeVisible();
  await expectNoAxeViolations(container);
});

test('clocks in once, keeps the pending control stable, refetches authoritative state, and announces one result', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  const workingToday = todayWithAttendance('WORKING', 1);
  let clockedIn = false;
  let clockInRequests = 0;
  let submittedKey = '';
  let completeClockIn: (response: Response) => void = () => {
    throw new Error('Clock-in request was not pending.');
  };
  const pendingClockIn = new Promise<Response>((resolve) => {
    completeClockIn = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        return successResponse(clockedIn ? workingToday : offWorkToday);
      }
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        const headers = new Headers(init.headers);
        submittedKey = headers.get('idempotency-key') ?? '';
        expect(headers.get('x-workledger-csrf')).toBe('c'.repeat(43));
        expect(JSON.parse(String(init.body))).toEqual({ expectedAttendanceRevision: 0 });
        return pendingClockIn;
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const clockInButton = await screen.findByRole('button', { name: 'Clock in' });
  await user.click(clockInButton);
  const pendingButton = screen.getByRole('button', { name: 'Clocking in…' });
  expect(pendingButton).toBeDisabled();
  expect(pendingButton.closest('form')).toHaveAttribute('aria-busy', 'true');
  fireEvent.click(pendingButton);
  expect(clockInRequests).toBe(1);
  expect(submittedKey).toMatch(/^[0-9a-f-]{36}$/u);

  clockedIn = true;
  completeClockIn(
    successResponse({
      attendanceRevision: 1,
      command: 'CLOCK_IN',
      createdEvents: [{ id: 'punch-clock-in-1', type: 'CLOCK_IN' }],
      occurredAt: '2026-08-11T09:30:00Z',
      resultingState: 'WORKING',
      validActions: ['START_BREAK', 'CLOCK_OUT'],
    }),
  );

  const workingHeading = await screen.findByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Clocked in at 11:30 AM.');
  expect(screen.queryByRole('button', { name: 'Clock in' })).not.toBeInTheDocument();
  expect(clockInRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('starts and ends breaks and confirms active-break clock-out with stable keyboard focus', async () => {
  let serverToday = todayWithAttendance('WORKING', 1);
  let clockOutRequests = 0;
  let completeClockOut: (response: Response) => void = () => {
    throw new Error('Clock-out request was not pending.');
  };
  const pendingClockOut = new Promise<Response>((resolve) => {
    completeClockOut = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'b'.repeat(43) });
      const headers = new Headers(init?.headers);
      if (path.startsWith('/v1/me/attendance/') && init?.method === 'POST') {
        expect(headers.get('x-workledger-csrf')).toBe('b'.repeat(43));
        expect(headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/u);
      }
      if (path === '/v1/me/attendance/start-break' && init?.method === 'POST') {
        const expectedAttendanceRevision = serverToday.attendance.attendanceRevision;
        expect(JSON.parse(String(init.body))).toEqual({ expectedAttendanceRevision });
        const nextRevision = expectedAttendanceRevision + 1;
        serverToday = todayWithAttendance('ON_BREAK', nextRevision);
        return successResponse({
          attendanceRevision: nextRevision,
          command: 'START_BREAK',
          createdEvents: [{ id: `break-start-${nextRevision}`, type: 'BREAK_START' }],
          occurredAt: '2026-08-11T10:00:00Z',
          resultingState: 'ON_BREAK',
          validActions: ['RESUME', 'CLOCK_OUT'],
        });
      }
      if (path === '/v1/me/attendance/end-break' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ expectedAttendanceRevision: 2 });
        serverToday = todayWithAttendance('WORKING', 3);
        return successResponse({
          attendanceRevision: 3,
          command: 'RESUME',
          createdEvents: [{ id: 'break-end-3', type: 'BREAK_END' }],
          occurredAt: '2026-08-11T10:15:00Z',
          resultingState: 'WORKING',
          validActions: ['START_BREAK', 'CLOCK_OUT'],
        });
      }
      if (path === '/v1/me/attendance/clock-out' && init?.method === 'POST') {
        clockOutRequests += 1;
        expect(JSON.parse(String(init.body))).toEqual({
          confirmActiveBreak: true,
          expectedAttendanceRevision: 4,
        });
        return pendingClockOut;
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const todayHeading = await screen.findByRole('heading', { name: 'Today' });
  await waitFor(() => expect(todayHeading).toHaveFocus());
  await user.click(await screen.findByRole('button', { name: 'Start break' }));
  const onBreakHeading = await screen.findByRole('heading', { name: 'On break' });
  await waitFor(() => expect(onBreakHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Break started at 12:00 PM.');

  await user.click(screen.getByRole('button', { name: 'Resume work' }));
  const workingHeading = await screen.findByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Resumed work at 12:15 PM.');

  await user.click(screen.getByRole('button', { name: 'Start break' }));
  await screen.findByRole('heading', { name: 'On break' });
  const clockOutTrigger = screen.getByRole('button', { name: 'Clock out' });
  clockOutTrigger.focus();
  await user.keyboard('{Enter}');
  const dialog = screen.getByRole('dialog', { name: 'Clock out while on break?' });
  expect(dialog).toHaveFocus();
  expect(dialog).toHaveTextContent(
    'WorkLedger will close your active break and clock you out at the same recorded instant.',
  );
  await user.keyboard('{Escape}');
  await waitFor(() => expect(clockOutTrigger).toHaveFocus());
  expect(clockOutRequests).toBe(0);

  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('button', { name: 'Close break and clock out' }));
  expect(screen.getByRole('button', { name: 'Clocking out…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByRole('dialog', { name: 'Clock out while on break?' })).toBeVisible();
  expect(clockOutRequests).toBe(1);

  serverToday = todayWithAttendance('OFF_WORK', 5);
  completeClockOut(
    successResponse({
      attendanceRevision: 5,
      command: 'CLOCK_OUT',
      createdEvents: [
        { id: 'break-end-5', type: 'BREAK_END' },
        { id: 'clock-out-5', type: 'CLOCK_OUT' },
      ],
      occurredAt: '2026-08-11T10:30:00Z',
      resultingState: 'OFF_WORK',
      validActions: ['CLOCK_IN'],
    }),
  );

  const offWorkHeading = await screen.findByRole('heading', { name: 'Off work' });
  await waitFor(() => expect(offWorkHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Clocked out at 12:30 PM.');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(clockOutRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('recovers from a stale clock-in with one safe alert and logical status focus', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  const workingToday = todayWithAttendance('WORKING', 1);
  let serverToday = offWorkToday;
  let clockInRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'd'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        serverToday = workingToday;
        return Response.json(
          {
            error: {
              code: 'ATTENDANCE_STATE_CHANGED',
              context: {
                attendanceRevision: 1,
                currentState: 'WORKING',
                validActions: ['START_BREAK', 'CLOCK_OUT'],
              },
              message: 'The request could not be completed.',
              requestId: REQUEST_ID,
            },
          },
          { status: 409 },
        );
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(
    'No clock-in was recorded. Attendance changed in another tab or device. Current status: working.',
  );
  expect(alert).toHaveTextContent(`Request reference: ${REQUEST_ID}`);
  const workingHeading = screen.getByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(clockInRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('retries a lost attendance response with the same key and announces the replay once', async () => {
  let serverToday = todayWithAttendance('OFF_WORK', 0);
  const submittedKeys: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'r'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        submittedKeys.push(new Headers(init.headers).get('idempotency-key') ?? '');
        serverToday = todayWithAttendance('WORKING', 1);
        if (submittedKeys.length === 1) throw new TypeError('Response connection was lost.');
        return successResponse({
          attendanceRevision: 1,
          command: 'CLOCK_IN',
          createdEvents: [{ id: 'punch-clock-in-replay', type: 'CLOCK_IN' }],
          occurredAt: '2026-08-11T09:30:00Z',
          resultingState: 'WORKING',
          validActions: ['START_BREAK', 'CLOCK_OUT'],
        });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Clocked in at 11:30 AM.');
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(submittedKeys).toHaveLength(2);
  expect(submittedKeys[0]).toMatch(/^[0-9a-f-]{36}$/u);
  expect(submittedKeys[1]).toBe(submittedKeys[0]);
  await expectNoAxeViolations(container);
});

test('never queues an offline attendance action and refetches before enabling controls', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  let todayRequests = 0;
  let clockInRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        todayRequests += 1;
        return successResponse(offWorkToday);
      }
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        throw new Error('An offline clock-in must not be submitted.');
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const clockIn = await screen.findByRole('button', { name: 'Clock in' });
  const requestsBeforeOffline = todayRequests;
  act(() => onlineManager.setOnline(false));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Attendance actions are disabled and will not be queued.',
  );
  expect(clockIn).toBeDisabled();
  fireEvent.click(clockIn);
  expect(clockInRequests).toBe(0);

  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(clockIn).toBeEnabled());
  expect(todayRequests).toBeGreaterThan(requestsBeforeOffline);
  expect(clockInRequests).toBe(0);
  expect(screen.queryByText('You’re offline.')).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('refreshes a changed device state on focus and moves focus only from a removed action', async () => {
  let serverToday = todayWithAttendance('OFF_WORK', 0);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container, queryClient } = renderApplication('/today');

  const clockIn = await screen.findByRole('button', { name: 'Clock in' });
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Today', exact: true })).toHaveFocus(),
  );
  act(() => clockIn.focus());
  expect(clockIn).toHaveFocus();
  serverToday = todayWithAttendance('WORKING', 1);
  await act(() => queryClient.refetchQueries({ queryKey: todayAttendanceQuery().queryKey }));

  const workingHeading = await screen.findByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent(
    'Attendance changed in another tab or device. Current status: working.',
  );
  expect(screen.queryByRole('button', { name: 'Clock in' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('keeps stale attendance visible but disables actions while a background refresh fails', async () => {
  let failRefresh = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        return failRefresh
          ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
          : successResponse(TODAY_ATTENDANCE);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container, queryClient } = renderApplication('/today');

  const startBreak = await screen.findByRole('button', { name: 'Start break' });
  failRefresh = true;
  await act(() => queryClient.refetchQueries({ queryKey: todayAttendanceQuery().queryKey }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(
    'WorkLedger could not refresh your current attendance. Actions remain disabled.',
  );
  expect(alert).toHaveTextContent(`Request reference: ${REQUEST_ID}`);
  expect(startBreak).toBeDisabled();

  failRefresh = false;
  await user.click(within(alert).getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(startBreak).toBeEnabled());
  expect(screen.getByRole('heading', { name: 'Working' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('clears the Today mutation state and announces recovery when the clock-in session expires', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  let sessionExpired = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') {
        return sessionExpired
          ? authenticationErrorResponse('AUTH_SESSION_EXPIRED')
          : successResponse(EMPLOYEE_CONTEXT);
      }
      if (path === '/v1/me/attendance/today') return successResponse(offWorkToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'e'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        sessionExpired = true;
        return authenticationErrorResponse('AUTH_SESSION_EXPIRED');
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  const signInHeading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(signInHeading).toHaveFocus());
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your session expired. Sign in again to continue.',
  );
  expect(screen.queryByRole('button', { name: 'Clock in' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('keeps a Today load failure recoverable and exposes its safe request reference', async () => {
  let todayAttempts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        todayAttempts += 1;
        return todayAttempts <= 2
          ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
          : successResponse(TODAY_ATTENDANCE);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  expect(
    await screen.findByRole('heading', { name: 'Today is temporarily unavailable' }),
  ).toBeVisible();
  expect(screen.getByText(`Request reference: ${REQUEST_ID}`)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'Working' })).toBeVisible();
  expect(todayAttempts).toBe(3);
  await expectNoAxeViolations(container);
});

test('does not replace newer Today attendance with an older server snapshot', async () => {
  let response = TODAY_ATTENDANCE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => successResponse(response)),
  );
  const queryClient = createWorkLedgerQueryClient();

  await queryClient.fetchQuery(todayAttendanceQuery());
  response = {
    ...TODAY_ATTENDANCE,
    asOf: '2026-08-11T09:20:00Z',
    attendance: {
      activeSince: null,
      attendanceRevision: 2,
      state: 'OFF_WORK',
      validActions: ['CLOCK_IN'],
    },
  };
  await queryClient.invalidateQueries({ queryKey: ['self', 'attendance', 'today'] });
  await queryClient.fetchQuery(todayAttendanceQuery());

  expect(queryClient.getQueryData(['self', 'attendance', 'today'])).toMatchObject({
    asOf: TODAY_ATTENDANCE.asOf,
    attendance: { attendanceRevision: 3, state: 'WORKING' },
  });
});

test('renders a non-leaking permission-denied route state', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => successResponse(EMPLOYEE_CONTEXT)),
  );
  const { container } = renderApplication('/system/operations');

  const heading = await screen.findByRole('heading', { name: 'Permission denied' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText(/No restricted record details were disclosed/u)).toBeVisible();
  expect(document.title).toBe('Permission denied | WorkLedger');
  await expectNoAxeViolations(container);
});

test('keeps profile fields read-only and clears protected state after current-session revocation', async () => {
  let authenticated = true;
  const profile: SelfProfile = {
    ...EMPLOYEE_CONTEXT,
    sessions: [
      {
        createdAt: '2026-08-11T08:00:00Z',
        current: true,
        deviceSummary: 'Chrome on macOS',
        expiresAt: '2026-08-11T20:00:00Z',
        id: '123e4567-e89b-42d3-a456-426614174111',
        lastActiveAt: '2026-08-11T09:00:00Z',
      },
    ],
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') {
        return authenticated
          ? successResponse(EMPLOYEE_CONTEXT)
          : authenticationErrorResponse('AUTH_SESSION_EXPIRED');
      }
      if (path === '/v1/me/profile') return successResponse(profile);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path.includes('/v1/me/sessions/') && init?.method === 'POST') {
        authenticated = false;
        return successResponse({
          revokedCurrentSession: true,
          revokedSessionId: profile.sessions[0]?.id,
        });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/profile');

  await screen.findByRole('heading', { name: 'Profile' });
  expect(screen.getByText('NS-001')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Chrome on macOS — Current session' })).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Sign out this session' }));
  const signInHeading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(signInHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('You have signed out.');
  expect(screen.queryByText('NS-001')).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const url = new URL(initialEntry, 'https://workledger.test');
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `component-test-${(routerSequence += 1).toString()}`,
        pathname: url.pathname,
        search: url.search,
      },
    ],
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient };
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}

function authenticationErrorResponse(code: 'AUTH_REQUIRED' | 'AUTH_SESSION_EXPIRED'): Response {
  return Response.json(
    {
      error: {
        code,
        message: code === 'AUTH_REQUIRED' ? 'Sign in to continue.' : 'Your session has expired.',
        requestId: REQUEST_ID,
      },
    },
    { status: 401 },
  );
}

function apiErrorResponse(code: string, status: number): Response {
  return Response.json(
    { error: { code, message: 'The request could not be completed.', requestId: REQUEST_ID } },
    { status },
  );
}

function authenticatedFetch(
  today: TodayAttendance = TODAY_ATTENDANCE,
  dailyTimeRecord: DailyTimeRecord = DAILY_TIME_RECORD,
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = requestPath(input);
    if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
    if (path === '/v1/me/attendance/today') return successResponse(today);
    if (path === '/v1/me/time') return successResponse(MY_TIME);
    if (path.startsWith('/v1/me/time-records/')) return successResponse(dailyTimeRecord);
    throw new Error(`Unexpected test request: ${path}`);
  });
}

function todayWithAttendance(
  state: 'OFF_WORK' | 'ON_BREAK' | 'WORKING',
  attendanceRevision: number,
): TodayAttendance {
  const active = state !== 'OFF_WORK';
  return {
    ...TODAY_ATTENDANCE,
    attendance: {
      activeSince: active ? '2026-08-11T09:30:00Z' : null,
      attendanceRevision,
      state,
      validActions:
        state === 'WORKING'
          ? ['START_BREAK', 'CLOCK_OUT']
          : state === 'ON_BREAK'
            ? ['RESUME', 'CLOCK_OUT']
            : ['CLOCK_IN'],
    },
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      estimate:
        TODAY_ATTENDANCE.calculation.estimate === null
          ? null
          : {
              ...TODAY_ATTENDANCE.calculation.estimate,
              breakMinutes: 0,
              creditedMinutes: 0,
              workedMinutes: 0,
            },
      warnings: [],
    },
    timeline: active
      ? [{ id: 'punch-clock-in-1', occurredAt: '2026-08-11T09:30:00Z', type: 'CLOCK_IN' }]
      : [],
  };
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test').pathname;
  if (input instanceof URL) return input.pathname;
  return new URL(input.url).pathname;
}
