import { failure, success, type DomainError, type Result } from './shared/result.js';
import type { LocalDate } from './shared/temporal.js';

export type EffectiveAssignmentRecord = Readonly<{
  endsOn: LocalDate | null;
  id: string;
  startsOn: LocalDate;
  subjectId: string;
  targetId: string;
}>;

export type EffectiveAssignmentTransition = Readonly<{
  closeAssignmentId: string | null;
  effectiveFrom: LocalDate;
  insert: Readonly<{ endsOn: LocalDate | null; targetId: string }> | null;
}>;

export type EffectiveCoverageRange = Readonly<{
  endsOn: LocalDate | null;
  startsOn: LocalDate;
}>;

export type EffectiveAssignmentGap = EffectiveCoverageRange;

export type EffectiveAssignmentDateInPastError = DomainError<'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST'>;
export type EffectiveAssignmentHistoryInvalidError =
  DomainError<'EFFECTIVE_ASSIGNMENT_HISTORY_INVALID'>;
export type EffectiveAssignmentNoChangeError = DomainError<'EFFECTIVE_ASSIGNMENT_NO_CHANGE'>;
export type EffectiveAssignmentSameDateConflictError =
  DomainError<'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT'>;
export type ManagerAssignmentCycleError = DomainError<'MANAGER_ASSIGNMENT_CYCLE'>;

export type EffectiveAssignmentTransitionError =
  | EffectiveAssignmentDateInPastError
  | EffectiveAssignmentHistoryInvalidError
  | EffectiveAssignmentNoChangeError
  | EffectiveAssignmentSameDateConflictError;

export type ManagerAssignmentGraphError =
  EffectiveAssignmentHistoryInvalidError | ManagerAssignmentCycleError;

const DATE_IN_PAST = Object.freeze({ code: 'EFFECTIVE_ASSIGNMENT_DATE_IN_PAST' } as const);
const HISTORY_INVALID = Object.freeze({ code: 'EFFECTIVE_ASSIGNMENT_HISTORY_INVALID' } as const);
const NO_CHANGE = Object.freeze({ code: 'EFFECTIVE_ASSIGNMENT_NO_CHANGE' } as const);
const SAME_DATE_CONFLICT = Object.freeze({
  code: 'EFFECTIVE_ASSIGNMENT_SAME_DATE_CONFLICT',
} as const);
const MANAGER_CYCLE = Object.freeze({ code: 'MANAGER_ASSIGNMENT_CYCLE' } as const);

export function planEffectiveAssignmentTransition(
  history: readonly EffectiveAssignmentRecord[],
  subjectId: string,
  today: LocalDate,
  effectiveFrom: LocalDate,
  nextTargetId: string | null,
): Result<EffectiveAssignmentTransition, EffectiveAssignmentTransitionError> {
  if (effectiveFrom < today) return failure(DATE_IN_PAST);
  if (!validSubjectHistory(history, subjectId)) return failure(HISTORY_INVALID);

  const exact = history.find((assignment) => assignment.startsOn === effectiveFrom);
  if (exact !== undefined) {
    return failure(exact.targetId === nextTargetId ? NO_CHANGE : SAME_DATE_CONFLICT);
  }

  const current = history.find((assignment) => contains(assignment, effectiveFrom));
  if (current?.targetId === nextTargetId || (current === undefined && nextTargetId === null)) {
    return failure(NO_CHANGE);
  }
  const futureStart = history
    .filter((assignment) => assignment.startsOn > effectiveFrom)
    .map((assignment) => assignment.startsOn)
    .sort()[0];

  return success(
    Object.freeze({
      closeAssignmentId: current?.id ?? null,
      effectiveFrom,
      insert:
        nextTargetId === null
          ? null
          : Object.freeze({ endsOn: futureStart ?? null, targetId: nextTargetId }),
    }),
  );
}

export function validateManagerAssignmentGraph(
  assignments: readonly EffectiveAssignmentRecord[],
): Result<true, ManagerAssignmentGraphError> {
  if (assignments.some(({ subjectId, targetId }) => subjectId === targetId)) {
    return failure(MANAGER_CYCLE);
  }
  const subjects = new Set(assignments.map(({ subjectId }) => subjectId));
  if ([...subjects].some((subjectId) => !validSubjectHistory(assignments, subjectId))) {
    return failure(HISTORY_INVALID);
  }
  const boundaries = [...new Set(assignments.map(({ startsOn }) => startsOn))].sort();
  for (const boundary of boundaries) {
    const edges = new Map<string, string>();
    for (const assignment of assignments) {
      if (contains(assignment, boundary)) edges.set(assignment.subjectId, assignment.targetId);
    }
    if (hasCycle(edges)) return failure(MANAGER_CYCLE);
  }
  return success(true);
}

export function findEffectiveAssignmentGaps(
  assignments: readonly EffectiveAssignmentRecord[],
  subjectId: string,
  coverageRanges: readonly EffectiveCoverageRange[],
  from: LocalDate,
): Result<readonly EffectiveAssignmentGap[], EffectiveAssignmentHistoryInvalidError> {
  if (!validSubjectHistory(assignments, subjectId) || !validCoverageRanges(coverageRanges)) {
    return failure(HISTORY_INVALID);
  }
  const history = assignments
    .filter((assignment) => assignment.subjectId === subjectId)
    .slice()
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn));
  const gaps: EffectiveAssignmentGap[] = [];

  for (const coverage of coverageRanges) {
    const coverageStart = coverage.startsOn < from ? from : coverage.startsOn;
    if (coverage.endsOn !== null && coverageStart >= coverage.endsOn) continue;
    let cursor: LocalDate | null = coverageStart;

    for (const assignment of history) {
      if (cursor === null) break;
      if (assignment.endsOn !== null && assignment.endsOn <= cursor) continue;
      if (coverage.endsOn !== null && assignment.startsOn >= coverage.endsOn) break;
      if (assignment.startsOn > cursor) {
        const gapEnd =
          coverage.endsOn === null || assignment.startsOn < coverage.endsOn
            ? assignment.startsOn
            : coverage.endsOn;
        gaps.push(Object.freeze({ endsOn: gapEnd, startsOn: cursor }));
        cursor = gapEnd;
        if (coverage.endsOn !== null && cursor >= coverage.endsOn) break;
      }
      if (assignment.startsOn <= cursor) {
        if (assignment.endsOn === null) {
          cursor = coverage.endsOn;
          break;
        }
        if (assignment.endsOn > cursor) {
          cursor =
            coverage.endsOn === null || assignment.endsOn < coverage.endsOn
              ? assignment.endsOn
              : coverage.endsOn;
        }
      }
    }
    if (cursor !== null && (coverage.endsOn === null || cursor < coverage.endsOn)) {
      gaps.push(Object.freeze({ endsOn: coverage.endsOn, startsOn: cursor }));
    }
  }

  return success(Object.freeze(gaps));
}

function validSubjectHistory(
  assignments: readonly EffectiveAssignmentRecord[],
  subjectId: string,
): boolean {
  const history = assignments
    .filter((assignment) => assignment.subjectId === subjectId)
    .slice()
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn));
  for (let index = 0; index < history.length; index += 1) {
    const assignment = history[index];
    const next = history[index + 1];
    if (
      assignment === undefined ||
      assignment.subjectId !== subjectId ||
      (assignment.endsOn !== null && assignment.startsOn >= assignment.endsOn) ||
      (next !== undefined && (assignment.endsOn === null || assignment.endsOn > next.startsOn))
    ) {
      return false;
    }
  }
  return true;
}

function validCoverageRanges(ranges: readonly EffectiveCoverageRange[]): boolean {
  const sorted = ranges.slice().sort((left, right) => left.startsOn.localeCompare(right.startsOn));
  return sorted.every((range, index) => {
    const next = sorted[index + 1];
    return (
      (range.endsOn === null || range.startsOn < range.endsOn) &&
      (next === undefined || (range.endsOn !== null && range.endsOn <= next.startsOn))
    );
  });
}

function contains(assignment: EffectiveAssignmentRecord, localDate: LocalDate): boolean {
  return (
    assignment.startsOn <= localDate &&
    (assignment.endsOn === null || localDate < assignment.endsOn)
  );
}

function hasCycle(edges: ReadonlyMap<string, string>): boolean {
  for (const start of edges.keys()) {
    const visited = new Set<string>();
    let current: string | undefined = start;
    while (current !== undefined) {
      if (visited.has(current)) return true;
      visited.add(current);
      current = edges.get(current);
    }
  }
  return false;
}
