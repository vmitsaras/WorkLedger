import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { createRuntimeConfig } from '../apps/api/dist/config.js';
import { createOllamaAiProvider } from '../apps/api/dist/ai/ollama-adapter.js';
import {
  generateEmployeeTopic,
  EMPLOYEE_TOPIC_PROMPT_VERSION,
} from '../apps/api/dist/insights/employee-insight-topics.js';
import {
  topicCases,
  TOPIC_EVALUATION_REPETITIONS,
  reviewTopicEvaluation,
} from './fixtures/employee-topic-evaluation.mjs';
import { readReference, sha256, sourceHashes } from './pilot-workflow.mjs';
import { resolveToolchain } from './workflow-process.mjs';

try {
  resolveToolchain();
  if (process.env.WORKLEDGER_RUN_TOPIC_EVALUATION !== '1' || process.argv.length !== 3)
    throw new Error('Supply the explicit topic run flag and an isolation evidence reference JSON.');
  const isolationReference = JSON.parse(await readFile(process.argv[2], 'utf8'));
  await readReference(isolationReference);
  const config = createRuntimeConfig(process.env).aiProvider;
  if (config.mode !== 'ollama') throw new Error('No candidate configured.');
  const schemaHealthPurpose = 'english-topics-v1';
  const provider = createOllamaAiProvider(config, { schemaHealthPurpose });
  const directory = path.join('output/insights', `english-topics-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const record = async (name, value) =>
    writeFile(path.join(directory, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const hashes = async () => ({
    ...(await sourceHashes()),
    runner: sha256(await readFile('scripts/evaluate-employee-topics.mjs')),
    fixtures: sha256(await readFile('scripts/fixtures/employee-topic-evaluation.mjs')),
  });
  const initialHashes = await hashes();
  await record('started.json', {
    startedAt: new Date().toISOString(),
    config,
    promptVersion: EMPLOYEE_TOPIC_PROMPT_VERSION,
    schemaHealthPurpose,
    isolationReference,
    sourceHashes: initialHashes,
  });
  process.stdout.write(`Topic evaluation evidence: ${directory}\n`);
  const health = await provider.checkHealth();
  await record('health.json', health);
  if (health.status !== 'ready') throw new Error('Health failed; no topic case started.');
  const results = [];
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  try {
    for (const entry of topicCases) {
      for (let repetition = 1; repetition <= TOPIC_EVALUATION_REPETITIONS; repetition += 1) {
        const started = performance.now();
        let correct = false;
        let failure = null;
        try {
          const result = await generateEmployeeTopic(provider, entry.question, controller.signal);
          correct = result.topic === entry.expected;
        } catch {
          failure = 'PROVIDER_OR_VALIDATION_FAILURE';
        }
        const result = {
          id: entry.id,
          repetition,
          correct,
          failure,
          latencyMs: Math.round(performance.now() - started),
        };
        results.push(result);
        await record(`case-${String(results.length).padStart(3, '0')}.json`, result);
        process.stdout.write(`${entry.id}/${repetition}: ${correct ? 'pass' : 'fail'}\n`);
        if (failure !== null || controller.signal.aborted) break;
      }
      if (results.at(-1)?.failure !== null || controller.signal.aborted) break;
    }
  } finally {
    process.off('SIGINT', abort);
    process.off('SIGTERM', abort);
  }
  let identityPassed = true;
  try {
    await provider.checkIdentity();
  } catch {
    identityPassed = false;
  }
  const sourcesUnchanged = isDeepStrictEqual(initialHashes, await hashes());
  const review = reviewTopicEvaluation(results);
  const artifact = {
    ...review,
    passed: review.passed && identityPassed && sourcesUnchanged,
    identityPassed,
    sourcesUnchanged,
    results,
    finishedAt: new Date().toISOString(),
  };
  await record('result.json', artifact);
  process.stdout.write(JSON.stringify({ ...review, passed: artifact.passed, directory }) + '\n');
  if (!artifact.passed) process.exitCode = 1;
} catch {
  process.stderr.write(
    'Topic evaluation stopped. Check local preflight or the immutable evidence directory; no retry is automatic.\n',
  );
  process.exitCode = 1;
}
