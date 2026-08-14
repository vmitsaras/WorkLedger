import {
  elapsedMinutesBetweenInstants,
  localDateAtInstant,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseSignedMinutes,
  parseTimeZoneId,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import { createHash, randomUUID } from 'node:crypto';
import type {
  AccountSelfContextRecord,
  CorrectionReviewRecord,
  DailyProjectionRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';
import {
  monthlyPeriodApprovedRecordSchema,
  type CorrectionDecisionRequest,
  type CorrectionReviewItem,
} from '@workledger/contracts';

import {
  authorizeEmployeeTarget,
  employeeCollectionScope,
  type AuthorizationGrantScope,
} from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type CorrectionReviewIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export function createCorrectionReviewService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async list(identity: CorrectionReviewIdentity, at: Instant): Promise<CorrectionReviewItem[]> {
      return database.transaction(async (transaction) => {
        const { actor, context, localDate } = await reviewContext(transaction, identity, at);
        const scope = employeeCollectionScope('CORRECTION_DECIDE', actor);
        if (scope === null)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        const employeeIds = await transaction.authorization.listAuthorizedEmployeeIds({
          actorEmployeeId: actor.employeeId,
          limit: 500,
          localDate,
          offset: 0,
          organizationId: context.organization.id,
          scope,
        });
        return [
          await transaction.correctionRequests.listPendingForEmployees(
            context.organization.id,
            employeeIds,
          ),
        ]
          .flat()
          .map(toCorrectionReviewItem);
      });
    },
    async decide(
      identity: CorrectionReviewIdentity,
      requestIdValue: string,
      input: CorrectionDecisionRequest,
      at: Instant,
    ) {
      return database.transaction(
        async (transaction) => {
          const { actor, context, localDate } = await reviewContext(transaction, identity, at);
          const requestId = parseRequestId(requestIdValue);
          const request = await transaction.correctionRequests.findForReview(
            context.organization.id,
            requestId,
          );
          if (request === null)
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
          const isCurrentManager =
            actor.employeeId !== null &&
            (await transaction.authorization.isCurrentManager(
              context.organization.id,
              actor.employeeId,
              request.employeeId,
              localDate,
            ));
          const authorization = authorizeEmployeeTarget({
            action: 'CORRECTION_DECIDE',
            actor,
            isCurrentManager,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: request.employeeId,
            targetOrganizationId: context.organization.id,
          });
          if (!authorization.allowed)
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          const updated = await transaction.correctionRequests.decide({
            action: input.action,
            actor: {
              accountId: actor.accountId,
              authority: decisionAuthority(authorization.scope),
              employeeId: actor.employeeId,
            },
            expectedVersion: input.expectedVersion,
            organizationId: context.organization.id,
            reason: input.reason.trim(),
            requestId,
          });
          if (updated === null)
            throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
          await transaction.audit.appendDomain({
            actionCode: 'CORRECTION_REQUEST_DECIDED',
            actor: {
              accountId: context.accountId,
              kind: 'ACCOUNT',
              role: auditRole(context.roles),
            },
            facts: {
              effectiveDate: updated.localDate,
              nextStatus: updated.status,
              previousStatus: request.status,
              version: updated.version,
            },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: authorization.scope === 'ORGANIZATION_HR',
            reasonCode: decisionReasonCode(input.action),
            requestId: null,
            restrictedReasonId: null,
            subjectEmployeeId: updated.employeeId,
            targetId: updated.id,
            targetKind: 'CORRECTION_REQUEST',
          });
          if (input.action === 'APPROVE' && updated.lockedMonthlySnapshotId !== null) {
            await applyApprovedCorrectionInTransaction({
              at,
              authorizationScope: authorization.scope,
              context,
              expectedVersion: updated.version,
              request: updated,
              transaction,
            });
          }
          await transaction.notifications.append({
            deliveryRequested: false,
            destinationPath: '/requests',
            event:
              input.action === 'APPROVE'
                ? 'ITEM_APPROVED'
                : input.action === 'REJECT'
                  ? 'ITEM_REJECTED'
                  : 'ITEM_CHANGES_REQUESTED',
            occurredAt: at,
            organizationId: context.organization.id,
            recipientEmployeeId: updated.employeeId,
            sourceId: updated.id,
            sourceKind: 'REQUEST',
            sourceVersion: updated.version,
          });
          return Object.freeze({
            id: updated.id,
            status: updated.status as 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
            version: updated.version,
          });
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
    },
    async apply(
      identity: CorrectionReviewIdentity,
      requestIdValue: string,
      expectedVersion: number,
      at: Instant,
    ) {
      return database.transaction(
        async (transaction) => {
          const { actor, context, localDate } = await reviewContext(transaction, identity, at);
          const requestId = parseRequestId(requestIdValue);
          const request = await transaction.correctionRequests.findForReview(
            context.organization.id,
            requestId,
          );
          if (request === null)
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
          const isCurrentManager =
            actor.employeeId !== null &&
            (await transaction.authorization.isCurrentManager(
              context.organization.id,
              actor.employeeId,
              request.employeeId,
              localDate,
            ));
          const authorization = authorizeEmployeeTarget({
            action: 'CORRECTION_DECIDE',
            actor,
            isCurrentManager,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: request.employeeId,
            targetOrganizationId: context.organization.id,
          });
          if (!authorization.allowed)
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          return applyApprovedCorrectionInTransaction({
            at,
            authorizationScope: authorization.scope,
            context,
            expectedVersion,
            request,
            transaction,
          });
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
    },
  });
}

export async function applyApprovedCorrectionInTransaction(
  input: Readonly<{
    at: Instant;
    authorizationScope: AuthorizationGrantScope;
    context: AccountSelfContextRecord;
    expectedVersion: number;
    request: CorrectionReviewRecord;
    transaction: WorkLedgerTransaction;
  }>,
) {
  const { at, authorizationScope, context, expectedVersion, request, transaction } = input;
  if (request.status !== 'APPROVED' || request.version !== expectedVersion) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  if (
    request.lockedMonthlySnapshotId === null &&
    (await transaction.correctionRequests.hasLockedMonth(
      context.organization.id,
      request.employeeId,
      request.localDate,
    ))
  ) {
    throw new WorkLedgerApiError({ code: 'PERIOD_ADJUSTMENT_REQUIRED', statusCode: 409 });
  }
  const decisionId = await transaction.correctionRequests.findApprovedDecisionId(
    context.organization.id,
    request.id,
  );
  if (decisionId === null) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const projectionId = readString(request.originalInterpretation['projectionId']);
  const startsAt = readString(request.proposedInterpretation['startsAt']);
  const endsAt = readString(request.proposedInterpretation['endsAt']);
  if (projectionId === null || startsAt === null || endsAt === null) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  const parsedProjectionId = parseDomainId<'DailyProjection'>(projectionId);
  const parsedStartsAt = parseInstant(startsAt);
  const parsedEndsAt = parseInstant(endsAt);
  if (!parsedProjectionId.ok || !parsedStartsAt.ok || !parsedEndsAt.ok) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  const projection = await transaction.dailyProjections.findForEmployee(
    context.organization.id,
    request.employeeId,
    parsedProjectionId.value,
  );
  if (projection === null || projection.localDate !== request.localDate) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const workedMinutes = elapsedMinutesBetweenInstants(parsedStartsAt.value, parsedEndsAt.value);

  if (request.lockedMonthlySnapshotId !== null) {
    return applyPostLockCorrection({
      at,
      authorizationScope,
      context,
      decisionId,
      endsAt,
      projection,
      request,
      snapshotId: request.lockedMonthlySnapshotId,
      startsAt,
      transaction,
      workedMinutes,
    });
  }

  const balanceDeltaMinutes = workedMinutes - projection.workedMinutes;
  const creditedMinutes = projection.creditedMinutes + balanceDeltaMinutes;
  const balanceMinutes = projection.balanceMinutes + balanceDeltaMinutes;
  if (creditedMinutes < 0) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  const applied = await transaction.correctionRequests.apply({
    correctionDecisionId: decisionId,
    correctionRequestId: request.id,
    employeeId: request.employeeId,
    interpretation: Object.freeze({
      kind: 'REPLACE_DAILY_WORK_INTERVAL',
      sourceProjectionVersion: projection.projectionVersion,
      startsAt,
      endsAt,
      workedMinutes,
    }),
    localDate: request.localDate,
    organizationId: context.organization.id,
    version: 1,
  });
  if (applied === null) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const sourceFingerprint = createHash('sha256')
    .update(`${applied.id}:${projection.sourceFingerprint}:${projection.projectionVersion}`, 'utf8')
    .digest('hex');
  const nextProjection = await transaction.dailyProjections.replaceNext({
    ...projection,
    calculatedAt: at,
    balanceMinutes,
    creditedMinutes,
    projectionVersion: projection.projectionVersion + 1,
    sourceFingerprint,
    sourceReferences: Object.freeze({
      ...projection.sourceReferences,
      appliedCorrectionId: applied.id,
    }),
    workedMinutes,
  });
  if (nextProjection === null) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  if (balanceDeltaMinutes !== 0) {
    await appendTimeAccountEffect({
      amountMinutes: balanceDeltaMinutes,
      at,
      context,
      effectiveDate: request.localDate,
      employeeId: request.employeeId,
      entryType: 'DAILY_RECALCULATION_DELTA',
      sourceFingerprint,
      sourceId: applied.id,
      transaction,
    });
  }
  await appendApplicationAudit({
    actionCode: 'CORRECTION_APPLIED',
    at,
    authorizationScope,
    context,
    employeeId: request.employeeId,
    localDate: request.localDate,
    minutes: balanceDeltaMinutes,
    reasonCode: 'APPROVED_CORRECTION',
    targetId: applied.id,
    transaction,
    version: nextProjection.projectionVersion,
  });
  return Object.freeze({
    balanceDeltaMinutes,
    id: applied.id,
    status: 'APPLIED' as const,
    workedMinutes,
  });
}

async function applyPostLockCorrection(
  input: Readonly<{
    at: Instant;
    authorizationScope: AuthorizationGrantScope;
    context: AccountSelfContextRecord;
    decisionId: DomainId<'CorrectionDecision'>;
    endsAt: string;
    projection: DailyProjectionRecord;
    request: CorrectionReviewRecord;
    snapshotId: DomainId<'MonthlySnapshot'>;
    startsAt: string;
    transaction: WorkLedgerTransaction;
    workedMinutes: number;
  }>,
) {
  const { at, authorizationScope, context, decisionId, projection, request, transaction } = input;
  const monthStart = parseLocalDate(`${request.localDate.slice(0, 7)}-01`);
  if (!monthStart.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  const period = await transaction.monthlyPeriods.findByEmployeeMonth(
    context.organization.id,
    request.employeeId,
    monthStart.value,
  );
  if (period === null || period.status !== 'LOCKED') {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const snapshot = await transaction.monthlyPeriods.findLatestSnapshot(
    context.organization.id,
    period.id,
  );
  if (snapshot === null || snapshot.id !== input.snapshotId) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const approvedRecord = monthlyPeriodApprovedRecordSchema.safeParse(
    snapshot.snapshot['approvedRecord'],
  );
  if (!approvedRecord.success) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  const approvedRow = approvedRecord.data.rows.find(
    (row) => row.localDate === request.localDate && row.recordId === projection.id,
  );
  if (approvedRow?.workedMinutes === null || approvedRow?.workedMinutes === undefined) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const adjustments = await transaction.correctionRequests.listPostLockAdjustments(
    context.organization.id,
    snapshot.id,
  );
  const previousAdjustedWorkedMinutes =
    approvedRow.workedMinutes +
    adjustments
      .filter(({ localDate }) => localDate === request.localDate)
      .reduce((total, adjustment) => total + adjustment.minutes, 0);
  if (previousAdjustedWorkedMinutes < 0) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  const balanceDeltaMinutes = input.workedMinutes - previousAdjustedWorkedMinutes;
  const adjustmentVersion = (adjustments.at(-1)?.adjustmentVersion ?? 0) + 1;
  const applied = await transaction.correctionRequests.apply({
    correctionDecisionId: decisionId,
    correctionRequestId: request.id,
    employeeId: request.employeeId,
    interpretation: Object.freeze({
      kind: 'REPLACE_DAILY_WORK_INTERVAL',
      lockedMonthlySnapshotId: snapshot.id,
      previousAdjustedWorkedMinutes,
      sourceProjectionVersion: projection.projectionVersion,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      workedMinutes: input.workedMinutes,
    }),
    localDate: request.localDate,
    organizationId: context.organization.id,
    version: 1,
  });
  if (applied === null) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const adjustmentId = parseDomainId<'PostLockAdjustment'>(randomUUID());
  if (!adjustmentId.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  const latestDateAdjustment = adjustments
    .filter(({ localDate, minutes }) => localDate === request.localDate && minutes !== 0)
    .at(-1);
  const reversesAdjustmentId =
    latestDateAdjustment !== undefined &&
    latestDateAdjustment.minutes !== 0 &&
    balanceDeltaMinutes === -latestDateAdjustment.minutes &&
    input.workedMinutes === latestDateAdjustment.previousAdjustedWorkedMinutes
      ? latestDateAdjustment.id
      : null;
  const adjustment = await transaction.correctionRequests.appendPostLockAdjustment({
    adjustmentVersion,
    appliedCorrectionId: applied.id,
    correctionDecisionId: decisionId,
    correctionRequestId: request.id,
    createdAt: at,
    employeeId: request.employeeId,
    id: adjustmentId.value,
    localDate: request.localDate,
    minutes: balanceDeltaMinutes,
    monthlySnapshotId: snapshot.id,
    organizationId: context.organization.id,
    previousAdjustedWorkedMinutes,
    proposedWorkedMinutes: input.workedMinutes,
    reason: request.reason,
    reversesAdjustmentId,
    sourceId: applied.id,
  });
  if (adjustment === null) {
    throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
  }
  const sourceFingerprint = createHash('sha256')
    .update(
      `${adjustment.id}:${snapshot.snapshotFingerprint}:${adjustmentVersion}:${previousAdjustedWorkedMinutes}:${input.workedMinutes}`,
      'utf8',
    )
    .digest('hex');
  if (balanceDeltaMinutes !== 0) {
    await appendTimeAccountEffect({
      amountMinutes: balanceDeltaMinutes,
      at,
      context,
      effectiveDate: request.localDate,
      employeeId: request.employeeId,
      entryType: 'POST_LOCK_ADJUSTMENT',
      sourceFingerprint,
      sourceId: adjustment.id,
      transaction,
    });
  }
  await appendApplicationAudit({
    actionCode: 'POST_LOCK_CORRECTION_APPLIED',
    at,
    authorizationScope,
    context,
    employeeId: request.employeeId,
    localDate: request.localDate,
    minutes: balanceDeltaMinutes,
    reasonCode: reversesAdjustmentId === null ? 'APPROVED_ADJUSTMENT' : 'REVERSAL_ADJUSTMENT',
    targetId: adjustment.id,
    transaction,
    version: adjustmentVersion,
  });
  return Object.freeze({
    balanceDeltaMinutes,
    id: applied.id,
    status: 'APPLIED' as const,
    workedMinutes: input.workedMinutes,
  });
}

async function appendTimeAccountEffect(
  input: Readonly<{
    amountMinutes: number;
    at: Instant;
    context: AccountSelfContextRecord;
    effectiveDate: CorrectionReviewRecord['localDate'];
    employeeId: DomainId<'Employee'>;
    entryType: 'DAILY_RECALCULATION_DELTA' | 'POST_LOCK_ADJUSTMENT';
    sourceFingerprint: string;
    sourceId: string;
    transaction: WorkLedgerTransaction;
  }>,
) {
  const amount = parseSignedMinutes(input.amountMinutes);
  const entryId = parseDomainId<'TimeAccountLedgerEntry'>(randomUUID());
  const explanationCode = parseDomainId<'TimeAccountExplanationCode'>(randomUUID());
  const sourceKey = parseDomainId<'TimeAccountLedgerSource'>(input.sourceId);
  if (!amount.ok || !entryId.ok || !explanationCode.ok || !sourceKey.ok) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  await input.transaction.timeAccount.append({
    entry: {
      actor: { accountId: input.context.accountId, kind: 'ACCOUNT' },
      amountMinutes: amount.value,
      effectiveDate: input.effectiveDate,
      entryId: entryId.value,
      entryType: input.entryType,
      explanationCode: explanationCode.value,
      organizationId: input.context.organization.id,
      recordedAt: input.at,
      sourceKey: sourceKey.value,
      subjectEmployeeId: input.employeeId,
    },
    sourceFingerprint: input.sourceFingerprint,
  });
}

async function appendApplicationAudit(
  input: Readonly<{
    actionCode: string;
    at: Instant;
    authorizationScope: AuthorizationGrantScope;
    context: AccountSelfContextRecord;
    employeeId: DomainId<'Employee'>;
    localDate: CorrectionReviewRecord['localDate'];
    minutes: number;
    reasonCode: string;
    targetId: string;
    transaction: WorkLedgerTransaction;
    version: number;
  }>,
) {
  await input.transaction.audit.appendDomain({
    actionCode: input.actionCode,
    actor: {
      accountId: input.context.accountId,
      kind: 'ACCOUNT',
      role: auditRole(input.context.roles),
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
    reasonCode: input.reasonCode,
    requestId: null,
    restrictedReasonId: null,
    subjectEmployeeId: input.employeeId,
    targetId: input.targetId,
    targetKind: 'CORRECTION_REQUEST',
  });
}

export function parseCorrectionReviewIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): CorrectionReviewIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

async function reviewContext(
  transaction: WorkLedgerTransaction,
  identity: CorrectionReviewIdentity,
  at: Instant,
) {
  const context = requireActiveContext(
    await transaction.accountSelfService.findContext(identity.accountId, at),
  );
  const timeZone = parseTimeZoneId(context.organization.timeZone);
  if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  const localDate = localDateAtInstant(at, timeZone.value);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    context.accountId,
    localDate,
  );
  if (actor === null) throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return Object.freeze({ actor, context, localDate });
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return context;
}
function parseRequestId(value: string): DomainId<'CorrectionRequest'> {
  const parsed = parseDomainId<'CorrectionRequest'>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return parsed.value;
}
export function toCorrectionReviewItem(request: CorrectionReviewRecord): CorrectionReviewItem {
  const original = request.originalInterpretation;
  const proposed = request.proposedInterpretation;
  const calculation = readRecord(original['calculation']);
  const events = readEvents(original['events']);
  const startsAt = readString(proposed['startsAt']);
  const endsAt = readString(proposed['endsAt']);
  if (
    original['projectionId'] === undefined ||
    startsAt === null ||
    endsAt === null ||
    calculation === null ||
    events === null
  )
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  return Object.freeze({
    applicationMode:
      request.lockedMonthlySnapshotId === null
        ? ('ORDINARY_CORRECTION' as const)
        : ('POST_LOCK_ADJUSTMENT' as const),
    employeeDisplayName: request.employeeDisplayName,
    events,
    id: request.id,
    localDate: request.localDate,
    originalCalculation: calculation,
    proposedEndsAt: endsAt,
    proposedStartsAt: startsAt,
    reason: request.reason,
    status:
      request.status === 'SUBMITTED'
        ? 'SUBMITTED'
        : request.status === 'APPROVED'
          ? 'APPROVED'
          : request.status === 'REJECTED'
            ? 'REJECTED'
            : request.status === 'WITHDRAWN'
              ? 'WITHDRAWN'
              : 'CHANGES_REQUESTED',
    version: request.version,
  });
}
function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
function readRecord(value: unknown): CorrectionReviewItem['originalCalculation'] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const values = [
    'balanceMinutes',
    'breakMinutes',
    'creditedMinutes',
    'expectedMinutes',
    'workedMinutes',
  ].map((key) => record[key]);
  return values.every((item) => typeof item === 'number' && Number.isInteger(item))
    ? Object.freeze({
        balanceMinutes: values[0] as number,
        breakMinutes: values[1] as number,
        creditedMinutes: values[2] as number,
        expectedMinutes: values[3] as number,
        workedMinutes: values[4] as number,
      })
    : null;
}
function readEvents(value: unknown): CorrectionReviewItem['events'] | null {
  if (!Array.isArray(value)) return null;
  const events: CorrectionReviewItem['events'] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return null;
    const event = item as Record<string, unknown>;
    if (
      typeof event['occurredAt'] !== 'string' ||
      typeof event['sequence'] !== 'number' ||
      typeof event['type'] !== 'string'
    )
      return null;
    events.push({
      occurredAt: event['occurredAt'],
      sequence: event['sequence'],
      type: event['type'],
    });
  }
  return events;
}
function decisionReasonCode(action: CorrectionDecisionRequest['action']) {
  return action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'CHANGES_REQUESTED';
}
function decisionAuthority(scope: 'SELF' | 'REPORTS_LIMITED' | 'ORGANIZATION_HR' | 'TECHNICAL') {
  if (scope === 'ORGANIZATION_HR') return 'ORGANIZATION_HR' as const;
  if (scope === 'REPORTS_LIMITED') return 'CURRENT_MANAGER' as const;
  throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
function auditRole(
  roles: readonly ('EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR')[],
) {
  if (roles.includes('MANAGER')) return 'MANAGER' as const;
  if (roles.includes('HR_ADMINISTRATOR')) return 'HR_ADMINISTRATOR' as const;
  return null;
}
