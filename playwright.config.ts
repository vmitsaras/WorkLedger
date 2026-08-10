import { defineConfig, devices } from '@playwright/test';

const configuredPort = process.env.WORKLEDGER_E2E_PORT ?? '4173';
const e2ePort = Number(configuredPort);

if (!Number.isSafeInteger(e2ePort) || e2ePort < 1024 || e2ePort > 65_535) {
  throw new Error('WORKLEDGER_E2E_PORT must be an integer from 1024 through 65535.');
}

const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './apps/web/e2e',
  outputDir: 'test-results/playwright',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  webServer: {
    command: `pnpm --filter @workledger/web dev --port ${e2ePort}`,
    reuseExistingServer: !process.env.CI,
    url: e2eBaseUrl,
  },
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
