import { workspacePackage as contractsPackage } from '@workledger/contracts';
import { workspacePackage as uiPackage } from '@workledger/ui';

export const workspacePackage = '@workledger/web' as const;
export const workspaceDependencies = [contractsPackage, uiPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
