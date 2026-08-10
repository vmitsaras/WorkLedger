import { Temporal } from '@js-temporal/polyfill';

import { type AttendanceState, type PunchEventType } from './attendance-transition.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant } from './shared/temporal.js';

export type PunchEvent = Readonly<{
  eventSequence: number;
  occurredAt: Instant;
  type: PunchEventType;
}>;

export type AttendanceInterval = Readonly<{
  endedAt: Instant;
  endEvent: PunchEvent;
  startedAt: Instant;
  startEvent: PunchEvent;
}>;

export type OpenAttendanceInterval = Readonly<{
  startedAt: Instant;
  startEvent: PunchEvent;
  type: 'WORK' | 'BREAK';
}>;

export type WorkSession = Readonly<{
  breakIntervals: readonly AttendanceInterval[];
  clockInEvent: PunchEvent;
  clockOutEvent: PunchEvent | null;
  openInterval: OpenAttendanceInterval | null;
  workIntervals: readonly AttendanceInterval[];
}>;

export type AttendanceReconstruction = Readonly<{
  currentState: AttendanceState;
  orderedEvents: readonly PunchEvent[];
  sessions: readonly WorkSession[];
}>;

export type AttendanceReconstructionError =
  DomainError<'ATTENDANCE_INVALID_EVENT_ORDER'> | DomainError<'ATTENDANCE_INVALID_EVENT_PRECISION'>;

type WorkSessionBuilder = {
  breakIntervals: AttendanceInterval[];
  clockInEvent: PunchEvent;
  clockOutEvent: PunchEvent | null;
  openInterval: OpenAttendanceInterval;
  workIntervals: AttendanceInterval[];
};

const ATTENDANCE_INVALID_EVENT_ORDER = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_ORDER',
} as const);
const ATTENDANCE_INVALID_EVENT_PRECISION = Object.freeze({
  code: 'ATTENDANCE_INVALID_EVENT_PRECISION',
} as const);

/**
 * Rebuilds attendance sessions from immutable source events. Event sequence is the sole ordering
 * key; source-array and timestamp order never act as a tie-breaker.
 */
export function reconstructAttendance(
  events: readonly PunchEvent[],
): Result<AttendanceReconstruction, AttendanceReconstructionError> {
  const orderedEvents = [...events].sort(compareEventSequence);
  const validation = validateEventOrderingAndPrecision(orderedEvents);
  if (!validation.ok) {
    return validation;
  }

  const sessions: WorkSessionBuilder[] = [];
  let currentSession: WorkSessionBuilder | null = null;
  let currentState: AttendanceState = 'OFF_WORK';

  for (const event of orderedEvents) {
    switch (currentState) {
      case 'OFF_WORK': {
        if (event.type !== 'CLOCK_IN') {
          return failure(ATTENDANCE_INVALID_EVENT_ORDER);
        }

        currentSession = {
          breakIntervals: [],
          clockInEvent: event,
          clockOutEvent: null,
          openInterval: createOpenInterval('WORK', event),
          workIntervals: [],
        };
        sessions.push(currentSession);
        currentState = 'WORKING';
        break;
      }

      case 'WORKING': {
        if (currentSession === null || currentSession.openInterval.type !== 'WORK') {
          return failure(ATTENDANCE_INVALID_EVENT_ORDER);
        }

        if (event.type === 'BREAK_START') {
          currentSession.workIntervals.push(createInterval(currentSession.openInterval, event));
          currentSession.openInterval = createOpenInterval('BREAK', event);
          currentState = 'ON_BREAK';
          break;
        }

        if (event.type === 'CLOCK_OUT') {
          currentSession.workIntervals.push(createInterval(currentSession.openInterval, event));
          currentSession.clockOutEvent = event;
          currentSession = null;
          currentState = 'OFF_WORK';
          break;
        }

        return failure(ATTENDANCE_INVALID_EVENT_ORDER);
      }

      case 'ON_BREAK': {
        if (currentSession === null || currentSession.openInterval.type !== 'BREAK') {
          return failure(ATTENDANCE_INVALID_EVENT_ORDER);
        }

        if (event.type !== 'BREAK_END') {
          return failure(ATTENDANCE_INVALID_EVENT_ORDER);
        }

        currentSession.breakIntervals.push(createInterval(currentSession.openInterval, event));
        currentSession.openInterval = createOpenInterval('WORK', event);
        currentState = 'WORKING';
        break;
      }
    }
  }

  return success(
    Object.freeze({
      currentState,
      orderedEvents: Object.freeze(orderedEvents),
      sessions: Object.freeze(sessions.map(freezeWorkSession)),
    }),
  );
}

function compareEventSequence(left: PunchEvent, right: PunchEvent): number {
  if (left.eventSequence < right.eventSequence) return -1;
  if (left.eventSequence > right.eventSequence) return 1;
  return 0;
}

function validateEventOrderingAndPrecision(
  events: readonly PunchEvent[],
): Result<void, AttendanceReconstructionError> {
  let previousEvent: PunchEvent | null = null;
  let previousInstant: Temporal.Instant | null = null;

  for (const event of events) {
    if (!isValidEventSequence(event.eventSequence)) {
      return failure(ATTENDANCE_INVALID_EVENT_ORDER);
    }

    const occurredAt = parseMinuteAlignedInstant(event.occurredAt);
    if (occurredAt === null) {
      return failure(ATTENDANCE_INVALID_EVENT_PRECISION);
    }

    if (
      previousEvent !== null &&
      (event.eventSequence <= previousEvent.eventSequence ||
        (previousInstant !== null && Temporal.Instant.compare(occurredAt, previousInstant) < 0))
    ) {
      return failure(ATTENDANCE_INVALID_EVENT_ORDER);
    }

    previousEvent = event;
    previousInstant = occurredAt;
  }

  return success(undefined);
}

function isValidEventSequence(eventSequence: number): boolean {
  return Number.isSafeInteger(eventSequence) && eventSequence > 0;
}

function parseMinuteAlignedInstant(occurredAt: Instant): Temporal.Instant | null {
  try {
    const instant = Temporal.Instant.from(occurredAt);
    return instant.epochNanoseconds % 60_000_000_000n === 0n ? instant : null;
  } catch {
    return null;
  }
}

function createInterval(
  openInterval: OpenAttendanceInterval,
  endEvent: PunchEvent,
): AttendanceInterval {
  return Object.freeze({
    endedAt: endEvent.occurredAt,
    endEvent,
    startedAt: openInterval.startedAt,
    startEvent: openInterval.startEvent,
  });
}

function createOpenInterval(
  type: OpenAttendanceInterval['type'],
  startEvent: PunchEvent,
): OpenAttendanceInterval {
  return Object.freeze({
    startedAt: startEvent.occurredAt,
    startEvent,
    type,
  });
}

function freezeWorkSession(session: WorkSessionBuilder): WorkSession {
  return Object.freeze({
    breakIntervals: Object.freeze(session.breakIntervals),
    clockInEvent: session.clockInEvent,
    clockOutEvent: session.clockOutEvent,
    openInterval: session.clockOutEvent === null ? session.openInterval : null,
    workIntervals: Object.freeze(session.workIntervals),
  });
}
