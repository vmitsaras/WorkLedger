import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
});

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  value: () => undefined,
});

afterEach(() => {
  cleanup();
});
