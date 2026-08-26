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
  locale: 'en-GB',
  employee: { displayName: 'Maja Novak', employeeNumber: 'NS-010', status: 'ACTIVE' },
  navigationAreas: ['MANAGER'],
  organization: { name: 'Northstar Studio' },
  roles: ['MANAGER'],
};

const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'employee@northstar.test', name: 'Maria Chen' },
  defaultPath: '/today',
  locale: 'en-GB',
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
      hasUnresolvedRecords: false,
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
    unresolved: 1,
    working: 1,
  },
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('renders an accessible, actionable, privacy-safe current direct-report table', async () => {
  const requestState = stubFetch(MANAGER_CONTEXT, () => successResponse(TEAM_STATUS));
  const { container } = renderApplication('/team');

  const heading = await screen.findByRole('heading', { name: 'Team status' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Team status | WorkLedger');
  expect(screen.getByText(/Friday, August 14, 2026, as of 12:30 PM/u)).toBeVisible();
  expect(screen.getByRole('status', { name: 'Team refresh status' })).toHaveTextContent(
    'Status current for 4 direct reports.',
  );
  expect(screen.getByRole('button', { name: 'All direct reports: 4' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Working now: 1' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(screen.getByRole('button', { name: 'People with open records: 1' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  const table = screen.getByRole('table', {
    name: 'Current availability, open record state, and next steps for direct reports.',
  });
  expect(
    within(table).getByRole('row', { name: /Ari Working Delivery Working now Open records/u }),
  ).toBeVisible();
  expect(within(table).getByRole('row', { name: /Bea Break Delivery On break/u })).toBeVisible();
  expect(
    within(table).getByRole('row', { name: /Cleo Away No current team Unavailable today/u }),
  ).toBeVisible();
  expect(
    within(table).getByRole('row', { name: /Dara Finished Operations Not working now/u }),
  ).toBeVisible();
  expect(
    within(table).getByRole('link', {
      name: 'Open approval inbox to find open records for Ari Working',
    }),
  ).toHaveAttribute('href', '/approvals?status=ALL&sort=EMPLOYEE&direction=ASC');
  expect(
    within(table).getByRole('link', { name: 'View team calendar for Cleo Away' }),
  ).toHaveAttribute('href', '/team-calendar?month=2026-08');
  const teamNavigation = screen.getByRole('navigation', { name: 'Team navigation' });
  expect(within(teamNavigation).getByRole('link', { name: 'Team status' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(within(teamNavigation).getByRole('link', { name: 'Approval inbox' })).toHaveAttribute(
    'href',
    '/approvals',
  );
  expect(
    screen.queryByText(/\b(sickness|vacation|private correction)\b/iu),
  ).not.toBeInTheDocument();
  expect(requestState.teamRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('keeps generic overview filters in the URL, combines them, and restores focus', async () => {
  stubFetch(MANAGER_CONTEXT, () => successResponse(TEAM_STATUS));
  const { container, router } = renderApplication('/team');
  const user = userEvent.setup();

  const working = await screen.findByRole('button', { name: 'Working now: 1' });
  await user.click(working);
  await waitFor(() => expect(router.state.location.search).toBe('?availability=WORKING'));
  expect(working).toHaveFocus();
  await waitFor(() => expect(working).toHaveAttribute('aria-pressed', 'true'));
  const table = screen.getByRole('table');
  expect(within(table).getByText('Ari Working')).toBeVisible();
  expect(within(table).queryByText('Bea Break')).not.toBeInTheDocument();

  const openRecords = screen.getByRole('button', { name: 'People with open records: 1' });
  await user.click(openRecords);
  await waitFor(() =>
    expect(router.state.location.search).toBe('?availability=WORKING&records=OPEN'),
  );
  expect(openRecords).toHaveFocus();
  expect(
    await screen.findByText('Showing 1 of 4 direct reports: working now with open records.'),
  ).toBeVisible();

  const onBreak = screen.getByRole('button', { name: 'On break: 1' });
  await user.click(onBreak);
  await waitFor(() =>
    expect(router.state.location.search).toBe('?availability=ON_BREAK&records=OPEN'),
  );
  expect(onBreak).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'No team members match this view' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Show all direct reports' }));
  await waitFor(() => expect(router.state.location.search).toBe(''));
  expect(await screen.findByText('Ari Working')).toBeVisible();
  await expectNoAxeViolations(container);
});

test('uses complete team records instead of a horizontally panned table at narrow width', async () => {
  stubNarrowLayout();
  stubFetch(MANAGER_CONTEXT, () => successResponse(TEAM_STATUS));
  const { container } = renderApplication('/team');

  const list = await screen.findByRole('list', { name: 'Team status results' });
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  const ariHeading = within(list).getByRole('heading', { name: 'Ari Working' });
  const ariRecord = ariHeading.closest('article');
  expect(ariRecord).not.toBeNull();
  if (ariRecord === null) throw new Error('Expected Ari Working team record.');
  expect(within(ariRecord).getByText('Delivery')).toBeVisible();
  expect(within(ariRecord).getByText('Working now')).toBeVisible();
  expect(within(ariRecord).getByText('Open records')).toBeVisible();
  expect(
    within(ariRecord).getByRole('link', {
      name: 'Open approval inbox to find open records for Ari Working',
    }),
  ).toBeVisible();
  const cleoHeading = within(list).getByRole('heading', { name: 'Cleo Away' });
  const cleoRecord = cleoHeading.closest('article');
  expect(cleoRecord).not.toBeNull();
  if (cleoRecord === null) throw new Error('Expected Cleo Away team record.');
  expect(within(cleoRecord).getByText('No current team')).toBeVisible();
  expect(within(cleoRecord).getByText('Unavailable today')).toBeVisible();
  expect(
    within(cleoRecord).getByRole('link', { name: 'View team calendar for Cleo Away' }),
  ).toBeVisible();
  await expectNoAxeViolations(container);
});

test('rejects non-generic or unknown Team URL filters without disclosing data', async () => {
  const requestState = stubFetch(MANAGER_CONTEXT, () => successResponse(TEAM_STATUS));
  const { router } = renderApplication('/team?employee=Ari&availability=SICKNESS');

  expect(await screen.findByRole('heading', { name: 'Team status' })).toBeVisible();
  await waitFor(() => expect(router.state.location.pathname).toBe('/team'));
  expect(router.state.location.search).toBe('');
  expect(screen.queryByDisplayValue('Ari')).not.toBeInTheDocument();
  expect(screen.queryByText('SICKNESS')).not.toBeInTheDocument();
  expect(requestState.teamRequests).toBe(1);
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
  expect(screen.queryByRole('list', { name: 'Team status results' })).not.toBeInTheDocument();
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

  expect(await screen.findByRole('alert')).toContainElement(
    screen.getByRole('heading', { name: 'Team status is unavailable' }),
  );
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
  const initialUrl = new URL(initialEntry, 'https://workledger.test');
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `team-component-test-${(routerSequence += 1).toString()}`,
        pathname: initialUrl.pathname,
        search: initialUrl.search,
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
  return Response.json({ error: { code, requestId: REQUEST_ID } }, { status });
}

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test');
  if (input instanceof URL) return input;
  return new URL(input.url);
}

function stubNarrowLayout() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}
