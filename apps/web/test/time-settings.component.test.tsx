import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { SelfContext, TimeSettingsAdminDetail } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const HR_CONTEXT: SelfContext = {
  account: { email: 'hr@example.test', name: 'HR Administrator' },
  defaultPath: '/today',
  employee: { displayName: 'HR Administrator', employeeNumber: 'HR-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE', 'HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE', 'HR_ADMINISTRATOR'],
};

const TIME_SETTINGS: TimeSettingsAdminDetail = {
  scheduleVersions: [
    {
      id: 'standard-v2',
      latestVersion: true,
      name: 'Standard week',
      scheduledMinutes: {
        FRIDAY: 360,
        MONDAY: 480,
        SATURDAY: 0,
        SUNDAY: 0,
        THURSDAY: 480,
        TUESDAY: 480,
        WEDNESDAY: 480,
      },
      version: 2,
      weeklyTotalMinutes: 2_280,
    },
    {
      id: 'standard-v1',
      latestVersion: false,
      name: 'Standard week',
      scheduledMinutes: {
        FRIDAY: 480,
        MONDAY: 480,
        SATURDAY: 0,
        SUNDAY: 0,
        THURSDAY: 480,
        TUESDAY: 480,
        WEDNESDAY: 480,
      },
      version: 1,
      weeklyTotalMinutes: 2_400,
    },
  ],
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('shows immutable schedule history and focuses the linked creation error summary', async () => {
  stubFetch();
  const user = userEvent.setup();
  const { container } = renderApplication();

  expect(await screen.findByRole('heading', { name: 'Time settings' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Standard week · version 2' })).toBeVisible();
  expect(screen.getByText(/Latest version · 38h 00m per week/iu)).toBeVisible();
  expect(screen.getByText(/Historical version · 40h 00m per week/iu)).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Create schedule version' }));
  const alert = screen.getByRole('alert');
  await waitFor(() => expect(alert).toHaveFocus());
  expect(within(alert).getByRole('link', { name: 'Enter a schedule name.' })).toHaveAttribute(
    'href',
    '#schedule-name',
  );
  await expectNoAxeViolations(container);
});

test('creates a new version without changing assignments', async () => {
  const requestBodies: unknown[] = [];
  stubFetch(requestBodies);
  const user = userEvent.setup();
  renderApplication();

  await user.type(await screen.findByLabelText('Schedule name'), 'Reduced Friday');
  await user.clear(screen.getByLabelText('Friday minutes'));
  await user.type(screen.getByLabelText('Friday minutes'), '360');
  await user.click(screen.getByRole('button', { name: 'Create schedule version' }));

  expect(await screen.findByRole('status')).toHaveTextContent(
    /Employee assignments are unchanged/iu,
  );
  expect(requestBodies).toEqual([
    {
      name: 'Reduced Friday',
      scheduledMinutes: {
        FRIDAY: 360,
        MONDAY: 480,
        SATURDAY: 0,
        SUNDAY: 0,
        THURSDAY: 480,
        TUESDAY: 480,
        WEDNESDAY: 480,
      },
    },
  ]);
});

function renderApplication() {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: ['/settings/time'],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function stubFetch(requestBodies: unknown[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined;
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'https://app.test',
      );
      if (url.pathname === '/v1/me/context') return successResponse(HR_CONTEXT);
      if (url.pathname === '/v1/me/csrf') {
        return successResponse({ token: 'csrf-token-with-at-least-thirty-two-characters' });
      }
      if (url.pathname === '/v1/hr/time-settings' && (init?.method ?? request?.method) !== 'POST') {
        return successResponse(TIME_SETTINGS);
      }
      if (url.pathname === '/v1/hr/time-settings/schedule-versions') {
        requestBodies.push(JSON.parse(String(init?.body ?? (await request?.text()))));
        return successResponse({
          action: 'SCHEDULE_VERSION_CREATED',
          occurredAt: '2026-08-14T10:00:00Z',
          targetId: 'reduced-friday-v1',
        });
      }
      throw new Error(`Unexpected request: ${url.pathname}${url.search}`);
    }),
  );
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ data, meta: { requestId: REQUEST_ID } }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}
