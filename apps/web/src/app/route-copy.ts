import type { MessageKey } from '@workledger/i18n';

export const CANONICAL_ROUTE_MESSAGE_KEYS = Object.freeze({
  '/approvals': 'shared.route.title.approvalInbox',
  '/audit': 'shared.route.title.audit',
  '/calendar': 'shared.route.title.calendar',
  '/employees': 'shared.route.title.employees',
  '/insights': 'shared.route.title.insights',
  '/my-balances': 'shared.route.title.myBalances',
  '/my-time': 'shared.route.title.myTime',
  '/notifications': 'shared.route.title.notifications',
  '/profile': 'shared.route.title.profile',
  '/reports': 'shared.route.title.reports',
  '/requests': 'shared.route.title.requests',
  '/settings/absence': 'shared.route.title.settingsAbsence',
  '/settings/holidays': 'shared.route.title.settingsHolidays',
  '/settings/time': 'shared.route.title.settingsTime',
  '/system/accounts': 'shared.route.title.systemAccounts',
  '/system/audit': 'shared.route.title.systemAudit',
  '/system/operations': 'shared.route.title.systemOperations',
  '/team': 'shared.route.title.teamStatus',
  '/team-calendar': 'shared.route.title.teamCalendar',
  '/teams': 'shared.route.title.teams',
  '/today': 'shared.route.title.today',
} as const);

export type CanonicalRoutePath = keyof typeof CANONICAL_ROUTE_MESSAGE_KEYS;

export function canonicalRouteMessageKey(path: CanonicalRoutePath): MessageKey {
  return CANONICAL_ROUTE_MESSAGE_KEYS[path];
}

/** Temporary English bridge for workflow pages that are owned by WL-1405 and WL-1406. */
export const CANONICAL_ROUTE_LABELS = Object.freeze({
  '/approvals': 'Approval inbox',
  '/audit': 'Domain audit',
  '/calendar': 'Calendar',
  '/employees': 'Employees',
  '/insights': 'Insights',
  '/my-balances': 'My balances',
  '/my-time': 'My time',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/reports': 'Reports',
  '/requests': 'My requests',
  '/settings/absence': 'Absence settings',
  '/settings/holidays': 'Holiday calendars',
  '/settings/time': 'Time settings',
  '/system/accounts': 'Accounts and sessions',
  '/system/audit': 'Technical audit',
  '/system/operations': 'Operations',
  '/team': 'Team status',
  '/team-calendar': 'Team calendar',
  '/teams': 'Teams',
  '/today': 'Today',
} as const);

export function canonicalRouteLabel(path: CanonicalRoutePath): string {
  return CANONICAL_ROUTE_LABELS[path];
}
