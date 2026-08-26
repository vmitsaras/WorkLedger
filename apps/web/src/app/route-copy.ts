export const CANONICAL_ROUTE_LABELS = Object.freeze({
  '/approvals': 'Approval inbox',
  '/audit': 'Domain audit',
  '/calendar': 'Calendar',
  '/employees': 'Employees',
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

export type CanonicalRoutePath = keyof typeof CANONICAL_ROUTE_LABELS;

export function canonicalRouteLabel(path: CanonicalRoutePath): string {
  return CANONICAL_ROUTE_LABELS[path];
}
