import type { TodayAttendance } from '@workledger/contracts';

/** Coherent, purpose-minimized Today snapshot shared by browser-level tests. */
export const COHERENT_TODAY_ATTENDANCE: TodayAttendance = {
  asOf: '2026-08-11T10:45:00Z',
  attendance: {
    actionAvailability: [
      { available: false, blockingReason: 'CURRENT_ATTENDANCE_STATE', command: 'CLOCK_IN' },
      { available: true, blockingReason: null, command: 'START_BREAK' },
      { available: false, blockingReason: 'CURRENT_ATTENDANCE_STATE', command: 'RESUME' },
      { available: true, blockingReason: null, command: 'CLOCK_OUT' },
    ],
    activeElapsedMinutes: 90,
    activeSince: '2026-08-11T09:15:00Z',
    attendanceRevision: 3,
    state: 'WORKING',
    validActions: ['START_BREAK', 'CLOCK_OUT'],
  },
  calculation: {
    attentionItems: [],
    estimatedFinishAt: '2026-08-11T15:30:00Z',
    estimatedFinishUnavailableReason: null,
    holidayName: null,
    isPeriodPostedOrLocked: false,
    provisional: {
      calculationSources: {
        absenceCreditMinutes: 0,
        absenceExpectedReductionMinutes: 0,
        approvedAdjustmentMinutes: 0,
        breakMinutesToday: 30,
        holidayExpectedReductionMinutes: 0,
        scheduledMinutes: 480,
        workedMinutesToday: 195,
      },
      creditedMinutesToday: 195,
      expectedMinutesToday: 480,
      provisionalDifferenceMinutes: -285,
    },
    remainingExpectedMinutes: 285,
    status: 'PROVISIONAL',
  },
  localDate: '2026-08-11',
  postedFlexBalanceMinutes: 380,
  postedThroughDate: '2026-08-10',
  snapshotCapturedAt: '2026-08-11T10:45:30Z',
  timeZone: 'Europe/Berlin',
  timeline: [
    {
      id: '123e4567-e89b-42d3-a456-426614174301',
      occurredAt: '2026-08-11T07:00:00Z',
      type: 'CLOCK_IN',
    },
    {
      id: '123e4567-e89b-42d3-a456-426614174302',
      occurredAt: '2026-08-11T08:45:00Z',
      type: 'BREAK_START',
    },
    {
      id: '123e4567-e89b-42d3-a456-426614174303',
      occurredAt: '2026-08-11T09:15:00Z',
      type: 'BREAK_END',
    },
  ],
  timelineTruncated: false,
};
