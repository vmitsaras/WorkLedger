import {
  attendanceCommands,
  attendanceStates,
  punchEventTypes,
  validAttendanceActions,
  validateAttendanceTransition,
  type AttendanceCommandInput,
  type AttendanceState,
  type AttendanceTransitionError,
  type DomainError,
  type PunchEventType,
  type Result,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function expectFailureCode<T, E extends DomainError>(result: Result<T, E>, code: E['code']): void {
  expect(result).toEqual({ error: { code }, ok: false });
}

test.each([
  {
    eventTypes: ['CLOCK_IN'],
    input: { command: 'CLOCK_IN' },
    nextState: 'WORKING',
    previousState: 'OFF_WORK',
  },
  {
    eventTypes: ['BREAK_START'],
    input: { command: 'START_BREAK' },
    nextState: 'ON_BREAK',
    previousState: 'WORKING',
  },
  {
    eventTypes: ['CLOCK_OUT'],
    input: { command: 'CLOCK_OUT' },
    nextState: 'OFF_WORK',
    previousState: 'WORKING',
  },
  {
    eventTypes: ['BREAK_END'],
    input: { command: 'RESUME' },
    nextState: 'WORKING',
    previousState: 'ON_BREAK',
  },
  {
    eventTypes: ['BREAK_END', 'CLOCK_OUT'],
    input: { command: 'CLOCK_OUT', confirmActiveBreak: true },
    nextState: 'OFF_WORK',
    previousState: 'ON_BREAK',
  },
] as const satisfies readonly {
  eventTypes: readonly PunchEventType[];
  input: AttendanceCommandInput;
  nextState: AttendanceState;
  previousState: AttendanceState;
}[])(
  'returns the prescribed events and next state for $previousState $input.command',
  (fixture) => {
    const transition = expectSuccess(
      validateAttendanceTransition(fixture.previousState, fixture.input),
    );

    expect(transition).toEqual({
      eventTypes: fixture.eventTypes,
      nextState: fixture.nextState,
      previousState: fixture.previousState,
    });
    expect(Object.isFrozen(transition)).toBe(true);
    expect(Object.isFrozen(transition.eventTypes)).toBe(true);
  },
);

test.each([
  ['OFF_WORK', { command: 'START_BREAK' }, 'ATTENDANCE_NOT_WORKING'],
  ['OFF_WORK', { command: 'RESUME' }, 'ATTENDANCE_NOT_ON_BREAK'],
  ['OFF_WORK', { command: 'CLOCK_OUT' }, 'ATTENDANCE_ALREADY_OFF_WORK'],
  ['WORKING', { command: 'CLOCK_IN' }, 'ATTENDANCE_ALREADY_WORKING'],
  ['WORKING', { command: 'RESUME' }, 'ATTENDANCE_NOT_ON_BREAK'],
  ['ON_BREAK', { command: 'CLOCK_IN' }, 'ATTENDANCE_ALREADY_WORKING'],
  ['ON_BREAK', { command: 'START_BREAK' }, 'ATTENDANCE_ALREADY_ON_BREAK'],
] as const satisfies readonly [
  AttendanceState,
  AttendanceCommandInput,
  AttendanceTransitionError['code'],
][])('returns %s', (state, input, code) => {
  expectFailureCode(validateAttendanceTransition(state, input), code);
});

test('requires explicit confirmation before clocking out from an active break', () => {
  expectFailureCode(
    validateAttendanceTransition('ON_BREAK', { command: 'CLOCK_OUT' }),
    'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED',
  );
  expectFailureCode(
    validateAttendanceTransition('ON_BREAK', { command: 'CLOCK_OUT', confirmActiveBreak: false }),
    'ATTENDANCE_BREAK_CONFIRMATION_REQUIRED',
  );
});

test('returns the complete stable action set for each attendance state', () => {
  expect(Object.isFrozen(attendanceStates)).toBe(true);
  expect(Object.isFrozen(attendanceCommands)).toBe(true);
  expect(Object.isFrozen(punchEventTypes)).toBe(true);
  expect(validAttendanceActions('OFF_WORK')).toEqual(['CLOCK_IN']);
  expect(validAttendanceActions('WORKING')).toEqual(['START_BREAK', 'CLOCK_OUT']);
  expect(validAttendanceActions('ON_BREAK')).toEqual(['RESUME', 'CLOCK_OUT']);
  expect(Object.isFrozen(validAttendanceActions('WORKING'))).toBe(true);
});
