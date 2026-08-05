import { workspacePackage as domainPackage } from '@workledger/domain';

export const workspacePackage = '@workledger/database' as const;
export const workspaceDependencies = [domainPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
