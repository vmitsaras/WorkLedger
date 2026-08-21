export const workspacePackage = '@workledger/ui' as const;
export const workspaceDependencies = [] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];

export { Button, buttonVariants, type ButtonProps } from './components/button.js';
export { Alert, alertVariants, type AlertProps } from './components/alert.js';
export { DataTable, type DataTableProps } from './components/data-table.js';
export { Dialog, type DialogActions, type DialogProps } from './components/dialog.js';
export { Drawer, type DrawerProps } from './components/drawer.js';
export { FoundationPreview } from './components/foundation-preview.js';
export { FilterBar, type FilterBarProps } from './components/filter-bar.js';
export { Link, linkVariants, type LinkProps } from './components/link.js';
export { Pagination, type PaginationProps } from './components/pagination.js';
export { Panel, type PanelProps } from './components/panel.js';
export { RouteState, type RouteStateKind, type RouteStateProps } from './components/route-state.js';
export {
  StatusBadge,
  statusBadgeVariants,
  type StatusBadgeProps,
} from './components/status-badge.js';
export { TextField, type TextFieldProps } from './components/text-field.js';
