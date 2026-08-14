import {
  calculationBlockerCodes,
  calculationWarningCodes,
  type CalculationBlockerCode,
  type CalculationWarningCode,
} from './calculation-signals.js';
import { type DomainId } from './shared/identifiers.js';
import {
  parseNonNegativeMinutes,
  parseSignedMinutes,
  type NonNegativeMinutes,
  type SignedMinutes,
} from './shared/minutes.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type LocalDate } from './shared/temporal.js';

export const monthlyPeriodStatuses = Object.freeze([
  'OPEN',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'LOCKED',
] as const);

export const monthlyReadinessStatuses = Object.freeze([
  'INCOMPLETE',
  'READY_FOR_SUBMISSION',
] as const);

export const monthlyDailyStatuses = Object.freeze([
  'MISSING',
  'PROVISIONAL',
  'INCOMPLETE',
  'COMPLETE',
] as const);

export const monthlySnapshotSchemaVersion = 1 as const;

export type MonthlyPeriodStatus = (typeof monthlyPeriodStatuses)[number];
export type MonthlyReadinessStatus = (typeof monthlyReadinessStatuses)[number];
export type MonthlyDailyStatus = (typeof monthlyDailyStatuses)[number];

export type MonthlyPeriodDailyInput = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  adjustmentMinutes: SignedMinutes;
  balanceMinutes: SignedMinutes;
  basePosted: boolean;
  blockers: readonly CalculationBlockerCode[];
  breakMinutes: NonNegativeMinutes;
  calculationStatus: Exclude<MonthlyDailyStatus, 'MISSING'>;
  creditedMinutes: NonNegativeMinutes;
  engineVersion: string;
  expectedMinutes: NonNegativeMinutes;
  localDate: LocalDate;
  postedMinutes: SignedMinutes;
  projectionId: DomainId<'DailyProjection'>;
  projectionVersion: number;
  sourceFingerprint: string;
  warnings: readonly CalculationWarningCode[];
  workedMinutes: NonNegativeMinutes;
}>;

export type MonthlyPeriodSourceBlocker = Readonly<{
  code: CalculationBlockerCode;
  localDate: LocalDate;
}>;

export type MonthlyPeriodProjectionInput = Readonly<{
  coveredDates: readonly LocalDate[];
  currentLocalDate: LocalDate;
  dailyResults: readonly MonthlyPeriodDailyInput[];
  ledgerClosingBalanceMinutes: SignedMinutes;
  ledgerOpeningBalanceMinutes: SignedMinutes;
  monthEnd: LocalDate;
  monthStart: LocalDate;
  periodId: DomainId<'MonthlyPeriod'>;
  periodVersion: number;
  sourceBlockers: readonly MonthlyPeriodSourceBlocker[];
  sourceFingerprint: string;
  status: MonthlyPeriodStatus;
}>;

export type MonthlyPeriodAttention = Readonly<{
  blockers: readonly Readonly<{
    code: CalculationBlockerCode;
    localDate: LocalDate | null;
    recordId: DomainId<'DailyProjection'> | null;
  }>[];
  warnings: readonly Readonly<{
    code: CalculationWarningCode;
    localDate: LocalDate;
    recordId: DomainId<'DailyProjection'>;
  }>[];
}>;

export type MonthlyPeriodDailyRow = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes | null;
  adjustmentMinutes: SignedMinutes | null;
  balanceMinutes: SignedMinutes | null;
  breakMinutes: NonNegativeMinutes | null;
  creditedMinutes: NonNegativeMinutes | null;
  expectedMinutes: NonNegativeMinutes | null;
  localDate: LocalDate;
  recordId: DomainId<'DailyProjection'> | null;
  status: MonthlyDailyStatus;
  workedMinutes: NonNegativeMinutes | null;
}>;

export type MonthlyPeriodTotals = Readonly<{
  absenceCreditMinutes: NonNegativeMinutes;
  adjustmentMinutes: SignedMinutes;
  balanceMinutes: SignedMinutes;
  breakMinutes: NonNegativeMinutes;
  creditedMinutes: NonNegativeMinutes;
  expectedMinutes: NonNegativeMinutes;
  ledgerClosingBalanceMinutes: SignedMinutes;
  ledgerOpeningBalanceMinutes: SignedMinutes;
  ledgerPeriodDeltaMinutes: SignedMinutes;
  workedMinutes: NonNegativeMinutes;
}>;

export type MonthlyPeriodProjection = Readonly<{
  attention: MonthlyPeriodAttention;
  completeDateCount: number;
  coveredDateCount: number;
  monthEnded: boolean;
  readiness: MonthlyReadinessStatus | null;
  rows: readonly MonthlyPeriodDailyRow[];
  snapshotVersion: Readonly<{
    schemaVersion: typeof monthlySnapshotSchemaVersion;
    sourceFingerprint: string;
  }>;
  totals: MonthlyPeriodTotals;
}>;

export type MonthlyPeriodSubmissionInput = Readonly<{
  acknowledgedSourceFingerprint: string;
  currentStatus: MonthlyPeriodStatus;
  currentVersion: number;
  expectedPeriodVersion: number;
  projection: Readonly<{
    attention: Readonly<{
      blockers: readonly Readonly<{ code: CalculationBlockerCode }>[];
    }>;
    readiness: MonthlyReadinessStatus | null;
    snapshotVersion: Readonly<{ sourceFingerprint: string }>;
  }>;
}>;

export type MonthlyPeriodSubmission = Readonly<{
  nextStatus: 'SUBMITTED';
  nextVersion: number;
  submittedSourceFingerprint: string;
}>;

export type MonthlyPeriodSubmissionError =
  | DomainError<'PERIOD_ALREADY_SUBMITTED'>
  | DomainError<'PERIOD_LEDGER_MISMATCH'>
  | DomainError<'PERIOD_LOCKED'>
  | DomainError<'PERIOD_NOT_READY'>
  | DomainError<'PERIOD_STATE_CONFLICT'>
  | DomainError<'PERIOD_VERSION_CONFLICT'>
  | DomainError<'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED'>;

export type MonthlyPeriodProjectionError =
  | DomainError<'MONTHLY_PERIOD_DATE_RANGE_INVALID'>
  | DomainError<'MONTHLY_PERIOD_DUPLICATE_DATE'>
  | DomainError<'MONTHLY_PERIOD_SCOPE_INVALID'>
  | DomainError<'MONTHLY_PERIOD_TOTAL_INVALID'>
  | DomainError<'MONTHLY_PERIOD_VERSION_INVALID'>;

const DATE_RANGE_INVALID = Object.freeze({ code: 'MONTHLY_PERIOD_DATE_RANGE_INVALID' } as const);
const DUPLICATE_DATE = Object.freeze({ code: 'MONTHLY_PERIOD_DUPLICATE_DATE' } as const);
const SCOPE_INVALID = Object.freeze({ code: 'MONTHLY_PERIOD_SCOPE_INVALID' } as const);
const TOTAL_INVALID = Object.freeze({ code: 'MONTHLY_PERIOD_TOTAL_INVALID' } as const);
const VERSION_INVALID = Object.freeze({ code: 'MONTHLY_PERIOD_VERSION_INVALID' } as const);
const PERIOD_ALREADY_SUBMITTED = Object.freeze({ code: 'PERIOD_ALREADY_SUBMITTED' } as const);
const PERIOD_LEDGER_MISMATCH = Object.freeze({ code: 'PERIOD_LEDGER_MISMATCH' } as const);
const PERIOD_LOCKED = Object.freeze({ code: 'PERIOD_LOCKED' } as const);
const PERIOD_NOT_READY = Object.freeze({ code: 'PERIOD_NOT_READY' } as const);
const PERIOD_STATE_CONFLICT = Object.freeze({ code: 'PERIOD_STATE_CONFLICT' } as const);
const PERIOD_VERSION_CONFLICT = Object.freeze({ code: 'PERIOD_VERSION_CONFLICT' } as const);
const PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED = Object.freeze({
  code: 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED',
} as const);

/**
 * Derives one immutable monthly review projection from already identified daily and ledger facts.
 * The function neither persists workflow state nor creates an approval snapshot.
 */
export function calculateMonthlyPeriodProjection(
  input: MonthlyPeriodProjectionInput,
): Result<MonthlyPeriodProjection, MonthlyPeriodProjectionError> {
  if (
    input.monthStart > input.monthEnd ||
    !input.monthStart.endsWith('-01') ||
    input.monthStart.slice(0, 7) !== input.monthEnd.slice(0, 7)
  ) {
    return failure(DATE_RANGE_INVALID);
  }
  if (input.periodVersion < 1 || !Number.isSafeInteger(input.periodVersion)) {
    return failure(VERSION_INVALID);
  }
  if (!/^[0-9a-f]{64}$/u.test(input.sourceFingerprint)) {
    return failure(SCOPE_INVALID);
  }

  const coveredDateSet = new Set<string>();
  for (const localDate of input.coveredDates) {
    if (
      coveredDateSet.has(localDate) ||
      localDate < input.monthStart ||
      localDate > input.monthEnd
    ) {
      return failure(coveredDateSet.has(localDate) ? DUPLICATE_DATE : SCOPE_INVALID);
    }
    coveredDateSet.add(localDate);
  }

  const resultsByDate = new Map<LocalDate, MonthlyPeriodDailyInput>();
  for (const result of input.dailyResults) {
    if (resultsByDate.has(result.localDate)) return failure(DUPLICATE_DATE);
    if (!coveredDateSet.has(result.localDate) || result.projectionVersion < 1) {
      return failure(SCOPE_INVALID);
    }
    resultsByDate.set(result.localDate, result);
  }
  if (input.sourceBlockers.some(({ localDate }) => !coveredDateSet.has(localDate))) {
    return failure(SCOPE_INVALID);
  }

  const blockers: Array<MonthlyPeriodAttention['blockers'][number]> = [];
  const warnings: Array<MonthlyPeriodAttention['warnings'][number]> = [];
  const rows: MonthlyPeriodDailyRow[] = [];
  const completeResults: MonthlyPeriodDailyInput[] = [];

  for (const localDate of [...input.coveredDates].sort()) {
    const daily = resultsByDate.get(localDate);
    if (daily === undefined) {
      rows.push(missingRow(localDate));
      blockers.push({ code: 'ATTENDANCE_INCOMPLETE', localDate, recordId: null });
      continue;
    }

    for (const code of daily.blockers) {
      blockers.push({ code, localDate, recordId: daily.projectionId });
    }
    for (const code of daily.warnings) {
      warnings.push({ code, localDate, recordId: daily.projectionId });
    }
    if (daily.calculationStatus !== 'COMPLETE') {
      if (!daily.blockers.includes('ATTENDANCE_INCOMPLETE')) {
        blockers.push({
          code: 'ATTENDANCE_INCOMPLETE',
          localDate,
          recordId: daily.projectionId,
        });
      }
      rows.push(incompleteRow(daily));
      continue;
    }

    completeResults.push(daily);
    rows.push(completeRow(daily));
    if (!daily.basePosted || daily.postedMinutes !== daily.balanceMinutes) {
      blockers.push({ code: 'LEDGER_SOURCE_MISMATCH', localDate, recordId: daily.projectionId });
    }
  }

  for (const blocker of input.sourceBlockers) {
    blockers.push({ code: blocker.code, localDate: blocker.localDate, recordId: null });
  }

  const totals = calculateTotals(
    completeResults,
    input.ledgerOpeningBalanceMinutes,
    input.ledgerClosingBalanceMinutes,
  );
  if (totals === null) return failure(TOTAL_INVALID);
  if (totals.ledgerPeriodDeltaMinutes !== totals.balanceMinutes) {
    blockers.push({ code: 'LEDGER_SOURCE_MISMATCH', localDate: null, recordId: null });
  }

  const normalizedAttention = Object.freeze({
    blockers: normalizeBlockers(blockers),
    warnings: normalizeWarnings(warnings),
  });
  const monthEnded = input.currentLocalDate > input.monthEnd;
  const readiness = deriveReadiness(
    input.status,
    monthEnded,
    input.coveredDates.length,
    completeResults.length,
    normalizedAttention.blockers.length,
  );

  return success(
    Object.freeze({
      attention: normalizedAttention,
      completeDateCount: completeResults.length,
      coveredDateCount: input.coveredDates.length,
      monthEnded,
      readiness,
      rows: Object.freeze(rows),
      snapshotVersion: Object.freeze({
        schemaVersion: monthlySnapshotSchemaVersion,
        sourceFingerprint: input.sourceFingerprint,
      }),
      totals,
    }),
  );
}

/**
 * Validates the complete employee submission transition without persisting it.
 * The acknowledged fingerprint binds the warning acknowledgement to the exact reviewed source.
 */
export function validateMonthlyPeriodSubmission(
  input: MonthlyPeriodSubmissionInput,
): Result<MonthlyPeriodSubmission, MonthlyPeriodSubmissionError> {
  if (input.currentStatus === 'LOCKED') return failure(PERIOD_LOCKED);
  if (input.currentStatus === 'SUBMITTED') return failure(PERIOD_ALREADY_SUBMITTED);
  if (input.currentStatus !== 'OPEN' && input.currentStatus !== 'CHANGES_REQUESTED') {
    return failure(PERIOD_STATE_CONFLICT);
  }
  if (input.currentVersion !== input.expectedPeriodVersion) {
    return failure(PERIOD_VERSION_CONFLICT);
  }
  if (input.projection.readiness !== 'READY_FOR_SUBMISSION') {
    return failure(
      input.projection.attention.blockers.some(({ code }) => code === 'LEDGER_SOURCE_MISMATCH')
        ? PERIOD_LEDGER_MISMATCH
        : PERIOD_NOT_READY,
    );
  }
  if (input.acknowledgedSourceFingerprint !== input.projection.snapshotVersion.sourceFingerprint) {
    return failure(PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED);
  }

  return success(
    Object.freeze({
      nextStatus: 'SUBMITTED',
      nextVersion: input.currentVersion + 1,
      submittedSourceFingerprint: input.projection.snapshotVersion.sourceFingerprint,
    }),
  );
}

function deriveReadiness(
  status: MonthlyPeriodStatus,
  monthEnded: boolean,
  coveredDateCount: number,
  completeDateCount: number,
  blockerCount: number,
): MonthlyReadinessStatus | null {
  if (status !== 'OPEN' && status !== 'CHANGES_REQUESTED') return null;
  return monthEnded &&
    coveredDateCount > 0 &&
    coveredDateCount === completeDateCount &&
    blockerCount === 0
    ? 'READY_FOR_SUBMISSION'
    : 'INCOMPLETE';
}

function missingRow(localDate: LocalDate): MonthlyPeriodDailyRow {
  return Object.freeze({
    absenceCreditMinutes: null,
    adjustmentMinutes: null,
    balanceMinutes: null,
    breakMinutes: null,
    creditedMinutes: null,
    expectedMinutes: null,
    localDate,
    recordId: null,
    status: 'MISSING',
    workedMinutes: null,
  });
}

function incompleteRow(daily: MonthlyPeriodDailyInput): MonthlyPeriodDailyRow {
  return Object.freeze({
    absenceCreditMinutes: null,
    adjustmentMinutes: null,
    balanceMinutes: null,
    breakMinutes: null,
    creditedMinutes: null,
    expectedMinutes: null,
    localDate: daily.localDate,
    recordId: daily.projectionId,
    status: daily.calculationStatus,
    workedMinutes: null,
  });
}

function completeRow(daily: MonthlyPeriodDailyInput): MonthlyPeriodDailyRow {
  return Object.freeze({
    absenceCreditMinutes: daily.absenceCreditMinutes,
    adjustmentMinutes: daily.adjustmentMinutes,
    balanceMinutes: daily.balanceMinutes,
    breakMinutes: daily.breakMinutes,
    creditedMinutes: daily.creditedMinutes,
    expectedMinutes: daily.expectedMinutes,
    localDate: daily.localDate,
    recordId: daily.projectionId,
    status: daily.calculationStatus,
    workedMinutes: daily.workedMinutes,
  });
}

function calculateTotals(
  dailyResults: readonly MonthlyPeriodDailyInput[],
  ledgerOpeningBalanceMinutes: SignedMinutes,
  ledgerClosingBalanceMinutes: SignedMinutes,
): MonthlyPeriodTotals | null {
  const absenceCreditMinutes = parseNonNegativeMinutes(
    dailyResults.reduce((total, row) => total + row.absenceCreditMinutes, 0),
  );
  const adjustmentMinutes = parseSignedMinutes(
    dailyResults.reduce((total, row) => total + row.adjustmentMinutes, 0),
  );
  const balanceMinutes = parseSignedMinutes(
    dailyResults.reduce((total, row) => total + row.balanceMinutes, 0),
  );
  const breakMinutes = parseNonNegativeMinutes(
    dailyResults.reduce((total, row) => total + row.breakMinutes, 0),
  );
  const creditedMinutes = parseNonNegativeMinutes(
    dailyResults.reduce((total, row) => total + row.creditedMinutes, 0),
  );
  const expectedMinutes = parseNonNegativeMinutes(
    dailyResults.reduce((total, row) => total + row.expectedMinutes, 0),
  );
  const workedMinutes = parseNonNegativeMinutes(
    dailyResults.reduce((total, row) => total + row.workedMinutes, 0),
  );
  const ledgerPeriodDelta = parseSignedMinutes(
    ledgerClosingBalanceMinutes - ledgerOpeningBalanceMinutes,
  );
  if (
    !absenceCreditMinutes.ok ||
    !adjustmentMinutes.ok ||
    !balanceMinutes.ok ||
    !breakMinutes.ok ||
    !creditedMinutes.ok ||
    !expectedMinutes.ok ||
    !workedMinutes.ok ||
    !ledgerPeriodDelta.ok
  ) {
    return null;
  }

  return Object.freeze({
    absenceCreditMinutes: absenceCreditMinutes.value,
    adjustmentMinutes: adjustmentMinutes.value,
    balanceMinutes: balanceMinutes.value,
    breakMinutes: breakMinutes.value,
    creditedMinutes: creditedMinutes.value,
    expectedMinutes: expectedMinutes.value,
    ledgerClosingBalanceMinutes,
    ledgerOpeningBalanceMinutes,
    ledgerPeriodDeltaMinutes: ledgerPeriodDelta.value,
    workedMinutes: workedMinutes.value,
  });
}

function normalizeBlockers(
  values: readonly MonthlyPeriodAttention['blockers'][number][],
): MonthlyPeriodAttention['blockers'] {
  const unique = new Map<string, MonthlyPeriodAttention['blockers'][number]>();
  for (const value of values) {
    unique.set(
      `${value.localDate ?? ''}:${value.code}:${value.recordId ?? ''}`,
      Object.freeze(value),
    );
  }
  return Object.freeze(
    [...unique.values()].sort((first, second) => {
      const dateOrder = (first.localDate ?? '').localeCompare(second.localDate ?? '');
      if (dateOrder !== 0) return dateOrder;
      return (
        calculationBlockerCodes.indexOf(first.code) - calculationBlockerCodes.indexOf(second.code)
      );
    }),
  );
}

function normalizeWarnings(
  values: readonly MonthlyPeriodAttention['warnings'][number][],
): MonthlyPeriodAttention['warnings'] {
  const unique = new Map<string, MonthlyPeriodAttention['warnings'][number]>();
  for (const value of values) {
    unique.set(`${value.localDate}:${value.code}:${value.recordId}`, Object.freeze(value));
  }
  return Object.freeze(
    [...unique.values()].sort((first, second) => {
      const dateOrder = first.localDate.localeCompare(second.localDate);
      if (dateOrder !== 0) return dateOrder;
      return (
        calculationWarningCodes.indexOf(first.code) - calculationWarningCodes.indexOf(second.code)
      );
    }),
  );
}
