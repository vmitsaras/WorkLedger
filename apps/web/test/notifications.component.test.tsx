import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { NotificationHistory, SelfContext } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const FIRST_NOTIFICATION_ID = '123e4567-e89b-42d3-a456-426614174601';
let routerSequence = 0;

const CONTEXT: SelfContext = {
  account: { email: 'employee@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};

const HISTORY: NotificationHistory = {
  items: [
    {
      body: 'An item you submitted needs changes.',
      deliveryStatus: 'FAILED',
      destinationPath: '/requests',
      dismissedAt: null,
      event: 'ITEM_CHANGES_REQUESTED',
      id: FIRST_NOTIFICATION_ID,
      occurredAt: '2026-08-14T09:30:00Z',
      status: 'ACTIVE',
      title: 'Changes requested',
    },
    {
      body: 'An item you submitted was approved.',
      deliveryStatus: 'DELIVERED',
      destinationPath: '/requests',
      dismissedAt: '2026-08-13T10:00:00Z',
      event: 'ITEM_APPROVED',
      id: '123e4567-e89b-42d3-a456-426614174602',
      occurredAt: '2026-08-13T09:30:00Z',
      status: 'DISMISSED',
      title: 'Item approved',
    },
  ],
  pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('renders and dismisses generic history without removing focus or private context', async () => {
  const requests = stubFetch(HISTORY);
  const user = userEvent.setup();
  const { container } = renderApplication('/notifications');

  const heading = await screen.findByRole('heading', { name: 'Notifications' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Notifications | WorkLedger');
  const history = screen.getByRole('list', { name: 'Generic notification history' });
  expect(within(history).getByText('Changes requested')).toBeVisible();
  expect(within(history).getByText('Delivery failed; in-app record unaffected')).toBeVisible();
  expect(within(history).getAllByRole('link', { name: 'Open requests' })[0]).toHaveAttribute(
    'href',
    '/requests',
  );
  expect(
    screen.queryByText(/sickness|vacation|diagnosis|private reason/iu),
  ).not.toBeInTheDocument();

  const dismiss = within(history).getByRole('button', { name: 'Dismiss notification' });
  dismiss.focus();
  await user.keyboard('{Enter}');
  await waitFor(() => expect(dismiss).toHaveTextContent('Dismissed'));
  expect(dismiss).toHaveFocus();
  expect(dismiss).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('status')).toHaveTextContent(
    'Notification dismissed. It remains in your history.',
  );
  expect(requests.dismissals).toEqual([FIRST_NOTIFICATION_ID]);
  expect(requests.csrfHeaders).toEqual(['notification-csrf-token-with-32-bytes']);
  await expectNoAxeViolations(container);
});

test('shows a clear empty notification history', async () => {
  stubFetch({
    ...HISTORY,
    items: [],
    pagination: { ...HISTORY.pagination, total: 0, totalPages: 0 },
  });
  const { container } = renderApplication('/notifications');

  expect(await screen.findByText('You have no notification history to show.')).toBeVisible();
  expect(screen.queryByRole('list', { name: 'Generic notification history' })).toBeNull();
  await expectNoAxeViolations(container);
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `notifications-component-test-${(routerSequence += 1).toString()}`,
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

function stubFetch(history: NotificationHistory) {
  const dismissals: string[] = [];
  const csrfHeaders: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(CONTEXT);
      if (url.pathname === '/v1/me/notifications') return successResponse(history);
      if (url.pathname === '/v1/me/csrf') {
        return successResponse({ token: 'notification-csrf-token-with-32-bytes' });
      }
      const match = /^\/v1\/me\/notifications\/([^/]+)\/dismiss$/u.exec(url.pathname);
      if (match?.[1] !== undefined) {
        dismissals.push(match[1]);
        const headers = input instanceof Request ? input.headers : new Headers(init?.headers);
        csrfHeaders.push(headers.get('x-workledger-csrf') ?? '');
        return successResponse({
          dismissedAt: '2026-08-14T10:00:00Z',
          id: match[1],
          status: 'DISMISSED',
        });
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  return { csrfHeaders, dismissals };
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof Request) return new URL(input.url);
  return new URL(input.toString(), 'https://workledger.test');
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}
