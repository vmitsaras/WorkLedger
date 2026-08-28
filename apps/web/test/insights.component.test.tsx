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

test('keeps Ask My Ledger in route memory and renders grounded native citations after the native result', async () => {
  const interpretationRequests: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/run') return insightRunResponse(RESULT, 'READY');
      if (url.pathname === '/v1/insights/interpret') {
        interpretationRequests.push(JSON.parse(String(init?.body)) as unknown);
        return successResponse({ interpretation: INTERPRETATION, nativeResult: RESULT });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  const rendered = renderInsights('/insights');
  await user.selectOptions(
    await screen.findByLabelText('What would you like to understand?'),
    'today-explanation',
  );
  await user.type(screen.getByLabelText('Date'), '2026-08-27');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));

  const nativeHeading = await screen.findByRole('heading', { name: 'How was today calculated?' });
  const question = screen.getByLabelText('Question about this result');
  expect(nativeHeading.compareDocumentPosition(question) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  await user.type(question, 'Why does this result look this way?');
  await user.click(screen.getByRole('button', { name: 'Explain this result' }));

  const interpretationHeading = await screen.findByRole('heading', {
    name: 'Optional generated explanation',
  });
  expect(nativeHeading.compareDocumentPosition(interpretationHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(screen.getByText(INTERPRETATION.statements[0].text)).toBeVisible();
  expect(screen.getAllByText('7h 30m').length).toBeGreaterThan(1);
  expect(screen.getAllByRole('link', { name: 'Open Today attendance source' })).toHaveLength(2);
  expect(screen.getAllByText('Today’s values are provisional until they are posted.').length).toBe(
    2,
  );
  expect(interpretationRequests).toEqual([
    {
      insight: {
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        workspace: 'EMPLOYEE',
      },
      priorTurns: [],
      question: 'Why does this result look this way?',
    },
  ]);
  expect(rendered.router.state.location.search).toBe('?kind=today-explanation&date=2026-08-27');
  expect(rendered.router.state.location.search).not.toContain('Why');
  expect(localStorage).toHaveLength(0);
  expect(sessionStorage).toHaveLength(0);
  await waitFor(() => {
    const mutationState = JSON.stringify(
      rendered.queryClient
        .getMutationCache()
        .getAll()
        .map(({ state }) => ({ data: state.data, error: state.error, variables: state.variables })),
    );
    expect(mutationState).not.toContain('Why does this result look this way?');
    expect(mutationState).not.toContain(INTERPRETATION.statements[0].text);
  });
  await expectNoAxeViolations(rendered.container);
});

test('cancels pending interpretation without removing the native result or losing focus', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/run') return insightRunResponse(RESULT, 'READY');
      if (url.pathname === '/v1/insights/interpret') {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        });
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  renderInsights('/insights');
  await user.selectOptions(
    await screen.findByLabelText('What would you like to understand?'),
    'today-explanation',
  );
  await user.type(screen.getByLabelText('Date'), '2026-08-27');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));
  const question = await screen.findByLabelText('Question about this result');
  await user.type(question, 'Explain the current evidence.');
  await user.click(screen.getByRole('button', { name: 'Explain this result' }));
  await user.click(await screen.findByRole('button', { name: 'Cancel explanation' }));

  await waitFor(() => expect(question).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('The optional explanation was cancelled');
  expect(screen.getByRole('heading', { name: 'How was today calculated?' })).toBeVisible();
  expect(
    screen.queryByRole('heading', { name: 'Optional generated explanation' }),
  ).not.toBeInTheDocument();
});

test('keeps native evidence and prior grounded output when the provider fails', async () => {
  let interpretationCount = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.pathname === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(64) });
      if (url.pathname === '/v1/insights/run') return insightRunResponse(RESULT, 'READY');
      if (url.pathname === '/v1/insights/interpret') {
        interpretationCount += 1;
        if (interpretationCount === 1) {
          return successResponse({ interpretation: INTERPRETATION, nativeResult: RESULT });
        }
        return Response.json(
          { error: { code: 'INTERNAL_ERROR', requestId: REQUEST_ID } },
          { status: 503 },
        );
      }
      throw new Error(`Unexpected request: ${url.pathname}`);
    }),
  );
  const user = userEvent.setup();
  const rendered = renderInsights('/insights');
  await user.selectOptions(
    await screen.findByLabelText('What would you like to understand?'),
    'today-explanation',
  );
  await user.type(screen.getByLabelText('Date'), '2026-08-27');
  await user.click(screen.getByRole('button', { name: 'Run insight' }));
  const question = await screen.findByLabelText('Question about this result');
  await user.type(question, 'Explain the current evidence.');
  await user.click(screen.getByRole('button', { name: 'Explain this result' }));
  expect(
    await screen.findByRole('heading', { name: 'Optional generated explanation' }),
  ).toBeVisible();

  await user.type(question, ' Try again safely.');
  await user.click(screen.getByRole('button', { name: 'Explain this result' }));

  expect(
    await screen.findByRole('heading', { name: 'The optional explanation is unavailable' }),
  ).toBeVisible();
  expect(screen.getByRole('heading', { name: 'How was today calculated?' })).toBeVisible();
  expect(screen.getByText(INTERPRETATION.statements[0].text)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(rendered.router.state.location.search).not.toContain('Explain');
  expect(localStorage).toHaveLength(0);
  expect(sessionStorage).toHaveLength(0);
  await expectNoAxeViolations(rendered.container);
});

function renderInsights(initialEntry: string) {
  if (runtime === undefined) throw new Error('Expected initialized i18n runtime.');
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
    <WorkLedgerI18nProvider runtime={runtime}>
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

const INTERPRETATION = {
  locale: 'en-GB' as const,
  statements: [
    {
      actionReferences: ['action_today'],
      factReferences: ['fact_worked'],
      limitationReferences: ['limit_provisional'],
      sourceReferences: ['source_today'],
      text: 'The current evidence explains how recorded work contributes to this result.',
    },
  ],
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
