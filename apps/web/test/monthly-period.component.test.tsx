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
  vi.restoreAllMocks();
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
  expect(screen.getByText(/Printing refreshes current authorization first/u)).toHaveTextContent(
    'omits internal identifiers, sickness classification, notes, decision reasons, and reviewer comments',
  );
  expect(screen.queryByText('Private reason', { exact: true })).not.toBeInTheDocument();
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

test('requires warning acknowledgement and focuses the submitted state after success', async () => {
  const source = warningPeriod('a');
  let submittedBody: unknown;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (path === `/v1/monthly-periods/${PERIOD_ID}` && init?.method !== 'POST') {
        return successResponse(source);
      }
      if (path === `/v1/monthly-periods/${PERIOD_ID}/submit`) {
        submittedBody = JSON.parse(String(init?.body)) as unknown;
        return successResponse(submittedPeriod(source));
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication();

  const submitButton = await screen.findByRole('button', { name: 'Submit month' });
  expect(submitButton).toBeDisabled();
  expect(screen.getByText(/Review and acknowledge the current warnings/u)).toBeVisible();
  await user.click(
    screen.getByRole('checkbox', {
      name: /I reviewed all 1 warning in this monthly source version/u,
    }),
  );
  expect(submitButton).toBeEnabled();
  await user.click(submitButton);

  const submittedHeading = await screen.findByRole('heading', { name: 'Submitted' });
  await waitFor(() => expect(submittedHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Monthly period submitted for review.');
  expect(submittedBody).toEqual({
    acknowledgedSourceFingerprint: 'a'.repeat(64),
    expectedPeriodVersion: 1,
  });
  expect(screen.queryByRole('button', { name: 'Submit month' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('focuses a persistent error summary and invalidates acknowledgement when sources change', async () => {
  let reviewLoads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) {
        reviewLoads += 1;
        return successResponse(warningPeriod(reviewLoads === 1 ? 'a' : 'b'));
      }
      if (path === `/v1/monthly-periods/${PERIOD_ID}/submit`) {
        return submissionErrorResponse('PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED');
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  renderApplication();

  const acknowledgement = await screen.findByRole('checkbox', {
    name: /I reviewed all 1 warning in this monthly source version/u,
  });
  await user.click(acknowledgement);
  await user.click(screen.getByRole('button', { name: 'Submit month' }));

  const error = await screen.findByRole('alert');
  await waitFor(() => expect(error).toHaveFocus());
  expect(error).toHaveTextContent(/reviewed source changed/u);
  expect(acknowledgement).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Submit month' })).toBeDisabled();
  expect(reviewLoads).toBeGreaterThan(1);
});

test('does not expose the employee-only submission action to a reviewer', async () => {
  stubFetch({ ...readyPeriod(), availableActions: [] });
  renderApplication();

  expect(
    await screen.findByText('Only the employee who owns this monthly period can submit it.'),
  ).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Submit month' })).not.toBeInTheDocument();
});

test('requires a visible reviewer reason and preserves accessible no-effect validation', async () => {
  const submitted = reviewerPeriod();
  let reviewBody: unknown;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) return successResponse(submitted);
      if (path === `/v1/monthly-periods/${PERIOD_ID}/review`) {
        reviewBody = JSON.parse(String(init?.body)) as unknown;
        return successResponse({
          ...submitted,
          approvedRecord: null,
          availableActions: [],
          reviewHistory: [
            {
              action: 'REQUEST_CHANGES',
              actorAuthority: 'CURRENT_MANAGER',
              decidedAt: '2026-08-14T10:30:45Z',
              reason: 'Please correct the missing interval.',
              resultingStatus: 'CHANGES_REQUESTED',
              version: 3,
            },
          ],
          workflow: { ...submitted.workflow, periodVersion: 3, status: 'CHANGES_REQUESTED' },
        });
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  renderApplication();

  await user.type(await screen.findByLabelText('Reason for requesting changes'), 'short');
  await user.click(screen.getByRole('button', { name: 'Request changes' }));
  const validation = await screen.findByRole('alert');
  await waitFor(() => expect(validation).toHaveFocus());
  expect(validation).toHaveTextContent('Enter a reason of at least 10 characters.');
  expect(reviewBody).toBeUndefined();

  const reason = screen.getByLabelText('Reason for requesting changes');
  await user.clear(reason);
  await user.type(reason, 'Please correct the missing interval.');
  await user.click(screen.getByRole('button', { name: 'Request changes' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Changes requested' })).toHaveFocus(),
  );
  expect(reviewBody).toEqual({
    action: 'REQUEST_CHANGES',
    expectedPeriodVersion: 2,
    expectedSourceFingerprint: 'a'.repeat(64),
    reason: 'Please correct the missing interval.',
  });
  expect(screen.getByRole('status')).toHaveTextContent('Changes requested.');
  expect(screen.getByLabelText('Monthly reviewer history')).toHaveTextContent(
    'Please correct the missing interval.',
  );
});

test('approves, shows the immutable record, and requires permanent-lock confirmation', async () => {
  const submitted = reviewerPeriod();
  let current = submitted;
  let lockBody: unknown;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) return successResponse(current);
      if (path === `/v1/monthly-periods/${PERIOD_ID}/review`) {
        current = approvedPeriod(submitted);
        return successResponse(current);
      }
      if (path === `/v1/monthly-periods/${PERIOD_ID}/lock`) {
        lockBody = JSON.parse(String(init?.body)) as unknown;
        current = {
          ...current,
          availableActions: [],
          reviewHistory: [
            ...current.reviewHistory,
            {
              action: 'LOCK',
              actorAuthority: 'ORGANIZATION_HR',
              decidedAt: '2026-08-14T10:35:45Z',
              reason: null,
              resultingStatus: 'LOCKED',
              version: 4,
            },
          ],
          workflow: {
            ...current.workflow,
            lockedAt: '2026-08-14T10:35:45Z',
            periodVersion: 4,
            status: 'LOCKED',
          },
        };
        return successResponse(current);
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication();

  await user.click(await screen.findByRole('button', { name: 'Approve month' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Approved' })).toHaveFocus());
  expect(screen.getByRole('heading', { name: 'Approved record' })).toBeVisible();
  expect(screen.getByText(/Approval cycle 1/u)).toBeVisible();

  const lockTrigger = screen.getByRole('button', { name: 'Lock month' });
  await user.click(lockTrigger);
  expect(screen.getByRole('dialog', { name: 'Permanently lock this month?' })).toHaveTextContent(
    'There is no ordinary unlock',
  );
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(lockTrigger).toHaveFocus());
  expect(lockBody).toBeUndefined();

  await user.click(lockTrigger);
  await user.click(screen.getByRole('button', { name: 'Permanently lock month' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Locked' })).toHaveFocus());
  expect(lockBody).toEqual({
    expectedPeriodVersion: 3,
    expectedSnapshotFingerprint: 'b'.repeat(64),
    expectedSourceFingerprint: 'a'.repeat(64),
  });
  expect(screen.getByRole('status')).toHaveTextContent('Monthly period locked.');
  await expectNoAxeViolations(container);
});

test('separates the immutable approved baseline from an accessible adjusted view and reversal chain', async () => {
  stubFetch(adjustedLockedPeriod());
  const { container } = renderApplication();

  expect(await screen.findByRole('heading', { name: 'Current adjusted view' })).toBeVisible();
  expect(screen.getByText(/accepted post-lock adjustments/u)).toBeVisible();
  const reconciliation = screen.getByLabelText('Post-lock balance reconciliation');
  expect(reconciliation).toHaveTextContent('Original closing balance+10h 15m');
  expect(reconciliation).toHaveTextContent('Cumulative post-lock delta0h 00m');
  expect(reconciliation).toHaveTextContent('Adjusted closing balance+10h 15m');
  expect(reconciliation).toHaveTextContent('Current view version3');
  const region = screen.getByRole('region', { name: 'Scrollable post-lock adjustment history' });
  expect(region).toHaveAttribute('tabindex', '0');
  const table = within(region).getByRole('table', {
    name: 'Ordered post-lock corrections applied to the approved monthly baseline',
  });
  expect(within(table).getByText('Zero-delta evidence')).toBeVisible();
  expect(within(table).getByText('Reverses version 1')).toBeVisible();
  expect(screen.getByText(/closing posted balance \+10h 15m/u)).toBeVisible();
  expect(screen.getByLabelText('Monthly calculated totals')).toHaveTextContent('+0h 15m');
  await expectNoAxeViolations(container);
});

test('reauthorizes before opening a purpose-minimized monthly print view', async () => {
  const period = {
    ...adjustedLockedPeriod(),
    reviewHistory: [
      {
        action: 'REQUEST_CHANGES' as const,
        actorAuthority: 'CURRENT_MANAGER' as const,
        decidedAt: '2026-08-14T10:20:45Z',
        reason: 'Private reviewer reason that must not print.',
        resultingStatus: 'CHANGES_REQUESTED' as const,
        version: 2,
      },
    ],
  };
  const refreshedPeriod = { ...period, employeeDisplayName: 'Refreshed Employee' };
  let monthlyLoads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) {
        monthlyLoads += 1;
        return successResponse(monthlyLoads === 1 ? period : refreshedPeriod);
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
  let printedText = '';
  const print = vi.spyOn(window, 'print').mockImplementation(() => {
    printedText = document.querySelector('[data-print-monthly-record]')?.textContent ?? '';
  });
  const user = userEvent.setup();
  const { container } = renderApplication();

  const printButton = await screen.findByRole('button', { name: 'Print monthly record' });
  expect(screen.getByText(/Printing refreshes current authorization first/u)).toBeVisible();
  await user.click(printButton);

  await waitFor(() => expect(print).toHaveBeenCalledOnce());
  expect(monthlyLoads).toBeGreaterThanOrEqual(2);
  expect(printedText).toContain('Refreshed Employee');
  expect(screen.getByRole('status', { name: 'Monthly print status' })).toHaveTextContent(
    'refreshed purpose-minimized monthly record',
  );
  const printView = container.querySelector<HTMLElement>('[data-print-monthly-record]');
  expect(printView).not.toBeNull();
  expect(printView).toHaveClass('wl-print-only');
  expect(printView).toHaveTextContent('Monthly record');
  expect(printView).toHaveTextContent('Approved record');
  expect(printView).toHaveTextContent('Current adjusted record');
  expect(printView).not.toHaveTextContent('Private reviewer reason that must not print.');
  expect(printView).not.toHaveTextContent(period.snapshotVersion.sourceFingerprint);
  expect(printView).not.toHaveTextContent(FIRST_RECORD_ID);
  expect(printView).not.toHaveTextContent('60000000-0000-7000-8000-000000000001');
});

test('keeps the print dialog closed when monthly scope is lost during refresh', async () => {
  let monthlyLoads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === `/v1/monthly-periods/${PERIOD_ID}`) {
        monthlyLoads += 1;
        if (monthlyLoads === 1) return successResponse(readyPeriod());
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
  const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
  const user = userEvent.setup();
  renderApplication();

  await user.click(await screen.findByRole('button', { name: 'Print monthly record' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your current role or reporting scope cannot view this monthly period.',
  );
  expect(monthlyLoads).toBe(2);
  expect(print).not.toHaveBeenCalled();
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
    approvedRecord: null,
    availableActions: ['SUBMIT'],
    attention: { blockers: [], warnings: [] },
    employeeDisplayName: 'Monthly Employee',
    id: PERIOD_ID,
    monthEnd: '2026-06-30',
    monthStart: '2026-06-01',
    postLockView: null,
    readiness: {
      completeDateCount: 1,
      coveredDateCount: 1,
      monthEnded: true,
      status: 'READY_FOR_SUBMISSION',
    },
    reviewHistory: [],
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
    availableActions: [],
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

function warningPeriod(fingerprintCharacter: string): MonthlyPeriod {
  return {
    ...readyPeriod(),
    attention: {
      blockers: [],
      warnings: [{ code: 'WORK_ON_HOLIDAY', localDate: '2026-06-30', recordId: FIRST_RECORD_ID }],
    },
    snapshotVersion: {
      schemaVersion: 1,
      sourceFingerprint: fingerprintCharacter.repeat(64),
    },
  };
}

function submittedPeriod(period: MonthlyPeriod): MonthlyPeriod {
  return {
    ...period,
    availableActions: [],
    readiness: { ...period.readiness, status: null },
    workflow: {
      ...period.workflow,
      periodVersion: period.workflow.periodVersion + 1,
      status: 'SUBMITTED',
      submittedAt: '2026-08-14T10:30:45Z',
    },
  };
}

function reviewerPeriod(): MonthlyPeriod {
  return {
    ...readyPeriod(),
    availableActions: ['REQUEST_CHANGES', 'APPROVE'],
    readiness: { ...readyPeriod().readiness, status: null },
    workflow: {
      ...readyPeriod().workflow,
      periodVersion: 2,
      status: 'SUBMITTED',
      submittedAt: '2026-08-14T10:25:45Z',
    },
  };
}

function approvedPeriod(period: MonthlyPeriod): MonthlyPeriod {
  return {
    ...period,
    approvedRecord: {
      approvalCycle: 1,
      approvedAt: '2026-08-14T10:30:45Z',
      calculationEngineVersion: 'engine-v1',
      periodVersion: 3,
      rows: period.rows,
      schemaVersion: 1,
      snapshotFingerprint: 'b'.repeat(64),
      sourceFingerprint: period.snapshotVersion.sourceFingerprint,
      totals: period.totals,
    },
    availableActions: ['REQUEST_CHANGES', 'LOCK'],
    reviewHistory: [
      {
        action: 'APPROVE',
        actorAuthority: 'CURRENT_MANAGER',
        decidedAt: '2026-08-14T10:30:45Z',
        reason: null,
        resultingStatus: 'APPROVED',
        version: 3,
      },
    ],
    workflow: {
      ...period.workflow,
      approvedAt: '2026-08-14T10:30:45Z',
      periodVersion: 3,
      status: 'APPROVED',
    },
  };
}

function adjustedLockedPeriod(): MonthlyPeriod {
  const baseline = approvedPeriod(reviewerPeriod());
  return {
    ...baseline,
    availableActions: [],
    postLockView: {
      adjustedClosingBalanceMinutes: 615,
      adjustments: [
        {
          adjustmentVersion: 1,
          createdAt: '2026-08-14T10:40:45Z',
          id: '60000000-0000-7000-8000-000000000001',
          localDate: '2026-06-30',
          minutes: 13,
          previousAdjustedWorkedMinutes: 495,
          proposedWorkedMinutes: 508,
          reversesAdjustmentId: null,
          sourceRequestId: '61000000-0000-7000-8000-000000000001',
        },
        {
          adjustmentVersion: 2,
          createdAt: '2026-08-14T10:41:45Z',
          id: '60000000-0000-7000-8000-000000000002',
          localDate: '2026-06-30',
          minutes: 0,
          previousAdjustedWorkedMinutes: 508,
          proposedWorkedMinutes: 508,
          reversesAdjustmentId: null,
          sourceRequestId: '61000000-0000-7000-8000-000000000002',
        },
        {
          adjustmentVersion: 3,
          createdAt: '2026-08-14T10:42:45Z',
          id: '60000000-0000-7000-8000-000000000003',
          localDate: '2026-06-30',
          minutes: -13,
          previousAdjustedWorkedMinutes: 508,
          proposedWorkedMinutes: 495,
          reversesAdjustmentId: '60000000-0000-7000-8000-000000000001',
          sourceRequestId: '61000000-0000-7000-8000-000000000003',
        },
      ],
      cumulativeDeltaMinutes: 0,
      currentViewVersion: 3,
      originalClosingBalanceMinutes: 615,
      status: 'ADJUSTED_AFTER_LOCK',
    },
    workflow: {
      ...baseline.workflow,
      lockedAt: '2026-08-14T10:35:45Z',
      periodVersion: 4,
      status: 'LOCKED',
    },
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

function submissionErrorResponse(code: 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED') {
  return new Response(
    JSON.stringify({
      error: {
        code,
        context: { periodVersion: 1, sourceChanged: true },
        message: 'The request could not be completed.',
        requestId: REQUEST_ID,
      },
      meta: { idempotentReplay: false },
    }),
    { headers: { 'content-type': 'application/json' }, status: 409 },
  );
}

function requestUrl(input: RequestInfo | URL) {
  return new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    window.location.href,
  );
}
