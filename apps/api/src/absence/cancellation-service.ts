import {
  parseSignedMinutes,
  localDateAtInstant,
  parseDomainId,
  parseLocalDate,
  parseTimeZoneId,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import { createHash, randomUUID } from 'node:crypto';
import {
  AbsenceCancellationLockedPeriodError,
  AbsenceCancellationReopenPeriodError,
  type AccountSelfContextRecord,
  type AbsenceCancellationDecisionResult,
  type WorkLedgerDatabase,
  type WorkLedgerTransaction,
} from '@workledger/database';
import type {
  DecideAbsenceCancellation,
  SubmitAbsenceCancellation,
  WithdrawAbsenceCancellation,
} from '@workledger/contracts';

import { authorizeEmployeeTarget, type AuthorizationGrantScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type AbsenceCancellationIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export function createAbsenceCancellationService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async submit(
      identity: AbsenceCancellationIdentity,
      requestIdValue: string,
      input: SubmitAbsenceCancellation,
      at: Instant,
    ) {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const employee = context.employee;
          if (employee === null) throw denied();
          assertAuthorized(
            context,
            identity.sessionFresh,
            employee.id,
            employee.id,
            false,
            'ABSENCE_CANCEL_REQUEST',
          );
          const requestId = requireId<'AbsenceRequest'>(requestIdValue);
          const coverageSegmentIds =
            input.coverageSegmentIds === undefined
              ? null
              : input.coverageSegmentIds.map((id) => requireId<'AbsenceCoverageSegment'>(id));
          try {
            const cancellation = await transaction.absenceRequests.submitCancellation({
              coverageSegmentIds,
              employeeId: employee.id,
              expectedRequestVersion: input.expectedRequestVersion,
              organizationId: context.organization.id,
              requestId,
              requestedByEmployeeId: employee.id,
              submittedAt: at,
            });
            if (cancellation === null)
              throw new WorkLedgerApiError({ code: 'ABSENCE_CANNOT_CANCEL', statusCode: 409 });
            await appendAudit(
              transaction,
              context,
              employee.id,
              cancellation.id,
              at,
              'ABSENCE_CANCELLATION_REQUESTED',
              false,
              cancellation.version,
            );
            return toContract(cancellation);
          } catch (error) {
            if (error instanceof AbsenceCancellationLockedPeriodError) {
              throw new WorkLedgerApiError({ code: 'PERIOD_ADJUSTMENT_REQUIRED', statusCode: 409 });
            }
            if (error instanceof AbsenceCancellationReopenPeriodError) {
              throw new WorkLedgerApiError({ code: 'PERIOD_REOPEN_REQUIRED', statusCode: 409 });
            }
            throw error;
          }
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
    },
    async decide(
      identity: AbsenceCancellationIdentity,
      cancellationIdValue: string,
      input: DecideAbsenceCancellation,
      at: Instant,
    ) {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveAccountContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const actor = context.employee;
          const cancellationId = requireId<'AbsenceCancellation'>(cancellationIdValue);
          const cancellation = await transaction.absenceRequests.findCancellation(
            context.organization.id,
            cancellationId,
          );
          if (cancellation === null)
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok)
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          const isCurrentManager =
            actor !== null &&
            (await transaction.authorization.isCurrentManager(
              context.organization.id,
              actor.id,
              cancellation.employeeId,
              localDateAtInstant(at, timeZone.value),
            ));
          const decision = authorizeEmployeeTarget({
            action: 'ABSENCE_CANCEL_DECIDE',
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
            targetEmployeeId: cancellation.employeeId,
            targetOrganizationId: context.organization.id,
          });
          if (!decision.allowed) throw denied();
          const result = await transaction.absenceRequests.decideCancellation({
            action: input.action,
            actor: {
              accountId: context.accountId,
              authority:
                decision.scope === 'ORGANIZATION_HR' ? 'ORGANIZATION_HR' : 'CURRENT_MANAGER',
              employeeId: actor?.id ?? null,
            },
            cancellationId,
            decidedAt: at,
            expectedVersion: input.expectedVersion,
            organizationId: context.organization.id,
            reason: input.reason ?? null,
          });
          if (result === null)
            throw new WorkLedgerApiError({ code: 'ABSENCE_STATE_CHANGED', statusCode: 409 });
          if (result.restoration !== null) {
            const minutes = parseSignedMinutes(result.restoration.minutes);
            const entryId = requireId<'LeaveEntitlementEntry'>(globalThis.crypto.randomUUID());
            const sourceId = requireId<'LeaveEntitlementSource'>(result.id);
            if (!minutes.ok)
              throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
            await transaction.leaveEntitlements.append({
              entry: {
                absenceTypeId: result.restoration.absenceTypeId,
                effectiveOn: result.restoration.effectiveOn,
                entryId,
                entryType: 'CANCELLATION_RESTORATION',
                minutes: minutes.value,
                organizationId: context.organization.id,
                postedAt: at,
                sourceId,
                subjectEmployeeId: result.restoration.employeeId,
              },
            });
          }
          await applyLockedCancellationAdjustments({
            at,
            authorizationScope: decision.scope,
            context,
            result,
            transaction,
          });
          await appendAudit(
            transaction,
            context,
            cancellation.employeeId,
            result.id,
            at,
            `ABSENCE_CANCELLATION_${input.action}D`,
            decision.scope === 'ORGANIZATION_HR',
            result.version,
            decision.scope === 'ORGANIZATION_HR' ? 'HR_ADMINISTRATOR' : 'MANAGER',
          );
          return toContract(result);
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
    },
    async withdraw(
      identity: AbsenceCancellationIdentity,
      cancellationIdValue: string,
      input: WithdrawAbsenceCancellation,
      at: Instant,
    ) {
      return database.transaction(async (transaction) => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const employee = context.employee;
        if (employee === null) throw denied();
        const cancellationId = requireId<'AbsenceCancellation'>(cancellationIdValue);
        const cancellation = await transaction.absenceRequests.findCancellation(
          context.organization.id,
          cancellationId,
        );
        if (cancellation === null)
          throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
        assertAuthorized(
          context,
          identity.sessionFresh,
          employee.id,
          cancellation.employeeId,
          false,
          'ABSENCE_CANCEL_REQUEST',
        );
        const result = await transaction.absenceRequests.withdrawCancellation({
          actor: {
            accountId: context.accountId,
            authority: 'SELF',
            employeeId: employee.id,
          },
          cancellationId,
          decidedAt: at,
          expectedVersion: input.expectedVersion,
          organizationId: context.organization.id,
        });
        if (result === null)
          throw new WorkLedgerApiError({ code: 'ABSENCE_STATE_CHANGED', statusCode: 409 });
        await appendAudit(
          transaction,
          context,
          employee.id,
          result.id,
          at,
          'ABSENCE_CANCELLATION_WITHDRAWN',
          false,
          result.version,
        );
        return toContract(result);
      });
    },
  });
}

export async function applyLockedCancellationAdjustments(
  input: Readonly<{
    at: Instant;
    authorizationScope: AuthorizationGrantScope;
    context: AccountSelfContextRecord;
    result: AbsenceCancellationDecisionResult;
    transaction: WorkLedgerTransaction;
  }>,
): Promise<void> {
  for (const locked of input.result.lockedSnapshots) {
    if (
      locked.snapshot.sourceFingerprint !== locked.snapshotSourceFingerprint ||
      locked.snapshot.snapshot['submittedSourceFingerprint'] !== locked.snapshotSourceFingerprint
    ) {
      throw conflict();
    }
    assertSnapshotContainsEffects(locked.snapshot.snapshot, locked.effects);
    const adjustments = await input.transaction.correctionRequests.listPostLockAdjustments(
      input.context.organization.id,
      locked.snapshot.id,
    );
    let adjustmentVersion = adjustments.at(-1)?.adjustmentVersion ?? 0;
    let snapshotBalanceDelta = 0;
    const effectsByDate = new Map<
      string,
      { absenceCreditMinutes: number; expectedReductionMinutes: number }
    >();
    for (const effect of locked.effects) {
      const current = effectsByDate.get(effect.localDate) ?? {
        absenceCreditMinutes: 0,
        expectedReductionMinutes: 0,
      };
      effectsByDate.set(effect.localDate, {
        absenceCreditMinutes: current.absenceCreditMinutes + effect.absenceCreditMinutes,
        expectedReductionMinutes:
          current.expectedReductionMinutes + effect.expectedReductionMinutes,
      });
    }
    const orderedDates = [...effectsByDate].sort(([left], [right]) => left.localeCompare(right));
    for (const [localDateValue, effect] of orderedDates) {
      const localDate = requireLocalDate(localDateValue);
      const absenceCreditMinutesDelta = -effect.absenceCreditMinutes;
      const expectedMinutesDelta = effect.expectedReductionMinutes;
      const creditedMinutesDelta = absenceCreditMinutesDelta;
      const balanceMinutesDelta = creditedMinutesDelta - expectedMinutesDelta;
      adjustmentVersion += 1;
      const adjustmentId = requireId<'PostLockAdjustment'>(randomUUID());
      const sourceId = requireId<'PostLockAdjustmentSource'>(adjustmentId);
      const adjustment = await input.transaction.correctionRequests.appendPostLockAdjustment({
        absenceCancellationDecisionId: input.result.decisionId,
        absenceCancellationId: input.result.id,
        absenceCancellationSnapshotLinkId: locked.linkId,
        absenceCreditMinutesDelta,
        adjustmentVersion,
        createdAt: input.at,
        creditedMinutesDelta,
        employeeId: input.result.employeeId,
        expectedMinutesDelta,
        id: adjustmentId,
        kind: 'ABSENCE_CANCELLATION',
        localDate,
        minutes: balanceMinutesDelta,
        monthlySnapshotId: locked.snapshot.id,
        organizationId: input.context.organization.id,
        sourceId,
        workedMinutesDelta: 0,
      });
      if (adjustment === null) throw conflict();
      snapshotBalanceDelta += balanceMinutesDelta;
    }
    if (snapshotBalanceDelta !== 0) {
      const effectiveDate = orderedDates[0]?.[0];
      if (effectiveDate === undefined) throw internalError();
      await appendSnapshotTimeAdjustment({
        amountMinutes: snapshotBalanceDelta,
        at: input.at,
        context: input.context,
        effectiveDate: requireLocalDate(effectiveDate),
        employeeId: input.result.employeeId,
        snapshotFingerprint: locked.snapshot.snapshotFingerprint,
        sourceId: locked.linkId,
        transaction: input.transaction,
      });
    }
    await appendCancellationAdjustmentAudit({
      at: input.at,
      authorizationScope: input.authorizationScope,
      context: input.context,
      employeeId: input.result.employeeId,
      localDate: requireLocalDate(orderedDates[0]?.[0]),
      minutes: snapshotBalanceDelta,
      targetId: input.result.id,
      transaction: input.transaction,
      version: adjustmentVersion,
    });
  }
}

export function parseAbsenceCancellationIdentity(accountIdValue: string, sessionFresh: boolean) {
  return Object.freeze({ accountId: requireId<'Account'>(accountIdValue), sessionFresh });
}

function assertSnapshotContainsEffects(
  snapshot: Readonly<Record<string, unknown>>,
  effects: AbsenceCancellationDecisionResult['lockedSnapshots'][number]['effects'],
): void {
  const rows = snapshot['rows'];
  if (!Array.isArray(rows)) throw internalError();
  const capturedEffects = rows.flatMap((row) => {
    const neutralEffects = isRecord(row) ? row['neutralAbsenceEffects'] : null;
    return Array.isArray(neutralEffects) ? neutralEffects : [];
  });
  for (const effect of effects) {
    if (
      !capturedEffects.some(
        (candidate) =>
          isRecord(candidate) &&
          candidate['effectId'] === effect.effectId &&
          candidate['effectVersion'] === effect.effectVersion,
      )
    ) {
      throw conflict();
    }
  }
}

async function appendSnapshotTimeAdjustment(
  input: Readonly<{
    amountMinutes: number;
    at: Instant;
    context: AccountSelfContextRecord;
    effectiveDate: ReturnType<typeof requireLocalDate>;
    employeeId: DomainId<'Employee'>;
    snapshotFingerprint: string;
    sourceId: DomainId<'AbsenceCancellationSnapshotLink'>;
    transaction: WorkLedgerTransaction;
  }>,
): Promise<void> {
  const amount = parseSignedMinutes(input.amountMinutes);
  if (!amount.ok) throw internalError();
  const entryId = requireId<'TimeAccountLedgerEntry'>(randomUUID());
  const explanationCode = requireId<'TimeAccountExplanationCode'>(randomUUID());
  const sourceKey = requireId<'TimeAccountLedgerSource'>(input.sourceId);
  await input.transaction.timeAccount.append({
    entry: {
      actor: { accountId: input.context.accountId, kind: 'ACCOUNT' },
      amountMinutes: amount.value,
      effectiveDate: input.effectiveDate,
      entryId,
      entryType: 'POST_LOCK_ADJUSTMENT',
      explanationCode,
      organizationId: input.context.organization.id,
      recordedAt: input.at,
      sourceKey,
      subjectEmployeeId: input.employeeId,
    },
    sourceFingerprint: createHash('sha256')
      .update(
        `${input.sourceId}:${input.snapshotFingerprint}:${input.amountMinutes.toString()}`,
        'utf8',
      )
      .digest('hex'),
  });
}

async function appendCancellationAdjustmentAudit(
  input: Readonly<{
    at: Instant;
    authorizationScope: AuthorizationGrantScope;
    context: AccountSelfContextRecord;
    employeeId: DomainId<'Employee'>;
    localDate: ReturnType<typeof requireLocalDate>;
    minutes: number;
    targetId: DomainId<'AbsenceCancellation'>;
    transaction: WorkLedgerTransaction;
    version: number;
  }>,
): Promise<void> {
  if (
    input.authorizationScope !== 'REPORTS_LIMITED' &&
    input.authorizationScope !== 'ORGANIZATION_HR'
  ) {
    throw denied();
  }
  await input.transaction.audit.appendDomain({
    actionCode: 'POST_LOCK_ABSENCE_CANCELLATION_APPLIED',
    actor: {
      accountId: input.context.accountId,
      kind: 'ACCOUNT',
      role: input.authorizationScope === 'ORGANIZATION_HR' ? 'HR_ADMINISTRATOR' : 'MANAGER',
    },
    facts: {
      effectiveDate: input.localDate,
      minutes: input.minutes,
      version: input.version,
    },
    occurredAt: input.at,
    organizationId: input.context.organization.id,
    outcome: 'SUCCESS',
    privileged: input.authorizationScope === 'ORGANIZATION_HR',
    reasonCode: 'APPROVED_ABSENCE_CANCELLATION',
    requestId: null,
    restrictedReasonId: null,
    subjectEmployeeId: input.employeeId,
    targetId: input.targetId,
    targetKind: 'ABSENCE_REQUEST',
  });
}

function requireLocalDate(value: unknown) {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw internalError();
  return parsed.value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function conflict() {
  return new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
}

function internalError() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
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
function assertAuthorized(
  context: AccountSelfContextRecord,
  sessionFresh: boolean,
  actorEmployeeId: DomainId<'Employee'>,
  targetEmployeeId: DomainId<'Employee'>,
  isCurrentManager: boolean,
  action: 'ABSENCE_CANCEL_DECIDE' | 'ABSENCE_CANCEL_REQUEST',
) {
  const result = authorizeEmployeeTarget({
    action,
    actor: {
      accountActive: context.accountActive,
      accountId: context.accountId,
      employeeCapabilityActive: context.employeeCapabilityActive,
      employeeId: actorEmployeeId,
      organizationId: context.organization.id,
      roles: context.roles,
    },
    isCurrentManager,
    sessionFresh,
    targetEmployeeId,
    targetOrganizationId: context.organization.id,
  });
  if (!result.allowed) throw denied();
  return result;
}
async function appendAudit(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  subjectEmployeeId: DomainId<'Employee'>,
  targetId: DomainId<'AbsenceCancellation'>,
  at: Instant,
  actionCode: string,
  privileged: boolean,
  version: number,
  actorRole?: 'EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR',
) {
  await transaction.audit.appendDomain({
    actionCode,
    actor: {
      accountId: context.accountId,
      kind: 'ACCOUNT',
      role: actorRole ?? auditRole(context.roles),
    },
    facts: { version },
    occurredAt: at,
    organizationId: context.organization.id,
    outcome: 'SUCCESS',
    privileged,
    reasonCode: null,
    requestId: null,
    restrictedReasonId: null,
    subjectEmployeeId,
    targetId,
    targetKind: 'ABSENCE_REQUEST',
  });
}
function requireId<Kind extends string>(value: string): DomainId<Kind> {
  const parsed = parseDomainId<Kind>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return parsed.value;
}
function toContract(value: { id: string; status: string; version: number }) {
  return Object.freeze({ id: value.id, status: value.status, version: value.version }) as {
    id: string;
    status: 'PENDING_DECISION' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
    version: number;
  };
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
