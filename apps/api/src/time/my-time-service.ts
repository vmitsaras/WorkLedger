import type { MyTime, MyTimeQuery } from '@workledger/contracts';
import {
  addLocalDateDays,
  calculateLeaveEntitlementLedger,
  calculateTimeAccountLedger,
  parseDomainId,
  parseLocalDate,
  parseSignedMinutes,
  parseTimeZoneId,
  startOfLocalMonth,
  startOfLocalWeek,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  LeaveEntitlementEntryRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { normalizeStoredWarningCodes } from './calculation-attention.js';

export type MyTimeIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export interface MyTimeService {
  getMyTime(identity: MyTimeIdentity, query: MyTimeQuery, at: Instant): Promise<MyTime>;
}

const zeroMinutesResult = parseSignedMinutes(0);
if (!zeroMinutesResult.ok) throw new Error('Zero minutes must be a valid domain value.');
const zeroMinutes = zeroMinutesResult.value;

export function createMyTimeService(database: WorkLedgerDatabase): MyTimeService {
  return Object.freeze({
    async getMyTime(identity: MyTimeIdentity, query: MyTimeQuery, at: Instant) {
      return database.transaction(async (transaction) => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const employee = context.employee;
        if (employee === null)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });

        const timeZone = parseTimeZoneId(context.organization.timeZone);
        if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
        const anchorDate = parseLocalDate(query.date);
        if (!anchorDate.ok)
          throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
        const period = getPeriod(anchorDate.value, query.view);

        const authorization = authorizeEmployeeTarget({
          action: 'TIME_BALANCE_READ',
          actor: {
            accountActive: context.accountActive,
            accountId: context.accountId,
            employeeCapabilityActive: context.employeeCapabilityActive,
            employeeId: employee.id,
            organizationId: context.organization.id,
            roles: context.roles,
          },
          isCurrentManager: false,
          sessionFresh: identity.sessionFresh,
          targetEmployeeId: employee.id,
          targetOrganizationId: context.organization.id,
        });
        if (!authorization.allowed)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });

        const periodProjections = await transaction.dailyProjections.listForEmployeeRange(
          context.organization.id,
          employee.id,
          period.startDate,
          period.endDate,
        );
        const allProjections = await transaction.dailyProjections.listForEmployeeThroughDate(
          context.organization.id,
          employee.id,
          period.endDate,
        );
        const ledgerEntries = await transaction.timeAccount.listForEmployeeThroughDate(
          context.organization.id,
          employee.id,
          period.endDate,
        );
        const leaveEntries = await transaction.leaveEntitlements.listForEmployee(
          context.organization.id,
          employee.id,
        );
        const monthlyPeriod =
          query.view === 'MONTH'
            ? await transaction.monthlyPeriods.findByEmployeeMonth(
                context.organization.id,
                employee.id,
                period.startDate,
              )
            : null;

        const totals = calculateTimeAccountLedger({
          entries: ledgerEntries,
          openingBalanceMinutes: zeroMinutes,
          organizationId: context.organization.id,
          subjectEmployeeId: employee.id,
        });
        if (!totals.ok) throw new WorkLedgerApiError({ code: totals.error.code, statusCode: 503 });

        const ledgerSourceKeys = new Set(ledgerEntries.map((entry) => String(entry.sourceKey)));
        const eligibleProjectedMinutes = sumSignedMinutes(
          allProjections
            .filter(
              (projection) =>
                projection.calculationStatus === 'COMPLETE' &&
                !ledgerSourceKeys.has(String(projection.id)),
            )
            .map((projection) => projection.balanceMinutes),
        );
        const projectedBalanceMinutes = sumSignedMinutes([
          totals.value.closingBalanceMinutes,
          eligibleProjectedMinutes,
        ]);
        const projectionsByDate = new Map(
          periodProjections.map((projection) => [projection.localDate, projection]),
        );
        const dates = listPeriodDates(period.startDate, period.endDate);
        const records = dates.map((localDate) => {
          const projection = projectionsByDate.get(localDate);
          if (projection === undefined) {
            return Object.freeze({
              attention: Object.freeze({ blockers: [], warnings: [] }),
              balanceMinutes: null,
              creditedMinutes: null,
              expectedMinutes: null,
              localDate,
              recordId: null,
              status: 'NO_RECORD' as const,
            });
          }
          return Object.freeze({
            attention: Object.freeze({
              blockers: [],
              warnings: normalizeStoredWarningCodes(projection.warningCodes),
            }),
            balanceMinutes: projection.balanceMinutes,
            creditedMinutes: projection.creditedMinutes,
            expectedMinutes: projection.expectedMinutes,
            localDate,
            recordId: projection.id,
            status: projection.calculationStatus,
          });
        });
        const completeRecords = periodProjections.filter(
          (projection) => projection.calculationStatus === 'COMPLETE',
        );
        const completeBalanceMinutes = sumSignedMinutes(
          completeRecords.map((projection) => projection.balanceMinutes),
        );
        const incompleteDates = periodProjections
          .filter((projection) => projection.calculationStatus !== 'COMPLETE')
          .map((projection) => projection.localDate);
        const offset = (query.page - 1) * query.limit;
        const pageEntries = totals.value.entryExplanations.slice(offset, offset + query.limit);
        const leaveAccounts = createLeaveAccounts(
          leaveEntries,
          context.organization.id,
          employee.id,
        );
        const leaveLedgerEntries = leaveAccounts.flatMap(({ entries, name }) =>
          entries.map(({ entryId: _entryId, ...entry }) =>
            Object.freeze({ absenceTypeName: name, ...entry }),
          ),
        );

        return Object.freeze({
          balance: Object.freeze({
            eligibleProjectedMinutes,
            excludedIncompleteDates: incompleteDates,
            postedBalanceMinutes: totals.value.closingBalanceMinutes,
            projectedBalanceMinutes,
          }),
          ledger: Object.freeze({
            entries: pageEntries.map((entry) => {
              const sourceEntry = ledgerEntries.find(
                (candidate) => candidate.entryId === entry.entryId,
              );
              if (sourceEntry === undefined) {
                throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
              }
              return Object.freeze({
                balanceAfterMinutes: entry.balanceAfterMinutes,
                effectiveDate: entry.effectiveDate,
                entryType: entry.entryType,
                explanationCode: entry.explanationCode,
                minutes: entry.amountMinutes,
                postedAt: sourceEntry.recordedAt,
              });
            }),
            limit: query.limit,
            page: query.page,
            total: totals.value.entryExplanations.length,
          }),
          leave: Object.freeze({
            accounts: leaveAccounts.map(({ name, totals: leaveTotals }) =>
              Object.freeze({
                availableMinutes: leaveTotals.availableMinutes,
                name,
                projectedRemainingMinutes: leaveTotals.projectedRemainingMinutes,
                reservedMinutes: leaveTotals.reservedMinutes,
              }),
            ),
            ledger: Object.freeze({
              entries: leaveLedgerEntries.slice(offset, offset + query.limit),
              limit: query.limit,
              page: query.page,
              total: leaveLedgerEntries.length,
            }),
          }),
          period: Object.freeze({
            ...period,
            monthlyPeriodId: monthlyPeriod?.id ?? null,
            view: query.view,
          }),
          records,
          summary: Object.freeze({
            completeBalanceMinutes,
            incompleteRecordCount: incompleteDates.length,
            recordedDayCount: periodProjections.length,
          }),
          timeZone: timeZone.value,
        });
      });
    },
  });
}

function createLeaveAccounts(
  entries: readonly LeaveEntitlementEntryRecord[],
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
) {
  const byAbsenceType = new Map<string, { entries: LeaveEntitlementEntryRecord[]; name: string }>();
  for (const entry of entries) {
    const key = String(entry.absenceTypeId);
    const account = byAbsenceType.get(key) ?? { entries: [], name: entry.absenceTypeName };
    account.entries.push(entry);
    byAbsenceType.set(key, account);
  }

  return [...byAbsenceType.values()]
    .map(({ entries: accountEntries, name }) => {
      const absenceTypeId = accountEntries[0]?.absenceTypeId;
      if (absenceTypeId === undefined) {
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      }
      const totals = calculateLeaveEntitlementLedger({
        absenceTypeId,
        entries: accountEntries,
        organizationId,
        subjectEmployeeId: employeeId,
      });
      if (!totals.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      return Object.freeze({ entries: totals.value.entryExplanations, name, totals: totals.value });
    })
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function parseMyTimeIdentity(accountIdValue: string, sessionFresh: boolean): MyTimeIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

function getPeriod(localDate: LocalDate, view: MyTimeQuery['view']) {
  const startDate = view === 'WEEK' ? startOfLocalWeek(localDate) : startOfLocalMonth(localDate);
  if (view === 'WEEK') return Object.freeze({ endDate: addLocalDateDays(startDate, 6), startDate });

  let endDate = addLocalDateDays(startDate, 27);
  while (addLocalDateDays(endDate, 1).slice(0, 7) === startDate.slice(0, 7)) {
    endDate = addLocalDateDays(endDate, 1);
  }
  return Object.freeze({ endDate, startDate });
}

function listPeriodDates(startDate: LocalDate, endDate: LocalDate): readonly LocalDate[] {
  const dates: LocalDate[] = [];
  for (let date = startDate; date <= endDate; date = addLocalDateDays(date, 1)) dates.push(date);
  return Object.freeze(dates);
}

function sumSignedMinutes(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  const parsed = parseSignedMinutes(total);
  if (!parsed.ok)
    throw new WorkLedgerApiError({ code: 'TIME_ACCOUNT_LEDGER_TOTAL_INVALID', statusCode: 503 });
  return parsed.value;
}

function requireActiveEmployeeContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE') {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  return context;
}
