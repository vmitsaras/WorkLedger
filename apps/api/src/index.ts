import { workspacePackage as contractsPackage } from '@workledger/contracts';
import { workspacePackage as databasePackage } from '@workledger/database';
import { workspacePackage as domainPackage } from '@workledger/domain';

export const workspacePackage = '@workledger/api' as const;
export const workspaceDependencies = [contractsPackage, databasePackage, domainPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
