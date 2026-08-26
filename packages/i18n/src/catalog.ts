import type { SupportedLocale } from '@workledger/contracts';

export const CATALOG_NAMESPACES = [
  'shared',
  'auth',
  'employee',
  'manager',
  'admin',
  'system',
  'output',
] as const;

export type CatalogNamespace = (typeof CATALOG_NAMESPACES)[number];
export type MessageValue = string | number;

export type MessageParameterMap = Readonly<{
  'shared.duration.hours': Readonly<{ count: number }>;
  'shared.duration.minutes': Readonly<{ count: number }>;
  'shared.i18n.greeting': Readonly<{ name: string }>;
  'shared.i18n.initializing': undefined;
  'shared.i18n.loadError': undefined;
  'shared.locale.accountDescription': undefined;
  'shared.locale.accountSaveFailed': undefined;
  'shared.locale.accountSaved': undefined;
  'shared.locale.deviceDescription': undefined;
  'shared.locale.deviceSaveFailed': undefined;
  'shared.locale.deviceSaved': undefined;
  'shared.locale.invitationDescription': undefined;
  'shared.locale.label': undefined;
}>;

export const MESSAGE_KEYS = [
  'shared.duration.hours',
  'shared.duration.minutes',
  'shared.i18n.greeting',
  'shared.i18n.initializing',
  'shared.i18n.loadError',
  'shared.locale.accountDescription',
  'shared.locale.accountSaveFailed',
  'shared.locale.accountSaved',
  'shared.locale.deviceDescription',
  'shared.locale.deviceSaveFailed',
  'shared.locale.deviceSaved',
  'shared.locale.invitationDescription',
  'shared.locale.label',
] as const satisfies readonly (keyof MessageParameterMap)[];

export type MessageKey = (typeof MESSAGE_KEYS)[number];
export type MessageParameters<Key extends MessageKey> = MessageParameterMap[Key];
export type MessageArguments<Key extends MessageKey> =
  undefined extends MessageParameters<Key>
    ? readonly [parameters?: undefined]
    : readonly [parameters: MessageParameters<Key>];

export type CatalogTree = Readonly<{
  [key: string]: string | CatalogTree;
}>;

export type CatalogResource = Readonly<Record<CatalogNamespace, CatalogTree>>;

export type LoadedCatalog = Readonly<{
  locale: SupportedLocale;
  resources: CatalogResource;
}>;

export function toRuntimeMessageKey(key: MessageKey): string {
  const separatorIndex = key.indexOf('.');
  return `${key.slice(0, separatorIndex)}:${key.slice(separatorIndex + 1)}`;
}
