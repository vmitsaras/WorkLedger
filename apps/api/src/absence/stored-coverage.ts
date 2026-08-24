import { calculateAbsenceRequest } from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  ApprovalAbsenceRecord,
  ApprovalCancellationRecord,
  WorkLedgerTransaction,
} from '@workledger/database';

import { WorkLedgerApiError } from '../http/errors.js';

export async function calculateStoredCoverage(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  record: ApprovalAbsenceRecord | ApprovalCancellationRecord,
) {
  const startDate = record.coverage[0]?.localDate;
  const endDate = record.coverage.at(-1)?.localDate;
  if (startDate === undefined || endDate === undefined) throw internalError();
  const configuration = await transaction.absenceRequests.loadConfiguration({
    absenceCode: record.absenceCode,
    employeeId: record.employeeId,
    endDate,
    organizationId: context.organization.id,
    startDate,
  });
  const coverage = record.coverage.map((segment) => {
    const input =
      segment.kind === 'FULL_DAY'
        ? ({ endDate: segment.localDate, kind: 'FULL_DAY', startDate: segment.localDate } as const)
        : segment.kind === 'MINUTE_INTERVAL'
          ? ({
              endsAtMinute: segment.endsAtMinute ?? -1,
              kind: 'MINUTE_INTERVAL',
              localDate: segment.localDate,
              startsAtMinute: segment.startsAtMinute ?? -1,
            } as const)
          : ({ kind: segment.kind, localDate: segment.localDate } as const);
    const calculated = calculateAbsenceRequest({
      coverage: input,
      holidayDates: configuration.holidayDates,
      scheduleAssignments: configuration.scheduleAssignments,
    });
    if (!calculated.ok)
      throw new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 });
    const value = calculated.value.coverage[0];
    if (value === undefined) throw internalError();
    return Object.freeze({
      endsAtMinute: segment.endsAtMinute,
      id: segment.id,
      kind: segment.kind,
      localDate: segment.localDate,
      minutes: value.entitlementMinutes,
      startsAtMinute: segment.startsAtMinute,
    });
  });
  return Object.freeze({
    coverage,
    endDate,
    startDate,
    totalMinutes: coverage.reduce((total, item) => total + item.minutes, 0),
  });
}

export function toContractCoverage(
  coverage: Awaited<ReturnType<typeof calculateStoredCoverage>>['coverage'],
) {
  return coverage.map((segment) => ({
    endsAtMinute: segment.endsAtMinute,
    kind: segment.kind,
    localDate: segment.localDate,
    minutes: segment.minutes,
    startsAtMinute: segment.startsAtMinute,
  }));
}

function internalError() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
