import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { test } from 'node:test';
import { createSchemaQualificationOutput } from './schema-qualification-output.mjs';

async function withDirectory(run) {
  const base = resolve(tmpdir());
  const directory = await mkdtemp(join(base, 'wl-schema-output-'));
  try {
    await run(directory);
  } finally {
    assert.ok(resolve(directory).startsWith(`${base}${sep}wl-schema-output-`));
    await rm(directory, { recursive: true });
  }
}

test('reserves output, preserves immutable checkpoints and refuses final overwrite', async () => {
  await withDirectory(async (root) => {
    const output = await createSchemaQualificationOutput(root);
    assert.deepEqual(await readdir(output.directory), ['reservation.json']);
    const partial = { complete: false, results: [] };
    await output.checkpoint(partial);
    await output.checkpoint({ ...partial, healthPassed: true });
    await output.finish(partial);
    await assert.rejects(output.finish({ complete: true }));
    assert.deepEqual(
      JSON.parse(await readFile(join(output.directory, 'checkpoint-000.json'), 'utf8')),
      partial,
    );
    assert.deepEqual(
      JSON.parse(await readFile(join(output.directory, 'artifact.json'), 'utf8')),
      partial,
    );
    const next = await createSchemaQualificationOutput(root);
    assert.notEqual(next.directory, output.directory);
  });
});

test('fails output reservation before work when the output root is a file', async () => {
  await withDirectory(async (root) => {
    const blocked = join(root, 'not-a-directory');
    await writeFile(blocked, 'unchanged');
    await assert.rejects(createSchemaQualificationOutput(blocked));
    assert.equal(await readFile(blocked, 'utf8'), 'unchanged');
  });
});
