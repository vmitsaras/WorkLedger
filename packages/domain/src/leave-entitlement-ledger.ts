import { type DomainId } from './shared/identifiers.js';
import { parseSignedMinutes, type SignedMinutes } from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type Instant, type LocalDate } from './shared/temporal.js';

export const leaveEntitlementEntryTypes = Object.freeze([
  'ALLOCATION',
  'PENDING_RESERVATION',
  'RESERVATION_RELEASE',
  'APPROVED_DEDUCTION',
  'CANCELLATION_RESTORATION',
  'CARRYOVER',
  'EXPIRY',
  'MANUAL_ADJUSTMENT',
] as const);

export type LeaveEntitlementEntryType = (typeof leaveEntitlementEntryTypes)[number];

export type LeaveEntitlementLedgerEntry = Readonly<{
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  effectiveOn: LocalDate;
  entryId: DomainId<'LeaveEntitlementEntry'>;
  entryType: LeaveEntitlementEntryType;
  minutes: SignedMinutes;
  organizationId: DomainId<'Organization'>;
  postedAt: Instant;
  sourceId: DomainId<'LeaveEntitlementSource'>;
  subjectEmployeeId: DomainId<'Employee'>;
}>;

export type LeaveEntitlementLedgerInput = Readonly<{
  absenceTypeId: DomainId<'AbsenceTypeVersion'>;
  entries: readonly LeaveEntitlementLedgerEntry[];
  organizationId: DomainId<'Organization'>;
  subjectEmployeeId: DomainId<'Employee'>;
}>;

export type LeaveEntitlementLedgerEntryExplanation = Readonly<{
  availableAfterMinutes: SignedMinutes;
  effectiveOn: LocalDate;
  entryId: DomainId<'LeaveEntitlementEntry'>;
  entryType: LeaveEntitlementEntryType;
  minutes: SignedMinutes;
  postedAt: Instant;
  projectedAfterMinutes: SignedMinutes;
  reservedAfterMinutes: SignedMinutes;
}>;

export type LeaveEntitlementLedgerTotals = Readonly<{
  availableMinutes: SignedMinutes;
  entryExplanations: readonly LeaveEntitlementLedgerEntryExplanation[];
  projectedRemainingMinutes: SignedMinutes;
  reservedMinutes: SignedMinutes;
}>;

export type LeaveEntitlementLedgerError =
  | DomainError<'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_ENTRY'>
  | DomainError<'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_SOURCE'>
  | DomainError<'LEAVE_ENTITLEMENT_LEDGER_ENTRY_INVALID'>
  | DomainError<'LEAVE_ENTITLEMENT_LEDGER_SCOPE_MISMATCH'>
  | DomainError<'LEAVE_ENTITLEMENT_LEDGER_TOTAL_INVALID'>;

const LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_ENTRY = Object.freeze({
  code: 'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_ENTRY',
} as const);
const LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_SOURCE = Object.freeze({
  code: 'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_SOURCE',
} as const);
const LEAVE_ENTITLEMENT_LEDGER_ENTRY_INVALID = Object.freeze({
  code: 'LEAVE_ENTITLEMENT_LEDGER_ENTRY_INVALID',
} as const);
const LEAVE_ENTITLEMENT_LEDGER_SCOPE_MISMATCH = Object.freeze({
  code: 'LEAVE_ENTITLEMENT_LEDGER_SCOPE_MISMATCH',
} as const);
const LEAVE_ENTITLEMENT_LEDGER_TOTAL_INVALID = Object.freeze({
  code: 'LEAVE_ENTITLEMENT_LEDGER_TOTAL_INVALID',
} as const);

/**
 * Derives one entitlement account's available, reserved, and projected balances from its immutable
 * source-keyed entries. Request and decision workflows create entries in later Phase 6 slices.
 */
export function calculateLeaveEntitlementLedger(
  input: LeaveEntitlementLedgerInput,
): Result<LeaveEntitlementLedgerTotals, LeaveEntitlementLedgerError> {
  let availableMinutes = 0;
  let reservationDimensionMinutes = 0;
  const entryIds = new Set<string>();
  const sourceTransitions = new Set<string>();
  const explanations: LeaveEntitlementLedgerEntryExplanation[] = [];

  for (const entry of input.entries) {
    if (
      entry.organizationId !== input.organizationId ||
      entry.subjectEmployeeId !== input.subjectEmployeeId ||
      entry.absenceTypeId !== input.absenceTypeId
    ) {
      return failure(LEAVE_ENTITLEMENT_LEDGER_SCOPE_MISMATCH);
    }
    if (entryIds.has(entry.entryId)) return failure(LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_ENTRY);

    const sourceTransition = `${entry.entryType}:${entry.sourceId}`;
    if (sourceTransitions.has(sourceTransition)) {
      return failure(LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_SOURCE);
    }
    if (!hasValidEntrySign(entry)) return failure(LEAVE_ENTITLEMENT_LEDGER_ENTRY_INVALID);

    if (isReservationDimensionEntry(entry.entryType)) {
      reservationDimensionMinutes += entry.minutes;
    } else {
      availableMinutes += entry.minutes;
    }
    const projectedRemainingMinutes = availableMinutes + reservationDimensionMinutes;
    const typedAvailableMinutes = asSignedMinutes(availableMinutes);
    const typedReservationDimensionMinutes = asSignedMinutes(reservationDimensionMinutes);
    const typedProjectedRemainingMinutes = asSignedMinutes(projectedRemainingMinutes);
    if (
      typedAvailableMinutes === null ||
      typedReservationDimensionMinutes === null ||
      typedProjectedRemainingMinutes === null
    ) {
      return failure(LEAVE_ENTITLEMENT_LEDGER_TOTAL_INVALID);
    }

    entryIds.add(entry.entryId);
    sourceTransitions.add(sourceTransition);
    explanations.push(
      Object.freeze({
        availableAfterMinutes: typedAvailableMinutes,
        effectiveOn: entry.effectiveOn,
        entryId: entry.entryId,
        entryType: entry.entryType,
        minutes: entry.minutes,
        postedAt: entry.postedAt,
        projectedAfterMinutes: typedProjectedRemainingMinutes,
        reservedAfterMinutes: asSignedMinutes(-typedReservationDimensionMinutes) ?? zeroMinutes(),
      }),
    );
  }

  const typedAvailableMinutes = asSignedMinutes(availableMinutes);
  const typedReservationDimensionMinutes = asSignedMinutes(reservationDimensionMinutes);
  const typedProjectedRemainingMinutes = asSignedMinutes(
    availableMinutes + reservationDimensionMinutes,
  );
  if (
    typedAvailableMinutes === null ||
    typedReservationDimensionMinutes === null ||
    typedProjectedRemainingMinutes === null
  ) {
    return failure(LEAVE_ENTITLEMENT_LEDGER_TOTAL_INVALID);
  }

  return success(
    Object.freeze({
      availableMinutes: typedAvailableMinutes,
      entryExplanations: Object.freeze(explanations),
      projectedRemainingMinutes: typedProjectedRemainingMinutes,
      reservedMinutes: asSignedMinutes(-typedReservationDimensionMinutes) ?? zeroMinutes(),
    }),
  );
}

function hasValidEntrySign(entry: LeaveEntitlementLedgerEntry): boolean {
  switch (entry.entryType) {
    case 'ALLOCATION':
    case 'RESERVATION_RELEASE':
    case 'CANCELLATION_RESTORATION':
    case 'CARRYOVER':
      return entry.minutes > 0;
    case 'PENDING_RESERVATION':
    case 'APPROVED_DEDUCTION':
    case 'EXPIRY':
      return entry.minutes < 0;
    case 'MANUAL_ADJUSTMENT':
      return entry.minutes !== 0;
  }
}

function isReservationDimensionEntry(entryType: LeaveEntitlementEntryType): boolean {
  return entryType === 'PENDING_RESERVATION' || entryType === 'RESERVATION_RELEASE';
}

function asSignedMinutes(value: number): SignedMinutes | null {
  const parsed = parseSignedMinutes(value);
  return parsed.ok ? parsed.value : null;
}

function zeroMinutes(): SignedMinutes {
  const parsed = parseSignedMinutes(0);
  if (!parsed.ok) throw new Error('Zero minutes must be valid.');
  return parsed.value;
}
