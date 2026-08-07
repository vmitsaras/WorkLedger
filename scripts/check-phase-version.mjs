import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readWorkspaceState } from './check-workspace.mjs';

export const PHASE_GATES = [
  { phase: 0, taskId: 'WL-012' },
  { phase: 1, taskId: 'WL-108' },
  { phase: 2, taskId: 'WL-211' },
  { phase: 3, taskId: 'WL-309' },
  { phase: 4, taskId: 'WL-407' },
  { phase: 5, taskId: 'WL-506' },
  { phase: 6, taskId: 'WL-607' },
  { phase: 7, taskId: 'WL-706' },
  { phase: 8, taskId: 'WL-806' },
  { phase: 9, taskId: 'WL-907' },
  { phase: 10, taskId: 'WL-1008' },
  { phase: 11, taskId: 'WL-1105' },
];

const WORKSPACE_VERSION_PATTERN = /^0\.(?:0|[1-9]\d*)\.0$/;

function getGateStatus(todo, taskId) {
  const match = todo.match(new RegExp('^- \\[([ xX])\\] `' + taskId + '`', 'm'));

  if (!match) return null;
  return match[1].toLowerCase() === 'x';
}

export function readPhaseVersionState(rootDirectory = process.cwd()) {
  const workspace = readWorkspaceState(rootDirectory);

  return {
    todo: readFileSync(path.join(rootDirectory, 'TODO.md'), 'utf8'),
    rootVersion: workspace.rootManifest.version,
    projectVersions: workspace.projects.map(({ directory, manifest }) => ({
      directory,
      version: manifest?.version,
    })),
  };
}

export function validatePhaseVersion(state) {
  const errors = [];
  let completedPhaseCount = 0;
  let encounteredIncompleteGate = false;

  for (const { phase, taskId } of PHASE_GATES) {
    const completed = getGateStatus(state.todo, taskId);

    if (completed === null) {
      errors.push(`TODO.md must contain a checkbox entry for phase gate ${taskId}.`);
      continue;
    }
    if (completed) {
      if (encounteredIncompleteGate) {
        errors.push(
          `Phase ${phase} gate ${taskId} cannot be complete before an earlier phase gate.`,
        );
      }
      completedPhaseCount += 1;
    } else {
      encounteredIncompleteGate = true;
    }
  }

  const expectedVersion = `0.${completedPhaseCount}.0`;
  if (typeof state.rootVersion !== 'string' || !WORKSPACE_VERSION_PATTERN.test(state.rootVersion)) {
    errors.push('The root package version must use the 0.<minor>.0 phase-release format.');
  } else if (state.rootVersion !== expectedVersion) {
    errors.push(
      `The ${completedPhaseCount} completed phase gate(s) require root version ${expectedVersion}; received ${state.rootVersion}.`,
    );
  }

  for (const { directory, version } of state.projectVersions) {
    if (version !== state.rootVersion) {
      errors.push(`${directory} must use the root package version ${state.rootVersion}.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Phase-version contract failed:\n- ${errors.join('\n- ')}`);
  }

  return { completedPhaseCount, version: state.rootVersion };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    const result = validatePhaseVersion(readPhaseVersionState());
    console.log(
      `Phase-version contract valid: ${result.completedPhaseCount} completed phase gate(s), workspace version ${result.version}.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
