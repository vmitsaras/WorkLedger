import { readFile } from 'node:fs/promises';
import { parseOllamaSchemaQualificationArtifact } from '../apps/api/dist/ai/ollama-schema-qualification.js';

try {
  if (process.argv.length !== 3) throw new Error('Expected one artifact path.');
  const artifact = parseOllamaSchemaQualificationArtifact(
    JSON.parse(await readFile(process.argv[2], 'utf8')),
  );
  process.stdout.write(
    `${JSON.stringify({ complete: artifact.complete, runs: artifact.results.length, healthPassed: artifact.healthPassed, identityPassed: artifact.identityPassed })}\n`,
  );
} catch {
  process.stderr.write('Schema qualification artifact review failed.\n');
  process.exitCode = 1;
}
