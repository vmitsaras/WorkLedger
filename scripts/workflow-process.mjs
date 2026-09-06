import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));

export function deterministicEnvironment(source) {
  const env = Object.fromEntries(
    Object.entries(source).filter(
      ([key]) =>
        !/^(WORKLEDGER_(RUN_AI_EVALUATION|RUN_TOPIC_EVALUATION|RUN_SCHEMA_QUALIFICATION|AI_EVALUATION_.*|AI_PROVIDER_MODE|OLLAMA_.*))$/iu.test(
          key,
        ),
    ),
  );
  return {
    ...env,
    WORKLEDGER_RUN_AI_EVALUATION: '0',
    WORKLEDGER_RUN_TOPIC_EVALUATION: '0',
    WORKLEDGER_RUN_SCHEMA_QUALIFICATION: '0',
    WORKLEDGER_AI_PROVIDER_MODE: 'disabled',
  };
}

/** Check real executables, not the possibly stale user-agent string. Never installs tools. */
export function resolveToolchain({
  env = process.env,
  node = process.execPath,
  probe = spawnSync,
} = {}) {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const expectedNode = `v${manifest.devEngines.runtime.version}`;
  const expectedPnpm = manifest.packageManager.slice('pnpm@'.length);
  const nodePath = realpathSync(node);
  const pnpmPath = env.WORKLEDGER_PNPM_PATH ?? env.npm_execpath;
  if (!pnpmPath || !path.isAbsolute(pnpmPath) || /\.(cmd|bat|ps1)$/iu.test(pnpmPath)) {
    throw new Error(
      'Use pinned pnpm run, or set WORKLEDGER_PNPM_PATH to the installed pnpm.cjs or native executable.',
    );
  }
  const pnpm = realpathSync(pnpmPath);
  const pnpmCommand = /\.(c?js|mjs)$/iu.test(pnpm) ? [nodePath, [pnpm]] : [pnpm, []];
  const options = { cwd: ROOT, env, encoding: 'utf8', windowsHide: true, timeout: 10_000 };
  const nodeResult = probe(nodePath, ['--version'], options);
  const pnpmResult = probe(pnpmCommand[0], [...pnpmCommand[1], '--version'], options);
  if (
    nodeResult.status !== 0 ||
    nodeResult.stdout.trim() !== expectedNode ||
    pnpmResult.status !== 0 ||
    pnpmResult.stdout.trim() !== expectedPnpm
  ) {
    throw new Error(
      `Toolchain mismatch: requires Node ${expectedNode} and pnpm ${expectedPnpm}. Select the manifest-pinned tools before retrying.`,
    );
  }
  const pathKey = Object.keys(env).find((key) => key.toUpperCase() === 'PATH');
  const childEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => key.toUpperCase() !== 'PATH'),
  );
  Object.assign(childEnv, {
    PATH: [
      path.dirname(nodePath),
      path.dirname(pnpm),
      path.join(ROOT, 'node_modules/.bin'),
      env[pathKey] ?? '',
    ].join(path.delimiter),
    npm_execpath: pnpm,
    npm_node_execpath: nodePath,
    npm_config_user_agent: `pnpm/${expectedPnpm} node/${expectedNode} ${process.platform} ${process.arch}`,
    WORKLEDGER_PNPM_PATH: pnpm,
  });
  return {
    node: nodePath,
    pnpm,
    env: childEnv,
    nodeVersion: expectedNode,
    pnpmVersion: expectedPnpm,
  };
}

/** Direct executable + argv only: no shell expansion or PATH-selected nested pnpm. */
export function runChild(command, args, { env, cwd = ROOT, quiet = false, signal } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: quiet ? 'ignore' : 'inherit',
      signal,
    });
    let launchError = false;
    child.once('error', () => {
      launchError = true;
    });
    child.once('close', (code, childSignal) =>
      resolve({
        code,
        signal: childSignal,
        launchError: launchError && !signal?.aborted,
        interrupted: Boolean(signal?.aborted || childSignal),
      }),
    );
  });
}

export function childExit(outcome) {
  return outcome.code === 0 && !outcome.launchError && !outcome.interrupted ? 0 : outcome.code || 1;
}
