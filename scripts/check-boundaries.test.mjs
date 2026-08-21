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
    fileCount: 277,
    importCount: 1428,
  });
});

test('accepts the web public-root fixture', async () => {
  const result = await validateSourceImports({
    projectDirectory: 'apps/web',
    relativeFile: 'src/allowed-web.ts',
    repositoryDirectory: repositoryRoot,
    source: await readFile(path.join(fixtureDirectory, 'allowed-web.ts'), 'utf8'),
  });

  assert.deepEqual(result, { errors: [], importCount: 2 });
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
