export const workspacePackage = '@workledger/ui' as const;
export const workspaceDependencies = [] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];

export { Button, buttonVariants, type ButtonProps } from './components/button.js';
export { Dialog, type DialogProps } from './components/dialog.js';
export { FoundationPreview } from './components/foundation-preview.js';
export { Link, linkVariants, type LinkProps } from './components/link.js';
export { TextField, type TextFieldProps } from './components/text-field.js';
