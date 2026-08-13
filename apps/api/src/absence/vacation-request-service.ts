import {
  calculateLeaveEntitlementLedger,
  calculateVacationRequest,
  createAbsenceTypeVersion,
  createLocalDateRange,
  parseDomainId,
  parseLocalDate,
  parseSignedMinutes,
  resolveEffectiveAbsenceTypeVersion,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';
import type { SubmitVacationRequest, SubmittedVacationRequest } from '@workledger/contracts';

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type VacationRequestIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export interface VacationRequestService {
  submit(
    identity: VacationRequestIdentity,
    input: SubmitVacationRequest,
    at: Instant,
  ): Promise<SubmittedVacationRequest>;
}

export function createVacationRequestService(database: WorkLedgerDatabase): VacationRequestService {
  return Object.freeze({
    async submit(identity: VacationRequestIdentity, input: SubmitVacationRequest, at: Instant) {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const employee = context.employee;
          if (employee === null) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }
          const authorization = authorizeEmployeeTarget({
            action: 'ABSENCE_REQUEST',
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
          if (!authorization.allowed) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }
          const startDate = requireLocalDate(input.startDate);
          const endDate = requireLocalDate(input.endDate);

          const configuration = await transaction.absenceRequests.loadVacationConfiguration({
            employeeId: employee.id,
            endDate,
            organizationId: context.organization.id,
            startDate,
          });
          const versions = configuration.absenceTypes.map((record) => {
            const effectiveRange = createLocalDateRange(record.validFrom, record.validTo);
            if (!effectiveRange.ok) {
              throw new WorkLedgerApiError({
                code: 'POLICY_CONFIGURATION_INVALID',
                statusCode: 422,
              });
            }
            const version = createAbsenceTypeVersion(
              record.id,
              'VACATION',
              record.name,
              effectiveRange.value,
              record.active,
              record.policy,
            );
            if (!version.ok) {
              throw new WorkLedgerApiError({
                code: 'POLICY_CONFIGURATION_INVALID',
                statusCode: 422,
              });
            }
            return version.value;
          });
          const absenceType = resolveEffectiveAbsenceTypeVersion(versions, 'VACATION', startDate);
          if (!absenceType.ok) {
            throw new WorkLedgerApiError({
              code:
                absenceType.error.code === 'ABSENCE_POLICY_INACTIVE'
                  ? 'ABSENCE_POLICY_INACTIVE'
                  : 'POLICY_CONFIGURATION_INVALID',
              statusCode: 422,
            });
          }
          if (
            absenceType.value.policy.workflow !== 'APPROVAL_REQUIRED' ||
            absenceType.value.policy.pendingReservationBehavior !== 'RESERVE_PENDING'
          ) {
            throw new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 });
          }

          const calculation = calculateVacationRequest({
            endDate,
            holidayDates: configuration.holidayDates,
            scheduleAssignments: configuration.scheduleAssignments,
            startDate,
          });
          if (!calculation.ok) throw vacationCalculationError(calculation.error.code);
          const localDates = calculation.value.coverage.map(({ localDate }) => localDate);
          if (
            await transaction.absenceRequests.hasCoverageConflict(
              context.organization.id,
              employee.id,
              localDates,
            )
          ) {
            throw new WorkLedgerApiError({ code: 'ABSENCE_OVERLAP', statusCode: 422 });
          }

          const submitted = await transaction.absenceRequests.submitVacation({
            absenceTypeId: absenceType.value.id,
            coverage: calculation.value.coverage,
            employeeId: employee.id,
            organizationId: context.organization.id,
            requestedByEmployeeId: employee.id,
            submittedAt: at,
          });
          const existingEntries = await transaction.leaveEntitlements.listForEmployee(
            context.organization.id,
            employee.id,
          );
          const ledgerBefore = calculateLeaveEntitlementLedger({
            absenceTypeId: absenceType.value.id,
            entries: existingEntries.filter(
              (entry) => entry.absenceTypeId === absenceType.value.id,
            ),
            organizationId: context.organization.id,
            subjectEmployeeId: employee.id,
          });
          if (!ledgerBefore.ok) {
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          }

          let projectedRemainingMinutes = ledgerBefore.value.projectedRemainingMinutes;
          if (calculation.value.entitlementMinutes > 0) {
            const entryId = requireDomainId<'LeaveEntitlementEntry'>(
              globalThis.crypto.randomUUID(),
            );
            const sourceId = requireDomainId<'LeaveEntitlementSource'>(submitted.id);
            const amount = parseSignedMinutes(-calculation.value.entitlementMinutes);
            if (!amount.ok)
              throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
            const reservation = {
              absenceTypeId: absenceType.value.id,
              effectiveOn: startDate,
              entryId,
              entryType: 'PENDING_RESERVATION' as const,
              minutes: amount.value,
              organizationId: context.organization.id,
              postedAt: at,
              sourceId,
              subjectEmployeeId: employee.id,
            };
            const ledgerAfter = calculateLeaveEntitlementLedger({
              absenceTypeId: absenceType.value.id,
              entries: [
                ...existingEntries.filter((entry) => entry.absenceTypeId === absenceType.value.id),
                reservation,
              ],
              organizationId: context.organization.id,
              subjectEmployeeId: employee.id,
            });
            if (!ledgerAfter.ok)
              throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
            await transaction.leaveEntitlements.append({ entry: reservation });
            projectedRemainingMinutes = ledgerAfter.value.projectedRemainingMinutes;
          }
          await transaction.audit.appendDomain({
            actionCode: 'VACATION_REQUEST_SUBMITTED',
            actor: {
              accountId: context.accountId,
              kind: 'ACCOUNT',
              role: auditRole(context.roles),
            },
            facts: {
              effectiveDate: startDate,
              minutes: calculation.value.entitlementMinutes,
              sourceCount: calculation.value.coverage.length,
              version: submitted.version,
            },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: false,
            reasonCode: 'EMPLOYEE_SUBMITTED',
            requestId: null,
            restrictedReasonId: null,
            subjectEmployeeId: employee.id,
            targetId: submitted.id,
            targetKind: 'ABSENCE_REQUEST',
          });
          return Object.freeze({
            coverage: calculation.value.coverage.map((coverage) => ({
              entitlementMinutes: coverage.entitlementMinutes,
              holiday: coverage.holiday,
              localDate: coverage.localDate,
              scheduledMinutes: coverage.scheduledMinutes,
            })),
            entitlementMinutes: calculation.value.entitlementMinutes,
            id: submitted.id,
            projectedRemainingMinutes,
            status: 'PENDING_APPROVAL' as const,
            submittedAt: submitted.submittedAt,
          });
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
    },
  });
}

export function parseVacationRequestIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): VacationRequestIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
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

function requireDomainId<Kind extends string>(value: string): DomainId<Kind> {
  const parsed = parseDomainId<Kind>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return parsed.value;
}

function requireLocalDate(value: string) {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.value;
}

function vacationCalculationError(code: string): WorkLedgerApiError {
  const apiCode =
    code === 'SCHEDULE_NOT_ASSIGNED' || code === 'SCHEDULE_ASSIGNMENT_OVERLAP'
      ? code
      : 'ABSENCE_COVERAGE_INVALID';
  return new WorkLedgerApiError({ code: apiCode, statusCode: 422 });
}

function auditRole(
  roles: readonly ('EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR')[],
) {
  if (roles.includes('EMPLOYEE')) return 'EMPLOYEE' as const;
  if (roles.includes('MANAGER')) return 'MANAGER' as const;
  if (roles.includes('HR_ADMINISTRATOR')) return 'HR_ADMINISTRATOR' as const;
  return null;
}
