const sharedProjectOptions = {
  clearMocks: true,
  exclude: ['**/coverage/**', '**/dist/**', '**/node_modules/**'],
  globals: true,
  hookTimeout: 10_000,
  passWithNoTests: false,
  restoreMocks: true,
  testTimeout: 10_000,
};

function createProject(testOptions) {
  return {
    test: {
      ...sharedProjectOptions,
      ...testOptions,
    },
  };
}

export function createWorkLedgerVitestProjects({ componentSetupFiles = [] } = {}) {
  return [
    createProject({
      name: 'unit',
      environment: 'node',
      include: ['apps/*/test/**/*.unit.test.ts', 'packages/*/test/**/*.unit.test.ts'],
    }),
    createProject({
      name: 'component',
      environment: 'jsdom',
      include: [
        'apps/*/test/**/*.component.test.{ts,tsx}',
        'packages/*/test/**/*.component.test.{ts,tsx}',
      ],
      setupFiles: componentSetupFiles,
    }),
    createProject({
      name: 'integration',
      environment: 'node',
      include: ['apps/*/test/**/*.integration.test.ts', 'packages/*/test/**/*.integration.test.ts'],
    }),
  ];
}
