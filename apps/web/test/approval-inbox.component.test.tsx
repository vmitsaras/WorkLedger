import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { ApprovalInbox, SelfContext } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const TEAM_ID = '123e4567-e89b-42d3-a456-426614174500';
const CORRECTION_ID = '123e4567-e89b-42d3-a456-426614174501';
const ABSENCE_ID = '123e4567-e89b-42d3-a456-426614174502';
const CANCELLATION_ID = '123e4567-e89b-42d3-a456-426614174503';
let routerSequence = 0;

const MANAGER_CONTEXT: SelfContext = {
  account: { email: 'maja@northstar.test', name: 'Maja Novak' },
  defaultPath: '/profile',
  employee: { displayName: 'Maja Novak', employeeNumber: 'NS-010', status: 'ACTIVE' },
  navigationAreas: ['MANAGER'],
  organization: { name: 'Northstar Studio' },
  roles: ['MANAGER'],
};

const HR_CONTEXT: SelfContext = {
  account: { email: 'hr@northstar.test', name: 'Alex Morgan' },
  defaultPath: '/employees',
  employee: null,
  navigationAreas: ['HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['HR_ADMINISTRATOR'],
};

const INBOX_ITEMS: ApprovalInbox['items'] = [
  {
    affectedEndDate: '2026-08-12',
    affectedStartDate: '2026-08-12',
    employeeDisplayName: 'Maria Chen',
    id: CORRECTION_ID,
    kind: 'CORRECTION',
    status: 'ACTION_REQUIRED',
    submittedAt: '2026-08-11T09:30:00Z',
    team: { id: TEAM_ID, name: 'Client Services' },
    version: 2,
  },
  {
    affectedEndDate: '2026-08-20',
    affectedStartDate: '2026-08-18',
    employeeDisplayName: 'Noah Williams',
    id: ABSENCE_ID,
    kind: 'ABSENCE',
    status: 'WAITING_ON_EMPLOYEE',
    submittedAt: '2026-08-10T08:15:00Z',
    team: { id: TEAM_ID, name: 'Client Services' },
    version: 3,
  },
  {
    affectedEndDate: '2026-08-25',
    affectedStartDate: '2026-08-25',
    employeeDisplayName: 'Eva Schmidt',
    id: CANCELLATION_ID,
    kind: 'CANCELLATION',
    status: 'COMPLETED',
    submittedAt: '2026-08-09T14:00:00Z',
    version: 1,
  },
];

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('hydrates controls from the URL and renders a privacy-minimized, accessible manager inbox', async () => {
  const initialEntry =
    `/approvals?status=ALL&type=ALL&team=${TEAM_ID}` +
    '&from=2026-08-01&to=2026-08-31&sort=EMPLOYEE&direction=ASC&page=2&limit=10';
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: () => successResponse(inbox({ items: INBOX_ITEMS, limit: 10, page: 2, total: 11 })),
  });
  const { container } = renderApplication(initialEntry);

  const heading = await screen.findByRole('heading', { name: 'Approval inbox' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Approvals | WorkLedger');
  expect(screen.getByRole('combobox', { name: 'Queue status' })).toHaveValue('ALL');
  expect(screen.getByRole('combobox', { name: 'Workflow category' })).toHaveValue('ALL');
  expect(screen.getByRole('combobox', { name: 'Current team' })).toHaveValue(TEAM_ID);
  expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('EMPLOYEE');
  expect(screen.getByRole('combobox', { name: 'Sort direction' })).toHaveValue('ASC');
  expect(screen.getByLabelText('Affected from')).toHaveValue('2026-08-01');
  expect(screen.getByLabelText('Affected through')).toHaveValue('2026-08-31');

  const table = screen.getByRole('table', { name: /Unified approval inbox/u });
  expect(within(table).getByRole('columnheader', { name: 'Employee' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  expect(within(table).getByRole('columnheader', { name: 'Submitted' })).not.toHaveAttribute(
    'aria-sort',
  );
  expect(within(table).getByText('Correction')).toBeVisible();
  expect(within(table).getByText('Absence request')).toBeVisible();
  expect(within(table).getByText('Absence cancellation')).toBeVisible();
  expect(within(table).getByText('Waiting on employee')).toBeVisible();
  expect(
    within(within(table).getByRole('row', { name: /Maria Chen/u })).getByRole('link', {
      name: 'Review correction for Maria Chen',
    }),
  ).toHaveAttribute('href', `/approvals/${CORRECTION_ID}`);
  expect(screen.queryByText(/sickness|vacation/iu)).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /employee|person/iu })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/absence (sub)?type/iu)).not.toBeInTheDocument();

  await waitFor(() => expect(approvalUrls).toHaveLength(1));
  expect(Object.fromEntries(approvalUrls[0]?.searchParams ?? [])).toEqual({
    direction: 'ASC',
    from: '2026-08-01',
    limit: '10',
    page: '2',
    sort: 'EMPLOYEE',
    status: 'ALL',
    team: TEAM_ID,
    to: '2026-08-31',
    type: 'ALL',
  });
  await expectNoAxeViolations(container);
});

test('applies broad filters through the URL, resets pagination, and retains filter focus', async () => {
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: (url) =>
      successResponse(
        inbox({
          items: INBOX_ITEMS,
          limit: Number(url.searchParams.get('limit')),
          page: Number(url.searchParams.get('page')),
          total: 30,
        }),
      ),
  });
  const { router } = renderApplication(
    '/approvals?status=ALL&type=ALL&sort=SUBMITTED_AT&direction=DESC&page=3&limit=10',
  );
  const user = userEvent.setup();

  await screen.findByRole('table', { name: /Unified approval inbox/u });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Queue status' }), [
    'WAITING_ON_EMPLOYEE',
  ]);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Workflow category' }), [
    'ABSENCE',
  ]);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Current team' }), [TEAM_ID]);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), ['AFFECTED_DATE']);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sort direction' }), ['ASC']);
  const affectedFrom = screen.getByLabelText('Affected from');
  const affectedThrough = screen.getByLabelText('Affected through');
  fireEvent.change(affectedFrom, { target: { value: '2026-08-14' } });
  const apply = screen.getByRole('button', { name: 'Apply filters' });
  await user.click(apply);

  const rangeError = screen.getByRole('alert');
  expect(rangeError).toHaveTextContent(
    'Enter both dates in order and keep the range within 366 calendar days.',
  );
  expect(affectedFrom).toHaveAttribute('aria-invalid', 'true');
  expect(affectedThrough).toHaveAttribute('aria-invalid', 'true');
  expect(affectedFrom).toHaveAttribute('aria-describedby', rangeError.id);
  expect(affectedThrough).toHaveAttribute('aria-describedby', rangeError.id);
  expect(new URLSearchParams(router.state.location.search).get('page')).toBe('3');
  expect(approvalUrls).toHaveLength(1);

  fireEvent.change(affectedThrough, {
    target: { value: '2026-08-21' },
  });
  await user.click(apply);

  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1'),
  );
  const applied = new URLSearchParams(router.state.location.search);
  expect(Object.fromEntries(applied)).toEqual({
    direction: 'ASC',
    from: '2026-08-14',
    limit: '10',
    page: '1',
    sort: 'AFFECTED_DATE',
    status: 'WAITING_ON_EMPLOYEE',
    team: TEAM_ID,
    to: '2026-08-21',
    type: 'ABSENCE',
  });
  await waitFor(() => expect(approvalUrls).toHaveLength(2));
  expect(Object.fromEntries(approvalUrls[1]?.searchParams ?? [])).toEqual(
    Object.fromEntries(applied),
  );
  expect(apply).toHaveFocus();
  expect(affectedFrom).not.toHaveAttribute('aria-invalid');
  expect(affectedThrough).not.toHaveAttribute('aria-invalid');
  expect(
    within(screen.getByRole('combobox', { name: 'Workflow category' })).getAllByRole('option'),
  ).toHaveLength(4);
  expect(
    within(screen.getByRole('combobox', { name: 'Workflow category' }))
      .getAllByRole('option')
      .map((option) => option.textContent),
  ).toEqual(['All categories', 'Correction', 'Absence request', 'Absence cancellation']);
});

test('keeps pagination focus on same-path navigation and restores it after browser back', async () => {
  const secondPage = deferred<Response>();
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: (url) => {
      const page = Number(url.searchParams.get('page'));
      return page === 2
        ? secondPage.promise
        : successResponse(
            inbox({
              items: [INBOX_ITEMS[0]].filter((item) => item !== undefined),
              limit: Number(url.searchParams.get('limit')),
              page,
              total: 41,
            }),
          );
    },
  });
  const { router } = renderApplication(
    '/approvals?status=ACTION_REQUIRED&type=ALL&sort=SUBMITTED_AT&direction=DESC&page=1&limit=20',
  );
  const user = userEvent.setup();

  const next = await screen.findByRole('button', { name: 'Next page' });
  await user.click(next);
  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('2'),
  );
  await waitFor(() => expect(approvalUrls).toHaveLength(2));
  expect(screen.getByText('Page 1 of 3')).toBeVisible();
  expect(screen.getByRole('status')).toHaveTextContent('Updating results…');
  expect(screen.getByRole('button', { name: 'Next page' })).toHaveFocus();

  await act(() => {
    secondPage.resolve(
      successResponse(
        inbox({
          items: [INBOX_ITEMS[0]].filter((item) => item !== undefined),
          limit: 20,
          page: 2,
          total: 41,
        }),
      ),
    );
  });
  expect(await screen.findByText('Page 2 of 3')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next page' })).toHaveFocus();

  await act(async () => {
    await router.navigate(-1);
  });

  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('page')).toBe('1'),
  );
  expect(screen.getByText('Page 1 of 3')).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next page' })).toHaveFocus());
});

test('shows loading, default-empty, and filtered-empty states with a working clear action', async () => {
  const firstResponse = deferred<Response>();
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: (_url, attempt) =>
      attempt === 1
        ? firstResponse.promise
        : successResponse(inbox({ items: [], limit: 20, page: 1, total: 0 })),
  });
  const { router } = renderApplication('/approvals');
  const user = userEvent.setup();

  await screen.findByRole('heading', { name: 'Approval inbox' });
  expect(screen.getByRole('progressbar', { name: 'Loading approval inbox' })).toBeVisible();
  firstResponse.resolve(successResponse(inbox({ items: [], limit: 20, page: 1, total: 0 })));
  expect(await screen.findByText('No approvals currently require your action.')).toBeVisible();

  await user.selectOptions(screen.getByRole('combobox', { name: 'Workflow category' }), [
    'ABSENCE',
  ]);
  await user.click(screen.getByRole('button', { name: 'Apply filters' }));
  const filteredMessage = await screen.findByText('No approvals match the applied filters.');
  const results = filteredMessage.closest('section');
  expect(results).not.toBeNull();
  if (results === null) throw new Error('Expected the filtered result section.');
  await user.click(within(results).getByRole('button', { name: 'Clear filters' }));

  await waitFor(() =>
    expect(new URLSearchParams(router.state.location.search).get('type')).toBe('ALL'),
  );
  expect(await screen.findByText('No approvals currently require your action.')).toBeVisible();
  expect(approvalUrls.length).toBeGreaterThanOrEqual(2);
});

test('keeps load failures recoverable and exposes only the safe request reference', async () => {
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: (_url, attempt) =>
      attempt <= 2
        ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
        : successResponse(inbox({ items: INBOX_ITEMS, limit: 20, page: 1, total: 3 })),
  });
  const { container } = renderApplication('/approvals');
  const user = userEvent.setup();

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(
    'WorkLedger could not load the approval inbox. No approval information is available.',
  );
  expect(alert).toHaveTextContent(`Request reference: ${REQUEST_ID}`);
  await user.click(within(alert).getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('table', { name: /Unified approval inbox/u })).toBeVisible();
  expect(approvalUrls).toHaveLength(3);
  await expectNoAxeViolations(container);
});

test('presents a permission loss as a focused route state without approval details', async () => {
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: () => apiErrorResponse('ACCESS_DENIED', 403),
  });
  const { container } = renderApplication('/approvals?status=ALL');

  const heading = await screen.findByRole('heading', { name: 'Permission denied' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Permission denied | WorkLedger');
  expect(screen.getByText(/No restricted approval details were disclosed/u)).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Filter and sort' })).not.toBeInTheDocument();
  expect(screen.queryByText(REQUEST_ID)).not.toBeInTheDocument();
  expect(approvalUrls).toHaveLength(2);
  await expectNoAxeViolations(container);
});

test('clears the inbox and redirects safely when the session expires during loading', async () => {
  let expired = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') {
        return expired
          ? apiErrorResponse('AUTH_SESSION_EXPIRED', 401)
          : successResponse(MANAGER_CONTEXT);
      }
      if (url.pathname === '/v1/approvals') {
        expired = true;
        return apiErrorResponse('AUTH_SESSION_EXPIRED', 401);
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  const { router } = renderApplication('/approvals');

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
  const heading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByRole('alert')).toHaveTextContent('Your session expired');
  expect(screen.queryByRole('heading', { name: 'Approval inbox' })).not.toBeInTheDocument();
});

test('lets HR discover the minimized inbox without exposing correction decision links', async () => {
  stubInboxFetch({
    context: HR_CONTEXT,
    onInbox: () => successResponse(inbox({ items: INBOX_ITEMS, limit: 20, page: 1, total: 3 })),
  });
  renderApplication('/approvals?status=ALL');

  const table = await screen.findByRole('table', { name: /Unified approval inbox/u });
  expect(within(table).getByText('Maria Chen')).toBeVisible();
  expect(
    within(table).queryByRole('link', { name: 'Review correction for Maria Chen' }),
  ).not.toBeInTheDocument();
  expect(
    within(within(table).getByRole('row', { name: /Maria Chen/u })).getByText('No list action'),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Approvals' })).toHaveAttribute('aria-current', 'page');
});

test('rejects sensitive or unknown URL filters and reloads the canonical broad defaults', async () => {
  const { approvalUrls } = stubInboxFetch({
    context: MANAGER_CONTEXT,
    onInbox: () => successResponse(inbox({ items: [], limit: 20, page: 1, total: 0 })),
  });
  const { router } = renderApplication('/approvals?type=SICKNESS&employee=someone');

  expect(await screen.findByText('No approvals currently require your action.')).toBeVisible();
  await waitFor(() => expect(router.state.location.pathname).toBe('/approvals'));
  expect(router.state.location.search).toBe('');
  expect(approvalUrls).toHaveLength(1);
  expect(Object.fromEntries(approvalUrls[0]?.searchParams ?? [])).toEqual({
    direction: 'DESC',
    limit: '20',
    page: '1',
    sort: 'SUBMITTED_AT',
    status: 'ACTION_REQUIRED',
    type: 'ALL',
  });
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const url = new URL(initialEntry, 'https://workledger.test');
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `approval-component-test-${(routerSequence += 1).toString()}`,
        pathname: url.pathname,
        search: url.search,
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

function stubInboxFetch({
  context,
  onInbox,
}: Readonly<{
  context: SelfContext;
  onInbox: (url: URL, attempt: number) => Response | Promise<Response>;
}>) {
  const approvalUrls: URL[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(context);
      if (url.pathname === '/v1/approvals') {
        approvalUrls.push(url);
        return onInbox(url, approvalUrls.length);
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  return { approvalUrls };
}

function inbox({
  items,
  limit,
  page,
  total,
}: Readonly<{
  items: ApprovalInbox['items'];
  limit: number;
  page: number;
  total: number;
}>): ApprovalInbox {
  return {
    filterOptions: { teams: [{ id: TEAM_ID, name: 'Client Services' }] },
    items,
    pagination: {
      limit,
      page,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    timeZone: 'Europe/Berlin',
  };
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}

function apiErrorResponse(code: string, status: number): Response {
  return Response.json(
    { error: { code, message: 'The request could not be completed.', requestId: REQUEST_ID } },
    { status },
  );
}

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test');
  if (input instanceof URL) return input;
  return new URL(input.url);
}

function deferred<T>() {
  let resolver: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return {
    promise,
    resolve(value: T) {
      if (resolver === undefined) throw new Error('Deferred resolver was not initialized.');
      resolver(value);
    },
  };
}
