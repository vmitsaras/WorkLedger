import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  ROOT,
  childExit,
  deterministicEnvironment,
  resolveToolchain,
  runChild,
} from './workflow-process.mjs';
import { CHECKS, verificationCommands, verify } from './run-verification.mjs';
import {
  STAGES,
  executePilot,
  pilotEnvironment,
  readReference,
  reviewEmployee,
  sha256,
  sourceHashes,
} from './pilot-workflow.mjs';

const success = { code: 0, signal: null, launchError: false, interrupted: false };
const candidate = {
  origin: 'http://127.0.0.1:11435',
  model: 'synthetic',
  modelDigest: 'a'.repeat(64),
  profileId: 'synthetic-profile',
};
const hostileEnv = {
  WORKLEDGER_RUN_AI_EVALUATION: '1',
  WORKLEDGER_RUN_TOPIC_EVALUATION: '1',
  WORKLEDGER_RUN_SCHEMA_QUALIFICATION: '1',
  WORKLEDGER_AI_PROVIDER_MODE: 'ollama',
  WORKLEDGER_OLLAMA_ORIGIN: 'http://stale.invalid',
  WORKLEDGER_AI_EVALUATION_SEMANTIC_ID: 'stale',
  workledger_ai_evaluation_run_limit: '1',
  WORKLEDGER_AI_EVALUATION_OUTPUT_DIRECTORY: 'stale',
  KEEP_ME: 'retained',
};

test('ordinary verification disables every inherited model gate, filter and provider setting', async () => {
  const env = deterministicEnvironment(hostileEnv);
  assert.equal(env.WORKLEDGER_RUN_AI_EVALUATION, '0');
  assert.equal(env.WORKLEDGER_RUN_TOPIC_EVALUATION, '0');
  assert.equal(env.WORKLEDGER_RUN_SCHEMA_QUALIFICATION, '0');
  assert.equal(env.WORKLEDGER_AI_PROVIDER_MODE, 'disabled');
  assert.equal(env.KEEP_ME, 'retained');
  assert.equal(
    Object.keys(env).some((key) => /OLLAMA|AI_EVALUATION_/iu.test(key)),
    false,
  );
  const calls = [];
  const result = await verify({
    checks: ['test:integration'],
    toolchain: { node: process.execPath, env: hostileEnv },
    run: async (command, args, options) => {
      calls.push({ command, args, env: options.env });
      return success;
    },
  });
  assert.equal(result.passed, true);
  assert.ok(
    calls.every(
      (call) =>
        call.command === process.execPath &&
        call.env.WORKLEDGER_RUN_AI_EVALUATION === '0' &&
        call.env.WORKLEDGER_RUN_SCHEMA_QUALIFICATION === '0',
    ),
  );
  assert.ok(calls.at(-1).args.includes('--maxWorkers=2'));
});

test('a failed command keeps its exit code and prevents every later check', async () => {
  const recorded = [];
  const result = await verify({
    checks: CHECKS,
    toolchain: { node: process.execPath, env: {} },
    run: async () => ({ ...success, code: 17 }),
    record: async (value) => recorded.push(value),
  });
  assert.equal(result.exitCode, 17);
  assert.equal(result.passed, false);
  assert.equal(recorded.length, 1);
});

test('invalid stages and checks never launch a child', async () => {
  await assert.rejects(verificationCommands('unknown'), /Unknown/);
  await assert.rejects(
    executePilot({ stage: 'full', invoke: () => assert.fail('must not invoke') }),
    /explicitly/,
  );
});

test('real child adapter preserves exits, reports launch errors and cancellation', async () => {
  assert.equal(
    childExit(await runChild(process.execPath, ['-e', 'process.exit(7)'], { quiet: true })),
    7,
  );
  const missing = await runChild(path.join(ROOT, 'missing-workledger-executable'), [], {
    quiet: true,
  });
  assert.equal(missing.launchError, true);
  assert.notEqual(childExit(missing), 0);
  const controller = new AbortController();
  controller.abort();
  const cancelled = await runChild(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {
    quiet: true,
    signal: controller.signal,
  });
  assert.equal(cancelled.interrupted, true);
  assert.notEqual(childExit(cancelled), 0);
});

test('toolchain probes actual files, ignores forged user agent and preserves executable paths', () => {
  const manifest = JSON.parse(requireManifest());
  const probes = [];
  const toolchain = resolveToolchain({
    env: {
      WORKLEDGER_PNPM_PATH: process.execPath,
      Path: 'stale',
      npm_config_user_agent: 'pnpm/9.15.1',
    },
    probe: (command, args) => {
      probes.push({ command, args });
      return {
        status: 0,
        stdout:
          probes.length === 1
            ? `v${manifest.devEngines.runtime.version}`
            : manifest.packageManager.slice(5),
      };
    },
  });
  assert.equal(probes.length, 2);
  assert.equal(toolchain.env.npm_execpath, toolchain.pnpm);
  assert.equal(toolchain.env.npm_node_execpath, toolchain.node);
  assert.equal(Object.keys(toolchain.env).filter((key) => key.toUpperCase() === 'PATH').length, 1);
  assert.ok(toolchain.env.PATH.startsWith(path.dirname(toolchain.node)));
  assert.throws(
    () =>
      resolveToolchain({
        env: { WORKLEDGER_PNPM_PATH: process.execPath },
        probe: () => ({ status: 0, stdout: '9.15.1' }),
      }),
    /Toolchain mismatch/,
  );
  assert.throws(() => resolveToolchain({ env: {} }), /pinned pnpm/);
});

// Read once outside mock process boundaries; manifest remains the version authority.
import { readFileSync } from 'node:fs';
function requireManifest() {
  return readFileSync(path.join(ROOT, 'package.json'), 'utf8');
}

test('explicit stages set only their model flag, isolate outputs and clear full-run limits', () => {
  for (const group of STAGES.b) {
    const env = pilotEnvironment(hostileEnv, candidate, group, 'unique-output');
    assert.equal(env.WORKLEDGER_RUN_AI_EVALUATION, '1');
    assert.equal(env.WORKLEDGER_RUN_SCHEMA_QUALIFICATION, '0');
    assert.equal(env.WORKLEDGER_AI_EVALUATION_SEMANTIC_ID, group);
    assert.equal(env.WORKLEDGER_AI_EVALUATION_RUN_LIMIT, '9');
    assert.equal(env.WORKLEDGER_AI_EVALUATION_OUTPUT_DIRECTORY, 'unique-output');
  }
  const full = pilotEnvironment(hostileEnv, candidate, 'full', 'full-output');
  assert.equal(
    Object.keys(full).some((key) => /SEMANTIC_ID|RUN_LIMIT/iu.test(key)),
    false,
  );
  const qualification = pilotEnvironment(
    hostileEnv,
    candidate,
    'qualification',
    'qualification-output',
  );
  assert.equal(qualification.WORKLEDGER_RUN_SCHEMA_QUALIFICATION, '1');
  assert.equal(qualification.WORKLEDGER_RUN_AI_EVALUATION, '0');
});

test('B stops at a failed first group, even with exit zero', async () => {
  const calls = [];
  const result = await executePilot({
    stage: 'b',
    unchanged: async () => true,
    record: async () => {},
    invoke: async (group) => {
      calls.push(group);
      return { passed: false, classification: 'SEMANTIC_FAILED', outcome: success };
    },
  });
  assert.deepEqual(calls, ['submission-actions']);
  assert.equal(result.passed, false);
  assert.equal(result.exitCode, 1);
});

test('C keeps preflight separate from full and never continues after a regression', async () => {
  for (const failAt of [0, 1, 2, 3, -1]) {
    const calls = [];
    const result = await executePilot({
      stage: 'c',
      unchanged: async () => true,
      record: async () => {},
      invoke: async (group) => {
        calls.push(group);
        const passed = calls.length - 1 !== failAt;
        return {
          passed,
          classification: passed ? 'PASSED' : 'SEMANTIC_FAILED',
          outcome: { ...success, code: passed ? 0 : 3 },
        };
      },
    });
    assert.deepEqual(calls, failAt < 0 ? STAGES.c : STAGES.c.slice(0, failAt + 1));
    assert.equal(result.passed, failAt < 0);
    assert.equal(result.exitCode, failAt < 0 ? 0 : 3);
  }
});

test('source drift blocks dispatch and cannot become a passing attempt', async () => {
  const result = await executePilot({
    stage: 'b',
    unchanged: async () => false,
    invoke: () => assert.fail('must not invoke'),
  });
  assert.equal(result.classification, 'SOURCE_DRIFT');
  assert.equal(result.passed, false);
});

function review(overrides = {}) {
  return reviewEmployee({
    outcome: success,
    health: { healthPassed: true, identityPassed: true },
    artifact: {
      artifactVersion: 2,
      providerOutputFormat: 'selection-v1',
      model: candidate.model,
      modelDigest: candidate.modelDigest,
      runs: 9,
      failures: 0,
      complete: false,
      results: Array.from({ length: 9 }, () => ({
        semanticId: 'submission-actions',
        disposition: 'GROUNDED',
        outcome: 'SUCCESS',
        errors: [],
      })),
    },
    candidate,
    group: 'submission-actions',
    ...overrides,
  });
}

test('missing artifacts, zero-case health, interruption and child failure never pass', () => {
  assert.equal(review().passed, true);
  assert.equal(review({ artifact: undefined }).classification, 'ARTIFACT_MISSING');
  assert.equal(
    review({ artifact: undefined, health: { healthPassed: false } }).classification,
    'HEALTH_FAILED_ZERO_CASES',
  );
  assert.equal(
    review({ outcome: { ...success, interrupted: true } }).classification,
    'INTERRUPTED',
  );
  assert.equal(review({ outcome: { ...success, code: 4 } }).classification, 'CHILD_FAILED');
  assert.equal(
    review({ outcome: { ...success, launchError: true } }).classification,
    'LAUNCH_FAILED',
  );
  assert.equal(review({ health: { healthPassed: true, identityPassed: false } }).passed, false);
  assert.equal(review({ group: 'full' }).classification, 'COVERAGE_INCOMPLETE');
});

test('strict readers reject duplicate coverage and malformed qualification', async () => {
  const { parseEmployeeInsightEvaluationArtifact } =
    await import('../apps/api/dist/insights/employee-insight-evaluation-artifact.js');
  const { parseOllamaSchemaQualificationArtifact } =
    await import('../apps/api/dist/ai/ollama-schema-qualification.js');
  assert.throws(() =>
    parseEmployeeInsightEvaluationArtifact({ complete: true, runs: 216, results: [] }),
  );
  assert.throws(() => parseOllamaSchemaQualificationArtifact({ complete: true, results: [] }));
  const hashes = await sourceHashes();
  assert.ok(hashes.qualification['apps/api/src/ai/ollama-adapter.ts']);
  assert.ok(hashes.qualification['apps/api/dist/ai/ollama-adapter.js']);
  assert.ok(hashes.evaluation['apps/api/test/fixtures/employee-insight-golden-set.ts']);
  assert.equal(
    hashes.qualification['apps/api/src/insights/employee-insight-interpretation.ts'],
    undefined,
  );
});

test('evidence references detect changed bytes without modifying the original', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'workledger-evidence-'));
  try {
    const file = path.join(directory, 'evidence.json');
    const value = '{"passed":false}\n';
    await writeFile(file, value);
    const reference = { path: file, sha256: sha256(value) };
    assert.deepEqual(await readReference(reference), { passed: false });
    await writeFile(file, '{"passed":true}\n');
    await assert.rejects(readReference(reference), /changed/);
    assert.equal(await readFile(file, 'utf8'), '{"passed":true}\n');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
