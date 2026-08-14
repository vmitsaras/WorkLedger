import { expect, test, type Page } from '@playwright/test';

import { expectPageToHaveNoAxeViolations } from '@workledger/test-utils';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const EMPLOYEE_CONTEXT = {
  account: { email: 'emma@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};
const MANAGER_CONTEXT = {
  account: { email: 'maja@northstar.test', name: 'Maja Novak' },
  defaultPath: '/profile',
  employee: { displayName: 'Maja Novak', employeeNumber: 'NS-010', status: 'ACTIVE' },
  navigationAreas: ['MANAGER'],
  organization: { name: 'Northstar Studio' },
  roles: ['MANAGER'],
};
const APPROVAL_TEAM_ID = '123e4567-e89b-42d3-a456-426614174500';
const CORRECTION_APPROVAL_ID = '123e4567-e89b-42d3-a456-426614174501';
const ABSENCE_APPROVAL_ID = '123e4567-e89b-42d3-a456-426614174502';
const APPROVAL_ITEMS = [
  {
    affectedEndDate: '2026-08-12',
    affectedStartDate: '2026-08-12',
    employeeDisplayName: 'Maria Chen',
    id: CORRECTION_APPROVAL_ID,
    kind: 'CORRECTION',
    status: 'ACTION_REQUIRED',
    submittedAt: '2026-08-11T09:30:00Z',
    team: { id: APPROVAL_TEAM_ID, name: 'Client Services' },
    version: 2,
  },
  {
    affectedEndDate: '2026-08-20',
    affectedStartDate: '2026-08-18',
    employeeDisplayName: 'Noah Williams',
    id: ABSENCE_APPROVAL_ID,
    kind: 'ABSENCE',
    status: 'WAITING_ON_EMPLOYEE',
    submittedAt: '2026-08-10T08:15:00Z',
    team: { id: APPROVAL_TEAM_ID, name: 'Client Services' },
    version: 3,
  },
];
const ABSENCE_APPROVAL_DETAIL = {
  absenceTypeName: 'Vacation',
  affectedEndDate: '2026-08-20',
  affectedStartDate: '2026-08-18',
  availableActions: ['APPROVE', 'REQUEST_CHANGES', 'REJECT'],
  availableEntitlementMinutes: 1_920,
  canOverrideNegativeBalance: false,
  coverage: [
    {
      endsAtMinute: null,
      kind: 'FULL_DAY',
      localDate: '2026-08-18',
      minutes: 480,
      startsAtMinute: null,
    },
    {
      endsAtMinute: null,
      kind: 'FULL_DAY',
      localDate: '2026-08-19',
      minutes: 480,
      startsAtMinute: null,
    },
    {
      endsAtMinute: null,
      kind: 'FULL_DAY',
      localDate: '2026-08-20',
      minutes: 480,
      startsAtMinute: null,
    },
  ],
  employeeDisplayName: 'Noah Williams',
  id: ABSENCE_APPROVAL_ID,
  kind: 'ABSENCE',
  projectedRemainingMinutes: 480,
  requestedEntitlementMinutes: 1_440,
  status: 'SUBMITTED',
  submittedAt: '2026-08-10T08:15:00Z',
  version: 3,
  workflow: 'APPROVAL_REQUIRED',
};
const TEAM_STATUS = {
  asOf: '2026-08-14T10:30:45Z',
  localDate: '2026-08-14',
  members: [
    {
      availability: 'WORKING',
      displayName: 'Ari Working',
      hasUnresolvedRecords: true,
      teamName: 'Delivery',
    },
    {
      availability: 'UNAVAILABLE',
      displayName: 'Cleo Away',
      hasUnresolvedRecords: false,
      teamName: null,
    },
  ],
  summary: {
    offWork: 0,
    onBreak: 0,
    total: 2,
    unavailable: 1,
    unresolved: 1,
    working: 1,
  },
  timeZone: 'Europe/Berlin',
};
const TEAM_CALENDAR = {
  days: Array.from(
    { length: 31 },
    (_, index) => `2026-08-${(index + 1).toString().padStart(2, '0')}`,
  ),
  entries: [
    {
      availability: 'UNAVAILABLE',
      coverageKind: 'FULL_DAY',
      employeeDisplayName: 'Maria Chen',
      endsAtMinute: null,
      localDate: '2026-08-12',
      startsAtMinute: null,
      teamName: 'Client Services',
    },
    {
      availability: 'UNAVAILABLE',
      coverageKind: 'SECOND_HALF',
      employeeDisplayName: 'Noah Williams',
      endsAtMinute: null,
      localDate: '2026-08-15',
      startsAtMinute: null,
      teamName: null,
    },
  ],
  leadingEmptyDays: 5,
  month: '2026-08',
  scopeAsOfLocalDate: '2026-08-14',
  timeZone: 'Europe/Berlin',
};
const TODAY_ATTENDANCE = {
  asOf: '2026-08-11T09:30:00Z',
  attendance: {
    activeSince: '2026-08-11T09:15:00Z',
    attendanceRevision: 3,
    state: 'WORKING',
    validActions: ['START_BREAK', 'CLOCK_OUT'],
  },
  calculation: {
    blockers: [],
    estimate: {
      absenceCreditMinutes: 0,
      absenceExpectedReductionMinutes: 0,
      adjustmentMinutes: 0,
      balanceMinutes: -285,
      breakMinutes: 15,
      creditedMinutes: 195,
      expectedMinutes: 480,
      holidayExpectedReductionMinutes: 0,
      scheduledMinutes: 480,
      workedMinutes: 195,
    },
    holidayName: null,
    status: 'PROVISIONAL',
    warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
  },
  localDate: '2026-08-11',
  timeZone: 'Europe/Berlin',
  timeline: [
    {
      id: '123e4567-e89b-42d3-a456-426614174201',
      occurredAt: '2026-08-11T07:00:00Z',
      type: 'CLOCK_IN',
    },
  ],
  timelineTruncated: false,
};

test('signs in through the accessible form and focuses the destination route', async ({ page }) => {
  let authenticated = false;
  await mockContext(page, () => authenticated);
  await page.route('**/api/auth/sign-in/email', async (route) => {
    const body = route.request().postDataJSON() as { email?: unknown; rememberMe?: unknown };
    expect(body.email).toBe('emma@northstar.test');
    expect(body.rememberMe).toBe(false);
    authenticated = true;
    await route.fulfill({ json: { user: { name: 'Emma Reed' } }, status: 200 });
  });

  await page.goto('/sign-in');
  await expect(page).toHaveTitle('Sign in | WorkLedger');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByRole('textbox', { name: 'Email address' }).fill('emma@northstar.test');
  await page.getByLabel('Password').fill('safe employee passphrase 2026');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/today$/u);
  await expect(page).toHaveTitle('Today | WorkLedger');
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
  await expectPageToHaveNoAxeViolations(page);
});

test('uses the unified approval inbox by keyboard with canonical URL, focus, and narrow reflow', async ({
  page,
}) => {
  const approvalQueries: URLSearchParams[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(MANAGER_CONTEXT), status: 200 });
  });
  await page.route('**/v1/approvals*', async (route) => {
    const url = new URL(route.request().url());
    approvalQueries.push(url.searchParams);
    expect(url.searchParams.has('absenceType')).toBe(false);
    expect(url.searchParams.has('employee')).toBe(false);
    expect(url.searchParams.get('type')).not.toBe('SICKNESS');
    expect(url.searchParams.get('type')).not.toBe('VACATION');
    const limit = Number(url.searchParams.get('limit'));
    const pageNumber = Number(url.searchParams.get('page'));
    const items =
      url.searchParams.get('type') === 'CORRECTION' ? APPROVAL_ITEMS.slice(0, 1) : APPROVAL_ITEMS;
    await route.fulfill({
      json: success({
        filterOptions: {
          teams: [{ id: APPROVAL_TEAM_ID, name: 'Client Services' }],
        },
        items,
        pagination: {
          limit,
          page: pageNumber,
          total: 25,
          totalPages: 3,
        },
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });

  await page.goto(
    '/approvals?status=ALL&type=ALL&sort=SUBMITTED_AT&direction=DESC&page=3&limit=10',
  );
  await expect(page).toHaveTitle('Approvals | WorkLedger');
  await expect(page.getByRole('heading', { name: 'Approval inbox' })).toBeFocused();

  const table = page.getByRole('table', { name: /Unified approval inbox/u });
  const scrollRegion = page.getByRole('region', { name: 'Scrollable approval inbox results' });
  await expect(table).toBeVisible();
  await expect(table.locator('caption')).toContainText(
    'Monthly periods link to their dedicated review page; absence subtypes remain hidden.',
  );
  await expect(table.getByRole('columnheader', { name: 'Submitted' })).toHaveAttribute(
    'aria-sort',
    'descending',
  );
  await expect(table.getByText('Absence request')).toBeVisible();
  await expect(
    table.getByRole('link', { name: 'Review correction for Maria Chen' }),
  ).toHaveAttribute('href', `/approvals/${CORRECTION_APPROVAL_ID}`);

  const status = page.getByRole('combobox', { name: 'Queue status' });
  await status.selectOption('ACTION_REQUIRED');
  await expect(status).toHaveValue('ACTION_REQUIRED');
  const category = page.getByRole('combobox', { name: 'Workflow category' });
  await category.selectOption('CORRECTION');
  await expect(category).toHaveValue('CORRECTION');
  const team = page.getByRole('combobox', { name: 'Current team' });
  await team.selectOption(APPROVAL_TEAM_ID);
  await expect(team).toHaveValue(APPROVAL_TEAM_ID);
  const sort = page.getByRole('combobox', { name: 'Sort by' });
  await sort.selectOption('AFFECTED_DATE');
  await expect(sort).toHaveValue('AFFECTED_DATE');
  const direction = page.getByRole('combobox', { name: 'Sort direction' });
  await direction.selectOption('ASC');
  await expect(direction).toHaveValue('ASC');
  await page.getByLabel('Affected from').fill('2026-08-01');
  await page.getByLabel('Affected through').fill('2026-08-31');

  const applyFilters = page.getByRole('button', { name: 'Apply filters' });
  await applyFilters.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/page=1/u);
  await expect(applyFilters).toBeFocused();
  await expect(table.getByRole('columnheader', { name: 'Affected dates' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
    direction: 'ASC',
    from: '2026-08-01',
    limit: '10',
    page: '1',
    sort: 'AFFECTED_DATE',
    status: 'ACTION_REQUIRED',
    team: APPROVAL_TEAM_ID,
    to: '2026-08-31',
    type: 'CORRECTION',
  });

  const nextPage = page.getByRole('button', { name: 'Next page' });
  await nextPage.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/page=2/u);
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  await expect(nextPage).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/page=1/u);
  await expect(page.getByText('Page 1 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeFocused();
  expect(approvalQueries.length).toBeGreaterThanOrEqual(3);

  await page.setViewportSize({ width: 320, height: 900 });
  const filterDisclosure = page.getByText('Show approval filters', { exact: true });
  await expect(filterDisclosure).toBeVisible();
  await expect(status).toBeHidden();
  await expect(page.getByText(/^Applied:/u)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear approval filters' })).toBeVisible();
  await filterDisclosure.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Hide approval filters', { exact: true })).toBeFocused();
  await expect(status).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const tableOverflow = await scrollRegion.evaluate((region) => ({
    clientWidth: region.clientWidth,
    scrollWidth: region.scrollWidth,
  }));
  expect(tableOverflow.scrollWidth).toBeGreaterThan(tableOverflow.clientWidth);
  await expectPageToHaveNoAxeViolations(page);
});

test('opens an authorized report, applies URL filters, and contains its table at narrow width', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const reportQueries: URLSearchParams[] = [];
  const exportBodies: unknown[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(MANAGER_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'r'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/reports', async (route) => {
    await route.fulfill({
      json: success({
        defaultRange: { from: '2026-08-01', to: '2026-08-31' },
        reports: [
          {
            availableSorts: ['EMPLOYEE', 'VALUE'],
            defaultSort: 'EMPLOYEE',
            description: 'Opening, in-range change, and closing flexible-time balances.',
            key: 'flexible-time',
            title: 'Flexible time',
          },
        ],
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });
  await page.route('**/v1/reports/flexible-time/export', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-workledger-csrf']).toBe('r'.repeat(43));
    exportBodies.push(route.request().postDataJSON());
    await route.fulfill({
      body:
        'employee_name,opening_balance_minutes,range_change_minutes,closing_balance_minutes\r\n' +
        "'=2+2,600,30,630\r\n",
      headers: {
        'content-disposition':
          'attachment; filename="workledger-flexible-time-2026-08-10-to-2026-08-20.csv"',
        'content-type': 'text/csv; charset=utf-8',
      },
      status: 200,
    });
  });
  await page.route('**/v1/reports/flexible-time*', async (route) => {
    const url = new URL(route.request().url());
    reportQueries.push(url.searchParams);
    expect(url.searchParams.has('absenceType')).toBe(false);
    expect(url.searchParams.has('employeeName')).toBe(false);
    await route.fulfill({
      json: success({
        generatedAt: '2026-08-14T10:00:00Z',
        key: 'flexible-time',
        pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
        partial: false,
        range: {
          from: url.searchParams.get('from'),
          to: url.searchParams.get('to'),
        },
        rows: [
          {
            closingBalanceMinutes: 630,
            employeeDisplayName: 'Emma Reed',
            kind: 'FLEXIBLE_TIME',
            openingBalanceMinutes: 600,
            rangeChangeMinutes: 30,
          },
          {
            closingBalanceMinutes: -60,
            employeeDisplayName: 'Leon Papas',
            kind: 'FLEXIBLE_TIME',
            openingBalanceMinutes: 0,
            rangeChangeMinutes: -60,
          },
        ],
        scope: 'REPORTS',
        summary: {
          closingBalanceMinutes: 570,
          kind: 'FLEXIBLE_TIME',
          openingBalanceMinutes: 600,
          rangeChangeMinutes: -30,
        },
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'Open flexible time' }).click();
  await expect(page.getByRole('heading', { name: 'Flexible time' })).toBeFocused();
  const table = page.getByRole('table', { name: /Flexible time rows/iu });
  await expect(table.getByRole('row', { name: /Emma Reed/iu })).toBeVisible();

  await page.getByLabel('From').fill('2026-08-10');
  await page.getByLabel('To').fill('2026-08-20');
  await page.getByLabel('Direction').selectOption('DESC');
  await page.getByRole('button', { name: 'Apply report filters' }).click();
  await expect(page).toHaveURL(/from=2026-08-10.*to=2026-08-20/u);
  await expect.poll(() => reportQueries.at(-1)?.get('from')).toBe('2026-08-10');
  expect(Object.fromEntries(reportQueries.at(-1) ?? [])).toEqual({
    direction: 'DESC',
    from: '2026-08-10',
    limit: '20',
    page: '1',
    sort: 'EMPLOYEE',
    to: '2026-08-20',
  });

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    'workledger-flexible-time-2026-08-10-to-2026-08-20.csv',
  );
  expect(exportBodies).toEqual([
    {
      direction: 'DESC',
      from: '2026-08-10',
      sort: 'EMPLOYEE',
      to: '2026-08-20',
    },
  ]);
  await expect(page.getByRole('status', { name: 'Report portability status' })).toContainText(
    'Formula-significant text was prefixed with an apostrophe',
  );

  const region = page.getByRole('region', { name: 'Flexible time report table' });
  await region.focus();
  await expect(region).toBeFocused();
  expect(await region.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(
    page.getByText(/It omits internal identifiers, absence subtype, sickness classification/iu),
  ).toBeVisible();
  await expect(page.getByText(/diagnosis|medical details|private request reason/iu)).toHaveCount(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('records an approval decision with field-linked errors and keyboard-scrollable detail', async ({
  page,
}) => {
  let decided = false;
  let submittedDecision: unknown;
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(MANAGER_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'a'.repeat(43) }), status: 200 });
  });
  await page.route(`**/v1/approvals/${ABSENCE_APPROVAL_ID}`, async (route) => {
    await route.fulfill({
      json: success({
        ...ABSENCE_APPROVAL_DETAIL,
        availableActions: decided ? [] : ABSENCE_APPROVAL_DETAIL.availableActions,
        status: decided ? 'APPROVED' : ABSENCE_APPROVAL_DETAIL.status,
        version: decided ? 4 : ABSENCE_APPROVAL_DETAIL.version,
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/approvals/${ABSENCE_APPROVAL_ID}/decision`, async (route) => {
    submittedDecision = route.request().postDataJSON();
    expect(route.request().headers()['x-workledger-csrf']).toBe('a'.repeat(43));
    decided = true;
    await route.fulfill({
      json: success({ id: ABSENCE_APPROVAL_ID, kind: 'ABSENCE', status: 'APPROVED', version: 4 }),
      status: 200,
    });
  });

  await page.goto(`/approvals/${ABSENCE_APPROVAL_ID}`);
  await expect(page.getByRole('heading', { name: 'Review absence request' })).toBeFocused();
  const coverage = page.getByRole('region', { name: 'Absence coverage' });
  await coverage.focus();
  await expect(coverage).toBeFocused();
  expect(await coverage.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const approve = page.getByRole('button', { name: 'Approve' });
  await approve.focus();
  await page.keyboard.press('Enter');
  const alert = page.getByRole('alert');
  await expect(alert).toBeFocused();
  await expect(alert).toContainText('Enter at least 10 characters');
  const reason = page.getByRole('textbox', { name: 'Decision reason' });
  await expect(reason).toHaveAttribute('aria-invalid', 'true');
  await expect(reason).toHaveAttribute(
    'aria-describedby',
    'approval-decision-reason-help approval-decision-reason-error',
  );
  await reason.fill('Approved after checking the current request and available entitlement.');
  await expect(reason).not.toHaveAttribute('aria-invalid');

  await reason.focus();
  await page.keyboard.press('Tab');
  await expect(approve).toBeFocused();
  const forcedColorStyles = await approve.evaluate((button) => {
    const styles = getComputedStyle(button);
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      outlineColor: styles.outlineColor,
      outlineStyle: styles.outlineStyle,
    };
  });
  expect(forcedColorStyles.borderColor).not.toBe('transparent');
  expect(forcedColorStyles.borderColor).not.toBe(forcedColorStyles.backgroundColor);
  expect(forcedColorStyles.outlineColor).not.toBe('transparent');
  expect(forcedColorStyles.outlineStyle).not.toBe('none');
  await expect(approve).toHaveCSS('transition-duration', '0.001s');
  await page.keyboard.press('Enter');

  const status = page.getByRole('status');
  await expect(status).toBeFocused();
  await expect(status).toHaveText('Approve recorded. The approval is now approved.');
  expect(submittedDecision).toEqual({
    action: 'APPROVE',
    expectedVersion: 3,
    negativeBalanceOverride: false,
    reason: 'Approved after checking the current request and available entitlement.',
  });
  await expect(
    page.getByText('This approval has no action available in its current state.'),
  ).toBeVisible();
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  await expectPageToHaveNoAxeViolations(page);
});

test('reviews and dismisses generic notification history without losing keyboard focus', async ({
  page,
}) => {
  const notificationId = '123e4567-e89b-42d3-a456-426614174601';
  let dismissedAt: string | null = null;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'n'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/me/notifications?*', async (route) => {
    const url = new URL(route.request().url());
    expect(Object.fromEntries(url.searchParams)).toEqual({ limit: '20', page: '1' });
    await route.fulfill({
      json: success({
        items: [
          {
            body: 'An item you submitted needs changes.',
            deliveryStatus: 'FAILED',
            destinationPath: '/requests',
            dismissedAt,
            event: 'ITEM_CHANGES_REQUESTED',
            id: notificationId,
            occurredAt: '2026-08-14T09:30:00Z',
            status: dismissedAt === null ? 'ACTIVE' : 'DISMISSED',
            title: 'Changes requested',
          },
        ],
        pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/me/notifications/${notificationId}/dismiss`, async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-workledger-csrf']).toBe('n'.repeat(43));
    dismissedAt = '2026-08-14T10:00:00Z';
    await route.fulfill({
      json: success({ dismissedAt, id: notificationId, status: 'DISMISSED' }),
      status: 200,
    });
  });

  await page.goto('/notifications');
  await expect(page).toHaveTitle('Notifications | WorkLedger');
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeFocused();
  const history = page.getByRole('list', { name: 'Generic notification history' });
  await expect(history.getByText('Changes requested')).toBeVisible();
  await expect(history.getByText('Delivery failed; in-app record unaffected')).toBeVisible();
  await expect(history.getByRole('link', { name: 'Open requests' })).toHaveAttribute(
    'href',
    '/requests',
  );
  await expect(page.getByText(/sickness|vacation|diagnosis|private reason/iu)).toHaveCount(0);

  const dismiss = history.getByRole('button');
  await expect(dismiss).toHaveAccessibleName('Dismiss notification');
  await dismiss.focus();
  await page.keyboard.press('Enter');
  await expect(dismiss).toHaveText('Dismissed');
  await expect(dismiss).toBeFocused();
  await expect(dismiss).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('status', { name: 'Notification action status' })).toHaveText(
    'Notification dismissed. It remains in your history.',
  );

  await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expectPageToHaveNoAxeViolations(page);
});

test('completes the attendance sequence by keyboard with protected intents and break confirmation', async ({
  page,
}) => {
  let attendanceState: 'OFF_WORK' | 'ON_BREAK' | 'WORKING' = 'OFF_WORK';
  let attendanceRevision = 0;
  const timeline: Array<{ id: string; occurredAt: string; type: string }> = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({
      json: success({
        ...TODAY_ATTENDANCE,
        attendance: {
          activeSince: attendanceState === 'OFF_WORK' ? null : '2026-08-11T09:30:00Z',
          attendanceRevision,
          state: attendanceState,
          validActions:
            attendanceState === 'OFF_WORK'
              ? ['CLOCK_IN']
              : attendanceState === 'WORKING'
                ? ['START_BREAK', 'CLOCK_OUT']
                : ['RESUME', 'CLOCK_OUT'],
        },
        timeline,
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'k'.repeat(43) }) });
  });
  await page.route('**/v1/me/attendance/clock-in', async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('k'.repeat(43));
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/u);
    expect(route.request().postDataJSON()).toEqual({ expectedAttendanceRevision: 0 });
    attendanceState = 'WORKING';
    attendanceRevision = 1;
    timeline.push({
      id: 'punch-clock-in-1',
      occurredAt: '2026-08-11T09:30:00Z',
      type: 'CLOCK_IN',
    });
    await route.fulfill({
      json: success({
        attendanceRevision: 1,
        command: 'CLOCK_IN',
        createdEvents: [{ id: 'punch-clock-in-1', type: 'CLOCK_IN' }],
        occurredAt: '2026-08-11T09:30:00Z',
        resultingState: 'WORKING',
        validActions: ['START_BREAK', 'CLOCK_OUT'],
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/attendance/start-break', async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('k'.repeat(43));
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/u);
    expect(route.request().postDataJSON()).toEqual({
      expectedAttendanceRevision: attendanceRevision,
    });
    attendanceRevision += 1;
    attendanceState = 'ON_BREAK';
    timeline.push({
      id: `punch-break-start-${attendanceRevision}`,
      occurredAt: '2026-08-11T10:00:00Z',
      type: 'BREAK_START',
    });
    await route.fulfill({
      json: success({
        attendanceRevision,
        command: 'START_BREAK',
        createdEvents: [{ id: `punch-break-start-${attendanceRevision}`, type: 'BREAK_START' }],
        occurredAt: '2026-08-11T10:00:00Z',
        resultingState: 'ON_BREAK',
        validActions: ['RESUME', 'CLOCK_OUT'],
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/attendance/end-break', async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('k'.repeat(43));
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/u);
    expect(route.request().postDataJSON()).toEqual({
      expectedAttendanceRevision: attendanceRevision,
    });
    attendanceRevision += 1;
    attendanceState = 'WORKING';
    timeline.push({
      id: `punch-break-end-${attendanceRevision}`,
      occurredAt: '2026-08-11T10:15:00Z',
      type: 'BREAK_END',
    });
    await route.fulfill({
      json: success({
        attendanceRevision,
        command: 'RESUME',
        createdEvents: [{ id: `punch-break-end-${attendanceRevision}`, type: 'BREAK_END' }],
        occurredAt: '2026-08-11T10:15:00Z',
        resultingState: 'WORKING',
        validActions: ['START_BREAK', 'CLOCK_OUT'],
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/attendance/clock-out', async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('k'.repeat(43));
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/u);
    expect(route.request().postDataJSON()).toEqual({
      confirmActiveBreak: true,
      expectedAttendanceRevision: attendanceRevision,
    });
    attendanceRevision += 1;
    attendanceState = 'OFF_WORK';
    const occurredAt = '2026-08-11T10:30:00Z';
    const createdEvents = [
      { id: `punch-break-end-${attendanceRevision}`, type: 'BREAK_END' },
      { id: `punch-clock-out-${attendanceRevision}`, type: 'CLOCK_OUT' },
    ];
    timeline.push(...createdEvents.map((event) => ({ ...event, occurredAt })));
    await route.fulfill({
      json: success({
        attendanceRevision,
        command: 'CLOCK_OUT',
        createdEvents,
        occurredAt,
        resultingState: 'OFF_WORK',
        validActions: ['CLOCK_IN'],
      }),
      status: 200,
    });
  });

  await page.goto('/today');
  const clockInButton = page.getByRole('button', { name: 'Clock in' });
  await clockInButton.focus();
  await page.keyboard.press('Enter');

  const workingHeading = page.getByRole('heading', { name: 'Working' });
  await expect(workingHeading).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Clocked in at');
  await expect(clockInButton).toBeHidden();

  const startBreak = page.getByRole('button', { name: 'Start break' });
  await startBreak.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'On break', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Break started at');

  const resumeWork = page.getByRole('button', { name: 'Resume work' });
  await resumeWork.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Working' })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Resumed work at');

  await page.getByRole('button', { name: 'Start break' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'On break', exact: true })).toBeFocused();
  const clockOut = page.getByRole('button', { name: 'Clock out', exact: true });
  await clockOut.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Clock out while on break?' })).toBeFocused();
  await expect(page.locator('.wl-dialog-modal')).toHaveCSS('opacity', '1');
  await expectPageToHaveNoAxeViolations(page);
  await page.keyboard.press('Escape');
  await expect(clockOut).toBeFocused();

  await page.keyboard.press('Enter');
  const confirmClockOut = page.getByRole('button', { name: 'Close break and clock out' });
  await confirmClockOut.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Off work' })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Clocked out at');
  await expect(page.getByRole('button', { name: 'Clock in' })).toBeVisible();
  await expectPageToHaveNoAxeViolations(page);
});

test('retries a lost clock-in response with one key and one accessible result', async ({
  page,
}) => {
  let attendanceState: 'OFF_WORK' | 'WORKING' = 'OFF_WORK';
  let attendanceRevision = 0;
  const submittedKeys: string[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({
      json: success({
        ...TODAY_ATTENDANCE,
        attendance: {
          activeSince: attendanceState === 'OFF_WORK' ? null : '2026-08-11T09:30:00Z',
          attendanceRevision,
          state: attendanceState,
          validActions:
            attendanceState === 'OFF_WORK' ? ['CLOCK_IN'] : ['START_BREAK', 'CLOCK_OUT'],
        },
        timeline:
          attendanceState === 'OFF_WORK'
            ? []
            : [
                {
                  id: 'punch-clock-in-replay',
                  occurredAt: '2026-08-11T09:30:00Z',
                  type: 'CLOCK_IN',
                },
              ],
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'r'.repeat(43) }) });
  });
  await page.route('**/v1/me/attendance/clock-in', async (route) => {
    submittedKeys.push(route.request().headers()['idempotency-key'] ?? '');
    attendanceState = 'WORKING';
    attendanceRevision = 1;
    if (submittedKeys.length === 1) {
      await route.abort('connectionreset');
      return;
    }
    await route.fulfill({
      json: {
        ...success({
          attendanceRevision: 1,
          command: 'CLOCK_IN',
          createdEvents: [{ id: 'punch-clock-in-replay', type: 'CLOCK_IN' }],
          occurredAt: '2026-08-11T09:30:00Z',
          resultingState: 'WORKING',
          validActions: ['START_BREAK', 'CLOCK_OUT'],
        }),
        meta: { idempotentReplay: true, requestId: REQUEST_ID },
      },
      status: 200,
    });
  });

  await page.goto('/today');
  await page.getByRole('button', { name: 'Clock in' }).click();

  await expect(page.getByRole('heading', { name: 'Working' })).toBeFocused();
  await expect(page.getByRole('status')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('Clocked in at');
  expect(submittedKeys).toHaveLength(2);
  expect(submittedKeys[0]).toMatch(/^[0-9a-f-]{36}$/u);
  expect(submittedKeys[1]).toBe(submittedKeys[0]);
  await expectPageToHaveNoAxeViolations(page);
});

test('does not queue attendance offline and converges before enabling a new action', async ({
  context,
  page,
}) => {
  let attendanceState: 'OFF_WORK' | 'WORKING' = 'OFF_WORK';
  let attendanceRevision = 0;
  let clockInRequests = 0;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({
      json: success({
        ...TODAY_ATTENDANCE,
        attendance: {
          activeSince: attendanceState === 'OFF_WORK' ? null : '2026-08-11T09:30:00Z',
          attendanceRevision,
          state: attendanceState,
          validActions:
            attendanceState === 'OFF_WORK' ? ['CLOCK_IN'] : ['START_BREAK', 'CLOCK_OUT'],
        },
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/attendance/clock-in', async (route) => {
    clockInRequests += 1;
    await route.fulfill({ json: {}, status: 500 });
  });

  await page.goto('/today');
  const clockIn = page.getByRole('button', { name: 'Clock in' });
  await clockIn.focus();
  await context.setOffline(true);
  await expect(page.getByRole('alert')).toContainText(
    'Attendance actions are disabled and will not be queued.',
  );
  await expect(clockIn).toBeDisabled();
  await clockIn.evaluate((button) => button.click());
  expect(clockInRequests).toBe(0);

  attendanceState = 'WORKING';
  attendanceRevision = 1;
  await context.setOffline(false);

  const workingHeading = page.getByRole('heading', { name: 'Working' });
  await expect(workingHeading).toBeFocused();
  await expect(page.getByRole('status')).toContainText(
    'Attendance changed in another tab or device. Current status: working.',
  );
  await expect(page.getByRole('button', { name: 'Start break' })).toBeEnabled();
  expect(clockInRequests).toBe(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('refreshes a focused stale tab when attendance changes on another device', async ({
  page,
}) => {
  let attendanceState: 'OFF_WORK' | 'WORKING' = 'OFF_WORK';
  let attendanceRevision = 0;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({
      json: success({
        ...TODAY_ATTENDANCE,
        attendance: {
          activeSince: attendanceState === 'OFF_WORK' ? null : '2026-08-11T09:30:00Z',
          attendanceRevision,
          state: attendanceState,
          validActions:
            attendanceState === 'OFF_WORK' ? ['CLOCK_IN'] : ['START_BREAK', 'CLOCK_OUT'],
        },
      }),
      status: 200,
    });
  });

  await page.goto('/today');
  const clockIn = page.getByRole('button', { name: 'Clock in' });
  await clockIn.focus();
  attendanceState = 'WORKING';
  attendanceRevision = 1;
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));

  await expect(page.getByRole('heading', { name: 'Working' })).toBeFocused();
  await expect(page.getByRole('status')).toContainText(
    'Attendance changed in another tab or device. Current status: working.',
  );
  await expect(clockIn).toBeHidden();
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps the calculation explanation and event history readable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({
      json: success({
        ...TODAY_ATTENDANCE,
        calculation: {
          blockers: [],
          estimate: {
            ...TODAY_ATTENDANCE.calculation.estimate,
            balanceMinutes: 60,
            breakMinutes: 15,
            creditedMinutes: 60,
            expectedMinutes: 0,
            holidayExpectedReductionMinutes: 480,
            workedMinutes: 60,
          },
          holidayName: 'Donaudampfschifffahrtsgesellschaft Appreciation Day',
          status: 'PROVISIONAL',
          warnings: ['WORK_ON_HOLIDAY', 'WORK_ON_ZERO_EXPECTED_DAY'],
        },
        timeline: [
          ...TODAY_ATTENDANCE.timeline,
          {
            id: '123e4567-e89b-42d3-a456-426614174202',
            occurredAt: '2026-08-11T08:45:00Z',
            type: 'BREAK_START',
          },
          {
            id: '123e4567-e89b-42d3-a456-426614174203',
            occurredAt: '2026-08-11T09:00:00Z',
            type: 'BREAK_END',
          },
        ],
      }),
      status: 200,
    });
  });

  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Why expected time is zero' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Expected time', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Credited time', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Estimated balance', exact: true })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Today’s timeline' }).getByRole('listitem'),
  ).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expectPageToHaveNoAxeViolations(page);
});

test('preserves the Today task order, target sizes, and reflow across supported widths', async ({
  page,
}) => {
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await mockToday(page);
  await page.goto('/today');

  const supportedWidths = [320, 360, 390, 430, 640, 768, 1024, 1280, 1440, 1920];
  for (const width of supportedWidths) {
    await test.step(`${width.toString()}px viewport`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);

      for (const action of ['Start break', 'Clock out']) {
        const bounds = await page.getByRole('button', { name: action, exact: true }).boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds?.width).toBeGreaterThanOrEqual(24);
        expect(bounds?.height).toBeGreaterThanOrEqual(24);
      }
    });
  }

  const headings = await page.getByRole('heading').allTextContents();
  expect(headings[0]).toBe('Today');
  expect(
    await page.evaluate(() => {
      const currentStatus = document.querySelector('#current-status-title')?.closest('section');
      const calculation = document.querySelector('#calculation-title')?.closest('section');
      return (
        currentStatus !== null &&
        calculation !== null &&
        Boolean(
          currentStatus.compareDocumentPosition(calculation) & Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    }),
  ).toBe(true);
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps text, controls, focus, and boundaries perceivable in forced colors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await mockToday(page);

  await page.goto('/today');
  const startBreak = page.getByRole('button', { name: 'Start break' });
  const clockOut = page.getByRole('button', { name: 'Clock out', exact: true });
  await startBreak.focus();
  await page.keyboard.press('Tab');
  await expect(clockOut).toBeFocused();
  await expect(clockOut).toHaveAttribute('data-focus-visible', 'true');
  await expect(page.getByText('Current status', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Warnings' })).toBeVisible();

  const forcedColorStyles = await clockOut.evaluate((button) => {
    const styles = getComputedStyle(button);
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      outlineColor: styles.outlineColor,
      outlineStyle: styles.outlineStyle,
    };
  });
  expect(forcedColorStyles.borderColor).not.toBe('transparent');
  expect(forcedColorStyles.borderColor).not.toBe(forcedColorStyles.backgroundColor);
  expect(forcedColorStyles.outlineColor).not.toBe('transparent');
  expect(forcedColorStyles.outlineStyle).not.toBe('none');
  // Axe's contrast calculation does not resolve Chromium's emulated system colors reliably.
  // Normal-color axe coverage runs in every other critical-flow scenario.
});

test('completes the primary attendance action with touch input', async ({ browser, baseURL }) => {
  if (baseURL === undefined) throw new Error('Playwright baseURL is required for the touch test.');
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  let attendanceState: 'OFF_WORK' | 'WORKING' = 'OFF_WORK';
  let attendanceRevision = 0;
  try {
    await page.route('**/v1/me/context', async (route) => {
      await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
    });
    await page.route('**/v1/me/attendance/today', async (route) => {
      await route.fulfill({
        json: success({
          ...TODAY_ATTENDANCE,
          attendance: {
            activeSince: attendanceState === 'OFF_WORK' ? null : '2026-08-11T09:30:00Z',
            attendanceRevision,
            state: attendanceState,
            validActions:
              attendanceState === 'OFF_WORK' ? ['CLOCK_IN'] : ['START_BREAK', 'CLOCK_OUT'],
          },
          timeline: [],
        }),
        status: 200,
      });
    });
    await page.route('**/v1/me/csrf', async (route) => {
      await route.fulfill({ json: success({ token: 't'.repeat(43) }), status: 200 });
    });
    await page.route('**/v1/me/attendance/clock-in', async (route) => {
      expect(route.request().headers()['x-workledger-csrf']).toBe('t'.repeat(43));
      attendanceState = 'WORKING';
      attendanceRevision = 1;
      await route.fulfill({
        json: success({
          attendanceRevision,
          command: 'CLOCK_IN',
          createdEvents: [{ id: 'touch-clock-in', type: 'CLOCK_IN' }],
          occurredAt: '2026-08-11T09:30:00Z',
          resultingState: 'WORKING',
          validActions: ['START_BREAK', 'CLOCK_OUT'],
        }),
        status: 200,
      });
    });

    await page.goto('/today');
    const clockIn = page.getByRole('button', { name: 'Clock in' });
    const bounds = await clockIn.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds?.width).toBeGreaterThanOrEqual(24);
    expect(bounds?.height).toBeGreaterThanOrEqual(24);
    await clockIn.tap();

    await expect(page.getByRole('heading', { name: 'Working' })).toBeFocused();
    await expect(page.getByRole('status')).toContainText('Clocked in at');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await expectPageToHaveNoAxeViolations(page);
  } finally {
    await context.close();
  }
});

test('captures the reset grant in memory and removes it from browser history immediately', async ({
  page,
}) => {
  await mockContext(page, () => false);
  let submittedToken: unknown;
  await page.route('**/api/auth/reset-password', async (route) => {
    const body = route.request().postDataJSON() as { token?: unknown };
    submittedToken = body.token;
    await route.fulfill({ json: { status: true }, status: 200 });
  });

  await page.goto('/reset-password?token=single-use-reset-grant#fragment');
  await expect(page).toHaveURL(/\/reset-password$/u);
  expect(page.url()).not.toContain('single-use-reset-grant');
  await page.getByLabel('New password', { exact: true }).fill('replacement safe passphrase 2026');
  await page.getByLabel('Confirm new password').fill('replacement safe passphrase 2026');
  await page.getByRole('button', { name: 'Update password' }).click();

  await expect(page).toHaveURL(/\/sign-in$/u);
  expect(submittedToken).toBe('single-use-reset-grant');
  await expect(page.getByRole('status')).toContainText('Your password was updated');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
  await expectPageToHaveNoAxeViolations(page);
});

test('uses a focus-managed responsive navigation drawer without motion dependence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({
      json: success({
        ...EMPLOYEE_CONTEXT,
        navigationAreas: ['EMPLOYEE', 'MANAGER'],
        roles: ['EMPLOYEE', 'MANAGER'],
      }),
    });
  });
  await mockToday(page);
  await page.route('**/v1/team/status', async (route) => {
    await route.fulfill({ json: success(TEAM_STATUS), status: 200 });
  });

  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Navigation' });
  await expect(dialog).toBeFocused();
  await expect(page.locator('.wl-dialog-modal')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.wl-dialog-modal')).toHaveCSS('transform', 'none');
  await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCSS(
    'transition-duration',
    '0.001s',
  );

  await dialog.getByRole('link', { name: 'Team', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Team status' })).toBeFocused();
  await expect(page).toHaveTitle('Team | WorkLedger');
  const teamTable = page.getByRole('table', {
    name: 'Privacy-safe current status for authorized direct reports.',
  });
  await expect(
    teamTable.getByRole('row', { name: /Ari Working Delivery Working Unresolved record/u }),
  ).toBeVisible();
  await expect(
    teamTable.getByRole('row', { name: /Cleo Away No current team Unavailable today/u }),
  ).toBeVisible();
  const teamScrollRegion = page.getByRole('region', { name: 'Scrollable team status' });
  await teamScrollRegion.focus();
  await expect(teamScrollRegion).toBeFocused();
  expect(
    await teamScrollRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByText(/sickness|vacation/iu)).toHaveCount(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('defaults the team calendar to an equivalent agenda on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requestedMonths: string[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(MANAGER_CONTEXT), status: 200 });
  });
  await page.route('**/v1/team/calendar*', async (route) => {
    const url = new URL(route.request().url());
    requestedMonths.push(url.searchParams.get('month') ?? '');
    expect(url.searchParams.has('employee')).toBe(false);
    expect(url.searchParams.has('absenceType')).toBe(false);
    await route.fulfill({ json: success(TEAM_CALENDAR), status: 200 });
  });

  await page.goto('/team-calendar?month=2026-08');
  await expect(page).toHaveTitle('Team calendar | WorkLedger');
  await expect(page.getByRole('heading', { name: 'Team calendar' })).toBeFocused();
  const agenda = page.getByRole('list', { name: 'Team availability agenda for August 2026' });
  await expect(agenda).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(agenda.getByText('Maria Chen')).toBeVisible();
  await expect(agenda.getByText('Unavailable — full day')).toBeVisible();
  await expect(agenda.getByText('Noah Williams')).toBeVisible();
  await expect(agenda.getByText('Unavailable — second half of expected work')).toBeVisible();

  const augustFifteenth = agenda
    .getByRole('heading', { name: /Saturday, August 15, 2026/u })
    .locator('..');
  await augustFifteenth.getByRole('button', { name: 'Select date' }).click();
  await expect(page.getByText('Selected date')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Saturday, August 15, 2026' }).last(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Month grid' }).click();
  const table = page.getByRole('table', { name: /Neutral team unavailability for August 2026/u });
  await expect(table).toBeVisible();
  await expect(table.getByText('Maria Chen')).toBeVisible();
  await expect(table.getByText('Noah Williams')).toBeVisible();
  expect(requestedMonths).toContain('2026-08');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByText(/sickness|vacation|medical/iu)).toHaveCount(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('revokes the current session and removes protected profile data before sign-in', async ({
  page,
}) => {
  let authenticated = true;
  await mockContext(page, () => authenticated);
  await page.route('**/v1/me/profile', async (route) => {
    await route.fulfill({
      json: success({
        ...EMPLOYEE_CONTEXT,
        sessions: [
          {
            createdAt: '2026-08-11T08:00:00Z',
            current: true,
            deviceSummary: 'Chrome on macOS',
            expiresAt: '2026-08-11T20:00:00Z',
            id: '123e4567-e89b-42d3-a456-426614174111',
            lastActiveAt: '2026-08-11T09:00:00Z',
          },
        ],
      }),
    });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(43) }) });
  });
  await page.route('**/v1/me/sessions/*/revoke', async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('c'.repeat(43));
    authenticated = false;
    await route.fulfill({
      json: success({
        revokedCurrentSession: true,
        revokedSessionId: '123e4567-e89b-42d3-a456-426614174111',
      }),
    });
  });

  await page.goto('/profile');
  await expect(page.getByText('NS-001')).toBeVisible();
  await page.getByRole('button', { name: 'Sign out this session' }).click();

  await expect(page).toHaveURL(/\/sign-in$/u);
  await expect(page.getByRole('status')).toContainText('You have signed out');
  await expect(page.getByText('NS-001')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
  await expectPageToHaveNoAxeViolations(page);
});

async function mockContext(page: Page, isAuthenticated: () => boolean): Promise<void> {
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill(
      isAuthenticated()
        ? { json: success(EMPLOYEE_CONTEXT), status: 200 }
        : {
            json: {
              error: {
                code: 'AUTH_REQUIRED',
                message: 'Sign in to continue.',
                requestId: REQUEST_ID,
              },
            },
            status: 401,
          },
    );
  });
  await mockToday(page);
}

async function mockToday(page: Page): Promise<void> {
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({ json: success(TODAY_ATTENDANCE), status: 200 });
  });
}

function success(data: unknown) {
  return { data, meta: { requestId: REQUEST_ID } };
}
