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

  await dialog.getByRole('link', { name: 'Team', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Team' })).toBeFocused();
  await expect(page).toHaveTitle('Team | WorkLedger');
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
