import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { EXPECTED_PROJECTS } from './check-workspace.mjs';

const repositoryRoot = path.resolve(import.meta.dirname, '..');

for (const expectedProject of EXPECTED_PROJECTS) {
  const entryUrl = pathToFileURL(
    path.join(repositoryRoot, expectedProject.directory, 'dist', 'index.js'),
  );
  const builtEntry = await import(entryUrl.href);

  assert.equal(
    builtEntry.workspacePackage,
    expectedProject.name,
    `${expectedProject.directory} emitted the wrong package identity.`,
  );
  assert.deepEqual(
    builtEntry.workspaceDependencies,
    expectedProject.runtimeDependencies,
    `${expectedProject.directory} emitted the wrong dependency boundary.`,
  );
}

console.log(
  'Workspace build valid: 9 typed entries import successfully through 11 public-root edges.',
);
