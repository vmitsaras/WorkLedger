import { type DomainId } from './shared/identifiers.js';
import { parseSignedMinutes, type SignedMinutes } from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant, type LocalDate } from './shared/temporal.js';

export const timeAccountEntryTypes = Object.freeze([
  'OPENING_BALANCE',
  'DAILY_DELTA',
  'DAILY_RECALCULATION_DELTA',
  'POST_LOCK_ADJUSTMENT',
  'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
] as const);

export type TimeAccountEntryType = (typeof timeAccountEntryTypes)[number];

export type TimeAccountEntryActor =
  | Readonly<{ accountId: DomainId<'Account'>; kind: 'ACCOUNT' }>
  | Readonly<{ kind: 'SYSTEM'; systemProcess: DomainId<'SystemProcess'> }>;

/**
 * One immutable, semantic-source-keyed flexible-time effect. Persistence owns append-only storage
 * and atomic source uniqueness; this structural type keeps the pure total explainable.
 */
export type TimeAccountLedgerEntry = Readonly<{
  actor: TimeAccountEntryActor;
  amountMinutes: SignedMinutes;
  effectiveDate: LocalDate;
  entryId: DomainId<'TimeAccountLedgerEntry'>;
  entryType: TimeAccountEntryType;
  explanationCode: DomainId<'TimeAccountExplanationCode'>;
  organizationId: DomainId<'Organization'>;
  recordedAt: Instant;
  sourceKey: DomainId<'TimeAccountLedgerSource'>;
  subjectEmployeeId: DomainId<'Employee'>;
}>;

export type TimeAccountLedgerInput = Readonly<{
  entries: readonly TimeAccountLedgerEntry[];
  openingBalanceMinutes: SignedMinutes;
  organizationId: DomainId<'Organization'>;
  subjectEmployeeId: DomainId<'Employee'>;
}>;

export type TimeAccountLedgerEntryExplanation = Readonly<{
  amountMinutes: SignedMinutes;
  balanceAfterMinutes: SignedMinutes;
  effectiveDate: LocalDate;
  entryId: DomainId<'TimeAccountLedgerEntry'>;
  entryType: TimeAccountEntryType;
  explanationCode: DomainId<'TimeAccountExplanationCode'>;
  sourceKey: DomainId<'TimeAccountLedgerSource'>;
}>;

export type TimeAccountLedgerTotals = Readonly<{
  closingBalanceMinutes: SignedMinutes;
  entryExplanations: readonly TimeAccountLedgerEntryExplanation[];
  entryTotalMinutes: SignedMinutes;
  openingBalanceMinutes: SignedMinutes;
}>;

export type TimeAccountLedgerError =
  | DomainError<'TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY'>
  | DomainError<'TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE'>
  | DomainError<'TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH'>
  | DomainError<'TIME_ACCOUNT_LEDGER_TOTAL_INVALID'>;

const TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY = Object.freeze({
  code: 'TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY',
} as const);
const TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE = Object.freeze({
  code: 'TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE',
} as const);
const TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH = Object.freeze({
  code: 'TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH',
} as const);
const TIME_ACCOUNT_LEDGER_TOTAL_INVALID = Object.freeze({
  code: 'TIME_ACCOUNT_LEDGER_TOTAL_INVALID',
} as const);

/**
 * Derives one employee's posted time-account balance from an opening balance and append-only
 * entries in their supplied append order. It neither creates entries nor treats projections as
 * posted facts.
 */
export function calculateTimeAccountLedger(
  input: TimeAccountLedgerInput,
): Result<TimeAccountLedgerTotals, TimeAccountLedgerError> {
  const zeroMinutes = asSignedMinutes(0);
  if (zeroMinutes === null) {
    return failure(TIME_ACCOUNT_LEDGER_TOTAL_INVALID);
  }

  let closingBalanceMinutes = input.openingBalanceMinutes;
  let entryTotalMinutes = zeroMinutes;
  const entryIds = new Set<string>();
  const sourceKeys = new Set<string>();
  const entryExplanations: TimeAccountLedgerEntryExplanation[] = [];

  for (const entry of input.entries) {
    if (
      entry.organizationId !== input.organizationId ||
      entry.subjectEmployeeId !== input.subjectEmployeeId
    ) {
      return failure(TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH);
    }
    if (entryIds.has(entry.entryId)) {
      return failure(TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY);
    }
    if (sourceKeys.has(entry.sourceKey)) {
      return failure(TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE);
    }

    const nextEntryTotal = asSignedMinutes(entryTotalMinutes + entry.amountMinutes);
    const nextClosingBalance = asSignedMinutes(closingBalanceMinutes + entry.amountMinutes);
    if (nextEntryTotal === null || nextClosingBalance === null) {
      return failure(TIME_ACCOUNT_LEDGER_TOTAL_INVALID);
    }

    entryIds.add(entry.entryId);
    sourceKeys.add(entry.sourceKey);
    entryTotalMinutes = nextEntryTotal;
    closingBalanceMinutes = nextClosingBalance;
    entryExplanations.push(
      Object.freeze({
        amountMinutes: entry.amountMinutes,
        balanceAfterMinutes: closingBalanceMinutes,
        effectiveDate: entry.effectiveDate,
        entryId: entry.entryId,
        entryType: entry.entryType,
        explanationCode: entry.explanationCode,
        sourceKey: entry.sourceKey,
      }),
    );
  }

  return success(
    Object.freeze({
      closingBalanceMinutes,
      entryExplanations: Object.freeze(entryExplanations),
      entryTotalMinutes,
      openingBalanceMinutes: input.openingBalanceMinutes,
    }),
  );
}

function asSignedMinutes(value: number): SignedMinutes | null {
  const parsed = parseSignedMinutes(value);
  return parsed.ok ? parsed.value : null;
}
