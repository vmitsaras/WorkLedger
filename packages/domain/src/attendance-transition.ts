import { failure, success, type DomainError, type Result } from './shared/result.js';

export const attendanceStates = Object.freeze(['OFF_WORK', 'WORKING', 'ON_BREAK'] as const);

export type AttendanceState = (typeof attendanceStates)[number];

export const attendanceCommands = Object.freeze([
  'CLOCK_IN',
  'START_BREAK',
  'RESUME',
  'CLOCK_OUT',
] as const);

export type AttendanceCommand = (typeof attendanceCommands)[number];

export const punchEventTypes = Object.freeze([
  'CLOCK_IN',
  'BREAK_START',
  'BREAK_END',
  'CLOCK_OUT',
] as const);

export type PunchEventType = (typeof punchEventTypes)[number];

export type SimpleAttendanceCommandInput = Readonly<{
  command: Exclude<AttendanceCommand, 'CLOCK_OUT'>;
}>;

export type ClockOutAttendanceCommandInput = Readonly<{
  command: 'CLOCK_OUT';
  confirmActiveBreak?: boolean;
}>;

export type AttendanceCommandInput = SimpleAttendanceCommandInput | ClockOutAttendanceCommandInput;

export type AttendanceTransition = Readonly<{
  eventTypes: readonly PunchEventType[];
  nextState: AttendanceState;
  previousState: AttendanceState;
}>;

export type AttendanceTransitionError =
  | DomainError<'ATTENDANCE_ALREADY_OFF_WORK'>
  | DomainError<'ATTENDANCE_ALREADY_ON_BREAK'>
  | DomainError<'ATTENDANCE_ALREADY_WORKING'>
  | DomainError<'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED'>
  | DomainError<'ATTENDANCE_NOT_ON_BREAK'>
  | DomainError<'ATTENDANCE_NOT_WORKING'>;

type AcceptedTransitionDefinition = Readonly<{
  eventTypes: readonly PunchEventType[];
  nextState: AttendanceState;
  requiresBreakConfirmation?: true;
}>;

type RejectedTransitionDefinition = Readonly<{
  error: AttendanceTransitionError;
}>;

type TransitionDefinition = AcceptedTransitionDefinition | RejectedTransitionDefinition;

const ATTENDANCE_ALREADY_OFF_WORK = Object.freeze({
  code: 'ATTENDANCE_ALREADY_OFF_WORK',
} as const);
const ATTENDANCE_ALREADY_ON_BREAK = Object.freeze({
  code: 'ATTENDANCE_ALREADY_ON_BREAK',
} as const);
const ATTENDANCE_ALREADY_WORKING = Object.freeze({ code: 'ATTENDANCE_ALREADY_WORKING' } as const);
const ATTENDANCE_BREAK_CONFIRMATION_REQUIRED = Object.freeze({
  code: 'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED',
} as const);
const ATTENDANCE_NOT_ON_BREAK = Object.freeze({ code: 'ATTENDANCE_NOT_ON_BREAK' } as const);
const ATTENDANCE_NOT_WORKING = Object.freeze({ code: 'ATTENDANCE_NOT_WORKING' } as const);

const clockInEvent = Object.freeze(['CLOCK_IN'] as PunchEventType[]);
const breakStartEvent = Object.freeze(['BREAK_START'] as PunchEventType[]);
const breakEndEvent = Object.freeze(['BREAK_END'] as PunchEventType[]);
const clockOutEvent = Object.freeze(['CLOCK_OUT'] as PunchEventType[]);
const confirmedBreakClockOutEvents = Object.freeze(['BREAK_END', 'CLOCK_OUT'] as PunchEventType[]);

const attendanceTransitionTable: Readonly<
  Record<AttendanceState, Readonly<Record<AttendanceCommand, TransitionDefinition>>>
> = Object.freeze({
  OFF_WORK: Object.freeze({
    CLOCK_IN: Object.freeze({ eventTypes: clockInEvent, nextState: 'WORKING' }),
    CLOCK_OUT: Object.freeze({ error: ATTENDANCE_ALREADY_OFF_WORK }),
    RESUME: Object.freeze({ error: ATTENDANCE_NOT_ON_BREAK }),
    START_BREAK: Object.freeze({ error: ATTENDANCE_NOT_WORKING }),
  }),
  ON_BREAK: Object.freeze({
    CLOCK_IN: Object.freeze({ error: ATTENDANCE_ALREADY_WORKING }),
    CLOCK_OUT: Object.freeze({
      eventTypes: confirmedBreakClockOutEvents,
      nextState: 'OFF_WORK',
      requiresBreakConfirmation: true,
    }),
    RESUME: Object.freeze({ eventTypes: breakEndEvent, nextState: 'WORKING' }),
    START_BREAK: Object.freeze({ error: ATTENDANCE_ALREADY_ON_BREAK }),
  }),
  WORKING: Object.freeze({
    CLOCK_IN: Object.freeze({ error: ATTENDANCE_ALREADY_WORKING }),
    CLOCK_OUT: Object.freeze({ eventTypes: clockOutEvent, nextState: 'OFF_WORK' }),
    RESUME: Object.freeze({ error: ATTENDANCE_NOT_ON_BREAK }),
    START_BREAK: Object.freeze({ eventTypes: breakStartEvent, nextState: 'ON_BREAK' }),
  }),
});

const validActionsByState: Readonly<Record<AttendanceState, readonly AttendanceCommand[]>> =
  Object.freeze({
    OFF_WORK: Object.freeze(['CLOCK_IN'] as AttendanceCommand[]),
    ON_BREAK: Object.freeze(['RESUME', 'CLOCK_OUT'] as AttendanceCommand[]),
    WORKING: Object.freeze(['START_BREAK', 'CLOCK_OUT'] as AttendanceCommand[]),
  });

/**
 * Returns the ordinary attendance commands available from a server-derived state.
 * `CLOCK_OUT` in `ON_BREAK` still requires explicit confirmation when validated.
 */
export function validAttendanceActions(state: AttendanceState): readonly AttendanceCommand[] {
  return validActionsByState[state];
}

/**
 * Validates one ordinary attendance command without observing time or mutating persistence.
 * A successful result lists the immutable punch-event types that a later transaction must append.
 */
export function validateAttendanceTransition(
  previousState: AttendanceState,
  input: AttendanceCommandInput,
): Result<AttendanceTransition, AttendanceTransitionError> {
  const definition = attendanceTransitionTable[previousState][input.command];

  if ('error' in definition) {
    return failure(definition.error);
  }

  if (
    definition.requiresBreakConfirmation === true &&
    (input.command !== 'CLOCK_OUT' || input.confirmActiveBreak !== true)
  ) {
    return failure(ATTENDANCE_BREAK_CONFIRMATION_REQUIRED);
  }

  return success(
    Object.freeze({
      eventTypes: definition.eventTypes,
      nextState: definition.nextState,
      previousState,
    }),
  );
}
