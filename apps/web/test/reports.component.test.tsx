import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { ReportCatalog, ReportResult, SelfContext } from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const PERIOD_ID = '123e4567-e89b-42d3-a456-426614174804';
let routerSequence = 0;

const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'employee@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};

const CATALOG: ReportCatalog = {
  defaultRange: { from: '2026-08-01', to: '2026-08-31' },
  reports: [
    {
      availableSorts: ['EMPLOYEE', 'DATE', 'VALUE', 'STATUS'],
      defaultSort: 'DATE',
      description: 'Monthly expected, worked, credited, and balance minutes.',
      key: 'monthly-time',
      title: 'Monthly time',
    },
    {
      availableSorts: ['EMPLOYEE', 'VALUE'],
      defaultSort: 'EMPLOYEE',
      description: 'Opening, in-range change, and closing flexible-time balances.',
      key: 'flexible-time',
      title: 'Flexible time',
    },
    {
      availableSorts: ['EMPLOYEE', 'VALUE'],
      defaultSort: 'EMPLOYEE',
      description: 'Leave availability, reservation, and projected balances.',
      key: 'leave',
      title: 'Leave balances',
    },
    {
      availableSorts: ['EMPLOYEE', 'DATE'],
      defaultSort: 'DATE',
      description: 'Incomplete daily records that need attention.',
      key: 'missing-records',
      title: 'Missing records',
    },
  ],
  timeZone: 'Europe/Berlin',
};

const MONTHLY_REPORT: ReportResult = {
  generatedAt: '2026-08-14T10:00:00Z',
  key: 'monthly-time',
  pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
  partial: true,
  range: { from: '2026-08-01', to: '2026-08-31' },
  rows: [
    {
      balanceMinutes: 30,
      creditedMinutes: 7_710,
      employeeDisplayName: 'Emma Reed',
      expectedMinutes: 7_680,
      incompleteRecordCount: 1,
      kind: 'MONTHLY_TIME',
      monthStart: '2026-08-01',
      monthlyPeriodId: PERIOD_ID,
      postLockDeltaMinutes: 15,
      workedMinutes: 7_695,
      workflowStatus: 'OPEN',
    },
  ],
  scope: 'SELF',
  summary: {
    balanceMinutes: 30,
    creditedMinutes: 7_710,
    expectedMinutes: 7_680,
    incompleteRecordCount: 1,
    kind: 'MONTHLY_TIME',
    postLockDeltaMinutes: 15,
    workedMinutes: 7_695,
  },
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('lists only the server-authorized report catalog with canonical report links', async () => {
  stubReportFetch();
  const { container } = renderApplication('/reports');

  const heading = await screen.findByRole('heading', { name: 'Reports' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByRole('heading', { name: 'Available reports' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Monthly time' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Pending approvals' })).not.toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'Open monthly time' });
  expect(link).toHaveAttribute(
    'href',
    '/reports/monthly-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=DATE&to=2026-08-31',
  );
  await expectNoAxeViolations(container);
});

test('renders scoped full-result totals, partial context, and an accessible report table', async () => {
  const { reportUrls } = stubReportFetch();
  const { container } = renderApplication(
    '/reports/monthly-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=EMPLOYEE&to=2026-08-31',
  );

  const heading = await screen.findByRole('heading', { name: 'Monthly time' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText(/your own records scope/iu)).toBeVisible();
  expect(screen.getByText(/report is partial/iu)).toBeVisible();
  expect(screen.getAllByText('128h 00m')).toHaveLength(2);
  const table = screen.getByRole('table', { name: /Monthly time rows/iu });
  expect(within(table).getByRole('columnheader', { name: 'Employee' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  expect(within(table).getByRole('row', { name: /Emma Reed/iu })).toBeVisible();
  expect(within(table).getByRole('link', { name: /August 1, 2026/iu })).toHaveAttribute(
    'href',
    `/monthly-periods/${PERIOD_ID}`,
  );
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Copy report summary' })).toBeVisible();
  expect(screen.getByText(/omits internal identifiers.*sickness classification/iu)).toBeVisible();
  await waitFor(() => expect(reportUrls).toHaveLength(1));
  expect(Object.fromEntries(reportUrls[0]?.searchParams ?? [])).toEqual({
    direction: 'ASC',
    from: '2026-08-01',
    limit: '20',
    page: '1',
    sort: 'EMPLOYEE',
    to: '2026-08-31',
  });
  await expectNoAxeViolations(container);
});

test('downloads an authorized CSV and copies only a freshly authorized visible summary', async () => {
  const { exportBodies, reportUrls } = stubReportFetch();
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report-export');
  const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  let downloadedFilename: string | undefined;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    downloadedFilename = this.download;
  });
  renderApplication(
    '/reports/monthly-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=EMPLOYEE&to=2026-08-31',
  );

  await user.click(await screen.findByRole('button', { name: 'Export CSV' }));
  expect(
    await screen.findByRole('status', { name: 'Report portability status' }),
  ).toHaveTextContent('Formula-significant text was prefixed with an apostrophe');
  expect(exportBodies).toEqual([
    {
      direction: 'ASC',
      from: '2026-08-01',
      sort: 'EMPLOYEE',
      to: '2026-08-31',
    },
  ]);
  expect(downloadedFilename).toBe('workledger-monthly-time-2026-08-01-to-2026-08-31.csv');
  expect(createObjectUrl).toHaveBeenCalledOnce();
  await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledWith('blob:report-export'));

  await user.click(screen.getByRole('button', { name: 'Copy report summary' }));
  expect(
    await screen.findByRole('status', { name: 'Report portability status' }),
  ).toHaveTextContent('No table rows or hidden fields were copied');
  expect(reportUrls).toHaveLength(2);
  expect(writeText).toHaveBeenCalledOnce();
  const copied = String(writeText.mock.calls[0]?.[0]);
  expect(copied).toContain('Monthly time');
  expect(copied).toContain('Scope: your own records');
  expect(copied).toContain('Matching rows: 1');
  expect(copied).toContain('Balance: +0h 30m');
  expect(copied).not.toContain('Emma Reed');
  expect(copied).not.toMatch(/monthlyPeriodId|sickness|reason|note/iu);
});

test('announces an export scope loss without creating a download', async () => {
  stubReportFetch({ onExport: () => apiErrorResponse('ACCESS_DENIED', 403) });
  const user = userEvent.setup();
  const createObjectUrl = vi.spyOn(URL, 'createObjectURL');
  renderApplication(
    '/reports/monthly-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=EMPLOYEE&to=2026-08-31',
  );

  await user.click(await screen.findByRole('button', { name: 'Export CSV' }));
  expect(
    await screen.findByRole('status', { name: 'Report portability status' }),
  ).toHaveTextContent('Your report scope changed. The CSV was not completed.');
  expect(createObjectUrl).not.toHaveBeenCalled();
});

test('validates report dates before changing URL state or rerunning the report', async () => {
  const { reportUrls } = stubReportFetch();
  const { router } = renderApplication(
    '/reports/monthly-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=DATE&to=2026-08-31',
  );
  const user = userEvent.setup();
  await screen.findByRole('table', { name: /Monthly time rows/iu });

  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-02' } });
  await user.click(screen.getByRole('button', { name: 'Apply report filters' }));

  expect(screen.getByRole('alert')).toHaveTextContent('keep the range within 366 days');
  expect(router.state.location.search).toContain('from=2026-08-01');
  expect(reportUrls).toHaveLength(1);
});

test('shows explicit report loading and empty states', async () => {
  const result = deferred<Response>();
  stubReportFetch({ onReport: () => result.promise });
  renderApplication(
    '/reports/flexible-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=EMPLOYEE&to=2026-08-31',
  );

  expect(await screen.findByText('Running report…')).toBeVisible();
  await act(async () => {
    result.resolve(
      successResponse({
        generatedAt: '2026-08-14T10:00:00Z',
        key: 'flexible-time',
        pagination: { limit: 20, page: 1, total: 0, totalPages: 0 },
        partial: false,
        range: { from: '2026-08-01', to: '2026-08-31' },
        rows: [],
        scope: 'SELF',
        summary: {
          closingBalanceMinutes: 0,
          kind: 'FLEXIBLE_TIME',
          openingBalanceMinutes: 0,
          rangeChangeMinutes: 0,
        },
        timeZone: 'Europe/Berlin',
      }),
    );
  });
  expect(
    await screen.findByText('No report rows match the applied date range and permission scope.'),
  ).toBeVisible();
});

test('recovers from a report dependency failure', async () => {
  let failing = true;
  stubReportFetch({
    onReport: () =>
      failing
        ? apiErrorResponse('INTERNAL_ERROR', 503)
        : successResponse({
            generatedAt: '2026-08-14T10:00:00Z',
            key: 'flexible-time',
            pagination: { limit: 20, page: 1, total: 0, totalPages: 0 },
            partial: false,
            range: { from: '2026-08-01', to: '2026-08-31' },
            rows: [],
            scope: 'SELF',
            summary: {
              closingBalanceMinutes: 0,
              kind: 'FLEXIBLE_TIME',
              openingBalanceMinutes: 0,
              rangeChangeMinutes: 0,
            },
            timeZone: 'Europe/Berlin',
          }),
  });
  renderApplication(
    '/reports/flexible-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=EMPLOYEE&to=2026-08-31',
  );

  expect(await screen.findByText('The report could not be loaded.')).toBeVisible();
  failing = false;
  await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
  expect(
    await screen.findByText('No report rows match the applied date range and permission scope.'),
  ).toBeVisible();
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const url = new URL(initialEntry, 'https://workledger.test');
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [
      {
        key: `reports-component-test-${(routerSequence += 1).toString()}`,
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

function stubReportFetch(
  options: Readonly<{
    onExport?: (url: URL, init: RequestInit | undefined) => Response | Promise<Response>;
    onReport?: (url: URL) => Response | Promise<Response>;
  }> = {},
) {
  const reportUrls: URL[] = [];
  const exportBodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (url.pathname === '/v1/me/csrf') {
        return successResponse({ token: 'c'.repeat(64) });
      }
      if (url.pathname === '/v1/reports') return successResponse(CATALOG);
      if (url.pathname === '/v1/reports/monthly-time/export') {
        exportBodies.push(JSON.parse(String(init?.body)) as unknown);
        return (
          options.onExport?.(url, init) ??
          new Response('employee_name,month\r\nEmma Reed,2026-08-01\r\n', {
            headers: {
              'content-disposition':
                'attachment; filename="workledger-monthly-time-2026-08-01-to-2026-08-31.csv"',
              'content-type': 'text/csv; charset=utf-8',
            },
          })
        );
      }
      if (url.pathname === '/v1/reports/monthly-time') {
        reportUrls.push(url);
        return options.onReport?.(url) ?? successResponse(MONTHLY_REPORT);
      }
      if (url.pathname === '/v1/reports/flexible-time') {
        reportUrls.push(url);
        return options.onReport?.(url) ?? successResponse(MONTHLY_REPORT);
      }
      throw new Error(`Unexpected test request: ${url.pathname}`);
    }),
  );
  return { exportBodies, reportUrls };
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
