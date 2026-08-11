import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { SelfContext, SelfProfile, TodayAttendance } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { createWorkLedgerQueryClient, todayAttendanceQuery } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
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

afterEach(() => {
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
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [initialEntry],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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

function authenticatedFetch(today: TodayAttendance = TODAY_ATTENDANCE) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = requestPath(input);
    if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
    if (path === '/v1/me/attendance/today') return successResponse(today);
    throw new Error(`Unexpected test request: ${path}`);
  });
}

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test').pathname;
  if (input instanceof URL) return input.pathname;
  return new URL(input.url).pathname;
}
