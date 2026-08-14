import { keepPreviousData, QueryClient, queryOptions } from '@tanstack/react-query';

import {
  type ApprovalInboxQuery,
  todayAttendanceSchema,
  type MyTimeQuery,
  type PersonalCalendarQuery,
  type TeamCalendarQuery,
  type NotificationQuery,
  type ReportKey,
  type ReportQuery,
  type EmployeeAdminQuery,
  type TeamAdminQuery,
  type SystemAccountQuery,
} from '@workledger/contracts';

import {
  loadDailyTimeRecord,
  loadApprovalDetail,
  loadApprovalInbox,
  loadMyTime,
  loadPersonalCalendar,
  loadManagerCorrectionQueue,
  loadMonthlyPeriod,
  loadSelfContext,
  loadSelfProfile,
  loadTodayAttendance,
  loadTeamStatus,
  loadTeamCalendar,
  loadNotificationHistory,
  loadReport,
  loadReportCatalog,
  loadEmployeeAdminDetail,
  loadEmployeeAdminPage,
  loadEmployeeAssignmentAdminDetail,
  loadEmployeeScheduleAdminDetail,
  loadTimeSettingsAdminDetail,
  loadTeamAdminPage,
  loadSystemAccountPage,
} from './api-client.js';

const TODAY_ATTENDANCE_REFRESH_INTERVAL_MS = 30 * 1_000;
const TEAM_STATUS_REFRESH_INTERVAL_MS = 30 * 1_000;

export function createWorkLedgerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: {
        gcTime: 5 * 60 * 1_000,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        retry: false,
        staleTime: 30 * 1_000,
      },
    },
  });
}

export const selfContextQuery = () =>
  queryOptions({ queryFn: loadSelfContext, queryKey: ['self', 'context'] as const });

export const selfProfileQuery = () =>
  queryOptions({ queryFn: loadSelfProfile, queryKey: ['self', 'profile'] as const });

export const employeeAdminPageQuery = (query: EmployeeAdminQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadEmployeeAdminPage(query, signal),
    queryKey: ['administration', 'employees', query] as const,
  });

export const employeeAdminDetailQuery = (employeeId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadEmployeeAdminDetail(employeeId, signal),
    queryKey: ['administration', 'employee', employeeId] as const,
  });

export const employeeAssignmentAdminDetailQuery = (employeeId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadEmployeeAssignmentAdminDetail(employeeId, signal),
    queryKey: ['administration', 'employee-assignments', employeeId] as const,
  });

export const employeeScheduleAdminDetailQuery = (employeeId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadEmployeeScheduleAdminDetail(employeeId, signal),
    queryKey: ['administration', 'employee-schedule', employeeId] as const,
  });

export const timeSettingsAdminDetailQuery = () =>
  queryOptions({
    queryFn: ({ signal }) => loadTimeSettingsAdminDetail(signal),
    queryKey: ['administration', 'time-settings'] as const,
  });

export const teamAdminPageQuery = (query: TeamAdminQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadTeamAdminPage(query, signal),
    queryKey: ['administration', 'teams', query] as const,
  });

export const systemAccountPageQuery = (query: SystemAccountQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadSystemAccountPage(query, signal),
    queryKey: ['administration', 'system-accounts', query] as const,
  });

export const todayAttendanceQuery = () =>
  queryOptions({
    queryFn: ({ signal }) => loadTodayAttendance(signal),
    queryKey: ['self', 'attendance', 'today'] as const,
    refetchInterval: TODAY_ATTENDANCE_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
    structuralSharing: preferNewestTodayAttendance,
  });

export const myTimeQuery = (query: MyTimeQuery) =>
  queryOptions({
    queryFn: ({ signal }) => loadMyTime(query, signal),
    queryKey: ['self', 'time', query] as const,
  });

export const personalCalendarQuery = (query: PersonalCalendarQuery) =>
  queryOptions({
    queryFn: ({ signal }) => loadPersonalCalendar(query, signal),
    queryKey: ['self', 'calendar', query] as const,
  });

export const notificationHistoryQuery = (query: NotificationQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadNotificationHistory(query, signal),
    queryKey: ['self', 'notifications', query] as const,
  });

export const dailyTimeRecordQuery = (recordId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadDailyTimeRecord(recordId, signal),
    queryKey: ['self', 'time-record', recordId] as const,
  });

export const monthlyPeriodQuery = (periodId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadMonthlyPeriod(periodId, signal),
    queryKey: ['monthly-periods', 'detail', periodId] as const,
  });

export const reportCatalogQuery = () =>
  queryOptions({
    queryFn: ({ signal }) => loadReportCatalog(signal),
    queryKey: ['reports', 'catalog'] as const,
  });

export const reportResultQuery = (reportKey: ReportKey, query: ReportQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadReport(reportKey, query, signal),
    queryKey: ['reports', reportKey, query] as const,
  });

export const managerCorrectionQueueQuery = () =>
  queryOptions({
    queryFn: ({ signal }) => loadManagerCorrectionQueue(signal),
    queryKey: ['manager', 'correction-requests'] as const,
  });

export const approvalInboxQuery = (query: ApprovalInboxQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadApprovalInbox(query, signal),
    queryKey: ['approvals', 'inbox', query] as const,
  });

export const approvalDetailQuery = (approvalId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadApprovalDetail(approvalId, signal),
    queryKey: ['approvals', 'detail', approvalId] as const,
  });

export const teamStatusQuery = () =>
  queryOptions({
    queryFn: ({ signal }) => loadTeamStatus(signal),
    queryKey: ['team', 'status'] as const,
    refetchInterval: TEAM_STATUS_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
  });

export const teamCalendarQuery = (query: TeamCalendarQuery) =>
  queryOptions({
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => loadTeamCalendar(query, signal),
    queryKey: ['team', 'calendar', query] as const,
  });

function preferNewestTodayAttendance(previous: unknown, next: unknown): unknown {
  const previousToday = todayAttendanceSchema.safeParse(previous);
  const nextToday = todayAttendanceSchema.safeParse(next);
  if (
    previousToday.success &&
    nextToday.success &&
    (nextToday.data.attendance.attendanceRevision <
      previousToday.data.attendance.attendanceRevision ||
      (nextToday.data.attendance.attendanceRevision ===
        previousToday.data.attendance.attendanceRevision &&
        nextToday.data.asOf < previousToday.data.asOf))
  ) {
    return previous;
  }
  return next;
}
