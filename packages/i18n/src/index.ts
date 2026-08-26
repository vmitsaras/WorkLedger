import { workspacePackage as contractsPackage } from '@workledger/contracts';

export const workspacePackage = '@workledger/i18n' as const;
export const workspaceDependencies = [contractsPackage] as const;

export type WorkspacePackageName = typeof workspacePackage;
export type WorkspaceDependencyName = (typeof workspaceDependencies)[number];

export {
  CATALOG_NAMESPACES,
  MESSAGE_KEYS,
  toRuntimeMessageKey,
  type CatalogNamespace,
  type CatalogResource,
  type CatalogTree,
  type LoadedCatalog,
  type MessageArguments,
  type MessageKey,
  type MessageParameterMap,
  type MessageParameters,
  type MessageValue,
} from './catalog.js';
export {
  formatDateOnly,
  formatDuration,
  formatInstant,
  formatList,
  formatNumber,
} from './format.js';
export { loadCatalog } from './load-catalog.js';
export { initializeLocale, type LocaleRuntime } from './locale-runtime.js';
export {
  LOCALE_DIRECTIONS,
  UnsupportedLocaleError,
  getLocaleDirection,
  isProductionLocale,
  matchBrowserLocale,
  requireSupportedLocale,
  resolveSignedOutLocale,
  type LocaleResolutionSource,
  type SignedOutLocaleResolution,
  type TextDirection,
} from './locale.js';
export { initializeI18n, translate, type I18nRuntime } from './runtime.js';
