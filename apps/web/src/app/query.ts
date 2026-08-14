import { keepPreviousData, QueryClient, queryOptions } from '@tanstack/react-query';

import {
  type ApprovalInboxQuery,
  todayAttendanceSchema,
  type MyTimeQuery,
  type PersonalCalendarQuery,
} from '@workledger/contracts';

import {
  loadDailyTimeRecord,
  loadApprovalDetail,
  loadApprovalInbox,
  loadMyTime,
  loadPersonalCalendar,
  loadManagerCorrectionQueue,
  loadSelfContext,
  loadSelfProfile,
  loadTodayAttendance,
} from './api-client.js';

const TODAY_ATTENDANCE_REFRESH_INTERVAL_MS = 30 * 1_000;

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

export const dailyTimeRecordQuery = (recordId: string) =>
  queryOptions({
    queryFn: ({ signal }) => loadDailyTimeRecord(recordId, signal),
    queryKey: ['self', 'time-record', recordId] as const,
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
