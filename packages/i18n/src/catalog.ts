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
  'auth.activation.action': undefined;
  'auth.activation.actionPending': undefined;
  'auth.activation.description': Readonly<{ maximum: number; minimum: number }>;
  'auth.activation.eyebrow': undefined;
  'auth.activation.invalid.description': undefined;
  'auth.activation.invalid.title': undefined;
  'auth.activation.title': undefined;
  'auth.error.activation.invalid': undefined;
  'auth.error.activation.rateLimited': undefined;
  'auth.error.passwordPolicy': undefined;
  'auth.error.recovery.generic': undefined;
  'auth.error.recovery.rateLimited': undefined;
  'auth.error.reset.invalid': undefined;
  'auth.error.reset.rateLimited': undefined;
  'auth.error.signIn.generic': undefined;
  'auth.error.signIn.invalid': undefined;
  'auth.error.signIn.rateLimited': undefined;
  'auth.field.confirmPassword': undefined;
  'auth.field.email': undefined;
  'auth.field.newPassword': undefined;
  'auth.field.password': undefined;
  'auth.layout.description': undefined;
  'auth.layout.introductionLabel': Readonly<{ organizationName: string }>;
  'auth.layout.skipToContent': undefined;
  'auth.layout.title': undefined;
  'auth.navigation.backToSignIn': undefined;
  'auth.navigation.forgotPassword': undefined;
  'auth.navigation.requestAnotherRecovery': undefined;
  'auth.navigation.returnToSignIn': undefined;
  'auth.notice.accountActivated.message': undefined;
  'auth.notice.accountActivated.title': undefined;
  'auth.notice.passwordReset.message': undefined;
  'auth.notice.passwordReset.title': undefined;
  'auth.notice.sessionExpired.message': undefined;
  'auth.notice.sessionExpired.title': undefined;
  'auth.notice.signedOut.message': undefined;
  'auth.notice.signedOut.title': undefined;
  'auth.recovery.action': undefined;
  'auth.recovery.actionPending': undefined;
  'auth.recovery.complete.description': undefined;
  'auth.recovery.complete.focus': undefined;
  'auth.recovery.complete.title': undefined;
  'auth.recovery.description': undefined;
  'auth.recovery.eyebrow': undefined;
  'auth.recovery.title': undefined;
  'auth.reset.action': undefined;
  'auth.reset.actionPending': undefined;
  'auth.reset.description': Readonly<{ maximum: number; minimum: number }>;
  'auth.reset.invalid.description': undefined;
  'auth.reset.invalid.title': undefined;
  'auth.reset.title': undefined;
  'auth.signIn.action': undefined;
  'auth.signIn.actionPending': undefined;
  'auth.signIn.description': undefined;
  'auth.signIn.eyebrow': undefined;
  'auth.signIn.title': undefined;
  'auth.validation.confirmPasswordRequired': undefined;
  'auth.validation.emailInvalid': undefined;
  'auth.validation.emailRequired': undefined;
  'auth.validation.passwordMismatch': undefined;
  'auth.validation.passwordRequired': undefined;
  'auth.validation.passwordLength': Readonly<{ maximum: number; minimum: number }>;
  'shared.duration.hours': Readonly<{ count: number }>;
  'shared.duration.minutes': Readonly<{ count: number }>;
  'shared.action.close': undefined;
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
  'shared.locale.accountSaveFailedTitle': undefined;
  'shared.locale.accountSavedTitle': undefined;
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
  'shared.pagination.label': undefined;
  'shared.pagination.next': undefined;
  'shared.pagination.previous': undefined;
  'shared.pagination.summary': Readonly<{ current: number; total: number }>;
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
  'shared.signOut.action': undefined;
  'shared.signOut.actionPending': undefined;
  'shared.signOut.failureDescription': undefined;
  'shared.signOut.failureTitle': undefined;
  'shared.profile.account.details': undefined;
  'shared.profile.account.readOnlyHelp': undefined;
  'shared.profile.description': undefined;
  'shared.profile.employee.details': undefined;
  'shared.profile.employee.notLinked': undefined;
  'shared.profile.employee.technicalAccount': undefined;
  'shared.profile.field.applicationRoles': undefined;
  'shared.profile.field.email': undefined;
  'shared.profile.field.employeeNumber': undefined;
  'shared.profile.field.employmentStatus': undefined;
  'shared.profile.field.organization': undefined;
  'shared.profile.loading.description': undefined;
  'shared.profile.loading.title': undefined;
  'shared.profile.noneAssigned': undefined;
  'shared.profile.preference.eyebrow': undefined;
  'shared.profile.preference.title': undefined;
  'shared.profile.role.employee': undefined;
  'shared.profile.role.hrAdministrator': undefined;
  'shared.profile.role.manager': undefined;
  'shared.profile.role.systemAdministrator': undefined;
  'shared.profile.session.current': undefined;
  'shared.profile.session.device': Readonly<{ browser: string; platform: string }>;
  'shared.profile.session.deviceLabels.browser': undefined;
  'shared.profile.session.deviceLabels.chrome': undefined;
  'shared.profile.session.deviceLabels.edge': undefined;
  'shared.profile.session.deviceLabels.firefox': undefined;
  'shared.profile.session.deviceLabels.safari': undefined;
  'shared.profile.session.deviceLabels.unrecognized': undefined;
  'shared.profile.session.expires': Readonly<{ value: string }>;
  'shared.profile.session.lastActive': Readonly<{ value: string }>;
  'shared.profile.session.platform.android': undefined;
  'shared.profile.session.platform.ios': undefined;
  'shared.profile.session.platform.linux': undefined;
  'shared.profile.session.platform.macos': undefined;
  'shared.profile.session.platform.windows': undefined;
  'shared.profile.session.revoke': undefined;
  'shared.profile.session.revoked': Readonly<{ device: string }>;
  'shared.profile.session.signOutCurrent': undefined;
  'shared.profile.session.signingOut': undefined;
  'shared.profile.sessions.description': undefined;
  'shared.profile.sessions.empty.description': undefined;
  'shared.profile.sessions.empty.title': undefined;
  'shared.profile.sessions.title': undefined;
  'shared.profile.status.active': undefined;
  'shared.profile.status.inactive': undefined;
  'shared.profile.status.sessionNotRevoked.description': undefined;
  'shared.profile.status.sessionNotRevoked.freshSession': undefined;
  'shared.profile.status.sessionNotRevoked.sessionExpired': undefined;
  'shared.profile.status.sessionNotRevoked.title': undefined;
  'shared.profile.status.sessionRevoked.title': undefined;
  'shared.profile.title': undefined;
  'shared.profile.unavailable.description': undefined;
  'shared.profile.unavailable.title': undefined;
  'shared.validation.problemTitle': undefined;
  'shared.validation.correctValue': undefined;
  'shared.validation.invalidFormat': undefined;
  'shared.validation.invalidType': undefined;
  'shared.validation.invalidValue': undefined;
  'shared.validation.required': undefined;
  'shared.validation.unknownField': undefined;
  'shared.validation.valueTooLarge': undefined;
  'shared.validation.valueTooSmall': undefined;
}>;

export const MESSAGE_KEYS = [
  'auth.activation.action',
  'auth.activation.actionPending',
  'auth.activation.description',
  'auth.activation.eyebrow',
  'auth.activation.invalid.description',
  'auth.activation.invalid.title',
  'auth.activation.title',
  'auth.error.activation.invalid',
  'auth.error.activation.rateLimited',
  'auth.error.passwordPolicy',
  'auth.error.recovery.generic',
  'auth.error.recovery.rateLimited',
  'auth.error.reset.invalid',
  'auth.error.reset.rateLimited',
  'auth.error.signIn.generic',
  'auth.error.signIn.invalid',
  'auth.error.signIn.rateLimited',
  'auth.field.confirmPassword',
  'auth.field.email',
  'auth.field.newPassword',
  'auth.field.password',
  'auth.layout.description',
  'auth.layout.introductionLabel',
  'auth.layout.skipToContent',
  'auth.layout.title',
  'auth.navigation.backToSignIn',
  'auth.navigation.forgotPassword',
  'auth.navigation.requestAnotherRecovery',
  'auth.navigation.returnToSignIn',
  'auth.notice.accountActivated.message',
  'auth.notice.accountActivated.title',
  'auth.notice.passwordReset.message',
  'auth.notice.passwordReset.title',
  'auth.notice.sessionExpired.message',
  'auth.notice.sessionExpired.title',
  'auth.notice.signedOut.message',
  'auth.notice.signedOut.title',
  'auth.recovery.action',
  'auth.recovery.actionPending',
  'auth.recovery.complete.description',
  'auth.recovery.complete.focus',
  'auth.recovery.complete.title',
  'auth.recovery.description',
  'auth.recovery.eyebrow',
  'auth.recovery.title',
  'auth.reset.action',
  'auth.reset.actionPending',
  'auth.reset.description',
  'auth.reset.invalid.description',
  'auth.reset.invalid.title',
  'auth.reset.title',
  'auth.signIn.action',
  'auth.signIn.actionPending',
  'auth.signIn.description',
  'auth.signIn.eyebrow',
  'auth.signIn.title',
  'auth.validation.confirmPasswordRequired',
  'auth.validation.emailInvalid',
  'auth.validation.emailRequired',
  'auth.validation.passwordMismatch',
  'auth.validation.passwordRequired',
  'auth.validation.passwordLength',
  'shared.duration.hours',
  'shared.duration.minutes',
  'shared.action.close',
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
  'shared.locale.accountSaveFailedTitle',
  'shared.locale.accountSavedTitle',
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
  'shared.pagination.label',
  'shared.pagination.next',
  'shared.pagination.previous',
  'shared.pagination.summary',
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
  'shared.signOut.action',
  'shared.signOut.actionPending',
  'shared.signOut.failureDescription',
  'shared.signOut.failureTitle',
  'shared.profile.account.details',
  'shared.profile.account.readOnlyHelp',
  'shared.profile.description',
  'shared.profile.employee.details',
  'shared.profile.employee.notLinked',
  'shared.profile.employee.technicalAccount',
  'shared.profile.field.applicationRoles',
  'shared.profile.field.email',
  'shared.profile.field.employeeNumber',
  'shared.profile.field.employmentStatus',
  'shared.profile.field.organization',
  'shared.profile.loading.description',
  'shared.profile.loading.title',
  'shared.profile.noneAssigned',
  'shared.profile.preference.eyebrow',
  'shared.profile.preference.title',
  'shared.profile.role.employee',
  'shared.profile.role.hrAdministrator',
  'shared.profile.role.manager',
  'shared.profile.role.systemAdministrator',
  'shared.profile.session.current',
  'shared.profile.session.device',
  'shared.profile.session.deviceLabels.browser',
  'shared.profile.session.deviceLabels.chrome',
  'shared.profile.session.deviceLabels.edge',
  'shared.profile.session.deviceLabels.firefox',
  'shared.profile.session.deviceLabels.safari',
  'shared.profile.session.deviceLabels.unrecognized',
  'shared.profile.session.expires',
  'shared.profile.session.lastActive',
  'shared.profile.session.platform.android',
  'shared.profile.session.platform.ios',
  'shared.profile.session.platform.linux',
  'shared.profile.session.platform.macos',
  'shared.profile.session.platform.windows',
  'shared.profile.session.revoke',
  'shared.profile.session.revoked',
  'shared.profile.session.signOutCurrent',
  'shared.profile.session.signingOut',
  'shared.profile.sessions.description',
  'shared.profile.sessions.empty.description',
  'shared.profile.sessions.empty.title',
  'shared.profile.sessions.title',
  'shared.profile.status.active',
  'shared.profile.status.inactive',
  'shared.profile.status.sessionNotRevoked.description',
  'shared.profile.status.sessionNotRevoked.freshSession',
  'shared.profile.status.sessionNotRevoked.sessionExpired',
  'shared.profile.status.sessionNotRevoked.title',
  'shared.profile.status.sessionRevoked.title',
  'shared.profile.title',
  'shared.profile.unavailable.description',
  'shared.profile.unavailable.title',
  'shared.validation.problemTitle',
  'shared.validation.correctValue',
  'shared.validation.invalidFormat',
  'shared.validation.invalidType',
  'shared.validation.invalidValue',
  'shared.validation.required',
  'shared.validation.unknownField',
  'shared.validation.valueTooLarge',
  'shared.validation.valueTooSmall',
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
