import {
  findEffectiveAssignmentGaps,
  parseLocalDate,
  planEffectiveAssignmentTransition,
  validateManagerAssignmentGraph,
  type EffectiveAssignmentRecord,
  type LocalDate,
} from '../src/index.js';

function date(value: string): LocalDate {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw new Error(`Invalid test date: ${value}`);
  return parsed.value;
}

function assignment(
  id: string,
  subjectId: string,
  targetId: string,
  startsOn: string,
  endsOn: string | null = null,
): EffectiveAssignmentRecord {
  return Object.freeze({
    endsOn: endsOn === null ? null : date(endsOn),
    id,
    startsOn: date(startsOn),
    subjectId,
    targetId,
  });
}

test('plans an adjacent effective assignment without rewriting prior history', () => {
  const result = planEffectiveAssignmentTransition(
    [assignment('old', 'employee', 'team-a', '2026-01-01')],
    'employee',
    date('2026-08-14'),
    date('2026-09-01'),
    'team-b',
  );

  expect(result).toEqual({
    ok: true,
    value: {
      closeAssignmentId: 'old',
      effectiveFrom: '2026-09-01',
      insert: { endsOn: null, targetId: 'team-b' },
    },
  });
});

test('preserves an already scheduled later assignment as the next boundary', () => {
  const result = planEffectiveAssignmentTransition(
    [
      assignment('current', 'employee', 'team-a', '2026-01-01', '2026-10-01'),
      assignment('future', 'employee', 'team-c', '2026-10-01'),
    ],
    'employee',
    date('2026-08-14'),
    date('2026-09-01'),
    'team-b',
  );

  expect(result).toEqual({
    ok: true,
    value: {
      closeAssignmentId: 'current',
      effectiveFrom: '2026-09-01',
      insert: { endsOn: '2026-10-01', targetId: 'team-b' },
    },
  });
});

test.each([
  ['past dates', '2026-08-13', 'team-b', 'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST'],
  ['same target', '2026-08-14', 'team-a', 'EFFECTIVE_ASSIGNMENT_NO_CHANGE'],
] as const)('rejects %s with a stable result', (_label, effectiveFrom, targetId, code) => {
  const result = planEffectiveAssignmentTransition(
    [assignment('current', 'employee', 'team-a', '2026-01-01')],
    'employee',
    date('2026-08-14'),
    date(effectiveFrom),
    targetId,
  );

  expect(result).toEqual({ error: { code }, ok: false });
});

test('rejects replacement of an assignment that begins on the same date', () => {
  const result = planEffectiveAssignmentTransition(
    [assignment('current', 'employee', 'team-a', '2026-08-14')],
    'employee',
    date('2026-08-14'),
    date('2026-08-14'),
    'team-b',
  );

  expect(result).toEqual({
    error: { code: 'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT' },
    ok: false,
  });
});

test('detects direct, indirect, and future manager cycles', () => {
  expect(
    validateManagerAssignmentGraph([
      assignment('a-b', 'a', 'b', '2026-01-01'),
      assignment('b-c', 'b', 'c', '2026-01-01'),
      assignment('c-a', 'c', 'a', '2026-10-01'),
    ]),
  ).toEqual({ error: { code: 'MANAGER_ASSIGNMENT_CYCLE' }, ok: false });
});

test('accepts changing acyclic manager graphs across effective boundaries', () => {
  expect(
    validateManagerAssignmentGraph([
      assignment('a-b', 'a', 'b', '2026-01-01', '2026-10-01'),
      assignment('a-c', 'a', 'c', '2026-10-01'),
      assignment('b-c', 'b', 'c', '2026-01-01'),
    ]),
  ).toEqual({ ok: true, value: true });
});

test('finds only current and future assignment gaps inside employment coverage', () => {
  expect(
    findEffectiveAssignmentGaps(
      [
        assignment('current', 'employee', 'schedule-a', '2026-01-01', '2026-09-01'),
        assignment('future', 'employee', 'schedule-b', '2026-10-01'),
      ],
      'employee',
      [{ endsOn: null, startsOn: date('2026-01-01') }],
      date('2026-08-14'),
    ),
  ).toEqual({
    ok: true,
    value: [{ endsOn: '2026-10-01', startsOn: '2026-09-01' }],
  });
});

test('does not treat time between employment periods as an assignment gap', () => {
  expect(
    findEffectiveAssignmentGaps(
      [
        assignment('first', 'employee', 'schedule-a', '2026-01-01', '2026-03-01'),
        assignment('second', 'employee', 'schedule-b', '2026-06-01'),
      ],
      'employee',
      [
        { endsOn: date('2026-03-01'), startsOn: date('2026-01-01') },
        { endsOn: null, startsOn: date('2026-06-01') },
      ],
      date('2026-01-01'),
    ),
  ).toEqual({ ok: true, value: [] });
});
