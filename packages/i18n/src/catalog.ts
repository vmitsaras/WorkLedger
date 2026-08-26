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
  'shared.action.goHome': undefined;
  'shared.action.reload': undefined;
  'shared.action.returnHome': undefined;
  'shared.action.tryAgain': undefined;
  'shared.application.startup.description': undefined;
  'shared.application.startup.title': undefined;
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
  'shared.navigation.account': undefined;
  'shared.navigation.brandHome': Readonly<{ organizationName: string }>;
  'shared.navigation.current': undefined;
  'shared.navigation.destination.desktop': Readonly<{ area: string }>;
  'shared.navigation.destination.mobile': Readonly<{ area: string }>;
  'shared.navigation.drawerTitle': undefined;
  'shared.navigation.menu': undefined;
  'shared.navigation.mobileAccount': undefined;
  'shared.navigation.mobileWorkAreas': undefined;
  'shared.navigation.skipToContent': undefined;
  'shared.navigation.workAreas': undefined;
  'shared.navigation.workArea.employee': undefined;
  'shared.navigation.workArea.hr': undefined;
  'shared.navigation.workArea.manager': undefined;
  'shared.navigation.workArea.system': undefined;
  'shared.route.boundary.notFound.description': undefined;
  'shared.route.boundary.notFound.title': undefined;
  'shared.route.boundary.permissionDenied.description': undefined;
  'shared.route.boundary.permissionDenied.title': undefined;
  'shared.route.boundary.unavailable.description': undefined;
  'shared.route.boundary.unavailable.title': undefined;
  'shared.route.boundary.rootUnavailable.description': undefined;
  'shared.route.boundary.rootUnavailable.title': undefined;
  'shared.route.title.approvalInbox': undefined;
  'shared.route.title.audit': undefined;
  'shared.route.title.calendar': undefined;
  'shared.route.title.employees': undefined;
  'shared.route.title.myBalances': undefined;
  'shared.route.title.myTime': undefined;
  'shared.route.title.notifications': undefined;
  'shared.route.title.profile': undefined;
  'shared.route.title.reports': undefined;
  'shared.route.title.requests': undefined;
  'shared.route.title.settingsAbsence': undefined;
  'shared.route.title.settingsHolidays': undefined;
  'shared.route.title.settingsTime': undefined;
  'shared.route.title.systemAccounts': undefined;
  'shared.route.title.systemAudit': undefined;
  'shared.route.title.systemOperations': undefined;
  'shared.route.title.teamCalendar': undefined;
  'shared.route.title.teamStatus': undefined;
  'shared.route.title.teams': undefined;
  'shared.route.title.today': undefined;
}>;

export const MESSAGE_KEYS = [
  'shared.duration.hours',
  'shared.duration.minutes',
  'shared.action.goHome',
  'shared.action.reload',
  'shared.action.returnHome',
  'shared.action.tryAgain',
  'shared.application.startup.description',
  'shared.application.startup.title',
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
  'shared.navigation.account',
  'shared.navigation.brandHome',
  'shared.navigation.current',
  'shared.navigation.destination.desktop',
  'shared.navigation.destination.mobile',
  'shared.navigation.drawerTitle',
  'shared.navigation.menu',
  'shared.navigation.mobileAccount',
  'shared.navigation.mobileWorkAreas',
  'shared.navigation.skipToContent',
  'shared.navigation.workAreas',
  'shared.navigation.workArea.employee',
  'shared.navigation.workArea.hr',
  'shared.navigation.workArea.manager',
  'shared.navigation.workArea.system',
  'shared.route.boundary.notFound.description',
  'shared.route.boundary.notFound.title',
  'shared.route.boundary.permissionDenied.description',
  'shared.route.boundary.permissionDenied.title',
  'shared.route.boundary.unavailable.description',
  'shared.route.boundary.unavailable.title',
  'shared.route.boundary.rootUnavailable.description',
  'shared.route.boundary.rootUnavailable.title',
  'shared.route.title.approvalInbox',
  'shared.route.title.audit',
  'shared.route.title.calendar',
  'shared.route.title.employees',
  'shared.route.title.myBalances',
  'shared.route.title.myTime',
  'shared.route.title.notifications',
  'shared.route.title.profile',
  'shared.route.title.reports',
  'shared.route.title.requests',
  'shared.route.title.settingsAbsence',
  'shared.route.title.settingsHolidays',
  'shared.route.title.settingsTime',
  'shared.route.title.systemAccounts',
  'shared.route.title.systemAudit',
  'shared.route.title.systemOperations',
  'shared.route.title.teamCalendar',
  'shared.route.title.teamStatus',
  'shared.route.title.teams',
  'shared.route.title.today',
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
