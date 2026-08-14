import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { SelfContext, TeamCalendar } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
let routerSequence = 0;

const MANAGER_CONTEXT: SelfContext = {
  account: { email: 'manager@northstar.test', name: 'Maja Novak' },
  defaultPath: '/profile',
  employee: { displayName: 'Maja Novak', employeeNumber: 'NS-010', status: 'ACTIVE' },
  navigationAreas: ['MANAGER'],
  organization: { name: 'Northstar Studio' },
  roles: ['MANAGER'],
};

const HR_CONTEXT: SelfContext = {
  account: { email: 'hr@northstar.test', name: 'Harper Reed' },
  defaultPath: '/profile',
  employee: null,
  navigationAreas: ['HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['HR_ADMINISTRATOR'],
};

const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'employee@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};

const TEAM_CALENDAR: TeamCalendar = {
  days: Array.from(
    { length: 31 },
    (_, index) => `2026-08-${(index + 1).toString().padStart(2, '0')}`,
  ),
  entries: [
    {
      availability: 'UNAVAILABLE',
      coverageKind: 'FULL_DAY',
      employeeDisplayName: 'Maria Chen',
      endsAtMinute: null,
      localDate: '2026-08-12',
      startsAtMinute: null,
      teamName: 'Client Services',
    },
    {
      availability: 'UNAVAILABLE',
      coverageKind: 'MINUTE_INTERVAL',
      employeeDisplayName: 'Noah Williams',
      endsAtMinute: 780,
      localDate: '2026-08-15',
      startsAtMinute: 540,
      teamName: null,
    },
  ],
  leadingEmptyDays: 5,
  month: '2026-08',
  scopeAsOfLocalDate: '2026-08-14',
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('presents equivalent accessible month and agenda availability with date selection', async () => {
  const requestState = stubFetch(MANAGER_CONTEXT, TEAM_CALENDAR);
  const user = userEvent.setup();
  const { container } = renderApplication('/team-calendar?month=2026-08');

  const heading = await screen.findByRole('heading', { name: 'Team calendar' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Team calendar | WorkLedger');
  const table = screen.getByRole('table', { name: /Neutral team unavailability for August 2026/u });
  expect(within(table).getByText('Maria Chen')).toBeVisible();
  expect(within(table).getByText('Unavailable — full day')).toBeVisible();
  expect(within(table).getByText('Noah Williams')).toBeVisible();
  expect(screen.getByText(/1 availability entry has no current team assignment/u)).toBeVisible();
  expect(screen.getByRole('heading', { name: /Friday, August 14, 2026 — Today/u })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'August 2026' })).toHaveAttribute(
    'aria-live',
    'polite',
  );

  await user.click(screen.getByRole('button', { name: 'Agenda list' }));
  const agenda = screen.getByRole('list', { name: 'Team availability agenda for August 2026' });
  expect(within(agenda).getByText('Maria Chen')).toBeVisible();
  expect(within(agenda).getByText('Unavailable — full day')).toBeVisible();
  expect(within(agenda).getByText('Noah Williams')).toBeVisible();
  expect(within(agenda).getByText('Unavailable — 09:00–13:00')).toBeVisible();

  const augustFifteenth = within(agenda)
    .getByRole('heading', { name: /Saturday, August 15, 2026/u })
    .closest('li');
  if (augustFifteenth === null) throw new Error('Expected an agenda group for August 15.');
  await user.click(within(augustFifteenth).getByRole('button', { name: 'Select date' }));
  expect(screen.getAllByRole('heading', { name: 'Saturday, August 15, 2026' })).toHaveLength(2);
  expect(document.querySelector('#selected-team-date-heading')).toHaveAttribute(
    'aria-live',
    'polite',
  );
  expect(screen.getAllByText('Noah Williams')).toHaveLength(2);
  expect(screen.queryByText(/sickness|vacation|medical|diagnosis/iu)).not.toBeInTheDocument();
  expect(requestState.calendarRequests).toBeGreaterThan(0);
  expect(requestState.requestedMonths).toEqual(['2026-08']);
  await expectNoAxeViolations(container);
});

test('shows an empty month and gives HR-only accounts the calendar navigation', async () => {
  stubFetch(HR_CONTEXT, { ...TEAM_CALENDAR, entries: [] });
  const { container } = renderApplication('/team-calendar?month=2026-08');

  expect(
    await screen.findByText('No team unavailability is recorded for this month.'),
  ).toBeVisible();
  expect(screen.getByText('No team unavailability is recorded for this date.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Team calendar' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expectNoAxeViolations(container);
});

test('does not request or disclose team calendar data to an employee-only route', async () => {
  let calendarRequested = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (url.pathname === '/v1/team/calendar') calendarRequested = true;
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  renderApplication('/team-calendar');

  expect(await screen.findByRole('heading', { name: 'Permission denied' })).toBeVisible();
  expect(calendarRequested).toBe(false);
  expect(screen.queryByText('Maria Chen')).not.toBeInTheDocument();
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `team-calendar-component-test-${(routerSequence += 1).toString()}`,
        pathname: initialEntry.split('?')[0],
        search: initialEntry.includes('?') ? `?${initialEntry.split('?')[1] ?? ''}` : '',
      },
    ],
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient, router };
}

function stubFetch(context: SelfContext, calendar: TeamCalendar) {
  let calendarRequests = 0;
  const requestedMonths: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(context);
      if (url.pathname === '/v1/team/calendar') {
        calendarRequests += 1;
        requestedMonths.push(url.searchParams.get('month') ?? '');
        return successResponse(calendar);
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  return {
    get calendarRequests() {
      return calendarRequests;
    },
    requestedMonths,
  };
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof Request) return new URL(input.url);
  return new URL(input.toString(), 'https://workledger.test');
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}
