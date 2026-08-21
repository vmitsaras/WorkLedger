import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PHASE_GATES, validatePhaseVersion } from './check-phase-version.mjs';

function createTodo(completedTaskIds) {
  return PHASE_GATES.map(({ phase, taskId }) => {
    const completed = completedTaskIds.has(taskId) ? 'x' : ' ';
    return `- [${completed}] \`${taskId}\` Pass the Phase ${phase} exit gate.`;
  }).join('\n');
}

function createState({ completedTaskIds, rootVersion, projectVersions = [] }) {
  return {
    todo: createTodo(new Set(completedTaskIds)),
    rootVersion,
    projectVersions,
  };
}

test('uses the reconciled UI, workflow-polish, and portfolio gate sequence', () => {
  assert.deepEqual(PHASE_GATES.slice(-3), [
    { phase: 11, taskId: 'WL-1106' },
    { phase: 12, taskId: 'WL-1206' },
    { phase: 13, taskId: 'WL-1305' },
  ]);
});

test('accepts the version assigned to sequentially completed phase gates', () => {
  assert.deepEqual(
    validatePhaseVersion(
      createState({
        completedTaskIds: ['WL-012', 'WL-108'],
        rootVersion: '0.2.0',
        projectVersions: [
          { directory: 'apps/api', version: '0.2.0' },
          { directory: 'packages/domain', version: '0.2.0' },
        ],
      }),
    ),
    { completedPhaseCount: 2, version: '0.2.0' },
  );
});

test('rejects a completed phase gate without its required minor-version bump', () => {
  const state = createState({
    completedTaskIds: ['WL-012', 'WL-108'],
    rootVersion: '0.1.0',
  });

  assert.throws(
    () => validatePhaseVersion(state),
    /2 completed phase gate\(s\) require root version 0\.2\.0; received 0\.1\.0/,
  );
});

test('rejects a skipped phase gate and a workspace version that is not aligned with the root', () => {
  const state = createState({
    completedTaskIds: ['WL-012', 'WL-211'],
    rootVersion: '0.2.0',
    projectVersions: [{ directory: 'packages/ui', version: '0.1.0' }],
  });

  assert.throws(
    () => validatePhaseVersion(state),
    /Phase 2 gate WL-211 cannot be complete before an earlier phase gate[\s\S]*packages\/ui must use the root package version 0\.2\.0/,
  );
});

test('rejects a root version outside the phase-release format', () => {
  const state = createState({ completedTaskIds: ['WL-012'], rootVersion: '1.0.0' });

  assert.throws(
    () => validatePhaseVersion(state),
    /must use the 0\.<minor>\.0 phase-release format/,
  );
});
