import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';

import { createWorkLedgerQueryClient } from './app/query.js';
import { captureResetGrant } from './app/reset-grant.js';
import { createWorkLedgerRouter } from './app/router.js';
import './styles.css';

captureResetGrant();
const queryClient = createWorkLedgerQueryClient();
const router = createWorkLedgerRouter(queryClient);

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('WorkLedger web root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
