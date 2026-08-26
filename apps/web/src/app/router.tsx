import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter, redirect, type LoaderFunction, type RouteObject } from 'react-router';

import {
  approvalInboxQuerySchema,
  domainAuditQuerySchema,
  reportKeySchema,
  reportQuerySchema,
  teamCalendarQuerySchema,
  notificationQuerySchema,
  personalRequestQuerySchema,
  type NavigationArea,
  type SelfContext,
  DEFAULT_COMPANY_IDENTITY,
  employeeAdminQuerySchema,
  securityAuditQuerySchema,
  systemAccountQuerySchema,
  teamAdminQuerySchema,
} from '@workledger/contracts';
import { RouteState } from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from './api-client.js';
import {
  personalCalendarQuery,
  personalRequestDetailQuery,
  personalRequestHistoryQuery,
  companyIdentityQuery,
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
  employeePolicyAdminDetailQuery,
  employeeEntitlementAdminDetailQuery,
  employeeAdminPageQuery,
  systemAccountPageQuery,
  teamAdminPageQuery,
  timeSettingsAdminDetailQuery,
  absenceSettingsAdminDetailQuery,
  domainAuditPageQuery,
  securityAuditPageQuery,
  holidaySettingsAdminDetailQuery,
  systemDiagnosticsQuery,
} from './query.js';
import { RoutePresentation } from './route-presentation.js';
import { canonicalRouteLabel, canonicalRouteMessageKey } from './route-copy.js';
import { setPendingSignInNotice } from './session-notice.js';
import type { WebLocaleController } from './locale.js';
import { parseTeamStatusView, toTeamStatusSearchParams } from './team-status-view.js';
import { ApplicationShell } from '../components/application-shell.js';
import {
  AuthenticationLayout,
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
  ActivateAccountPage,
} from '../routes/auth-routes.js';
import { ProfilePage } from '../routes/profile-page.js';
import { RootNotFoundPage, RootRouteBoundary, RouteBoundary } from '../routes/route-boundary.js';
import { TodayPage } from '../routes/today-page.js';
import { MyTimePage } from '../routes/my-time-page.js';
import { DailyTimeRecordPage } from '../routes/daily-time-record-page.js';
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
import { TeamAdministrationPage } from '../routes/team-administration-page.js';
import { SystemAccountAdministrationPage } from '../routes/system-account-administration-page.js';
import { SystemOperationsPage } from '../routes/system-operations-page.js';
import { SystemAuditPage } from '../routes/system-audit-page.js';
import { TimeSettingsPage } from '../routes/time-settings-page.js';
import { AbsenceSettingsPage } from '../routes/absence-settings-page.js';
import { AuditPage } from '../routes/audit-page.js';
import { HolidaySettingsPage } from '../routes/holiday-settings-page.js';

const localeControllers = new WeakMap<QueryClient, WebLocaleController>();

export function createWorkLedgerRouter(
  queryClient: QueryClient,
  localeController?: WebLocaleController,
) {
  return createBrowserRouter(createWorkLedgerRoutes(queryClient, localeController));
}

export function createWorkLedgerRoutes(
  queryClient: QueryClient,
  localeController?: WebLocaleController,
): RouteObject[] {
  if (localeController !== undefined) localeControllers.set(queryClient, localeController);
  const routeTitle = (path: Parameters<typeof canonicalRouteMessageKey>[0]) =>
    localeController === undefined ? canonicalRouteLabel(path) : canonicalRouteMessageKey(path);
  const publicOnlyLoader = createPublicOnlyLoader(queryClient);
  const protectedLoader = createProtectedLoader(queryClient);

  return [
    {
      element: <RoutePresentation />,
      errorElement: <RootRouteBoundary />,
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
              handle: { title: routeTitle('/today') },
            },
            {
              path: 'profile',
              loader: createProfileLoader(queryClient),
              element: <ProfilePage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/profile') },
            },
            {
              path: 'my-time',
              loader: createEmployeeTimeLoader(queryClient),
              element: <MyTimePage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/my-time') },
            },
            {
              path: 'my-balances',
              loader: createEmployeeTimeLoader(queryClient),
              element: <MyTimePage balancesOnly />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/my-balances') },
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
              path: 'requests',
              loader: createPersonalRequestHistoryLoader(queryClient),
              lazy: async () => {
                const { RequestHistoryPage } = await import('../routes/request-history-page.js');
                return { Component: RequestHistoryPage };
              },
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/requests') },
            },
            {
              path: 'requests/new',
              loader: createEmployeeTimeLoader(queryClient),
              lazy: async () => {
                const { RequestNewPage } = await import('../routes/request-new-page.js');
                return { Component: RequestNewPage };
              },
              errorElement: <RouteBoundary />,
              handle: { title: 'New request' },
            },
            {
              path: 'requests/:requestId',
              loader: createPersonalRequestDetailLoader(queryClient),
              lazy: async () => {
                const { RequestDetailPage } = await import('../routes/request-detail-page.js');
                return { Component: RequestDetailPage };
              },
              errorElement: <RouteBoundary />,
              handle: { title: 'Request details' },
            },
            {
              path: 'calendar',
              loader: createPersonalCalendarLoader(queryClient),
              element: <PersonalCalendarPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/calendar') },
            },
            {
              path: 'time-records/:recordId/correction',
              loader: createCorrectionRequestRedirectLoader(queryClient),
              element: (
                <RouteState kind="loading" title="Opening correction request">
                  <p>WorkLedger is opening the request chooser.</p>
                </RouteState>
              ),
              errorElement: <RouteBoundary />,
              handle: { title: 'Request a time correction' },
            },
            {
              path: 'team',
              loader: createTeamStatusLoader(queryClient),
              element: <TeamStatusPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/team') },
            },
            {
              path: 'team-calendar',
              loader: createTeamCalendarLoader(queryClient),
              element: <TeamCalendarPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/team-calendar') },
            },
            {
              path: 'notifications',
              loader: createNotificationsLoader(queryClient),
              element: <NotificationsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/notifications') },
            },
            {
              path: 'approvals',
              loader: createApprovalInboxLoader(queryClient),
              element: <ApprovalInboxPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/approvals') },
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
              handle: { title: routeTitle('/reports') },
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
              handle: { title: routeTitle('/employees') },
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
              path: 'teams',
              loader: createTeamAdminListLoader(queryClient),
              element: <TeamAdministrationPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/teams') },
            },
            {
              path: 'settings/time',
              loader: createTimeSettingsAdminLoader(queryClient),
              element: <TimeSettingsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/settings/time') },
            },
            {
              path: 'settings/absence',
              loader: createAbsenceSettingsAdminLoader(queryClient),
              element: <AbsenceSettingsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/settings/absence') },
            },
            {
              path: 'settings/holidays',
              loader: createHolidaySettingsAdminLoader(queryClient),
              element: <HolidaySettingsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/settings/holidays') },
            },
            {
              path: 'audit',
              loader: createDomainAuditLoader(queryClient),
              element: <AuditPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/audit') },
            },
            {
              path: 'system/accounts',
              loader: createSystemAccountAdminLoader(queryClient),
              element: <SystemAccountAdministrationPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/system/accounts') },
            },
            {
              path: 'system/operations',
              loader: createSystemOperationsLoader(queryClient),
              element: <SystemOperationsPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/system/operations') },
            },
            {
              path: 'system/audit',
              loader: createSystemAuditLoader(queryClient),
              element: <SystemAuditPage />,
              errorElement: <RouteBoundary />,
              handle: { title: routeTitle('/system/audit') },
            },
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
      <RouteState
        headingLevel="h1"
        headingProps={{
          'data-route-focus-key': 'route-heading',
          'data-route-heading': true,
          tabIndex: -1,
        }}
        kind="loading"
        title="Loading WorkLedger"
      >
        <p className="m-0">Checking your current session and available work areas…</p>
      </RouteState>
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
      await activateAccountLocale(queryClient, context);
      return redirect(context.defaultPath);
    } catch (error) {
      if (isAuthenticationError(error)) {
        await localeControllers.get(queryClient)?.activateSignedOut();
        return redirect('/sign-in');
      }
      throw error;
    }
  };
}

function createPublicOnlyLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    try {
      const context = await queryClient.ensureQueryData(selfContextQuery());
      await activateAccountLocale(queryClient, context);
      return redirect(context.defaultPath);
    } catch (error) {
      if (isAuthenticationError(error)) {
        await localeControllers.get(queryClient)?.activateSignedOut();
        await ensureCompanyIdentity(queryClient);
        return null;
      }
      throw error;
    }
  };
}

async function ensureCompanyIdentity(queryClient: QueryClient) {
  try {
    return await queryClient.ensureQueryData(companyIdentityQuery());
  } catch {
    queryClient.setQueryData(companyIdentityQuery().queryKey, DEFAULT_COMPANY_IDENTITY);
    return DEFAULT_COMPANY_IDENTITY;
  }
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

function createPersonalRequestHistoryLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('EMPLOYEE')) throw new Response(null, { status: 403 });
    const searchParams = new URL(request.url).searchParams;
    const values: Record<string, string> = {};
    for (const key of new Set(searchParams.keys())) {
      const entries = searchParams.getAll(key);
      if (entries.length !== 1 || entries[0] === undefined) return redirect('/requests');
      values[key] = entries[0];
    }
    const parsed = personalRequestQuerySchema.safeParse(values);
    if (!parsed.success) return redirect('/requests');
    void queryClient.prefetchQuery(personalRequestHistoryQuery(parsed.data));
    return parsed.data;
  };
}

function createPersonalRequestDetailLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('EMPLOYEE')) throw new Response(null, { status: 403 });
    const requestId = params['requestId'];
    if (requestId === undefined) throw new Response(null, { status: 404 });
    void queryClient.prefetchQuery(personalRequestDetailQuery(requestId));
    return null;
  };
}

function createCorrectionRequestRedirectLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('EMPLOYEE')) throw new Response(null, { status: 403 });
    const recordId = params['recordId'];
    if (recordId === undefined) throw new Response(null, { status: 404 });
    return redirect(`/requests/new?recordId=${encodeURIComponent(recordId)}`);
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
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('MANAGER')) throw new Response(null, { status: 403 });
    const searchParams = new URL(request.url).searchParams;
    const view = parseTeamStatusView(searchParams);
    if (view === null) return redirect('/team');
    const canonicalSearch = toTeamStatusSearchParams(view).toString();
    if (canonicalSearch !== searchParams.toString()) {
      return redirect(canonicalSearch === '' ? '/team' : `/team?${canonicalSearch}`);
    }
    void queryClient.prefetchQuery(teamStatusQuery());
    return view;
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
    return parsed.data;
  };
}

function createTeamAdminListLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    const values = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = teamAdminQuerySchema.safeParse(values);
    if (!parsed.success) return redirect('/teams?limit=20&page=1&status=ACTIVE');
    void queryClient.prefetchQuery(teamAdminPageQuery(parsed.data));
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
    void queryClient.prefetchQuery(employeePolicyAdminDetailQuery(employeeId));
    void queryClient.prefetchQuery(employeeEntitlementAdminDetailQuery(employeeId));
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

function createAbsenceSettingsAdminLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    void queryClient.prefetchQuery(absenceSettingsAdminDetailQuery());
    return null;
  };
}

function createHolidaySettingsAdminLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    void queryClient.prefetchQuery(holidaySettingsAdminDetailQuery());
    return null;
  };
}

function createDomainAuditLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('HR')) throw new Response(null, { status: 403 });
    const url = new URL(request.url);
    const parsed = domainAuditQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw new Response(null, { status: 422 });
    void queryClient.prefetchQuery(domainAuditPageQuery(parsed.data));
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

function createSystemOperationsLoader(queryClient: QueryClient): LoaderFunction {
  return async () => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('SYSTEM')) throw new Response(null, { status: 403 });
    void queryClient.prefetchQuery(systemDiagnosticsQuery());
    return null;
  };
}

function createSystemAuditLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ request }) => {
    const context = await requireContext(queryClient);
    if (!context.navigationAreas.includes('SYSTEM')) throw new Response(null, { status: 403 });
    const values = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = securityAuditQuerySchema.safeParse(values);
    const query = parsed.success ? parsed.data : securityAuditQuerySchema.parse({});
    void queryClient.prefetchQuery(securityAuditPageQuery(query));
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
    if (isAuthenticationError(error)) throw await expireSession(queryClient, error);
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
    const context = await queryClient.ensureQueryData(selfContextQuery());
    await activateAccountLocale(queryClient, context);
    return context;
  } catch (error) {
    if (isAuthenticationError(error)) throw await expireSession(queryClient, error);
    throw error;
  }
}

async function expireSession(queryClient: QueryClient, error: unknown): Promise<Response> {
  clearSessionMemory();
  queryClient.clear();
  await localeControllers.get(queryClient)?.activateSignedOut();
  if (error instanceof ApiClientError && error.code === 'AUTH_SESSION_EXPIRED') {
    setPendingSignInNotice('SESSION_EXPIRED');
  }
  return redirect('/sign-in');
}

async function activateAccountLocale(
  queryClient: QueryClient,
  context: SelfContext,
): Promise<void> {
  await localeControllers.get(queryClient)?.activate(context.locale);
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
