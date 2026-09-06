import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkWorkspaceBoundaries, validateSourceImports } from './check-boundaries.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = path.join(repositoryRoot, 'scripts', 'fixtures', 'import-boundaries');

const negativeFixtures = [
  ['forbidden-edge.ts', 'apps/web', 'src/forbidden-edge.ts', 'forbidden-edge'],
  ['deep-import.ts', 'apps/api', 'src/deep-import.ts', 'deep-import'],
  ['deep-import.tsx', 'apps/web', 'src/deep-import.tsx', 'deep-import'],
  ['application-import.ts', 'apps/api', 'src/application-import.ts', 'application-import'],
  [
    'production-test-utils.ts',
    'apps/api',
    'src/production-test-utils.ts',
    'production-test-utils-import',
  ],
  ['production-config.ts', 'apps/api', 'src/production-config.ts', 'production-config-import'],
  ['sibling-source.ts', 'apps/web', 'src/sibling-source.ts', 'sibling-source-import'],
  ['browser-node.ts', 'apps/web', 'src/browser-node.ts', 'forbidden-node-import'],
];

test('accepts every current workspace source import', async () => {
  assert.deepEqual(await checkWorkspaceBoundaries(repositoryRoot), {
    errors: [],
    fileCount: 372,
    importCount: 2167,
  });
});

test('accepts the web public-root and declared i18n React fixture', async () => {
  const result = await validateSourceImports({
    projectDirectory: 'apps/web',
    relativeFile: 'src/allowed-web.ts',
    repositoryDirectory: repositoryRoot,
    source: await readFile(path.join(fixtureDirectory, 'allowed-web.ts'), 'utf8'),
  });

  assert.deepEqual(result, { errors: [], importCount: 4 });
});

test('allows the i18n pseudo-locale only in test source', async () => {
  const accepted = await validateSourceImports({
    projectDirectory: 'apps/web',
    relativeFile: 'test/pseudo-locale.test.ts',
    repositoryDirectory: repositoryRoot,
    source: "import { initializePseudoI18n } from '@workledger/i18n/testing';",
  });
  const rejected = await validateSourceImports({
    projectDirectory: 'apps/web',
    relativeFile: 'src/pseudo-locale.ts',
    repositoryDirectory: repositoryRoot,
    source: "import { initializePseudoI18n } from '@workledger/i18n/testing';",
  });

  assert.deepEqual(accepted, { errors: [], importCount: 1 });
  assert.equal(rejected.errors[0]?.code, 'production-i18n-testing-import');
});

test('allows explicit Insight contract surfaces without allowing other deep imports', async () => {
  const accepted = await validateSourceImports({
    projectDirectory: 'apps/api',
    relativeFile: 'src/insights.ts',
    repositoryDirectory: repositoryRoot,
    source: "import { insightRequestSchema } from '@workledger/contracts/insights';",
  });
  const acceptedTools = await validateSourceImports({
    projectDirectory: 'apps/api',
    relativeFile: 'src/insight-tools.ts',
    repositoryDirectory: repositoryRoot,
    source: "import { insightToolCallSchema } from '@workledger/contracts/insight-tools';",
  });
  const rejected = await validateSourceImports({
    projectDirectory: 'apps/api',
    relativeFile: 'src/private-contract.ts',
    repositoryDirectory: repositoryRoot,
    source: "import { privateSchema } from '@workledger/contracts/private';",
  });
  const rejectedBrowserTools = await validateSourceImports({
    projectDirectory: 'apps/web',
    relativeFile: 'src/insight-tools.ts',
    repositoryDirectory: repositoryRoot,
    source: "import { insightToolCallSchema } from '@workledger/contracts/insight-tools';",
  });

  assert.deepEqual(accepted, { errors: [], importCount: 1 });
  assert.deepEqual(acceptedTools, { errors: [], importCount: 1 });
  assert.equal(rejected.errors[0]?.code, 'deep-import');
  assert.equal(rejectedBrowserTools.errors[0]?.code, 'deep-import');
});

for (const [fixtureName, projectDirectory, relativeFile, expectedCode] of negativeFixtures) {
  test(`rejects the ${expectedCode} fixture`, async () => {
    const result = await validateSourceImports({
      projectDirectory,
      relativeFile,
      repositoryDirectory: repositoryRoot,
      source: await readFile(path.join(fixtureDirectory, fixtureName), 'utf8'),
    });

    assert.equal(result.importCount, 1);
    assert.deepEqual(
      result.errors.map(({ code }) => code),
      [expectedCode],
    );
  });
}
