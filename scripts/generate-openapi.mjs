import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';

import { createRuntimeConfig } from '../apps/api/dist/config.js';
import { createApiServer } from '../apps/api/dist/server.js';

export const OPENAPI_ARTIFACT_PATH = path.resolve(
  import.meta.dirname,
  '..',
  'openapi',
  'workledger.openapi.json',
);

export async function generateOpenApiArtifact() {
  const app = createApiServer(createRuntimeConfig({ WORKLEDGER_ENVIRONMENT: 'test' }));

  try {
    await app.ready();
    const prettierConfig = await resolveConfig(OPENAPI_ARTIFACT_PATH);
    assert(prettierConfig, 'Cannot resolve the repository Prettier configuration.');
    return format(JSON.stringify(sortJsonValue(app.swagger())), {
      ...prettierConfig,
      parser: 'json',
    });
  } finally {
    await app.close();
  }
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (typeof value !== 'object' || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJsonValue(child)]),
  );
}

async function run() {
  const command = process.argv[2];
  assert(
    command === undefined || command === '--check',
    'Usage: node scripts/generate-openapi.mjs [--check]',
  );

  const generated = await generateOpenApiArtifact();
  const relativePath = path.relative(process.cwd(), OPENAPI_ARTIFACT_PATH);

  if (command === '--check') {
    let tracked;
    try {
      tracked = await readFile(OPENAPI_ARTIFACT_PATH, 'utf8');
    } catch (error) {
      throw new Error(`OpenAPI artifact is missing at ${relativePath}.`, { cause: error });
    }
    assert.equal(
      tracked,
      generated,
      `OpenAPI artifact drift detected at ${relativePath}; run pnpm openapi:generate.`,
    );
    console.log(`OpenAPI artifact is reproducible: ${relativePath}.`);
    return;
  }

  await mkdir(path.dirname(OPENAPI_ARTIFACT_PATH), { recursive: true });
  await writeFile(OPENAPI_ARTIFACT_PATH, generated, 'utf8');
  console.log(`Generated OpenAPI 3.1 artifact: ${relativePath}.`);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
