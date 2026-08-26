import { DEFAULT_LOCALE, type SelfContext } from '@workledger/contracts';
import { initializeI18n } from '@workledger/i18n';
import { synchronizeDocumentLocale } from '@workledger/i18n/react';
import { Button, RouteState } from '@workledger/ui';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';

import { createWorkLedgerQueryClient } from './app/query.js';
import { loadSelfContext } from './app/api-client.js';
import {
  createWebLocaleController,
  LocaleControllerProvider,
  resolveDeviceLocale,
} from './app/locale.js';
import { selfContextQuery } from './app/query.js';
import { captureResetGrant } from './app/reset-grant.js';
import { createWorkLedgerRouter } from './app/router.js';
import './styles.css';

captureResetGrant();
onlineManager.setOnline(globalThis.navigator.onLine);

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('WorkLedger web root element is missing.');
}

const root = createRoot(rootElement);

void startWorkLedger();

async function startWorkLedger() {
  try {
    const queryClient = createWorkLedgerQueryClient();
    const context = await loadInitialSelfContext(queryClient);
    const localeRuntime = await initializeI18n(context?.locale ?? resolveDeviceLocale());
    const localeController = createWebLocaleController(localeRuntime);
    const router = createWorkLedgerRouter(queryClient, localeController);
    root.render(
      <StrictMode>
        <LocaleControllerProvider controller={localeController}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </LocaleControllerProvider>
      </StrictMode>,
    );
  } catch {
    synchronizeDocumentLocale({ direction: 'ltr', locale: DEFAULT_LOCALE });
    root.render(<LocalizationStartupFailure />);
  }
}

async function loadInitialSelfContext(
  queryClient: ReturnType<typeof createWorkLedgerQueryClient>,
): Promise<SelfContext | null> {
  try {
    const context = await loadSelfContext();
    queryClient.setQueryData(selfContextQuery().queryKey, context);
    return context;
  } catch {
    return null;
  }
}

function LocalizationStartupFailure() {
  useEffect(() => {
    document.title = 'WorkLedger is temporarily unavailable | WorkLedger';
    document.querySelector<HTMLElement>('[data-route-heading]')?.focus();
  }, []);

  return (
    <main
      className="mx-auto grid min-h-dvh w-full max-w-3xl content-center px-5 py-12 sm:px-8"
      id="main-content"
      tabIndex={-1}
    >
      <div role="alert">
        <RouteState
          actions={<Button onPress={() => globalThis.location.reload()}>Reload WorkLedger</Button>}
          headingLevel="h1"
          headingProps={{ 'data-route-heading': true, tabIndex: -1 }}
          kind="error"
          title="WorkLedger is temporarily unavailable"
        >
          <p className="m-0">
            The language resources could not be loaded. Reload the page to try again.
          </p>
        </RouteState>
      </div>
    </main>
  );
}
