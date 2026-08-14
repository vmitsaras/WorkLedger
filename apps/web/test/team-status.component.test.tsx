import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { SelfContext, TeamStatus } from '@workledger/contracts';
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

const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'employee@northstar.test', name: 'Maria Chen' },
  defaultPath: '/today',
  employee: { displayName: 'Maria Chen', employeeNumber: 'NS-021', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};

const TEAM_STATUS: TeamStatus = {
  asOf: '2026-08-14T10:30:45Z',
  localDate: '2026-08-14',
  members: [
    {
      availability: 'WORKING',
      displayName: 'Ari Working',
      hasUnresolvedRecords: true,
      teamName: 'Delivery',
    },
    {
      availability: 'ON_BREAK',
      displayName: 'Bea Break',
      hasUnresolvedRecords: false,
      teamName: 'Delivery',
    },
    {
      availability: 'UNAVAILABLE',
      displayName: 'Cleo Away',
      hasUnresolvedRecords: true,
      teamName: null,
    },
    {
      availability: 'OFF_WORK',
      displayName: 'Dara Finished',
      hasUnresolvedRecords: false,
      teamName: 'Operations',
    },
  ],
  summary: {
    offWork: 1,
    onBreak: 1,
    total: 4,
    unavailable: 1,
    unresolved: 2,
    working: 1,
  },
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('renders an accessible, privacy-safe current direct-report table', async () => {
  const requestState = stubFetch(MANAGER_CONTEXT, () => successResponse(TEAM_STATUS));
  const { container } = renderApplication('/team');

  const heading = await screen.findByRole('heading', { name: 'Team status' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Team | WorkLedger');
  expect(screen.getByText(/As of 12:30 PM on Friday, August 14, 2026/u)).toBeVisible();
  const summary = screen.getByLabelText('Team status totals');
  expect(summary).toHaveAccessibleName('Team status totals');

  const table = screen.getByRole('table', {
    name: 'Privacy-safe current status for authorized direct reports.',
  });
  expect(
    within(table).getByRole('row', { name: /Ari Working Delivery Working Unresolved record/u }),
  ).toBeVisible();
  expect(within(table).getByRole('row', { name: /Bea Break Delivery On break/u })).toBeVisible();
  expect(
    within(table).getByRole('row', { name: /Cleo Away No current team Unavailable today/u }),
  ).toBeVisible();
  expect(
    within(table).getByRole('row', { name: /Dara Finished Operations Not working/u }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open approval inbox' })).toHaveAttribute(
    'href',
    '/approvals',
  );
  expect(
    screen.queryByText(/\b(sickness|vacation|private correction)\b/iu),
  ).not.toBeInTheDocument();
  expect(requestState.teamRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('shows a clear empty state without inventing team records', async () => {
  stubFetch(MANAGER_CONTEXT, () =>
    successResponse({
      ...TEAM_STATUS,
      members: [],
      summary: {
        offWork: 0,
        onBreak: 0,
        total: 0,
        unavailable: 0,
        unresolved: 0,
        working: 0,
      },
    } satisfies TeamStatus),
  );
  renderApplication('/team');

  expect(await screen.findByText('You have no current direct reports to show.')).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Open approval inbox' })).not.toBeInTheDocument();
});

test('recovers from a dependency error', async () => {
  let attempts = 0;
  stubFetch(MANAGER_CONTEXT, () => {
    attempts += 1;
    return attempts <= 2
      ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
      : successResponse(TEAM_STATUS);
  });
  renderApplication('/team');
  const user = userEvent.setup();

  expect(await screen.findByRole('heading', { name: 'Team status is unavailable' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('table')).toBeVisible();
  expect(attempts).toBe(3);
});

test('does not request or disclose team data to an employee-only route', async () => {
  let teamRequested = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (url.pathname === '/v1/team/status') teamRequested = true;
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  renderApplication('/team');
  expect(await screen.findByRole('heading', { name: 'Permission denied' })).toBeVisible();
  expect(teamRequested).toBe(false);
  expect(screen.queryByText('Ari Working')).not.toBeInTheDocument();
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `team-component-test-${(routerSequence += 1).toString()}`,
        pathname: initialEntry,
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

function stubFetch(context: SelfContext, teamResponse: () => Response) {
  let teamRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(context);
      if (url.pathname === '/v1/team/status') {
        teamRequests += 1;
        return teamResponse();
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  return {
    get teamRequests() {
      return teamRequests;
    },
  };
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}

function apiErrorResponse(code: string, status: number): Response {
  return Response.json(
    { error: { code, message: 'The request could not be completed.', requestId: REQUEST_ID } },
    { status },
  );
}

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test');
  if (input instanceof URL) return input;
  return new URL(input.url);
}
