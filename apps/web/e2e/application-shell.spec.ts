import { mkdir } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import type { MonthlyPeriod, TodayAttendance } from '@workledger/contracts';
import type {
  InsightNativeResult,
  SystemInsightNativeResult,
} from '@workledger/contracts/insights';
import { COHERENT_TODAY_ATTENDANCE, expectPageToHaveNoAxeViolations } from '@workledger/test-utils';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const EMPLOYEE_CONTEXT = {
  account: { email: 'emma@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  locale: 'en-GB',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};
const MANAGER_CONTEXT = {
  account: { email: 'maja@northstar.test', name: 'Maja Novak' },
  defaultPath: '/profile',
  locale: 'en-GB',
  employee: { displayName: 'Maja Novak', employeeNumber: 'NS-010', status: 'ACTIVE' },
  navigationAreas: ['MANAGER'],
  organization: { name: 'Northstar Studio' },
  roles: ['MANAGER'],
};
const HR_CONTEXT = {
  account: { email: 'priya@northstar.test', name: 'Priya Shah' },
  defaultPath: '/today',
  locale: 'en-GB',
  employee: { displayName: 'Priya Shah', employeeNumber: 'NS-020', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE', 'HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE', 'HR_ADMINISTRATOR'],
};
const SYSTEM_CONTEXT = {
  account: { email: 'system@northstar.test', name: 'System Administrator' },
  defaultPath: '/system/operations',
  locale: 'en-GB',
  employee: null,
  navigationAreas: ['SYSTEM'],
  organization: { name: 'Northstar Studio' },
  roles: ['SYSTEM_ADMINISTRATOR'],
};
const COMBINED_CONTEXT = {
  account: { email: 'alex@northstar.test', name: 'Alex Morgan' },
  defaultPath: '/today',
  locale: 'en-GB',
  employee: { displayName: 'Alex Morgan', employeeNumber: 'NS-099', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE', 'MANAGER', 'HR', 'SYSTEM'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'],
};
const SYSTEM_INSIGHT_SOURCE_CODES = [
  'APPLICATION_MANIFEST',
  'DATABASE_READINESS',
  'HOST_OPERATOR_PROCEDURES',
  'MAIL_ADAPTER_CONFIGURATION',
  'AUTHENTICATION_SECURITY_PROFILE',
] as const;
const SYSTEM_INSIGHT_RESULT: SystemInsightNativeResult = {
  actions: [
    {
      code: 'OPEN_SYSTEM_OPERATIONS',
      destination: 'SYSTEM_OPERATIONS',
      sourceCodes: SYSTEM_INSIGHT_SOURCE_CODES,
    },
  ],
  facts: [
    { code: 'APPLICATION_VERSION', source: 'APPLICATION_MANIFEST', value: '0.15.0' },
    { code: 'SERVICE_HEALTH', source: 'DATABASE_READINESS', value: 'CRITICAL' },
    { code: 'DATABASE_HEALTH', source: 'DATABASE_READINESS', value: 'UNAVAILABLE' },
    { code: 'EXPECTED_SCHEMA_STATUS', source: 'DATABASE_READINESS', value: 'NOT_READY' },
    {
      code: 'BACKUP_MANAGEMENT',
      source: 'HOST_OPERATOR_PROCEDURES',
      value: 'HOST_OPERATOR_MANAGED',
    },
    {
      code: 'MAIL_DELIVERY_CONFIGURATION',
      source: 'MAIL_ADAPTER_CONFIGURATION',
      value: 'NOT_CONFIGURED',
    },
    {
      code: 'SESSION_IDLE_TIMEOUT_MINUTES',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: 30,
    },
    {
      code: 'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: 720,
    },
    {
      code: 'SESSION_FRESH_WINDOW_MINUTES',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: 15,
    },
    {
      code: 'PERSISTENT_REMEMBER_ME',
      source: 'AUTHENTICATION_SECURITY_PROFILE',
      value: false,
    },
  ],
  freshness: { capturedAt: '2026-08-28T12:00:00Z' },
  kind: 'SYSTEM_TECHNICAL_OVERVIEW',
  limitations: [
    {
      code: 'BACKUP_RUNTIME_STATUS_HOST_OWNED',
      material: true,
      source: 'HOST_OPERATOR_PROCEDURES',
    },
  ],
  scope: { kind: 'TECHNICAL_DIAGNOSTICS', workspace: 'SYSTEM' },
  sources: SYSTEM_INSIGHT_SOURCE_CODES.map((code) => ({
    code,
    destination: 'SYSTEM_OPERATIONS',
  })),
  workspace: 'SYSTEM',
};
const APPROVAL_TEAM_ID = '123e4567-e89b-42d3-a456-426614174500';
const CORRECTION_APPROVAL_ID = '123e4567-e89b-42d3-a456-426614174501';
const ABSENCE_APPROVAL_ID = '123e4567-e89b-42d3-a456-426614174502';
const PERSONAL_ABSENCE_ID = '123e4567-e89b-42d3-a456-426614174510';
const PERSONAL_CORRECTION_ID = '123e4567-e89b-42d3-a456-426614174511';
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
const PHASE_13_TEAM_STATUS = {
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
      availability: 'ON_BREAK',
      displayName: 'Bea Break',
      hasUnresolvedRecords: false,
      teamName: 'Delivery',
    },
    {
      availability: 'UNAVAILABLE',
      displayName: 'Cleo Away',
      hasUnresolvedRecords: false,
      teamName: null,
    },
    {
      availability: 'OFF_WORK',
      displayName: 'Dara Finished',
      hasUnresolvedRecords: false,
      teamName: 'Operations',
    },
  ],
  summary: {
    offWork: 1,
    onBreak: 1,
    total: 4,
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
const TODAY_ATTENDANCE: TodayAttendance = COHERENT_TODAY_ATTENDANCE;
const INSIGHT_RESULT: InsightNativeResult = {
  actions: [
    {
      code: 'REVIEW_TODAY',
      destination: 'TODAY',
      period: { date: '2026-08-11', kind: 'DATE' },
      reference: 'action_today',
      sourceReferences: ['source_today'],
    },
  ],
  facts: [
    {
      code: 'TODAY_WORKED_MINUTES',
      qualifiers: ['PROVISIONAL'],
      reference: 'fact_worked',
      sourceReferences: ['source_today'],
      value: { kind: 'MINUTES', value: 450 },
    },
  ],
  freshness: {
    boundaries: [
      {
        kind: 'CALCULATED_THROUGH',
        localDate: '2026-08-11',
        sourceReferences: ['source_today'],
      },
    ],
    capturedAt: '2026-08-11T12:00:00Z',
  },
  kind: 'today-explanation',
  limitations: [
    {
      code: 'TODAY_VALUES_PROVISIONAL',
      material: true,
      reference: 'limit_provisional',
      sourceReferences: ['source_today'],
    },
  ],
  period: { date: '2026-08-11', kind: 'DATE' },
  scope: { kind: 'SELF', workspace: 'EMPLOYEE' },
  sources: [
    {
      destination: 'TODAY',
      kind: 'TODAY_ATTENDANCE',
      period: { date: '2026-08-11', kind: 'DATE' },
      reference: 'source_today',
    },
  ],
  timeZone: 'Europe/Berlin',
  workspace: 'EMPLOYEE',
};
const MANAGER_INSIGHT_RESULT: InsightNativeResult = {
  actions: [
    {
      code: 'OPEN_TEAM_STATUS',
      destination: 'TEAM_STATUS',
      reference: 'action_source_team_status',
      sourceReferences: ['source_team_status'],
    },
  ],
  facts: [
    {
      code: 'TEAM_WORKING_COUNT',
      qualifiers: ['CURRENT'],
      reference: 'fact_team_working_count',
      sourceReferences: ['source_team_status'],
      value: { kind: 'COUNT', value: 2 },
    },
  ],
  freshness: {
    boundaries: [
      {
        kind: 'CALCULATED_THROUGH',
        localDate: '2026-08-28',
        sourceReferences: ['source_team_status'],
      },
    ],
    capturedAt: '2026-08-28T12:00:00Z',
  },
  kind: 'team-coverage',
  limitations: [],
  period: { date: '2026-08-28', kind: 'DATE' },
  scope: { kind: 'CURRENT_DIRECT_REPORTS', workspace: 'MANAGER' },
  sources: [
    {
      destination: 'TEAM_STATUS',
      kind: 'TEAM_STATUS',
      period: { date: '2026-08-28', kind: 'DATE' },
      reference: 'source_team_status',
    },
  ],
  timeZone: 'Europe/Berlin',
  workspace: 'MANAGER',
};
const INSIGHT_INTERPRETATION = {
  locale: 'en-GB' as const,
  statements: [
    {
      actionReferences: ['action_today'],
      factReferences: ['fact_worked'],
      limitationReferences: ['limit_provisional'],
      sourceReferences: ['source_today'],
      text: 'The current authorized evidence explains how recorded work contributes to this result.',
    },
  ],
};
const PHASE_13_TODAY_BASELINE: TodayAttendance = {
  ...COHERENT_TODAY_ATTENDANCE,
  appliedCorrections: [
    {
      correctedWorkedMinutes: 210,
      originalWorkedMinutes: 195,
    },
  ],
  calculation: {
    ...COHERENT_TODAY_ATTENDANCE.calculation,
    estimatedFinishAt: '2026-08-11T15:15:00Z',
    provisional: {
      calculationSources: {
        absenceCreditMinutes: 0,
        absenceExpectedReductionMinutes: 0,
        approvedCorrectionMinutes: 15,
        breakMinutesToday: 30,
        holidayExpectedReductionMinutes: 0,
        otherApprovedAdjustmentMinutes: 0,
        scheduledMinutes: 480,
        workedMinutesToday: 195,
      },
      creditedMinutesToday: 210,
      expectedMinutesToday: 480,
      provisionalDifferenceMinutes: -270,
    },
    remainingExpectedMinutes: 270,
  },
};
const PHASE_13_TODAY_WARNING: TodayAttendance = {
  ...PHASE_13_TODAY_BASELINE,
  calculation: {
    ...PHASE_13_TODAY_BASELINE.calculation,
    attentionItems: [
      {
        affectedDate: '2026-08-10',
        blocksSubmission: false,
        message: { code: 'FLEX_POSITIVE_THRESHOLD_EXCEEDED', parameters: {} },
        recovery: {
          action: 'REVIEW_BALANCE_HISTORY',
          destination: 'MY_BALANCES',
        },
        severity: 'WARNING',
        source: 'POSTED_FLEX_BALANCE',
      },
    ],
  },
};
const PERSONAL_TIME = {
  balance: {
    eligibleProjectedMinutes: 15,
    excludedIncompleteDates: ['2026-08-13'],
    postedBalanceMinutes: 630,
    projectedBalanceMinutes: 645,
  },
  leave: {
    accounts: [],
    ledger: { entries: [], limit: 20, page: 1, total: 0 },
  },
  ledger: {
    entries: [
      {
        balanceAfterMinutes: 630,
        effectiveDate: '2026-08-11',
        entryType: 'DAILY_DELTA',
        explanationCode: 'DAILY_CALCULATION',
        minutes: 30,
        postedAt: '2026-08-11T17:00:00Z',
      },
    ],
    limit: 20,
    page: 1,
    total: 1,
  },
  period: {
    endDate: '2026-08-16',
    monthlyPeriodId: null,
    startDate: '2026-08-10',
    view: 'WEEK',
  },
  records: [
    {
      attention: { blockers: [], warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'] },
      balanceMinutes: 30,
      creditedMinutes: 510,
      expectedMinutes: 480,
      localDate: '2026-08-11',
      recordId: '123e4567-e89b-42d3-a456-426614174301',
      status: 'COMPLETE',
    },
    {
      attention: { blockers: [], warnings: [] },
      balanceMinutes: null,
      creditedMinutes: null,
      expectedMinutes: null,
      localDate: '2026-08-13',
      recordId: '123e4567-e89b-42d3-a456-426614174302',
      status: 'INCOMPLETE',
    },
  ],
  summary: { completeBalanceMinutes: 30, incompleteRecordCount: 1, recordedDayCount: 2 },
  timeZone: 'Europe/Berlin',
};
const PERSONAL_CALENDAR = {
  absences: [
    {
      absenceTypeName: 'Vacation',
      endsAtMinute: null,
      kind: 'FULL_DAY',
      localDate: '2026-08-12',
      startsAtMinute: null,
      status: 'SUBMITTED',
    },
  ],
  days: Array.from(
    { length: 31 },
    (_, index) => `2026-08-${(index + 1).toString().padStart(2, '0')}`,
  ),
  holidays: [{ localDate: '2026-08-15', name: 'Summer holiday' }],
  leadingEmptyDays: 5,
  month: '2026-08',
};
const MONTHLY_PERIOD_ID = '50000000-0000-7000-8000-000000000001';
const READY_MONTHLY_PERIOD = {
  approvedRecord: null,
  availableActions: ['SUBMIT'],
  attention: { blockers: [], warnings: [] },
  employeeDisplayName: 'Emma Reed',
  id: MONTHLY_PERIOD_ID,
  monthEnd: '2026-08-31',
  monthStart: '2026-08-01',
  postLockView: null,
  readiness: {
    completeDateCount: 1,
    coveredDateCount: 1,
    monthEnded: true,
    status: 'READY_FOR_SUBMISSION',
  },
  reviewHistory: [],
  rows: [
    {
      absenceCreditMinutes: 0,
      adjustmentMinutes: 0,
      balanceMinutes: 15,
      breakMinutes: 30,
      creditedMinutes: 495,
      expectedMinutes: 480,
      localDate: '2026-08-31',
      recordId: '47000000-0000-7000-8000-000000000001',
      status: 'COMPLETE',
      workedMinutes: 495,
    },
  ],
  snapshotVersion: { schemaVersion: 1, sourceFingerprint: 'a'.repeat(64) },
  timeZone: 'Europe/Berlin',
  totals: {
    absenceCreditMinutes: 0,
    adjustmentMinutes: 0,
    balanceMinutes: 15,
    breakMinutes: 30,
    creditedMinutes: 495,
    expectedMinutes: 480,
    ledgerClosingBalanceMinutes: 615,
    ledgerOpeningBalanceMinutes: 600,
    ledgerPeriodDeltaMinutes: 15,
    workedMinutes: 495,
  },
  workflow: {
    approvedAt: null,
    lockedAt: null,
    periodVersion: 1,
    status: 'OPEN',
    submittedAt: null,
  },
} as const satisfies MonthlyPeriod;

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/identity', async (route) => {
    await route.fulfill({
      json: success({
        accentColor: '#075985',
        faviconPath: null,
        logoPath: null,
        organizationName: 'Northstar Studio',
      }),
      status: 200,
    });
  });
});

test('preserves shared alert tone colors through the application stylesheet cascade', async ({
  page,
}) => {
  await mockContext(page, () => false);
  await page.goto('/sign-in');

  await page.evaluate(() => {
    for (const tone of ['info', 'success', 'warning', 'danger']) {
      const alert = document.createElement('section');
      alert.className = `wl-alert wl-alert--${tone}`;
      alert.dataset['alertTone'] = tone;
      alert.textContent = `${tone} alert`;
      document.body.append(alert);
    }
  });

  for (const tone of ['info', 'success', 'warning', 'danger'] as const) {
    const resolvedColors = await page
      .locator(`[data-alert-tone="${tone}"]`)
      .evaluate((element, currentTone) => {
        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.inset = '-9999px auto auto -9999px';
        probe.style.backgroundColor = `var(--wl-state-${currentTone}-surface)`;
        probe.style.borderColor = `var(--wl-state-${currentTone}-border)`;
        probe.style.color = `var(--wl-state-${currentTone}-text)`;
        document.body.append(probe);

        const actual = getComputedStyle(element);
        const expected = getComputedStyle(probe);
        const result = {
          actual: {
            background: actual.backgroundColor,
            border: actual.borderLeftColor,
            text: actual.color,
          },
          expected: {
            background: expected.backgroundColor,
            border: expected.borderLeftColor,
            text: expected.color,
          },
        };
        probe.remove();
        return result;
      }, tone);

    expect(resolvedColors.actual).toEqual(resolvedColors.expected);
  }
});

test('persists a bounded signed-out language choice and keeps focus on the selector @browser-matrix', async ({
  page,
}) => {
  await mockContext(page, () => false);
  await page.goto('/sign-in');

  const language = page.getByLabel('Language');
  await language.focus();
  await language.selectOption('de-DE');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(page.getByLabel('Sprache')).toBeFocused();
  await expect(page.getByRole('status')).toContainText(
    'Die Sprache für den abgemeldeten Zustand wurde auf diesem Gerät aktualisiert.',
  );
  expect(await page.evaluate(() => localStorage.getItem('workledger.locale'))).toBe('de-DE');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(page.getByLabel('Sprache')).toHaveValue('de-DE');
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps runtime company identity accessible across broken assets, reflow, forced colors, and print', async ({
  page,
}) => {
  const organizationName =
    'Northstar International Workplace Operations and Employee Services Cooperative';
  await mockContext(page, () => false);
  await page.route('**/v1/identity', async (route) => {
    await route.fulfill({
      json: success({
        accentColor: '#14532d',
        faviconPath: '/identity/configured-favicon.svg',
        logoPath: '/identity/configured-logo.webp',
        organizationName,
      }),
      status: 200,
    });
  });
  await page.route('**/identity/configured-logo.webp', async (route) => {
    await route.fulfill({ body: 'missing', contentType: 'text/plain', status: 404 });
  });
  await page.route('**/identity/configured-favicon.svg', async (route) => {
    await route.fulfill({ body: 'missing', contentType: 'text/plain', status: 404 });
  });
  await page.setViewportSize({ width: 320, height: 720 });

  await page.goto('/sign-in');
  await expect(page.getByText(organizationName)).toBeVisible();
  await expect(page.locator('.wl-company-fallback-mark')).toHaveText('N');
  await expect(page.locator('#workledger-favicon')).toHaveAttribute(
    'href',
    '/workledger-favicon.svg',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expectPageToHaveNoAxeViolations(page);

  await page.emulateMedia({ forcedColors: 'active' });
  const forcedMark = await page.locator('.wl-company-fallback-mark').evaluate((mark) => {
    const styles = getComputedStyle(mark);
    return { background: styles.backgroundColor, border: styles.borderColor };
  });
  expect(forcedMark.border).not.toBe('transparent');
  expect(forcedMark.border).not.toBe(forcedMark.background);

  await page.emulateMedia({ forcedColors: 'none', media: 'print' });
  await expect(page.getByText(organizationName)).toBeVisible();
});

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
  await page.setViewportSize({ width: 1440, height: 900 });
  await capturePhase11Surface(page, 'sign-in-desktop-1440x900');
  await page.setViewportSize({ width: 390, height: 844 });
  await capturePhase11Surface(page, 'sign-in-mobile-390x844');
  await page.setViewportSize({ width: 320, height: 900 });
  await capturePhase11Surface(page, 'sign-in-reflow-320x900');
  await page.setViewportSize({ width: 1280, height: 720 });
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

test('runs an employee insight only on request with accessible narrow and forced-colors states', async ({
  page,
}) => {
  let runCount = 0;
  await mockContext(page, () => true);
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(64) }), status: 200 });
  });
  await page.route('**/v1/insights/run', async (route) => {
    runCount += 1;
    expect(route.request().postDataJSON()).toEqual({
      context: {
        kind: 'TODAY',
        period: { date: '2026-08-11', kind: 'DATE' },
        sourceReferences: [],
      },
      kind: 'today-explanation',
      period: { date: '2026-08-11', kind: 'DATE' },
      workspace: 'EMPLOYEE',
    });
    await route.fulfill({
      json: {
        data: INSIGHT_RESULT,
        meta: { interpretationAvailability: 'DISABLED', requestId: REQUEST_ID },
      },
      status: 200,
    });
  });
  await page.setViewportSize({ height: 800, width: 320 });
  await page.goto('/today');
  await page.getByRole('link', { name: 'Open Insights' }).click();

  await expect(page.getByRole('heading', { name: 'Insights' })).toBeFocused();
  await expect(page).toHaveURL('/insights?kind=today-explanation&date=2026-08-11');
  const context = page.getByRole('region', { name: 'Page context' });
  await expect(context).toContainText('Today');
  await expect(context).toContainText('11 August 2026');
  await expect(context).toContainText('No page content or record identifiers were copied.');
  expect(runCount).toBe(0);
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
  }));
  expect(JSON.stringify(storage)).not.toContain('TODAY');
  expect(JSON.stringify(storage)).not.toContain('sourceReferences');
  await page.getByRole('button', { name: 'Remove context' }).click();
  await expect(page.getByLabel('What would you like to understand?')).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Page context removed.');
  await expect(context).toHaveCount(0);

  await page.goBack();
  await page.getByRole('link', { name: 'Open Insights' }).click();
  await expect(page.getByRole('region', { name: 'Page context' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Run insight' }).click();
  await expect(page.getByRole('heading', { name: 'How was today calculated?' })).toBeVisible();
  expect(runCount).toBe(1);
  await captureWl1504Foundation(page);
  await expectPageToHaveNoAxeViolations(page);

  await page.reload();
  await expect(page.getByRole('region', { name: 'Page context' })).toHaveCount(0);
  expect(runCount).toBe(1);

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Run insight' })).toBeVisible();
  await expectPageToHaveNoAxeViolations(page);
});

test('runs a provider-disabled Manager Insight privately and accessibly at reflow', async ({
  page,
}) => {
  const requests: unknown[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(MANAGER_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(64) }), status: 200 });
  });
  await page.route('**/v1/insights/manager/run', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        data: MANAGER_INSIGHT_RESULT,
        meta: { interpretationAvailability: 'DISABLED', requestId: REQUEST_ID },
      },
      status: 200,
    });
  });

  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto('/team-insights');
  await expect(page.getByRole('heading', { exact: true, name: 'Insights' })).toBeFocused();
  expect(requests).toHaveLength(0);
  await page.getByLabel('What would you like to understand?').selectOption('team-coverage');
  await page.getByLabel('Date').fill('2026-08-28');
  await page.getByRole('button', { name: 'Run insight' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Team coverage' })).toBeVisible();
  await expect(page.getByText('Current direct reports', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { exact: true, name: 'Team status' })).toHaveAttribute(
    'href',
    '/team',
  );
  await expect(page.getByLabel('Question about this result')).toHaveCount(0);
  await expect(page).toHaveURL('/team-insights');
  expect(requests).toEqual([
    {
      kind: 'team-coverage',
      period: { date: '2026-08-28', kind: 'DATE' },
      workspace: 'MANAGER',
    },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const storage = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain('team-coverage');

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps an HR aggregate suppressed, private, and accessible at reflow', async ({ page }) => {
  const requests: unknown[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(HR_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(64) }), status: 200 });
  });
  await page.route('**/v1/insights/hr/run', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      json: success({
        capturedAt: '2026-08-28T12:00:00Z',
        kind: 'HR_MONTHLY_CLOSURE_READINESS',
        month: '2026-08',
        reason: 'PRIVACY_THRESHOLD_NOT_MET',
      }),
      status: 200,
    });
  });

  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto('/hr-insights');
  await expect(page.getByRole('heading', { exact: true, name: 'Insights' })).toBeFocused();
  await page.getByLabel('Month').fill('2026-08');
  await page.getByRole('button', { name: 'Run insight' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Aggregate unavailable' })).toBeVisible();
  await expect(page.getByText(/does not reveal which requirement/iu)).toBeVisible();
  await expect(page.getByText('Eligible employees')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Monthly time report' })).toHaveCount(0);
  await expect(page).toHaveURL('/hr-insights');
  expect(requests).toEqual([
    {
      kind: 'HR_MONTHLY_CLOSURE_READINESS',
      month: '2026-08',
      workspace: 'HR',
    },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const storage = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain('HR_MONTHLY_CLOSURE_READINESS');

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps Ask My Ledger native first, private, recoverable, and accessible', async ({ page }) => {
  let interpretationCount = 0;
  await mockContext(page, () => true);
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(64) }), status: 200 });
  });
  await page.route('**/v1/insights/run', async (route) => {
    await route.fulfill({
      json: {
        data: INSIGHT_RESULT,
        meta: { interpretationAvailability: 'READY', requestId: REQUEST_ID },
      },
      status: 200,
    });
  });
  await page.route('**/v1/insights/interpret', async (route) => {
    interpretationCount += 1;
    const body = route.request().postDataJSON();
    expect(body.insight).toEqual({
      kind: 'today-explanation',
      period: { date: '2026-08-11', kind: 'DATE' },
      workspace: 'EMPLOYEE',
    });
    if (interpretationCount === 1) {
      expect(body.priorTurns).toEqual([]);
      await route.fulfill({
        json: success({ interpretation: INSIGHT_INTERPRETATION, nativeResult: INSIGHT_RESULT }),
        status: 200,
      });
      return;
    }
    expect(body.priorTurns).toEqual([
      {
        answer: INSIGHT_INTERPRETATION.statements[0].text,
        question: 'Why is this result provisional?',
      },
    ]);
    await route.fulfill({
      json: { error: { code: 'INTERNAL_ERROR', requestId: REQUEST_ID } },
      status: 503,
    });
  });

  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto('/insights');
  await page.getByLabel('What would you like to understand?').selectOption('today-explanation');
  await page.getByLabel('Date').fill('2026-08-11');
  await page.getByRole('button', { name: 'Run insight' }).click();
  const nativeHeading = page.getByRole('heading', { name: 'How was today calculated?' });
  await expect(nativeHeading).toBeVisible();

  const question = page.getByLabel('Question about this result');
  await question.fill('Why is this result provisional?');
  await page.getByRole('button', { name: 'Explain this result' }).click();
  const generatedHeading = page.getByRole('heading', { name: 'Optional generated explanation' });
  await expect(generatedHeading).toBeVisible();
  await expect(page.getByRole('status')).toContainText('The optional explanation is ready.');
  await expect(page.getByRole('link', { name: 'Open Today attendance source' })).toHaveCount(2);
  expect(
    await page.evaluate(() => {
      const native = document.querySelector('#insight-result-heading');
      const generated = document.querySelector('#insight-interpretation-heading');
      return (
        native !== null &&
        generated !== null &&
        Boolean(native.compareDocumentPosition(generated) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    }),
  ).toBe(true);
  const accessibilityTree = await page.getByRole('main').ariaSnapshot();
  expect(accessibilityTree).toContain('heading "How was today calculated?"');
  expect(accessibilityTree).toContain('heading "Ask My Ledger"');
  expect(accessibilityTree).toContain('heading "Optional generated explanation"');
  expect(accessibilityTree).not.toContain('log:');

  await question.fill('Explain it again without losing the native result.');
  await page.getByRole('button', { name: 'Explain this result' }).click();
  await expect(
    page.getByRole('heading', { name: 'The optional explanation is unavailable' }),
  ).toBeVisible();
  await expect(nativeHeading).toBeVisible();
  await expect(generatedHeading).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

  await expect(page).toHaveURL('/insights?kind=today-explanation&date=2026-08-11');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const storage = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain('Why is this result provisional?');
  expect(JSON.stringify(storage)).not.toContain(INSIGHT_INTERPRETATION.statements[0].text);

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expectPageToHaveNoAxeViolations(page);
  await page.reload();
  await expect(generatedHeading).toHaveCount(0);
  await expect(page.getByLabel('Question about this result')).toHaveCount(0);
});

test('prioritizes needs-review approvals with URL views, concise filters, pagination, and narrow records', async ({
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
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');
    const items = APPROVAL_ITEMS.filter(
      (item) =>
        (status === 'ALL' || item.status === status) && (type === 'ALL' || item.kind === type),
    );
    const total = status === 'WAITING_ON_EMPLOYEE' ? 7 : status === 'COMPLETED' ? 0 : 41;
    await route.fulfill({
      json: success({
        filterOptions: {
          teams: [{ id: APPROVAL_TEAM_ID, name: 'Client Services' }],
        },
        items,
        pagination: {
          limit,
          page: pageNumber,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });

  await page.goto('/approvals');
  await expect(page).toHaveTitle('Approval inbox | WorkLedger');
  await expect(page.getByRole('heading', { name: 'Approval inbox', exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Needs review: 41' })).toBeVisible();
  const queueView = page.getByRole('combobox', { name: 'Queue view' });
  await expect(queueView).toHaveValue('ACTION_REQUIRED');

  const table = page.getByRole('table', { name: 'Approval inbox results' });
  const scrollRegion = page.getByRole('region', { name: 'Approval inbox results table' });
  await expect(table).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capturePhase13ApprovalInbox(page, 'approval-inbox-1440x900');
  await page.setViewportSize({ width: 768, height: 1024 });
  const mobileResults = page.getByRole('list', { name: 'Approval inbox results' });
  await expect(table).toHaveCount(0);
  await expect(mobileResults).toBeVisible();
  await capturePhase13ApprovalInbox(page, 'approval-inbox-768x1024');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(table).toHaveCount(0);
  await expect(mobileResults).toBeVisible();
  await expect(mobileResults.getByText('Maria Chen')).toBeVisible();
  await expect(mobileResults.getByText('Client Services')).toBeVisible();
  await expect(
    mobileResults.getByRole('link', { name: 'Review correction for Maria Chen' }),
  ).toBeVisible();
  await capturePhase13ApprovalInbox(page, 'approval-inbox-390x844');
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(mobileResults).toBeVisible();
  await capturePhase13ApprovalInbox(page, 'approval-inbox-320x900');
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(table).toBeVisible();
  await expect(table.locator('caption')).toHaveText('Approval inbox results');
  await expect(table.getByRole('columnheader', { name: 'Submitted' })).toHaveAttribute(
    'aria-sort',
    'descending',
  );
  await expect(table.getByText('Correction')).toBeVisible();
  await expect(
    table.getByRole('link', { name: 'Review correction for Maria Chen' }),
  ).toHaveAttribute('href', `/approvals/${CORRECTION_APPROVAL_ID}`);

  await queueView.focus();
  await queueView.selectOption('WAITING_ON_EMPLOYEE');
  await expect(page).toHaveURL(/status=WAITING_ON_EMPLOYEE/u);
  await expect(page.getByRole('heading', { name: 'Waiting on employee: 7' })).toBeVisible();
  await expect(queueView).toBeFocused();
  await expect(queueView).toHaveValue('WAITING_ON_EMPLOYEE');
  await page.goBack();
  await expect(page).toHaveURL(/\/approvals$/u);
  await expect(page.getByRole('heading', { name: 'Needs review: 41' })).toBeVisible();
  await expect(queueView).toBeFocused();
  await expect(queueView).toHaveValue('ACTION_REQUIRED');

  await page.getByText('Refine this view', { exact: true }).click();
  const category = page.getByRole('combobox', { name: 'Workflow category' });
  await category.selectOption('CORRECTION');
  await expect(category).toHaveValue('CORRECTION');
  const team = page.getByRole('combobox', { name: 'Current team' });
  await team.selectOption(APPROVAL_TEAM_ID);
  await expect(team).toHaveValue(APPROVAL_TEAM_ID);
  const order = page.getByRole('combobox', { name: 'Order' });
  await order.selectOption('AFFECTED_DATE:ASC');
  await expect(order).toHaveValue('AFFECTED_DATE:ASC');
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
    limit: '20',
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
  await expect(page.getByText('Showing 21–40 of 41')).toBeVisible();
  await expect(nextPage).toBeFocused();

  await page.goBack();
  await expect(page).toHaveURL(/page=1/u);
  await expect(page.getByText('Showing 1–20 of 41')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeFocused();
  expect(approvalQueries.length).toBeGreaterThanOrEqual(3);

  await page.setViewportSize({ width: 320, height: 900 });
  const filterDisclosure = page.getByText('Hide filters', { exact: true });
  await expect(filterDisclosure).toBeVisible();
  await expect(category).toBeVisible();
  await expect(page.getByText(/^Applied view:/u)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset to needs review' })).toBeVisible();
  await filterDisclosure.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Refine this view', { exact: true })).toBeFocused();
  await expect(category).toBeHidden();
  await expect(table).toHaveCount(0);
  await expect(mobileResults).toBeVisible();
  const mobileReview = mobileResults.getByRole('link', {
    name: 'Review correction for Maria Chen',
  });
  await expect(mobileReview).toBeVisible();
  const mobileReviewTarget = await mobileReview.boundingBox();
  expect(mobileReviewTarget?.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(scrollRegion).toHaveCount(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('makes Team status filters, labels, next steps, and workspace navigation actionable', async ({
  page,
}) => {
  const teamRequests: URL[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(MANAGER_CONTEXT), status: 200 });
  });
  await page.route('**/v1/team/status*', async (route) => {
    const url = new URL(route.request().url());
    teamRequests.push(url);
    expect([...url.searchParams.keys()]).toEqual([]);
    await route.fulfill({ json: success(PHASE_13_TEAM_STATUS), status: 200 });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/team');
  await expect(page).toHaveTitle('Team status | WorkLedger');
  await expect(page.getByRole('heading', { name: 'Team status', exact: true })).toBeFocused();
  const teamNavigation = page.getByRole('navigation', { name: 'Team navigation' });
  await expect(teamNavigation.getByRole('link', { name: 'Team status' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(teamNavigation.getByRole('link', { name: 'Approval inbox' })).toHaveAttribute(
    'href',
    '/approvals',
  );
  const allDirectReports = page.getByRole('button', { name: 'All direct reports: 4' });
  await expect(allDirectReports).toHaveAttribute('aria-pressed', 'true');
  const teamTable = page.getByRole('table', {
    name: 'Current availability, open record state, and next steps for direct reports.',
  });
  await expect(teamTable).toBeVisible();
  await expect(
    teamTable.getByRole('link', {
      name: 'Open approval inbox to find open records for Ari Working',
    }),
  ).toHaveAttribute('href', '/approvals?status=ALL&sort=EMPLOYEE&direction=ASC');
  await expect(
    teamTable.getByRole('link', { name: 'View team calendar for Cleo Away' }),
  ).toHaveAttribute('href', '/team-calendar?month=2026-08');
  await capturePhase13TeamStatus(page, 'team-status-1440x900');

  await page.setViewportSize({ width: 768, height: 1024 });
  const teamList = page.getByRole('list', { name: 'Team status results' });
  await expect(teamTable).toHaveCount(0);
  await expect(teamList).toBeVisible();
  await capturePhase13TeamStatus(page, 'team-status-768x1024');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(teamList).toBeVisible();
  await expect(teamList.getByRole('heading', { name: 'Ari Working' })).toBeVisible();
  await expect(teamList.getByText('Working now', { exact: true })).toBeVisible();
  await expect(teamList.getByText('Open records', { exact: true })).toBeVisible();
  await capturePhase13TeamStatus(page, 'team-status-390x844');

  await page.setViewportSize({ width: 320, height: 900 });
  await expect(teamList).toBeVisible();
  const narrowAction = teamList.getByRole('link', {
    name: 'Open approval inbox to find open records for Ari Working',
  });
  await expect(narrowAction).toBeVisible();
  const narrowActionBox = await narrowAction.boundingBox();
  expect(narrowActionBox?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await capturePhase13TeamStatus(page, 'team-status-320x900');
  await expectPageToHaveNoAxeViolations(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  const working = page.getByRole('button', { name: 'Working now: 1', exact: true });
  await working.click();
  await expect(page).toHaveURL(/\/team\?availability=WORKING$/u);
  await expect(working).toBeFocused();
  await expect(working).toHaveAttribute('aria-pressed', 'true');
  await expect(teamTable.getByText('Ari Working')).toBeVisible();
  await expect(teamTable.getByText('Bea Break')).toHaveCount(0);

  const openRecords = page.getByRole('button', { name: 'People with open records: 1' });
  await openRecords.click();
  await expect(page).toHaveURL(/availability=WORKING&records=OPEN$/u);
  await expect(openRecords).toBeFocused();
  await expect(
    page.getByText('Showing 1 of 4 direct reports: working now with open records.'),
  ).toBeVisible();

  const onBreak = page.getByRole('button', { name: 'On break: 1' });
  await onBreak.click();
  await expect(page).toHaveURL(/availability=ON_BREAK&records=OPEN$/u);
  await expect(onBreak).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'No team members match this view' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show all direct reports' }).click();
  await expect(page).toHaveURL(/\/team$/u);
  await expect(teamTable.getByText('Dara Finished')).toBeVisible();

  await page.goto('/team?employee=Ari&availability=SICKNESS');
  await expect(page).toHaveURL(/\/team$/u);
  await expect(page.getByText(/sickness|vacation|private correction/iu)).toHaveCount(0);
  expect(teamRequests.length).toBeGreaterThanOrEqual(1);
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
            key: 'flexible-time',
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
  await expect(status).toContainText('Approve recorded. Current status: Approved.');
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
  await capturePhase12Manager(page, 'approval-detail-mobile-320x900');
  await capturePhase13CrossRoute(page, 'approval-detail-mobile-320x900');
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
            deliveryStatus: 'FAILED',
            destinationPath: '/requests',
            dismissedAt,
            event: 'ITEM_CHANGES_REQUESTED',
            id: notificationId,
            occurredAt: '2026-08-14T09:30:00Z',
            parameters: {},
            status: dismissedAt === null ? 'ACTIVE' : 'DISMISSED',
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
      json: success(todayForAttendanceState(attendanceState, attendanceRevision, timeline)),
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
    const timeline =
      attendanceState === 'OFF_WORK'
        ? []
        : [
            {
              id: 'punch-clock-in-replay',
              occurredAt: '2026-08-11T09:30:00Z',
              type: 'CLOCK_IN' as const,
            },
          ];
    await route.fulfill({
      json: success(todayForAttendanceState(attendanceState, attendanceRevision, timeline)),
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

test('recovers a stale clock intent from the authoritative device state without claiming an effect', async ({
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
      json: success(todayForAttendanceState(attendanceState, attendanceRevision)),
      status: 200,
    });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 's'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/me/attendance/clock-in', async (route) => {
    clockInRequests += 1;
    attendanceState = 'WORKING';
    attendanceRevision = 1;
    await route.fulfill({
      json: {
        error: {
          code: 'ATTENDANCE_STATE_CHANGED',
          context: {
            attendanceRevision,
            currentState: attendanceState,
            validActions: ['START_BREAK', 'CLOCK_OUT'],
          },
          requestId: REQUEST_ID,
        },
      },
      status: 409,
    });
  });

  await page.goto('/today');
  await page.getByRole('button', { name: 'Clock in' }).click();

  const workingHeading = page.getByRole('heading', { name: 'Working' });
  await expect(workingHeading).toBeFocused();
  await expect(page.getByRole('alert')).toContainText(
    'No clock-in was recorded. Attendance changed in another tab or device.',
  );
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clock in' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start break' })).toBeEnabled();
  expect(clockInRequests).toBe(1);
  await expectPageToHaveNoAxeViolations(page);
});

test('clears protected Today state when the attendance session expires', async ({ page }) => {
  let authenticated = true;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill(
      authenticated
        ? { json: success(EMPLOYEE_CONTEXT), status: 200 }
        : {
            json: {
              error: {
                code: 'AUTH_SESSION_EXPIRED',
                requestId: REQUEST_ID,
              },
            },
            status: 401,
          },
    );
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({
      json: success(todayForAttendanceState('OFF_WORK', 0)),
      status: 200,
    });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'x'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/me/attendance/clock-in', async (route) => {
    authenticated = false;
    await route.fulfill({
      json: {
        error: {
          code: 'AUTH_SESSION_EXPIRED',
          requestId: REQUEST_ID,
        },
      },
      status: 401,
    });
  });

  await page.goto('/today');
  await page.getByRole('button', { name: 'Clock in' }).click();

  await expect(page).toHaveURL(/\/sign-in$/u);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
  await expect(page.getByRole('alert')).toContainText(
    'Your session expired. Sign in again to continue.',
  );
  await expect(page.getByRole('heading', { name: 'Off work' })).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Attendance actions' })).toHaveCount(0);
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
      json: success(todayForAttendanceState(attendanceState, attendanceRevision)),
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
      json: success(todayForAttendanceState(attendanceState, attendanceRevision)),
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
        attendance: attendanceForState('OFF_WORK', 2),
        calculation: {
          attentionItems: [
            {
              affectedDate: TODAY_ATTENDANCE.localDate,
              blocksSubmission: false,
              message: { code: 'WORK_ON_HOLIDAY', parameters: {} },
              recovery: {
                action: 'REVIEW_CALCULATION',
                destination: 'TODAY_CALCULATION',
              },
              severity: 'WARNING',
              source: 'CURRENT_DAY_CALCULATION',
            },
            {
              affectedDate: TODAY_ATTENDANCE.localDate,
              blocksSubmission: false,
              message: { code: 'WORK_ON_ZERO_EXPECTED_DAY', parameters: {} },
              recovery: {
                action: 'REVIEW_CALCULATION',
                destination: 'TODAY_CALCULATION',
              },
              severity: 'WARNING',
              source: 'CURRENT_DAY_CALCULATION',
            },
          ],
          estimatedFinishAt: null,
          estimatedFinishUnavailableReason: 'NOT_WORKING',
          holidayName: 'Donaudampfschifffahrtsgesellschaft Appreciation Day',
          isPeriodPostedOrLocked: false,
          provisional: {
            calculationSources: {
              absenceCreditMinutes: 0,
              absenceExpectedReductionMinutes: 0,
              approvedCorrectionMinutes: 0,
              breakMinutesToday: 0,
              holidayExpectedReductionMinutes: 480,
              otherApprovedAdjustmentMinutes: 0,
              scheduledMinutes: 480,
              workedMinutesToday: 60,
            },
            creditedMinutesToday: 60,
            expectedMinutesToday: 0,
            provisionalDifferenceMinutes: 60,
          },
          remainingExpectedMinutes: 0,
          status: 'PROVISIONAL',
        },
        timeline: [
          {
            id: '123e4567-e89b-42d3-a456-426614174201',
            occurredAt: '2026-08-11T07:00:00Z',
            type: 'CLOCK_IN',
          },
          {
            id: '123e4567-e89b-42d3-a456-426614174202',
            occurredAt: '2026-08-11T08:00:00Z',
            type: 'CLOCK_OUT',
          },
        ],
      }),
      status: 200,
    });
  });

  await page.goto('/today');
  await expect(page.getByText('Does not block submission')).toHaveCount(2);
  const attentionActions = page.getByRole('link', { name: 'Review calculation' });
  await expect(attentionActions).toHaveCount(2);
  await expect(attentionActions.first()).toHaveAttribute('href', '#calculation-details');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const calculationDetails = page.locator('summary').filter({ hasText: 'Calculation details' });
  await expect(calculationDetails).toBeVisible();
  const calculationTable = page.locator('.wl-calculation-table');
  await expect(calculationTable).toBeHidden();
  await calculationDetails.focus();
  await page.keyboard.press('Enter');
  await expect(calculationTable).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why expected time is zero' })).toBeVisible();
  await expect(calculationTable).toContainText('Expected time');
  await expect(calculationTable).toContainText('Credited time');
  await expect(calculationTable).toContainText('Provisional difference');
  await expect(
    page.getByRole('region', { name: 'Today’s timeline' }).getByRole('listitem'),
  ).toHaveCount(2);
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
        expect(bounds?.width).toBeGreaterThanOrEqual(44);
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }
      const routeHeadingBounds = await page
        .getByRole('heading', { level: 1, name: 'Today' })
        .boundingBox();
      const mainBounds = await page.locator('#main-content').boundingBox();
      expect(routeHeadingBounds).not.toBeNull();
      expect(mainBounds).not.toBeNull();
      expect(routeHeadingBounds?.width).toBeLessThan((mainBounds?.width ?? 0) / 2);
      if (width === 320) await capturePhase12Today(page, 'today-reflow-320x900');
      if (width === 390) await capturePhase12Today(page, 'today-mobile-390x900');
      if (width === 1440) await capturePhase12Today(page, 'today-desktop-1440x900');
    });
  }

  const headings = await page.getByRole('heading').allTextContents();
  expect(headings[0]).toBe('Today');
  expect(
    await page.evaluate(() => {
      const currentStatus = document.querySelector('#current-status-title')?.closest('section');
      const calculation = document.querySelector('#today-progress-title')?.closest('section');
      return (
        currentStatus !== null &&
        calculation !== null &&
        Boolean(
          currentStatus.compareDocumentPosition(calculation) & Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    }),
  ).toBe(true);
  const progress = page.getByRole('progressbar', { name: 'Today’s credited progress' });
  await expect(progress).toHaveAttribute('value', '195');
  await expect(progress).toHaveAttribute('max', '480');
  await expect(progress).toHaveAttribute('aria-valuetext', '3h 15m credited of 8h 00m expected.');
  await expect(page.getByRole('region', { name: 'Posted balance' })).toContainText(
    'Posted through Monday, 10 August 2026',
  );
  expect(
    await page.evaluate(() => {
      const details = document.querySelector('#calculation-details');
      const timeline = document.querySelector('#today-timeline-title')?.closest('section');
      return (
        details !== null &&
        timeline !== null &&
        Boolean(timeline.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
    }),
  ).toBe(true);
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toHaveCount(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('captures the WL-1305 Today timeline and calculation evidence @phase13-baseline', async ({
  page,
}) => {
  test.skip(
    process.env['WORKLEDGER_ASSERT_PHASE_13_BASELINES'] !== '1',
    'Set WORKLEDGER_ASSERT_PHASE_13_BASELINES=1 to compare the WL-1305 evidence snapshots.',
  );
  await page.clock.setFixedTime(new Date('2026-08-11T10:45:00Z'));
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({ json: success(PHASE_13_TODAY_BASELINE), status: 200 });
  });

  const viewports = [
    { height: 900, name: 'today-audit-1440x900', width: 1440 },
    { height: 720, name: 'today-audit-1024x720', width: 1024 },
    { height: 1024, name: 'today-audit-768x1024', width: 768 },
    { height: 844, name: 'today-audit-390x844', width: 390 },
    { height: 568, name: 'today-audit-320x568', width: 320 },
  ] as const;

  await page.setViewportSize(viewports[0]);
  await page.goto('/today');
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeFocused();
  const calculationSummary = page.locator('summary').filter({ hasText: 'Calculation details' });
  await calculationSummary.click();
  await expect(calculationSummary).toBeFocused();

  for (const viewport of viewports) {
    await test.step(`${viewport.name} viewport`, async () => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
      const currentStatus = page.getByRole('region', { name: 'Working' });
      await expect(currentStatus.getByText('Current work interval')).toBeVisible();
      await expect(currentStatus.getByText('1h 30m', { exact: true })).toBeVisible();
      await expect(currentStatus.getByText('11:15', { exact: true })).toBeVisible();
      await expect(page.getByText('Estimate updated 12:45')).toBeVisible();
      const progress = page.getByRole('region', { name: 'Today’s progress' });
      await expect(progress.getByText('3h 30m credited', { exact: true })).toBeVisible();
      await expect(progress.getByText('4h 30m', { exact: true })).toBeVisible();
      await expect(progress.getByText('17:15', { exact: true })).toBeVisible();
      await expect(progress.getByText('−4h 30m', { exact: true })).toBeVisible();
      await expect(
        progress.getByRole('progressbar', { name: 'Today’s credited progress' }),
      ).toHaveAttribute('value', '210');
      const posted = page.getByRole('region', { name: 'Posted balance' });
      await expect(posted.getByText('+6h 20m', { exact: true })).toBeVisible();
      await expect(posted).toContainText('Posted through Monday, 10 August 2026');
      await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clock out', exact: true })).toBeVisible();
      const timeline = page.getByRole('region', { name: 'Today’s timeline' });
      await expect(
        timeline.getByRole('heading', { name: 'Approved interpretation' }),
      ).toBeVisible();
      await expect(timeline).toContainText('Worked time changed from 3h 15m to 3h 30m (+0h 15m).');
      await expect(timeline.locator('.wl-timeline-list').getByRole('listitem')).toHaveCount(3);
      await expect(
        page.getByRole('table', {
          name: 'Source amounts and server-calculated results for today',
        }),
      ).toContainText('Approved corrections+0h 15m');
      const hierarchy = await page.evaluate(() => {
        const status = document.querySelector('.wl-today-status')?.getBoundingClientRect();
        const progress = document
          .querySelector('.wl-today-progress-summary')
          ?.getBoundingClientRect();
        const posted = document.querySelector('.wl-today-posted-balance')?.getBoundingClientRect();
        const actions = document.querySelector('.wl-today-action-footer')?.getBoundingClientRect();
        const timeline = document
          .querySelector('#today-timeline-title')
          ?.closest('section')
          ?.getBoundingClientRect();
        const calculation = document.querySelector('#calculation-details')?.getBoundingClientRect();
        if (
          status === undefined ||
          progress === undefined ||
          posted === undefined ||
          actions === undefined ||
          timeline === undefined ||
          calculation === undefined
        ) {
          return null;
        }
        return {
          actionsTop: actions.top,
          calculationTop: calculation.top,
          postedBottom: posted.bottom,
          postedTop: posted.top,
          progressBottom: progress.bottom,
          progressTop: progress.top,
          statusBottom: status.bottom,
          statusTop: status.top,
          timelineTop: timeline.top,
        };
      });
      expect(hierarchy).not.toBeNull();
      if (hierarchy !== null) {
        const statusAndProgressShareRow =
          Math.abs(hierarchy.statusTop - hierarchy.progressTop) <= 2;
        if (!statusAndProgressShareRow) {
          expect(hierarchy.progressTop).toBeGreaterThanOrEqual(hierarchy.statusBottom);
        }
        const postedSharesFirstRow = Math.abs(hierarchy.statusTop - hierarchy.postedTop) <= 2;
        if (!postedSharesFirstRow) {
          expect(hierarchy.postedTop).toBeGreaterThanOrEqual(
            Math.max(hierarchy.statusBottom, hierarchy.progressBottom),
          );
        }
        expect(hierarchy.actionsTop).toBeGreaterThanOrEqual(
          Math.max(hierarchy.statusBottom, hierarchy.progressBottom, hierarchy.postedBottom),
        );
        expect(hierarchy.calculationTop).toBeGreaterThanOrEqual(hierarchy.timelineTop);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);

      if (viewport.width === 1440 || viewport.width === 320) {
        await expectPageToHaveNoAxeViolations(page);
      }
      await capturePhase13Evidence(page, viewport.name);
    });
  }
});

test('passes the WL-1307 Today responsive, accessibility, and usability sub-gate', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-08-11T10:45:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/attendance/today', async (route) => {
    await route.fulfill({ json: success(PHASE_13_TODAY_BASELINE), status: 200 });
  });

  const viewports = [
    { height: 900, name: 'today-gate-1440x900', width: 1440 },
    { height: 720, name: 'today-gate-1024x720', width: 1024 },
    { height: 1024, name: 'today-gate-768x1024', width: 768 },
    { height: 844, name: 'today-gate-390x844', width: 390 },
    { height: 568, name: 'today-gate-320x568', width: 320 },
  ] as const;

  await page.setViewportSize(viewports[0]);
  await page.goto('/today');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);

  const headingLevels = await page
    .locator('#main-content :is(h1, h2, h3, h4, h5, h6)')
    .evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
  expect(headingLevels[0]).toBe(1);
  for (let index = 1; index < headingLevels.length; index += 1) {
    expect(headingLevels[index]).toBeLessThanOrEqual((headingLevels[index - 1] ?? 1) + 1);
  }

  const currentStatus = page.getByRole('region', { name: 'Working' });
  await expect(currentStatus.getByText('11:15', { exact: true })).toBeVisible();
  const progress = page.getByRole('region', { name: 'Today’s progress' });
  await expect(progress.getByText('3h 15m', { exact: true })).toBeVisible();
  await expect(progress.getByText('4h 30m', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clock out', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Needs attention' })).toHaveCount(0);

  const calculationSummary = page.locator('summary').filter({ hasText: 'Calculation details' });
  await calculationSummary.focus();
  await page.keyboard.press('Enter');
  await expect(calculationSummary).toBeFocused();
  await expect(page.locator('#calculation-details')).toHaveAttribute('open', '');

  for (const viewport of viewports) {
    await test.step(`${viewport.name} viewport`, async () => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clock out', exact: true })).toBeVisible();
      await expect(
        page.getByRole('table', {
          name: 'Source amounts and server-calculated results for today',
        }),
      ).toBeVisible();

      for (const action of ['Start break', 'Clock out']) {
        const bounds = await page.getByRole('button', { name: action, exact: true }).boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds?.width).toBeGreaterThanOrEqual(44);
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }

      const layout = await page.evaluate(() => {
        const status = document.querySelector('.wl-today-status')?.getBoundingClientRect();
        const actions = document.querySelector('.wl-today-action-footer')?.getBoundingClientRect();
        const progress = document
          .querySelector('.wl-today-progress-summary')
          ?.getBoundingClientRect();
        const posted = document.querySelector('.wl-today-posted-balance')?.getBoundingClientRect();
        const timeline = document
          .querySelector('#today-timeline-title')
          ?.closest('section')
          ?.getBoundingClientRect();
        const calculation = document.querySelector('#calculation-details')?.getBoundingClientRect();
        if (
          status === undefined ||
          actions === undefined ||
          progress === undefined ||
          posted === undefined ||
          timeline === undefined ||
          calculation === undefined
        ) {
          return null;
        }
        return {
          actionBottom: actions.bottom,
          actionTop: actions.top,
          calculationTop: calculation.top,
          firstActionTop:
            document
              .querySelector<HTMLElement>('.wl-today-action-footer button')
              ?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
          postedBottom: posted.bottom,
          postedTop: posted.top,
          progressBottom: progress.bottom,
          progressTop: progress.top,
          statusTop: status.top,
          timelineTop: timeline.top,
        };
      });
      expect(layout).not.toBeNull();
      if (layout !== null) {
        expect(layout.actionTop).toBeGreaterThanOrEqual(layout.statusTop);
        expect(layout.calculationTop).toBeGreaterThanOrEqual(layout.timelineTop);
        if (viewport.width < 640) {
          expect(layout.actionBottom).toBeLessThanOrEqual(layout.progressTop);
          expect(layout.firstActionTop).toBeLessThan(viewport.height);
        } else {
          expect(layout.actionTop).toBeLessThan(
            Math.max(layout.progressBottom, layout.postedBottom),
          );
        }
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);

      if (viewport.width === 1440 || viewport.width === 320) {
        await expectPageToHaveNoAxeViolations(page);
      }
      await capturePhase13TodayGate(page, viewport.name);
    });
  }

  await test.step('200 percent zoom equivalent and landscape reflow', async () => {
    await page.setViewportSize({ height: 450, width: 640 });
    await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);

    await page.setViewportSize({ height: 390, width: 844 });
    await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  await test.step('WCAG text-spacing override and reduced motion', async () => {
    await page.setViewportSize({ height: 900, width: 320 });
    await page.addStyleTag({
      content: `
        #main-content,
        #main-content * {
          letter-spacing: 0.12em !important;
          line-height: 1.5 !important;
          word-spacing: 0.16em !important;
        }
        #main-content p {
          margin-block-end: 2em !important;
        }
      `,
    });
    await expect(page.getByRole('button', { name: 'Start break' })).toBeVisible();
    await expect(page.getByText('Assumes no additional break.')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.getByRole('button', { name: 'Start break' }).evaluate((button) => {
        const styles = getComputedStyle(button);
        return {
          animationName: styles.animationName,
          transform: styles.transform,
          transitionDuration: styles.transitionDuration,
        };
      }),
    ).toEqual({ animationName: 'none', transform: 'none', transitionDuration: '0.001s' });
  });

  await test.step('non-blocking attention stays after the primary action without a load alert', async () => {
    await page.unroute('**/v1/me/attendance/today');
    await page.route('**/v1/me/attendance/today', async (route) => {
      await route.fulfill({ json: success(PHASE_13_TODAY_WARNING), status: 200 });
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Needs attention' })).toBeVisible();
    await expect(page.getByText('Does not block submission')).toBeVisible();
    await expect(page.getByRole('link', { name: 'View balance history' })).toHaveAttribute(
      'href',
      '/my-balances#ledger-heading',
    );
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(
      await page.evaluate(() => {
        const actions = document.querySelector('.wl-today-action-footer');
        const attention = document.querySelector('#today-attention-title')?.closest('section');
        return (
          actions !== null &&
          attention !== null &&
          Boolean(actions.compareDocumentPosition(attention) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(page.url()).not.toContain('sickness');
    const browserStorage = await page.evaluate(() => ({
      local: Object.entries(localStorage),
      session: Object.entries(sessionStorage),
    }));
    expect(browserStorage.local).toEqual([]);
    expect(JSON.stringify(browserStorage)).not.toMatch(
      /Emma Reed|emma@northstar\.test|sickness|flexible-time balance/iu,
    );
  });

  await test.step('long account identity and recovery copy reflow in the narrow shell', async () => {
    const longDisplayName =
      'Alexandra Very Long Employee Name for Reflow and Localization Verification';
    await page.unroute('**/v1/me/context');
    await page.route('**/v1/me/context', async (route) => {
      await route.fulfill({
        json: success({
          ...EMPLOYEE_CONTEXT,
          account: { ...EMPLOYEE_CONTEXT.account, name: longDisplayName },
          employee: { ...EMPLOYEE_CONTEXT.employee, displayName: longDisplayName },
        }),
        status: 200,
      });
    });
    await page.setViewportSize({ height: 568, width: 320 });
    await page.reload();
    await page.getByRole('button', { name: 'Menu' }).click();
    const navigationDialog = page.getByRole('dialog', { name: 'Navigation' });
    await expect(navigationDialog.getByText(longDisplayName, { exact: true })).toBeVisible();
    await expect(navigationDialog.getByRole('button', { name: 'Sign out' })).toBeVisible();
    expect(
      await navigationDialog.evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await navigationDialog.getByRole('button', { name: 'Close' }).click();
  });
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
  await expect(page.getByText('Provisional today', { exact: true })).toBeVisible();

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
        json: success(todayForAttendanceState(attendanceState, attendanceRevision, [])),
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
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
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
  await page.route('**/v1/reports', async (route) => {
    await route.fulfill({
      json: success({
        defaultRange: { from: '2026-08-01', to: '2026-08-31' },
        reports: [
          {
            availableSorts: ['EMPLOYEE'],
            defaultSort: 'EMPLOYEE',
            key: 'monthly-time',
          },
        ],
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });

  await page.goto('/today');
  await expect(page.getByRole('heading', { name: 'Working' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Navigation' });
  await expect(dialog).toBeFocused();
  await capturePhase11Surface(page, 'shell-drawer-mobile-390x844');
  await expect(page.locator('.wl-dialog-modal')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.wl-dialog-modal')).toHaveCSS('transform', 'none');
  await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCSS(
    'transition-duration',
    '0.001s',
  );

  await dialog.getByRole('link', { name: 'Team', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Team status' })).toBeFocused();
  await expect(page).toHaveTitle('Team status | WorkLedger');
  const teamList = page.getByRole('list', { name: 'Team status results' });
  await expect(teamList).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(teamList.getByRole('heading', { name: 'Ari Working' })).toBeVisible();
  await expect(teamList.getByText('Delivery')).toBeVisible();
  await expect(teamList.getByText('Working now', { exact: true })).toBeVisible();
  await expect(teamList.getByText('Open records', { exact: true })).toBeVisible();
  await expect(teamList.getByRole('heading', { name: 'Cleo Away' })).toBeVisible();
  await expect(teamList.getByText('No current team')).toBeVisible();
  await expect(teamList.getByText('Unavailable today', { exact: true })).toBeVisible();
  await expect(
    teamList.getByRole('link', {
      name: 'Open approval inbox to find open records for Ari Working',
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByText(/sickness|vacation/iu)).toHaveCount(0);

  await page.setViewportSize({ width: 1024, height: 720 });
  await expect(teamList).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  const teamTable = page.getByRole('table', {
    name: 'Current availability, open record state, and next steps for direct reports.',
  });
  await expect(
    teamTable.getByRole('row', {
      name: /Ari Working.*Delivery.*Working now.*Open records/u,
    }),
  ).toBeVisible();
  await expect(
    teamTable.getByRole('row', {
      name: /Cleo Away.*No current team.*Unavailable today/u,
    }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Team status table' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole('button', { name: 'Menu' });
  await menuButton.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeFocused();

  await menuButton.click();
  await expect(dialog).toBeVisible();
  const mobileWorkAreas = dialog.getByRole('navigation', { name: 'Mobile work areas' });
  await expect(mobileWorkAreas.getByRole('link', { name: 'Team' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(dialog.getByRole('navigation', { name: 'Mobile Team navigation' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(menuButton).toBeFocused();

  await page.setViewportSize({ width: 1024, height: 720 });
  const desktopWorkAreas = page.getByRole('navigation', { name: 'Work areas' });
  await expect(desktopWorkAreas.getByRole('link', { name: 'Team' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(page.getByRole('navigation', { name: 'Team navigation' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await menuButton.click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .getByRole('navigation', { name: 'Mobile work areas' })
      .getByRole('link', { name: 'Team' }),
  ).toHaveAttribute('aria-current', 'true');
  await dialog.getByRole('button', { name: 'Close' }).click();

  await page.setViewportSize({ width: 320, height: 900 });
  await menuButton.click();
  await expect(dialog).toBeVisible();
  await capturePhase11Surface(page, 'shell-drawer-reflow-320x900');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps combined-role work areas and account utilities reachable in a short desktop shell', async ({
  page,
}) => {
  const organizationName =
    'Northstar International Workplace Operations and Employee Services Cooperative';
  await page.setViewportSize({ width: 1024, height: 420 });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({
      json: success({
        ...COMBINED_CONTEXT,
        organization: { logoPath: '/identity/gate-logo.svg', name: organizationName },
      }),
      status: 200,
    });
  });
  await page.route('**/identity/gate-logo.svg', async (route) => {
    await route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 48"><rect width="160" height="48" rx="8" fill="#075985"/><text x="80" y="31" fill="white" font-size="20" text-anchor="middle">Northstar</text></svg>',
      contentType: 'image/svg+xml',
      status: 200,
    });
  });
  await mockToday(page);
  await page.route('**/v1/team/status', async (route) => {
    await route.fulfill({
      json: success({
        asOf: '2026-08-14T10:30:45Z',
        localDate: '2026-08-14',
        members: [],
        summary: {
          offWork: 0,
          onBreak: 0,
          total: 0,
          unavailable: 0,
          unresolved: 0,
          working: 0,
        },
        timeZone: 'Europe/Berlin',
      }),
      status: 200,
    });
  });
  await page.route('**/v1/hr/employees*', async (route) => {
    await route.fulfill({
      json: success({
        items: [],
        pagination: { limit: 20, page: 1, total: 0, totalPages: 0 },
      }),
      status: 200,
    });
  });
  await page.route('**/v1/hr/teams*', async (route) => {
    await route.fulfill({
      json: success({
        items: [],
        pagination: { limit: 50, page: 1, total: 0, totalPages: 0 },
      }),
      status: 200,
    });
  });
  await page.route('**/v1/system/operations', async (route) => {
    await route.fulfill({
      json: {
        dependencies: {
          authentication: { status: 'healthy' },
          database: { latencyMs: 12, status: 'healthy' },
        },
        environment: 'production',
        health: 'healthy',
        service: 'workledger-api',
        timestamp: '2026-08-21T10:30:00Z',
        version: '0.12.0',
      },
      status: 200,
    });
  });

  await page.goto('/today');
  await page.addStyleTag({
    content:
      '* { letter-spacing: 0.12em !important; line-height: 1.5 !important; word-spacing: 0.16em !important; }',
  });
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeFocused();
  await expect(page.getByText(organizationName)).toBeVisible();
  await expect(page.locator('.wl-company-logo')).toBeVisible();
  await expect(page.getByRole('link', { name: `${organizationName} home` })).toBeVisible();
  const workAreas = page.getByRole('navigation', { name: 'Work areas' });
  await expect(workAreas.getByRole('link', { name: 'My work' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  await expect(workAreas.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/team');
  await expect(workAreas.getByRole('link', { name: 'People and policy' })).toHaveAttribute(
    'href',
    '/employees',
  );
  await expect(workAreas.getByRole('link', { name: 'System' })).toHaveAttribute(
    'href',
    '/system/operations',
  );
  await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await capturePhase11Surface(page, 'shell-short-desktop-1024x420');
  expect(
    await page
      .locator('.wl-navigation-destinations')
      .evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => window.scrollTo({ behavior: 'instant', top: 600 }));
  await expect
    .poll(async () => {
      const header = await page.locator('.wl-app-header').boundingBox();
      const sidebar = await page.locator('.wl-desktop-navigation').boundingBox();
      return header !== null && sidebar !== null ? sidebar.y - (header.y + header.height) : -1;
    })
    .toBeGreaterThanOrEqual(0);
  await expect(page.getByRole('navigation', { name: 'Account' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.emulateMedia({ forcedColors: 'active' });
  const currentArea = workAreas.getByRole('link', { name: 'My work' });
  const forcedAreaColors = await currentArea.evaluate((element) => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, border: styles.borderColor };
  });
  expect(forcedAreaColors.border).not.toBe('transparent');
  expect(forcedAreaColors.border).not.toBe(forcedAreaColors.background);
  await expectPageToHaveNoAxeViolations(page);

  await page.emulateMedia({ forcedColors: 'none' });
  await workAreas.getByRole('link', { name: 'Team' }).click();
  await expect(page.getByRole('heading', { name: 'Team status', exact: true })).toBeFocused();
  const teamNavigation = page.getByRole('navigation', { name: 'Team navigation' });
  for (const [name, href] of [
    ['Team status', '/team'],
    ['Approval inbox', '/approvals'],
    ['Team calendar', '/team-calendar'],
    ['Reports', '/reports'],
  ]) {
    await expect(teamNavigation.getByRole('link', { name, exact: true })).toHaveAttribute(
      'href',
      href,
    );
  }

  await workAreas.getByRole('link', { name: 'People and policy' }).click();
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeVisible();
  const peopleNavigation = page.getByRole('navigation', { name: 'People and policy navigation' });
  for (const [name, href] of [
    ['Employees', '/employees'],
    ['Teams', '/teams'],
    ['Time settings', '/settings/time'],
    ['Absence settings', '/settings/absence'],
    ['Holiday calendars', '/settings/holidays'],
    ['Domain audit', '/audit'],
    ['Reports', '/reports'],
  ]) {
    await expect(peopleNavigation.getByRole('link', { name, exact: true })).toHaveAttribute(
      'href',
      href,
    );
  }

  await workAreas.getByRole('link', { name: 'System' }).click();
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeFocused();
  const systemNavigation = page.getByRole('navigation', { name: 'System navigation' });
  for (const [name, href] of [
    ['Accounts and sessions', '/system/accounts'],
    ['Operations', '/system/operations'],
    ['Insights', '/system/insights'],
    ['Technical audit', '/system/audit'],
  ]) {
    await expect(systemNavigation.getByRole('link', { name, exact: true })).toHaveAttribute(
      'href',
      href,
    );
  }
  await expect(systemNavigation.getByRole('link', { name: 'Reports' })).toHaveCount(0);
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps system operations semantic and contained across desktop, mobile, and reflow', async ({
  page,
}) => {
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({
      json: success({
        account: { email: 'system@northstar.test', name: 'System Administrator' },
        defaultPath: '/system/operations',
        locale: 'en-GB',
        employee: null,
        navigationAreas: ['SYSTEM'],
        organization: { name: 'Northstar Studio' },
        roles: ['SYSTEM_ADMINISTRATOR'],
      }),
      status: 200,
    });
  });
  await page.route('**/v1/system/operations', async (route) => {
    await route.fulfill({
      json: {
        dependencies: {
          authentication: { status: 'healthy' },
          database: {
            error: 'Database connection timed out after the bounded readiness check.',
            latencyMs: 750,
            status: 'unavailable',
          },
        },
        environment: 'production',
        health: 'degraded',
        service: 'workledger-api',
        timestamp: '2026-08-21T10:30:00Z',
        version: '0.12.0',
      },
      status: 200,
    });
  });

  await page.goto('/system/operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeFocused();
  await expect(page.getByText('Degraded', { exact: true })).toBeVisible();
  await expect(page.getByText('Unavailable')).toBeVisible();
  await expect(page.getByText('Healthy')).toBeVisible();
  await expect(page.getByText(/Database connection timed out/u)).toBeVisible();

  for (const viewport of [
    { height: 900, name: 'desktop-1440x900', width: 1440 },
    { height: 844, name: 'mobile-390x844', width: 390 },
    { height: 900, name: 'reflow-320x900', width: 320 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await capturePhase11Surface(page, `operations-${viewport.name}`);
  }
  await expectPageToHaveNoAxeViolations(page);
});

test('runs the isolated System Insight only on request without persistent or domain state', async ({
  page,
}) => {
  const requests: unknown[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(SYSTEM_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(64) }), status: 200 });
  });
  await page.route('**/v1/insights/system/run', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: success(SYSTEM_INSIGHT_RESULT), status: 200 });
  });

  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto('/system/insights');
  await expect(page.getByRole('heading', { exact: true, name: 'Insights' })).toBeFocused();
  expect(requests).toEqual([]);

  await page.getByRole('button', { name: 'Run insight' }).focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: 'Technical overview' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Backup runtime status is not available' }),
  ).toBeVisible();
  await expect(page.getByText('0.15.0')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open system operations' })).toHaveAttribute(
    'href',
    '/system/operations',
  );
  expect(requests).toEqual([{ kind: 'SYSTEM_TECHNICAL_OVERVIEW', workspace: 'SYSTEM' }]);
  await expect(page).toHaveURL('/system/insights');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const storage = await page.evaluate(() => ({
    local: JSON.stringify(localStorage),
    session: JSON.stringify(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain('SYSTEM_TECHNICAL_OVERVIEW');

  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(page.getByText('Critical')).toBeVisible();
  await expect(page.getByText('Unavailable')).toBeVisible();
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps route boundaries focused, recoverable, and purpose-minimized', async ({ page }) => {
  let contextAvailable = false;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill(
      contextAvailable
        ? { json: success(EMPLOYEE_CONTEXT), status: 200 }
        : {
            json: {
              error: {
                code: 'DATABASE_UNAVAILABLE',
                requestId: REQUEST_ID,
              },
            },
            status: 503,
          },
    );
  });
  await page.route('**/v1/me/profile', async (route) => {
    await route.fulfill({
      json: {
        error: {
          code: 'DATABASE_UNAVAILABLE',
          requestId: REQUEST_ID,
        },
      },
      status: 503,
    });
  });
  await mockToday(page);

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'WorkLedger is temporarily unavailable' }),
  ).toBeFocused();
  await expect(page.getByText(`Request reference: ${REQUEST_ID}`)).toBeVisible();
  await expect(page.getByText(/DATABASE_UNAVAILABLE|private infrastructure/iu)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /home/iu })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expectPageToHaveNoAxeViolations(page);

  contextAvailable = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page).toHaveURL(/\/today$/u);
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/system/operations');
  await expect(page.getByRole('heading', { name: 'Permission denied' })).toBeFocused();
  await expect(page.getByText(/No restricted record details were disclosed/u)).toBeVisible();
  await capturePhase11Surface(page, 'route-boundary-permission-desktop-1440x900');
  await expectPageToHaveNoAxeViolations(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/not-a-workledger-route');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Return to WorkLedger' })).toBeVisible();
  await capturePhase11Surface(page, 'route-boundary-not-found-mobile-390x844');
  await expectPageToHaveNoAxeViolations(page);

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Page unavailable' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText(/Database connection|requested operation/iu)).toHaveCount(0);
  await capturePhase11Surface(page, 'route-boundary-error-reflow-320x900');
  await expectPageToHaveNoAxeViolations(page);
});

test('blocks protected rendering until the authoritative account locale is ready', async ({
  page,
}) => {
  let releaseContext: (() => void) | undefined;
  const contextGate = new Promise<void>((resolve) => {
    releaseContext = resolve;
  });
  await page.addInitScript(() => localStorage.setItem('workledger.locale', 'es-ES'));
  await page.route('**/v1/me/context', async (route) => {
    await contextGate;
    await route.fulfill({
      json: success({ ...EMPLOYEE_CONTEXT, locale: 'de-DE' }),
      status: 200,
    });
  });
  await mockToday(page);

  const navigation = page.goto('/today');
  await expect(page.getByRole('main')).toHaveCount(0);
  await expect(page.getByRole('heading')).toHaveCount(0);
  releaseContext?.();
  await navigation;
  await expect(page.locator('html')).toHaveAttribute('lang', 'de-DE');
  await expect(page.getByRole('heading', { name: 'Heute', exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('workledger.locale'))).toBe('es-ES');
  await expectPageToHaveNoAxeViolations(page);
});

for (const scenario of [
  {
    calendar: 'Kalender',
    calendarView: 'Monatsraster',
    locale: 'de-DE' as const,
    monthly: 'Monatszeitraum',
    monthlyReady: 'Bereit zur Einreichung',
    monthlySubmit: 'Monat einreichen',
    myTime: 'Meine Zeit',
    postedBalance: 'Gebuchter Saldo',
    requestEmpty: 'Keine Anträge entsprechen diesen Filtern',
    requests: 'Meine Anträge',
    today: 'Heute',
    todayAction: 'Pause beginnen',
    todayState: 'Arbeitszeit läuft',
  },
  {
    calendar: 'Calendario',
    calendarView: 'Cuadrícula mensual',
    locale: 'es-ES' as const,
    monthly: 'Periodo mensual',
    monthlyReady: 'Listo para enviar',
    monthlySubmit: 'Enviar mes',
    myTime: 'Mi tiempo',
    postedBalance: 'Saldo contabilizado',
    requestEmpty: 'Ninguna solicitud coincide con estos filtros',
    requests: 'Mis solicitudes',
    today: 'Hoy',
    todayAction: 'Iniciar descanso',
    todayState: 'Jornada activa',
  },
]) {
  test(`renders critical employee routes coherently in ${scenario.locale}`, async ({ page }) => {
    await page.route('**/v1/me/context', async (route) => {
      await route.fulfill({
        json: success({ ...EMPLOYEE_CONTEXT, locale: scenario.locale }),
        status: 200,
      });
    });
    await mockToday(page);
    await page.route('**/v1/me/time?*', async (route) => {
      await route.fulfill({ json: success(PERSONAL_TIME), status: 200 });
    });
    await page.route('**/v1/me/requests?*', async (route) => {
      await route.fulfill({
        json: success({
          items: [],
          pagination: { limit: 20, page: 1, total: 0, totalPages: 0 },
        }),
        status: 200,
      });
    });
    await page.route('**/v1/me/calendar*', async (route) => {
      await route.fulfill({ json: success(PERSONAL_CALENDAR), status: 200 });
    });
    await page.route(`**/v1/monthly-periods/${MONTHLY_PERIOD_ID}`, async (route) => {
      await route.fulfill({ json: success(READY_MONTHLY_PERIOD), status: 200 });
    });

    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1, name: scenario.today })).toBeFocused();
    await expect(page.getByRole('heading', { name: scenario.todayState })).toBeVisible();
    await expect(page.getByRole('button', { name: scenario.todayAction })).toBeVisible();
    await expectPageToHaveNoAxeViolations(page);

    await page.setViewportSize({ width: 320, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await capturePhase14I18nSurface(page, `${scenario.locale}-today-320x900`);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/my-time?date=2026-08-11&view=WEEK&page=1&limit=20');
    await expect(page.getByRole('heading', { level: 1, name: scenario.myTime })).toBeFocused();
    await expect(page.getByText(scenario.postedBalance, { exact: true })).toBeVisible();

    await page.goto('/requests');
    await expect(page.getByRole('heading', { level: 1, name: scenario.requests })).toBeFocused();
    await expect(page.getByRole('heading', { name: scenario.requestEmpty })).toBeVisible();

    await page.goto('/calendar?month=2026-08');
    await expect(page.getByRole('heading', { level: 1, name: scenario.calendar })).toBeFocused();
    await expect(page.getByRole('button', { name: scenario.calendarView })).toBeVisible();

    await page.goto(`/monthly-periods/${MONTHLY_PERIOD_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: scenario.monthly })).toBeFocused();
    await expect(page.getByText(scenario.monthlyReady, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: scenario.monthlySubmit })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', scenario.locale);
    await expectPageToHaveNoAxeViolations(page);
  });
}

for (const scenario of [
  {
    approvalHeading: 'Freigabe-Eingang',
    approvalResults: 'Ergebnisse des Genehmigungseingangs',
    employeeHeading: 'Mitarbeitende',
    employeeSearch: 'Mitarbeitendenverzeichnis durchsuchen',
    health: 'Beeinträchtigt',
    locale: 'de-DE' as const,
    operationsHeading: 'Betrieb',
  },
  {
    approvalHeading: 'Bandeja de aprobaciones',
    approvalResults: 'Resultados de la bandeja de aprobaciones',
    employeeHeading: 'Empleados',
    employeeSearch: 'Buscar en el directorio de empleados',
    health: 'Degradado',
    locale: 'es-ES' as const,
    operationsHeading: 'Operaciones',
  },
]) {
  test(`renders responsive manager, HR, and system workflows in ${scenario.locale}`, async ({
    page,
  }) => {
    await page.route('**/v1/me/context', async (route) => {
      await route.fulfill({
        json: success({ ...COMBINED_CONTEXT, locale: scenario.locale }),
        status: 200,
      });
    });
    await page.route('**/v1/approvals*', async (route) => {
      await route.fulfill({
        json: success({
          filterOptions: { teams: [{ id: APPROVAL_TEAM_ID, name: 'Client Services' }] },
          items: APPROVAL_ITEMS,
          pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
          timeZone: 'Europe/Berlin',
        }),
        status: 200,
      });
    });
    await page.route('**/v1/hr/employees*', async (route) => {
      await route.fulfill({
        json: success({
          items: [
            {
              account: {
                active: true,
                email: 'jordan@example.test',
                invitationPending: false,
              },
              currentEmployment: {
                endsOn: null,
                id: '123e4567-e89b-42d3-a456-426614174102',
                startsOn: '2026-08-01',
              },
              displayName: 'Jordan Lee',
              employeeNumber: 'WL-900-001',
              id: '123e4567-e89b-42d3-a456-426614174101',
              roles: ['EMPLOYEE'],
              status: 'ACTIVE',
            },
          ],
          pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
        }),
        status: 200,
      });
    });
    await page.route('**/v1/system/operations', async (route) => {
      await route.fulfill({
        json: {
          dependencies: {
            authentication: { status: 'healthy' },
            database: {
              error: 'Bounded readiness timeout.',
              latencyMs: 750,
              status: 'unavailable',
            },
          },
          environment: 'production',
          health: 'degraded',
          service: 'workledger-api',
          timestamp: '2026-08-21T10:30:00Z',
          version: '0.14.0',
        },
        status: 200,
      });
    });

    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/approvals');
    await expect(
      page.getByRole('heading', { level: 1, name: scenario.approvalHeading }),
    ).toBeFocused();
    await expect(page.getByRole('list', { name: scenario.approvalResults })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expectPageToHaveNoAxeViolations(page);
    await capturePhase14I18nSurface(page, `${scenario.locale}-approvals-320x900`);

    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await expect(
      page.getByRole('heading', { level: 1, name: scenario.approvalHeading }),
    ).toBeFocused();
    await expectPageToHaveNoAxeViolations(page);
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'no-preference' });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/employees');
    await expect(
      page.getByRole('heading', { level: 1, name: scenario.employeeHeading }),
    ).toBeFocused();
    await expect(page.getByRole('heading', { name: scenario.employeeSearch })).toBeVisible();
    await expectPageToHaveNoAxeViolations(page);
    await capturePhase14I18nSurface(page, `${scenario.locale}-employees-1440x900`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/system/operations');
    await expect(
      page.getByRole('heading', { level: 1, name: scenario.operationsHeading }),
    ).toBeFocused();
    await expect(page.getByText(scenario.health, { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', scenario.locale);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expectPageToHaveNoAxeViolations(page);
    await capturePhase14I18nSurface(page, `${scenario.locale}-operations-390x844`);
  });
}

test('uses responsive personal records and an agenda-first personal calendar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/time?*', async (route) => {
    const url = new URL(route.request().url());
    expect(Object.fromEntries(url.searchParams)).toEqual({
      date: '2026-08-11',
      limit: '20',
      page: '1',
      view: 'WEEK',
    });
    await route.fulfill({ json: success(PERSONAL_TIME), status: 200 });
  });
  await page.route('**/v1/me/calendar*', async (route) => {
    await route.fulfill({ json: success(PERSONAL_CALENDAR), status: 200 });
  });

  await page.goto('/my-time?date=2026-08-11&view=WEEK&page=1&limit=20');
  await expect(page.getByRole('heading', { name: 'My time' })).toBeFocused();
  await expect(
    page.getByRole('list', { name: 'Daily time record summaries for the selected period' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Daily time records table' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await capturePhase12Personal(page, 'my-time-mobile-390x900');
  await capturePhase13CrossRoute(page, 'my-time-mobile-390x900');
  await expectPageToHaveNoAxeViolations(page);

  await page.goto('/calendar?month=2026-08');
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeFocused();
  const agenda = page.getByRole('list', { name: 'Calendar agenda for August 2026' });
  await expect(agenda).toBeVisible();
  await expect(page.getByRole('button', { name: 'Agenda list' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('table')).toHaveCount(0);
  await capturePhase12Personal(page, 'calendar-agenda-mobile-390x900');

  await page.getByRole('button', { name: 'Month grid' }).click();
  const calendarRegion = page.getByRole('region', { name: 'Personal calendar month grid' });
  await expect(calendarRegion).toBeVisible();
  await expect(page.getByText('Scroll horizontally to review all seven days.')).toBeVisible();
  expect(
    await calendarRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 320, height: 900 });
  await capturePhase12Personal(page, 'calendar-grid-reflow-320x900');
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps request URLs neutral while showing owner evidence and a state-valid action', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  let cancellationSubmitted = false;
  const cancellationBodies: unknown[] = [];
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(EMPLOYEE_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'c'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/me/absence-requests/*/cancellations', async (route) => {
    cancellationBodies.push(route.request().postDataJSON());
    cancellationSubmitted = true;
    await route.fulfill({
      json: success({
        id: '123e4567-e89b-42d3-a456-426614174512',
        status: 'PENDING_DECISION',
        version: 1,
      }),
      status: 201,
    });
  });
  await page.route(`**/v1/me/requests/${PERSONAL_ABSENCE_ID}`, async (route) => {
    await route.fulfill({
      json: success({
        absenceTypeName: 'Vacation',
        affectedEndDate: '2026-08-18',
        affectedStartDate: '2026-08-18',
        availableActions: cancellationSubmitted ? [] : ['REQUEST_CANCELLATION'],
        coverage: [
          {
            endsAtMinute: null,
            kind: 'FULL_DAY',
            localDate: '2026-08-18',
            minutes: 480,
            startsAtMinute: null,
          },
        ],
        history: [
          {
            action: 'SUBMITTED',
            actor: 'SELF',
            occurredAt: '2026-08-12T08:00:00Z',
            reason: null,
          },
          {
            action: 'APPROVE',
            actor: 'REVIEWER',
            occurredAt: '2026-08-13T09:00:00Z',
            reason: 'Coverage matches the recorded entitlement.',
          },
        ],
        id: PERSONAL_ABSENCE_ID,
        kind: 'ABSENCE',
        relatedCancellations: [],
        status: 'APPROVED',
        submittedAt: '2026-08-12T08:00:00Z',
        version: 2,
        workflow: 'APPROVAL_REQUIRED',
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/requests?*', async (route) => {
    const url = new URL(route.request().url());
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '20',
      page: '1',
      status: 'ALL',
      type: 'ALL',
    });
    await route.fulfill({
      json: success({
        items: [
          {
            affectedEndDate: '2026-08-18',
            affectedStartDate: '2026-08-18',
            id: PERSONAL_ABSENCE_ID,
            kind: 'ABSENCE',
            status: 'APPROVED',
            submittedAt: '2026-08-12T08:00:00Z',
            version: 2,
          },
          {
            affectedEndDate: '2026-08-11',
            affectedStartDate: '2026-08-11',
            id: PERSONAL_CORRECTION_ID,
            kind: 'CORRECTION',
            status: 'SUBMITTED',
            submittedAt: '2026-08-11T18:00:00Z',
            version: 1,
          },
        ],
        pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
      }),
      status: 200,
    });
  });

  await page.goto('/requests');
  await expect(page.getByRole('heading', { name: 'My requests' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Absence request' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Time correction' })).toBeVisible();
  await expect(page.getByText('Vacation')).toHaveCount(0);
  await expect(page).toHaveURL(/\/requests\?*$/u);

  await page
    .getByRole('heading', { name: 'Absence request' })
    .locator('xpath=ancestor::article')
    .getByRole('link', { name: 'View request details' })
    .click();
  await expect(page.getByRole('heading', { name: 'Vacation' })).toBeFocused();
  await expect(page).toHaveURL(`/requests/${PERSONAL_ABSENCE_ID}`);
  await expect(page.getByRole('heading', { name: 'Decision history' })).toBeVisible();
  await expect(page.getByText(/Coverage matches the recorded entitlement/u)).toBeVisible();
  await expect(
    page.getByText(/absence remains effective until that request is approved/iu),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Request cancellation' }).click();
  await expect(page.getByRole('heading', { name: 'Request updated' })).toBeVisible();
  expect(cancellationBodies).toEqual([{ expectedRequestVersion: 2 }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await capturePhase12Personal(page, 'request-detail-mobile-390x900');
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
  await expect(page.getByRole('heading', { name: 'Team calendar', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Agenda list' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const agenda = page.getByRole('list', { name: 'Team availability agenda for August 2026' });
  await expect(agenda).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(agenda.getByText('Maria Chen')).toBeVisible();
  await expect(agenda.getByText('Unavailable — full day')).toBeVisible();
  await expect(agenda.getByText('Noah Williams')).toBeVisible();
  await expect(agenda.getByText('Unavailable — second half of expected work')).toBeVisible();

  const augustFifteenth = agenda
    .getByRole('heading', { name: /Saturday, 15 August 2026/u })
    .locator('..');
  await augustFifteenth.getByRole('button', { name: 'Select date' }).click();
  await expect(page.getByText('Selected date', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Saturday, 15 August 2026' }).last(),
  ).toBeVisible();
  await capturePhase12Manager(page, 'team-calendar-agenda-mobile-390x844');

  await page.getByRole('button', { name: 'Month grid' }).click();
  await expect(page.getByRole('button', { name: 'Month grid' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const table = page.getByRole('table', { name: /Neutral team unavailability for August 2026/u });
  await expect(table).toBeVisible();
  await expect(table.getByText('Maria Chen')).toBeVisible();
  await expect(table.getByText('Noah Williams')).toBeVisible();
  const gridRegion = page.getByRole('region', { name: 'Team availability month grid' });
  await expect(gridRegion).toBeVisible();
  await expect(page.getByText('Scroll horizontally to review all seven days.')).toBeVisible();
  expect(await gridRegion.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  expect(requestedMonths).toContain('2026-08');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByText(/sickness|vacation|medical/iu)).toHaveCount(0);
  await capturePhase12Manager(page, 'team-calendar-grid-mobile-390x844');
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
            browser: 'CHROME',
            createdAt: '2026-08-11T08:00:00Z',
            current: true,
            expiresAt: '2026-08-11T20:00:00Z',
            id: '123e4567-e89b-42d3-a456-426614174111',
            lastActiveAt: '2026-08-11T09:00:00Z',
            platform: 'MACOS',
          },
        ],
        timeZone: 'Europe/Berlin',
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

test('creates, invites, and assigns an employee through the keyboard-complete HR workflow', async ({
  page,
}) => {
  const employeeId = '123e4567-e89b-42d3-a456-426614174901';
  const teamId = '123e4567-e89b-42d3-a456-426614174903';
  const managerId = '123e4567-e89b-42d3-a456-426614174904';
  const scheduleId = '123e4567-e89b-42d3-a456-426614174905';
  const submittedBodies: unknown[] = [];
  const assignmentBodies: unknown[] = [];
  const employeeDetail = {
    account: {
      active: false,
      email: 'jordan@example.test',
      invitationPending: true,
    },
    currentEmployment: {
      endsOn: null,
      id: '123e4567-e89b-42d3-a456-426614174902',
      startsOn: '2026-08-18',
    },
    displayName: 'Jordan Lee',
    employeeNumber: 'NS-021',
    employmentHistory: [
      {
        endsOn: null,
        id: '123e4567-e89b-42d3-a456-426614174902',
        startsOn: '2026-08-18',
      },
    ],
    id: employeeId,
    privilegedActionsAllowed: true,
    roles: ['EMPLOYEE', 'MANAGER'],
    status: 'ACTIVE',
  };
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(HR_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'h'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/hr/employees', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-workledger-csrf']).toBe('h'.repeat(43));
      submittedBodies.push(route.request().postDataJSON());
      await route.fulfill({ json: success(employeeDetail), status: 200 });
      return;
    }
    await route.fulfill({
      json: success({ items: [], pagination: { limit: 20, page: 1, total: 0, totalPages: 0 } }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}`, async (route) => {
    await route.fulfill({ json: success(employeeDetail), status: 200 });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/assignments`, async (route) => {
    await route.fulfill({
      json: success({
        activeTeams: [{ active: true, id: teamId, name: 'Client Services' }],
        asOfLocalDate: '2026-08-14',
        currentManager: null,
        currentTeam: null,
        eligibleManagers: [
          {
            displayName: 'Alex Morgan',
            employeeNumber: 'NS-010',
            id: managerId,
          },
        ],
        managerHistory: [],
        privilegedActionsAllowed: true,
        teamHistory: [],
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/schedule`, async (route) => {
    const scheduleVersion = {
      id: scheduleId,
      latestVersion: true,
      name: 'Standard week',
      scheduledMinutes: {
        FRIDAY: 480,
        MONDAY: 480,
        SATURDAY: 0,
        SUNDAY: 0,
        THURSDAY: 480,
        TUESDAY: 480,
        WEDNESDAY: 480,
      },
      version: 1,
      weeklyTotalMinutes: 2400,
    };
    await route.fulfill({
      json: success({
        asOfLocalDate: '2026-08-14',
        assignableSchedules: [scheduleVersion],
        coverageGaps: [{ endsOn: null, startsOn: '2026-08-18' }],
        currentAssignment: null,
        history: [],
        privilegedActionsAllowed: true,
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/policy`, async (route) => {
    await route.fulfill({
      json: success({
        asOfLocalDate: '2026-08-14',
        assignablePolicies: [],
        coverageGaps: [{ endsOn: null, startsOn: '2026-08-18' }],
        currentAssignment: null,
        history: [],
        privilegedActionsAllowed: true,
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/entitlements`, async (route) => {
    await route.fulfill({
      json: success({
        accounts: [],
        adjustableAbsenceTypes: [],
        asOfLocalDate: '2026-08-14',
        privilegedActionsAllowed: true,
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/team-assignment`, async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('h'.repeat(43));
    assignmentBodies.push(route.request().postDataJSON());
    await route.fulfill({
      json: success({
        action: 'TEAM_ASSIGNMENT_CHANGED',
        occurredAt: '2026-08-14T10:30:45Z',
        targetId: employeeId,
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/manager-assignment`, async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('h'.repeat(43));
    assignmentBodies.push(route.request().postDataJSON());
    await route.fulfill({
      json: success({
        action: 'MANAGER_ASSIGNMENT_CHANGED',
        occurredAt: '2026-08-14T10:30:45Z',
        targetId: employeeId,
      }),
      status: 200,
    });
  });
  await page.route(`**/v1/hr/employees/${employeeId}/schedule-assignment`, async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('h'.repeat(43));
    assignmentBodies.push(route.request().postDataJSON());
    await route.fulfill({
      json: success({
        action: 'SCHEDULE_ASSIGNMENT_CHANGED',
        occurredAt: '2026-08-14T10:30:45Z',
        targetId: employeeId,
      }),
      status: 200,
    });
  });

  await page.goto('/employees/new');
  await expect(page.getByRole('heading', { name: 'Add employee' })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capturePhase11Surface(page, 'employees-desktop-1440x900');
  await page.setViewportSize({ width: 390, height: 844 });
  await capturePhase11Surface(page, 'employees-mobile-390x844');
  await page.setViewportSize({ width: 320, height: 900 });
  await capturePhase11Surface(page, 'employees-reflow-320x900');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Create and invite employee' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await page.getByLabel('Display name').fill('Jordan Lee');
  await page.getByLabel('Employee number').fill('NS-021');
  await page.getByLabel('Account email').fill('Jordan@example.test');
  await page.getByLabel('Employment starts on').fill('2026-08-18');
  await page.getByLabel('Invitation language').selectOption('de-DE');
  await page.getByLabel('Manager').check();
  await page.getByRole('button', { name: 'Create and invite employee' }).click();

  await expect(page).toHaveURL(new RegExp(`/employees/${employeeId}$`, 'u'));
  await expect(page.getByRole('heading', { name: 'Jordan Lee' })).toBeFocused();
  expect(submittedBodies).toEqual([
    {
      displayName: 'Jordan Lee',
      email: 'jordan@example.test',
      employeeNumber: 'NS-021',
      employmentStartsOn: '2026-08-18',
      locale: 'de-DE',
      roles: ['EMPLOYEE', 'MANAGER'],
    },
  ]);
  await page.getByLabel('Team change').selectOption(teamId);
  await page.getByLabel('Effective from', { exact: true }).first().fill('2026-08-18');
  await page.getByRole('button', { name: 'Save team assignment' }).click();
  await expect(page.getByRole('status')).toContainText('Team assignment updated.');
  await page.getByLabel('Direct-manager change').selectOption(managerId);
  await page.getByLabel('Effective from', { exact: true }).nth(1).fill('2026-08-18');
  await page.getByRole('button', { name: 'Save direct-manager assignment' }).click();
  await expect(page.getByRole('status')).toContainText('Direct-manager assignment updated.');
  await page.getByLabel('Weekly schedule version').selectOption(scheduleId);
  await page.getByLabel('Effective from', { exact: true }).nth(2).fill('2026-08-18');
  await page.getByRole('button', { name: 'Save weekly schedule' }).click();
  await expect(
    page.getByText('The schedule assignment was updated.', { exact: false }),
  ).toBeVisible();
  expect(assignmentBodies).toEqual([
    { effectiveFrom: '2026-08-18', teamId },
    { effectiveFrom: '2026-08-18', managerEmployeeId: managerId },
    { effectiveFrom: '2026-08-18', scheduleId },
  ]);
  expect(JSON.stringify(submittedBodies)).not.toMatch(/SYSTEM_ADMINISTRATOR|token/iu);
  await expectPageToHaveNoAxeViolations(page);
});

test('creates an immutable weekly schedule version with keyboard-recoverable validation', async ({
  page,
}) => {
  let submittedBody: unknown;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(HR_CONTEXT), status: 200 });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 's'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/hr/time-settings', async (route) => {
    await route.fulfill({
      json: success({ policyVersions: [], scheduleVersions: [] }),
      status: 200,
    });
  });
  await page.route('**/v1/hr/time-settings/schedule-versions', async (route) => {
    expect(route.request().headers()['x-workledger-csrf']).toBe('s'.repeat(43));
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      json: success({
        action: 'SCHEDULE_VERSION_CREATED',
        occurredAt: '2026-08-14T10:30:45Z',
        targetId: '123e4567-e89b-42d3-a456-426614174906',
      }),
      status: 200,
    });
  });

  await page.goto('/settings/time');
  await expect(page.getByRole('heading', { name: 'Time settings' })).toBeFocused();
  await page.getByRole('button', { name: 'Create schedule version' }).click();
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByRole('link', { name: 'Enter a schedule name.' })).toHaveAttribute(
    'href',
    '#schedule-name',
  );
  await page.getByLabel('Schedule name').fill('Reduced Friday');
  await page.getByLabel('Scheduled minutes for Friday').fill('360');
  await page.getByRole('button', { name: 'Create schedule version' }).click();

  await expect(page.getByRole('status')).toContainText('Employee assignments remain unchanged');
  expect(submittedBody).toEqual({
    name: 'Reduced Friday',
    scheduledMinutes: {
      FRIDAY: 360,
      MONDAY: 480,
      SATURDAY: 0,
      SUNDAY: 0,
      THURSDAY: 480,
      TUESDAY: 480,
      WEDNESDAY: 480,
    },
  });
  await expectPageToHaveNoAxeViolations(page);
});

test('keeps employee, team, and technical audit administration usable from reflow to desktop', async ({
  page,
}) => {
  const employeeSearchBodies: unknown[] = [];
  await page.setViewportSize({ width: 320, height: 900 });
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({ json: success(COMBINED_CONTEXT), status: 200 });
  });
  await page.route('**/v1/hr/employees**', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().headers()['x-workledger-csrf']).toBe('h'.repeat(43));
      employeeSearchBodies.push(route.request().postDataJSON());
    }
    await route.fulfill({
      json: success({
        items: [
          {
            account: {
              active: false,
              email: 'long.employee.account@example.test',
              invitationPending: true,
            },
            currentEmployment: {
              endsOn: null,
              id: '123e4567-e89b-42d3-a456-426614174971',
              startsOn: '2026-08-01',
            },
            displayName:
              'Alexandra Very Long Employee Name for Reflow and Localization Verification',
            employeeNumber: 'WL-EMPLOYEE-VERY-LONG-0001',
            id: '123e4567-e89b-42d3-a456-426614174970',
            roles: ['EMPLOYEE', 'MANAGER'],
            status: 'ACTIVE',
          },
        ],
        pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
      }),
      status: 200,
    });
  });
  await page.route('**/v1/me/csrf', async (route) => {
    await route.fulfill({ json: success({ token: 'h'.repeat(43) }), status: 200 });
  });
  await page.route('**/v1/hr/teams*', async (route) => {
    await route.fulfill({
      json: success({
        items: [
          {
            active: true,
            currentMemberCount: 3,
            id: 'team-client-services',
            name: 'International Client Services and Workplace Operations',
          },
        ],
        pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
      }),
      status: 200,
    });
  });
  await page.route('**/v1/system/security-audit*', async (route) => {
    await route.fulfill({
      json: success({
        items: [
          {
            action: 'AUTHORIZATION_SCOPE_DENIED',
            actor: { kind: 'ACCOUNT', role: 'SYSTEM_ADMINISTRATOR' },
            facts: { failureCategory: 'OUTSIDE_SCOPE', httpStatus: 403, scope: 'TECHNICAL' },
            id: 'technical-audit-event-1',
            occurredAt: '2026-08-24T10:15:00Z',
            outcome: 'DENIED',
            privileged: true,
            reasonCode: 'ACCESS_DENIED',
            targetKind: 'AUTHORIZATION',
            targetReference:
              'authorization-reference-with-hostile-unbroken-content-0000000000000000000000000001',
          },
        ],
        pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
      }),
      status: 200,
    });
  });

  await page.goto('/employees');
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeFocused();
  await expect(page.getByRole('list', { name: 'Employee directory results' })).toBeVisible();
  await expect(page.getByRole('table', { name: /Employee directory results/u })).toHaveCount(0);
  await expect(
    page.getByRole('link', {
      name: 'Open record for Alexandra Very Long Employee Name for Reflow and Localization Verification',
    }),
  ).toBeVisible();
  await page
    .getByRole('searchbox', { name: 'Name, employee number, or account email' })
    .fill('long.employee.account@example.test');
  await page.getByRole('button', { name: 'Search directory' }).click();
  await expect(page).toHaveURL('/employees?limit=20&page=1&status=ALL');
  expect(employeeSearchBodies).toEqual([
    {
      limit: 20,
      page: 1,
      search: 'long.employee.account@example.test',
      status: 'ALL',
    },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await capturePhase12Administration(page, 'employees-reflow-320x900');
  await capturePhase13Administration(page, 'employees-320x900');
  await expectPageToHaveNoAxeViolations(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('table', { name: /Employee directory results/u })).toBeVisible();
  await capturePhase12Administration(page, 'employees-desktop-1440x900');
  await capturePhase13Administration(page, 'employees-1440x900');

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/teams?limit=20&page=1&status=ALL');
  await expect(page.getByRole('heading', { name: 'Teams', exact: true })).toBeFocused();
  await expect(page.getByRole('list', { name: 'Team catalog results' })).toBeVisible();
  const teamAction = page.getByRole('button', {
    name: 'Deactivate International Client Services and Workplace Operations',
  });
  await expect(teamAction).toBeDisabled();
  await expect(teamAction).toHaveAccessibleDescription(/Move all current members/u);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await capturePhase13Administration(page, 'teams-320x900');
  await expectPageToHaveNoAxeViolations(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('table', { name: /Teams matching/u })).toBeVisible();
  await capturePhase13Administration(page, 'teams-1440x900');
  await page.getByRole('link', { name: 'Create team' }).click();
  await expect(page.getByRole('textbox', { name: 'Team name' })).toBeFocused();

  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/system/audit');
  await expect(page.getByRole('heading', { name: 'Technical audit', exact: true })).toBeFocused();
  await expect(page.getByText('AUTHORIZATION_SCOPE_DENIED')).toBeVisible();
  const auditRegion = page.getByRole('region', { name: 'Technical audit results' });
  const auditTable = page.getByRole('table', {
    name: 'Redacted security and technical audit events, newest first',
  });
  const auditWrapper = auditTable.locator('..');
  await expect(auditRegion).toHaveAttribute('tabindex', '0');
  await expect(auditRegion).toContainText(/scroll this results region horizontally/iu);
  await capturePhase12Administration(page, 'technical-audit-reflow-320x900');
  await page.getByLabel('Target type').selectOption('AUTHORIZATION');
  await page.getByText('View redacted detail').click();
  await expect(page.getByText(/HTTP status: 403/u)).toBeVisible();
  await expect(page.getByText(/account-secret|sickness detail/iu)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await auditRegion.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await capturePhase12Administration(page, 'technical-audit-detail-reflow-320x900');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(auditRegion).toHaveCount(0);
  await expect(auditWrapper).not.toHaveAttribute('tabindex');
  await expect(auditWrapper).not.toContainText(/scroll this results region horizontally/iu);
  await page.emulateMedia({ forcedColors: 'active' });
  await expectPageToHaveNoAxeViolations(page);
});

test('captures, cleans, and consumes an invitation grant without automatic sign-in', async ({
  page,
}) => {
  const invitationToken = 'i'.repeat(43);
  let submittedBody: unknown;
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill({
      json: {
        error: { code: 'AUTH_REQUIRED', requestId: REQUEST_ID },
      },
      status: 401,
    });
  });
  await page.route('**/v1/account-invitations/activate', async (route) => {
    submittedBody = route.request().postDataJSON();
    expect(route.request().headers()['origin']).toBe(new URL(page.url()).origin);
    await route.fulfill({ json: success({ activated: true }), status: 200 });
  });

  await page.goto(`/activate-account?token=${invitationToken}#discarded`);
  await expect(page).toHaveURL(/\/activate-account$/u);
  await expect(page.getByRole('heading', { name: 'Activate your account' })).toBeFocused();
  await page.getByLabel('New password', { exact: true }).fill('safe invitation passphrase 2026');
  await page
    .getByLabel('Confirm new password', { exact: true })
    .fill('safe invitation passphrase 2026');
  await page.getByRole('button', { name: 'Activate account' }).click();

  await expect(page).toHaveURL(/\/sign-in$/u);
  await expect(page.getByRole('status')).toContainText(
    'Your account is active. Sign in with your new password.',
  );
  expect(submittedBody).toEqual({
    password: 'safe invitation passphrase 2026',
    token: invitationToken,
  });
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeFocused();
  await expectPageToHaveNoAxeViolations(page);
});

function todayForAttendanceState(
  state: TodayAttendance['attendance']['state'],
  attendanceRevision: number,
  timeline?: TodayAttendance['timeline'],
): TodayAttendance {
  const defaultTimeline: TodayAttendance['timeline'] =
    state === 'OFF_WORK'
      ? []
      : state === 'WORKING'
        ? [
            {
              id: 'punch-clock-in-state',
              occurredAt: '2026-08-11T09:30:00Z',
              type: 'CLOCK_IN',
            },
          ]
        : [
            {
              id: 'punch-clock-in-state',
              occurredAt: '2026-08-11T09:30:00Z',
              type: 'CLOCK_IN',
            },
            {
              id: 'punch-break-start-state',
              occurredAt: '2026-08-11T10:30:00Z',
              type: 'BREAK_START',
            },
          ];
  return {
    ...TODAY_ATTENDANCE,
    attendance: attendanceForState(state, attendanceRevision),
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      estimatedFinishAt:
        state === 'WORKING' ? TODAY_ATTENDANCE.calculation.estimatedFinishAt : null,
      estimatedFinishUnavailableReason:
        state === 'WORKING' ? null : state === 'ON_BREAK' ? 'ON_BREAK' : 'NOT_WORKING',
    },
    timeline: timeline ?? defaultTimeline,
  };
}

function attendanceForState(
  state: TodayAttendance['attendance']['state'],
  attendanceRevision: number,
): TodayAttendance['attendance'] {
  const validActions: TodayAttendance['attendance']['validActions'] =
    state === 'WORKING'
      ? ['START_BREAK', 'CLOCK_OUT']
      : state === 'ON_BREAK'
        ? ['RESUME', 'CLOCK_OUT']
        : ['CLOCK_IN'];
  const activeSince =
    state === 'WORKING'
      ? '2026-08-11T09:30:00Z'
      : state === 'ON_BREAK'
        ? '2026-08-11T10:30:00Z'
        : null;

  return {
    actionAvailability: [
      actionAvailabilityFor('CLOCK_IN', validActions),
      actionAvailabilityFor('START_BREAK', validActions),
      actionAvailabilityFor('RESUME', validActions),
      actionAvailabilityFor('CLOCK_OUT', validActions),
    ],
    activeElapsedMinutes: state === 'WORKING' ? 75 : state === 'ON_BREAK' ? 15 : null,
    activeSince,
    attendanceRevision,
    state,
    validActions,
  };
}

function actionAvailabilityFor(
  command: TodayAttendance['attendance']['validActions'][number],
  validActions: TodayAttendance['attendance']['validActions'],
): TodayAttendance['attendance']['actionAvailability'][number] {
  return validActions.includes(command)
    ? { available: true, blockingReason: null, command }
    : { available: false, blockingReason: 'CURRENT_ATTENDANCE_STATE', command };
}

async function mockContext(page: Page, isAuthenticated: () => boolean): Promise<void> {
  await page.route('**/v1/me/context', async (route) => {
    await route.fulfill(
      isAuthenticated()
        ? { json: success(EMPLOYEE_CONTEXT), status: 200 }
        : {
            json: {
              error: {
                code: 'AUTH_REQUIRED',
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

async function capturePhase11Surface(page: Page, name: string): Promise<void> {
  if (process.env['WORKLEDGER_CAPTURE_PHASE_11'] !== '1') return;
  const directory = 'output/playwright/wl1106';
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: `${directory}/${name}.png`,
  });
}

async function captureWl1504Foundation(page: Page): Promise<void> {
  if (process.env['WORKLEDGER_CAPTURE_WL1504'] !== '1') return;
  const directory = 'output/playwright/wl1504';
  await mkdir(directory, { recursive: true });
  await page.screenshot({
    animations: 'disabled',
    fullPage: true,
    path: `${directory}/employee-insight-context-reflow-320x800.png`,
  });
}

async function capturePhase12Today(page: Page, name: string): Promise<void> {
  await capturePhase12Surface(page, 'wl1200', name);
}

async function capturePhase12Personal(page: Page, name: string): Promise<void> {
  await capturePhase12Surface(page, 'wl1201', name);
}

async function capturePhase12Manager(page: Page, name: string): Promise<void> {
  await capturePhase12Surface(page, 'wl1203', name);
}

async function capturePhase12Administration(page: Page, name: string): Promise<void> {
  await capturePhase12Surface(page, 'wl1204', name);
}

async function capturePhase13Evidence(page: Page, name: string): Promise<void> {
  if (process.env['WORKLEDGER_ASSERT_PHASE_13_BASELINES'] !== '1') return;

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(['phase-13', 'wl1305', `${name}.png`], {
    animations: 'disabled',
    fullPage: true,
  });
}

async function capturePhase13TodayGate(page: Page, name: string): Promise<void> {
  await capturePhase13Surface(page, name, 'WORKLEDGER_ASSERT_PHASE_13_TODAY_GATE', 'wl1307');
}

async function capturePhase13ApprovalInbox(page: Page, name: string): Promise<void> {
  await capturePhase13Surface(page, name, 'WORKLEDGER_ASSERT_PHASE_13_APPROVALS', 'wl1308');
}

async function capturePhase13TeamStatus(page: Page, name: string): Promise<void> {
  await capturePhase13Surface(page, name, 'WORKLEDGER_ASSERT_PHASE_13_TEAM', 'wl1309');
}

async function capturePhase13Administration(page: Page, name: string): Promise<void> {
  await capturePhase13Surface(page, name, 'WORKLEDGER_ASSERT_PHASE_13_ADMINISTRATION', 'wl1310');
}

async function capturePhase13CrossRoute(page: Page, name: string): Promise<void> {
  if (process.env['WORKLEDGER_ASSERT_PHASE_13_VISUALS'] !== '1') return;

  await capturePhase13Screenshot(page, 'wl1312', name);
}

async function capturePhase14I18nSurface(page: Page, name: string): Promise<void> {
  if (process.env['WORKLEDGER_ASSERT_PHASE_14_I18N_VISUALS'] !== '1') return;

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(['phase-14', 'wl1409', `${name}.png`], {
    animations: 'disabled',
    fullPage: true,
  });
}

async function capturePhase13Surface(
  page: Page,
  name: string,
  taskEnvironmentVariable:
    | 'WORKLEDGER_ASSERT_PHASE_13_ADMINISTRATION'
    | 'WORKLEDGER_ASSERT_PHASE_13_APPROVALS'
    | 'WORKLEDGER_ASSERT_PHASE_13_TEAM'
    | 'WORKLEDGER_ASSERT_PHASE_13_TODAY_GATE',
  historicalTask: 'wl1307' | 'wl1308' | 'wl1309' | 'wl1310',
): Promise<void> {
  const currentGateEnabled = process.env['WORKLEDGER_ASSERT_PHASE_13_VISUALS'] === '1';
  const historicalGateEnabled = process.env[taskEnvironmentVariable] === '1';
  if (!currentGateEnabled && !historicalGateEnabled) return;

  await capturePhase13Screenshot(page, currentGateEnabled ? 'wl1312' : historicalTask, name);
}

async function capturePhase13Screenshot(
  page: Page,
  task: 'wl1307' | 'wl1308' | 'wl1309' | 'wl1310' | 'wl1312',
  name: string,
): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(['phase-13', task, `${name}.png`], {
    animations: 'disabled',
    fullPage: true,
  });
}

async function capturePhase12Surface(
  page: Page,
  area: 'wl1200' | 'wl1201' | 'wl1203' | 'wl1204',
  name: string,
): Promise<void> {
  const shouldCapture = process.env['WORKLEDGER_CAPTURE_PHASE_12'] === '1';
  const shouldAssertVisuals = process.env['WORKLEDGER_ASSERT_PHASE_12_VISUALS'] === '1';
  if (!shouldCapture && !shouldAssertVisuals) return;

  await page.evaluate(() => window.scrollTo(0, 0));

  if (shouldCapture) {
    const directory = `output/playwright/${area}`;
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      animations: 'disabled',
      fullPage: true,
      path: `${directory}/${name}.png`,
    });
  }

  if (shouldAssertVisuals) {
    await expect(page).toHaveScreenshot(['phase-12', area, `${name}.png`], {
      animations: 'disabled',
      fullPage: true,
    });
  }
}
