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
import { setPendingInsightContext, takePendingInsightContext } from '../src/app/insight-context.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { InsightsPage } from '../src/routes/insights-page.js';
import { ManagerInsightsPage } from '../src/routes/manager-insights-page.js';
import { HrInsightsPage } from '../src/routes/hr-insights-page.js';

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
        return insightRunResponse(RESULT, 'DISABLED');
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  setPendingInsightContext({
    kind: 'TODAY',
    period: { date: '2026-08-27', kind: 'DATE' },
    sourceReferences: [],
  });
  const rendered = renderInsights('/insights');

  expect(fetch).not.toHaveBeenCalled();
  expect(await screen.findByRole('heading', { name: 'Page context' })).toBeVisible();
  expect(screen.getByText('Today')).toBeVisible();
  expect(screen.getByText('Thursday, 27 August 2026')).toBeVisible();
  expect(screen.getByText(/No page content or record identifiers were copied/iu)).toBeVisible();
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
        context: {
          kind: 'TODAY',
          period: { date: '2026-08-27', kind: 'DATE' },
          sourceReferences: [],
        },
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        workspace: 'EMPLOYEE',
      },
      url: '/v1/insights/run',
    },
  ]);
  expect(rendered.router.state.location.search).toBe('?kind=today-explanation&date=2026-08-27');
  expect(rendered.router.state.location.search).not.toContain('source_today');
  expect(rendered.router.state.location.search).not.toContain('TODAY');
  await user.click(screen.getByRole('button', { name: 'Remove context' }));
  expect(screen.queryByRole('heading', { name: 'Page context' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('What would you like to understand?')).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Page context removed.');
  await expectNoAxeViolations(rendered.container);
});

test('runs a Manager Insight without interpretation and presents current report scope', async () => {
  const requests: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/manager/run') {
        requests.push(JSON.parse(String(init?.body)) as unknown);
        return insightRunResponse(MANAGER_RESULT, 'DISABLED');
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  const rendered = renderManagerInsights();

  expect(fetch).not.toHaveBeenCalled();
  await user.selectOptions(
    screen.getByLabelText('What would you like to understand?'),
    'team-coverage',
  );
  await user.type(screen.getByLabelText('Date'), '2026-08-27');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));

  expect(await screen.findByRole('heading', { name: 'Team coverage' })).toBeVisible();
  expect(screen.getByText('Current direct reports')).toBeVisible();
  expect(screen.getByText('Working now')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Team status' })).toHaveAttribute('href', '/team');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(requests).toEqual([
    {
      kind: 'team-coverage',
      period: { date: '2026-08-27', kind: 'DATE' },
      workspace: 'MANAGER',
    },
  ]);
  await expectNoAxeViolations(rendered.container);
});

test('renders the Manager Insight result in every supported locale', async () => {
  const headings = {
    'de-DE': 'Teamabdeckung',
    'en-GB': 'Team coverage',
    'es-ES': 'Cobertura del equipo',
  } as const;
  for (const locale of ['en-GB', 'de-DE', 'es-ES'] as const) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
        if (url.pathname === '/v1/insights/manager/run') {
          return insightRunResponse(MANAGER_RESULT, 'DISABLED');
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      }),
    );
    const localizedRuntime = await initializeI18n(locale);
    const user = userEvent.setup();
    const rendered = renderManagerInsights(localizedRuntime);
    const kind = rendered.container.querySelector<HTMLSelectElement>('select');
    const date = rendered.container.querySelector<HTMLInputElement>('input[type="date"]');
    const submit = rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (kind === null || date === null || submit === null) {
      throw new Error('Expected localized Manager form controls.');
    }
    await user.selectOptions(kind, 'team-coverage');
    await user.type(date, '2026-08-27');
    await user.click(submit);
    expect(await screen.findByRole('heading', { name: headings[locale] })).toBeVisible();
    await expectNoAxeViolations(rendered.container);
    rendered.unmount();
    vi.unstubAllGlobals();
  }
});

test('runs only a fixed HR aggregate and renders available and generic suppressed states', async () => {
  const requests: unknown[] = [];
  let requestCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/hr/run') {
        requests.push(JSON.parse(String(init?.body)) as unknown);
        requestCount += 1;
        return requestCount === 1
          ? successResponse({ nativeResult: HR_RESULT })
          : successResponse({
              capturedAt: '2026-08-28T12:00:00Z',
              kind: 'HR_NEUTRAL_ABSENCE_COVERAGE',
              month: '2026-08',
              reason: 'PRIVACY_THRESHOLD_NOT_MET',
            });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  const rendered = renderHrInsights();

  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByText(/Filters, comparisons, subgroups/iu)).toBeVisible();
  await user.type(screen.getByLabelText('Month'), '2026-08');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));

  expect(await screen.findByRole('heading', { name: 'Monthly closure readiness' })).toBeVisible();
  expect(screen.getByText('Organisation aggregate')).toBeVisible();
  expect(screen.getByText('Eligible employees')).toBeVisible();
  expect(screen.getByText('13')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Monthly time report' })).toHaveAttribute(
    'href',
    '/reports/monthly-time?direction=ASC&from=2026-08-01&limit=20&page=1&sort=EMPLOYEE&to=2026-08-31',
  );
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

  await user.selectOptions(
    screen.getByLabelText('What would you like to understand?'),
    'HR_NEUTRAL_ABSENCE_COVERAGE',
  );
  await user.click(screen.getByRole('button', { name: 'Run insight' }));
  expect(await screen.findByText('Aggregate unavailable')).toBeVisible();
  expect(screen.getByText(/does not reveal which requirement/iu)).toBeVisible();
  expect(screen.queryByText('Eligible employees')).not.toBeInTheDocument();
  expect(requests).toEqual([
    {
      kind: 'HR_MONTHLY_CLOSURE_READINESS',
      month: '2026-08',
      workspace: 'HR',
    },
    {
      kind: 'HR_NEUTRAL_ABSENCE_COVERAGE',
      month: '2026-08',
      workspace: 'HR',
    },
  ]);
  expect(rendered.router.state.location.search).toBe('');
  expect(localStorage).toHaveLength(0);
  expect(sessionStorage).toHaveLength(0);
  await expectNoAxeViolations(rendered.container);
});

test('renders the privacy-suppressed HR state in every supported locale', async () => {
  const headings = {
    'de-DE': 'Aggregat nicht verfügbar',
    'en-GB': 'Aggregate unavailable',
    'es-ES': 'Agregado no disponible',
  } as const;
  for (const locale of ['en-GB', 'de-DE', 'es-ES'] as const) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
        if (url.pathname === '/v1/insights/hr/run') {
          return successResponse({
            capturedAt: '2026-08-28T12:00:00Z',
            kind: 'HR_MONTHLY_CLOSURE_READINESS',
            month: '2026-08',
            reason: 'PRIVACY_THRESHOLD_NOT_MET',
          });
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      }),
    );
    const localizedRuntime = await initializeI18n(locale);
    const user = userEvent.setup();
    const rendered = renderHrInsights(localizedRuntime);
    const month = rendered.container.querySelector<HTMLInputElement>('input[type="month"]');
    const submit = rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (month === null || submit === null) throw new Error('Expected localized HR form controls.');
    await user.type(month, '2026-08');
    await user.click(submit);
    expect(await screen.findByText(headings[locale])).toBeVisible();
    await expectNoAxeViolations(rendered.container);
    rendered.unmount();
    vi.unstubAllGlobals();
  }
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

test('consumes page context once and does not retain it across a remount', async () => {
  setPendingInsightContext({ kind: 'MY_REQUESTS', sourceReferences: [] });
  const first = renderInsights('/insights');

  expect(await screen.findByRole('heading', { name: 'Page context' })).toBeVisible();
  expect(screen.getByText('My requests')).toBeVisible();
  expect(screen.getByText('No period was carried from this page')).toBeVisible();
  first.unmount();

  renderInsights('/insights');
  await screen.findByRole('heading', { name: 'Insights' });
  expect(screen.queryByRole('heading', { name: 'Page context' })).not.toBeInTheDocument();
});

test('clears page context when insight permission is lost', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/run') {
        return Response.json(
          { error: { code: 'ACCESS_DENIED', requestId: REQUEST_ID } },
          { status: 403 },
        );
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  setPendingInsightContext({
    kind: 'TODAY',
    period: { date: '2026-08-27', kind: 'DATE' },
    sourceReferences: [],
  });
  renderInsights('/insights?kind=today-explanation&date=2026-08-27');

  expect(await screen.findByRole('heading', { name: 'Page context' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Run insight' }));

  expect(
    await screen.findByRole('heading', { name: 'You do not have access to employee insights' }),
  ).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Page context' })).not.toBeInTheDocument();
});

test('suggests only after submit and requires confirmation and a fresh period before running', async () => {
  const requests: { path: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      requests.push({ path, body: JSON.parse(String(init?.body)) as unknown });
      if (path === '/v1/insights/suggest-topic')
        return successResponse({ topic: 'today-explanation' });
      if (path === '/v1/insights/run') return insightRunResponse(RESULT, 'DISABLED');
      throw new Error('Unexpected request');
    }),
  );
  const user = userEvent.setup();
  const rendered = renderInsights('/insights?kind=balance-change&from=2026-08-01&to=2026-08-27');
  const question = await screen.findByLabelText('What would you like to find? (English)');
  expect(fetch).not.toHaveBeenCalled();
  await user.type(question, 'How was my working time calculated?');
  await user.click(screen.getByRole('button', { name: 'Suggest a topic' }));
  const confirm = await screen.findByRole('button', { name: 'Use this topic' });
  expect(screen.getByLabelText('What would you like to understand?')).toHaveValue('balance-change');
  expect(requests).toEqual([
    {
      path: '/v1/insights/suggest-topic',
      body: { language: 'en', question: 'How was my working time calculated?' },
    },
  ]);
  expect(JSON.stringify(rendered.queryClient.getMutationCache().getAll())).not.toContain(
    'How was my working time',
  );
  expect(rendered.router.state.location.search).not.toContain('calculated');
  expect(localStorage).toHaveLength(0);
  expect(sessionStorage).toHaveLength(0);
  await expectNoAxeViolations(rendered.container);
  await user.click(confirm);
  expect(screen.getByLabelText('What would you like to understand?')).toHaveValue(
    'today-explanation',
  );
  expect(screen.getByLabelText('What would you like to understand?')).toHaveFocus();
  expect(screen.getByLabelText('Date')).toHaveValue('');
  expect(requests).toHaveLength(1);
  await user.type(screen.getByLabelText('Date'), '2026-08-27');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));
  expect(await screen.findByRole('heading', { name: 'How was today calculated?' })).toBeVisible();
  expect(screen.queryByLabelText('Question about this result')).not.toBeInTheDocument();
  await expectNoAxeViolations(rendered.container);
});

test('cancels and ignores a late response while preserving native evidence', async () => {
  let finish: ((response: Response) => void) | undefined;
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestUrl(input).pathname;
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (path === '/v1/insights/run') return insightRunResponse(RESULT, 'DISABLED');
      signal = init?.signal;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }),
  );
  const user = userEvent.setup();
  renderInsights('/insights?kind=today-explanation&date=2026-08-27');
  await user.click(await screen.findByRole('button', { name: 'Run insight' }));
  await screen.findByRole('heading', { name: 'How was today calculated?' });
  await user.type(
    screen.getByLabelText('What would you like to find? (English)'),
    'Why did my balance change?',
  );
  await user.click(screen.getByRole('button', { name: 'Suggest a topic' }));
  await waitFor(() => expect(finish).toBeDefined());
  await user.click(screen.getByRole('button', { name: 'Cancel suggestion' }));
  expect(signal?.aborted).toBe(true);
  expect(screen.getByLabelText('What would you like to find? (English)')).toHaveFocus();
  finish?.(successResponse({ topic: 'balance-change' }));
  await screen.findByText('Suggestion cancelled.');
  expect(screen.queryByRole('button', { name: 'Use this topic' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'How was today calculated?' })).toBeVisible();
});

test.each(['unknown', 'unavailable', 'invalid', 'denied'])(
  'handles %s topic responses without treating them as native answers',
  async (state) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (requestUrl(input).pathname === '/v1/me/csrf')
          return successResponse({ token: 'c'.repeat(64) });
        if (state === 'unknown') return successResponse({ topic: 'UNKNOWN' });
        if (state === 'invalid')
          return successResponse({ topic: 'team-coverage', prose: 'hidden' });
        return Response.json(
          {
            error: {
              code: state === 'denied' ? 'ACCESS_DENIED' : 'INTERNAL_ERROR',
              requestId: REQUEST_ID,
            },
          },
          { status: state === 'denied' ? 403 : 503 },
        );
      }),
    );
    const user = userEvent.setup();
    const rendered = renderInsights('/insights');
    await user.type(
      await screen.findByLabelText('What would you like to find? (English)'),
      'Help me',
    );
    await user.click(screen.getByRole('button', { name: 'Suggest a topic' }));
    await screen.findByText(
      state === 'denied'
        ? 'You do not have access to employee insights'
        : state === 'unknown'
          ? /No single supported topic/
          : /AI suggestions are unavailable/,
    );
    expect(screen.queryByRole('button', { name: 'Use this topic' })).not.toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    await expectNoAxeViolations(rendered.container);
  },
);

test('keeps the optional interaction explicitly English in every account locale', async () => {
  for (const locale of ['en-GB', 'de-DE', 'es-ES'] as const) {
    const localized = await initializeI18n(locale);
    const rendered = renderInsights('/insights', localized);
    const question = await screen.findByLabelText('What would you like to find? (English)');
    expect(question.closest('[lang]')).toHaveAttribute('lang', 'en');
    await expectNoAxeViolations(rendered.container);
    rendered.unmount();
  }
});

function renderInsights(initialEntry: string, selectedRuntime = runtime) {
  if (selectedRuntime === undefined) throw new Error('Expected initialized i18n runtime.');
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(
    [
      {
        path: '/insights',
        element: <InsightsPage />,
        loader: () => takePendingInsightContext() ?? null,
      },
      { path: '/today', element: <h1>Today</h1> },
      { path: '/sign-in', element: <h1>Sign in</h1> },
    ],
    { initialEntries: [initialEntry] },
  );
  const rendered = render(
    <WorkLedgerI18nProvider runtime={selectedRuntime}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WorkLedgerI18nProvider>,
  );
  return { ...rendered, queryClient, router };
}

function renderManagerInsights(selectedRuntime = runtime) {
  if (selectedRuntime === undefined) throw new Error('Expected initialized i18n runtime.');
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/team-insights', element: <ManagerInsightsPage /> },
      { path: '/team', element: <h1>Team status</h1> },
      { path: '/sign-in', element: <h1>Sign in</h1> },
    ],
    { initialEntries: ['/team-insights'] },
  );
  const rendered = render(
    <WorkLedgerI18nProvider runtime={selectedRuntime}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WorkLedgerI18nProvider>,
  );
  return { ...rendered, queryClient, router };
}

function renderHrInsights(selectedRuntime = runtime) {
  if (selectedRuntime === undefined) throw new Error('Expected initialized i18n runtime.');
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/hr-insights', element: <HrInsightsPage /> },
      { path: '/reports/monthly-time', element: <h1>Monthly time report</h1> },
      { path: '/team-calendar', element: <h1>Team calendar</h1> },
      { path: '/sign-in', element: <h1>Sign in</h1> },
    ],
    { initialEntries: ['/hr-insights'] },
  );
  const rendered = render(
    <WorkLedgerI18nProvider runtime={selectedRuntime}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </WorkLedgerI18nProvider>,
  );
  return { ...rendered, queryClient, router };
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

const MANAGER_RESULT: InsightNativeResult = {
  actions: [
    {
      code: 'OPEN_TEAM_STATUS',
      destination: 'TEAM_STATUS',
      reference: 'action_source_team_status',
      sourceReferences: ['source_team_status'],
    },
  ],
  facts: [
    {
      code: 'TEAM_WORKING_COUNT',
      qualifiers: ['CURRENT'],
      reference: 'fact_team_working_count',
      sourceReferences: ['source_team_status'],
      value: { kind: 'COUNT', value: 2 },
    },
  ],
  freshness: {
    boundaries: [
      {
        kind: 'CALCULATED_THROUGH',
        localDate: '2026-08-27',
        sourceReferences: ['source_team_status'],
      },
    ],
    capturedAt: '2026-08-27T12:00:00Z',
  },
  kind: 'team-coverage',
  limitations: [],
  period: { date: '2026-08-27', kind: 'DATE' },
  scope: { kind: 'CURRENT_DIRECT_REPORTS', workspace: 'MANAGER' },
  sources: [
    {
      destination: 'TEAM_STATUS',
      kind: 'TEAM_STATUS',
      period: { date: '2026-08-27', kind: 'DATE' },
      reference: 'source_team_status',
    },
  ],
  timeZone: 'Europe/Berlin',
  workspace: 'MANAGER',
};

const HR_RESULT: InsightNativeResult = {
  actions: [
    {
      code: 'OPEN_MONTHLY_TIME_REPORT',
      destination: 'MONTHLY_TIME_REPORT',
      period: { kind: 'MONTH', monthStart: '2026-08-01' },
      reference: 'action_source_monthly_time_report',
      sourceReferences: ['source_monthly_time_report'],
    },
  ],
  facts: [
    {
      code: 'HR_ELIGIBLE_EMPLOYEE_COUNT',
      qualifiers: ['CURRENT'],
      reference: 'fact_hr_eligible_employees',
      sourceReferences: ['source_monthly_time_report'],
      value: { kind: 'COUNT', value: 13 },
    },
  ],
  freshness: {
    boundaries: [
      {
        kind: 'CALCULATED_THROUGH',
        localDate: '2026-08-31',
        sourceReferences: ['source_monthly_time_report'],
      },
    ],
    capturedAt: '2026-08-28T12:00:00Z',
  },
  kind: 'HR_MONTHLY_CLOSURE_READINESS',
  limitations: [],
  period: { kind: 'MONTH', monthStart: '2026-08-01' },
  scope: { kind: 'ORGANIZATION_AGGREGATE', workspace: 'HR' },
  sources: [
    {
      destination: 'MONTHLY_TIME_REPORT',
      kind: 'MONTHLY_TIME_REPORT',
      period: { kind: 'MONTH', monthStart: '2026-08-01' },
      reference: 'source_monthly_time_report',
    },
  ],
  timeZone: 'Europe/Berlin',
  workspace: 'HR',
};

function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test');
  if (input instanceof URL) return input;
  return new URL(input.url, 'https://workledger.test');
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}

function insightRunResponse(
  data: unknown,
  interpretationAvailability: 'DISABLED' | 'READY' | 'UNAVAILABLE',
): Response {
  return Response.json({
    data,
    meta: { interpretationAvailability, requestId: REQUEST_ID },
  });
}
