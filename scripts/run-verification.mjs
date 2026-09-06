import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ROOT,
  childExit,
  deterministicEnvironment,
  resolveToolchain,
  runChild,
} from './workflow-process.mjs';

export const CHECKS = [
  'config:check',
  'openapi:check',
  'format:check',
  'lint',
  'typecheck',
  'test',
  'test:integration',
  'test:e2e',
  'build',
];

export async function verificationCommands(check) {
  if (![...CHECKS, 'workspace:check', 'test:build'].includes(check))
    throw new Error('Unknown verification check.');
  const guards = [
    ['scripts/check-toolchain.mjs'],
    ['scripts/check-workspace.mjs'],
    ['scripts/check-phase-version.mjs'],
  ];
  const build = ['node_modules/typescript/bin/tsc', '--build', '--pretty', 'false', '--force'];
  const vitest = ['node_modules/vitest/vitest.mjs', 'run', '--maxWorkers=2'];
  const commands = {
    'workspace:check': [],
    'test:build': [build],
    'config:check': [build, ['--env-file-if-exists=.env', 'scripts/check-api-runtime-config.mjs']],
    'openapi:check': [build, ['scripts/generate-openapi.mjs', '--check']],
    'format:check': [
      ['node_modules/prettier/bin/prettier.cjs', '--check', '.', '--ignore-unknown'],
    ],
    lint: [
      ['node_modules/eslint/bin/eslint.js', '.', '--max-warnings', '0'],
      ['scripts/check-boundaries.mjs'],
      ['scripts/check-css-contract.mjs'],
    ],
    typecheck: [build],
    test: [
      build,
      [
        'node_modules/typescript/bin/tsc',
        '--ignoreConfig',
        '--noEmit',
        '--target',
        'ES2024',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        '--strict',
        '--skipLibCheck',
        '--types',
        'node,vitest/globals',
        'apps/api/test/employee-insight-evaluation.integration.test.ts',
        'apps/api/test/system-operations.integration.test.ts',
      ],
      [
        '--test',
        '--test-concurrency=2',
        ...(await readdir(path.join(ROOT, 'scripts')))
          .filter((file) => file.endsWith('.test.mjs'))
          .sort()
          .map((file) => `scripts/${file}`),
      ],
      [...vitest, '--project', 'unit', '--project', 'component'],
    ],
    'test:integration': [build, [...vitest, '--project', 'integration']],
    'test:e2e': [build, ['node_modules/@playwright/test/cli.js', 'test', '--workers=2']],
    build: [
      ['scripts/check-i18n.mjs'],
      build,
      ['apps/web/node_modules/vite/bin/vite.js', 'build', 'apps/web'],
      ['scripts/check-web-bundle-budget.mjs'],
      ['scripts/check-workspace-build.mjs'],
    ],
  };
  return [...guards, ...commands[check]];
}

export async function verify({
  checks = CHECKS,
  toolchain,
  run = runChild,
  record = async () => {},
  signal,
}) {
  const env = deterministicEnvironment(toolchain.env);
  const results = [];
  for (const check of checks) {
    for (const [index, args] of (await verificationCommands(check)).entries()) {
      if (signal?.aborted) return { passed: false, exitCode: 1, results };
      const outcome = await run(toolchain.node, args, { env, signal });
      results.push({ check, command: index + 1, ...outcome });
      await record(results.at(-1));
      if (childExit(outcome) !== 0) return { passed: false, exitCode: childExit(outcome), results };
    }
  }
  return { passed: true, exitCode: 0, results };
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args.length === 1 && ![...CHECKS, 'workspace:check', 'test:build'].includes(args[0]))
  )
    throw new Error('Usage: pnpm run verify [check-name]');
  const toolchain = resolveToolchain();
  const directory = path.join(ROOT, 'output/verification', randomUUID());
  await mkdir(directory, { recursive: true });
  console.log(`Verification evidence: ${directory}`);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  let sequence = 0;
  try {
    const result = await verify({
      checks: args.length ? args : CHECKS,
      toolchain,
      signal: controller.signal,
      record: (entry) =>
        writeFile(
          path.join(directory, `${String(sequence++).padStart(3, '0')}.json`),
          `${JSON.stringify(entry)}\n`,
          { flag: 'wx' },
        ),
    });
    await writeFile(
      path.join(directory, 'result.json'),
      `${JSON.stringify({ ...result, nodeVersion: toolchain.nodeVersion, pnpmVersion: toolchain.pnpmVersion, modelExecution: false, databaseConfigured: Boolean(process.env.WORKLEDGER_TEST_DATABASE_URL) }, null, 2)}\n`,
      { flag: 'wx' },
    );
    process.exitCode = result.exitCode;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
