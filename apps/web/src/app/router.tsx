import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter, redirect, type LoaderFunction, type RouteObject } from 'react-router';

import {
  approvalInboxQuerySchema,
  reportKeySchema,
  reportQuerySchema,
  teamCalendarQuerySchema,
  notificationQuerySchema,
  type NavigationArea,
  type SelfContext,
  employeeAdminQuerySchema,
  systemAccountQuerySchema,
} from '@workledger/contracts';

import { ApiClientError, clearSessionMemory } from './api-client.js';
import {
  personalCalendarQuery,
  approvalDetailQuery,
  approvalInboxQuery,
  selfContextQuery,
  selfProfileQuery,
  todayAttendanceQuery,
  teamStatusQuery,
  teamCalendarQuery,
  notificationHistoryQuery,
  monthlyPeriodQuery,
  reportCatalogQuery,
  reportResultQuery,
  employeeAdminDetailQuery,
  employeeAssignmentAdminDetailQuery,
  employeeScheduleAdminDetailQuery,
  employeeAdminPageQuery,
  systemAccountPageQuery,
  teamAdminPageQuery,
  timeSettingsAdminDetailQuery,
} from './query.js';
import { RoutePresentation } from './route-presentation.js';
import { setPendingSignInNotice } from './session-notice.js';
import { ApplicationShell } from '../components/application-shell.js';
import {
  AuthenticationLayout,
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
  ActivateAccountPage,
} from '../routes/auth-routes.js';
import { PlaceholderPage } from '../routes/placeholder-page.js';
import { ProfilePage } from '../routes/profile-page.js';
import { RootNotFoundPage, RouteBoundary } from '../routes/route-boundary.js';
import { TodayPage } from '../routes/today-page.js';
import { MyTimePage } from '../routes/my-time-page.js';
import { DailyTimeRecordPage } from '../routes/daily-time-record-page.js';
import { CorrectionRequestPage } from '../routes/correction-request-page.js';
import { VacationRequestPage } from '../routes/vacation-request-page.js';
import { SicknessReportPage } from '../routes/sickness-report-page.js';
import { PersonalCalendarPage } from '../routes/personal-calendar-page.js';
import { ApprovalInboxPage } from '../routes/approval-inbox-page.js';
import { ApprovalDetailPage } from '../routes/approval-detail-page.js';
import { TeamStatusPage } from '../routes/team-status-page.js';
import { TeamCalendarPage } from '../routes/team-calendar-page.js';
import { NotificationsPage } from '../routes/notifications-page.js';
import { MonthlyPeriodPage } from '../routes/monthly-period-page.js';
import {
  ReportDetailPage,
  toReportSearchParams,
  type ReportRouteLoaderData,
} from '../routes/report-detail-page.js';
import { ReportsPage } from '../routes/reports-page.js';
import {
  EmployeeAdministrationDetailPage,
  EmployeeAdministrationPage,
  NewEmployeeAdministrationPage,
} from '../routes/employee-administration-page.js';
import { SystemAccountAdministrationPage } from '../routes/system-account-administration-page.js';
import { TimeSettingsPage } from '../routes/time-settings-page.js';

type PlaceholderRoute = Readonly<{
  area?: NavigationArea;
  description: string;
  milestone: string;
  path: string;
  title: string;
}>;

const PLACEHOLDER_ROUTES: readonly PlaceholderRoute[] = [
  {
    area: 'EMPLOYEE',
    description:
      'Vacation requests and later absence, correction, cancellation, and post-lock requests.',
    milestone: 'WL-602 and later Phase 6',
    path: 'requests',
    title: 'Requests',
  },
  {
    area: 'HR',
    description: 'Absence types and leave-entitlement administration.',
    milestone: 'WL-904',
    path: 'settings/absence',
    title: 'Absence settings',
  },
  {
    area: 'HR',
    description: 'Organization public-holiday calendars and impact review.',
    milestone: 'WL-905',
    path: 'settings/holidays',
    title: 'Holiday calendars',
  },
  {
    area: 'HR',
    description: 'Authorized, minimized domain audit history.',
    milestone: 'WL-906',
    path: 'audit',
    title: 'Audit',
  },
  {
    area: 'SYSTEM',
    description: 'Safe service health and technical operations without HR data.',
    milestone: 'WL-1006',
    path: 'system/operations',
    title: 'Operations',
  },
  {
    area: 'SYSTEM',
    description: 'Security and technical audit evidence separated from domain history.',
    milestone: 'WL-906 and WL-1006',
    path: 'system/audit',
    title: 'Technical audit',
  },
];

export function createWorkLedgerRouter(queryClient: QueryClient) {
  return createBrowserRouter(createWorkLedgerRoutes(queryClient));
}

export function createWorkLedgerRoutes(queryClient: QueryClient): RouteObject[] {
  const publicOnlyLoader = createPublicOnlyLoader(queryClient);
  const protectedLoader = createProtectedLoader(queryClient);

  return [
    {
      element: <RoutePresentation />,
      hydrateFallbackElement: <InitialRouteFallback />,
      children: [
        { index: true, loader: createHomeLoader(queryClient) },
        {
          element: <AuthenticationLayout />,
          children: [
            authRoute('sign-in', 'Sign in', <SignInPage />, publicOnlyLoader),
            authRoute(
              'forgot-password',
              'Reset your password',
              <ForgotPasswordPage />,
              publicOnlyLoader,
            ),
            authRoute(
              'reset-password',
              'Choose a new password',
              <ResetPasswordPage />,
              publicOnlyLoader,
            ),
            authRoute(
              'activate-account',
              'Activate your account',
              <ActivateAccountPage />,
              publicOnlyLoader,
            ),
          ],
        },
        {
          id: 'protected',
          loader: protectedLoader,
          element: <ApplicationShell />,
          errorElement: <RouteBoundary />,
          children: [
            {
              path: 'today',
              loader: createTodayLoader(queryClient),
              element: <TodayPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Today' },
            },
            {
              path: 'profile',
              loader: createProfileLoader(queryClient),
              element: <ProfilePage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Profile' },
            },
            {
              path: 'my-time',
              loader: createEmployeeTimeLoader(queryClient),
              element: <MyTimePage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'My time' },
            },
            {
              path: 'my-balances',
              loader: createEmployeeTimeLoader(queryClient),
              element: <MyTimePage balancesOnly />,
              errorElement: <RouteBoundary />,
              handle: { title: 'My balances' },
            },
            {
              path: 'time-records/:recordId',
              loader: createEmployeeTimeLoader(queryClient),
              element: <DailyTimeRecordPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Daily record' },
            },
            {
              path: 'monthly-periods/:periodId',
              loader: createMonthlyPeriodLoader(queryClient),
              element: <MonthlyPeriodPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Monthly period' },
            },
            {
              path: 'requests/new',
              loader: protectedLoader,
              element: <VacationRequestPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Request vacation' },
            },
            {
              path: 'requests/sickness',
              loader: protectedLoader,
              element: <SicknessReportPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Report sickness' },
            },
            {
              path: 'calendar',
              loader: createPersonalCalendarLoader(queryClient),
              element: <PersonalCalendarPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Calendar' },
            },
            {
              path: 'time-records/:recordId/correction',
              loader: createEmployeeTimeLoader(queryClient),
              element: <CorrectionRequestPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Request a time correction' },
            },
            {
              path: 'team',
              loader: createTeamStatusLoader(queryClient),
              element: <TeamStatusPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Team' },
            },
            {
              path: 'team-calendar',
              loader: createTeamCalendarLoader(queryClient),
              element: <TeamCalendarPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Team calendar' },
            },
            {
              path: 'notifications',
              loader: createNotificationsLoader(queryClient),
              element: <NotificationsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Notifications' },
            },
            {
              path: 'approvals',
              loader: createApprovalInboxLoader(queryClient),
              element: <ApprovalInboxPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Approvals' },
            },
            {
              path: 'approvals/:approvalId',
              loader: createApprovalDetailLoader(queryClient),
              element: <ApprovalDetailPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Approval review' },
            },
            {
              path: 'reports',
              loader: createReportsLoader(queryClient),
              element: <ReportsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Reports' },
            },
            {
              path: 'reports/:reportKey',
              loader: createReportDetailLoader(queryClient),
              element: <ReportDetailPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Report' },
            },
            {
              path: 'employees',
              loader: createEmployeeAdminListLoader(queryClient),
              element: <EmployeeAdministrationPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Employees' },
            },
            {
              path: 'employees/new',
              loader: createAreaLoader(queryClient, 'HR'),
              element: <NewEmployeeAdministrationPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Add employee' },
            },
            {
              path: 'employees/:employeeId',
              loader: createEmployeeAdminDetailLoader(queryClient),
              element: <EmployeeAdministrationDetailPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Employee' },
            },
            {
              path: 'settings/time',
              loader: createTimeSettingsAdminLoader(queryClient),
              element: <TimeSettingsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Time settings' },
            },
            {
              path: 'system/accounts',
              loader: createSystemAccountAdminLoader(queryClient),
              element: <SystemAccountAdministrationPage />,
              errorElement: <RouteBoundary />,
              handle: { title: 'Accounts and sessions' },
            },
            ...PLACEHOLDER_ROUTES.map((route) => ({
              path: route.path,
              loader:
                route.area === undefined
                  ? protectedLoader
                  : createAreaLoader(queryClient, route.area),
              element: (
                <PlaceholderPage
                  description={route.description}
                  milestone={route.milestone}
                  title={route.title}
                />
              ),
              errorElement: <RouteBoundary />,
              handle: { title: route.title },
            })),
          ],
        },
        { path: '*', element: <RootNotFoundPage />, handle: { title: 'Page not found' } },
      ],
    },
  ];
}

function InitialRouteFallback() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      aria-busy="true"
      className="mx-auto grid min-h-dvh w-full max-w-3xl content-center px-5 py-12 sm:px-8"
    >
      <p className="m-0 text-lg font-semibold text-[var(--wl-text-muted)]">Loading WorkLedger…</p>
    </main>
  );
}

function authRoute(
  path: string,
  title: string,
  element: ReactNode,
  loader: LoaderFunction,
): RouteObject {
  return {
    path,
    loader,
    element,
    errorElement: <RouteBoundary />,
    handle: { title },
  };
}

function createHomeLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    try {
      const context = await queryClient.ensureQueryData(selfContextQuery());
      return redirect(context.defaultPath);
    } catch (error) {
      if (isAuthenticationError(error)) return redirect('/sign-in');
      throw error;
    }
  };
}

function createPublicOnlyLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    try {
      const context = await queryClient.ensureQueryData(selfContextQuery());
      return redirect(context.defaultPath);
    } catch (error) {
      if (isAuthenticationError(error)) return null;
      throw error;
    }
  };
}

function createProtectedLoader(queryClient: QueryClient): LoaderFunction {
  return async () => requireContext(queryClient);
}

function createAreaLoader(queryClient: QueryClient, area: NavigationArea): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes(area)) throw new Response(null, { status: 403 });
    return null;
  };
}

function createProfileLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    await requireContext(queryClient);
    try {
      await queryClient.ensureQueryData(selfProfileQuery());
      return null;
    } catch (error) {
      if (isAuthenticationError(error)) return expireSession(queryClient, error);
      throw error;
    }
  };
}

function createTodayLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('EMPLOYEE')) throw new Response(null, { status: 403 });
    void queryClient.prefetchQuery(todayAttendanceQuery());
    return null;
  };
}

function createEmployeeTimeLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('EMPLOYEE')) throw new Response(null, { status: 403 });
    return null;
  };
}

function createPersonalCalendarLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('EMPLOYEE')) throw new Response(null, { status: 403 });
    const month = new URL(request.url).searchParams.get('month') ?? undefined;
    await queryClient.ensureQueryData(
      personalCalendarQuery({ ...(month === undefined ? {} : { month }) }),
    );
    return null;
  };
}

function createApprovalInboxLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    await requireApprovalAudience(queryClient);
    const searchParams = new URL(request.url).searchParams;
    const values: Record<string, string> = {};
    for (const key of new Set(searchParams.keys())) {
      const entries = searchParams.getAll(key);
      if (entries.length !== 1 || entries[0] === undefined) return redirect('/approvals');
      values[key] = entries[0];
    }
    const parsed = approvalInboxQuerySchema.safeParse(values);
    if (!parsed.success) return redirect('/approvals');
    void queryClient.prefetchQuery(approvalInboxQuery(parsed.data));
    return parsed.data;
  };
}

function createTeamStatusLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('MANAGER')) throw new Response(null, { status: 403 });
    void queryClient.prefetchQuery(teamStatusQuery());
    return null;
  };
}

function createTeamCalendarLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    await requireApprovalAudience(queryClient);
    const searchParams = new URL(request.url).searchParams;
    const values: Record<string, string> = {};
    for (const key of new Set(searchParams.keys())) {
      const entries = searchParams.getAll(key);
      if (entries.length !== 1 || entries[0] === undefined) return redirect('/team-calendar');
      values[key] = entries[0];
    }
    const parsed = teamCalendarQuerySchema.safeParse(values);
    if (!parsed.success) return redirect('/team-calendar');
    void queryClient.prefetchQuery(teamCalendarQuery(parsed.data));
    return parsed.data;
  };
}

function createNotificationsLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    await requireContext(queryClient);
    const searchParams = new URL(request.url).searchParams;
    const values: Record<string, string> = {};
    for (const key of new Set(searchParams.keys())) {
      const entries = searchParams.getAll(key);
      if (entries.length !== 1 || entries[0] === undefined) return redirect('/notifications');
      values[key] = entries[0];
    }
    const parsed = notificationQuerySchema.safeParse(values);
    if (!parsed.success) return redirect('/notifications');
    void queryClient.prefetchQuery(notificationHistoryQuery(parsed.data));
    return parsed.data;
  };
}

function createApprovalDetailLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params }) => {
    await requireApprovalAudience(queryClient);
    const approvalId = params['approvalId'];
    if (approvalId === undefined) throw new Response(null, { status: 404 });
    void queryClient.prefetchQuery(approvalDetailQuery(approvalId));
    return null;
  };
}

function createMonthlyPeriodLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params }) => {
    await requireContext(queryClient);
    const periodId = params['periodId'];
    if (periodId === undefined) throw new Response(null, { status: 404 });
    void queryClient.prefetchQuery(monthlyPeriodQuery(periodId));
    return null;
  };
}

function createReportsLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    await requireReportAudience(queryClient);
    await ensureReportCatalog(queryClient);
    return null;
  };
}

function createEmployeeAdminListLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    const values = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = employeeAdminQuerySchema.safeParse(values);
    if (!parsed.success) return redirect('/employees?limit=20&page=1&status=ALL');
    void queryClient.prefetchQuery(employeeAdminPageQuery(parsed.data));
    void queryClient.prefetchQuery(teamAdminPageQuery({ limit: 50, page: 1, status: 'ALL' }));
    return parsed.data;
  };
}

function createEmployeeAdminDetailLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    const employeeId = params['employeeId'];
    if (employeeId === undefined) throw new Response(null, { status: 404 });
    void queryClient.prefetchQuery(employeeAdminDetailQuery(employeeId));
    void queryClient.prefetchQuery(employeeAssignmentAdminDetailQuery(employeeId));
    void queryClient.prefetchQuery(employeeScheduleAdminDetailQuery(employeeId));
    return null;
  };
}

function createTimeSettingsAdminLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    void queryClient.prefetchQuery(timeSettingsAdminDetailQuery());
    return null;
  };
}

function createSystemAccountAdminLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('SYSTEM')) throw new Response(null, { status: 403 });
    const values = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = systemAccountQuerySchema.safeParse(values);
    const query = parsed.success ? parsed.data : { limit: 20, page: 1 };
    void queryClient.prefetchQuery(systemAccountPageQuery(query));
    return query;
  };
}

function createReportDetailLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params, request }) => {
    await requireReportAudience(queryClient);
    const parsedKey = reportKeySchema.safeParse(params['reportKey']);
    if (!parsedKey.success) throw new Response(null, { status: 404 });
    const catalog = await ensureReportCatalog(queryClient);
    const report = catalog.reports.find((candidate) => candidate.key === parsedKey.data);
    if (report === undefined) throw new Response(null, { status: 403 });
    const searchParams = new URL(request.url).searchParams;
    const values: Record<string, string> = {};
    for (const key of new Set(searchParams.keys())) {
      const entries = searchParams.getAll(key);
      if (entries.length !== 1 || entries[0] === undefined) {
        return redirect(canonicalReportPath(parsedKey.data, catalog, report.defaultSort));
      }
      values[key] = entries[0];
    }
    const parsedQuery = reportQuerySchema.safeParse(values);
    if (!parsedQuery.success || !report.availableSorts.includes(parsedQuery.data.sort)) {
      return redirect(canonicalReportPath(parsedKey.data, catalog, report.defaultSort));
    }
    void queryClient.prefetchQuery(reportResultQuery(parsedKey.data, parsedQuery.data));
    return {
      catalog,
      query: parsedQuery.data,
      report,
      reportKey: parsedKey.data,
    } satisfies ReportRouteLoaderData;
  };
}

async function ensureReportCatalog(queryClient: QueryClient) {
  try {
    return await queryClient.ensureQueryData(reportCatalogQuery());
  } catch (error) {
    if (isAuthenticationError(error)) throw expireSession(queryClient, error);
    if (error instanceof ApiClientError && error.status === 403) {
      throw new Response(null, { status: 403 });
    }
    throw error;
  }
}

function canonicalReportPath(
  reportKey: ReportRouteLoaderData['reportKey'],
  catalog: ReportRouteLoaderData['catalog'],
  sort: ReportRouteLoaderData['query']['sort'],
): string {
  const query = reportQuerySchema.parse({
    direction: 'ASC',
    from: catalog.defaultRange.from,
    limit: 20,
    page: 1,
    sort,
    to: catalog.defaultRange.to,
  });
  return `/reports/${reportKey}?${toReportSearchParams(query).toString()}`;
}

async function requireApprovalAudience(queryClient: QueryClient): Promise<void> {
  const context = await requireContext(queryClient);
  if (!context.navigationAreas.includes('MANAGER') && !context.navigationAreas.includes('HR')) {
    throw new Response(null, { status: 403 });
  }
}

async function requireReportAudience(queryClient: QueryClient): Promise<void> {
  const context = await requireContext(queryClient);
  if (
    !context.navigationAreas.includes('EMPLOYEE') &&
    !context.navigationAreas.includes('MANAGER') &&
    !context.navigationAreas.includes('HR')
  ) {
    throw new Response(null, { status: 403 });
  }
}

async function requireContext(queryClient: QueryClient): Promise<SelfContext> {
  try {
    return await queryClient.ensureQueryData(selfContextQuery());
  } catch (error) {
    if (isAuthenticationError(error)) throw expireSession(queryClient, error);
    throw error;
  }
}

function expireSession(queryClient: QueryClient, error: unknown): Response {
  clearSessionMemory();
  queryClient.clear();
  if (error instanceof ApiClientError && error.code === 'AUTH_SESSION_EXPIRED') {
    setPendingSignInNotice('SESSION_EXPIRED');
  }
  return redirect('/sign-in');
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
