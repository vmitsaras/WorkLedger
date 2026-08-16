import type {
  AbsenceSettingsAdminDetail,
  AdministrationActionResult,
  CreateAbsenceTypeVersionAdminRequest,
  CreateEntitlementAdjustmentAdminRequest,
  EmployeeEntitlementAdminDetail,
  CreateHolidayAdminRequest,
  HolidayImpactPreviewAdmin,
  HolidayImpactPreviewAdminRequest,
  HolidaySettingsAdminDetail,
} from '@workledger/contracts';
import {
  calculateLeaveEntitlementLedger,
  createAbsenceTypeVersion,
  createLocalDateRange,
  localDateAtInstant,
  parseSignedMinutes,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AuthorizationActorRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { authorizeEmployeeTarget, authorizeInstallationAction } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type AbsenceAdministrationIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  fresh: boolean;
}>;

export function createAbsenceAdministrationService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async getSettings(
      identity: AbsenceAdministrationIdentity,
      at: Instant,
    ): Promise<AbsenceSettingsAdminDetail> {
      return database.transaction(async (transaction) => {
        const { context, localDate } = await requireOrganizationConfiguration(
          transaction,
          identity,
          at,
        );
        return Object.freeze({
          asOfLocalDate: localDate,
          versions: (
            await transaction.administration.listAbsenceTypeVersions(context.organization.id)
          ).map(mapAbsenceVersion),
        });
      });
    },

    async getHolidaySettings(
      identity: AbsenceAdministrationIdentity,
      at: Instant,
    ): Promise<HolidaySettingsAdminDetail> {
      return database.transaction(async (transaction) => {
        const { context, localDate } = await requireOrganizationConfiguration(
          transaction,
          identity,
          at,
        );
        return Object.freeze({
          asOfLocalDate: localDate,
          holidays: [...(await transaction.administration.listHolidays(context.organization.id))],
        });
      });
    },

    async previewHolidayImpact(
      identity: AbsenceAdministrationIdentity,
      input: HolidayImpactPreviewAdminRequest,
      at: Instant,
    ): Promise<HolidayImpactPreviewAdmin> {
      return database.transaction(async (transaction) => {
        const { context, localDate } = await requireOrganizationConfiguration(
          transaction,
          identity,
          at,
        );
        const impact = await transaction.administration.previewHolidayImpact(
          context.organization.id,
          input.holidayDate as LocalDate,
        );
        return mapHolidayImpact(input.holidayDate as LocalDate, localDate, impact);
      });
    },

    async createHoliday(
      identity: AbsenceAdministrationIdentity,
      input: CreateHolidayAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const { actor, context, localDate } = await requireOrganizationConfiguration(
            transaction,
            identity,
            at,
          );
          const impact = await transaction.administration.previewHolidayImpact(
            context.organization.id,
            input.holidayDate as LocalDate,
          );
          const preview = mapHolidayImpact(input.holidayDate as LocalDate, localDate, impact);
          if (!preview.mutationAllowed)
            throw new WorkLedgerApiError({ code: 'HOLIDAY_CHANGE_BLOCKED', statusCode: 409 });
          const created = await transaction.administration.createHoliday({
            holidayDate: input.holidayDate as LocalDate,
            name: input.name.trim(),
            organizationId: context.organization.id,
          });
          if (created === null)
            throw new WorkLedgerApiError({ code: 'HOLIDAY_DATE_CONFLICT', statusCode: 409 });
          await transaction.audit.appendDomain({
            actionCode: 'HOLIDAY_CREATED',
            actor: hrActor(actor),
            facts: {
              effectiveDate: created.holidayDate,
              sourceCount: preview.affectedProjectionCount,
            },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: null,
            targetId: created.id,
            targetKind: 'CONFIGURATION',
          });
          return result('HOLIDAY_CREATED', created.id, at);
        }, serializableRetry);
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async createAbsenceTypeVersion(
      identity: AbsenceAdministrationIdentity,
      input: CreateAbsenceTypeVersionAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const { actor, context, localDate } = await requireOrganizationConfiguration(
            transaction,
            identity,
            at,
          );
          if (input.effectiveFrom < localDate)
            throw new WorkLedgerApiError({
              code: 'ASSIGNMENT_EFFECTIVE_DATE_INVALID',
              statusCode: 409,
            });
          const range = createLocalDateRange(input.effectiveFrom as LocalDate, null);
          if (!range.ok)
            throw new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 });
          const validated = createAbsenceTypeVersion(
            requestId as unknown as DomainId<'AbsenceTypeVersion'>,
            input.code,
            input.name,
            range.value,
            input.active,
            input.policy,
          );
          if (!validated.ok)
            throw new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 });
          const created = await transaction.administration.createAbsenceTypeVersion({
            active: validated.value.active,
            code: validated.value.code,
            name: validated.value.name,
            organizationId: context.organization.id,
            policy: validated.value.policy,
            validFrom: input.effectiveFrom as LocalDate,
          });
          if (created === null)
            throw new WorkLedgerApiError({
              code: 'ABSENCE_TYPE_VERSION_CONFLICT',
              statusCode: 409,
            });
          await transaction.audit.appendDomain({
            actionCode: 'ABSENCE_TYPE_VERSION_CREATED',
            actor: hrActor(actor),
            facts: { effectiveDate: created.validFrom, version: created.version },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: null,
            requestId,
            restrictedReasonId: null,
            subjectEmployeeId: null,
            targetId: created.id,
            targetKind: 'CONFIGURATION',
          });
          return result('ABSENCE_TYPE_VERSION_CREATED', created.id, at);
        }, serializableRetry);
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async getEmployeeEntitlements(
      identity: AbsenceAdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      at: Instant,
    ): Promise<EmployeeEntitlementAdminDetail> {
      return database.transaction(async (transaction) => {
        const { actor, context, localDate } = await requireEmployeeConfiguration(
          transaction,
          identity,
          employeeId,
          at,
          'EMPLOYEE_PROFILE_READ',
        );
        const entries = await transaction.administration.listEmployeeEntitlements(
          context.organization.id,
          employeeId,
        );
        if (entries === null)
          throw new WorkLedgerApiError({ code: 'EMPLOYEE_NOT_FOUND', statusCode: 404 });
        const versions = await transaction.administration.listAbsenceTypeVersions(
          context.organization.id,
        );
        return mapEntitlements(
          entries,
          versions,
          context.organization.id,
          employeeId,
          localDate,
          actor.employeeId !== employeeId,
        );
      });
    },

    async createEntitlementAdjustment(
      identity: AbsenceAdministrationIdentity,
      employeeId: DomainId<'Employee'>,
      input: CreateEntitlementAdjustmentAdminRequest,
      at: Instant,
      requestId: DomainId<'Request'>,
    ): Promise<AdministrationActionResult> {
      try {
        return await database.transaction(async (transaction) => {
          const { actor, context, localDate } = await requireEmployeeConfiguration(
            transaction,
            identity,
            employeeId,
            at,
            'EMPLOYEE_CONFIGURATION_ASSIGN',
          );
          if (input.effectiveOn < localDate)
            throw new WorkLedgerApiError({
              code: 'ASSIGNMENT_EFFECTIVE_DATE_INVALID',
              statusCode: 409,
            });
          const minutes = parseSignedMinutes(input.minutes);
          if (!minutes.ok || minutes.value === 0)
            throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
          const sourceId = crypto.randomUUID() as DomainId<'LeaveEntitlementSource'>;
          const entryId = crypto.randomUUID() as DomainId<'LeaveEntitlementEntry'>;
          const created = await transaction.administration.createEntitlementAdjustment({
            absenceTypeId: input.absenceTypeId as DomainId<'AbsenceTypeVersion'>,
            actorAccountId: identity.accountId,
            effectiveOn: input.effectiveOn as LocalDate,
            employeeId,
            entryId,
            minutes: minutes.value,
            organizationId: context.organization.id,
            reason: input.reason.trim(),
            sourceId,
          });
          if (created === null)
            throw new WorkLedgerApiError({
              code: 'ENTITLEMENT_ADJUSTMENT_CONFLICT',
              statusCode: 409,
            });
          const allEntries = await transaction.leaveEntitlements.listForEmployee(
            context.organization.id,
            employeeId,
          );
          const accountEntries = allEntries.filter(
            (entry) => entry.absenceTypeId === created.absenceTypeId,
          );
          const ledger = calculateLeaveEntitlementLedger({
            absenceTypeId: created.absenceTypeId,
            entries: accountEntries,
            organizationId: context.organization.id,
            subjectEmployeeId: employeeId,
          });
          if (!ledger.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          await transaction.audit.appendDomain({
            actionCode: 'ENTITLEMENT_ADJUSTMENT_CREATED',
            actor: hrActor(actor),
            facts: { effectiveDate: created.effectiveOn, minutes: created.minutes },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: true,
            reasonCode: 'MANUAL_ENTITLEMENT_ADJUSTMENT',
            requestId,
            restrictedReasonId: sourceId as unknown as DomainId<'RestrictedReason'>,
            subjectEmployeeId: employeeId,
            targetId: created.entryId,
            targetKind: 'LEAVE_ENTITLEMENT',
          });
          return result('ENTITLEMENT_ADJUSTMENT_CREATED', created.entryId, at);
        }, serializableRetry);
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
  });
}

async function requireContext(
  transaction: WorkLedgerTransaction,
  identity: AbsenceAdministrationIdentity,
  at: Instant,
) {
  const context = await transaction.accountSelfService.findContext(identity.accountId, at);
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return context;
}

async function requireOrganizationConfiguration(
  transaction: WorkLedgerTransaction,
  identity: AbsenceAdministrationIdentity,
  at: Instant,
) {
  const context = await requireContext(transaction, identity, at);
  const localDate = organizationDate(at, context.organization.timeZone);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    identity.accountId,
    localDate,
  );
  if (
    actor === null ||
    !authorizeInstallationAction('ORGANIZATION_CONFIGURATION_MANAGE', actor).allowed
  )
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return { actor, context, localDate } as const;
}

async function requireEmployeeConfiguration(
  transaction: WorkLedgerTransaction,
  identity: AbsenceAdministrationIdentity,
  employeeId: DomainId<'Employee'>,
  at: Instant,
  action: 'EMPLOYEE_CONFIGURATION_ASSIGN' | 'EMPLOYEE_PROFILE_READ',
) {
  const context = await requireContext(transaction, identity, at);
  const localDate = organizationDate(at, context.organization.timeZone);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    identity.accountId,
    localDate,
  );
  if (actor === null) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  const decision = authorizeEmployeeTarget({
    action,
    actor,
    isCurrentManager: false,
    sessionFresh: identity.fresh,
    targetEmployeeId: employeeId,
    targetOrganizationId: context.organization.id,
  });
  if (!decision.allowed) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return { actor, context, localDate } as const;
}

function mapEntitlements(
  entries: Awaited<
    ReturnType<WorkLedgerTransaction['administration']['listEmployeeEntitlements']>
  > &
    readonly unknown[],
  versions: Awaited<ReturnType<WorkLedgerTransaction['administration']['listAbsenceTypeVersions']>>,
  organizationId: DomainId<'Organization'>,
  employeeId: DomainId<'Employee'>,
  localDate: LocalDate,
  privilegedActionsAllowed: boolean,
): EmployeeEntitlementAdminDetail {
  const typedEntries = entries as Exclude<
    Awaited<ReturnType<WorkLedgerTransaction['administration']['listEmployeeEntitlements']>>,
    null
  >;
  const adjustable = versions.filter(
    (version) =>
      version.active &&
      version.validFrom <= localDate &&
      (version.validTo === null || localDate < version.validTo) &&
      version.code !== 'SICKNESS' &&
      version.policy.entitlementAccountCategory !== null,
  );
  const accountTypes = [...adjustable];
  for (const entry of typedEntries) {
    const historical = versions.find((version) => version.id === entry.absenceTypeId);
    if (historical !== undefined && !accountTypes.some((version) => version.id === historical.id)) {
      accountTypes.push(historical);
    }
  }
  const accounts = accountTypes.map((absenceType) => {
    const accountEntries = typedEntries.filter((entry) => entry.absenceTypeId === absenceType.id);
    const ledger = calculateLeaveEntitlementLedger({
      absenceTypeId: absenceType.id,
      entries: accountEntries,
      organizationId,
      subjectEmployeeId: employeeId,
    });
    if (!ledger.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
    return Object.freeze({
      absenceTypeId: absenceType.id,
      absenceTypeName: absenceType.name,
      availableMinutes: ledger.value.availableMinutes,
      entries: accountEntries.map((entry) => ({
        effectiveOn: entry.effectiveOn,
        entryType: entry.entryType,
        id: entry.entryId,
        minutes: entry.minutes,
        postedAt: entry.postedAt,
        reason: entry.reason,
      })),
      projectedRemainingMinutes: ledger.value.projectedRemainingMinutes,
      reservedMinutes: ledger.value.reservedMinutes,
    });
  });
  return Object.freeze({
    accounts,
    adjustableAbsenceTypes: adjustable.map(mapAbsenceVersion),
    asOfLocalDate: localDate,
    privilegedActionsAllowed,
  });
}

function mapAbsenceVersion(
  version: Awaited<
    ReturnType<WorkLedgerTransaction['administration']['listAbsenceTypeVersions']>
  >[number],
) {
  return Object.freeze({
    ...version,
    policy: Object.freeze({
      ...version.policy,
      allowedCoverageUnits: [...version.policy.allowedCoverageUnits],
    }),
  });
}

function organizationDate(at: Instant, value: string): LocalDate {
  const zone = parseTimeZoneId(value);
  if (!zone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return localDateAtInstant(at, zone.value);
}
function hrActor(actor: AuthorizationActorRecord) {
  return Object.freeze({
    accountId: actor.accountId,
    kind: 'ACCOUNT' as const,
    role: 'HR_ADMINISTRATOR' as const,
  });
}
function result(
  action: AdministrationActionResult['action'],
  targetId: string,
  occurredAt: Instant,
): AdministrationActionResult {
  return Object.freeze({ action, occurredAt, targetId });
}
function mapDatabaseError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
const serializableRetry = Object.freeze({
  isolationLevel: 'serializable' as const,
  retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' as const },
});

function mapHolidayImpact(
  holidayDate: LocalDate,
  localDate: LocalDate,
  impact: Awaited<ReturnType<WorkLedgerTransaction['administration']['previewHolidayImpact']>>,
): HolidayImpactPreviewAdmin {
  return Object.freeze({
    ...impact,
    holidayDate,
    mutationAllowed:
      holidayDate >= localDate && !impact.alreadyConfigured && impact.blockedPeriodCount === 0,
  });
}
