import {
  localDateAtInstant,
  parseDomainId,
  parseTimeZoneId,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  CorrectionReviewRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';
import type { CorrectionDecisionRequest, CorrectionReviewItem } from '@workledger/contracts';

import { authorizeEmployeeTarget, employeeCollectionScope } from '../authorization/policy.js';
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
          .map(toReviewItem);
      });
    },
    async decide(
      identity: CorrectionReviewIdentity,
      requestIdValue: string,
      input: CorrectionDecisionRequest,
      at: Instant,
    ) {
      return database.transaction(async (transaction) => {
        const { actor, context, localDate } = await reviewContext(transaction, identity, at);
        if (actor.employeeId === null)
          throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
        const requestId = parseRequestId(requestIdValue);
        const request = await transaction.correctionRequests.findForReview(
          context.organization.id,
          requestId,
        );
        if (request === null)
          throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
        const isCurrentManager = await transaction.authorization.isCurrentManager(
          context.organization.id,
          actor.employeeId,
          request.employeeId,
          localDate,
        );
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
          actorEmployeeId: actor.employeeId,
          expectedVersion: input.expectedVersion,
          organizationId: context.organization.id,
          reason: input.reason.trim(),
          requestId,
        });
        if (updated === null)
          throw new WorkLedgerApiError({ code: 'APPROVAL_STATE_CONFLICT', statusCode: 409 });
        await transaction.audit.appendDomain({
          actionCode: 'CORRECTION_REQUEST_DECIDED',
          actor: { accountId: context.accountId, kind: 'ACCOUNT', role: auditRole(context.roles) },
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
        return Object.freeze({
          id: updated.id,
          status: updated.status as 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
          version: updated.version,
        });
      });
    },
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
  if (!context.employeeCapabilityActive)
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  return context;
}
function parseRequestId(value: string): DomainId<'CorrectionRequest'> {
  const parsed = parseDomainId<'CorrectionRequest'>(value);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'ROUTE_NOT_FOUND', statusCode: 404 });
  return parsed.value;
}
function toReviewItem(request: CorrectionReviewRecord): CorrectionReviewItem {
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
    employeeDisplayName: request.employeeDisplayName,
    events,
    id: request.id,
    localDate: request.localDate,
    originalCalculation: calculation,
    proposedEndsAt: endsAt,
    proposedStartsAt: startsAt,
    reason: request.reason,
    status: request.status === 'SUBMITTED' ? 'SUBMITTED' : 'CHANGES_REQUESTED',
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
function auditRole(
  roles: readonly ('EMPLOYEE' | 'MANAGER' | 'HR_ADMINISTRATOR' | 'SYSTEM_ADMINISTRATOR')[],
) {
  if (roles.includes('MANAGER')) return 'MANAGER' as const;
  if (roles.includes('HR_ADMINISTRATOR')) return 'HR_ADMINISTRATOR' as const;
  return null;
}
