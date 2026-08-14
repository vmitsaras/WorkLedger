import { createHash } from 'node:crypto';

import type { MonthlyPeriod } from '@workledger/contracts';
import {
  addLocalDateDays,
  calculateMonthlyPeriodProjection,
  calculateTimeAccountLedger,
  calculationBlockerCodes,
  calculationWarningCodes,
  localDateAtInstant,
  parseDomainId,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  parseTimeZoneId,
  type CalculationBlockerCode,
  type CalculationWarningCode,
  type DomainId,
  type Instant,
  type LocalDate,
  type MonthlyPeriodDailyInput,
  type SignedMinutes,
  type TimeAccountLedgerEntry,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  DailyProjectionRecord,
  MonthlyPeriodProjectionSourceRecord,
  MonthlyPeriodRangeRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type MonthlyPeriodIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const zeroResult = parseSignedMinutes(0);
if (!zeroResult.ok) throw new Error('Zero minutes must be a valid domain value.');
const zeroMinutes = zeroResult.value;

export function createMonthlyPeriodService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async get(
      identity: MonthlyPeriodIdentity,
      periodId: DomainId<'MonthlyPeriod'>,
      at: Instant,
    ): Promise<MonthlyPeriod> {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw internalError();
          const currentLocalDate = localDateAtInstant(at, timeZone.value);
          const actor = await transaction.authorization.findActor(
            context.organization.id,
            context.accountId,
            currentLocalDate,
          );
          if (actor === null) throw denied();
          const source = await transaction.monthlyPeriods.loadProjectionSource(
            context.organization.id,
            periodId,
          );
          if (source === null)
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });

          const isCurrentManager =
            actor.employeeId !== null &&
            (await transaction.authorization.isCurrentManager(
              context.organization.id,
              actor.employeeId,
              source.period.employeeId,
              currentLocalDate,
            ));
          const authorization = authorizeEmployeeTarget({
            action: 'MONTHLY_PERIOD_READ',
            actor,
            isCurrentManager,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: source.period.employeeId,
            targetOrganizationId: source.period.organizationId,
          });
          if (!authorization.allowed) throw denied();

          return projectMonthlyPeriod(source, currentLocalDate, timeZone.value);
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseMonthlyPeriodIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): MonthlyPeriodIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

export function parseMonthlyPeriodId(value: string): DomainId<'MonthlyPeriod'> {
  if (!UUID_PATTERN.test(value))
    throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  const periodId = parseDomainId<'MonthlyPeriod'>(value);
  if (!periodId.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return periodId.value;
}

function projectMonthlyPeriod(
  source: MonthlyPeriodProjectionSourceRecord,
  currentLocalDate: LocalDate,
  timeZone: string,
): MonthlyPeriod {
  const monthEnd = endOfMonth(source.period.monthStart);
  const coveredDates = listCoveredDates(
    source.period.monthStart,
    monthEnd,
    source.employmentPeriods,
  );
  const configurationBlockers = coveredDates.flatMap((localDate) => [
    ...assignmentBlockers(localDate, source.scheduleAssignments, {
      missing: 'SCHEDULE_NOT_ASSIGNED',
      overlap: 'SCHEDULE_ASSIGNMENT_OVERLAP',
    }),
    ...assignmentBlockers(localDate, source.policyAssignments, {
      missing: 'POLICY_NOT_ASSIGNED',
      overlap: 'POLICY_ASSIGNMENT_OVERLAP',
    }),
  ]);
  const openingEntries = source.ledgerEntries.filter(
    (entry) =>
      entry.effectiveDate < source.period.monthStart || entry.entryType === 'OPENING_BALANCE',
  );
  const openingBalance = calculateLedgerBalance(
    openingEntries,
    source.period.organizationId,
    source.period.employeeId,
  );
  const closingBalance = calculateLedgerBalance(
    source.ledgerEntries,
    source.period.organizationId,
    source.period.employeeId,
  );
  const dailyResults = source.dailyProjections
    .filter((projection) => coveredDates.includes(projection.localDate))
    .map((projection) => toDailyInput(projection, source));
  const sourceFingerprint = fingerprintSource({
    ...source,
    coveredDates,
    sourceBlockers: [...source.sourceBlockers, ...configurationBlockers],
  });
  const projected = calculateMonthlyPeriodProjection({
    coveredDates,
    currentLocalDate,
    dailyResults,
    ledgerClosingBalanceMinutes: closingBalance,
    ledgerOpeningBalanceMinutes: openingBalance,
    monthEnd,
    monthStart: source.period.monthStart,
    periodId: source.period.id,
    periodVersion: source.period.version,
    sourceBlockers: [...source.sourceBlockers, ...configurationBlockers].map(
      ({ code, localDate }) => Object.freeze({ code, localDate }),
    ),
    sourceFingerprint,
    status: source.period.status,
  });
  if (!projected.ok) throw internalError();

  return Object.freeze({
    attention: Object.freeze({
      blockers: projected.value.attention.blockers.map((blocker) => Object.freeze({ ...blocker })),
      warnings: projected.value.attention.warnings.map((warning) => Object.freeze({ ...warning })),
    }),
    employeeDisplayName: source.period.employeeDisplayName,
    id: source.period.id,
    monthEnd,
    monthStart: source.period.monthStart,
    readiness: Object.freeze({
      completeDateCount: projected.value.completeDateCount,
      coveredDateCount: projected.value.coveredDateCount,
      monthEnded: projected.value.monthEnded,
      status: projected.value.readiness,
    }),
    rows: projected.value.rows.map((row) => Object.freeze({ ...row })),
    snapshotVersion: projected.value.snapshotVersion,
    timeZone,
    totals: projected.value.totals,
    workflow: Object.freeze({
      approvedAt: source.period.approvedAt,
      lockedAt: source.period.lockedAt,
      periodVersion: source.period.version,
      status: source.period.status,
      submittedAt: source.period.submittedAt,
    }),
  });
}

function toDailyInput(
  projection: DailyProjectionRecord,
  source: MonthlyPeriodProjectionSourceRecord,
): MonthlyPeriodDailyInput {
  const signals = normalizeStoredSignals(projection);
  const dailyLedgerEntries = source.ledgerEntries.filter(
    (entry) =>
      entry.effectiveDate === projection.localDate &&
      (entry.entryType === 'DAILY_DELTA' || entry.entryType === 'DAILY_RECALCULATION_DELTA'),
  );
  const postedMinutes = parseSignedMinutes(
    dailyLedgerEntries.reduce((total, entry) => total + entry.amountMinutes, 0),
  );
  if (!postedMinutes.ok) throw internalError();
  return Object.freeze({
    absenceCreditMinutes: nonNegativeMinutes(projection.absenceCreditMinutes),
    adjustmentMinutes: signedMinutes(projection.adjustmentMinutes),
    balanceMinutes: signedMinutes(projection.balanceMinutes),
    basePosted: dailyLedgerEntries.some(
      (entry) =>
        entry.entryType === 'DAILY_DELTA' && String(entry.sourceKey) === String(projection.id),
    ),
    blockers: signals.blockers,
    breakMinutes: nonNegativeMinutes(projection.breakMinutes),
    calculationStatus: projection.calculationStatus,
    creditedMinutes: nonNegativeMinutes(projection.creditedMinutes),
    engineVersion: projection.engineVersion,
    expectedMinutes: nonNegativeMinutes(projection.expectedMinutes),
    localDate: projection.localDate,
    postedMinutes: postedMinutes.value,
    projectionId: projection.id,
    projectionVersion: projection.projectionVersion,
    sourceFingerprint: projection.sourceFingerprint,
    warnings: signals.warnings,
    workedMinutes: nonNegativeMinutes(projection.workedMinutes),
  });
}

function normalizeStoredSignals(projection: DailyProjectionRecord): Readonly<{
  blockers: readonly CalculationBlockerCode[];
  warnings: readonly CalculationWarningCode[];
}> {
  const blockers: CalculationBlockerCode[] = [];
  const warnings: CalculationWarningCode[] = [];
  for (const code of projection.warningCodes) {
    if (isWarning(code)) warnings.push(code);
    else if (isBlocker(code)) blockers.push(code);
    else throw internalError();
  }
  if (
    projection.calculationStatus === 'INCOMPLETE' &&
    !blockers.includes('ATTENDANCE_INCOMPLETE')
  ) {
    blockers.push('ATTENDANCE_INCOMPLETE');
  }
  return Object.freeze({ blockers: Object.freeze(blockers), warnings: Object.freeze(warnings) });
}

function assignmentBlockers(
  localDate: LocalDate,
  assignments: readonly MonthlyPeriodRangeRecord[],
  codes: Readonly<{
    missing: Extract<CalculationBlockerCode, 'POLICY_NOT_ASSIGNED' | 'SCHEDULE_NOT_ASSIGNED'>;
    overlap: Extract<
      CalculationBlockerCode,
      'POLICY_ASSIGNMENT_OVERLAP' | 'SCHEDULE_ASSIGNMENT_OVERLAP'
    >;
  }>,
) {
  const count = assignments.filter((assignment) => rangeContains(assignment, localDate)).length;
  if (count === 1) return [];
  return [Object.freeze({ code: count === 0 ? codes.missing : codes.overlap, localDate })];
}

function listCoveredDates(
  monthStart: LocalDate,
  monthEnd: LocalDate,
  employmentPeriods: readonly MonthlyPeriodRangeRecord[],
): readonly LocalDate[] {
  const dates: LocalDate[] = [];
  for (
    let localDate = monthStart;
    localDate <= monthEnd;
    localDate = addLocalDateDays(localDate, 1)
  ) {
    if (employmentPeriods.some((period) => rangeContains(period, localDate))) dates.push(localDate);
  }
  return Object.freeze(dates);
}

function rangeContains(range: MonthlyPeriodRangeRecord, localDate: LocalDate): boolean {
  return range.startsOn <= localDate && (range.endsOn === null || localDate < range.endsOn);
}

function calculateLedgerBalance(
  entries: readonly TimeAccountLedgerEntry[],
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
): SignedMinutes {
  const result = calculateTimeAccountLedger({
    entries,
    openingBalanceMinutes: zeroMinutes,
    organizationId,
    subjectEmployeeId: employeeId,
  });
  if (!result.ok) throw internalError();
  return result.value.closingBalanceMinutes;
}

function fingerprintSource(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(',')}}`;
}

function endOfMonth(monthStart: LocalDate): LocalDate {
  let endDate = addLocalDateDays(monthStart, 27);
  while (addLocalDateDays(endDate, 1).slice(0, 7) === monthStart.slice(0, 7)) {
    endDate = addLocalDateDays(endDate, 1);
  }
  return endDate;
}

function isWarning(value: string): value is CalculationWarningCode {
  return calculationWarningCodes.some((code) => code === value);
}

function isBlocker(value: string): value is CalculationBlockerCode {
  return calculationBlockerCodes.some((code) => code === value);
}

function nonNegativeMinutes(value: number) {
  const parsed = parseNonNegativeMinutes(value);
  if (!parsed.ok) throw internalError();
  return parsed.value;
}

function signedMinutes(value: number) {
  const parsed = parseSignedMinutes(value);
  if (!parsed.ok) throw internalError();
  return parsed.value;
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}

function internalError() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
