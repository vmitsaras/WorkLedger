import { spawn } from 'node:child_process';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = '54329';
const DEFAULT_DATABASE = 'workledger_test';
const DEFAULT_USER = 'workledger_test';
const DEFAULT_PASSWORD = 'workledger_test_password';

function createDefaultTestDatabaseUrl() {
  const port = process.env.WORKLEDGER_POSTGRES_PORT?.trim() || DEFAULT_PORT;
  return `postgres://${DEFAULT_USER}:${DEFAULT_PASSWORD}@${DEFAULT_HOST}:${port}/${DEFAULT_DATABASE}`;
}

const testDatabaseUrl =
  process.env.WORKLEDGER_TEST_DATABASE_URL?.trim() || createDefaultTestDatabaseUrl();
const pnpmScript = process.env.npm_execpath;
const command = pnpmScript ? process.execPath : 'pnpm';
const args = pnpmScript
  ? [
      pnpmScript,
      'exec',
      'vitest',
      'run',
      '--project',
      'integration',
      'packages/database/test/postgres.integration.test.ts',
      'packages/database/test/migrations.integration.test.ts',
      'packages/database/test/repositories.integration.test.ts',
      'packages/database/test/idempotency.integration.test.ts',
      'packages/database/test/development-seed.integration.test.ts',
      'apps/api/test/authentication.integration.test.ts',
      'apps/api/test/authorization.integration.test.ts',
      'apps/api/test/audit.integration.test.ts',
      'apps/api/test/today-attendance.integration.test.ts',
      'apps/api/test/monthly-period.integration.test.ts',
    ]
  : [
      'exec',
      'vitest',
      'run',
      '--project',
      'integration',
      'packages/database/test/postgres.integration.test.ts',
      'packages/database/test/migrations.integration.test.ts',
      'packages/database/test/repositories.integration.test.ts',
      'packages/database/test/idempotency.integration.test.ts',
      'packages/database/test/development-seed.integration.test.ts',
      'apps/api/test/authentication.integration.test.ts',
      'apps/api/test/authorization.integration.test.ts',
      'apps/api/test/audit.integration.test.ts',
      'apps/api/test/today-attendance.integration.test.ts',
      'apps/api/test/monthly-period.integration.test.ts',
    ];

const child = spawn(command, args, {
  env: {
    ...process.env,
    WORKLEDGER_TEST_DATABASE_URL: testDatabaseUrl,
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`PostgreSQL integration test interrupted by ${signal}.`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = code ?? 1;
});

child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
