import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { vi } from 'vitest';

import type {
  EmployeeAdminDetail,
  EmployeeAdminPage,
  EmployeeAssignmentAdminDetail,
  SelfContext,
  SystemAccountPage,
  TeamAdminPage,
} from '@workledger/contracts';
import { expectNoAxeViolations } from '@workledger/test-utils';

import { clearSessionMemory } from '../src/app/api-client.js';
import { createWorkLedgerQueryClient } from '../src/app/query.js';
import { createWorkLedgerRoutes } from '../src/app/router.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';
const EMPLOYEE_ID = '123e4567-e89b-42d3-a456-426614174101';
const ACCOUNT_ID = '123e4567-e89b-42d3-a456-426614174201';
const SESSION_ID = '123e4567-e89b-42d3-a456-426614174301';

const HR_CONTEXT: SelfContext = {
  account: { email: 'hr@example.test', name: 'HR Administrator' },
  defaultPath: '/today',
  employee: { displayName: 'HR Administrator', employeeNumber: 'HR-001', status: 'ACTIVE' },
  navigationAreas: ['EMPLOYEE', 'HR'],
  organization: { name: 'Northstar Studio' },
  roles: ['EMPLOYEE', 'HR_ADMINISTRATOR'],
};

const SYSTEM_CONTEXT: SelfContext = {
  account: { email: 'system@example.test', name: 'System Administrator' },
  defaultPath: '/system/operations',
  employee: null,
  navigationAreas: ['SYSTEM'],
  organization: { name: 'Northstar Studio' },
  roles: ['SYSTEM_ADMINISTRATOR'],
};

const EMPLOYEE_PAGE: EmployeeAdminPage = {
  items: [
    {
      account: { active: false, email: 'jordan@example.test', invitationPending: true },
      currentEmployment: {
        endsOn: null,
        id: '123e4567-e89b-42d3-a456-426614174102',
        startsOn: '2026-08-01',
      },
      displayName: 'Jordan Lee',
      employeeNumber: 'WL-900-001',
      id: EMPLOYEE_ID,
      roles: ['EMPLOYEE', 'MANAGER'],
      status: 'ACTIVE',
    },
  ],
  pagination: { limit: 20, page: 1, total: 1, totalPages: 1 },
};

const SELF_EMPLOYEE_DETAIL: EmployeeAdminDetail = {
  account: { active: true, email: 'hr@example.test', invitationPending: false },
  currentEmployment: {
    endsOn: null,
    id: '123e4567-e89b-42d3-a456-426614174103',
    startsOn: '2025-01-01',
  },
  displayName: 'HR Administrator',
  employeeNumber: 'HR-001',
  employmentHistory: [
    {
      endsOn: null,
      id: '123e4567-e89b-42d3-a456-426614174103',
      startsOn: '2025-01-01',
    },
  ],
  id: EMPLOYEE_ID,
  privilegedActionsAllowed: false,
  roles: ['EMPLOYEE', 'HR_ADMINISTRATOR'],
  status: 'ACTIVE',
};

const SYSTEM_PAGE: SystemAccountPage = {
  items: [
    {
      active: true,
      employeeLinked: false,
      email: 'system@example.test',
      id: ACCOUNT_ID,
      invitationPending: false,
      name: 'System Administrator',
      privilegedActionsAllowed: false,
      sessions: [
        {
          createdAt: '2026-08-14T08:00:00Z',
          deviceSummary: 'Firefox on Linux',
          expiresAt: '2026-08-14T20:00:00Z',
          id: SESSION_ID,
          lastActiveAt: '2026-08-14T10:00:00Z',
        },
      ],
      systemAdministrator: true,
    },
    {
      active: false,
      employeeLinked: true,
      email: 'jordan@example.test',
      id: '123e4567-e89b-42d3-a456-426614174202',
      invitationPending: true,
      name: 'Jordan Lee',
      privilegedActionsAllowed: true,
      sessions: [],
      systemAdministrator: false,
    },
  ],
  pagination: { limit: 20, page: 1, total: 2, totalPages: 1 },
};

const TEAM_PAGE: TeamAdminPage = {
  items: [
    { active: true, currentMemberCount: 1, id: 'team-alpha', name: 'Client Services' },
    { active: false, currentMemberCount: 0, id: 'team-old', name: 'Former Operations' },
  ],
  pagination: { limit: 50, page: 1, total: 2, totalPages: 1 },
};

const SELF_ASSIGNMENTS: EmployeeAssignmentAdminDetail = {
  activeTeams: [{ active: true, id: 'team-alpha', name: 'Client Services' }],
  asOfLocalDate: '2026-08-14',
  currentManager: null,
  currentTeam: null,
  eligibleManagers: [],
  managerHistory: [],
  privilegedActionsAllowed: false,
  teamHistory: [],
};

const EMPLOYEE_ASSIGNMENTS: EmployeeAssignmentAdminDetail = {
  activeTeams: [
    { active: true, id: 'team-alpha', name: 'Client Services' },
    { active: true, id: 'team-beta', name: 'Operations' },
  ],
  asOfLocalDate: '2026-08-14',
  currentManager: {
    endsOn: null,
    id: 'manager-assignment-current',
    manager: {
      displayName: 'Alex Morgan',
      employeeNumber: 'MGR-001',
      id: 'manager-alex',
      status: 'ACTIVE',
    },
    startsOn: '2026-04-01',
  },
  currentTeam: {
    endsOn: null,
    id: 'team-assignment-current',
    startsOn: '2026-06-01',
    team: { active: true, id: 'team-alpha', name: 'Client Services' },
  },
  eligibleManagers: [{ displayName: 'Sam Rivera', employeeNumber: 'MGR-002', id: 'manager-sam' }],
  managerHistory: [
    {
      endsOn: null,
      id: 'manager-assignment-current',
      manager: {
        displayName: 'Alex Morgan',
        employeeNumber: 'MGR-001',
        id: 'manager-alex',
        status: 'ACTIVE',
      },
      startsOn: '2026-04-01',
    },
  ],
  privilegedActionsAllowed: true,
  teamHistory: [
    {
      endsOn: null,
      id: 'team-assignment-current',
      startsOn: '2026-06-01',
      team: { active: true, id: 'team-alpha', name: 'Client Services' },
    },
  ],
};

afterEach(() => {
  clearSessionMemory();
  vi.unstubAllGlobals();
});

test('renders a dense, accessible employee directory and textual team catalog states', async () => {
  stubFetch(HR_CONTEXT, { employeePage: EMPLOYEE_PAGE, teamPage: TEAM_PAGE });
  const { container } = renderApplication('/employees?limit=20&page=1&status=ALL');

  const heading = await screen.findByRole('heading', { name: 'Employees' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByRole('link', { name: 'Add employee' })).toHaveAttribute(
    'href',
    '/employees/new',
  );
  const table = screen.getByRole('table', { name: /employees matching/iu });
  const row = within(table).getByRole('row', { name: /Jordan Lee/iu });
  expect(row).toHaveTextContent('Invitation pending');
  expect(row).toHaveTextContent('Employee, Manager');
  expect(screen.getByLabelText('Employment status')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Teams' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Client Services' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Deactivate Client Services' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Activate Former Operations' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('keeps privileged self-edit controls absent on an HR administrator’s own employee record', async () => {
  stubFetch(HR_CONTEXT, {
    employeeAssignments: SELF_ASSIGNMENTS,
    employeeDetail: SELF_EMPLOYEE_DETAIL,
  });
  const { container } = renderApplication(`/employees/${EMPLOYEE_ID}`);

  const heading = await screen.findByRole('heading', { name: 'HR Administrator' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText(/privileged self-edit controls are unavailable/iu)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Save roles' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Deactivate employee/iu })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save team assignment' })).not.toBeInTheDocument();
  await expectNoAxeViolations(container);
});

test('shows separate effective team and manager history with keyboard-focused recovery', async () => {
  stubFetch(HR_CONTEXT, {
    employeeAssignments: EMPLOYEE_ASSIGNMENTS,
    employeeDetail: { ...SELF_EMPLOYEE_DETAIL, privilegedActionsAllowed: true },
  });
  const user = userEvent.setup();
  const { container } = renderApplication(`/employees/${EMPLOYEE_ID}`);

  const heading = await screen.findByRole('heading', { name: 'HR Administrator' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText('Current: Client Services')).toBeVisible();
  expect(screen.getByText('Current: Alex Morgan')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Save direct-manager assignment' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Choose a manager change/iu);
  expect(screen.getByLabelText('Direct-manager change')).toHaveFocus();
  expect(screen.getByRole('option', { name: 'Sam Rivera (MGR-002)' })).toBeVisible();
  await expectNoAxeViolations(container);
});

test('focuses a linked error summary for the employee creation form', async () => {
  stubFetch(HR_CONTEXT, {});
  const user = userEvent.setup();
  const { container } = renderApplication('/employees/new');

  await user.click(await screen.findByRole('button', { name: 'Create and invite employee' }));
  const alert = screen.getByRole('alert');
  await waitFor(() => expect(alert).toHaveFocus());
  expect(
    within(alert).getByRole('link', { name: 'Enter the employee display name.' }),
  ).toHaveAttribute('href', '#display-name');
  expect(screen.getByText(/Technical system authority is administered separately/iu)).toBeVisible();
  await expectNoAxeViolations(container);
});

test('renders technical account and session controls without HR fields or self-privilege actions', async () => {
  stubFetch(SYSTEM_CONTEXT, { systemPage: SYSTEM_PAGE });
  const { container } = renderApplication('/system/accounts');

  const heading = await screen.findByRole('heading', { name: 'Accounts and sessions' });
  await waitFor(() => expect(heading).toHaveFocus());
  expect(screen.getByText(/No employee number, employment status, team/iu)).toBeVisible();
  const selfAccount = screen.getByRole('heading', { name: 'System Administrator' }).closest('li');
  expect(selfAccount).not.toBeNull();
  expect(
    within(selfAccount as HTMLElement).queryByRole('button', { name: /Deactivate account/iu }),
  ).not.toBeInTheDocument();
  const employeeAccount = screen.getByRole('heading', { name: 'Jordan Lee' }).closest('li');
  expect(
    within(employeeAccount as HTMLElement).getByRole('button', { name: 'Activate account' }),
  ).toBeVisible();
  expect(container.textContent).not.toMatch(
    /employeeNumber|employmentHistory|ipAddress|userAgent/iu,
  );
  await expectNoAxeViolations(container);
});

function renderApplication(initialEntry: string) {
  const queryClient = createWorkLedgerQueryClient();
  const router = createMemoryRouter(createWorkLedgerRoutes(queryClient), {
    initialEntries: [initialEntry],
  });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router };
}

function stubFetch(
  context: SelfContext,
  responses: Readonly<{
    employeeDetail?: EmployeeAdminDetail;
    employeeAssignments?: EmployeeAssignmentAdminDetail;
    employeePage?: EmployeeAdminPage;
    systemPage?: SystemAccountPage;
    teamPage?: TeamAdminPage;
  }>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'https://app.test',
      );
      if (url.pathname === '/v1/me/context') return successResponse(context);
      if (url.pathname === '/v1/hr/employees' && responses.employeePage !== undefined) {
        return successResponse(responses.employeePage);
      }
      if (url.pathname === '/v1/hr/teams' && responses.teamPage !== undefined) {
        return successResponse(responses.teamPage);
      }
      if (url.pathname.endsWith('/assignments') && responses.employeeAssignments !== undefined) {
        return successResponse(responses.employeeAssignments);
      }
      if (url.pathname.startsWith('/v1/hr/employees/') && responses.employeeDetail !== undefined) {
        return successResponse(responses.employeeDetail);
      }
      if (url.pathname === '/v1/system/accounts' && responses.systemPage !== undefined) {
        return successResponse(responses.systemPage);
      }
      throw new Error(`Unexpected request: ${url.pathname}${url.search}`);
    }),
  );
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ data, meta: { requestId: REQUEST_ID } }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}
