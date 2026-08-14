import {
  reportRecordIssueCodeSchema,
  type ReportCatalog,
  type ReportCatalogItem,
  type ReportKey,
  type ReportQuery,
  type ReportResult,
} from '@workledger/contracts';
import {
  addLocalDateDays,
  localDateAtInstant,
  parseDomainId,
  parseLocalDate,
  parseTimeZoneId,
  startOfLocalMonth,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  EmployeeAuthorizationScope,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { employeeCollectionScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

const MAX_REPORT_EMPLOYEES = 500;

function reportCatalogItem(item: ReportCatalogItem): ReportCatalogItem {
  return Object.freeze(item);
}

const REPORT_CATALOG: readonly ReportCatalogItem[] = Object.freeze([
  reportCatalogItem({
    availableSorts: ['EMPLOYEE', 'DATE', 'VALUE', 'STATUS'],
    defaultSort: 'DATE',
    description:
      'Monthly expected, worked, credited, and balance minutes with workflow and post-lock adjustment context.',
    key: 'monthly-time',
    title: 'Monthly time',
  }),
  reportCatalogItem({
    availableSorts: ['EMPLOYEE', 'VALUE'],
    defaultSort: 'EMPLOYEE',
    description:
      'Opening, in-range change, and closing flexible-time balances from the append-only time account.',
    key: 'flexible-time',
    title: 'Flexible time',
  }),
  reportCatalogItem({
    availableSorts: ['EMPLOYEE', 'VALUE'],
    defaultSort: 'EMPLOYEE',
    description:
      'Leave availability, reservation, and projected balances without sickness classification or request detail.',
    key: 'leave',
    title: 'Leave balances',
  }),
  reportCatalogItem({
    availableSorts: ['EMPLOYEE', 'DATE'],
    defaultSort: 'DATE',
    description:
      'Incomplete daily records that need attention in the selected range, without private workflow detail.',
    key: 'missing-records',
    title: 'Missing records',
  }),
  reportCatalogItem({
    availableSorts: ['EMPLOYEE', 'DATE'],
    defaultSort: 'DATE',
    description:
      'Current actionable correction, absence, cancellation, and monthly approvals in reviewer scope.',
    key: 'pending-approvals',
    title: 'Pending approvals',
  }),
]);

export type ReportIdentity = Readonly<{ accountId: DomainId<'Account'> }>;

export function createReportService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async catalog(identity: ReportIdentity, at: Instant): Promise<ReportCatalog> {
      return database.transaction(
        async (transaction) => {
          const state = await reportContext(transaction, identity, at);
          const timeScope = employeeCollectionScope('REPORT_TIME_RUN', state.actor);
          if (timeScope === null) throw denied();
          const includesPending =
            employeeCollectionScope('REPORT_PENDING_RUN', state.actor) !== null;
          const from = startOfLocalMonth(state.localDate);
          const nextMonth = startOfLocalMonth(addLocalDateDays(from, 32));
          return Object.freeze({
            defaultRange: Object.freeze({ from, to: addLocalDateDays(nextMonth, -1) }),
            reports: REPORT_CATALOG.filter(
              ({ key }) => key !== 'pending-approvals' || includesPending,
            ),
            timeZone: state.timeZone,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },

    async run(
      identity: ReportIdentity,
      key: ReportKey,
      query: ReportQuery,
      at: Instant,
    ): Promise<ReportResult> {
      return database.transaction(
        async (transaction) => {
          const state = await reportContext(transaction, identity, at);
          const definition = REPORT_CATALOG.find((candidate) => candidate.key === key);
          if (definition === undefined) {
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
          }
          if (!definition.availableSorts.includes(query.sort)) {
            throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
          }
          const action = key === 'pending-approvals' ? 'REPORT_PENDING_RUN' : 'REPORT_TIME_RUN';
          const scope = employeeCollectionScope(action, state.actor);
          if (scope === null) throw denied();
          const page =
            key === 'pending-approvals'
              ? await pendingApprovalReport(transaction, state, scope, query)
              : await employeeReport(transaction, state, scope, key, query);
          return Object.freeze({
            generatedAt: at,
            key,
            pagination: Object.freeze({
              limit: query.limit,
              page: query.page,
              total: page.total,
              totalPages: Math.ceil(page.total / query.limit),
            }),
            partial: page.summary.kind === 'MONTHLY_TIME' && page.summary.incompleteRecordCount > 0,
            range: Object.freeze({ from: query.from, to: query.to }),
            rows: page.rows,
            scope,
            summary: page.summary,
            timeZone: state.timeZone,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseReportIdentity(accountIdValue: string): ReportIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value });
}

async function employeeReport(
  transaction: WorkLedgerTransaction,
  state: Awaited<ReturnType<typeof reportContext>>,
  scope: EmployeeAuthorizationScope,
  key: Exclude<ReportKey, 'pending-approvals'>,
  query: ReportQuery,
): Promise<Pick<ReportResult, 'rows' | 'summary'> & { total: number }> {
  const authorizedEmployeeIds = restrictToTargetEmployee(
    await reportEmployeeIds(transaction, state, scope),
    query.employeeId,
  );
  const input = Object.freeze({
    authorizedEmployeeIds,
    direction: query.direction,
    from: parseReportDate(query.from),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
    organizationId: state.context.organization.id,
    sort: query.sort,
    to: parseReportDate(query.to),
  });
  if (key === 'monthly-time') {
    const result = await transaction.reports.listMonthlyTime(input);
    return Object.freeze({
      rows: result.items.map((row) =>
        Object.freeze({
          balanceMinutes: row.balanceMinutes,
          creditedMinutes: row.creditedMinutes,
          employeeDisplayName: row.employeeDisplayName,
          expectedMinutes: row.expectedMinutes,
          incompleteRecordCount: row.incompleteRecordCount,
          kind: 'MONTHLY_TIME' as const,
          monthStart: row.monthStart,
          monthlyPeriodId: row.monthlyPeriodId,
          postLockDeltaMinutes: row.postLockDeltaMinutes,
          workedMinutes: row.workedMinutes,
          workflowStatus: row.workflowStatus,
        }),
      ),
      summary: Object.freeze({ kind: 'MONTHLY_TIME' as const, ...result.summary }),
      total: result.total,
    });
  }
  if (key === 'flexible-time') {
    const result = await transaction.reports.listFlexibleTime(input);
    return Object.freeze({
      rows: result.items.map((row) =>
        Object.freeze({
          closingBalanceMinutes: row.closingBalanceMinutes,
          employeeDisplayName: row.employeeDisplayName,
          kind: 'FLEXIBLE_TIME' as const,
          openingBalanceMinutes: row.openingBalanceMinutes,
          rangeChangeMinutes: row.rangeChangeMinutes,
        }),
      ),
      summary: Object.freeze({ kind: 'FLEXIBLE_TIME' as const, ...result.summary }),
      total: result.total,
    });
  }
  if (key === 'leave') {
    const result = await transaction.reports.listLeave(input);
    return Object.freeze({
      rows: result.items.map((row) =>
        Object.freeze({
          accountName: row.accountName,
          availableChangeMinutes: row.availableChangeMinutes,
          closingAvailableMinutes: row.closingAvailableMinutes,
          employeeDisplayName: row.employeeDisplayName,
          kind: 'LEAVE' as const,
          openingAvailableMinutes: row.openingAvailableMinutes,
          projectedRemainingMinutes: row.projectedRemainingMinutes,
          reservedMinutes: row.reservedMinutes,
        }),
      ),
      summary: Object.freeze({ kind: 'LEAVE' as const, ...result.summary }),
      total: result.total,
    });
  }
  const result = await transaction.reports.listMissingRecords(input);
  return Object.freeze({
    rows: result.items.map((row) =>
      Object.freeze({
        employeeDisplayName: row.employeeDisplayName,
        expectedMinutes: row.expectedMinutes,
        kind: 'MISSING_RECORD' as const,
        localDate: row.localDate,
        status: 'INCOMPLETE' as const,
        warningCodes: row.warningCodes.map((code) => reportRecordIssueCodeSchema.parse(code)),
        workedMinutes: row.workedMinutes,
      }),
    ),
    summary: Object.freeze({ kind: 'MISSING_RECORD' as const, recordCount: result.total }),
    total: result.total,
  });
}

async function pendingApprovalReport(
  transaction: WorkLedgerTransaction,
  state: Awaited<ReturnType<typeof reportContext>>,
  scope: EmployeeAuthorizationScope,
  query: ReportQuery,
): Promise<Pick<ReportResult, 'rows' | 'summary'> & { total: number }> {
  const employeeId = targetEmployee(
    await reportEmployeeIds(transaction, state, scope),
    query.employeeId,
  );
  if (employeeId !== null && employeeId === state.actor.employeeId) throw denied();
  const result = await transaction.approvalInbox.list({
    actorEmployeeId: state.actor.employeeId,
    direction: query.direction,
    employeeId,
    from: parseReportDate(query.from),
    limit: query.limit,
    localDate: state.localDate,
    offset: (query.page - 1) * query.limit,
    organizationId: state.context.organization.id,
    scope,
    sort: query.sort === 'EMPLOYEE' ? 'EMPLOYEE' : 'AFFECTED_DATE',
    status: 'ACTION_REQUIRED',
    teamId: null,
    to: parseReportDate(query.to),
    type: 'ALL',
  });
  return Object.freeze({
    rows: result.items.map((row) =>
      Object.freeze({
        affectedEndDate: row.affectedEndDate,
        affectedStartDate: row.affectedStartDate,
        approvalId: row.id,
        approvalKind: row.type,
        employeeDisplayName: row.employeeDisplayName,
        kind: 'PENDING_APPROVAL' as const,
        submittedAt: row.submittedAt,
        version: row.version,
      }),
    ),
    summary: Object.freeze({ itemCount: result.total, kind: 'PENDING_APPROVAL' as const }),
    total: result.total,
  });
}

async function reportEmployeeIds(
  transaction: WorkLedgerTransaction,
  state: Awaited<ReturnType<typeof reportContext>>,
  scope: EmployeeAuthorizationScope,
) {
  const employeeIds = await transaction.authorization.listAuthorizedEmployeeIds({
    actorEmployeeId: state.actor.employeeId,
    limit: MAX_REPORT_EMPLOYEES + 1,
    localDate: state.localDate,
    offset: 0,
    organizationId: state.context.organization.id,
    scope,
  });
  if (employeeIds.length > MAX_REPORT_EMPLOYEES) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  return employeeIds;
}

function targetEmployee(
  authorizedEmployeeIds: readonly DomainId<'Employee'>[],
  employeeIdValue: string | undefined,
): DomainId<'Employee'> | null {
  if (employeeIdValue === undefined) return null;
  const parsed = parseDomainId<'Employee'>(employeeIdValue);
  if (!parsed.ok) {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }
  if (!authorizedEmployeeIds.includes(parsed.value)) throw denied();
  return parsed.value;
}

function restrictToTargetEmployee(
  authorizedEmployeeIds: readonly DomainId<'Employee'>[],
  employeeIdValue: string | undefined,
): readonly DomainId<'Employee'>[] {
  const target = targetEmployee(authorizedEmployeeIds, employeeIdValue);
  return target === null ? authorizedEmployeeIds : Object.freeze([target]);
}

async function reportContext(
  transaction: WorkLedgerTransaction,
  identity: ReportIdentity,
  at: Instant,
) {
  const context = requireActiveContext(
    await transaction.accountSelfService.findContext(identity.accountId, at),
  );
  const parsedTimeZone = parseTimeZoneId(context.organization.timeZone);
  if (!parsedTimeZone.ok) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  const localDate = localDateAtInstant(at, parsedTimeZone.value);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    context.accountId,
    localDate,
  );
  if (actor === null) throw denied();
  return Object.freeze({
    actor,
    context,
    localDate,
    timeZone: parsedTimeZone.value,
  });
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function parseReportDate(value: string): LocalDate {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }
  return parsed.value;
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
