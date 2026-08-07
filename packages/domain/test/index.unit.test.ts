import { workspaceDependencies, workspacePackage } from '../src/index.js';

test('exposes the domain package boundary identity', () => {
  expect(workspacePackage).toBe('@workledger/domain');
  expect(workspaceDependencies).toEqual([]);
});
