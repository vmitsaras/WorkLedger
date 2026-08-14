import type { DomainId, LocalDate } from '@workledger/domain';
import type { WorkLedgerTransaction } from '@workledger/database';

import { WorkLedgerApiError } from '../http/errors.js';

/** Rejects ordinary source mutations after submission while preserving the post-lock boundary. */
export async function assertMonthlyPeriodAllowsOrdinaryMutation(
  transaction: WorkLedgerTransaction,
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
  startDate: LocalDate,
  endDate: LocalDate,
): Promise<void> {
  const status = await transaction.monthlyPeriods.findProtectionForRange(
    organizationId,
    employeeId,
    startDate,
    endDate,
  );
  if (status === 'LOCKED') {
    throw new WorkLedgerApiError({ code: 'PERIOD_ADJUSTMENT_REQUIRED', statusCode: 409 });
  }
  if (status === 'SUBMITTED' || status === 'APPROVED') {
    throw new WorkLedgerApiError({ code: 'PERIOD_REOPEN_REQUIRED', statusCode: 409 });
  }
}
