import { readFile } from 'node:fs/promises';

import { MONTHLY_PERIOD_STATUSES, PERSONAL_REQUEST_ITEM_STATUSES } from '@workledger/contracts';

import { CANONICAL_ROUTE_LABELS, canonicalRouteLabel } from '../src/app/route-copy.js';
import {
  WORKFLOW_STATUSES,
  workflowStatusPresentation,
} from '../src/app/workflow-status-presentation.js';

test('defines one canonical label for every shell destination', () => {
  expect(CANONICAL_ROUTE_LABELS).toEqual({
    '/approvals': 'Approval inbox',
    '/audit': 'Domain audit',
    '/calendar': 'Calendar',
    '/employees': 'Employees',
    '/hr-insights': 'Insights',
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
    '/team-insights': 'Insights',
    '/teams': 'Teams',
    '/today': 'Today',
  });
  expect(canonicalRouteLabel('/requests')).toBe('My requests');
  expect(canonicalRouteLabel('/approvals')).toBe('Approval inbox');
  expect(canonicalRouteLabel('/audit')).toBe('Domain audit');
});

test('assigns every workflow state one stable text and tone', () => {
  expect(WORKFLOW_STATUSES).toEqual([
    ...new Set([...PERSONAL_REQUEST_ITEM_STATUSES, ...MONTHLY_PERIOD_STATUSES]),
  ]);
  expect(workflowStatusPresentation('CHANGES_REQUESTED')).toEqual({
    label: 'Changes requested',
    tone: 'warning',
  });
  expect(workflowStatusPresentation('CANCELLED')).toEqual({
    label: 'Cancelled',
    tone: 'neutral',
  });
  expect(workflowStatusPresentation('WITHDRAWN')).toEqual({
    label: 'Withdrawn',
    tone: 'neutral',
  });
  expect(workflowStatusPresentation('REJECTED')).toEqual({
    label: 'Rejected',
    tone: 'danger',
  });
  expect(workflowStatusPresentation('LOCKED')).toEqual({ label: 'Locked', tone: 'success' });
});

test('keeps route heading focus compact and color independent', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  expect(styles).toContain(':where([data-route-heading], #current-status-title) {');
  expect(styles).toContain('inline-size: fit-content;');
  expect(styles).toContain('max-inline-size: 100%;');
  expect(styles).toContain(':where([data-route-heading], #current-status-title):focus-visible');
  expect(styles).toContain('outline: 3px solid var(--wl-focus-ring);');
});
