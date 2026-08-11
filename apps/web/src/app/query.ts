import { QueryClient, queryOptions } from '@tanstack/react-query';

import { todayAttendanceSchema } from '@workledger/contracts';

import { loadSelfContext, loadSelfProfile, loadTodayAttendance } from './api-client.js';

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
    structuralSharing: preferNewestTodayAttendance,
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
