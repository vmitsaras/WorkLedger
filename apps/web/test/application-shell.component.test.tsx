import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type {
  DailyTimeRecord,
  MyTime,
  PersonalCalendar,
  PersonalRequestDetail,
  SelfContext,
  SelfProfile,
  SystemDiagnosticsResponse,
  TodayAttendance,
} from '@workledger/contracts';
import { COHERENT_TODAY_ATTENDANCE, expectNoAxeViolations } from '@workledger/test-utils';
import { initializeLocale } from '@workledger/i18n';

import {
  createWebLocaleController,
  LocaleControllerProvider,
  type WebLocaleController,
} from '../src/app/locale.js';
import { createWorkLedgerQueryClient, todayAttendanceQuery } from '../src/app/query.js';
import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const EMPTY_REQUEST_HISTORY = {
  items: [],
  pagination: { limit: 20, page: 1, total: 0, totalPages: 0 },
} as const;
let routerSequence = 0;
const EMPLOYEE_CONTEXT: SelfContext = {
  account: { email: 'emma@northstar.test', name: 'Emma Reed' },
  defaultPath: '/today',
  locale: 'en-GB',
  employee: { displayName: 'Emma Reed', employeeNumber: 'NS-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE'],
};
const SYSTEM_CONTEXT: SelfContext = {
  account: { email: 'system@northstar.test', name: 'System Administrator' },
  defaultPath: '/system/operations',
  locale: 'en-GB',
  employee: null,
  navigationAreas: ['SYSTEM'],
  organization: { name: 'Northstar Studio' },
  roles: ['SYSTEM_ADMINISTRATOR'],
};
const COMBINED_CONTEXT: SelfContext = {
  account: { email: 'alex@northstar.test', name: 'Alex Morgan' },
  defaultPath: '/today',
  locale: 'en-GB',
  employee: { displayName: 'Alex Morgan', employeeNumber: 'NS-099', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE', 'MANAGER', 'HR', 'SYSTEM'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'],
};
const SYSTEM_DIAGNOSTICS: SystemDiagnosticsResponse = {
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
};
const TODAY_ATTENDANCE: TodayAttendance = COHERENT_TODAY_ATTENDANCE;

const MY_TIME: MyTime = {
  balance: {
    eligibleProjectedMinutes: 15,
    excludedIncompleteDates: ['2026-08-13'],
    postedBalanceMinutes: 630,
    projectedBalanceMinutes: 645,
  },
  ledger: {
    entries: [
      {
        balanceAfterMinutes: 600,
        effectiveDate: '2026-08-01',
        entryType: 'OPENING_BALANCE',
        explanationCode: 'OPENING_BALANCE',
        minutes: 600,
        postedAt: '2026-08-01T08:00:00Z',
      },
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
    total: 2,
  },
  leave: {
    accounts: [
      {
        availableMinutes: 4800,
        name: 'Vacation',
        projectedRemainingMinutes: 4080,
        reservedMinutes: 720,
      },
    ],
    ledger: {
      entries: [
        {
          absenceTypeName: 'Vacation',
          availableAfterMinutes: 4800,
          effectiveOn: '2026-08-11',
          entryType: 'ALLOCATION',
          minutes: 4800,
          postedAt: '2026-08-01T08:00:00Z',
          projectedAfterMinutes: 4800,
          reservedAfterMinutes: 0,
        },
        {
          absenceTypeName: 'Vacation',
          availableAfterMinutes: 4800,
          effectiveOn: '2026-08-11',
          entryType: 'PENDING_RESERVATION',
          minutes: -720,
          postedAt: '2026-08-11T08:00:00Z',
          projectedAfterMinutes: 4080,
          reservedAfterMinutes: 720,
        },
      ],
      limit: 20,
      page: 1,
      total: 2,
    },
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

const PERSONAL_CALENDAR: PersonalCalendar = {
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

const DAILY_TIME_RECORD: DailyTimeRecord = {
  attention: {
    blockers: [],
    warnings: ['FLEX_NEGATIVE_THRESHOLD_EXCEEDED'],
  },
  calculation: {
    absenceCreditMinutes: 0,
    adjustmentMinutes: 0,
    balanceMinutes: 30,
    breakMinutes: 30,
    creditedMinutes: 510,
    expectedMinutes: 480,
    workedMinutes: 510,
  },
  events: [
    { occurredAt: '2026-08-11T07:00:00Z', sequence: 1, type: 'CLOCK_IN' },
    { occurredAt: '2026-08-11T11:00:00Z', sequence: 2, type: 'BREAK_START' },
    { occurredAt: '2026-08-11T11:30:00Z', sequence: 3, type: 'BREAK_END' },
    { occurredAt: '2026-08-11T16:00:00Z', sequence: 4, type: 'CLOCK_OUT' },
  ],
  localDate: '2026-08-11',
  sessions: [
    {
      breaks: [
        {
          durationMinutes: 30,
          endsAt: '2026-08-11T11:30:00Z',
          startsAt: '2026-08-11T11:00:00Z',
        },
      ],
      continuesFromPreviousDate: false,
      continuesToNextDate: false,
      workIntervals: [
        {
          durationMinutes: 240,
          endsAt: '2026-08-11T11:00:00Z',
          startsAt: '2026-08-11T07:00:00Z',
        },
        {
          durationMinutes: 270,
          endsAt: '2026-08-11T16:00:00Z',
          startsAt: '2026-08-11T11:30:00Z',
        },
      ],
    },
  ],
  status: 'COMPLETE',
  timeZone: 'Europe/Berlin',
};

afterEach(() => {
  clearSessionMemory();
  onlineManager.setOnline(true);
  vi.unstubAllGlobals();
});

test('shows accessible sign-in validation without attempting authentication', async () => {
  const fetchMock = vi.fn(async () => authenticationErrorResponse('AUTH_REQUIRED'));
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  const { container } = renderApplication('/sign-in');

  const heading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Sign in | WorkLedger');
  expect(screen.getByRole('textbox', { name: 'Email address' })).toHaveAttribute(
    'autocomplete',
    'username',
  );

  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  const summary = screen.getByRole('alert');
  await waitFor(() => expect(summary).toHaveFocus());
  expect(screen.getByRole('link', { name: 'Enter your email address.' })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await expectNoAxeViolations(container);
});

test('applies validated public identity and preserves text and favicon fallbacks', async () => {
  const identity = {
    accentColor: '#14532d',
    faviconPath: '/identity/northstar.svg',
    logoPath: '/identity/northstar.webp',
    organizationName: 'Northstar Studio International Operations',
  } as const;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return authenticationErrorResponse('AUTH_REQUIRED');
      if (path === '/v1/identity') return successResponse(identity);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );

  const { container } = renderApplication('/sign-in');
  expect(await screen.findByText(identity.organizationName)).toBeVisible();
  expect(screen.getByText('WorkLedger', { selector: '.wl-product-name' })).toBeVisible();
  expect(document.documentElement.style.getPropertyValue('--wl-identity-accent')).toBe(
    identity.accentColor,
  );

  const logo = container.querySelector<HTMLImageElement>('.wl-company-logo');
  expect(logo).not.toBeNull();
  expect(logo).toHaveAttribute('alt', '');
  expect(logo).toHaveAttribute('width', '192');
  if (logo !== null) fireEvent.error(logo);
  await waitFor(() => expect(container.querySelector('.wl-company-logo')).toBeNull());
  expect(screen.getByText('N', { selector: '.wl-company-fallback-mark' })).toBeVisible();
  expect(screen.getByText(identity.organizationName)).toBeVisible();

  const favicon = document.querySelector<HTMLLinkElement>('#workledger-favicon');
  expect(favicon?.getAttribute('href')).toBe(identity.faviconPath);
  favicon?.dispatchEvent(new Event('error'));
  expect(favicon?.getAttribute('href')).toBe('/workledger-favicon.svg');
  await expectNoAxeViolations(container);
});

test('renders the role-aware shell and focuses each completed route navigation', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const todayHeading = await screen.findByRole('heading', { name: 'Today' });
  await waitFor(() => expect(todayHeading).toHaveFocus());
  expect(document.title).toBe('Today | WorkLedger');
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  expect(screen.getByRole('navigation', { name: 'My work navigation' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
  expect(screen.queryByRole('link', { name: 'Operations' })).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Working' })).toBeVisible();
  const progress = screen.getByRole('region', { name: 'Today’s progress' });
  expect(within(progress).getByText('3h 15m credited')).toBeVisible();
  expect(within(progress).getByText('Worked today')).toBeVisible();
  expect(within(progress).getByText('Breaks')).toBeVisible();
  expect(within(progress).getByText('Remaining today')).toBeVisible();
  expect(within(progress).getByText('Estimated finish')).toBeVisible();
  expect(within(progress).getByText('Provisional difference')).toBeVisible();
  expect(within(progress).getByText('−4h 45m')).toBeVisible();
  expect(within(progress).getByText('5:30 PM')).toBeVisible();
  expect(within(progress).getByText('Assumes no additional break.')).toBeVisible();
  expect(within(progress).getByText('4h 45m')).toBeVisible();
  expect(within(progress).getByText('0h 30m')).toBeVisible();
  const progressbar = within(progress).getByRole('progressbar', {
    name: 'Today’s credited progress',
  });
  expect(progressbar).toHaveAttribute('max', '480');
  expect(progressbar).toHaveAttribute('value', '195');
  expect(progressbar).toHaveAttribute('aria-valuetext', '3h 15m credited of 8h 00m expected.');
  const postedBalance = screen.getByRole('region', { name: 'Posted balance' });
  expect(within(postedBalance).getByText('+6h 20m')).toBeVisible();
  expect(postedBalance).toHaveTextContent('Posted through Monday, August 10, 2026.');
  expect(
    within(postedBalance).getByText(/Today is still provisional and is not included/u),
  ).toBeVisible();
  expect(screen.getByRole('group', { name: 'Attendance actions' })).toBeVisible();
  const currentStatus = screen
    .getByRole('heading', { name: 'Working' })
    .closest('.wl-today-status');
  const actions = screen
    .getByRole('group', { name: 'Attendance actions' })
    .closest('.wl-today-action-footer');
  const timeline = screen.getByRole('region', { name: 'Today’s timeline' });
  expect(within(timeline).getByText('Clocked in.')).toBeVisible();
  await user.click(screen.getByText('Calculation details'));
  expect(
    screen.getByRole('table', {
      name: 'Source amounts and server-calculated results for today',
    }),
  ).toBeVisible();
  const calculationDetails = container.querySelector('#calculation-details');
  if (currentStatus === null || actions === null || calculationDetails === null) {
    throw new Error('Expected the complete Today hierarchy to render.');
  }
  expect(
    Boolean(currentStatus.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING),
  ).toBe(true);
  expect(
    Boolean(actions.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING),
  ).toBe(true);
  expect(
    Boolean(progress.compareDocumentPosition(postedBalance) & Node.DOCUMENT_POSITION_FOLLOWING),
  ).toBe(true);
  expect(
    Boolean(
      timeline.compareDocumentPosition(calculationDetails) & Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  ).toBe(true);
  expect(
    screen.queryByText('The calculation source does not match its recorded ledger entry.'),
  ).not.toBeInTheDocument();
  expect(screen.queryByText(/configured flexible-time warning threshold/u)).not.toBeInTheDocument();
  expect(screen.getByText('Clocked in.')).toBeVisible();

  await user.click(screen.getByRole('link', { name: 'My time' }));
  const timeHeading = await screen.findByRole('heading', { name: 'My time' });
  await waitFor(() => expect(timeHeading).toHaveFocus());
  expect(document.title).toBe('My time | WorkLedger');
  await expectNoAxeViolations(container);
});

test('keeps combined-role work areas distinct and account utilities outside destination inventory', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(COMBINED_CONTEXT);
      if (path === '/v1/me/requests') return successResponse(EMPTY_REQUEST_HISTORY);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container } = renderApplication('/requests');

  await screen.findByRole('heading', { name: 'My requests' });
  const workAreas = screen.getByRole('navigation', { name: 'Work areas' });
  expect(within(workAreas).getByRole('link', { name: 'My work' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  expect(within(workAreas).getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/team');
  expect(within(workAreas).getByRole('link', { name: 'People and policy' })).toHaveAttribute(
    'href',
    '/employees',
  );
  expect(within(workAreas).getByRole('link', { name: 'System' })).toHaveAttribute(
    'href',
    '/system/operations',
  );
  expect(screen.getAllByRole('link', { name: 'Reports' })).toHaveLength(1);
  expect(screen.getByRole('navigation', { name: 'My work navigation' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'My requests' })).toHaveAttribute('href', '/requests');
  expect(screen.getByRole('navigation', { name: 'Account' })).toBeInTheDocument();
  expect(workAreas.closest('.wl-navigation-destinations')).not.toBeNull();
  expect(
    screen.getByRole('navigation', { name: 'Account' }).closest('.wl-navigation-utilities'),
  ).not.toBeNull();
  await expectNoAxeViolations(container);
});

test('preserves the selected work area when the mobile drawer remounts on a shared route', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(COMBINED_CONTEXT);
      if (path === '/v1/me/requests') return successResponse(EMPTY_REQUEST_HISTORY);
      if (path === '/v1/team/status') {
        return successResponse({
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
        });
      }
      if (path === '/v1/reports') {
        return successResponse({
          defaultRange: { from: '2026-08-01', to: '2026-08-31' },
          reports: [
            {
              availableSorts: ['EMPLOYEE'],
              defaultSort: 'EMPLOYEE',
              description: 'Monthly time records in the current permission scope.',
              key: 'monthly-time',
              title: 'Monthly time',
            },
          ],
          timeZone: 'Europe/Berlin',
        });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/requests');

  await screen.findByRole('heading', { name: 'My requests' });
  await user.click(screen.getByRole('button', { name: 'Menu' }));
  let drawer = screen.getByRole('dialog', { name: 'Navigation' });
  await user.click(within(drawer).getByRole('link', { name: 'Team', exact: true }));
  await screen.findByRole('heading', { name: 'Team status' });

  await user.click(screen.getByRole('button', { name: 'Menu' }));
  drawer = screen.getByRole('dialog', { name: 'Navigation' });
  await user.click(within(drawer).getByRole('link', { name: 'Reports' }));
  await screen.findByRole('heading', { name: 'Reports', exact: true });

  await user.click(screen.getByRole('button', { name: 'Menu' }));
  drawer = screen.getByRole('dialog', { name: 'Navigation' });
  const mobileWorkAreas = within(drawer).getByRole('navigation', { name: 'Mobile work areas' });
  expect(within(mobileWorkAreas).getByRole('link', { name: 'Team' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  expect(
    within(drawer).getByRole('navigation', { name: 'Mobile Team navigation' }),
  ).toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('renders URL-owned time records and keeps posted and projected balance separate', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/my-time?date=2026-08-11&view=WEEK&page=1&limit=20');

  expect(await screen.findByRole('heading', { name: 'My time' })).toBeVisible();
  expect(await screen.findByText('Posted balance')).toBeVisible();
  expect(screen.getByText('10h 30m')).toBeVisible();
  expect(screen.getByText('Projected balance')).toBeVisible();
  expect(screen.getByText('10h 45m')).toBeVisible();
  expect(screen.getByText(/Projected balance excludes incomplete records/u)).toBeVisible();
  const recordsTable = screen.getByRole('table', { name: /Daily time record summaries/u });
  expect(recordsTable).toBeVisible();
  expect(recordsTable.closest('.wl-table-scroll')).not.toHaveAttribute('tabindex');
  expect(
    screen.getByRole('list', { name: 'Daily time record summaries for the selected period' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Posted ledger entries' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('links an available month summary to its monthly review', async () => {
  const monthlyPeriodId = '123e4567-e89b-42d3-a456-426614174399';
  vi.stubGlobal(
    'fetch',
    authenticatedFetch(TODAY_ATTENDANCE, DAILY_TIME_RECORD, {
      ...MY_TIME,
      period: {
        endDate: '2026-08-31',
        monthlyPeriodId,
        startDate: '2026-08-01',
        view: 'MONTH',
      },
    }),
  );
  const { container } = renderApplication('/my-time?date=2026-08-11&view=MONTH&page=1&limit=20');

  expect(await screen.findByRole('heading', { name: 'My time' })).toBeVisible();
  expect(await screen.findByRole('link', { name: 'Review monthly period' })).toHaveAttribute(
    'href',
    `/monthly-periods/${monthlyPeriodId}`,
  );
  await expectNoAxeViolations(container);
});

test('renders self-only leave balances with an explainable source-entry list', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/my-balances?date=2026-08-11&view=WEEK&page=1&limit=20');

  expect(await screen.findByRole('heading', { name: 'My balances' })).toBeVisible();
  expect(await screen.findByRole('heading', { name: 'Leave balances' })).toBeVisible();
  expect(screen.getByText('Vacation')).toBeVisible();
  expect(screen.getByText('Pending reservation')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Leave entitlement source entries' })).toBeVisible();
  expect(screen.getByText('pending reservation')).toBeVisible();
  await expectNoAxeViolations(container);
});

test('presents a daily record with calculation, exact session intervals, and offset-aware event list', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/time-records/123e4567-e89b-42d3-a456-426614174301');

  expect(await screen.findByRole('heading', { name: /August 11, 2026/u })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Calculation' })).toBeVisible();
  expect(screen.getAllByText('8h 30m')).not.toHaveLength(0);
  expect(screen.getByRole('heading', { name: 'Work sessions and breaks' })).toBeVisible();
  expect(screen.getByText(/Intervals that cross midnight/u)).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Recorded events' })).toBeVisible();
  expect(screen.getByText(/Recorded order 4/u)).toBeVisible();
  expect(screen.getByText('Negative flexible-time threshold reached')).toBeVisible();
  expect(screen.getByRole('link', { name: 'View balance history' })).toHaveAttribute(
    'href',
    '/my-time#flexible-time-heading',
  );
  await expectNoAxeViolations(container);
});

test('routes an incomplete session from the previous date into the correction workflow', async () => {
  const recordId = '123e4567-e89b-42d3-a456-426614174301';
  const incompleteRecord: DailyTimeRecord = {
    ...DAILY_TIME_RECORD,
    attention: {
      blockers: ['ATTENDANCE_INCOMPLETE', 'ATTENDANCE_OVERLAP'],
      warnings: [],
    },
    calculation: null,
    sessions: DAILY_TIME_RECORD.sessions.map((session) => ({
      ...session,
      continuesFromPreviousDate: true,
      continuesToNextDate: true,
    })),
    status: 'INCOMPLETE',
  };
  vi.stubGlobal('fetch', authenticatedFetch(TODAY_ATTENDANCE, incompleteRecord));
  const { container } = renderApplication(`/time-records/${recordId}`);

  expect(await screen.findByText('Attendance entry incomplete')).toBeVisible();
  expect(screen.getByText('Attendance intervals overlap')).toBeVisible();
  expect(screen.getByText(/Continues from the previous local date/u)).toBeVisible();
  expect(screen.getByText(/Continues into the next local date/u)).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Fix entry' })).toHaveLength(2);
  for (const link of screen.getAllByRole('link', { name: 'Fix entry' })) {
    expect(link).toHaveAttribute('href', `/requests/new?recordId=${recordId}`);
  }
  await expectNoAxeViolations(container);
});

test('presents an accessible correction-request form with a focused validation summary', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication(
    '/time-records/123e4567-e89b-42d3-a456-426614174301/correction?recordId=123e4567-e89b-42d3-a456-426614174301',
  );

  expect(await screen.findByRole('heading', { name: 'Current recorded facts' })).toBeVisible();
  expect(
    screen.getByText(/These original events stay available alongside your proposed correction/u),
  ).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Submit correction request' }));
  expect(await screen.findByRole('heading', { name: 'There is a problem' })).toBeVisible();
  expect(screen.getByRole('link', { name: /Enter a start time/u })).toHaveAttribute(
    'href',
    '#startsAtLocalTime',
  );
  await expectNoAxeViolations(container);
});

test('preserves correction input after a recoverable failure and explains post-lock recovery', async () => {
  const recordId = '123e4567-e89b-42d3-a456-426614174301';
  const correctionId = '123e4567-e89b-42d3-a456-426614174799';
  const submittedBodies: unknown[] = [];
  let submitAttempts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === `/v1/me/time-records/${recordId}`) return successResponse(DAILY_TIME_RECORD);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path === '/v1/me/correction-requests' && init?.method === 'POST') {
        submittedBodies.push(JSON.parse(String(init.body)));
        submitAttempts += 1;
        if (submitAttempts === 1) return apiErrorResponse('DATABASE_UNAVAILABLE', 503);
        return successResponse({
          applicationMode: 'POST_LOCK_ADJUSTMENT',
          id: correctionId,
          localDate: DAILY_TIME_RECORD.localDate,
          proposedDurationMinutes: 480,
          status: 'SUBMITTED',
          submittedAt: '2026-08-11T18:00:00Z',
        });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication(`/requests/new?recordId=${recordId}`);

  const startsAt = await screen.findByLabelText('Start time');
  const endsAt = screen.getByLabelText('End time');
  const reason = screen.getByLabelText('Why does this need correcting?');
  await user.type(startsAt, '09:00');
  await user.type(endsAt, '17:00');
  await user.type(reason, 'The recorded interval omitted the confirmed end of the workday.');
  await user.click(screen.getByRole('button', { name: 'Submit correction request' }));

  const summary = await screen.findByRole('heading', { name: 'There is a problem' });
  await waitFor(() => expect(summary.closest('section')).toHaveFocus());
  expect(startsAt).toHaveValue('09:00');
  expect(endsAt).toHaveValue('17:00');
  expect(reason).toHaveValue('The recorded interval omitted the confirmed end of the workday.');
  expect(screen.getByText(/Your recorded events were not changed/u)).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Submit correction request' }));
  const success = await screen.findByRole('heading', { name: 'Correction request submitted' });
  await waitFor(() => expect(success.closest('section')).toHaveFocus());
  expect(screen.getByText(/approval will append an adjustment/u)).toBeVisible();
  expect(screen.getByRole('link', { name: 'View request details' })).toHaveAttribute(
    'href',
    `/requests/${correctionId}`,
  );
  expect(submittedBodies).toHaveLength(2);
  expect(submittedBodies[1]).toEqual(submittedBodies[0]);
  await expectNoAxeViolations(container);
});

test('presents an accessible vacation-request form with a focused validation summary', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/requests/new');

  expect(await screen.findByRole('heading', { name: 'New request' })).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Choose vacation' }));
  expect(screen.getByText(/Weekends, public holidays, and zero-hour days/u)).toBeVisible();
  const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Coverage'), 'MINUTE_INTERVAL');
  expect(screen.getByLabelText('Local date')).toBeVisible();
  expect(screen.getByLabelText('Start time')).toBeVisible();
  expect(screen.getByLabelText('End time')).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Coverage'), 'FULL_DAY');
  await user.click(screen.getByRole('button', { name: 'Submit vacation request' }));
  expect(await screen.findByRole('heading', { name: 'There is a problem' })).toBeVisible();
  expect(screen.getByRole('link', { name: /Choose the first vacation day/u })).toHaveAttribute(
    'href',
    '#startDate',
  );
  await expectNoAxeViolations(container);
});

test('presents a no-medical-detail sickness-report form with accessible recovery', async () => {
  vi.stubGlobal('fetch', authenticatedFetch());
  const { container } = renderApplication('/requests/new');
  expect(await screen.findByRole('heading', { name: 'New request' })).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Choose sickness' }));
  expect(screen.getByText(/Do not include a diagnosis/u)).toBeVisible();
  expect(screen.queryByRole('textbox', { name: /note|diagnosis|reason/u })).toBeNull();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Report sickness' }));
  expect(await screen.findByRole('heading', { name: 'There is a problem' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('keeps personal request history type neutral until the owner opens a record', async () => {
  const absenceId = '123e4567-e89b-42d3-a456-426614174710';
  const correctionId = '123e4567-e89b-42d3-a456-426614174711';
  const history = {
    items: [
      {
        affectedEndDate: '2026-08-18',
        affectedStartDate: '2026-08-18',
        id: absenceId,
        kind: 'ABSENCE',
        status: 'APPROVED',
        submittedAt: '2026-08-12T08:00:00Z',
        version: 2,
      },
      {
        affectedEndDate: '2026-08-11',
        affectedStartDate: '2026-08-11',
        id: correctionId,
        kind: 'CORRECTION',
        status: 'SUBMITTED',
        submittedAt: '2026-08-11T18:00:00Z',
        version: 1,
      },
    ],
    pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
  } as const;
  const detail = {
    absenceTypeName: 'Vacation',
    affectedEndDate: '2026-08-18',
    affectedStartDate: '2026-08-18',
    availableActions: ['REQUEST_CANCELLATION'],
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
      { action: 'SUBMITTED', actor: 'SELF', occurredAt: '2026-08-12T08:00:00Z', reason: null },
      {
        action: 'APPROVE',
        actor: 'REVIEWER',
        occurredAt: '2026-08-13T09:00:00Z',
        reason: 'Coverage matches the recorded entitlement.',
      },
    ],
    id: absenceId,
    kind: 'ABSENCE',
    relatedCancellations: [],
    status: 'APPROVED',
    submittedAt: '2026-08-12T08:00:00Z',
    version: 2,
    workflow: 'APPROVAL_REQUIRED',
  } as const;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/requests') return successResponse(history);
      if (path === `/v1/me/requests/${absenceId}`) return successResponse(detail);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/requests?limit=20&page=1&status=ALL&type=ALL');

  expect(await screen.findByRole('heading', { name: 'My requests' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Absence request' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Time correction' })).toBeVisible();
  expect(screen.queryByText('Vacation')).not.toBeInTheDocument();

  const absenceCard = screen.getByRole('heading', { name: 'Absence request' }).closest('article');
  expect(absenceCard).not.toBeNull();
  await user.click(
    within(absenceCard as HTMLElement).getByRole('link', { name: 'View request details' }),
  );

  expect(await screen.findByRole('heading', { name: 'Vacation' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Coverage and effect' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Decision history' })).toBeVisible();
  expect(screen.getByText(/Coverage matches the recorded entitlement/u)).toBeVisible();
  await expectNoAxeViolations(container);
});

test.each([
  [
    'CHANGES_REQUESTED',
    'A reviewer requested changes. The current daily record remains unchanged.',
    'REQUEST_CHANGES',
  ],
  ['REJECTED', 'This workflow is complete. The current daily record remains unchanged.', 'REJECT'],
] as const)(
  'shows a %s correction decision and its preserved record evidence',
  async (status, explanation, decisionAction) => {
    const correctionId = '123e4567-e89b-42d3-a456-426614174711';
    const detail: PersonalRequestDetail = {
      affectedEndDate: '2026-08-11',
      affectedStartDate: '2026-08-11',
      applicationMode: 'ORDINARY_CORRECTION',
      availableActions: [],
      events: DAILY_TIME_RECORD.events,
      history: [
        {
          action: 'SUBMITTED',
          actor: 'SELF',
          occurredAt: '2026-08-11T18:00:00Z',
          reason: null,
        },
        {
          action: decisionAction,
          actor: 'REVIEWER',
          occurredAt: '2026-08-12T08:00:00Z',
          reason: 'The decision explains the next permitted workflow step.',
        },
      ],
      id: correctionId,
      kind: 'CORRECTION',
      originalCalculation: {
        balanceMinutes: DAILY_TIME_RECORD.calculation?.balanceMinutes ?? 0,
        breakMinutes: DAILY_TIME_RECORD.calculation?.breakMinutes ?? 0,
        creditedMinutes: DAILY_TIME_RECORD.calculation?.creditedMinutes ?? 0,
        expectedMinutes: DAILY_TIME_RECORD.calculation?.expectedMinutes ?? 0,
        workedMinutes: DAILY_TIME_RECORD.calculation?.workedMinutes ?? 0,
      },
      proposedEndsAt: '2026-08-11T15:00:00Z',
      proposedStartsAt: '2026-08-11T07:00:00Z',
      requestReason: 'The recorded interval omitted the confirmed end of the workday.',
      status,
      submittedAt: '2026-08-11T18:00:00Z',
      timeZone: 'Europe/Berlin',
      version: 2,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = requestPath(input);
        if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
        if (path === `/v1/me/requests/${correctionId}`) return successResponse(detail);
        throw new Error(`Unexpected test request: ${path}`);
      }),
    );
    const { container } = renderApplication(`/requests/${correctionId}`);

    expect(await screen.findByRole('heading', { name: 'Time correction' })).toBeVisible();
    expect(screen.getByText(explanation)).toBeVisible();
    expect(
      screen.getByText(/The decision explains the next permitted workflow step/u),
    ).toBeVisible();
    expect(screen.getByText(/Original punch events remain preserved/u)).toBeVisible();
    await expectNoAxeViolations(container);
  },
);

test('withdraws an owned cancellation from its evidence view and preserves the original absence link', async () => {
  const absenceId = '123e4567-e89b-42d3-a456-426614174720';
  const cancellationId = '123e4567-e89b-42d3-a456-426614174721';
  let withdrawn = false;
  const requestBodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path === `/v1/me/requests/${cancellationId}`) {
        return successResponse({
          absenceRequestId: absenceId,
          absenceTypeName: 'Vacation',
          affectedEndDate: '2026-08-18',
          affectedStartDate: '2026-08-18',
          availableActions: withdrawn ? [] : ['WITHDRAW_CANCELLATION'],
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
              occurredAt: '2026-08-14T08:00:00Z',
              reason: null,
            },
          ],
          id: cancellationId,
          kind: 'CANCELLATION',
          status: withdrawn ? 'WITHDRAWN' : 'PENDING_DECISION',
          submittedAt: '2026-08-14T08:00:00Z',
          version: withdrawn ? 2 : 1,
        });
      }
      if (path === `/v1/me/absence-cancellations/${cancellationId}/withdraw`) {
        requestBodies.push(JSON.parse(String(init?.body)));
        withdrawn = true;
        return successResponse({ id: cancellationId, status: 'WITHDRAWN', version: 2 });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication(`/requests/${cancellationId}`);

  expect(await screen.findByRole('heading', { name: 'Cancellation request' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'View original absence request' })).toHaveAttribute(
    'href',
    `/requests/${absenceId}`,
  );
  await user.click(screen.getByRole('button', { name: 'Withdraw cancellation request' }));
  expect(await screen.findByRole('heading', { name: 'Request updated' })).toBeVisible();
  expect(requestBodies).toEqual([{ expectedVersion: 1 }]);
  await expectNoAxeViolations(container);
});

test('presents equivalent accessible personal calendar and agenda information', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/calendar') return successResponse(PERSONAL_CALENDAR);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/calendar?month=2026-08');

  expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeVisible();
  const calendarTable = screen.getByRole('table');
  expect(calendarTable).toHaveAccessibleName(/Personal holidays and absence coverage/u);
  expect(calendarTable.closest('.wl-table-scroll')).not.toHaveAttribute('tabindex');
  expect(
    screen.queryByText('Scroll horizontally to review all seven days.'),
  ).not.toBeInTheDocument();
  expect(screen.getByText('Vacation: Full day (submitted)')).toBeVisible();
  expect(screen.getByText('Public holiday: Summer holiday')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Agenda list' }));
  expect(screen.getByRole('list', { name: /Calendar agenda for August 2026/u })).toBeVisible();
  expect(screen.getByText('Vacation: Full day (submitted)')).toBeVisible();
  await expectNoAxeViolations(container);
});

test('explains incomplete overnight record slices without presenting a final calculation', async () => {
  const overnightRecord: DailyTimeRecord = {
    ...DAILY_TIME_RECORD,
    attention: { blockers: ['ATTENDANCE_INCOMPLETE'], warnings: [] },
    events: [{ occurredAt: '2026-08-12T00:30:00Z', sequence: 5, type: 'CLOCK_OUT' }],
    localDate: '2026-08-12',
    sessions: [
      {
        breaks: [],
        continuesFromPreviousDate: true,
        continuesToNextDate: false,
        workIntervals: [
          {
            durationMinutes: 150,
            endsAt: '2026-08-12T00:30:00Z',
            startsAt: '2026-08-11T22:00:00Z',
          },
        ],
      },
    ],
    status: 'INCOMPLETE',
  };
  vi.stubGlobal('fetch', authenticatedFetch(TODAY_ATTENDANCE, overnightRecord));
  const { container } = renderApplication('/time-records/123e4567-e89b-42d3-a456-426614174302');

  expect(await screen.findByRole('heading', { name: 'This record is incomplete' })).toBeVisible();
  expect(screen.getByText('This calculation is not a final posted result.')).toBeVisible();
  expect(screen.getByText('Attendance entry incomplete')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Fix entry' })).toHaveAttribute(
    'href',
    '/requests/new?recordId=123e4567-e89b-42d3-a456-426614174302',
  );
  expect(screen.getByText('Continues from the previous local date.')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Calculation' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('explains corrected and original Today evidence in a semantic calculation table and timeline', async () => {
  const user = userEvent.setup();
  const completedSequence: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    appliedCorrections: [
      {
        correctedWorkedMinutes: 165,
        originalWorkedMinutes: 195,
      },
    ],
    attendance: attendanceForState('OFF_WORK', 4),
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'NOT_WORKING',
      provisional:
        TODAY_ATTENDANCE.calculation.provisional === null
          ? null
          : {
              ...TODAY_ATTENDANCE.calculation.provisional,
              calculationSources: {
                ...TODAY_ATTENDANCE.calculation.provisional.calculationSources,
                approvedCorrectionMinutes: -30,
                otherApprovedAdjustmentMinutes: 0,
              },
              creditedMinutesToday: 165,
              provisionalDifferenceMinutes: -315,
            },
      remainingExpectedMinutes: 315,
    },
    timeline: [
      ...TODAY_ATTENDANCE.timeline,
      {
        id: '123e4567-e89b-42d3-a456-426614174204',
        occurredAt: '2026-08-11T10:45:00Z',
        type: 'CLOCK_OUT',
      },
    ],
  };
  vi.stubGlobal('fetch', authenticatedFetch(completedSequence));
  const { container } = renderApplication('/today');

  await screen.findByRole('heading', { name: 'Off work' });
  const progress = screen.getByRole('region', { name: 'Today’s progress' });
  expect(within(progress).getByText('2h 45m credited')).toBeVisible();
  expect(within(progress).getByText('−5h 15m')).toBeVisible();
  expect(within(progress).getByText('Start work to estimate')).toBeVisible();
  expect(screen.queryByRole('region', { name: 'How today is calculated' })).not.toBeVisible();
  await user.click(screen.getByText('Calculation details'));
  const breakdown = screen.getByRole('region', { name: 'How today is calculated' });
  const table = within(breakdown).getByRole('table', {
    name: 'Source amounts and server-calculated results for today',
  });
  expect(table).toBeVisible();
  expect(table).toHaveTextContent('Expected time');
  expect(table).toHaveTextContent('Scheduled time8h 00m');
  expect(table).toHaveTextContent('Credited time');
  expect(table).toHaveTextContent('Credited today2h 45m');
  expect(table).toHaveTextContent('Approved corrections−0h 30m');
  expect(table).toHaveTextContent('Other approved adjustments0h 00m');
  const provisionalDifferenceRow = within(table)
    .getByRole('rowheader', { name: /Provisional difference/u })
    .closest('tr');
  expect(provisionalDifferenceRow).toHaveTextContent('−5h 15m');
  await user.click(screen.getByText('Calculation details'));
  expect(table).not.toBeVisible();
  await user.click(screen.getByText('Calculation details'));
  expect(table).toBeVisible();

  const timeline = screen.getByRole('region', { name: 'Today’s timeline' });
  expect(timeline).toHaveTextContent('Tuesday, August 11, 2026 in Europe/Berlin');
  expect(timeline).toHaveTextContent('Events sharing one time keep their recorded order.');
  expect(within(timeline).getByRole('heading', { name: 'Approved interpretation' })).toBeVisible();
  expect(timeline).toHaveTextContent('Worked time changed from 3h 15m to 2h 45m (−0h 30m).');
  expect(within(timeline).getByRole('heading', { name: 'Original recorded events' })).toBeVisible();
  const originalList = container.querySelector('.wl-timeline-list');
  if (originalList === null) throw new Error('Expected the original event list.');
  const events = within(originalList).getAllByRole('listitem');
  expect(events).toHaveLength(4);
  expect(events.map((event) => event.textContent)).toEqual([
    '9:00 AMClocked in. Work session started.',
    '10:45 AMBreak started. Working time paused.',
    '11:15 AMBreak ended. Working time resumed.',
    '12:45 PMClocked out. Work session ended.',
  ]);
  await expectNoAxeViolations(container);
});

test('explains zero expected time before presenting credited work', async () => {
  const holidayToday: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    calculation: {
      attentionItems: [
        {
          affectedDate: TODAY_ATTENDANCE.localDate,
          blocksSubmission: false,
          code: 'WORK_ON_HOLIDAY',
          reason: 'Recorded work falls on a public holiday.',
          recovery: {
            action: 'REVIEW_CALCULATION',
            destination: 'TODAY_CALCULATION',
            label: 'Review calculation',
            statusAfterAction: 'Reviewing the explanation does not change the record.',
          },
          severity: 'WARNING',
          source: 'CURRENT_DAY_CALCULATION',
          title: 'Work recorded on a public holiday',
        },
        {
          affectedDate: TODAY_ATTENDANCE.localDate,
          blocksSubmission: false,
          code: 'WORK_ON_ZERO_EXPECTED_DAY',
          reason: 'Recorded work falls on a day with no expected minutes.',
          recovery: {
            action: 'REVIEW_CALCULATION',
            destination: 'TODAY_CALCULATION',
            label: 'Review calculation',
            statusAfterAction: 'Reviewing the explanation does not change the record.',
          },
          severity: 'WARNING',
          source: 'CURRENT_DAY_CALCULATION',
          title: 'Work recorded on a zero-expected day',
        },
      ],
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'NO_REMAINING_EXPECTATION',
      holidayName: 'German Unity Day',
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
    postedFlexBalanceMinutes: 0,
    postedThroughDate: null,
  };
  vi.stubGlobal('fetch', authenticatedFetch(holidayToday));
  const { container } = renderApplication('/today');

  const progress = await screen.findByRole('region', { name: 'Today’s progress' });
  expect(within(progress).getByText('+1h 00m')).toBeVisible();
  expect(
    within(progress).getByText('1h 00m credited with no scheduled expectation today.'),
  ).toBeVisible();
  expect(within(progress).getByText('Expectation met')).toBeVisible();
  expect(within(progress).queryByRole('progressbar')).not.toBeInTheDocument();
  const postedBalance = screen.getByRole('region', { name: 'Posted balance' });
  expect(within(postedBalance).getByText('0h 00m')).toBeVisible();
  expect(within(postedBalance).getByText('No entries posted before today.')).toBeVisible();
  await userEvent.setup().click(screen.getByText('Calculation details'));
  expect(screen.getByRole('heading', { name: 'Why expected time is zero' })).toBeVisible();
  expect(
    screen.getByText(/German Unity Day reduces today’s scheduled expectation to zero/u),
  ).toBeVisible();
  expect(screen.getByText(/not labelled as payroll overtime/u)).toBeVisible();
  await expectNoAxeViolations(container);
});

test('caps the visual progress while preserving over-expected credited values without debt copy', async () => {
  const overExpectedToday: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'NO_REMAINING_EXPECTATION',
      provisional: {
        calculationSources: {
          absenceCreditMinutes: 240,
          absenceExpectedReductionMinutes: 240,
          approvedCorrectionMinutes: 0,
          breakMinutesToday: 0,
          holidayExpectedReductionMinutes: 0,
          otherApprovedAdjustmentMinutes: -15,
          scheduledMinutes: 480,
          workedMinutesToday: 60,
        },
        creditedMinutesToday: 285,
        expectedMinutesToday: 240,
        provisionalDifferenceMinutes: 45,
      },
      remainingExpectedMinutes: 0,
    },
  };
  vi.stubGlobal('fetch', authenticatedFetch(overExpectedToday));
  const { container } = renderApplication('/today');

  const progress = await screen.findByRole('region', { name: 'Today’s progress' });
  const progressbar = within(progress).getByRole('progressbar', {
    name: 'Today’s credited progress',
  });
  expect(progressbar).toHaveAttribute('max', '240');
  expect(progressbar).toHaveAttribute('value', '240');
  expect(progressbar).toHaveAttribute('aria-valuetext', '4h 45m credited of 4h 00m expected.');
  expect(within(progress).getByText('1h 00m')).toBeVisible();
  expect(within(progress).getByText('+0h 45m')).toBeVisible();
  expect(within(progress).getByText('Expectation met')).toBeVisible();
  expect(screen.queryByText(/debt/u)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Needs attention' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('shows an incomplete calculation without inventing an estimate', async () => {
  const incompleteToday: TodayAttendance = {
    ...TODAY_ATTENDANCE,
    attendance: attendanceForState('OFF_WORK', 0),
    calculation: {
      attentionItems: [
        {
          affectedDate: TODAY_ATTENDANCE.localDate,
          blocksSubmission: true,
          code: 'SCHEDULE_NOT_ASSIGNED',
          reason: 'No effective work schedule is assigned for today.',
          recovery: {
            action: 'REVIEW_RECORD',
            destination: 'MY_TIME',
            label: 'Review affected day',
            statusAfterAction: 'An administrator must assign a work schedule.',
          },
          severity: 'BLOCKER',
          source: 'CURRENT_DAY_CALCULATION',
          title: 'Work schedule missing',
        },
      ],
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'CALCULATION_UNAVAILABLE',
      holidayName: null,
      isPeriodPostedOrLocked: false,
      provisional: null,
      remainingExpectedMinutes: null,
      status: 'INCOMPLETE',
    },
    timeline: [],
  };
  vi.stubGlobal('fetch', authenticatedFetch(incompleteToday));
  const { container } = renderApplication('/today');

  expect(await screen.findByRole('heading', { name: 'Off work' })).toBeVisible();
  const progress = screen.getByRole('region', { name: 'Today’s progress' });
  expect(within(progress).getByText('Progress unavailable')).toBeVisible();
  expect(within(progress).queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Posted balance' })).toBeVisible();
  expect(screen.getByText('Work schedule missing')).toBeVisible();
  expect(screen.getByText('Blocks month submission')).toBeVisible();
  expect(screen.getByText(/An administrator must assign a work schedule/u)).toBeVisible();
  expect(screen.getByRole('link', { name: 'Review affected day' })).toHaveAttribute(
    'href',
    '/my-time?date=2026-08-11&view=WEEK',
  );
  expect(screen.getByText('No attendance events have been recorded today.')).toBeVisible();
  await expectNoAxeViolations(container);
});

test.each([
  {
    actions: ['Clock in'],
    finish: 'Start work to estimate',
    intervalLabel: null,
    intervalValue: null,
    state: 'OFF_WORK',
    status: 'Off work',
  },
  {
    actions: ['Start break', 'Clock out'],
    finish: '8:45 PM',
    intervalLabel: 'Current work interval',
    intervalValue: '1h 15m',
    state: 'WORKING',
    status: 'Working',
  },
  {
    actions: ['Resume work', 'Clock out'],
    finish: 'Resume work to estimate',
    intervalLabel: 'Current break',
    intervalValue: '0h 15m',
    state: 'ON_BREAK',
    status: 'On break',
  },
] as const)(
  'renders the $state attendance story with only its authoritative actions',
  async ({ actions, finish, intervalLabel, intervalValue, state, status }) => {
    vi.stubGlobal('fetch', authenticatedFetch(todayWithAttendance(state, 3)));
    const { container } = renderApplication('/today');

    expect(await screen.findByRole('heading', { name: status })).toBeVisible();
    const currentStatus = screen.getByRole('region', { name: status });
    if (intervalLabel === null || intervalValue === null) {
      expect(within(currentStatus).getByText('No active work interval.')).toBeVisible();
    } else {
      expect(within(currentStatus).getByText(intervalLabel)).toBeVisible();
      expect(within(currentStatus).getByText(intervalValue)).toBeVisible();
    }
    expect(
      within(screen.getByRole('region', { name: 'Today’s progress' })).getByText(finish),
    ).toBeVisible();
    const actionGroup = screen.getByRole('group', { name: 'Attendance actions' });
    expect(
      within(actionGroup)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(actions);
    expect(actionGroup).not.toHaveAttribute('aria-busy', 'true');
    await expectNoAxeViolations(container);
  },
);

test('clocks in once, keeps the pending control stable, refetches authoritative state, and announces one result', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  const workingToday = todayWithAttendance('WORKING', 1);
  let clockedIn = false;
  let clockInRequests = 0;
  let submittedKey = '';
  let completeClockIn: (response: Response) => void = () => {
    throw new Error('Clock-in request was not pending.');
  };
  const pendingClockIn = new Promise<Response>((resolve) => {
    completeClockIn = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        return successResponse(clockedIn ? workingToday : offWorkToday);
      }
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        const headers = new Headers(init.headers);
        submittedKey = headers.get('idempotency-key') ?? '';
        expect(headers.get('x-workledger-csrf')).toBe('c'.repeat(43));
        expect(JSON.parse(String(init.body))).toEqual({ expectedAttendanceRevision: 0 });
        return pendingClockIn;
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const clockInButton = await screen.findByRole('button', { name: 'Clock in' });
  await user.click(clockInButton);
  const pendingButton = screen.getByRole('button', { name: 'Clocking in…' });
  expect(pendingButton).toBeDisabled();
  expect(pendingButton.closest('form')).toHaveAttribute('aria-busy', 'true');
  fireEvent.click(pendingButton);
  expect(clockInRequests).toBe(1);
  expect(submittedKey).toMatch(/^[0-9a-f-]{36}$/u);

  clockedIn = true;
  completeClockIn(
    successResponse({
      attendanceRevision: 1,
      command: 'CLOCK_IN',
      createdEvents: [{ id: 'punch-clock-in-1', type: 'CLOCK_IN' }],
      occurredAt: '2026-08-11T09:30:00Z',
      resultingState: 'WORKING',
      validActions: ['START_BREAK', 'CLOCK_OUT'],
    }),
  );

  const workingHeading = await screen.findByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(screen.getByRole('status')).toHaveTextContent('Clocked in at 11:30 AM.');
  expect(screen.queryByRole('button', { name: 'Clock in' })).not.toBeInTheDocument();
  expect(clockInRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('starts and ends breaks and confirms active-break clock-out with stable keyboard focus', async () => {
  let serverToday = todayWithAttendance('WORKING', 1);
  let clockOutRequests = 0;
  let completeClockOut: (response: Response) => void = () => {
    throw new Error('Clock-out request was not pending.');
  };
  const pendingClockOut = new Promise<Response>((resolve) => {
    completeClockOut = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'b'.repeat(43) });
      const headers = new Headers(init?.headers);
      if (path.startsWith('/v1/me/attendance/') && init?.method === 'POST') {
        expect(headers.get('x-workledger-csrf')).toBe('b'.repeat(43));
        expect(headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/u);
      }
      if (path === '/v1/me/attendance/start-break' && init?.method === 'POST') {
        const expectedAttendanceRevision = serverToday.attendance.attendanceRevision;
        expect(JSON.parse(String(init.body))).toEqual({ expectedAttendanceRevision });
        const nextRevision = expectedAttendanceRevision + 1;
        serverToday = todayWithAttendance('ON_BREAK', nextRevision);
        return successResponse({
          attendanceRevision: nextRevision,
          command: 'START_BREAK',
          createdEvents: [{ id: `break-start-${nextRevision}`, type: 'BREAK_START' }],
          occurredAt: '2026-08-11T10:00:00Z',
          resultingState: 'ON_BREAK',
          validActions: ['RESUME', 'CLOCK_OUT'],
        });
      }
      if (path === '/v1/me/attendance/end-break' && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ expectedAttendanceRevision: 2 });
        serverToday = todayWithAttendance('WORKING', 3);
        return successResponse({
          attendanceRevision: 3,
          command: 'RESUME',
          createdEvents: [{ id: 'break-end-3', type: 'BREAK_END' }],
          occurredAt: '2026-08-11T10:15:00Z',
          resultingState: 'WORKING',
          validActions: ['START_BREAK', 'CLOCK_OUT'],
        });
      }
      if (path === '/v1/me/attendance/clock-out' && init?.method === 'POST') {
        clockOutRequests += 1;
        expect(JSON.parse(String(init.body))).toEqual({
          confirmActiveBreak: true,
          expectedAttendanceRevision: 4,
        });
        return pendingClockOut;
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const todayHeading = await screen.findByRole('heading', { name: 'Today' });
  await waitFor(() => expect(todayHeading).toHaveFocus());
  await user.click(await screen.findByRole('button', { name: 'Start break' }));
  const onBreakHeading = await screen.findByRole('heading', { name: 'On break' });
  await waitFor(() => expect(onBreakHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Break started at 12:00 PM.');

  await user.click(screen.getByRole('button', { name: 'Resume work' }));
  const workingHeading = await screen.findByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Resumed work at 12:15 PM.');

  await user.click(screen.getByRole('button', { name: 'Start break' }));
  await screen.findByRole('heading', { name: 'On break' });
  const clockOutTrigger = screen.getByRole('button', { name: 'Clock out' });
  clockOutTrigger.focus();
  await user.keyboard('{Enter}');
  const dialog = screen.getByRole('dialog', { name: 'Clock out while on break?' });
  expect(dialog).toHaveFocus();
  expect(dialog).toHaveTextContent(
    'WorkLedger will close your active break and clock you out at the same recorded instant.',
  );
  await user.keyboard('{Escape}');
  await waitFor(() => expect(clockOutTrigger).toHaveFocus());
  expect(clockOutRequests).toBe(0);

  await user.keyboard('{Enter}');
  await user.click(screen.getByRole('button', { name: 'Close break and clock out' }));
  expect(screen.getByRole('button', { name: 'Clocking out…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByRole('dialog', { name: 'Clock out while on break?' })).toBeVisible();
  expect(clockOutRequests).toBe(1);

  serverToday = todayWithAttendance('OFF_WORK', 5);
  completeClockOut(
    successResponse({
      attendanceRevision: 5,
      command: 'CLOCK_OUT',
      createdEvents: [
        { id: 'break-end-5', type: 'BREAK_END' },
        { id: 'clock-out-5', type: 'CLOCK_OUT' },
      ],
      occurredAt: '2026-08-11T10:30:00Z',
      resultingState: 'OFF_WORK',
      validActions: ['CLOCK_IN'],
    }),
  );

  const offWorkHeading = await screen.findByRole('heading', { name: 'Off work' });
  await waitFor(() => expect(offWorkHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('Clocked out at 12:30 PM.');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(clockOutRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('recovers from a stale clock-in with one safe alert and logical status focus', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  const workingToday = todayWithAttendance('WORKING', 1);
  let serverToday = offWorkToday;
  let clockInRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'd'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        serverToday = workingToday;
        return Response.json(
          {
            error: {
              code: 'ATTENDANCE_STATE_CHANGED',
              context: {
                attendanceRevision: 1,
                currentState: 'WORKING',
                validActions: ['START_BREAK', 'CLOCK_OUT'],
              },
              message: 'The request could not be completed.',
              requestId: REQUEST_ID,
            },
          },
          { status: 409 },
        );
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(
    'No clock-in was recorded. Attendance changed in another tab or device. Current status: working.',
  );
  expect(alert).toHaveTextContent(`Request reference: ${REQUEST_ID}`);
  const workingHeading = screen.getByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(clockInRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('presents rate limiting as a definitive no-effect result without retrying', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  let clockInRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(offWorkToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'l'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        return apiErrorResponse('RATE_LIMITED', 429);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const clockIn = await screen.findByRole('button', { name: 'Clock in' });
  await user.click(clockIn);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(
    'No clock-in was recorded because attendance actions are temporarily limited.',
  );
  expect(alert).toHaveTextContent('Review the current status and try again later.');
  expect(clockIn).toHaveFocus();
  expect(clockInRequests).toBe(1);
  await expectNoAxeViolations(container);
});

test('moves focus when a remote update changes clock-out into a confirmation action', async () => {
  let serverToday = todayWithAttendance('WORKING', 1);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container, queryClient } = renderApplication('/today');

  const directClockOut = await screen.findByRole('button', { name: 'Clock out' });
  directClockOut.focus();
  serverToday = todayWithAttendance('ON_BREAK', 2);
  await act(() => queryClient.refetchQueries({ queryKey: todayAttendanceQuery().queryKey }));

  const onBreakHeading = await screen.findByRole('heading', { name: 'On break' });
  await waitFor(() => expect(onBreakHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent(
    'Attendance changed in another tab or device. Current status: on break.',
  );
  const confirmationClockOut = screen.getByRole('button', { name: 'Clock out' });
  await user.click(confirmationClockOut);
  expect(screen.getByRole('dialog', { name: 'Clock out while on break?' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('retries a lost attendance response with the same key and announces the replay once', async () => {
  let serverToday = todayWithAttendance('OFF_WORK', 0);
  const submittedKeys: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'r'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        submittedKeys.push(new Headers(init.headers).get('idempotency-key') ?? '');
        serverToday = todayWithAttendance('WORKING', 1);
        if (submittedKeys.length === 1) throw new TypeError('Response connection was lost.');
        return successResponse({
          attendanceRevision: 1,
          command: 'CLOCK_IN',
          createdEvents: [{ id: 'punch-clock-in-replay', type: 'CLOCK_IN' }],
          occurredAt: '2026-08-11T09:30:00Z',
          resultingState: 'WORKING',
          validActions: ['START_BREAK', 'CLOCK_OUT'],
        });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Clocked in at 11:30 AM.');
  expect(screen.getAllByRole('status')).toHaveLength(1);
  expect(submittedKeys).toHaveLength(2);
  expect(submittedKeys[0]).toMatch(/^[0-9a-f-]{36}$/u);
  expect(submittedKeys[1]).toBe(submittedKeys[0]);
  await expectNoAxeViolations(container);
});

test('never queues an offline attendance action and refetches before enabling controls', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  let todayRequests = 0;
  let clockInRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        todayRequests += 1;
        return successResponse(offWorkToday);
      }
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        clockInRequests += 1;
        throw new Error('An offline clock-in must not be submitted.');
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  const clockIn = await screen.findByRole('button', { name: 'Clock in' });
  const requestsBeforeOffline = todayRequests;
  act(() => onlineManager.setOnline(false));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Attendance actions are disabled and will not be queued.',
  );
  expect(clockIn).toBeDisabled();
  fireEvent.click(clockIn);
  expect(clockInRequests).toBe(0);

  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(clockIn).toBeEnabled());
  expect(todayRequests).toBeGreaterThan(requestsBeforeOffline);
  expect(clockInRequests).toBe(0);
  expect(screen.queryByText('You’re offline.')).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('refreshes a changed device state on focus and moves focus only from a removed action', async () => {
  let serverToday = todayWithAttendance('OFF_WORK', 0);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(serverToday);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container, queryClient } = renderApplication('/today');

  const clockIn = await screen.findByRole('button', { name: 'Clock in' });
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Today', exact: true })).toHaveFocus(),
  );
  act(() => clockIn.focus());
  expect(clockIn).toHaveFocus();
  serverToday = todayWithAttendance('WORKING', 1);
  await act(() => queryClient.refetchQueries({ queryKey: todayAttendanceQuery().queryKey }));

  const workingHeading = await screen.findByRole('heading', { name: 'Working' });
  await waitFor(() => expect(workingHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent(
    'Attendance changed in another tab or device. Current status: working.',
  );
  expect(screen.queryByRole('button', { name: 'Clock in' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('keeps stale attendance visible but disables actions while a background refresh fails', async () => {
  let failRefresh = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        return failRefresh
          ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
          : successResponse(TODAY_ATTENDANCE);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container, queryClient } = renderApplication('/today');

  const startBreak = await screen.findByRole('button', { name: 'Start break' });
  failRefresh = true;
  await act(() => queryClient.refetchQueries({ queryKey: todayAttendanceQuery().queryKey }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(
    'WorkLedger could not refresh your current attendance. Actions remain disabled.',
  );
  expect(alert).toHaveTextContent(`Request reference: ${REQUEST_ID}`);
  expect(startBreak).toBeDisabled();

  failRefresh = false;
  await user.click(within(alert).getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(startBreak).toBeEnabled());
  expect(screen.getByRole('heading', { name: 'Working' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('clears the Today mutation state and announces recovery when the clock-in session expires', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  let sessionExpired = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') {
        return sessionExpired
          ? authenticationErrorResponse('AUTH_SESSION_EXPIRED')
          : successResponse(EMPLOYEE_CONTEXT);
      }
      if (path === '/v1/me/attendance/today') return successResponse(offWorkToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'e'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        sessionExpired = true;
        return authenticationErrorResponse('AUTH_SESSION_EXPIRED');
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  const signInHeading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(signInHeading).toHaveFocus());
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your session expired. Sign in again to continue.',
  );
  expect(screen.queryByRole('button', { name: 'Clock in' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('removes cached attendance and presents permission loss without restricted details', async () => {
  const offWorkToday = todayWithAttendance('OFF_WORK', 0);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') return successResponse(offWorkToday);
      if (path === '/v1/me/csrf') return successResponse({ token: 'p'.repeat(43) });
      if (path === '/v1/me/attendance/clock-in' && init?.method === 'POST') {
        return apiErrorResponse('ACCESS_DENIED', 403);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container, queryClient } = renderApplication('/today');

  await user.click(await screen.findByRole('button', { name: 'Clock in' }));
  const heading = await screen.findByRole('heading', { name: 'Permission denied' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe('Permission denied | WorkLedger');
  expect(screen.getByText(/No attendance details or actions are available/u)).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Off work' })).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Attendance actions' })).not.toBeInTheDocument();
  expect(screen.queryByText(REQUEST_ID)).not.toBeInTheDocument();
  await waitFor(() =>
    expect(queryClient.getQueryData(todayAttendanceQuery().queryKey)).toBeUndefined(),
  );
  await expectNoAxeViolations(container);
});

test('keeps a Today load failure recoverable and exposes its safe request reference', async () => {
  let todayAttempts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/attendance/today') {
        todayAttempts += 1;
        return todayAttempts <= 2
          ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
          : successResponse(TODAY_ATTENDANCE);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/today');

  expect(
    await screen.findByRole('heading', { name: 'Today is temporarily unavailable' }),
  ).toBeVisible();
  expect(screen.getByText(`Request reference: ${REQUEST_ID}`)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('heading', { name: 'Working' })).toBeVisible();
  expect(todayAttempts).toBe(3);
  await expectNoAxeViolations(container);
});

test('does not replace newer Today attendance with an older server snapshot', async () => {
  let response = TODAY_ATTENDANCE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => successResponse(response)),
  );
  const queryClient = createWorkLedgerQueryClient();

  await queryClient.fetchQuery(todayAttendanceQuery());
  response = {
    ...TODAY_ATTENDANCE,
    asOf: '2026-08-11T09:20:00Z',
    attendance: attendanceForState('OFF_WORK', 2),
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      estimatedFinishAt: null,
      estimatedFinishUnavailableReason: 'NOT_WORKING',
    },
    snapshotCapturedAt: '2026-08-11T09:20:15Z',
  };
  await queryClient.invalidateQueries({ queryKey: ['self', 'attendance', 'today'] });
  await queryClient.fetchQuery(todayAttendanceQuery());

  expect(queryClient.getQueryData(['self', 'attendance', 'today'])).toMatchObject({
    asOf: TODAY_ATTENDANCE.asOf,
    attendance: { attendanceRevision: 3, state: 'WORKING' },
  });
});

test('does not replace a newer Today capture within the same calculation minute', async () => {
  let response = TODAY_ATTENDANCE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => successResponse(response)),
  );
  const queryClient = createWorkLedgerQueryClient();

  await queryClient.fetchQuery(todayAttendanceQuery());
  response = {
    ...TODAY_ATTENDANCE,
    snapshotCapturedAt: '2026-08-11T10:45:10Z',
  };
  await queryClient.invalidateQueries({ queryKey: ['self', 'attendance', 'today'] });
  await queryClient.fetchQuery(todayAttendanceQuery());

  expect(queryClient.getQueryData(['self', 'attendance', 'today'])).toMatchObject({
    asOf: TODAY_ATTENDANCE.asOf,
    attendance: { attendanceRevision: TODAY_ATTENDANCE.attendance.attendanceRevision },
    snapshotCapturedAt: TODAY_ATTENDANCE.snapshotCapturedAt,
  });
});

test('renders a focused standalone root recovery state after a network failure', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') throw new TypeError('fetch failed');
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container } = renderApplication('/');

  const heading = await screen.findByRole('heading', {
    name: 'WorkLedger is temporarily unavailable',
  });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('alert')).toHaveTextContent(
    'WorkLedger could not complete the service check needed to start this page.',
  );
  expect(screen.queryByText(/DEPENDENCY_FAILURE|fetch failed/u)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /home/iu })).not.toBeInTheDocument();
  expect(document.title).toBe('WorkLedger is temporarily unavailable | WorkLedger');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('shows only safe root recovery details for a structured dependency failure', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return apiErrorResponse('DATABASE_UNAVAILABLE', 503);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container } = renderApplication('/');

  const heading = await screen.findByRole('heading', {
    name: 'WorkLedger is temporarily unavailable',
  });
  await waitFor(() => expect(heading).toHaveFocus());
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent(`Request reference: ${REQUEST_ID}`);
  expect(alert).not.toHaveTextContent('DATABASE_UNAVAILABLE');
  expect(alert).not.toHaveTextContent('The request could not be completed.');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(screen.queryByRole('link', { name: /home/iu })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('renders a non-leaking permission-denied route state', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => successResponse(EMPLOYEE_CONTEXT)),
  );
  const { container } = renderApplication('/system/operations');

  const heading = await screen.findByRole('heading', { name: 'Permission denied' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(heading).toHaveClass('wl-route-state__title--route');
  expect(screen.getByText(/No restricted record details were disclosed/u)).toBeVisible();
  expect(document.title).toBe('Permission denied | WorkLedger');
  await expectNoAxeViolations(container);
});

test('renders a shared focused not-found boundary with a safe recovery destination', async () => {
  const { container } = renderApplication('/not-a-workledger-route');

  const heading = await screen.findByRole('heading', { name: 'Page not found' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(heading).toHaveClass('wl-route-state__title--route');
  expect(screen.getByRole('link', { name: 'Return to WorkLedger' })).toHaveAttribute('href', '/');
  expect(document.title).toBe('Page not found | WorkLedger');
  await expectNoAxeViolations(container);
});

test('renders an unexpected route failure as one focused alert with retry and home recovery', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/profile') {
        return apiErrorResponse('DATABASE_UNAVAILABLE', 503);
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container } = renderApplication('/profile');

  const heading = await screen.findByRole('heading', { name: 'Page unavailable' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByRole('alert')).toHaveTextContent(
    'WorkLedger could not load this page. Check the service and try again',
  );
  expect(screen.getByRole('link', { name: 'Go to my home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('renders semantic system diagnostics with textual, token-owned states', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(SYSTEM_CONTEXT);
      if (path === '/v1/system/operations') return Response.json(SYSTEM_DIAGNOSTICS);
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const { container } = renderApplication('/system/operations');

  const heading = await screen.findByRole('heading', { name: 'Operations' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText('Degraded')).toBeVisible();
  expect(screen.getByText('Unavailable')).toBeVisible();
  expect(screen.getByText('Healthy')).toBeVisible();
  expect(screen.getByText(/Database connection timed out/u)).toHaveClass('wl-technical-error');

  const terms = container.querySelectorAll('dt');
  expect(terms).toHaveLength(9);
  for (const term of terms) expect(term.closest('dl')).not.toBeNull();
  for (const definition of container.querySelectorAll('dd')) {
    expect(definition.closest('dl')).not.toBeNull();
  }
  await expectNoAxeViolations(container);
});

test('keeps profile fields read-only and clears protected state after current-session revocation', async () => {
  let authenticated = true;
  const profile: SelfProfile = {
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
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') {
        return authenticated
          ? successResponse(EMPLOYEE_CONTEXT)
          : authenticationErrorResponse('AUTH_SESSION_EXPIRED');
      }
      if (path === '/v1/me/profile') return successResponse(profile);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path.includes('/v1/me/sessions/') && init?.method === 'POST') {
        authenticated = false;
        return successResponse({
          revokedCurrentSession: true,
          revokedSessionId: profile.sessions[0]?.id,
        });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const user = userEvent.setup();
  const { container } = renderApplication('/profile');

  await screen.findByRole('heading', { name: 'Profile' });
  expect(screen.getByText('NS-001')).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Chrome on macOS' })).toBeVisible();
  expect(screen.getByText('Current session')).toBeVisible();

  await user.click(screen.getByRole('button', { name: 'Sign out this session' }));
  const signInHeading = await screen.findByRole('heading', { name: 'Sign in' });
  await waitFor(() => expect(signInHeading).toHaveFocus());
  expect(screen.getByRole('status')).toHaveTextContent('You have signed out.');
  expect(screen.queryByText('NS-001')).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('switches account locale immediately and restores runtime, cache, and focus on failure', async () => {
  const profile: SelfProfile = { ...EMPLOYEE_CONTEXT, sessions: [] };
  const localeRequests: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = requestPath(input);
      if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
      if (path === '/v1/me/profile') return successResponse(profile);
      if (path === '/v1/me/csrf') return successResponse({ token: 'c'.repeat(43) });
      if (path === '/v1/me/locale' && init?.method === 'PUT') {
        const request = JSON.parse(String(init.body)) as { locale: string };
        localeRequests.push(request.locale);
        return request.locale === 'es-ES'
          ? apiErrorResponse('DATABASE_UNAVAILABLE', 503)
          : successResponse({ locale: request.locale });
      }
      throw new Error(`Unexpected test request: ${path}`);
    }),
  );
  const runtime = await initializeLocale('en-GB');
  const localeController = createWebLocaleController(runtime);
  const user = userEvent.setup();
  const { container } = renderApplication('/profile', localeController);

  await screen.findByRole('heading', { name: 'Profile' });
  const language = screen.getByRole('combobox', { name: 'Language' });
  language.focus();
  await user.selectOptions(language, 'de-DE');
  await waitFor(() => expect(document.documentElement.lang).toBe('de-DE'));
  expect(language).toHaveValue('de-DE');
  expect(language).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Ihre Kontosprache wurde aktualisiert.');

  await user.selectOptions(language, 'es-ES');
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ihre Sprache konnte nicht gespeichert werden.',
    ),
  );
  expect(language).toHaveValue('de-DE');
  expect(document.documentElement.lang).toBe('de-DE');
  expect(language).toHaveFocus();
  expect(localeRequests).toEqual(['de-DE', 'es-ES']);
  await expectNoAxeViolations(container);
});

function renderApplication(initialEntry: string, localeController?: WebLocaleController) {
  const queryClient = createWorkLedgerQueryClient();
  const url = new URL(initialEntry, 'https://workledger.test');
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient, localeController), {
    initialEntries: [
      {
        key: `component-test-${(routerSequence += 1).toString()}`,
        pathname: url.pathname,
        search: url.search,
      },
    ],
  });
  const application = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  const rendered = render(
    localeController === undefined ? (
      application
    ) : (
      <LocaleControllerProvider controller={localeController}>
        {application}
      </LocaleControllerProvider>
    ),
  );
  return { ...rendered, queryClient };
}

function successResponse(data: unknown): Response {
  return Response.json({ data, meta: { requestId: REQUEST_ID } });
}

function authenticationErrorResponse(code: 'AUTH_REQUIRED' | 'AUTH_SESSION_EXPIRED'): Response {
  return Response.json(
    {
      error: {
        code,
        message: code === 'AUTH_REQUIRED' ? 'Sign in to continue.' : 'Your session has expired.',
        requestId: REQUEST_ID,
      },
    },
    { status: 401 },
  );
}

function apiErrorResponse(code: string, status: number): Response {
  return Response.json(
    { error: { code, message: 'The request could not be completed.', requestId: REQUEST_ID } },
    { status },
  );
}

function authenticatedFetch(
  today: TodayAttendance = TODAY_ATTENDANCE,
  dailyTimeRecord: DailyTimeRecord = DAILY_TIME_RECORD,
  myTime: MyTime = MY_TIME,
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = requestPath(input);
    if (path === '/v1/me/context') return successResponse(EMPLOYEE_CONTEXT);
    if (path === '/v1/me/attendance/today') return successResponse(today);
    if (path === '/v1/me/time') return successResponse(myTime);
    if (path === '/v1/me/calendar') return successResponse(PERSONAL_CALENDAR);
    if (path === '/v1/me/requests') return successResponse(EMPTY_REQUEST_HISTORY);
    if (path.startsWith('/v1/me/time-records/')) return successResponse(dailyTimeRecord);
    throw new Error(`Unexpected test request: ${path}`);
  });
}

function todayWithAttendance(
  state: 'OFF_WORK' | 'ON_BREAK' | 'WORKING',
  attendanceRevision: number,
): TodayAttendance {
  const remainingExpectedMinutes = 480;
  return {
    ...TODAY_ATTENDANCE,
    attendance: attendanceForState(state, attendanceRevision),
    calculation: {
      ...TODAY_ATTENDANCE.calculation,
      attentionItems: [],
      estimatedFinishAt: state === 'WORKING' ? '2026-08-11T18:45:00Z' : null,
      estimatedFinishUnavailableReason:
        state === 'WORKING' ? null : state === 'ON_BREAK' ? 'ON_BREAK' : 'NOT_WORKING',
      provisional:
        TODAY_ATTENDANCE.calculation.provisional === null
          ? null
          : {
              ...TODAY_ATTENDANCE.calculation.provisional,
              calculationSources: {
                ...TODAY_ATTENDANCE.calculation.provisional.calculationSources,
                breakMinutesToday: 0,
                workedMinutesToday: 0,
              },
              creditedMinutesToday: 0,
              provisionalDifferenceMinutes: -480,
            },
      remainingExpectedMinutes,
    },
    timeline:
      state === 'WORKING'
        ? [{ id: 'punch-clock-in-1', occurredAt: '2026-08-11T09:30:00Z', type: 'CLOCK_IN' }]
        : state === 'ON_BREAK'
          ? [
              {
                id: 'punch-clock-in-1',
                occurredAt: '2026-08-11T09:30:00Z',
                type: 'CLOCK_IN',
              },
              {
                id: 'punch-break-start-1',
                occurredAt: '2026-08-11T10:30:00Z',
                type: 'BREAK_START',
              },
            ]
          : [],
  };
}

function attendanceForState(
  state: 'OFF_WORK' | 'ON_BREAK' | 'WORKING',
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
    validActions: [...validActions],
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

function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return new URL(input, 'https://workledger.test').pathname;
  if (input instanceof URL) return input.pathname;
  return new URL(input.url).pathname;
}
