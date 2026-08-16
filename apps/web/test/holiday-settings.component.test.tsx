import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { HolidaySettingsAdminDetail, SelfContext } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const CONTEXT: SelfContext = {
  account: { email: 'hr@example.test', name: 'HR Administrator' },
  defaultPath: '/today',
  employee: { displayName: 'HR Administrator', employeeNumber: 'HR-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE', 'HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE', 'HR_ADMINISTRATOR'],
};
const SETTINGS: HolidaySettingsAdminDetail = {
  asOfLocalDate: '2026-08-16',
  holidays: [{ holidayDate: '2026-12-25', id: 'holiday-1', name: 'Winter holiday' }],
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('requires an impact preview before creating a date-only holiday', async () => {
  const bodies: unknown[] = [];
  stubFetch(bodies);
  const user = userEvent.setup();
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: ['/settings/holidays'],
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Winter holiday')).toBeVisible();
  await user.type(screen.getByLabelText('Holiday name'), 'Founders day');
  await user.type(screen.getByLabelText('Holiday date'), '2026-09-21');
  await user.click(screen.getByRole('button', { name: 'Preview impact' }));
  expect(await screen.findByRole('status', { name: 'Calculation impact' })).toHaveTextContent(
    '12 scheduled employees and 4 existing daily projections',
  );
  await user.click(screen.getByRole('button', { name: 'Confirm and create' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Holiday created');
  expect(bodies).toEqual([
    { holidayDate: '2026-09-21', name: 'Founders day' },
    { holidayDate: '2026-09-21', impactAcknowledged: true, name: 'Founders day' },
  ]);
  await expectNoAxeViolations(container);
});

function stubFetch(bodies: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined;
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'https://app.test',
      );
      if (url.pathname === '/v1/me/context') return success(CONTEXT);
      if (url.pathname === '/v1/me/csrf')
        return success({ token: 'csrf-token-with-at-least-thirty-two-characters' });
      if (url.pathname === '/v1/hr/holiday-settings' && method(init, request) !== 'POST')
        return success(SETTINGS);
      if (url.pathname === '/v1/hr/holiday-settings/impact-preview') {
        bodies.push(JSON.parse(String(init?.body ?? (await request?.text()))));
        return success({
          affectedEmployeeCount: 12,
          affectedProjectionCount: 4,
          alreadyConfigured: false,
          blockedPeriodCount: 0,
          holidayDate: '2026-09-21',
          mutationAllowed: true,
        });
      }
      if (url.pathname === '/v1/hr/holiday-settings') {
        bodies.push(JSON.parse(String(init?.body ?? (await request?.text()))));
        return success({
          action: 'HOLIDAY_CREATED',
          occurredAt: '2026-08-16T10:00:00Z',
          targetId: 'holiday-2',
        });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
}

function method(init: RequestInit | undefined, request: Request | undefined) {
  return init?.method ?? request?.method;
}

function success(data: unknown) {
  return new Response(
    JSON.stringify({ data, meta: { requestId: '123e4567-e89b-42d3-a456-426614174000' } }),
    { headers: { 'content-type': 'application/json' }, status: 200 },
  );
}
