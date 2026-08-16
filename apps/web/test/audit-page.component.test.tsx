import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { DomainAuditPage, SelfContext } from '@workledger/contracts';
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
const PAGE: DomainAuditPage = {
  items: [
    {
      action: 'HOLIDAY_CREATED',
      actor: { kind: 'ACCOUNT', role: 'HR_ADMINISTRATOR' },
      facts: { effectiveDate: '2026-09-21', sourceCount: 4 },
      id: 'audit-1',
      occurredAt: '2026-08-16T10:00:00Z',
      outcome: 'SUCCESS',
      privileged: true,
      reasonCode: null,
      targetKind: 'CONFIGURATION',
      targetReference: 'holiday-1',
    },
  ],
  pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('owns filters in the URL and reveals only redacted audit detail', async () => {
  const requests: URL[] = [];
  stubFetch(requests);
  const user = userEvent.setup();
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: ['/audit'],
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('HOLIDAY_CREATED')).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Outcome'), 'SUCCESS');
  expect(router.state.location.search).toContain('outcome=SUCCESS');
  expect(await screen.findByText('1 events found.')).toBeVisible();
  await user.click(screen.getByText('View redacted detail'));
  const detail = screen.getByText('View redacted detail').closest('details');
  if (detail === null) throw new Error('Expected redacted audit detail.');
  expect(within(detail).getByText('Hr administrator')).toBeVisible();
  expect(within(detail).getByText('holiday-1')).toBeVisible();
  expect(container).not.toHaveTextContent('account-secret-id');
  expect(requests.some((url) => url.searchParams.get('outcome') === 'SUCCESS')).toBe(true);
  await expectNoAxeViolations(container);
});

function stubFetch(requests: URL[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'https://app.test',
      );
      if (url.pathname === '/v1/me/context') return success(CONTEXT);
      if (url.pathname === '/v1/hr/domain-audit') {
        requests.push(url);
        return success(PAGE);
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
}

function success(data: unknown) {
  return new Response(
    JSON.stringify({ data, meta: { requestId: '123e4567-e89b-42d3-a456-426614174000' } }),
    { headers: { 'content-type': 'application/json' }, status: 200 },
  );
}
