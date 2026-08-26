import { DEFAULT_LOCALE } from '@workledger/contracts';
import { initializeLocale } from '@workledger/i18n';
import { synchronizeDocumentLocale, WorkLedgerLocaleProvider } from '@workledger/i18n/react';
import { Button, RouteState } from '@workledger/ui';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';

import { createWorkLedgerQueryClient } from './app/query.js';
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
    const localeRuntime = await initializeLocale(DEFAULT_LOCALE);
    synchronizeDocumentLocale(localeRuntime);

    const queryClient = createWorkLedgerQueryClient();
    const router = createWorkLedgerRouter(queryClient);
    root.render(
      <StrictMode>
        <WorkLedgerLocaleProvider runtime={localeRuntime}>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </WorkLedgerLocaleProvider>
      </StrictMode>,
    );
  } catch {
    synchronizeDocumentLocale({ direction: 'ltr', locale: DEFAULT_LOCALE });
    root.render(<LocalizationStartupFailure />);
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
