import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { EmployeeEntitlementAdminDetail } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { EmployeeEntitlementAdministration } from '../src/components/employee-entitlement-administration.js';

const DETAIL: EmployeeEntitlementAdminDetail = {
  accounts: [
    {
      absenceTypeId: 'vacation-v1',
      absenceTypeName: 'Vacation',
      availableMinutes: 480,
      projectedRemainingMinutes: 360,
      reservedMinutes: 120,
      entries: [
        {
          effectiveOn: '2026-08-14',
          entryType: 'MANUAL_ADJUSTMENT',
          id: 'entry-1',
          minutes: 480,
          postedAt: '2026-08-14T10:00:00Z',
          reason: 'Initial allocation.',
        },
      ],
    },
  ],
  adjustableAbsenceTypes: [
    {
      active: true,
      code: 'VACATION',
      id: 'vacation-v1',
      latestVersion: true,
      name: 'Vacation',
      policy: {
        allowedCoverageUnits: ['FULL_DAY'],
        availabilityState: 'UNAVAILABLE',
        entitlementAccountCategory: 'VACATION',
        maximumRetrospectiveCalendarDays: null,
        minimumLeadCalendarDays: 0,
        pendingReservationBehavior: 'RESERVE_PENDING',
        requestNoteMode: 'OPTIONAL',
        timeTreatment: 'CREDIT_COVERED_EXPECTATION',
        workflow: 'APPROVAL_REQUIRED',
      },
      validFrom: '2026-01-01',
      validTo: null,
      version: 1,
    },
  ],
  asOfLocalDate: '2026-08-14',
  privilegedActionsAllowed: true,
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('explains the ledger and submits a reasoned non-zero adjustment', async () => {
  const bodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const request = input instanceof Request ? input : undefined;
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'https://app.test',
      );
      if (url.pathname === '/v1/me/csrf')
        return success({ token: 'csrf-token-with-at-least-thirty-two-characters' });
      if (url.pathname.endsWith('/entitlement-adjustments')) {
        bodies.push(JSON.parse(String(init?.body ?? (await request?.text()))));
        return success({
          action: 'ENTITLEMENT_ADJUSTMENT_CREATED',
          occurredAt: '2026-08-14T10:00:00Z',
          targetId: 'entry-2',
        });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  const queryClient = createWorkLedgerQueryClient();
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <EmployeeEntitlementAdministration employeeId="employee-1" entitlement={DETAIL} />
    </QueryClientProvider>,
  );
  expect(screen.getByText('Reason: Initial allocation.')).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Entitlement account'), 'vacation-v1');
  await user.type(screen.getByLabelText('Adjustment minutes'), '-60');
  await user.type(screen.getByLabelText('Effective on'), '2026-08-15');
  await user.type(screen.getByLabelText('Reason'), 'Correct duplicate allocation.');
  await user.click(screen.getByRole('button', { name: 'Append entitlement adjustment' }));
  expect(await screen.findByRole('status')).toHaveTextContent(/appended to the ledger/iu);
  expect(bodies).toEqual([
    {
      absenceTypeId: 'vacation-v1',
      effectiveOn: '2026-08-15',
      minutes: -60,
      reason: 'Correct duplicate allocation.',
    },
  ]);
  await expectNoAxeViolations(container);
});

function success(data: unknown) {
  return new Response(
    JSON.stringify({ data, meta: { requestId: '123e4567-e89b-42d3-a456-426614174000' } }),
    { headers: { 'content-type': 'application/json' }, status: 200 },
  );
}
