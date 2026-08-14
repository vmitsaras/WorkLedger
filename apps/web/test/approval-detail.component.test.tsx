import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { ApprovalDetail, SelfContext } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const APPROVAL_ID = '123e4567-e89b-42d3-a456-426614174701';
const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174702';
const HR_CONTEXT: SelfContext = {
  account: { email: 'hr@northstar.test', name: 'Alex Morgan' },
  defaultPath: '/employees',
  employee: null,
  navigationAreas: ['HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['HR_ADMINISTRATOR'],
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('requires a reason and explicit HR override before approving a negative absence balance', async () => {
  let decided = false;
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = init?.method ?? 'GET';
      requests.push({
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
        method,
        path: url.pathname,
      });
      if (url.pathname === '/v1/me/context') return successResponse(HR_CONTEXT);
      if (url.pathname === '/v1/me/csrf')
        return successResponse({ token: 'csrf-token-for-approval-tests-2026' });
      if (url.pathname === `/v1/approvals/${APPROVAL_ID}` && method === 'GET') {
        return successResponse(absenceDetail(decided));
      }
      if (url.pathname === `/v1/approvals/${APPROVAL_ID}/decision` && method === 'POST') {
        decided = true;
        return successResponse({
          id: APPROVAL_ID,
          kind: 'ABSENCE',
          status: 'APPROVED',
          version: 2,
        });
      }
      throw new Error(`Unexpected test request: ${method} ${url.pathname}`);
    }),
  );
  const { container } = renderApplication();
  const user = userEvent.setup();

  const heading = await screen.findByRole('heading', { name: 'Review absence request' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText(/projected remaining −2h 00m/u)).toBeVisible();
  expect(screen.getByRole('region', { name: 'Absence coverage' })).toHaveAttribute('tabindex', '0');

  await user.click(screen.getByRole('button', { name: 'Approve' }));
  let alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Enter at least 10 characters');
  await waitFor(() => expect(alert).toHaveFocus());
  const reason = screen.getByRole('textbox', { name: 'Decision reason' });
  expect(reason).toHaveAttribute('aria-invalid', 'true');
  expect(reason).toHaveAttribute(
    'aria-describedby',
    'approval-decision-reason-help approval-decision-reason-error',
  );
  expect(
    screen.getByText('Enter at least 10 characters explaining the decision.', { selector: 'p' }),
  ).toHaveAttribute('id', 'approval-decision-reason-error');
  expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(0);

  await user.type(reason, 'Approved after reviewing the exceptional leave circumstances.');
  expect(reason).not.toHaveAttribute('aria-invalid');
  expect(reason).toHaveAttribute('aria-describedby', 'approval-decision-reason-help');
  expect(screen.queryByText('Enter at least 10 characters explaining the decision.')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Approve' }));
  alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('Confirm the negative-balance override');
  expect(requests.filter(({ method }) => method === 'POST')).toHaveLength(0);

  await user.click(
    screen.getByRole('checkbox', { name: /Approve with a negative-balance override/u }),
  );
  await user.click(screen.getByRole('button', { name: 'Approve' }));

  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent('Approve recorded. The approval is now approved.');
  await waitFor(() => expect(status).toHaveFocus());
  expect(requests.find(({ method }) => method === 'POST')?.body).toEqual({
    action: 'APPROVE',
    expectedVersion: 1,
    negativeBalanceOverride: true,
    reason: 'Approved after reviewing the exceptional leave circumstances.',
  });
  expect(
    await screen.findByText('This approval has no action available in its current state.'),
  ).toBeVisible();
  await expectNoAxeViolations(container);
});

test('acknowledges a sickness report without requiring or transmitting a reason', async () => {
  let postedBody: unknown;
  let acknowledged = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = init?.method ?? 'GET';
      if (url.pathname === '/v1/me/context') return successResponse(HR_CONTEXT);
      if (url.pathname === '/v1/me/csrf')
        return successResponse({ token: 'csrf-token-for-approval-tests-2026' });
      if (url.pathname === `/v1/approvals/${APPROVAL_ID}` && method === 'GET') {
        return successResponse(sicknessDetail(acknowledged));
      }
      if (url.pathname === `/v1/approvals/${APPROVAL_ID}/decision` && method === 'POST') {
        postedBody = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
        acknowledged = true;
        return successResponse({
          id: APPROVAL_ID,
          kind: 'ABSENCE',
          status: 'ACKNOWLEDGED',
          version: 2,
        });
      }
      throw new Error(`Unexpected test request: ${method} ${url.pathname}`);
    }),
  );
  renderApplication();
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: 'Acknowledge report' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Acknowledge report recorded. The approval is now acknowledged.',
  );
  expect(postedBody).toEqual({
    action: 'ACKNOWLEDGE',
    expectedVersion: 1,
    negativeBalanceOverride: false,
  });
});

test('labels locked correction approval as an immediate post-lock adjustment', async () => {
  let applied = false;
  let postedBody: unknown;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      const method = init?.method ?? 'GET';
      if (url.pathname === '/v1/me/context') return successResponse(HR_CONTEXT);
      if (url.pathname === '/v1/me/csrf') {
        return successResponse({ token: 'csrf-token-for-approval-tests-2026' });
      }
      if (url.pathname === `/v1/approvals/${APPROVAL_ID}` && method === 'GET') {
        return successResponse(correctionDetail(applied));
      }
      if (url.pathname === `/v1/approvals/${APPROVAL_ID}/decision` && method === 'POST') {
        postedBody = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
        applied = true;
        return successResponse({
          id: APPROVAL_ID,
          kind: 'CORRECTION',
          status: 'APPROVED',
          version: 2,
        });
      }
      throw new Error(`Unexpected test request: ${method} ${url.pathname}`);
    }),
  );
  const { container } = renderApplication();
  const user = userEvent.setup();

  expect(
    await screen.findByText(
      /Locked-period adjustment. Approval appends an adjustment immediately/u,
    ),
  ).toBeVisible();
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Review correction request' })).toHaveFocus(),
  );
  const reason = screen.getByRole('textbox', { name: 'Decision reason' });
  await user.clear(reason);
  await user.type(reason, 'The correction matches the submitted evidence.');
  expect(reason).toHaveValue('The correction matches the submitted evidence.');
  await user.click(screen.getByRole('button', { name: 'Approve correction' }));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await waitFor(() => expect(postedBody).toBeDefined());
  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent(/post-lock adjustment was appended/u);
  await waitFor(() => expect(status).toHaveFocus());
  expect(postedBody).toEqual({
    action: 'APPROVE',
    expectedVersion: 1,
    negativeBalanceOverride: false,
    reason: 'The correction matches the submitted evidence.',
  });
  expect(
    await screen.findByText('This approval has no action available in its current state.'),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Apply correction' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

function renderApplication() {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [`/approvals/${APPROVAL_ID}`],
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient, router };
}

function absenceDetail(decided: boolean): ApprovalDetail {
  return {
    absenceTypeName: 'Vacation',
    affectedEndDate: '2026-08-20',
    affectedStartDate: '2026-08-20',
    availableActions: decided ? [] : ['APPROVE', 'REQUEST_CHANGES', 'REJECT'],
    availableEntitlementMinutes: 360,
    canOverrideNegativeBalance: true,
    coverage: [
      {
        endsAtMinute: null,
        kind: 'FULL_DAY',
        localDate: '2026-08-20',
        minutes: 480,
        startsAtMinute: null,
      },
    ],
    employeeDisplayName: 'Maria Chen',
    id: APPROVAL_ID,
    kind: 'ABSENCE',
    projectedRemainingMinutes: -120,
    requestedEntitlementMinutes: 480,
    status: decided ? 'APPROVED' : 'SUBMITTED',
    submittedAt: '2026-08-14T09:00:00Z',
    version: decided ? 2 : 1,
    workflow: 'APPROVAL_REQUIRED',
  };
}

function sicknessDetail(acknowledged: boolean): ApprovalDetail {
  return {
    absenceTypeName: 'Sickness',
    affectedEndDate: '2026-08-14',
    affectedStartDate: '2026-08-14',
    availableActions: acknowledged ? [] : ['ACKNOWLEDGE', 'REQUEST_CHANGES'],
    availableEntitlementMinutes: null,
    canOverrideNegativeBalance: true,
    coverage: [
      {
        endsAtMinute: null,
        kind: 'FULL_DAY',
        localDate: '2026-08-14',
        minutes: 480,
        startsAtMinute: null,
      },
    ],
    employeeDisplayName: 'Maria Chen',
    id: APPROVAL_ID,
    kind: 'ABSENCE',
    projectedRemainingMinutes: null,
    requestedEntitlementMinutes: null,
    status: acknowledged ? 'ACKNOWLEDGED' : 'REPORTED',
    submittedAt: '2026-08-14T09:00:00Z',
    version: acknowledged ? 2 : 1,
    workflow: 'REPORT_AND_ACKNOWLEDGE',
  };
}

function correctionDetail(applied: boolean): ApprovalDetail {
  return {
    affectedEndDate: '2026-06-30',
    affectedStartDate: '2026-06-30',
    applicationMode: 'POST_LOCK_ADJUSTMENT',
    availableActions: applied ? [] : ['APPROVE', 'REQUEST_CHANGES', 'REJECT'],
    employeeDisplayName: 'Maria Chen',
    events: [],
    id: APPROVAL_ID,
    kind: 'CORRECTION',
    originalCalculation: {
      balanceMinutes: 15,
      breakMinutes: 0,
      creditedMinutes: 495,
      expectedMinutes: 480,
      workedMinutes: 495,
    },
    proposedEndsAt: '2026-06-30T15:28:00Z',
    proposedStartsAt: '2026-06-30T07:00:00Z',
    requestReason: 'The locked record omitted thirteen minutes of accepted work.',
    status: applied ? 'APPLIED' : 'SUBMITTED',
    submittedAt: '2026-08-14T09:00:00Z',
    version: applied ? 2 : 1,
  };
}

function requestUrl(input: RequestInfo | URL): URL {
  if (input instanceof Request) return new URL(input.url);
  return new URL(input.toString(), 'https://workledger.test');
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify({ data, meta: { requestId: REQUEST_ID } }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}
