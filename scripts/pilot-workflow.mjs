import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, childExit, deterministicEnvironment } from './workflow-process.mjs';

export const LIFECYCLE = 'synthetic-health-residency-v1';
export const STAGES = {
  qualify: ['qualification'],
  b: ['submission-actions', 'today-posted'],
  c: ['balance-summary', 'balance-projection', 'balance-closing', 'full'],
};
const qualificationFiles = [
  'apps/api/src/config.ts',
  ...[
    'contracts',
    'ollama-adapter',
    'ollama-compatibility',
    'ollama-schema-challenges',
    'ollama-schema-qualification',
    'private-network',
  ].map((name) => `apps/api/src/ai/${name}.ts`),
];

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

export async function sourceHashes() {
  const files = [...qualificationFiles];
  for (const directory of [
    'apps/api/src/insights',
    'apps/api/src/logging',
    'packages/contracts/src',
    'packages/i18n/src',
  ]) {
    for (const file of await readdir(path.join(ROOT, directory), { recursive: true })) {
      if (file.endsWith('.ts')) files.push(`${directory}/${file.replaceAll('\\', '/')}`);
    }
  }
  files.push(
    'apps/api/test/employee-insight-evaluation.integration.test.ts',
    'apps/api/test/fixtures/employee-insight-golden-set.ts',
    'pnpm-lock.yaml',
    'package.json',
    'scripts/pilot-workflow.mjs',
    'scripts/run-pilot.mjs',
    'scripts/workflow-process.mjs',
    'scripts/qualify-ollama-schema.mjs',
    'scripts/schema-qualification-output.mjs',
  );
  const qualification = {};
  const evaluation = {};
  for (const file of [...new Set(files)].sort()) {
    // Normalized source hashes make Git's text checkout conversion irrelevant to provenance.
    evaluation[file] = sha256(
      (await readFile(path.join(ROOT, file), 'utf8')).replaceAll('\r\n', '\n'),
    );
    if (qualificationFiles.includes(file) || file === 'pnpm-lock.yaml')
      qualification[file] = evaluation[file];
    if (file.includes('/src/') && file.endsWith('.ts')) {
      const compiled = file.replace('/src/', '/dist/').replace(/\.ts$/u, '.js');
      evaluation[compiled] = sha256(await readFile(path.join(ROOT, compiled)));
      if (qualificationFiles.includes(file)) qualification[compiled] = evaluation[compiled];
    }
  }
  return { hashMode: 'source-sha256-lf;compiled-sha256', qualification, evaluation };
}

export async function readReference(reference) {
  if (!reference || typeof reference.path !== 'string' || !/^[a-f0-9]{64}$/u.test(reference.sha256))
    throw new Error('Supply an evidence path and exact SHA-256.');
  const content = await readFile(path.resolve(ROOT, reference.path));
  if (sha256(content) !== reference.sha256) throw new Error('Referenced evidence has changed.');
  return JSON.parse(content.toString('utf8'));
}

export function pilotEnvironment(source, candidate, group, directory) {
  const env = deterministicEnvironment(source);
  Object.assign(env, {
    WORKLEDGER_ENVIRONMENT: 'test',
    WORKLEDGER_AI_PROVIDER_MODE: 'ollama',
    WORKLEDGER_OLLAMA_ORIGIN: candidate.origin,
    WORKLEDGER_OLLAMA_MODEL: candidate.model,
    WORKLEDGER_OLLAMA_MODEL_DIGEST: candidate.modelDigest,
    WORKLEDGER_OLLAMA_COMPATIBILITY_PROFILE: candidate.profileId,
    WORKLEDGER_OLLAMA_TIMEOUT_SECONDS: '120',
    WORKLEDGER_OLLAMA_CONCURRENCY: '1',
  });
  if (group === 'qualification') {
    env.WORKLEDGER_RUN_SCHEMA_QUALIFICATION = '1';
    env.WORKLEDGER_QUALIFICATION_OUTPUT_ROOT = directory;
  } else {
    env.WORKLEDGER_RUN_AI_EVALUATION = '1';
    env.WORKLEDGER_AI_EVALUATION_OUTPUT_DIRECTORY = directory;
    if (group !== 'full') {
      env.WORKLEDGER_AI_EVALUATION_SEMANTIC_ID = group;
      env.WORKLEDGER_AI_EVALUATION_RUN_LIMIT = '9';
    }
  }
  return env;
}

/** Coverage and process status are independent; neither can repair the other's failure. */
export function reviewEmployee({ outcome, health, artifact, group, candidate }) {
  const result = {
    runs: artifact?.runs ?? 0,
    failures: artifact?.failures ?? null,
    complete: artifact?.complete ?? false,
  };
  const done = (classification) => ({
    ...result,
    classification,
    passed: classification === 'PASSED',
  });
  if (outcome.interrupted || outcome.signal) return done('INTERRUPTED');
  if (outcome.launchError) return done('LAUNCH_FAILED');
  if (health?.healthPassed === false && result.runs === 0) return done('HEALTH_FAILED_ZERO_CASES');
  if (!artifact) return done('ARTIFACT_MISSING');
  if (health?.healthPassed !== true || health?.identityPassed !== true)
    return done('IDENTITY_OR_HEALTH_INCOMPLETE');
  if (
    artifact.artifactVersion !== 2 ||
    artifact.providerOutputFormat !== 'selection-v1' ||
    artifact.model !== candidate.model ||
    artifact.modelDigest !== candidate.modelDigest
  )
    return done('ARTIFACT_IDENTITY_INVALID');
  const full = group === 'full';
  if (
    artifact.runs !== (full ? 216 : 9) ||
    artifact.complete !== full ||
    (!full && artifact.results.some((row) => row.semanticId !== group))
  )
    return done('COVERAGE_INCOMPLETE');
  if (artifact.failures > 0) return done('SEMANTIC_FAILED');
  if (
    !full &&
    artifact.results.some(
      (row) =>
        row.disposition !== 'GROUNDED' || row.outcome !== 'SUCCESS' || row.errors.length !== 0,
    )
  )
    return done('SEMANTIC_FAILED');
  if (childExit(outcome) !== 0) return done('CHILD_FAILED');
  return done('PASSED');
}

/** One attempt; stop immediately. There is deliberately no retry or resume option. */
export async function executePilot({ stage, invoke, record, unchanged, signal }) {
  if (!Object.hasOwn(STAGES, stage)) throw new Error('Select qualify, b, or c explicitly.');
  const groups = [];
  for (const group of STAGES[stage]) {
    if (signal?.aborted)
      return { passed: false, classification: 'INTERRUPTED', groups, exitCode: 1 };
    if (!(await unchanged()))
      return { passed: false, classification: 'SOURCE_DRIFT', groups, exitCode: 1 };
    const result = await invoke(group);
    groups.push({ group, ...result });
    await record(groups.at(-1));
    if (!result.passed)
      return {
        passed: false,
        classification: result.classification,
        groups,
        exitCode: childExit(result.outcome) || 1,
      };
  }
  const passed = await unchanged();
  return {
    passed,
    classification: passed ? 'PASSED' : 'SOURCE_DRIFT',
    groups,
    exitCode: passed ? 0 : 1,
  };
}
