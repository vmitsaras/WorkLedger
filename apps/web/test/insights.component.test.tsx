import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { InsightNativeResult } from '@workledger/contracts/insights';
import { initializeI18n, type I18nRuntime } from '@workledger/i18n';
import { WorkLedgerI18nProvider } from '@workledger/i18n/react';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { InsightsPage } from '../src/routes/insights-page.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
let runtime: I18nRuntime | undefined;

beforeAll(async () => {
  runtime = await initializeI18n('en-GB');
});

afterEach(() => {
  clearSessionMemory();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('runs only after submit, keeps safe URL context, and presents typed native evidence', async () => {
  const requests: { body: unknown; url: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/run') {
        requests.push({ body: JSON.parse(String(init?.body)) as unknown, url: url.pathname });
        return successResponse(RESULT);
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  const rendered = renderInsights('/insights');

  expect(fetch).not.toHaveBeenCalled();
  await user.selectOptions(
    screen.getByLabelText('What would you like to understand?'),
    'today-explanation',
  );
  await user.type(screen.getByLabelText('Date'), '2026-08-27');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));

  expect(await screen.findByRole('heading', { name: 'How was today calculated?' })).toBeVisible();
  expect(screen.getByText('Worked time')).toBeVisible();
  expect(screen.getByText('7h 30m')).toBeVisible();
  expect(screen.getByText('Provisional')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Open Today' })).toHaveAttribute('href', '/today');
  expect(screen.getByText(/not stored in the address/iu)).toBeVisible();
  expect(requests).toEqual([
    {
      body: {
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        workspace: 'EMPLOYEE',
      },
      url: '/v1/insights/run',
    },
  ]);
  expect(rendered.router.state.location.search).toBe('?kind=today-explanation&date=2026-08-27');
  expect(rendered.router.state.location.search).not.toContain('source_today');
  await expectNoAxeViolations(rendered.container);
});

test('does not rerun restored URL state and focuses a useful validation summary', async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  const user = userEvent.setup();
  const { router } = renderInsights('/insights?kind=balance-change&from=2026-08-01&to=2026-08-27');

  expect(await screen.findByDisplayValue('2026-08-01')).toBeVisible();
  expect(fetchSpy).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('From'));
  await user.click(screen.getByRole('button', { name: 'Run insight' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveFocus();
  expect(alert).toHaveTextContent('Choose the first date.');
  expect(router.state.location.search).toContain('from=2026-08-01');
  expect(fetchSpy).not.toHaveBeenCalled();
});

function renderInsights(initialEntry: string) {
  if (runtime === undefined) throw new Error('Expected initialized i18n runtime.');
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/insights', element: <InsightsPage /> },
      { path: '/today', element: <h1>Today</h1> },
      { path: '/sign-in', element: <h1>Sign in</h1> },
    ],
    { initialEntries: [initialEntry] },
  );
  const rendered = render(
    <WorkLedgerI18nProvider runtime={runtime}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WorkLedgerI18nProvider>,
  );
  return { ...rendered, router };
}

const RESULT: InsightNativeResult = {
  actions: [
    {
      code: 'REVIEW_TODAY',
      destination: 'TODAY',
      period: { date: '2026-08-27', kind: 'DATE' },
      reference: 'action_today',
      sourceReferences: ['source_today'],
    },
  ],
  facts: [
    {
      code: 'TODAY_WORKED_MINUTES',
      qualifiers: ['PROVISIONAL'],
      reference: 'fact_worked',
      sourceReferences: ['source_today'],
      value: { kind: 'MINUTES', value: 450 },
    },
  ],
  freshness: {
    boundaries: [
      {
        kind: 'CALCULATED_THROUGH',
        localDate: '2026-08-27',
        sourceReferences: ['source_today'],
      },
    ],
    capturedAt: '2026-08-27T12:00:00Z',
  },
  kind: 'today-explanation',
  limitations: [
    {
      code: 'TODAY_VALUES_PROVISIONAL',
      material: true,
      reference: 'limit_provisional',
      sourceReferences: ['source_today'],
    },
  ],
  period: { date: '2026-08-27', kind: 'DATE' },
  scope: { kind: 'SELF', workspace: 'EMPLOYEE' },
  sources: [
    {
      destination: 'TODAY',
      kind: 'TODAY_ATTENDANCE',
      period: { date: '2026-08-27', kind: 'DATE' },
      reference: 'source_today',
    },
  ],
  timeZone: 'Europe/Berlin',
  workspace: 'EMPLOYEE',
};

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test');
  if (input instanceof URL) return input;
  return new URL(input.url, 'https://workledger.test');
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}
