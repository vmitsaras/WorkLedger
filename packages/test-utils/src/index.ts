import { workspacePackage as contractsPackage } from '@workledger/contracts';
import { workspacePackage as domainPackage } from '@workledger/domain';

export const workspacePackage = '@workledger/test-utils' as const;
export const workspaceDependencies = [contractsPackage, domainPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
