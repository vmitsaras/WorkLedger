import { createHash, randomUUID } from 'node:crypto';

import {
  monthlyPeriodApprovedRecordSchema,
  type MonthlyPeriod,
  type MonthlyPeriodLockRequest,
  type MonthlyPeriodReviewRequest,
  type MonthlyPeriodSubmissionRequest,
} from '@workledger/contracts';
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
  validateMonthlyPeriodSubmission,
  validateMonthlyPeriodReview,
  weekdayOfLocalDate,
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
  ApprovedMonthlySnapshotRecord,
  AuthorizationActorRecord,
  DailyProjectionRecord,
  DecisionActorRecord,
  MonthlyPeriodDecisionRecord,
  MonthlyPeriodProjectionSourceRecord,
  MonthlyPeriodRangeRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { authorizeEmployeeTarget, type AuthorizationGrantScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  deliverCommittedNotification,
  disabledNotificationDeliveryAdapter,
  type NotificationDeliveryAdapter,
} from '../notifications/delivery.js';

export type MonthlyPeriodIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const zeroResult = parseSignedMinutes(0);
if (!zeroResult.ok) throw new Error('Zero minutes must be a valid domain value.');
const zeroMinutes = zeroResult.value;

export function createMonthlyPeriodService(
  database: WorkLedgerDatabase,
  notificationDelivery: NotificationDeliveryAdapter = disabledNotificationDeliveryAdapter,
) {
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

          const submissionAuthorization = authorizeEmployeeTarget({
            action: 'MONTHLY_PERIOD_SUBMIT',
            actor,
            isCurrentManager: false,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: source.period.employeeId,
            targetOrganizationId: source.period.organizationId,
          });
          const reviewAuthorization = authorizeEmployeeTarget({
            action: 'MONTHLY_PERIOD_DECIDE',
            actor,
            isCurrentManager,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: source.period.employeeId,
            targetOrganizationId: source.period.organizationId,
          });
          const lockAuthorization = authorizeEmployeeTarget({
            action: 'MONTHLY_PERIOD_LOCK',
            actor,
            isCurrentManager,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: source.period.employeeId,
            targetOrganizationId: source.period.organizationId,
          });
          const latestSnapshot = await transaction.monthlyPeriods.findLatestSnapshot(
            context.organization.id,
            periodId,
          );
          const decisions = await transaction.monthlyPeriods.listDecisions(
            context.organization.id,
            periodId,
          );
          return projectMonthlyPeriod(
            source,
            currentLocalDate,
            timeZone.value,
            {
              canLock: lockAuthorization.allowed,
              canReview: reviewAuthorization.allowed,
              canSubmit: submissionAuthorization.allowed,
            },
            latestSnapshot,
            decisions,
          );
        },
        { isolationLevel: 'repeatable read' },
      );
    },
    async submit(
      identity: MonthlyPeriodIdentity,
      periodId: DomainId<'MonthlyPeriod'>,
      input: MonthlyPeriodSubmissionRequest,
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

          const lockedPeriod = await transaction.monthlyPeriods.lockForSubmission(
            context.organization.id,
            periodId,
          );
          if (lockedPeriod === null) {
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
          }
          const authorization = authorizeEmployeeTarget({
            action: 'MONTHLY_PERIOD_SUBMIT',
            actor,
            isCurrentManager: false,
            sessionFresh: identity.sessionFresh,
            targetEmployeeId: lockedPeriod.employeeId,
            targetOrganizationId: lockedPeriod.organizationId,
          });
          if (!authorization.allowed) throw denied();

          const source = await transaction.monthlyPeriods.loadProjectionSource(
            context.organization.id,
            periodId,
          );
          if (source === null || source.period.version !== lockedPeriod.version) {
            throw internalError();
          }
          const projection = projectMonthlyPeriod(source, currentLocalDate, timeZone.value, {
            canLock: false,
            canReview: false,
            canSubmit: true,
          });
          const transition = validateMonthlyPeriodSubmission({
            acknowledgedSourceFingerprint: input.acknowledgedSourceFingerprint,
            currentStatus: source.period.status,
            currentVersion: source.period.version,
            expectedPeriodVersion: input.expectedPeriodVersion,
            projection: {
              attention: { blockers: projection.attention.blockers },
              readiness: projection.readiness.status,
              snapshotVersion: projection.snapshotVersion,
            },
          });
          if (!transition.ok) throw submissionError(transition.error.code, projection);

          const submitted = await transaction.monthlyPeriods.submit({
            actorAccountId: context.accountId,
            expectedVersion: source.period.version,
            organizationId: context.organization.id,
            periodId,
            sourceFingerprint: transition.value.submittedSourceFingerprint,
            submittedAt: at,
          });
          if (submitted === null) {
            throw new WorkLedgerApiError({
              code: 'PERIOD_VERSION_CONFLICT',
              context: { periodVersion: source.period.version },
              statusCode: 409,
            });
          }

          await transaction.audit.appendDomain({
            actionCode: 'MONTHLY_PERIOD_SUBMITTED',
            actor: {
              accountId: context.accountId,
              kind: 'ACCOUNT',
              role: auditRole(context.roles),
            },
            facts: {
              nextStatus: submitted.status,
              previousStatus: source.period.status,
              version: submitted.version,
            },
            occurredAt: at,
            organizationId: context.organization.id,
            outcome: 'SUCCESS',
            privileged: false,
            reasonCode: null,
            requestId: null,
            restrictedReasonId: null,
            subjectEmployeeId: source.period.employeeId,
            targetId: source.period.id,
            targetKind: 'MONTHLY_PERIOD',
          });

          return projectMonthlyPeriod(
            {
              ...source,
              period: {
                ...source.period,
                status: submitted.status,
                submittedAt: submitted.submittedAt,
                submittedByAccountId: submitted.submittedByAccountId,
                submittedSourceFingerprint: submitted.submittedSourceFingerprint,
                version: submitted.version,
              },
            },
            currentLocalDate,
            timeZone.value,
            { canLock: false, canReview: false, canSubmit: true },
          );
        },
        {
          isolationLevel: 'serializable',
          retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' },
        },
      );
    },
    async review(
      identity: MonthlyPeriodIdentity,
      periodId: DomainId<'MonthlyPeriod'>,
      input: MonthlyPeriodReviewRequest,
      at: Instant,
    ): Promise<MonthlyPeriod> {
      return performMonthlyPeriodReview(
        database,
        notificationDelivery,
        identity,
        periodId,
        {
          action: input.action,
          expectedPeriodVersion: input.expectedPeriodVersion,
          expectedSnapshotFingerprint: null,
          expectedSourceFingerprint: input.expectedSourceFingerprint,
          reason: input.action === 'REQUEST_CHANGES' ? input.reason : null,
        },
        at,
      );
    },
    async lock(
      identity: MonthlyPeriodIdentity,
      periodId: DomainId<'MonthlyPeriod'>,
      input: MonthlyPeriodLockRequest,
      at: Instant,
    ): Promise<MonthlyPeriod> {
      return performMonthlyPeriodReview(
        database,
        notificationDelivery,
        identity,
        periodId,
        { action: 'LOCK', ...input, reason: null },
        at,
      );
    },
  });
}

type MonthlyReviewCommand = Readonly<{
  action: 'APPROVE' | 'LOCK' | 'REQUEST_CHANGES';
  expectedPeriodVersion: number;
  expectedSnapshotFingerprint: string | null;
  expectedSourceFingerprint: string;
  reason: string | null;
}>;

async function performMonthlyPeriodReview(
  database: WorkLedgerDatabase,
  notificationDelivery: NotificationDeliveryAdapter,
  identity: MonthlyPeriodIdentity,
  periodId: DomainId<'MonthlyPeriod'>,
  input: MonthlyReviewCommand,
  at: Instant,
): Promise<MonthlyPeriod> {
  const committed = await database.transaction(
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

      const lockedPeriod = await transaction.monthlyPeriods.lockForSubmission(
        context.organization.id,
        periodId,
      );
      if (lockedPeriod === null) {
        throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
      }
      if (actor.employeeId === lockedPeriod.employeeId) {
        throw new WorkLedgerApiError({ code: 'APPROVAL_SELF_NOT_ALLOWED', statusCode: 403 });
      }
      const isCurrentManager =
        actor.employeeId !== null &&
        (await transaction.authorization.isCurrentManager(
          context.organization.id,
          actor.employeeId,
          lockedPeriod.employeeId,
          currentLocalDate,
        ));
      const authorization = authorizeEmployeeTarget({
        action: input.action === 'LOCK' ? 'MONTHLY_PERIOD_LOCK' : 'MONTHLY_PERIOD_DECIDE',
        actor,
        isCurrentManager,
        sessionFresh: identity.sessionFresh,
        targetEmployeeId: lockedPeriod.employeeId,
        targetOrganizationId: lockedPeriod.organizationId,
      });
      if (!authorization.allowed) throw denied();
      const decisionActor = monthlyDecisionActor(actor, authorization.scope);

      const source = await transaction.monthlyPeriods.loadProjectionSource(
        context.organization.id,
        periodId,
      );
      if (source === null || source.period.version !== lockedPeriod.version) throw internalError();
      const latestSnapshot = await transaction.monthlyPeriods.findLatestSnapshot(
        context.organization.id,
        periodId,
      );
      const decisions = await transaction.monthlyPeriods.listDecisions(
        context.organization.id,
        periodId,
      );
      const projection = projectMonthlyPeriod(
        source,
        currentLocalDate,
        timeZone.value,
        { canLock: true, canReview: true, canSubmit: false },
        latestSnapshot,
        decisions,
      );
      const transition = validateMonthlyPeriodReview({
        action: input.action,
        currentSourceFingerprint: projection.snapshotVersion.sourceFingerprint,
        currentStatus: source.period.status,
        currentVersion: source.period.version,
        expectedPeriodVersion: input.expectedPeriodVersion,
        expectedSnapshotFingerprint: input.expectedSnapshotFingerprint,
        expectedSourceFingerprint: input.expectedSourceFingerprint,
        hasBlockers: projection.attention.blockers.length > 0,
        latestSnapshot:
          latestSnapshot === null
            ? null
            : {
                approvalCycle: latestSnapshot.approvalCycle,
                snapshotFingerprint: latestSnapshot.snapshotFingerprint,
                sourceFingerprint: latestSnapshot.sourceFingerprint,
              },
        ledgerReconciled: !projection.attention.blockers.some(
          ({ code }) => code === 'LEDGER_SOURCE_MISMATCH',
        ),
        reason: input.reason,
        submittedSourceFingerprint: source.period.submittedSourceFingerprint,
      });
      if (!transition.ok) throw reviewError(transition.error.code, projection);

      let snapshot = latestSnapshot;
      if (transition.value.action === 'APPROVE') {
        snapshot = await transaction.monthlyPeriods.appendSnapshot(
          createApprovalSnapshot({
            actor: decisionActor,
            approvalCycle: transition.value.approvalCycle,
            approvedAt: at,
            approvedPeriodVersion: transition.value.nextVersion,
            projection,
            source,
            timeZone: timeZone.value,
          }),
        );
      }
      if (transition.value.action !== 'REQUEST_CHANGES' && snapshot === null) throw internalError();

      const updated = await transaction.monthlyPeriods.transition({
        action: transition.value.action,
        approvedAt: transition.value.action === 'APPROVE' ? at : null,
        expectedStatus: requireReviewStatus(source.period.status),
        expectedVersion: source.period.version,
        lockedAt: transition.value.action === 'LOCK' ? at : null,
        nextStatus: transition.value.nextStatus,
        organizationId: context.organization.id,
        periodId,
      });
      if (updated === null) {
        throw new WorkLedgerApiError({
          code: 'PERIOD_VERSION_CONFLICT',
          context: { periodVersion: source.period.version },
          statusCode: 409,
        });
      }
      const decision = await transaction.monthlyPeriods.appendDecision({
        action: transition.value.action,
        actor: decisionActor,
        decidedAt: at,
        monthlyPeriodId: periodId,
        monthlySnapshotId:
          transition.value.action === 'REQUEST_CHANGES' ? null : requireSnapshot(snapshot).id,
        nextStatus: transition.value.nextStatus,
        nextVersion: transition.value.nextVersion,
        organizationId: context.organization.id,
        previousStatus: requireReviewStatus(source.period.status),
        previousVersion: source.period.version,
        reason: transition.value.action === 'REQUEST_CHANGES' ? transition.value.reason : null,
      });

      await transaction.audit.appendDomain({
        actionCode: `MONTHLY_PERIOD_${transition.value.action}`,
        actor: {
          accountId: decisionActor.accountId,
          kind: 'ACCOUNT',
          role: decisionActor.authority === 'ORGANIZATION_HR' ? 'HR_ADMINISTRATOR' : 'MANAGER',
        },
        facts: {
          nextStatus: updated.status,
          previousStatus: source.period.status,
          version: updated.version,
        },
        occurredAt: at,
        organizationId: context.organization.id,
        outcome: 'SUCCESS',
        privileged: decisionActor.authority === 'ORGANIZATION_HR',
        reasonCode: transition.value.action,
        requestId: null,
        restrictedReasonId: null,
        subjectEmployeeId: source.period.employeeId,
        targetId: periodId,
        targetKind: 'MONTHLY_PERIOD',
      });

      const notification = await transaction.notifications.append({
        deliveryRequested: notificationDelivery.configured,
        destinationPath: `/monthly-periods/${periodId}`,
        event:
          transition.value.action === 'REQUEST_CHANGES'
            ? 'ITEM_CHANGES_REQUESTED'
            : transition.value.action === 'APPROVE'
              ? 'ITEM_APPROVED'
              : 'ITEM_ACKNOWLEDGED',
        occurredAt: at,
        organizationId: context.organization.id,
        recipientEmployeeId: source.period.employeeId,
        sourceId: periodId,
        sourceKind: 'MONTHLY_PERIOD',
        sourceVersion: transition.value.nextVersion,
      });

      const nextSource = { ...source, period: updated };
      const result = projectMonthlyPeriod(
        nextSource,
        currentLocalDate,
        timeZone.value,
        { canLock: true, canReview: true, canSubmit: false },
        snapshot,
        [...decisions, decision],
      );
      return Object.freeze({ notification, result });
    },
    { isolationLevel: 'serializable', retry: { maxAttempts: 3, mode: 'DATABASE_ONLY' } },
  );
  await deliverCommittedNotification(database, notificationDelivery, committed.notification);
  return committed.result;
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
  permissions: Readonly<{ canLock: boolean; canReview: boolean; canSubmit: boolean }>,
  latestSnapshot: ApprovedMonthlySnapshotRecord | null = null,
  decisions: readonly MonthlyPeriodDecisionRecord[] = [],
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
    .map((projection) => {
      const postLockDelta = source.postLockAdjustments
        .filter(({ localDate }) => localDate === projection.localDate)
        .reduce((total, adjustment) => total + adjustment.minutes, 0);
      return toDailyInput(
        postLockDelta === 0
          ? projection
          : {
              ...projection,
              balanceMinutes: projection.balanceMinutes + postLockDelta,
              creditedMinutes: projection.creditedMinutes + postLockDelta,
              workedMinutes: projection.workedMinutes + postLockDelta,
            },
        source,
      );
    });
  const sourceFingerprint = fingerprintSource({
    absenceEffects: source.absenceEffects,
    appliedCorrections: source.appliedCorrections,
    dailyProjections: source.dailyProjections,
    employmentPeriods: source.employmentPeriods,
    holidays: source.holidays,
    ledgerEntries: source.ledgerEntries,
    period: {
      employeeId: source.period.employeeId,
      id: source.period.id,
      monthStart: source.period.monthStart,
      organizationId: source.period.organizationId,
    },
    policyAssignments: source.policyAssignments,
    postLockAdjustments: source.postLockAdjustments,
    scheduleAssignments: source.scheduleAssignments,
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
  const approved = latestSnapshot === null ? null : approvedRecord(latestSnapshot);
  const cumulativePostLockDelta = source.postLockAdjustments.reduce(
    (total, adjustment) => total + adjustment.minutes,
    0,
  );
  const postLockView =
    source.period.status !== 'LOCKED'
      ? null
      : approved === null
        ? (() => {
            throw internalError();
          })()
        : Object.freeze({
            adjustedClosingBalanceMinutes:
              approved.totals.ledgerClosingBalanceMinutes + cumulativePostLockDelta,
            adjustments: source.postLockAdjustments.map((adjustment) =>
              Object.freeze({
                adjustmentVersion: adjustment.adjustmentVersion,
                createdAt: adjustment.createdAt,
                id: adjustment.id,
                localDate: adjustment.localDate,
                minutes: adjustment.minutes,
                previousAdjustedWorkedMinutes: adjustment.previousAdjustedWorkedMinutes,
                proposedWorkedMinutes: adjustment.proposedWorkedMinutes,
                reversesAdjustmentId: adjustment.reversesAdjustmentId,
                sourceRequestId: adjustment.correctionRequestId,
              }),
            ),
            cumulativeDeltaMinutes: cumulativePostLockDelta,
            currentViewVersion: source.postLockAdjustments.at(-1)?.adjustmentVersion ?? 0,
            originalClosingBalanceMinutes: approved.totals.ledgerClosingBalanceMinutes,
            status:
              source.postLockAdjustments.length === 0
                ? ('LOCKED_BASELINE' as const)
                : ('ADJUSTED_AFTER_LOCK' as const),
          });
  if (
    postLockView !== null &&
    postLockView.adjustedClosingBalanceMinutes !==
      projected.value.totals.ledgerClosingBalanceMinutes
  ) {
    throw internalError();
  }
  const availableActions: MonthlyPeriod['availableActions'] = [];
  if (permissions.canSubmit && projected.value.readiness === 'READY_FOR_SUBMISSION') {
    availableActions.push('SUBMIT');
  }
  if (permissions.canReview && source.period.status === 'SUBMITTED') {
    availableActions.push('REQUEST_CHANGES');
    if (
      source.period.submittedSourceFingerprint ===
        projected.value.snapshotVersion.sourceFingerprint &&
      projected.value.attention.blockers.length === 0
    ) {
      availableActions.push('APPROVE');
    }
  }
  if (permissions.canReview && source.period.status === 'APPROVED') {
    availableActions.push('REQUEST_CHANGES');
  }
  if (
    permissions.canLock &&
    source.period.status === 'APPROVED' &&
    latestSnapshot?.sourceFingerprint === projected.value.snapshotVersion.sourceFingerprint &&
    projected.value.attention.blockers.length === 0
  ) {
    availableActions.push('LOCK');
  }

  return Object.freeze({
    approvedRecord: approved,
    availableActions,
    attention: Object.freeze({
      blockers: projected.value.attention.blockers.map((blocker) => Object.freeze({ ...blocker })),
      warnings: projected.value.attention.warnings.map((warning) => Object.freeze({ ...warning })),
    }),
    employeeDisplayName: source.period.employeeDisplayName,
    id: source.period.id,
    monthEnd,
    monthStart: source.period.monthStart,
    postLockView,
    readiness: Object.freeze({
      completeDateCount: projected.value.completeDateCount,
      coveredDateCount: projected.value.coveredDateCount,
      monthEnded: projected.value.monthEnded,
      status: projected.value.readiness,
    }),
    reviewHistory: decisions.map((decision) =>
      Object.freeze({
        action: decision.action,
        actorAuthority: monthlyReviewerAuthority(decision.actor.authority),
        decidedAt: decision.decidedAt,
        reason: decision.reason,
        resultingStatus: decision.nextStatus,
        version: decision.nextVersion,
      }),
    ),
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

function createApprovalSnapshot(
  input: Readonly<{
    actor: DecisionActorRecord;
    approvalCycle: number;
    approvedAt: Instant;
    approvedPeriodVersion: number;
    projection: MonthlyPeriod;
    source: MonthlyPeriodProjectionSourceRecord;
    timeZone: string;
  }>,
): ApprovedMonthlySnapshotRecord {
  const snapshotIdResult = parseDomainId<'MonthlySnapshot'>(randomUUID());
  if (!snapshotIdResult.ok) throw internalError();
  const engineVersions = [
    ...new Set(input.source.dailyProjections.map(({ engineVersion }) => engineVersion)),
  ];
  if (engineVersions.length !== 1 || engineVersions[0] === undefined) throw internalError();
  const approvedRecordWithoutFingerprint = Object.freeze({
    approvalCycle: input.approvalCycle,
    approvedAt: input.approvedAt,
    calculationEngineVersion: engineVersions[0],
    periodVersion: input.approvedPeriodVersion,
    rows: input.projection.rows.map((row) => Object.freeze({ ...row })),
    schemaVersion: input.projection.snapshotVersion.schemaVersion,
    sourceFingerprint: input.projection.snapshotVersion.sourceFingerprint,
    totals: Object.freeze({ ...input.projection.totals }),
  });
  const snapshotCore = Object.freeze({
    approvalCycle: input.approvalCycle,
    approvedAt: input.approvedAt,
    approvedPeriodVersion: input.approvedPeriodVersion,
    approver: Object.freeze({
      accountId: input.actor.accountId,
      authority: input.actor.authority,
      employeeId: input.actor.employeeId,
    }),
    calculationEngineVersion: engineVersions[0],
    employeeId: input.source.period.employeeId,
    ledgerEntries: input.source.ledgerEntries.map((entry) =>
      Object.freeze({
        amountMinutes: entry.amountMinutes,
        effectiveDate: entry.effectiveDate,
        entryId: entry.entryId,
        entryType: entry.entryType,
        explanationCode: entry.explanationCode,
        sourceKey: entry.sourceKey,
        sourceFingerprint: entry.sourceFingerprint,
      }),
    ),
    monthEnd: input.projection.monthEnd,
    monthStart: input.projection.monthStart,
    monthlyPeriodId: input.source.period.id,
    organizationId: input.source.period.organizationId,
    rows: canonicalSnapshotRows(input.projection, input.source),
    snapshotId: snapshotIdResult.value,
    snapshotSchemaVersion: input.projection.snapshotVersion.schemaVersion,
    submittedSourceFingerprint: input.projection.snapshotVersion.sourceFingerprint,
    timeZone: input.timeZone,
    totals: Object.freeze({ ...input.projection.totals }),
  });
  const snapshotFingerprint = fingerprintSource(snapshotCore);
  const approvedRecord = Object.freeze({
    ...approvedRecordWithoutFingerprint,
    snapshotFingerprint,
  });
  return Object.freeze({
    approvalCycle: input.approvalCycle,
    approvedAt: input.approvedAt,
    approver: input.actor,
    engineVersion: engineVersions[0],
    id: snapshotIdResult.value,
    monthlyPeriodId: input.source.period.id,
    organizationId: input.source.period.organizationId,
    periodVersion: input.approvedPeriodVersion,
    schemaVersion: input.projection.snapshotVersion.schemaVersion,
    snapshot: Object.freeze({ ...snapshotCore, approvedRecord, snapshotFingerprint }),
    snapshotFingerprint,
    sourceFingerprint: input.projection.snapshotVersion.sourceFingerprint,
  });
}

function canonicalSnapshotRows(
  projection: MonthlyPeriod,
  source: MonthlyPeriodProjectionSourceRecord,
) {
  return projection.rows.map((projectedRow) => {
    const daily = source.dailyProjections.find(({ id }) => id === projectedRow.recordId);
    if (daily === undefined || daily.localDate !== projectedRow.localDate) throw internalError();
    const scheduleAssignments = source.scheduleAssignments.filter((assignment) =>
      rangeContains(assignment, daily.localDate),
    );
    const policyAssignments = source.policyAssignments.filter((assignment) =>
      rangeContains(assignment, daily.localDate),
    );
    if (scheduleAssignments.length !== 1 || policyAssignments.length !== 1) throw internalError();
    const schedule = scheduleAssignments[0];
    const policy = policyAssignments[0];
    if (schedule === undefined || policy === undefined) throw internalError();
    const scheduledMinutes =
      schedule.scheduledMinutesByIsoWeekday[weekdayOfLocalDate(daily.localDate) - 1];
    if (scheduledMinutes === undefined) throw internalError();
    const holidays = source.holidays.filter(({ localDate }) => localDate === daily.localDate);
    if (holidays.length > 1) throw internalError();
    const holidayExpectedReductionMinutes = holidays.length === 0 ? 0 : scheduledMinutes;
    const absenceEffects = source.absenceEffects.filter(
      ({ localDate }) => localDate === daily.localDate,
    );
    const absenceExpectedReductionMinutes = absenceEffects.reduce(
      (total, effect) => total + effect.absenceExpectedReductionMinutes,
      0,
    );
    const absenceCreditMinutes = absenceEffects.reduce(
      (total, effect) => total + effect.absenceCreditMinutes,
      0,
    );
    if (
      scheduledMinutes - holidayExpectedReductionMinutes - absenceExpectedReductionMinutes !==
        daily.expectedMinutes ||
      absenceCreditMinutes !== daily.absenceCreditMinutes
    ) {
      throw internalError();
    }
    const appliedCorrectionSources = source.appliedCorrections.filter(
      ({ localDate }) => localDate === daily.localDate,
    );
    const dailyLedgerEntries = source.ledgerEntries.filter(
      ({ effectiveDate }) => effectiveDate === daily.localDate,
    );
    return Object.freeze({
      absenceCreditMinutes: daily.absenceCreditMinutes,
      absenceExpectedReductionMinutes,
      adjustmentMinutes: daily.adjustmentMinutes,
      balanceMinutes: daily.balanceMinutes,
      breakMinutes: daily.breakMinutes,
      calculationStatus: daily.calculationStatus,
      creditedMinutes: daily.creditedMinutes,
      dailyLedgerEntries: dailyLedgerEntries.map((entry) =>
        Object.freeze({
          amountMinutes: entry.amountMinutes,
          entryId: entry.entryId,
          entryType: entry.entryType,
          sourceFingerprint: entry.sourceFingerprint,
          sourceKey: entry.sourceKey,
        }),
      ),
      expectedMinutes: daily.expectedMinutes,
      holidayExpectedReductionMinutes,
      localDate: daily.localDate,
      neutralAbsenceEffects: absenceEffects.map((effect) =>
        Object.freeze({ effectId: effect.effectId, effectVersion: effect.effectVersion }),
      ),
      neutralSourceReferences: neutralSnapshotReferences(daily.sourceReferences),
      policy: Object.freeze({
        assignmentId: policy.id,
        policyId: policy.policyId,
        policyVersion: policy.policyVersion,
      }),
      projectionId: daily.id,
      projectionVersion: daily.projectionVersion,
      schedule: Object.freeze({
        assignmentId: schedule.id,
        scheduleId: schedule.scheduleId,
        scheduleVersion: schedule.scheduleVersion,
      }),
      scheduledMinutes,
      sourceFingerprint: daily.sourceFingerprint,
      appliedCorrections: appliedCorrectionSources.map((correction) =>
        Object.freeze({
          appliedCorrectionId: correction.appliedCorrectionId,
          version: correction.version,
        }),
      ),
      warningCodes: [...daily.warningCodes],
      workedMinutes: daily.workedMinutes,
    });
  });
}

function neutralSnapshotReferences(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string | readonly string[]>> {
  const allowed = new Set([
    'absenceEffectId',
    'absenceEffectIds',
    'adjustmentId',
    'adjustmentIds',
    'appliedCorrectionId',
    'holidayId',
    'policyAssignmentId',
    'scheduleAssignmentId',
  ]);
  const entries: Array<readonly [string, string | readonly string[]]> = [];
  for (const [key, entry] of Object.entries(value)) {
    if (!allowed.has(key)) continue;
    if (typeof entry === 'string' && UUID_PATTERN.test(entry)) {
      entries.push([key, entry]);
      continue;
    }
    if (
      Array.isArray(entry) &&
      entry.every((item): item is string => typeof item === 'string' && UUID_PATTERN.test(item))
    ) {
      entries.push([key, Object.freeze([...entry])]);
    }
  }
  return Object.freeze(Object.fromEntries(entries));
}

function approvedRecord(snapshot: ApprovedMonthlySnapshotRecord): MonthlyPeriod['approvedRecord'] {
  const parsed = monthlyPeriodApprovedRecordSchema.safeParse(snapshot.snapshot['approvedRecord']);
  if (!parsed.success) throw internalError();
  return Object.freeze(parsed.data);
}

function monthlyDecisionActor(
  actor: AuthorizationActorRecord,
  scope: AuthorizationGrantScope,
): DecisionActorRecord {
  if (scope !== 'REPORTS_LIMITED' && scope !== 'ORGANIZATION_HR') throw denied();
  if (scope === 'REPORTS_LIMITED' && actor.employeeId === null) throw denied();
  return Object.freeze({
    accountId: actor.accountId,
    authority: scope === 'REPORTS_LIMITED' ? 'CURRENT_MANAGER' : 'ORGANIZATION_HR',
    employeeId: actor.employeeId,
  });
}

function monthlyReviewerAuthority(
  authority: DecisionActorRecord['authority'],
): 'CURRENT_MANAGER' | 'ORGANIZATION_HR' {
  if (authority === 'SELF') throw internalError();
  return authority;
}

function requireReviewStatus(
  status: MonthlyPeriodProjectionSourceRecord['period']['status'],
): 'APPROVED' | 'SUBMITTED' {
  if (status !== 'APPROVED' && status !== 'SUBMITTED') throw internalError();
  return status;
}

function requireSnapshot(
  snapshot: ApprovedMonthlySnapshotRecord | null,
): ApprovedMonthlySnapshotRecord {
  if (snapshot === null) throw internalError();
  return snapshot;
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

function submissionError(
  code:
    | 'PERIOD_ALREADY_SUBMITTED'
    | 'PERIOD_LEDGER_MISMATCH'
    | 'PERIOD_LOCKED'
    | 'PERIOD_NOT_READY'
    | 'PERIOD_STATE_CONFLICT'
    | 'PERIOD_VERSION_CONFLICT'
    | 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED',
  period: MonthlyPeriod,
): WorkLedgerApiError {
  const blockerCodes = [...new Set(period.attention.blockers.map(({ code: value }) => value))];
  const affectedDates = [
    ...new Set(
      period.attention.blockers.flatMap(({ localDate }) => (localDate === null ? [] : [localDate])),
    ),
  ];
  return new WorkLedgerApiError({
    code,
    context:
      code === 'PERIOD_NOT_READY' || code === 'PERIOD_LEDGER_MISMATCH'
        ? {
            affectedDates,
            blockerCodes,
            periodVersion: period.workflow.periodVersion,
          }
        : code === 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED'
          ? { periodVersion: period.workflow.periodVersion, sourceChanged: true }
          : { periodVersion: period.workflow.periodVersion },
    statusCode: 409,
  });
}

function reviewError(
  code:
    | 'APPROVAL_REASON_REQUIRED'
    | 'PERIOD_LEDGER_MISMATCH'
    | 'PERIOD_NOT_READY'
    | 'PERIOD_SOURCE_CHANGED'
    | 'PERIOD_STATE_CONFLICT'
    | 'PERIOD_VERSION_CONFLICT',
  period: MonthlyPeriod,
): WorkLedgerApiError {
  return new WorkLedgerApiError({
    code,
    context:
      code === 'PERIOD_SOURCE_CHANGED'
        ? { periodVersion: period.workflow.periodVersion, sourceChanged: true }
        : { periodVersion: period.workflow.periodVersion },
    statusCode: code === 'APPROVAL_REASON_REQUIRED' ? 422 : 409,
  });
}

function auditRole(
  roles: readonly ('EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR')[],
) {
  if (roles.includes('EMPLOYEE')) return 'EMPLOYEE' as const;
  if (roles.includes('MANAGER')) return 'MANAGER' as const;
  if (roles.includes('HR_ADMINISTRATOR')) return 'HR_ADMINISTRATOR' as const;
  return null;
}
