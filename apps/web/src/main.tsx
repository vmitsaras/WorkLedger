import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { FoundationPreview } from '@workledger/ui';

import './styles.css';

function Application() {
  return (
    <main id="main-content" className="mx-auto min-h-dvh w-full max-w-5xl px-5 py-12 sm:px-8">
      <FoundationPreview />
    </main>
  );
}

const rootElement = document.querySelector('#root');

if (!(rootElement instanceof HTMLElement)) {
  throw new Error('WorkLedger web root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
