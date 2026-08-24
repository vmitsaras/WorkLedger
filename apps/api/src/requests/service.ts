import type {
  PersonalRequestDetail,
  PersonalRequestHistory,
  PersonalRequestHistoryPage,
  PersonalRequestQuery,
} from '@workledger/contracts';
import { parseDomainId, type DomainId, type Instant } from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  ApprovalAbsenceRecord,
  ApprovalCancellationRecord,
  AuthorizationActorRecord,
  CorrectionReviewRecord,
  PersonalRequestHistoryRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { calculateStoredCoverage, toContractCoverage } from '../absence/stored-coverage.js';
import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { toCorrectionReviewItem } from '../corrections/correction-review-service.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type PersonalRequestIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

type LoadedPersonalRequest =
  | Readonly<{ applied: boolean; kind: 'CORRECTION'; record: CorrectionReviewRecord }>
  | Readonly<{ kind: 'ABSENCE'; record: ApprovalAbsenceRecord }>
  | Readonly<{
      absenceRequestId: DomainId<'AbsenceRequest'>;
      kind: 'CANCELLATION';
      record: ApprovalCancellationRecord;
    }>;

export function createPersonalRequestService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async get(
      identity: PersonalRequestIdentity,
      requestId: string,
      at: Instant,
    ): Promise<PersonalRequestDetail> {
      return database.transaction(
        async (transaction) => {
          const state = await requireSelfContext(transaction, identity, at);
          const request = await loadRequest(transaction, state.context.organization.id, requestId);
          if (request === null)
            throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
          if (request.record.employeeId !== state.employeeId) throw denied();
          return toDetail(transaction, state.context, request);
        },
        { isolationLevel: 'repeatable read' },
      );
    },

    async list(
      identity: PersonalRequestIdentity,
      query: PersonalRequestQuery,
      at: Instant,
    ): Promise<PersonalRequestHistoryPage> {
      return database.transaction(
        async (transaction) => {
          const state = await requireSelfContext(transaction, identity, at);
          const page = await transaction.personalRequests.list({
            employeeId: state.employeeId,
            limit: query.limit,
            offset: (query.page - 1) * query.limit,
            organizationId: state.context.organization.id,
            status: query.status,
            type: query.type,
          });
          return Object.freeze({
            items: page.items.map((item) =>
              Object.freeze({
                affectedEndDate: item.affectedEndDate,
                affectedStartDate: item.affectedStartDate,
                id: item.id,
                kind: item.kind,
                status: item.status,
                submittedAt: item.submittedAt,
                version: item.version,
              }),
            ),
            pagination: Object.freeze({
              limit: query.limit,
              page: query.page,
              total: page.total,
              totalPages: Math.ceil(page.total / query.limit),
            }),
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parsePersonalRequestIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): PersonalRequestIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

async function requireSelfContext(
  transaction: WorkLedgerTransaction,
  identity: PersonalRequestIdentity,
  at: Instant,
) {
  const context = requireActiveEmployeeContext(
    await transaction.accountSelfService.findContext(identity.accountId, at),
  );
  const employee = context.employee;
  if (employee === null) throw denied();
  const actor: AuthorizationActorRecord = Object.freeze({
    accountActive: context.accountActive,
    accountId: context.accountId,
    employeeCapabilityActive: context.employeeCapabilityActive,
    employeeId: employee.id,
    organizationId: context.organization.id,
    roles: context.roles,
  });
  const authorization = authorizeEmployeeTarget({
    action: 'DOMAIN_HISTORY_READ',
    actor,
    isCurrentManager: false,
    sessionFresh: identity.sessionFresh,
    targetEmployeeId: employee.id,
    targetOrganizationId: context.organization.id,
  });
  if (!authorization.allowed || authorization.scope !== 'SELF') throw denied();
  return Object.freeze({ context, employeeId: employee.id });
}

async function loadRequest(
  transaction: WorkLedgerTransaction,
  organizationId: DomainId<'Organization'>,
  requestIdValue: string,
): Promise<LoadedPersonalRequest | null> {
  const correctionId = parseDomainId<'CorrectionRequest'>(requestIdValue);
  const absenceId = parseDomainId<'AbsenceRequest'>(requestIdValue);
  const cancellationId = parseDomainId<'AbsenceCancellation'>(requestIdValue);
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
  if (cancellation !== null) {
    const source = await transaction.absenceRequests.findCancellation(
      organizationId,
      cancellationId.value,
    );
    if (source === null) throw internalError();
    return Object.freeze({
      absenceRequestId: source.absenceRequestId,
      kind: 'CANCELLATION' as const,
      record: cancellation,
    });
  }
  const absence = await transaction.absenceRequests.findForApproval(
    organizationId,
    absenceId.value,
  );
  return absence === null ? null : Object.freeze({ kind: 'ABSENCE' as const, record: absence });
}

async function toDetail(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  request: LoadedPersonalRequest,
): Promise<PersonalRequestDetail> {
  if (request.kind === 'CORRECTION') {
    const item = toCorrectionReviewItem(request.record);
    const decisions = await transaction.personalRequests.listCorrectionHistory(
      context.organization.id,
      request.record.id,
    );
    return Object.freeze({
      affectedEndDate: item.localDate,
      affectedStartDate: item.localDate,
      applicationMode: item.applicationMode,
      availableActions: [] as PersonalRequestDetail['availableActions'],
      events: item.events,
      history: prependHistory('SUBMITTED', request.record.createdAt, decisions),
      id: item.id,
      kind: 'CORRECTION' as const,
      originalCalculation: item.originalCalculation,
      proposedEndsAt: item.proposedEndsAt,
      proposedStartsAt: item.proposedStartsAt,
      requestReason: item.reason,
      status: request.applied ? ('APPLIED' as const) : item.status,
      submittedAt: request.record.createdAt,
      timeZone: context.organization.timeZone,
      version: item.version,
    });
  }

  const calculated = await calculateStoredCoverage(transaction, context, request.record);
  if (request.kind === 'CANCELLATION') {
    const decisions = await transaction.personalRequests.listCancellationHistory(
      context.organization.id,
      request.record.id,
    );
    return Object.freeze({
      absenceRequestId: request.absenceRequestId,
      absenceTypeName: request.record.absenceTypeName,
      affectedEndDate: calculated.endDate,
      affectedStartDate: calculated.startDate,
      availableActions: (['PENDING_DECISION', 'CHANGES_REQUESTED'].includes(request.record.status)
        ? ['WITHDRAW_CANCELLATION']
        : []) as PersonalRequestDetail['availableActions'],
      coverage: toContractCoverage(calculated.coverage),
      history: prependHistory('SUBMITTED', request.record.submittedAt, decisions),
      id: request.record.id,
      kind: 'CANCELLATION' as const,
      status: request.record.status,
      submittedAt: request.record.submittedAt,
      version: request.record.version,
    });
  }

  const [decisions, relatedCancellations] = await Promise.all([
    transaction.personalRequests.listAbsenceHistory(context.organization.id, request.record.id),
    transaction.personalRequests.listRelatedCancellations(
      context.organization.id,
      request.record.id,
    ),
  ]);
  const mayCancel = ['REPORTED', 'ACKNOWLEDGED', 'APPROVED', 'PARTIALLY_CANCELLED'].includes(
    request.record.status,
  );
  const cancellationPending = relatedCancellations.some((item) =>
    ['PENDING_DECISION', 'CHANGES_REQUESTED'].includes(item.status),
  );
  return Object.freeze({
    absenceTypeName: request.record.absenceTypeName,
    affectedEndDate: calculated.endDate,
    affectedStartDate: calculated.startDate,
    availableActions: (mayCancel && !cancellationPending
      ? ['REQUEST_CANCELLATION']
      : []) as PersonalRequestDetail['availableActions'],
    coverage: toContractCoverage(calculated.coverage),
    history: prependHistory(
      request.record.policy.workflow === 'REPORT_AND_ACKNOWLEDGE' ? 'REPORTED' : 'SUBMITTED',
      request.record.submittedAt,
      decisions,
    ),
    id: request.record.id,
    kind: 'ABSENCE' as const,
    relatedCancellations: relatedCancellations.map((item) => Object.freeze({ ...item })),
    status: request.record.status,
    submittedAt: request.record.submittedAt,
    version: request.record.version,
    workflow: request.record.policy.workflow,
  });
}

function prependHistory(
  action: Extract<PersonalRequestHistory['action'], 'REPORTED' | 'SUBMITTED'>,
  occurredAt: Instant,
  history: readonly PersonalRequestHistoryRecord[],
): PersonalRequestHistory[] {
  return [
    Object.freeze({ action, actor: 'SELF' as const, occurredAt, reason: null }),
    ...history.map((item) => Object.freeze({ ...item })),
  ];
}

function requireActiveEmployeeContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE') throw denied();
  return context;
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}

function internalError() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
