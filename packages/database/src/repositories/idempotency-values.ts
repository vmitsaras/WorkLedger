import type { AttendanceCommand, AttendanceState, PunchEventType } from '@workledger/domain';

import { mapDomainId, mapInstant } from '../mapping/domain-values.js';
import type {
  AttendanceIdempotencyErrorSnapshot,
  AttendanceIdempotencyOutcome,
  AttendanceIdempotencySuccessSnapshot,
} from './contracts.js';

const attendanceCommands = new Set<AttendanceCommand>([
  'CLOCK_IN',
  'START_BREAK',
  'RESUME',
  'CLOCK_OUT',
]);
const attendanceStates = new Set<AttendanceState>(['OFF_WORK', 'WORKING', 'ON_BREAK']);
const punchEventTypes = new Set<PunchEventType>([
  'CLOCK_IN',
  'BREAK_START',
  'BREAK_END',
  'CLOCK_OUT',
]);

export class IdempotencyValueError extends Error {
  readonly code = 'IDEMPOTENCY_VALUE_INVALID';

  constructor(readonly field: string) {
    super(`Invalid attendance idempotency field: ${field}.`);
    this.name = 'IdempotencyValueError';
  }
}

export function validateIdempotencyKey(value: string): void {
  if (!/^[A-Za-z0-9._~-]{16,128}$/.test(value)) throw new IdempotencyValueError('idempotencyKey');
}

export function validateRequestFingerprint(value: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new IdempotencyValueError('requestFingerprint');
}

export function validateOriginalHttpStatus(value: number): void {
  if (!Number.isSafeInteger(value) || value < 200 || value > 599) {
    throw new IdempotencyValueError('originalHttpStatus');
  }
}

export function parseAttendanceIdempotencyOutcome(value: unknown): AttendanceIdempotencyOutcome {
  const root = record(value, 'outcome');
  if (root['kind'] === 'SUCCESS') {
    return Object.freeze({ kind: 'SUCCESS', data: parseSuccess(root['data']) });
  }
  if (root['kind'] === 'ERROR') {
    return Object.freeze({ kind: 'ERROR', error: parseError(root['error']) });
  }
  throw new IdempotencyValueError('outcome.kind');
}

function parseSuccess(value: unknown): AttendanceIdempotencySuccessSnapshot {
  const data = record(value, 'outcome.data');
  exactKeys(
    data,
    [
      'attendanceRevision',
      'command',
      'createdEvents',
      'occurredAt',
      'resultingState',
      'validActions',
    ],
    'outcome.data',
  );
  if (!nonNegativeInteger(data['attendanceRevision'])) {
    throw new IdempotencyValueError('outcome.data.attendanceRevision');
  }
  const createdEvents = array(data['createdEvents'], 'outcome.data.createdEvents');
  if (createdEvents.length < 1 || createdEvents.length > 2) {
    throw new IdempotencyValueError('outcome.data.createdEvents');
  }
  return Object.freeze({
    attendanceRevision: data['attendanceRevision'],
    command: command(data['command'], 'outcome.data.command'),
    createdEvents: Object.freeze(
      createdEvents.map((value, index) => {
        const event = record(value, `outcome.data.createdEvents.${index}`);
        exactKeys(event, ['id', 'type'], `outcome.data.createdEvents.${index}`);
        return Object.freeze({
          id: mapDomainId<'PunchEvent'>(
            event['id'],
            'idempotency_records',
            `outcome.data.createdEvents.${index}.id`,
          ),
          type: punchEventType(event['type'], `outcome.data.createdEvents.${index}.type`),
        });
      }),
    ),
    occurredAt: mapInstant(data['occurredAt'], 'idempotency_records', 'outcome.data.occurredAt'),
    resultingState: state(data['resultingState'], 'outcome.data.resultingState'),
    validActions: commands(data['validActions'], 'outcome.data.validActions'),
  });
}

function parseError(value: unknown): AttendanceIdempotencyErrorSnapshot {
  const error = record(value, 'outcome.error');
  const allowed = new Set([
    'attendanceRevision',
    'code',
    'currentState',
    'requiresBreakConfirmation',
    'validActions',
  ]);
  if (Object.keys(error).some((key) => !allowed.has(key))) {
    throw new IdempotencyValueError('outcome.error');
  }
  if (typeof error['code'] !== 'string' || !/^[A-Z][A-Z0-9_]{1,127}$/.test(error['code'])) {
    throw new IdempotencyValueError('outcome.error.code');
  }
  if (
    error['attendanceRevision'] !== undefined &&
    !nonNegativeInteger(error['attendanceRevision'])
  ) {
    throw new IdempotencyValueError('outcome.error.attendanceRevision');
  }
  if (
    error['requiresBreakConfirmation'] !== undefined &&
    typeof error['requiresBreakConfirmation'] !== 'boolean'
  ) {
    throw new IdempotencyValueError('outcome.error.requiresBreakConfirmation');
  }
  return Object.freeze({
    ...(error['attendanceRevision'] === undefined
      ? {}
      : { attendanceRevision: error['attendanceRevision'] }),
    code: error['code'],
    ...(error['currentState'] === undefined
      ? {}
      : { currentState: state(error['currentState'], 'outcome.error.currentState') }),
    ...(error['requiresBreakConfirmation'] === undefined
      ? {}
      : { requiresBreakConfirmation: error['requiresBreakConfirmation'] }),
    ...(error['validActions'] === undefined
      ? {}
      : { validActions: commands(error['validActions'], 'outcome.error.validActions') }),
  });
}

function commands(value: unknown, field: string): readonly AttendanceCommand[] {
  const values = array(value, field);
  if (values.length > attendanceCommands.size) throw new IdempotencyValueError(field);
  const parsed = values.map((item, index) => command(item, `${field}.${index}`));
  if (new Set(parsed).size !== parsed.length) throw new IdempotencyValueError(field);
  return Object.freeze(parsed);
}

function command(value: unknown, field: string): AttendanceCommand {
  if (typeof value !== 'string' || !attendanceCommands.has(value as AttendanceCommand)) {
    throw new IdempotencyValueError(field);
  }
  return value as AttendanceCommand;
}

function state(value: unknown, field: string): AttendanceState {
  if (typeof value !== 'string' || !attendanceStates.has(value as AttendanceState)) {
    throw new IdempotencyValueError(field);
  }
  return value as AttendanceState;
}

function punchEventType(value: unknown, field: string): PunchEventType {
  if (typeof value !== 'string' || !punchEventTypes.has(value as PunchEventType)) {
    throw new IdempotencyValueError(field);
  }
  return value as PunchEventType;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new IdempotencyValueError(field);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new IdempotencyValueError(field);
  return value;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], field: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new IdempotencyValueError(field);
  }
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}
