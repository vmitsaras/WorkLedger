import {
  addLocalDateDays,
  calculateAbsenceRequest,
  compareLocalDates,
  createAbsenceTypeVersion,
  createLocalDateRange,
  localDateAtInstant,
  parseDomainId,
  parseTimeZoneId,
  resolveEffectiveAbsenceTypeVersion,
  type DomainId,
  type Instant,
  type LocalDate,
  type AbsenceTypeVersion,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';
import type {
  AcknowledgeSicknessReport,
  SubmitSicknessReport,
  SubmittedSicknessReport,
} from '@workledger/contracts';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  asCoverageSegmentInput,
  assertCoverageAllowed,
  coverageDateRange,
  parseRequestCoverage,
} from './coverage.js';

export type SicknessReportIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export function createSicknessReportService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async report(identity: SicknessReportIdentity, input: SubmitSicknessReport, at: Instant) {
      return database.transaction(
        async (transaction): Promise<SubmittedSicknessReport> => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const employee = context.employee;
          if (employee === null) throw denied();
          assertSelfAuthorized(context, identity.sessionFresh, employee.id, 'ABSENCE_REQUEST');
          const requestCoverage = parseRequestCoverage(input);
          const { startDate, endDate } = coverageDateRange(requestCoverage);
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok)
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          const today = localDateAtInstant(at, timeZone.value);
          if (compareLocalDates(endDate, today) > 0) {
            throw new WorkLedgerApiError({ code: 'ABSENCE_RETROACTIVE_LIMIT', statusCode: 422 });
          }
          const configuration = await transaction.absenceRequests.loadConfiguration({
            absenceCode: 'SICKNESS',
            employeeId: employee.id,
            endDate,
            organizationId: context.organization.id,
            startDate,
          });
          const versions = configuration.absenceTypes.map((record) => {
            const range = createLocalDateRange(record.validFrom, record.validTo);
            if (!range.ok)
              throw new WorkLedgerApiError({
                code: 'POLICY_CONFIGURATION_INVALID',
                statusCode: 422,
              });
            const version = createAbsenceTypeVersion(
              record.id,
              'SICKNESS',
              record.name,
              range.value,
              record.active,
              record.policy,
            );
            if (!version.ok)
              throw new WorkLedgerApiError({
                code: 'POLICY_CONFIGURATION_INVALID',
                statusCode: 422,
              });
            return version.value;
          });
          const sicknessType = resolveSicknessType(versions, startDate);
          if (!sicknessType.ok) throw sicknessType.error;
          assertCoverageAllowed(sicknessType.value, requestCoverage);
          const minimumDate = addLocalDateDays(
            today,
            -sicknessType.value.policy.maximumRetrospectiveCalendarDays!,
          );
          if (compareLocalDates(startDate, minimumDate) < 0) {
            throw new WorkLedgerApiError({ code: 'ABSENCE_RETROACTIVE_LIMIT', statusCode: 422 });
          }
          const calculation = calculateAbsenceRequest({
            coverage: requestCoverage,
            holidayDates: configuration.holidayDates,
            scheduleAssignments: configuration.scheduleAssignments,
          });
          if (!calculation.ok) throw coverageError(calculation.error.code);
          if (
            await transaction.absenceRequests.hasCoverageConflict(
              context.organization.id,
              employee.id,
              calculation.value.coverage.map(asCoverageSegmentInput),
            )
          ) {
            throw new WorkLedgerApiError({ code: 'ABSENCE_OVERLAP', statusCode: 422 });
          }
          const report = await transaction.absenceRequests.submitSickness({
            absenceTypeId: sicknessType.value.id,
            coverage: calculation.value.coverage.map((coverage) => ({
              creditMinutes: coverage.entitlementMinutes,
              ...asCoverageSegmentInput(coverage),
            })),
            employeeId: employee.id,
            organizationId: context.organization.id,
            reportedAt: at,
            requestedByEmployeeId: employee.id,
          });
          await transaction.audit.appendDomain({
            actionCode: 'SICKNESS_REPORTED',
            actor: {
              accountId: context.accountId,
              kind: 'ACCOUNT',
              role: auditRole(context.roles),
            },
            facts: {
              effectiveDate: startDate,
              sourceCount: calculation.value.coverage.length,
              version: 1,
            },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: false,
            reasonCode: 'EMPLOYEE_REPORTED',
            requestId: null,
            restrictedReasonId: null,
            subjectEmployeeId: employee.id,
            targetId: report.id,
            targetKind: 'ABSENCE_REQUEST',
          });
          return Object.freeze({
            coverage: calculation.value.coverage.map((coverage) => ({
              creditMinutes: coverage.entitlementMinutes,
              endsAtMinute:
                coverage.kind === 'MINUTE_INTERVAL' ? (coverage.endsAtMinute ?? null) : null,
              holiday: coverage.holiday,
              kind: coverage.kind,
              localDate: coverage.localDate,
              startsAtMinute:
                coverage.kind === 'MINUTE_INTERVAL' ? (coverage.startsAtMinute ?? null) : null,
            })),
            id: report.id,
            reportedAt: at,
            status: 'REPORTED',
            version: report.version,
          });
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
    },
    async acknowledge(
      identity: SicknessReportIdentity,
      requestIdValue: string,
      input: AcknowledgeSicknessReport,
      at: Instant,
    ) {
      return database.transaction(async (transaction) => {
        const context = requireActiveAccountContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const actor = context.employee;
        const requestId = requireRequestId(requestIdValue);
        const report = await transaction.absenceRequests.findSicknessReport(
          context.organization.id,
          requestId,
        );
        if (report === null)
          throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
        const localDate = localDateAtInstant(at, requireTimeZone(context.organization.timeZone));
        const isCurrentManager =
          actor !== null &&
          (await transaction.authorization.isCurrentManager(
            context.organization.id,
            actor.id,
            report.employeeId,
            localDate,
          ));
        const decision = authorizeEmployeeTarget({
          action: 'ABSENCE_DECIDE',
          actor: {
            accountActive: context.accountActive,
            accountId: context.accountId,
            employeeCapabilityActive: context.employeeCapabilityActive,
            employeeId: actor?.id ?? null,
            organizationId: context.organization.id,
            roles: context.roles,
          },
          isCurrentManager,
          sessionFresh: identity.sessionFresh,
          targetEmployeeId: report.employeeId,
          targetOrganizationId: context.organization.id,
        });
        if (!decision.allowed) throw denied();
        const acknowledged = await transaction.absenceRequests.acknowledgeSickness(
          context.organization.id,
          requestId,
          {
            accountId: context.accountId,
            authority: decision.scope === 'ORGANIZATION_HR' ? 'ORGANIZATION_HR' : 'CURRENT_MANAGER',
            employeeId: actor?.id ?? null,
          },
          input.expectedVersion,
          at,
        );
        if (acknowledged === null) {
          throw new WorkLedgerApiError({ code: 'ABSENCE_STATE_CHANGED', statusCode: 409 });
        }
        await transaction.audit.appendDomain({
          actionCode: 'SICKNESS_ACKNOWLEDGED',
          actor: {
            accountId: context.accountId,
            kind: 'ACCOUNT',
            role: decision.scope === 'ORGANIZATION_HR' ? 'HR_ADMINISTRATOR' : 'MANAGER',
          },
          facts: { version: acknowledged.version },
          occurredAt: at,
          organizationId: context.organization.id,
          outcome: 'SUCCESS',
          privileged: decision.scope === 'ORGANIZATION_HR',
          reasonCode: 'REVIEWER_ACKNOWLEDGED',
          requestId: null,
          restrictedReasonId: null,
          subjectEmployeeId: report.employeeId,
          targetId: acknowledged.id,
          targetKind: 'ABSENCE_REQUEST',
        });
        return Object.freeze({
          id: acknowledged.id,
          status: 'ACKNOWLEDGED' as const,
          version: acknowledged.version,
        });
      });
    },
  });
}

export function parseSicknessReportIdentity(accountIdValue: string, sessionFresh: boolean) {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

function resolveSicknessType(records: readonly AbsenceTypeVersion[], date: LocalDate) {
  const type = resolveEffectiveAbsenceTypeVersion(records, 'SICKNESS', date);
  if (!type.ok)
    return {
      ok: false as const,
      error:
        type.error.code === 'ABSENCE_POLICY_INACTIVE'
          ? new WorkLedgerApiError({ code: 'ABSENCE_POLICY_INACTIVE', statusCode: 422 })
          : new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 }),
    };
  if (
    type.value.policy.workflow !== 'REPORT_AND_ACKNOWLEDGE' ||
    type.value.policy.requestNoteMode !== 'DISABLED' ||
    type.value.policy.maximumRetrospectiveCalendarDays === null
  )
    return {
      ok: false as const,
      error: new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 }),
    };
  return { ok: true as const, value: type.value };
}

function requireActiveEmployeeContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE') throw denied();
  return context;
}
function requireActiveAccountContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return context;
}
function assertSelfAuthorized(
  context: AccountSelfContextRecord,
  sessionFresh: boolean,
  employeeId: DomainId<'Employee'>,
  action: 'ABSENCE_REQUEST',
) {
  const result = authorizeEmployeeTarget({
    action,
    actor: {
      accountActive: context.accountActive,
      accountId: context.accountId,
      employeeCapabilityActive: context.employeeCapabilityActive,
      employeeId,
      organizationId: context.organization.id,
      roles: context.roles,
    },
    isCurrentManager: false,
    sessionFresh,
    targetEmployeeId: employeeId,
    targetOrganizationId: context.organization.id,
  });
  if (!result.allowed) throw denied();
}
function requireRequestId(value: string) {
  const parsed = parseDomainId<'AbsenceRequest'>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return parsed.value;
}
function requireTimeZone(value: string) {
  const parsed = parseTimeZoneId(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}
function coverageError(code: string) {
  return new WorkLedgerApiError({
    code:
      code === 'SCHEDULE_NOT_ASSIGNED' || code === 'SCHEDULE_ASSIGNMENT_OVERLAP'
        ? code
        : 'ABSENCE_COVERAGE_INVALID',
    statusCode: 422,
  });
}
function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
function auditRole(
  roles: readonly ('EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR')[],
) {
  if (roles.includes('EMPLOYEE')) return 'EMPLOYEE' as const;
  if (roles.includes('MANAGER')) return 'MANAGER' as const;
  if (roles.includes('HR_ADMINISTRATOR')) return 'HR_ADMINISTRATOR' as const;
  return null;
}
