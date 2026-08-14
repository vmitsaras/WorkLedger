import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { MonthlyPeriod, SelfContext } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const PERIOD_ID = '50000000-0000-7000-8000-000000000001';
const FIRST_RECORD_ID = '47000000-0000-7000-8000-000000000001';
const SECOND_RECORD_ID = '47000000-0000-7000-8000-000000000002';
const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'employee@northstar.test', name: 'Monthly Employee' },
  defaultPath: '/today',
  employee: { displayName: 'Monthly Employee', employeeNumber: 'NS-021', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('renders a ready monthly review with captioned totals and keyboard-scrollable daily rows', async () => {
  stubFetch(readyPeriod());
  const { container } = renderApplication();

  const heading = await screen.findByRole('heading', { name: 'Monthly period' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Monthly period | WorkLedger');
  expect(screen.getByText('Ready for submission')).toBeVisible();
  expect(screen.getByText(/Every covered date is complete, posted, and reconciled/u)).toBeVisible();
  expect(screen.getByLabelText('Monthly calculated totals')).toHaveTextContent(
    'Calculated balance',
  );
  expect(screen.getByLabelText('Monthly calculated totals')).toHaveTextContent('+0h 15m');

  const region = screen.getByRole('region', { name: 'Scrollable monthly daily review' });
  expect(region).toHaveAttribute('tabindex', '0');
  const table = within(region).getByRole('table', {
    name: /Per-date monthly calculation for .*June 1, 2026/u,
  });
  expect(within(table).getByRole('columnheader', { name: 'Absence credit' })).toBeVisible();
  expect(within(table).getByRole('row', { name: /June 30, 2026 Complete/u })).toBeVisible();
  expect(within(table).getByRole('link', { name: /June 30, 2026/u })).toHaveAttribute(
    'href',
    `/time-records/${FIRST_RECORD_ID}`,
  );
  expect(
    screen.getByText(/source fingerprint changes whenever the reviewed source set changes/u),
  ).toBeVisible();
  expect(screen.queryByText(/sickness|private reason|entitlement/iu)).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('labels missing/incomplete dates and links actionable blockers and warnings', async () => {
  stubFetch(incompletePeriod());
  renderApplication();

  expect(await screen.findByText('Not ready')).toBeVisible();
  const blocker = screen.getByText('Attendance is incomplete');
  expect(blocker).toBeVisible();
  expect(
    screen.getByRole('link', { name: /July 30, 2026 — review daily record/u }),
  ).toHaveAttribute('href', `/time-records/${FIRST_RECORD_ID}`);
  expect(screen.getByText('Absence approval pending')).toBeVisible();
  expect(screen.getByText('Work was recorded on a holiday')).toBeVisible();
  expect(
    screen.getByRole('link', { name: /July 31, 2026 — review daily record/u }),
  ).toHaveAttribute('href', `/time-records/${SECOND_RECORD_ID}`);
  const region = screen.getByRole('region', { name: 'Scrollable monthly daily review' });
  expect(
    within(region).getByRole('row', { name: /July 29, 2026 Missing daily result/u }),
  ).toBeVisible();
  expect(within(region).getByRole('row', { name: /July 30, 2026 Incomplete/u })).toHaveTextContent(
    '—',
  );
});

test('shows a purpose-safe permission denial without retrying or rendering monthly data', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) {
        return new Response(
          JSON.stringify({
            error: { code: 'ACCESS_DENIED', message: 'Access denied.', requestId: REQUEST_ID },
            meta: { idempotentReplay: false },
          }),
          { headers: { 'content-type': 'application/json' }, status: 403 },
        );
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  renderApplication();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your current role or reporting scope cannot view this monthly period.',
  );
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  expect(screen.queryByText('Monthly Employee ·')).not.toBeInTheDocument();
});

test('recovers from a dependency failure with an explicit retry', async () => {
  let attempts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) {
        attempts += 1;
        if (attempts <= 2) return apiErrorResponse();
        return successResponse(readyPeriod());
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  renderApplication();
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Ready for submission')).toBeVisible();
  expect(attempts).toBe(3);
});

function renderApplication() {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [`/monthly-periods/${PERIOD_ID}`],
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient, router };
}

function stubFetch(period: MonthlyPeriod) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) return successResponse(period);
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
}

function readyPeriod(): MonthlyPeriod {
  return {
    attention: { blockers: [], warnings: [] },
    employeeDisplayName: 'Monthly Employee',
    id: PERIOD_ID,
    monthEnd: '2026-06-30',
    monthStart: '2026-06-01',
    readiness: {
      completeDateCount: 1,
      coveredDateCount: 1,
      monthEnded: true,
      status: 'READY_FOR_SUBMISSION',
    },
    rows: [completeRow('2026-06-30', FIRST_RECORD_ID, 495, 15)],
    snapshotVersion: { schemaVersion: 1, sourceFingerprint: 'a'.repeat(64) },
    timeZone: 'Europe/Berlin',
    totals: {
      absenceCreditMinutes: 0,
      adjustmentMinutes: 0,
      balanceMinutes: 15,
      breakMinutes: 0,
      creditedMinutes: 495,
      expectedMinutes: 480,
      ledgerClosingBalanceMinutes: 615,
      ledgerOpeningBalanceMinutes: 600,
      ledgerPeriodDeltaMinutes: 15,
      workedMinutes: 495,
    },
    workflow: {
      approvedAt: null,
      lockedAt: null,
      periodVersion: 1,
      status: 'OPEN',
      submittedAt: null,
    },
  };
}

function incompletePeriod(): MonthlyPeriod {
  return {
    ...readyPeriod(),
    attention: {
      blockers: [
        { code: 'ABSENCE_APPROVAL_PENDING', localDate: '2026-07-29', recordId: null },
        { code: 'ATTENDANCE_INCOMPLETE', localDate: '2026-07-30', recordId: FIRST_RECORD_ID },
      ],
      warnings: [{ code: 'WORK_ON_HOLIDAY', localDate: '2026-07-31', recordId: SECOND_RECORD_ID }],
    },
    monthEnd: '2026-07-31',
    monthStart: '2026-07-01',
    readiness: {
      completeDateCount: 1,
      coveredDateCount: 3,
      monthEnded: true,
      status: 'INCOMPLETE',
    },
    rows: [
      emptyRow('2026-07-29', null, 'MISSING'),
      emptyRow('2026-07-30', FIRST_RECORD_ID, 'INCOMPLETE'),
      completeRow('2026-07-31', SECOND_RECORD_ID, 510, 30),
    ],
  };
}

function completeRow(localDate: string, recordId: string, worked: number, balance: number) {
  return {
    absenceCreditMinutes: 0,
    adjustmentMinutes: 0,
    balanceMinutes: balance,
    breakMinutes: 0,
    creditedMinutes: worked,
    expectedMinutes: 480,
    localDate,
    recordId,
    status: 'COMPLETE' as const,
    workedMinutes: worked,
  };
}

function emptyRow(localDate: string, recordId: string | null, status: 'INCOMPLETE' | 'MISSING') {
  return {
    absenceCreditMinutes: null,
    adjustmentMinutes: null,
    balanceMinutes: null,
    breakMinutes: null,
    creditedMinutes: null,
    expectedMinutes: null,
    localDate,
    recordId,
    status,
    workedMinutes: null,
  };
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ data, meta: { requestId: REQUEST_ID } }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

function apiErrorResponse() {
  return new Response(
    JSON.stringify({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Unavailable.', requestId: REQUEST_ID },
      meta: { idempotentReplay: false },
    }),
    { headers: { 'content-type': 'application/json' }, status: 503 },
  );
}

function requestUrl(input: RequestInfo | URL) {
  return new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    window.location.href,
  );
}
