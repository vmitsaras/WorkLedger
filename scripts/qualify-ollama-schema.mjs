import { createSchemaQualificationOutput } from './schema-qualification-output.mjs';
import { createRuntimeConfig } from '../apps/api/dist/config.js';
import { createOllamaAiProvider } from '../apps/api/dist/ai/ollama-adapter.js';
import { runOllamaSchemaQualification } from '../apps/api/dist/ai/ollama-schema-qualification.js';

try {
  if (process.env.WORKLEDGER_RUN_SCHEMA_QUALIFICATION !== '1') {
    throw new Error('Qualification is not enabled.');
  }
  const config = createRuntimeConfig(process.env).aiProvider;
  if (config.mode !== 'ollama') throw new Error('No candidate configured.');
  const output = await createSchemaQualificationOutput('output/insights');
  process.stdout.write(`${JSON.stringify({ checkpointDirectory: output.directory })}\n`);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  let artifact;
  try {
    artifact = await runOllamaSchemaQualification(config, createOllamaAiProvider(config), {
      signal: controller.signal,
      checkpoint: output.checkpoint,
    });
    await output.finish(artifact);
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
  const path = `${output.directory}/artifact.json`;
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
