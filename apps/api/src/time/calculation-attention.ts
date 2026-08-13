import { CALCULATION_WARNING_CODES, type CalculationWarningCode } from '@workledger/contracts';

import { WorkLedgerApiError } from '../http/errors.js';

export function normalizeStoredWarningCodes(
  warningCodes: readonly string[],
): CalculationWarningCode[] {
  for (const warningCode of warningCodes) {
    if (!CALCULATION_WARNING_CODES.some((knownCode) => knownCode === warningCode)) {
      throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
    }
  }
  return CALCULATION_WARNING_CODES.filter((knownCode) => warningCodes.includes(knownCode));
}
