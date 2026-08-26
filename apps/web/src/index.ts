import { workspacePackage as contractsPackage } from '@workledger/contracts';
import { workspacePackage as i18nPackage } from '@workledger/i18n';
import { workspacePackage as uiPackage } from '@workledger/ui';

export const workspacePackage = '@workledger/web' as const;
export const workspaceDependencies = [contractsPackage, i18nPackage, uiPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];
