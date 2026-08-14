import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { createBrowserRouter, redirect, type LoaderFunction, type RouteObject } from 'react-router';

import {
  approvalInboxQuerySchema,
  type NavigationArea,
  type SelfContext,
} from '@workledger/contracts';

import { ApiClientError, clearSessionMemory } from './api-client.js';
import {
  personalCalendarQuery,
  approvalDetailQuery,
  approvalInboxQuery,
  selfContextQuery,
  selfProfileQuery,
  todayAttendanceQuery,
} from './query.js';
import { RoutePresentation } from './route-presentation.js';
import { setPendingSignInNotice } from './session-notice.js';
import { ApplicationShell } from '../components/application-shell.js';
import {
  AuthenticationLayout,
  ForgotPasswordPage,
  ResetPasswordPage,
  SignInPage,
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
    area: 'MANAGER',
    description: 'Privacy-safe current availability for direct reports.',
    milestone: 'WL-702',
    path: 'team',
    title: 'Team',
  },
  {
    area: 'MANAGER',
    description: 'Equivalent calendar and agenda views for team availability.',
    milestone: 'WL-703',
    path: 'team-calendar',
    title: 'Team calendar',
  },
  {
    area: 'HR',
    description: 'Employment records and invitation, activation, and deactivation workflows.',
    milestone: 'WL-900',
    path: 'employees',
    title: 'Employees',
  },
  {
    area: 'HR',
    description: 'Scoped time, balance, leave, missing-record, and approval reports.',
    milestone: 'WL-804',
    path: 'reports',
    title: 'Reports',
  },
  {
    area: 'HR',
    description: 'Effective-dated weekly schedules and time policies.',
    milestone: 'WL-902 and WL-903',
    path: 'settings/time',
    title: 'Time settings',
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
    description: 'Technical accounts and authorized session administration.',
    milestone: 'WL-900',
    path: 'system/accounts',
    title: 'Accounts and sessions',
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
  {
    description: 'Generic in-app outcome and attention records with authorized detail links.',
    milestone: 'WL-704',
    path: 'notifications',
    title: 'Notifications',
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

function createApprovalDetailLoader(queryClient: QueryClient): LoaderFunction {
  return async ({ params }) => {
    await requireApprovalAudience(queryClient);
    const approvalId = params['approvalId'];
    if (approvalId === undefined) throw new Response(null, { status: 404 });
    void queryClient.prefetchQuery(approvalDetailQuery(approvalId));
    return null;
  };
}

async function requireApprovalAudience(queryClient: QueryClient): Promise<void> {
  const context = await requireContext(queryClient);
  if (!context.navigationAreas.includes('MANAGER') && !context.navigationAreas.includes('HR')) {
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
