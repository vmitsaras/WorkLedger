import {
  insightNativeResultSchema,
  insightRequestSchema,
  type BalanceChangeInsightRequest,
  type InsightKind,
  type InsightNativePayload,
  type InsightNativeResult,
  type InsightRequest,
  type LeaveProjectionInsightRequest,
  type SubmissionBlockersInsightRequest,
  type TodayExplanationInsightRequest,
} from '@workledger/contracts/insights';
import {
  parseDomainId,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type TimeZoneId,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { authorizeEmployeeTarget, type EmployeeTargetAction } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type InsightIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export type EmployeeInsightAuthority = Readonly<{
  accountId: DomainId<'Account'>;
  employeeId: DomainId<'Employee'>;
  organizationId: DomainId<'Organization'>;
  scope: 'SELF';
  timeZone: TimeZoneId;
  workspace: 'EMPLOYEE';
}>;

export type InsightHandlerInput<Request extends InsightRequest> = Readonly<{
  authority: EmployeeInsightAuthority;
  capturedAt: Instant;
  request: Request;
  transaction: WorkLedgerTransaction;
}>;

export type InsightHandler<Request extends InsightRequest> = (
  input: InsightHandlerInput<Request>,
) => Promise<InsightNativePayload>;

export type InsightHandlers = Readonly<{
  'balance-change'?: InsightHandler<BalanceChangeInsightRequest>;
  'leave-projection'?: InsightHandler<LeaveProjectionInsightRequest>;
  'submission-blockers'?: InsightHandler<SubmissionBlockersInsightRequest>;
  'today-explanation'?: InsightHandler<TodayExplanationInsightRequest>;
}>;

export interface InsightService {
  run(
    identity: InsightIdentity,
    request: InsightRequest,
    capturedAt: Instant,
  ): Promise<InsightNativeResult>;
}

const requiredEmployeeActions = {
  'balance-change': ['TIME_BALANCE_READ'],
  'leave-projection': ['LEAVE_BALANCE_READ'],
  'submission-blockers': ['MONTHLY_PERIOD_READ'],
  'today-explanation': ['ATTENDANCE_READ', 'TIME_BALANCE_READ'],
} as const satisfies Readonly<Record<InsightKind, readonly EmployeeTargetAction[]>>;

export function createInsightService(
  database: WorkLedgerDatabase,
  handlers: InsightHandlers,
): InsightService {
  const service: InsightService = {
    async run(identity, requestInput, capturedAt) {
      const parsedRequest = insightRequestSchema.safeParse(requestInput);
      if (!parsedRequest.success) {
        throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
      }
      const request = parsedRequest.data;

      return database.transaction(
        async (transaction) => {
          const context = requireActiveEmployeeContext(
            await transaction.accountSelfService.findContext(identity.accountId, capturedAt),
          );
          const employee = context.employee;
          if (employee === null) {
            throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
          }
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) {
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          }

          const authority = Object.freeze({
            accountId: context.accountId,
            employeeId: employee.id,
            organizationId: context.organization.id,
            scope: 'SELF' as const,
            timeZone: timeZone.value,
            workspace: 'EMPLOYEE' as const,
          });
          authorizeInsightRequest(identity, context, request.kind);

          const payload = await executeInsightHandler(
            handlers,
            Object.freeze({ authority, capturedAt, request, transaction }),
          );
          const result = insightNativeResultSchema.safeParse({
            actions: payload.actions,
            facts: payload.facts,
            freshness: {
              boundaries: payload.freshnessBoundaries,
              capturedAt,
            },
            kind: request.kind,
            limitations: payload.limitations,
            period: request.period,
            scope: {
              kind: authority.scope,
              workspace: authority.workspace,
            },
            sources: payload.sources,
            timeZone: authority.timeZone,
            workspace: authority.workspace,
          });
          if (!result.success) {
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          }
          return result.data;
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  };
  return Object.freeze(service);
}

export function parseInsightIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): InsightIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

function authorizeInsightRequest(
  identity: InsightIdentity,
  context: AccountSelfContextRecord,
  kind: InsightKind,
): void {
  const employee = context.employee;
  if (employee === null) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
  const actor = {
    accountActive: context.accountActive,
    accountId: context.accountId,
    employeeCapabilityActive: context.employeeCapabilityActive,
    employeeId: employee.id,
    organizationId: context.organization.id,
    roles: context.roles,
  } as const;
  for (const action of requiredEmployeeActions[kind]) {
    const authorization = authorizeEmployeeTarget({
      action,
      actor,
      isCurrentManager: false,
      sessionFresh: identity.sessionFresh,
      targetEmployeeId: employee.id,
      targetOrganizationId: context.organization.id,
    });
    if (!authorization.allowed || authorization.scope !== 'SELF') {
      throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
    }
  }
}

async function executeInsightHandler(
  handlers: InsightHandlers,
  input: InsightHandlerInput<InsightRequest>,
): Promise<InsightNativePayload> {
  switch (input.request.kind) {
    case 'balance-change':
      return requireHandler(handlers['balance-change'])(
        Object.freeze({ ...input, request: input.request }),
      );
    case 'leave-projection':
      return requireHandler(handlers['leave-projection'])(
        Object.freeze({ ...input, request: input.request }),
      );
    case 'submission-blockers':
      return requireHandler(handlers['submission-blockers'])(
        Object.freeze({ ...input, request: input.request }),
      );
    case 'today-explanation':
      return requireHandler(handlers['today-explanation'])(
        Object.freeze({ ...input, request: input.request }),
      );
  }
}

function requireHandler<Request extends InsightRequest>(
  handler: InsightHandler<Request> | undefined,
): InsightHandler<Request> {
  if (handler === undefined) {
    throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
  }
  return handler;
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
