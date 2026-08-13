import {
  type AbsenceRequestCoverage,
  type AbsenceRequestCoverageInput,
  parseLocalDate,
  type AbsenceTypeVersion,
  type LocalDate,
} from '@workledger/domain';
import type { AbsenceCoverageInput } from '@workledger/contracts';
import type { AbsenceCoverageSegmentInput } from '@workledger/database';

import { WorkLedgerApiError } from '../http/errors.js';

export function parseRequestCoverage(input: AbsenceCoverageInput): AbsenceRequestCoverageInput {
  if (input.kind === 'FULL_DAY') {
    return Object.freeze({
      endDate: requireLocalDate(input.endDate),
      kind: input.kind,
      startDate: requireLocalDate(input.startDate),
    });
  }
  if (input.kind === 'MINUTE_INTERVAL') {
    return Object.freeze({
      endsAtMinute: input.endsAtMinute,
      kind: input.kind,
      localDate: requireLocalDate(input.localDate),
      startsAtMinute: input.startsAtMinute,
    });
  }
  return Object.freeze({ kind: input.kind, localDate: requireLocalDate(input.localDate) });
}

export function coverageDateRange(coverage: AbsenceRequestCoverageInput): Readonly<{
  endDate: LocalDate;
  startDate: LocalDate;
}> {
  return coverage.kind === 'FULL_DAY'
    ? Object.freeze({ endDate: coverage.endDate, startDate: coverage.startDate })
    : Object.freeze({ endDate: coverage.localDate, startDate: coverage.localDate });
}

export function assertCoverageAllowed(
  absenceType: AbsenceTypeVersion,
  coverage: AbsenceRequestCoverageInput,
): void {
  const unit =
    coverage.kind === 'FULL_DAY'
      ? 'FULL_DAY'
      : coverage.kind === 'MINUTE_INTERVAL'
        ? 'MINUTES'
        : 'HALF_DAY';
  if (!absenceType.policy.allowedCoverageUnits.includes(unit)) {
    throw new WorkLedgerApiError({ code: 'ABSENCE_COVERAGE_INVALID', statusCode: 422 });
  }
}

export function asCoverageSegmentInput(
  coverage: AbsenceRequestCoverage,
): AbsenceCoverageSegmentInput {
  return Object.freeze({
    endsAtMinute: coverage.kind === 'MINUTE_INTERVAL' ? (coverage.endsAtMinute ?? null) : null,
    kind: coverage.kind,
    localDate: coverage.localDate,
    startsAtMinute: coverage.kind === 'MINUTE_INTERVAL' ? (coverage.startsAtMinute ?? null) : null,
  });
}

export function responseCoverage(coverage: AbsenceRequestCoverage) {
  return Object.freeze({
    endsAtMinute: coverage.kind === 'MINUTE_INTERVAL' ? (coverage.endsAtMinute ?? null) : null,
    entitlementMinutes: coverage.entitlementMinutes,
    holiday: coverage.holiday,
    kind: coverage.kind,
    localDate: coverage.localDate,
    scheduledMinutes: coverage.scheduledMinutes,
    startsAtMinute: coverage.kind === 'MINUTE_INTERVAL' ? (coverage.startsAtMinute ?? null) : null,
  });
}

function requireLocalDate(value: string): LocalDate {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.value;
}
