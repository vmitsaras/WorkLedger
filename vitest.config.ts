import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { createWorkLedgerVitestProjects } from './packages/config/vitest/index.js';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: createWorkLedgerVitestProjects({
      componentSetupFiles: ['test/setup/vitest-dom.ts'],
    }),
  },
});
