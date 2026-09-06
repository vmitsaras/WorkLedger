import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRuntimeConfig } from '../apps/api/dist/config.js';
import { createOllamaAiProvider } from '../apps/api/dist/ai/ollama-adapter.js';
import { runOllamaSchemaQualification } from '../apps/api/dist/ai/ollama-schema-qualification.js';

try {
  if (process.env.WORKLEDGER_RUN_SCHEMA_QUALIFICATION !== '1') {
    throw new Error('Qualification is not enabled.');
  }
  const config = createRuntimeConfig(process.env).aiProvider;
  if (config.mode !== 'ollama') throw new Error('No candidate configured.');
  const artifact = await runOllamaSchemaQualification(config, createOllamaAiProvider(config));
  await mkdir('output/insights', { recursive: true });
  const path = `output/insights/schema-qualification-${randomUUID()}.json`;
  await writeFile(path, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(
    `${JSON.stringify({ artifactPath: path, complete: artifact.complete, runs: artifact.results.length })}\n`,
  );
  if (!artifact.complete) process.exitCode = 1;
} catch {
  process.stderr.write(
    'Schema qualification could not complete; check build, explicit run flag and reviewed configuration.\n',
  );
  process.exitCode = 1;
}
