import { workspaceDependencies, workspacePackage } from '../src/index.js';

test('exposes the contracts package boundary identity', () => {
  expect(workspacePackage).toBe('@workledger/contracts');
  expect(workspaceDependencies).toEqual([]);
});
