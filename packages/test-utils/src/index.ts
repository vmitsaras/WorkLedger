import { workspacePackage as contractsPackage } from '@workledger/contracts';
import { workspacePackage as domainPackage } from '@workledger/domain';

export * from './accessibility.js';
export * from './api.js';
export * from './clock.js';
export * from './database.js';
export * from './playwright.js';
export * from './postgres.js';

export const workspacePackage = '@workledger/test-utils' as const;
export const workspaceDependencies = [contractsPackage, domainPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
