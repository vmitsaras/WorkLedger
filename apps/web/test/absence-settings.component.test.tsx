import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { AbsenceSettingsAdminDetail, SelfContext } from '@workledger/contracts';
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
const SETTINGS: AbsenceSettingsAdminDetail = {
  asOfLocalDate: '2026-08-14',
  versions: [
    {
      active: true,
      code: 'VACATION',
      id: 'vacation-v1',
      latestVersion: true,
      name: 'Vacation',
      policy: {
        allowedCoverageUnits: ['FULL_DAY', 'HALF_DAY', 'MINUTES'],
        availabilityState: 'UNAVAILABLE',
        entitlementAccountCategory: 'VACATION',
        maximumRetrospectiveCalendarDays: null,
        minimumLeadCalendarDays: 0,
        pendingReservationBehavior: 'RESERVE_PENDING',
        requestNoteMode: 'OPTIONAL',
        timeTreatment: 'CREDIT_COVERED_EXPECTATION',
        workflow: 'APPROVAL_REQUIRED',
      },
      validFrom: '2025-01-01',
      validTo: null,
      version: 1,
    },
  ],
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('shows immutable versions and creates a sickness-safe bounded version', async () => {
  const bodies: unknown[] = [];
  stubFetch(bodies);
  const user = userEvent.setup();
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: ['/settings/absence'],
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'Vacation · version 1' })).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Type code'), 'SICKNESS');
  await user.type(screen.getByLabelText('Display name'), 'Sickness');
  await user.type(screen.getByLabelText('Effective from'), '2026-09-01');
  expect(screen.getByLabelText('Workflow')).toHaveValue('REPORT_AND_ACKNOWLEDGE');
  expect(screen.getByLabelText('Request note')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Create absence-type version' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    /Existing requests retain their captured version/iu,
  );
  expect(bodies).toContainEqual(
    expect.objectContaining({
      code: 'SICKNESS',
      effectiveFrom: '2026-09-01',
      policy: expect.objectContaining({
        entitlementAccountCategory: null,
        requestNoteMode: 'DISABLED',
        workflow: 'REPORT_AND_ACKNOWLEDGE',
      }),
    }),
  );
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
      if (
        url.pathname === '/v1/hr/absence-settings' &&
        (init?.method ?? request?.method) !== 'POST'
      )
        return success(SETTINGS);
      if (url.pathname === '/v1/hr/absence-settings/versions') {
        bodies.push(JSON.parse(String(init?.body ?? (await request?.text()))));
        return success({
          action: 'ABSENCE_TYPE_VERSION_CREATED',
          occurredAt: '2026-08-14T10:00:00Z',
          targetId: 'sickness-v2',
        });
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
