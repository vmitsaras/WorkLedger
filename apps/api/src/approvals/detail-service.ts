import {
  calculateAbsenceRequest,
  calculateLeaveEntitlementLedger,
  localDateAtInstant,
  parseDomainId,
  parseSignedMinutes,
  parseTimeZoneId,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResult,
  ApprovalDetail,
} from '@workledger/contracts';
import type {
  AccountSelfContextRecord,
  ApprovalAbsenceRecord,
  ApprovalCancellationRecord,
  AuthorizationActorRecord,
  CorrectionReviewRecord,
  DecisionActorRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import {
  authorizeEmployeeTarget,
  type AuthorizationGrantScope,
  type EmployeeTargetAction,
} from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  applyApprovedCorrectionInTransaction,
  toCorrectionReviewItem,
} from '../corrections/correction-review-service.js';
import { applyLockedCancellationAdjustments } from '../absence/cancellation-service.js';
import {
  deliverCommittedNotification,
  disabledNotificationDeliveryAdapter,
  type NotificationDeliveryAdapter,
} from '../notifications/delivery.js';

export type ApprovalDetailIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

type LoadedApproval =
  | Readonly<{ kind: 'CORRECTION'; record: CorrectionReviewRecord; applied: boolean }>
  | Readonly<{ kind: 'ABSENCE'; record: ApprovalAbsenceRecord }>
  | Readonly<{ kind: 'CANCELLATION'; record: ApprovalCancellationRecord }>;

export function createApprovalDetailService(
  database: WorkLedgerDatabase,
  notificationDelivery: NotificationDeliveryAdapter = disabledNotificationDeliveryAdapter,
) {
  return Object.freeze({
    async get(
      identity: ApprovalDetailIdentity,
      approvalIdValue: string,
      at: Instant,
    ): Promise<ApprovalDetail> {
      return database.transaction(
        async (transaction) => {
          const state = await loadAuthorizedApproval(transaction, identity, approvalIdValue, at);
          return toDetail(transaction, state.context, state.approval, state.authorization.scope);
        },
        { isolationLevel: 'repeatable read' },
      );
    },

    async decide(
      identity: ApprovalDetailIdentity,
      approvalIdValue: string,
      input: ApprovalDecisionRequest,
      at: Instant,
    ): Promise<ApprovalDecisionResult> {
      const committed = await database.transaction(
        async (transaction) => {
          const state = await loadAuthorizedApproval(transaction, identity, approvalIdValue, at);
          const authority = decisionActor(state.actor, state.authorization.scope);
          const availableActions = actionsFor(state.approval);
          if (!availableActions.includes(input.action)) {
            throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
          }

          const result =
            state.approval.kind === 'CORRECTION'
              ? await decideCorrection(
                  transaction,
                  { ...state, approval: state.approval },
                  authority,
                  input,
                  at,
                )
              : state.approval.kind === 'CANCELLATION'
                ? await decideCancellation(
                    transaction,
                    { ...state, approval: state.approval },
                    authority,
                    input,
                    at,
                  )
                : await decideAbsence(
                    transaction,
                    { ...state, approval: state.approval },
                    authority,
                    input,
                    at,
                  );

          const notification = await transaction.notifications.append({
            deliveryRequested: notificationDelivery.configured,
            destinationPath: '/requests',
            event: notificationEvent(input.action),
            occurredAt: at,
            organizationId: state.context.organization.id,
            recipientEmployeeId: state.approval.record.employeeId,
            sourceId: result.id,
            sourceKind: 'REQUEST',
            sourceVersion: result.version,
          });

          return Object.freeze({ notification, result });
        },
        { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
      );
      await deliverCommittedNotification(database, notificationDelivery, committed.notification);
      return committed.result;
    },
  });
}

function notificationEvent(action: ApprovalDecisionRequest['action']) {
  if (action === 'APPROVE') return 'ITEM_APPROVED' as const;
  if (action === 'REJECT') return 'ITEM_REJECTED' as const;
  if (action === 'REQUEST_CHANGES') return 'ITEM_CHANGES_REQUESTED' as const;
  return 'ITEM_ACKNOWLEDGED' as const;
}

export function parseApprovalDetailIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): ApprovalDetailIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

async function loadAuthorizedApproval(
  transaction: WorkLedgerTransaction,
  identity: ApprovalDetailIdentity,
  approvalIdValue: string,
  at: Instant,
) {
  const context = requireActiveContext(
    await transaction.accountSelfService.findContext(identity.accountId, at),
  );
  const timeZone = parseTimeZoneId(context.organization.timeZone);
  if (!timeZone.ok) throw internalError();
  const localDate = localDateAtInstant(at, timeZone.value);
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    context.accountId,
    localDate,
  );
  if (actor === null) throw denied();
  const approval = await loadApproval(transaction, context.organization.id, approvalIdValue);
  if (approval === null) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  const targetEmployeeId = approval.record.employeeId;
  const isCurrentManager =
    actor.employeeId !== null &&
    (await transaction.authorization.isCurrentManager(
      context.organization.id,
      actor.employeeId,
      targetEmployeeId,
      localDate,
    ));
  const authorization = authorizeEmployeeTarget({
    action: authorizationAction(approval.kind),
    actor,
    isCurrentManager,
    sessionFresh: identity.sessionFresh,
    targetEmployeeId,
    targetOrganizationId: context.organization.id,
  });
  if (!authorization.allowed) throw denied();
  return Object.freeze({ actor, approval, authorization, context });
}

async function loadApproval(
  transaction: WorkLedgerTransaction,
  organizationId: DomainId<'Organization'>,
  approvalIdValue: string,
): Promise<LoadedApproval | null> {
  const correctionId = parseDomainId<'CorrectionRequest'>(approvalIdValue);
  const absenceId = parseDomainId<'AbsenceRequest'>(approvalIdValue);
  const cancellationId = parseDomainId<'AbsenceCancellation'>(approvalIdValue);
  if (!correctionId.ok || !absenceId.ok || !cancellationId.ok) return null;

  const correction = await transaction.correctionRequests.findForReview(
    organizationId,
    correctionId.value,
  );
  if (correction !== null) {
    return Object.freeze({
      applied: await transaction.correctionRequests.hasApplied(organizationId, correctionId.value),
      kind: 'CORRECTION' as const,
      record: correction,
    });
  }
  const cancellation = await transaction.absenceRequests.findCancellationForApproval(
    organizationId,
    cancellationId.value,
  );
  if (cancellation !== null)
    return Object.freeze({ kind: 'CANCELLATION' as const, record: cancellation });
  const absence = await transaction.absenceRequests.findForApproval(
    organizationId,
    absenceId.value,
  );
  return absence === null ? null : Object.freeze({ kind: 'ABSENCE' as const, record: absence });
}

async function toDetail(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  approval: LoadedApproval,
  authorizationScope: AuthorizationGrantScope,
): Promise<ApprovalDetail> {
  if (approval.kind === 'CORRECTION') {
    const item = toCorrectionReviewItem(approval.record);
    return Object.freeze({
      affectedEndDate: item.localDate,
      affectedStartDate: item.localDate,
      applicationMode: item.applicationMode,
      availableActions: actionsFor(approval),
      employeeDisplayName: item.employeeDisplayName,
      events: item.events,
      id: item.id,
      kind: 'CORRECTION' as const,
      originalCalculation: item.originalCalculation,
      proposedEndsAt: item.proposedEndsAt,
      proposedStartsAt: item.proposedStartsAt,
      requestReason: item.reason,
      status: approval.applied ? ('APPLIED' as const) : item.status,
      submittedAt: approval.record.createdAt,
      version: item.version,
    });
  }
  const calculated = await calculateStoredCoverage(transaction, context, approval.record);
  if (approval.kind === 'CANCELLATION') {
    return Object.freeze({
      absenceTypeName: approval.record.absenceTypeName,
      affectedEndDate: calculated.endDate,
      affectedStartDate: calculated.startDate,
      availableActions: actionsFor(approval),
      coverage: toContractCoverage(calculated.coverage),
      employeeDisplayName: approval.record.employeeDisplayName,
      id: approval.record.id,
      kind: 'CANCELLATION' as const,
      status: approval.record.status,
      submittedAt: approval.record.submittedAt,
      version: approval.record.version,
    });
  }
  const hasEntitlement = approval.record.policy.entitlementAccountCategory !== null;
  const ledger = hasEntitlement
    ? calculateLeaveEntitlementLedger({
        absenceTypeId: approval.record.absenceTypeId,
        entries: (
          await transaction.leaveEntitlements.listForEmployee(
            context.organization.id,
            approval.record.employeeId,
          )
        ).filter((entry) => entry.absenceTypeId === approval.record.absenceTypeId),
        organizationId: context.organization.id,
        subjectEmployeeId: approval.record.employeeId,
      })
    : null;
  if (ledger !== null && !ledger.ok) throw internalError();
  return Object.freeze({
    absenceTypeName: approval.record.absenceTypeName,
    affectedEndDate: calculated.endDate,
    affectedStartDate: calculated.startDate,
    availableActions: actionsFor(approval),
    availableEntitlementMinutes: ledger?.value.availableMinutes ?? null,
    canOverrideNegativeBalance: authorizationScope === 'ORGANIZATION_HR',
    coverage: toContractCoverage(calculated.coverage),
    employeeDisplayName: approval.record.employeeDisplayName,
    id: approval.record.id,
    kind: 'ABSENCE' as const,
    projectedRemainingMinutes: ledger?.value.projectedRemainingMinutes ?? null,
    requestedEntitlementMinutes: hasEntitlement ? calculated.totalMinutes : null,
    status: approval.record.status,
    submittedAt: approval.record.submittedAt,
    version: approval.record.version,
    workflow: approval.record.policy.workflow,
  });
}

async function decideCorrection(
  transaction: WorkLedgerTransaction,
  state: Awaited<ReturnType<typeof loadAuthorizedApproval>> & {
    approval: Extract<LoadedApproval, { kind: 'CORRECTION' }>;
  },
  actor: DecisionActorRecord,
  input: ApprovalDecisionRequest,
  at: Instant,
): Promise<ApprovalDecisionResult> {
  if (input.action === 'ACKNOWLEDGE') throw stateConflict();
  const updated = await transaction.correctionRequests.decide({
    action: input.action,
    actor,
    expectedVersion: input.expectedVersion,
    organizationId: state.context.organization.id,
    reason: input.reason ?? '',
    requestId: state.approval.record.id,
  });
  if (updated === null) throw stateConflict();
  if (input.action === 'APPROVE' && updated.lockedMonthlySnapshotId !== null) {
    await applyApprovedCorrectionInTransaction({
      at,
      authorizationScope: state.authorization.scope,
      context: state.context,
      expectedVersion: updated.version,
      request: updated,
      transaction,
    });
  }
  await appendDecisionAudit(transaction, state.context, actor, {
    action: input.action,
    at,
    kind: 'CORRECTION',
    status: updated.status,
    subjectEmployeeId: updated.employeeId,
    targetId: updated.id,
    version: updated.version,
  });
  return Object.freeze({
    id: updated.id,
    kind: 'CORRECTION',
    status: updated.status,
    version: updated.version,
  });
}

async function decideCancellation(
  transaction: WorkLedgerTransaction,
  state: Awaited<ReturnType<typeof loadAuthorizedApproval>> & {
    approval: Extract<LoadedApproval, { kind: 'CANCELLATION' }>;
  },
  actor: DecisionActorRecord,
  input: ApprovalDecisionRequest,
  at: Instant,
): Promise<ApprovalDecisionResult> {
  if (input.action === 'ACKNOWLEDGE') throw stateConflict();
  const updated = await transaction.absenceRequests.decideCancellation({
    action: input.action,
    actor,
    cancellationId: state.approval.record.id,
    decidedAt: at,
    expectedVersion: input.expectedVersion,
    organizationId: state.context.organization.id,
    reason: input.reason ?? null,
  });
  if (updated === null) throw stateConflict();
  if (updated.restoration !== null) {
    const minutes = parseSignedMinutes(updated.restoration.minutes);
    if (!minutes.ok) throw internalError();
    await transaction.leaveEntitlements.append({
      entry: {
        absenceTypeId: updated.restoration.absenceTypeId,
        effectiveOn: updated.restoration.effectiveOn,
        entryId: requireId<'LeaveEntitlementEntry'>(globalThis.crypto.randomUUID()),
        entryType: 'CANCELLATION_RESTORATION',
        minutes: minutes.value,
        organizationId: state.context.organization.id,
        postedAt: at,
        sourceId: requireId<'LeaveEntitlementSource'>(updated.id),
        subjectEmployeeId: updated.restoration.employeeId,
      },
    });
  }
  await applyLockedCancellationAdjustments({
    at,
    authorizationScope: state.authorization.scope,
    context: state.context,
    result: updated,
    transaction,
  });
  await appendDecisionAudit(transaction, state.context, actor, {
    action: input.action,
    at,
    kind: 'CANCELLATION',
    status: updated.status,
    subjectEmployeeId: updated.employeeId,
    targetId: updated.id,
    version: updated.version,
  });
  return Object.freeze({
    id: updated.id,
    kind: 'CANCELLATION',
    status: updated.status,
    version: updated.version,
  });
}

async function decideAbsence(
  transaction: WorkLedgerTransaction,
  state: Awaited<ReturnType<typeof loadAuthorizedApproval>> & {
    approval: Extract<LoadedApproval, { kind: 'ABSENCE' }>;
  },
  actor: DecisionActorRecord,
  input: ApprovalDecisionRequest,
  at: Instant,
): Promise<ApprovalDecisionResult> {
  const record = state.approval.record;
  if (input.action === 'ACKNOWLEDGE') {
    const updated = await transaction.absenceRequests.acknowledgeSickness(
      state.context.organization.id,
      record.id,
      actor,
      input.expectedVersion,
      at,
    );
    if (updated === null) throw stateConflict();
    await appendDecisionAudit(transaction, state.context, actor, {
      action: input.action,
      at,
      kind: 'ABSENCE',
      status: updated.status,
      subjectEmployeeId: updated.employeeId,
      targetId: updated.id,
      version: updated.version,
    });
    return Object.freeze({
      id: updated.id,
      kind: 'ABSENCE',
      status: updated.status,
      version: updated.version,
    });
  }

  const calculated = await calculateStoredCoverage(transaction, state.context, record);
  const entitlementEntries =
    record.policy.entitlementAccountCategory === null
      ? []
      : (
          await transaction.leaveEntitlements.listForEmployee(
            state.context.organization.id,
            record.employeeId,
          )
        ).filter((entry) => entry.absenceTypeId === record.absenceTypeId);
  const ledger =
    record.policy.entitlementAccountCategory === null
      ? null
      : calculateLeaveEntitlementLedger({
          absenceTypeId: record.absenceTypeId,
          entries: entitlementEntries,
          organizationId: state.context.organization.id,
          subjectEmployeeId: record.employeeId,
        });
  if (ledger !== null && !ledger.ok) throw internalError();
  const negativeBalance = ledger !== null && ledger.value.projectedRemainingMinutes < 0;
  if (input.action === 'APPROVE' && negativeBalance) {
    if (actor.authority !== 'ORGANIZATION_HR' || !input.negativeBalanceOverride) {
      throw new WorkLedgerApiError({ code: 'ABSENCE_INSUFFICIENT_BALANCE', statusCode: 409 });
    }
  } else if (input.negativeBalanceOverride) {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }

  const effects =
    input.action === 'APPROVE'
      ? calculated.coverage.map((coverage) => ({
          absenceCoverageSegmentId: coverage.id,
          creditMinutes:
            record.policy.timeTreatment === 'CREDIT_COVERED_EXPECTATION' ? coverage.minutes : 0,
          entitlementMinutes:
            record.policy.entitlementAccountCategory === null ? 0 : coverage.minutes,
          expectedReductionMinutes:
            record.policy.timeTreatment === 'REDUCE_COVERED_EXPECTATION' ? coverage.minutes : 0,
          localDate: coverage.localDate,
        }))
      : [];
  const updated = await transaction.absenceRequests.decideRequest({
    action: input.action,
    actor,
    decidedAt: at,
    effects,
    expectedVersion: input.expectedVersion,
    organizationId: state.context.organization.id,
    reason: input.reason ?? '',
    requestId: record.id,
  });
  if (updated === null) throw stateConflict();

  if (calculated.totalMinutes > 0 && record.policy.entitlementAccountCategory !== null) {
    await appendEntitlementTransition(
      transaction,
      state.context,
      record,
      calculated.totalMinutes,
      input.action,
      at,
    );
  }
  await appendDecisionAudit(transaction, state.context, actor, {
    action: input.action,
    at,
    kind: 'ABSENCE',
    status: updated.status,
    subjectEmployeeId: updated.employeeId,
    targetId: updated.id,
    version: updated.version,
  });
  return Object.freeze({
    id: updated.id,
    kind: 'ABSENCE',
    status: updated.status,
    version: updated.version,
  });
}

async function appendEntitlementTransition(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  record: ApprovalAbsenceRecord,
  minutesValue: number,
  action: Exclude<ApprovalDecisionRequest['action'], 'ACKNOWLEDGE'>,
  at: Instant,
) {
  const release = parseSignedMinutes(minutesValue);
  if (!release.ok) throw internalError();
  const sourceId = requireId<'LeaveEntitlementSource'>(record.id);
  const effectiveOn = record.coverage[0]?.localDate;
  if (effectiveOn === undefined) throw internalError();
  await transaction.leaveEntitlements.append({
    entry: {
      absenceTypeId: record.absenceTypeId,
      effectiveOn,
      entryId: requireId<'LeaveEntitlementEntry'>(globalThis.crypto.randomUUID()),
      entryType: 'RESERVATION_RELEASE',
      minutes: release.value,
      organizationId: context.organization.id,
      postedAt: at,
      sourceId,
      subjectEmployeeId: record.employeeId,
    },
  });
  if (action !== 'APPROVE') return;
  const deduction = parseSignedMinutes(-minutesValue);
  if (!deduction.ok) throw internalError();
  await transaction.leaveEntitlements.append({
    entry: {
      absenceTypeId: record.absenceTypeId,
      effectiveOn,
      entryId: requireId<'LeaveEntitlementEntry'>(globalThis.crypto.randomUUID()),
      entryType: 'APPROVED_DEDUCTION',
      minutes: deduction.value,
      organizationId: context.organization.id,
      postedAt: at,
      sourceId,
      subjectEmployeeId: record.employeeId,
    },
  });
}

async function calculateStoredCoverage(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  record: ApprovalAbsenceRecord | ApprovalCancellationRecord,
) {
  const startDate = record.coverage[0]?.localDate;
  const endDate = record.coverage.at(-1)?.localDate;
  if (startDate === undefined || endDate === undefined) throw internalError();
  const configuration = await transaction.absenceRequests.loadConfiguration({
    absenceCode: record.absenceCode,
    employeeId: record.employeeId,
    endDate,
    organizationId: context.organization.id,
    startDate,
  });
  const coverage = record.coverage.map((segment) => {
    const input =
      segment.kind === 'FULL_DAY'
        ? ({ endDate: segment.localDate, kind: 'FULL_DAY', startDate: segment.localDate } as const)
        : segment.kind === 'MINUTE_INTERVAL'
          ? ({
              endsAtMinute: segment.endsAtMinute ?? -1,
              kind: 'MINUTE_INTERVAL',
              localDate: segment.localDate,
              startsAtMinute: segment.startsAtMinute ?? -1,
            } as const)
          : ({ kind: segment.kind, localDate: segment.localDate } as const);
    const calculated = calculateAbsenceRequest({
      coverage: input,
      holidayDates: configuration.holidayDates,
      scheduleAssignments: configuration.scheduleAssignments,
    });
    if (!calculated.ok)
      throw new WorkLedgerApiError({ code: 'POLICY_CONFIGURATION_INVALID', statusCode: 422 });
    const value = calculated.value.coverage[0];
    if (value === undefined) throw internalError();
    return Object.freeze({
      endsAtMinute: segment.endsAtMinute,
      id: segment.id,
      kind: segment.kind,
      localDate: segment.localDate,
      minutes: value.entitlementMinutes,
      startsAtMinute: segment.startsAtMinute,
    });
  });
  return Object.freeze({
    coverage,
    endDate,
    startDate,
    totalMinutes: coverage.reduce((total, item) => total + item.minutes, 0),
  });
}

function toContractCoverage(
  coverage: Awaited<ReturnType<typeof calculateStoredCoverage>>['coverage'],
) {
  return coverage.map((segment) => ({
    endsAtMinute: segment.endsAtMinute,
    kind: segment.kind,
    localDate: segment.localDate,
    minutes: segment.minutes,
    startsAtMinute: segment.startsAtMinute,
  }));
}

function actionsFor(approval: LoadedApproval): ApprovalDetail['availableActions'] {
  if (approval.kind === 'CORRECTION') {
    if (approval.applied) return [];
    if (approval.record.status === 'APPROVED') return ['APPLY_CORRECTION'];
    return ['SUBMITTED', 'CHANGES_REQUESTED'].includes(approval.record.status)
      ? ['APPROVE', 'REQUEST_CHANGES', 'REJECT']
      : [];
  }
  if (approval.kind === 'CANCELLATION') {
    return approval.record.status === 'PENDING_DECISION'
      ? ['APPROVE', 'REQUEST_CHANGES', 'REJECT']
      : [];
  }
  if (approval.record.policy.workflow === 'REPORT_AND_ACKNOWLEDGE') {
    return approval.record.status === 'REPORTED' ? ['ACKNOWLEDGE', 'REQUEST_CHANGES'] : [];
  }
  return approval.record.status === 'SUBMITTED' ? ['APPROVE', 'REQUEST_CHANGES', 'REJECT'] : [];
}

function authorizationAction(kind: LoadedApproval['kind']): EmployeeTargetAction {
  return kind === 'CORRECTION'
    ? 'CORRECTION_DECIDE'
    : kind === 'CANCELLATION'
      ? 'ABSENCE_CANCEL_DECIDE'
      : 'ABSENCE_DECIDE';
}

function decisionActor(
  actor: AuthorizationActorRecord,
  scope: AuthorizationGrantScope,
): DecisionActorRecord {
  if (scope !== 'REPORTS_LIMITED' && scope !== 'ORGANIZATION_HR') throw denied();
  return Object.freeze({
    accountId: actor.accountId,
    authority: scope === 'ORGANIZATION_HR' ? 'ORGANIZATION_HR' : 'CURRENT_MANAGER',
    employeeId: actor.employeeId,
  });
}

async function appendDecisionAudit(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  actor: DecisionActorRecord,
  input: Readonly<{
    action: ApprovalDecisionRequest['action'];
    at: Instant;
    kind: ApprovalDecisionResult['kind'];
    status: string;
    subjectEmployeeId: DomainId<'Employee'>;
    targetId: string;
    version: number;
  }>,
) {
  await transaction.audit.appendDomain({
    actionCode: `APPROVAL_${input.kind}_${input.action}`,
    actor: {
      accountId: actor.accountId,
      kind: 'ACCOUNT',
      role: actor.authority === 'ORGANIZATION_HR' ? 'HR_ADMINISTRATOR' : 'MANAGER',
    },
    facts: { nextStatus: input.status, version: input.version },
    occurredAt: input.at,
    organizationId: context.organization.id,
    outcome: 'SUCCESS',
    privileged: actor.authority === 'ORGANIZATION_HR',
    reasonCode: input.action,
    requestId: null,
    restrictedReasonId: null,
    subjectEmployeeId: input.subjectEmployeeId,
    targetId: input.targetId,
    targetKind: input.kind === 'CORRECTION' ? 'CORRECTION_REQUEST' : 'ABSENCE_REQUEST',
  });
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return context;
}

function requireId<Kind extends string>(value: string): DomainId<Kind> {
  const parsed = parseDomainId<Kind>(value);
  if (!parsed.ok) throw internalError();
  return parsed.value;
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}

function stateConflict() {
  return new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
}

function internalError() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
