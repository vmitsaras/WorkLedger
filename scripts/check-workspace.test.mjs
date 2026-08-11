import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  EXPECTED_CONFIG_EXPORTS,
  EXPECTED_NODE_VERSION,
  EXPECTED_PACKAGE_EXPORTS,
  EXPECTED_PACKAGE_MANAGER,
  EXPECTED_PROJECTS,
  EXPECTED_UI_EXPORTS,
  EXPECTED_WEB_BUILD_SCRIPT,
  EXPECTED_WORKSPACE_CONFIG,
  validateWorkspace,
} from './check-workspace.mjs';

const WORKSPACE_VERSION = '0.1.0';

const cycleFixture = JSON.parse(
  readFileSync(new URL('./fixtures/workspace/cycle.json', import.meta.url), 'utf8'),
);

function createProject(expectedProject) {
  const dependencies = Object.fromEntries(
    expectedProject.runtimeDependencies.map((dependencyName) => [dependencyName, 'workspace:*']),
  );
  const devDependencies = Object.fromEntries(
    expectedProject.developmentDependencies.map((dependencyName) => [
      dependencyName,
      'workspace:*',
    ]),
  );
  const references = expectedProject.runtimeDependencies.map((dependencyName) => {
    const dependencyProject = EXPECTED_PROJECTS.find(
      (candidate) => candidate.name === dependencyName,
    );
    return { path: path.posix.relative(expectedProject.directory, dependencyProject.directory) };
  });

  return {
    directory: expectedProject.directory,
    manifest: {
      name: expectedProject.name,
      version: WORKSPACE_VERSION,
      private: true,
      license: 'MIT',
      type: 'module',
      exports:
        expectedProject.kind === 'application'
          ? {}
          : structuredClone(
              expectedProject.directory === 'packages/config'
                ? EXPECTED_CONFIG_EXPORTS
                : expectedProject.directory === 'packages/ui'
                  ? EXPECTED_UI_EXPORTS
                  : EXPECTED_PACKAGE_EXPORTS,
            ),
      scripts: {
        build:
          expectedProject.directory === 'apps/web'
            ? EXPECTED_WEB_BUILD_SCRIPT
            : 'tsc --build tsconfig.json --pretty false',
        typecheck: 'tsc --build tsconfig.json --pretty false',
      },
      ...(expectedProject.runtimeDependencies.length > 0 ? { dependencies } : {}),
      ...(expectedProject.developmentDependencies.length > 0 ? { devDependencies } : {}),
    },
    typeScriptConfig: {
      extends:
        expectedProject.directory === 'packages/config'
          ? './typescript/tsconfig.base.json'
          : '@workledger/config/typescript/base.json',
      compilerOptions: {
        outDir: 'dist',
        rootDir: 'src',
        tsBuildInfoFile: 'dist/.tsbuildinfo',
      },
      include: ['src/**/*.ts'],
      ...(references.length > 0 ? { references } : {}),
    },
  };
}

function createState() {
  return {
    rootManifest: {
      name: 'workledger',
      version: WORKSPACE_VERSION,
      private: true,
      license: 'MIT',
      type: 'module',
      packageManager: EXPECTED_PACKAGE_MANAGER,
      engines: {
        node: '24.18.x',
        pnpm: '>=11.0.0 <12.0.0',
      },
      devEngines: {
        runtime: {
          name: 'node',
          version: EXPECTED_NODE_VERSION,
          onFail: 'download',
        },
      },
      scripts: {
        'toolchain:check': 'node scripts/check-toolchain.mjs',
        'workspace:check': 'node scripts/check-workspace.mjs',
        'phase:check': 'test command',
        'config:check': 'test command',
        'db:up': 'test command',
        'db:down': 'test command',
        'db:reset': 'test command',
        'db:check': 'test command',
        'db:test': 'test command',
        'db:seed:development': 'test command',
        'db:verify': 'test command',
        format: 'test command',
        'format:check': 'test command',
        lint: 'test command',
        typecheck: 'test command',
        test: 'test command',
        'test:integration': 'test command',
        'test:e2e': 'test command',
        build: 'test command',
      },
    },
    rootTypeScriptConfig: {
      files: [],
      references: EXPECTED_PROJECTS.map(({ directory }) => ({ path: directory })),
    },
    workspaceConfig: EXPECTED_WORKSPACE_CONFIG,
    nodeVersion: EXPECTED_NODE_VERSION,
    hasRootLockfile: true,
    alternateLockfiles: [],
    nestedLockfiles: [],
    missingConfigurationFiles: [],
    projects: EXPECTED_PROJECTS.map(createProject),
  };
}

test('accepts the exact private workspace and tooling graph', () => {
  assert.deepEqual(validateWorkspace(createState()), {
    projectCount: 8,
    runtimeEdgeCount: 8,
    developmentEdgeCount: 11,
  });
});

test('rejects malformed root versions and workspace-version drift', () => {
  const malformedRootVersion = createState();
  malformedRootVersion.rootManifest.version = '0.1';
  assert.throws(
    () => validateWorkspace(malformedRootVersion),
    /root package must use a complete semantic version/,
  );

  const versionDrift = createState();
  const domain = versionDrift.projects.find(({ directory }) => directory === 'packages/domain');
  domain.manifest.version = '0.2.0';
  assert.throws(
    () => validateWorkspace(versionDrift),
    /packages\/domain must use the root package version 0\.1\.0/,
  );
});

test('rejects a missing or unexpected workspace project', () => {
  const missingProject = createState();
  missingProject.projects = missingProject.projects.filter(
    ({ directory }) => directory !== 'apps/api',
  );
  assert.throws(
    () => validateWorkspace(missingProject),
    /Required workspace project apps\/api is missing/,
  );

  const unexpectedProject = createState();
  unexpectedProject.projects.push({
    directory: 'apps/site',
    manifest: {
      name: '@workledger/site',
      version: WORKSPACE_VERSION,
      private: true,
      license: 'MIT',
      type: 'module',
      exports: {},
      scripts: {
        build: 'tsc --build tsconfig.json --pretty false',
        typecheck: 'tsc --build tsconfig.json --pretty false',
      },
    },
    typeScriptConfig: null,
  });
  assert.throws(
    () => validateWorkspace(unexpectedProject),
    /Unexpected workspace project apps\/site is outside the accepted workspace/,
  );
});

test('rejects a TypeScript reference outside the runtime graph', () => {
  const state = createState();
  const web = state.projects.find(({ directory }) => directory === 'apps/web');
  web.typeScriptConfig.references.push({ path: '../api' });

  assert.throws(
    () => validateWorkspace(state),
    /apps\/web TypeScript references must match its runtime dependency graph exactly/,
  );
});

test('rejects a missing shared configuration file', () => {
  const state = createState();
  state.missingConfigurationFiles = ['packages/config/typescript/tsconfig.base.json'];

  assert.throws(
    () => validateWorkspace(state),
    /Required workspace configuration files are missing: packages\/config\/typescript\/tsconfig.base.json/,
  );
});

test('rejects a workspace dependency without the exact workspace-star protocol', () => {
  const state = createState();
  const api = state.projects.find(({ directory }) => directory === 'apps/api');
  api.manifest.dependencies['@workledger/domain'] = '^1.0.0';

  assert.throws(() => validateWorkspace(state), /must declare @workledger\/domain as workspace:\*/);
});

test('rejects public workspace projects and publication hooks', () => {
  const state = createState();
  const domain = state.projects.find(({ directory }) => directory === 'packages/domain');
  domain.manifest.private = false;
  domain.manifest.scripts.publish = 'pnpm publish';

  assert.throws(
    () => validateWorkspace(state),
    /packages\/domain must be private[\s\S]*must not define the npm publication lifecycle script publish/,
  );
});

test('rejects application exports and non-public package entry points', () => {
  const applicationState = createState();
  const web = applicationState.projects.find(({ directory }) => directory === 'apps/web');
  web.manifest.exports = structuredClone(EXPECTED_PACKAGE_EXPORTS);
  assert.throws(() => validateWorkspace(applicationState), /applications are not importable/);

  const packageState = createState();
  const ui = packageState.projects.find(({ directory }) => directory === 'packages/ui');
  ui.manifest.exports['./internal'] = './dist/internal.js';
  assert.throws(() => validateWorkspace(packageState), /accepted explicit public surfaces/);
});

test('rejects an internal edge that ADR-0011 does not allow', () => {
  const state = createState();
  const web = state.projects.find(({ directory }) => directory === 'apps/web');
  web.manifest.dependencies['@workledger/domain'] = 'workspace:*';

  assert.throws(
    () => validateWorkspace(state),
    /apps\/web must not depend on @workledger\/domain in dependencies/,
  );
});

test('rejects workspace dependency cycles', () => {
  const state = createState();
  for (const [directory, manifestChanges] of Object.entries(cycleFixture)) {
    const project = state.projects.find((candidate) => candidate.directory === directory);
    Object.assign(project.manifest, manifestChanges);
  }

  assert.throws(
    () => validateWorkspace(state),
    /Workspace dependency cycle detected: @workledger\/contracts -> @workledger\/domain -> @workledger\/contracts/,
  );
});
