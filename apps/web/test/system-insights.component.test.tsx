import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type { SystemInsightNativeResult } from '@workledger/contracts/insights';
import { initializeI18n, type I18nRuntime } from '@workledger/i18n';
import { WorkLedgerI18nProvider } from '@workledger/i18n/react';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { SystemInsightsPage } from '../src/routes/system-insights-page.js';

afterEach(() => {
  clearSessionMemory();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('runs the fixed System Insight accessibly in every supported locale without persistent state', async () => {
  const expected = {
    'de-DE': {
      heading: 'Technische Übersicht',
      limitation: 'Laufzeitstatus der Datensicherung ist nicht verfügbar',
    },
    'en-GB': {
      heading: 'Technical overview',
      limitation: 'Backup runtime status is not available',
    },
    'es-ES': {
      heading: 'Resumen técnico',
      limitation: 'El estado de ejecución de las copias no está disponible',
    },
  } as const;

  for (const locale of ['en-GB', 'de-DE', 'es-ES'] as const) {
    const requests: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(
          typeof input === 'string' ? input : input.toString(),
          'https://local.test',
        );
        if (url.pathname === '/v1/me/csrf') {
          return successResponse({ token: 'c'.repeat(64) });
        }
        if (url.pathname === '/v1/insights/system/run') {
          requests.push(JSON.parse(String(init?.body)) as unknown);
          return successResponse(SYSTEM_RESULT);
        }
        throw new Error(`Unexpected request: ${url.pathname}`);
      }),
    );
    const runtime = await initializeI18n(locale);
    const user = userEvent.setup();
    const rendered = renderSystemInsights(runtime);

    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText('0.16.0')).not.toBeInTheDocument();
    const submit = rendered.container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit === null) throw new Error('Expected System Insight submit button.');
    await user.click(submit);

    expect(await screen.findByRole('heading', { name: expected[locale].heading })).toBeVisible();
    expect(screen.getByText(expected[locale].limitation)).toBeVisible();
    expect(screen.getByText('0.16.0')).toBeVisible();
    expect(rendered.container.querySelectorAll('dt')).toHaveLength(10);
    expect(rendered.container.querySelectorAll('li')).toHaveLength(5);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/system/operations');
    expect(requests).toEqual([{ kind: 'SYSTEM_TECHNICAL_OVERVIEW', workspace: 'SYSTEM' }]);
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
    await expectNoAxeViolations(rendered.container);
    rendered.unmount();
    vi.unstubAllGlobals();
  }
});

function renderSystemInsights(runtime: I18nRuntime) {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(
    [{ path: '/system/insights', element: <SystemInsightsPage /> }],
    { initialEntries: ['/system/insights'] },
  );
  return {
    ...render(
      <WorkLedgerI18nProvider runtime={runtime}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </WorkLedgerI18nProvider>,
    ),
    router,
  };
}

function successResponse(data: unknown): Response {
  return Response.json({
    data,
    meta: { requestId: '123e4567-e89b-42d3-a456-426614174000' },
  });
}

const SOURCE_CODES = [
  'APPLICATION_MANIFEST',
  'DATABASE_READINESS',
  'HOST_OPERATOR_PROCEDURES',
  'MAIL_ADAPTER_CONFIGURATION',
  'AUTHENTICATION_SECURITY_PROFILE',
] as const;

const SYSTEM_RESULT: SystemInsightNativeResult = {
  actions: [
    {
      code: 'OPEN_SYSTEM_OPERATIONS',
      destination: 'SYSTEM_OPERATIONS',
      sourceCodes: SOURCE_CODES,
    },
  ],
  facts: [
    { code: 'APPLICATION_VERSION', source: 'APPLICATION_MANIFEST', value: '0.16.0' },
    { code: 'SERVICE_HEALTH', source: 'DATABASE_READINESS', value: 'HEALTHY' },
    { code: 'DATABASE_HEALTH', source: 'DATABASE_READINESS', value: 'HEALTHY' },
    { code: 'EXPECTED_SCHEMA_STATUS', source: 'DATABASE_READINESS', value: 'READY' },
    {
      code: 'BACKUP_MANAGEMENT',
      source: 'HOST_OPERATOR_PROCEDURES',
      value: 'HOST_OPERATOR_MANAGED',
    },
    {
      code: 'MAIL_DELIVERY_CONFIGURATION',
      source: 'MAIL_ADAPTER_CONFIGURATION',
      value: 'NOT_CONFIGURED',
    },
    {
      code: 'SESSION_IDLE_TIMEOUT_MINUTES',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: 30,
    },
    {
      code: 'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: 720,
    },
    {
      code: 'SESSION_FRESH_WINDOW_MINUTES',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: 15,
    },
    {
      code: 'PERSISTENT_REMEMBER_ME',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: false,
    },
  ],
  freshness: { capturedAt: '2026-08-28T12:00:00Z' },
  kind: 'SYSTEM_TECHNICAL_OVERVIEW',
  limitations: [
    {
      code: 'BACKUP_RUNTIME_STATUS_HOST_OWNED',
      material: true,
      source: 'HOST_OPERATOR_PROCEDURES',
    },
  ],
  scope: { kind: 'TECHNICAL_DIAGNOSTICS', workspace: 'SYSTEM' },
  sources: SOURCE_CODES.map((code) => ({ code, destination: 'SYSTEM_OPERATIONS' })),
  workspace: 'SYSTEM',
};
