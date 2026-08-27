import {
  insightToolArgumentSchemas,
  insightToolCallSchema,
  insightToolCodeSchema,
  type InsightToolCall,
  type InsightToolCode,
} from '@workledger/contracts/insight-tools';
import {
  insightNativeResultSchema,
  insightWorkspaceSchema,
  type InsightKind,
  type InsightNativeAction,
  type InsightNativeResult,
  type InsightRequest,
  type InsightSource,
  type InsightWorkspace,
} from '@workledger/contracts/insights';
import type { Instant } from '@workledger/domain';

import type { EmployeeTargetAction } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import {
  EMPLOYEE_INSIGHT_REQUIRED_ACTIONS,
  type InsightIdentity,
  type InsightService,
} from './insight-service.js';

export const INSIGHT_TOOL_RESULT_FIELDS = Object.freeze([
  'actions',
  'facts',
  'freshness',
  'kind',
  'limitations',
  'period',
  'scope',
  'sources',
  'timeZone',
  'workspace',
] as const satisfies readonly (keyof InsightNativeResult)[]);

type InsightToolResultField = (typeof INSIGHT_TOOL_RESULT_FIELDS)[number];
type InsightToolArgumentSchema = (typeof insightToolArgumentSchemas)[InsightToolCode];
type InsightToolPurpose =
  | 'EXPLAIN_EMPLOYEE_BALANCE_CHANGE'
  | 'EXPLAIN_EMPLOYEE_LEAVE_PROJECTION'
  | 'EXPLAIN_EMPLOYEE_SUBMISSION_BLOCKERS'
  | 'EXPLAIN_EMPLOYEE_TODAY';

type InsightToolSourceRule = Readonly<{
  destination: InsightSource['destination'];
  kind: InsightSource['kind'];
  labelAllowed: boolean;
}>;

type InsightToolActionRule = Readonly<{
  code: string;
  destination: InsightNativeAction['destination'];
}>;

export type InsightToolDefinition = Readonly<{
  argumentSchema: InsightToolArgumentSchema;
  authorizationPolicy: Readonly<{
    code: 'CURRENT_EMPLOYEE_SELF';
    requiredActions: readonly EmployeeTargetAction[];
    requiredScope: 'SELF';
  }>;
  code: InsightToolCode;
  executionLimits: Readonly<{
    maxActions: number;
    maxFacts: number;
    maxFreshnessBoundaries: number;
    maxLimitations: number;
    maxSources: number;
  }>;
  externalAdapterExposure: 'DENIED';
  freshnessRules: Readonly<{
    boundaryKinds: readonly InsightNativeResult['freshness']['boundaries'][number]['kind'][];
    mode: 'REAUTHORIZE_AND_RECOMPUTE';
  }>;
  minimumResultFields: readonly InsightToolResultField[];
  modelExposure: 'PRIVATE_LOCAL_MINIMIZED';
  nativeKind: InsightKind;
  outputAllowlist: Readonly<{
    actions: readonly InsightToolActionRule[];
    factCodes: readonly string[];
    limitationCodes: readonly string[];
    sources: readonly InsightToolSourceRule[];
  }>;
  purpose: InsightToolPurpose;
  readOnly: true;
  sensitivity: 'HIGH_PERSONAL_OPERATIONAL';
  workspaces: readonly InsightWorkspace[];
}>;

export type InsightToolExecutionContext = Readonly<{
  activeWorkspace: InsightWorkspace;
  capturedAt: Instant;
  identity: InsightIdentity;
}>;

export interface InsightToolRegistry {
  readonly definitions: readonly InsightToolDefinition[];
  execute(context: InsightToolExecutionContext, callInput: unknown): Promise<InsightNativeResult>;
}

const employeeWorkspace = Object.freeze(['EMPLOYEE'] as const);
const resultFields = INSIGHT_TOOL_RESULT_FIELDS;

const definitionsByCode = Object.freeze({
  employee_balance_change: defineEmployeeTool({
    actions: [
      actionRule('OPEN_BALANCE_HISTORY', 'MY_BALANCES'),
      actionRule('OPEN_TIME_RECORDS', 'MY_TIME'),
    ],
    argumentSchema: insightToolArgumentSchemas.employee_balance_change,
    code: 'employee_balance_change',
    factCodes: [
      'BALANCE_OPENING_MINUTES',
      'BALANCE_CHANGE_MINUTES',
      'BALANCE_CLOSING_MINUTES',
      'BALANCE_INCOMPLETE_DATE_COUNT',
    ],
    freshnessBoundaryKinds: ['CALCULATED_THROUGH', 'POSTED_THROUGH'],
    insightKind: 'balance-change',
    limits: { actions: 2, facts: 5, freshness: 2, limitations: 1, sources: 2 },
    limitationCodes: ['INCOMPLETE_DATES_EXCLUDED_FROM_PROJECTION'],
    purpose: 'EXPLAIN_EMPLOYEE_BALANCE_CHANGE',
    sources: [
      sourceRule('TIME_ACCOUNT_LEDGER', 'MY_BALANCES', false),
      sourceRule('DAILY_TIME_RECORD', 'MY_TIME', false),
    ],
  }),
  employee_leave_projection: defineEmployeeTool({
    actions: [actionRule('OPEN_LEAVE_BALANCES', 'MY_BALANCES')],
    argumentSchema: insightToolArgumentSchemas.employee_leave_projection,
    code: 'employee_leave_projection',
    factCodes: [
      'LEAVE_PROJECTION_AVAILABLE',
      'LEAVE_ACCOUNT_COUNT',
      'LEAVE_AVAILABLE_MINUTES',
      'LEAVE_RESERVED_MINUTES',
      'LEAVE_PROJECTED_REMAINING_MINUTES',
    ],
    freshnessBoundaryKinds: ['CALCULATED_THROUGH'],
    insightKind: 'leave-projection',
    limits: { actions: 1, facts: 61, freshness: 1, limitations: 1, sources: 21 },
    limitationCodes: ['LEAVE_ENTITLEMENT_NOT_AVAILABLE', 'LEAVE_ACCOUNT_DETAILS_LIMITED'],
    purpose: 'EXPLAIN_EMPLOYEE_LEAVE_PROJECTION',
    sources: [sourceRule('LEAVE_ENTITLEMENT_LEDGER', 'MY_BALANCES', true)],
  }),
  employee_submission_blockers: defineEmployeeTool({
    actions: [
      actionRule('OPEN_MONTHLY_REVIEW', 'MONTHLY_REVIEW'),
      actionRule('OPEN_TIME_RECORDS', 'MY_TIME'),
      actionRule('OPEN_MY_REQUESTS', 'MY_REQUESTS'),
    ],
    argumentSchema: insightToolArgumentSchemas.employee_submission_blockers,
    code: 'employee_submission_blockers',
    factCodes: [
      'SUBMISSION_BLOCKERS_AVAILABLE',
      'MONTHLY_WORKFLOW_STATUS',
      'MONTH_ENDED',
      'SUBMISSION_BLOCKER_COUNT',
      'MONTHLY_COMPLETE_DATE_COUNT',
      'MONTHLY_COVERED_DATE_COUNT',
      'MONTHLY_READINESS_STATUS',
      'SUBMISSION_BLOCKER',
    ],
    freshnessBoundaryKinds: ['CALCULATED_THROUGH'],
    insightKind: 'submission-blockers',
    limits: { actions: 3, facts: 100, freshness: 1, limitations: 3, sources: 50 },
    limitationCodes: [
      'MONTHLY_PERIOD_NOT_AVAILABLE',
      'MONTH_NOT_ENDED',
      'SUBMISSION_NOT_AVAILABLE_IN_CURRENT_STATE',
      'SUBMISSION_BLOCKER_DETAILS_LIMITED',
    ],
    purpose: 'EXPLAIN_EMPLOYEE_SUBMISSION_BLOCKERS',
    sources: [
      sourceRule('MONTHLY_PERIOD', 'MONTHLY_REVIEW', false),
      sourceRule('DAILY_TIME_RECORD', 'MY_TIME', false),
      sourceRule('PERSONAL_REQUEST', 'MY_REQUESTS', false),
    ],
  }),
  employee_today_explanation: defineEmployeeTool({
    actions: [
      actionRule('OPEN_TODAY', 'TODAY'),
      actionRule('OPEN_BALANCE_HISTORY', 'MY_BALANCES'),
      actionRule('OPEN_MY_REQUESTS', 'MY_REQUESTS'),
      actionRule('OPEN_MY_TIME', 'MY_TIME'),
    ],
    argumentSchema: insightToolArgumentSchemas.employee_today_explanation,
    code: 'employee_today_explanation',
    factCodes: [
      'TODAY_EXPLANATION_AVAILABLE',
      'TODAY_ATTENDANCE_STATE',
      'TODAY_CALCULATION_STATUS',
      'POSTED_BALANCE_MINUTES',
      'TODAY_SCHEDULED_MINUTES',
      'TODAY_EXPECTED_MINUTES',
      'TODAY_WORKED_MINUTES',
      'TODAY_BREAK_MINUTES',
      'TODAY_ABSENCE_CREDIT_MINUTES',
      'TODAY_ABSENCE_EXPECTED_REDUCTION_MINUTES',
      'TODAY_HOLIDAY_EXPECTED_REDUCTION_MINUTES',
      'TODAY_APPROVED_CORRECTION_MINUTES',
      'TODAY_OTHER_APPROVED_ADJUSTMENT_MINUTES',
      'TODAY_CREDITED_MINUTES',
      'TODAY_DIFFERENCE_MINUTES',
      'TODAY_ACTIVE_ELAPSED_MINUTES',
      'TODAY_REMAINING_EXPECTED_MINUTES',
      'TODAY_ESTIMATED_FINISH_AT',
      'TODAY_ATTENTION',
    ],
    freshnessBoundaryKinds: ['CALCULATED_THROUGH', 'POSTED_THROUGH'],
    insightKind: 'today-explanation',
    limits: { actions: 4, facts: 100, freshness: 2, limitations: 2, sources: 2 },
    limitationCodes: [
      'REQUESTED_DATE_IS_NOT_TODAY',
      'TODAY_CALCULATION_INCOMPLETE',
      'TODAY_VALUES_PROVISIONAL',
      'TODAY_TIMELINE_TRUNCATED',
    ],
    purpose: 'EXPLAIN_EMPLOYEE_TODAY',
    sources: [
      sourceRule('TODAY_ATTENDANCE', 'TODAY', false),
      sourceRule('TIME_ACCOUNT_LEDGER', 'MY_BALANCES', false),
    ],
  }),
} as const satisfies Readonly<Record<InsightToolCode, InsightToolDefinition>>);

const definitions: readonly InsightToolDefinition[] = Object.freeze(
  Object.values(definitionsByCode),
);

export function createInsightToolRegistry(service: InsightService): InsightToolRegistry {
  return Object.freeze({
    definitions,
    async execute(context: InsightToolExecutionContext, callInput: unknown) {
      const workspace = insightWorkspaceSchema.safeParse(context.activeWorkspace);
      const toolCode = insightToolCodeSchema.safeParse(readToolCode(callInput));
      if (!workspace.success || !toolCode.success) throw accessDenied();

      const definition = definitionsByCode[toolCode.data];
      if (!definition.workspaces.includes(workspace.data)) throw accessDenied();

      const parsedCall = insightToolCallSchema.safeParse(callInput);
      if (!parsedCall.success) {
        throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
      }

      const request = requestForToolCall(parsedCall.data);
      const result = insightNativeResultSchema.safeParse(
        await service.run(context.identity, request, context.capturedAt),
      );
      if (
        !result.success ||
        !resultMatchesDefinition(result.data, definition, request, context.capturedAt)
      ) {
        throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
      }
      return result.data;
    },
  });
}

function defineEmployeeTool(
  input: Readonly<{
    actions: readonly InsightToolActionRule[];
    argumentSchema: InsightToolArgumentSchema;
    code: InsightToolCode;
    factCodes: readonly string[];
    freshnessBoundaryKinds: readonly InsightNativeResult['freshness']['boundaries'][number]['kind'][];
    insightKind: InsightKind;
    limitationCodes: readonly string[];
    limits: Readonly<{
      actions: number;
      facts: number;
      freshness: number;
      limitations: number;
      sources: number;
    }>;
    purpose: InsightToolPurpose;
    sources: readonly InsightToolSourceRule[];
  }>,
): InsightToolDefinition {
  return Object.freeze({
    argumentSchema: input.argumentSchema,
    authorizationPolicy: Object.freeze({
      code: 'CURRENT_EMPLOYEE_SELF' as const,
      requiredActions: Object.freeze([...EMPLOYEE_INSIGHT_REQUIRED_ACTIONS[input.insightKind]]),
      requiredScope: 'SELF' as const,
    }),
    code: input.code,
    executionLimits: Object.freeze({
      maxActions: input.limits.actions,
      maxFacts: input.limits.facts,
      maxFreshnessBoundaries: input.limits.freshness,
      maxLimitations: input.limits.limitations,
      maxSources: input.limits.sources,
    }),
    externalAdapterExposure: 'DENIED' as const,
    freshnessRules: Object.freeze({
      boundaryKinds: Object.freeze([...input.freshnessBoundaryKinds]),
      mode: 'REAUTHORIZE_AND_RECOMPUTE' as const,
    }),
    minimumResultFields: resultFields,
    modelExposure: 'PRIVATE_LOCAL_MINIMIZED' as const,
    nativeKind: input.insightKind,
    outputAllowlist: Object.freeze({
      actions: Object.freeze([...input.actions]),
      factCodes: Object.freeze([...input.factCodes]),
      limitationCodes: Object.freeze([...input.limitationCodes]),
      sources: Object.freeze([...input.sources]),
    }),
    purpose: input.purpose,
    readOnly: true as const,
    sensitivity: 'HIGH_PERSONAL_OPERATIONAL' as const,
    workspaces: employeeWorkspace,
  });
}

function requestForToolCall(call: InsightToolCall): InsightRequest {
  switch (call.code) {
    case 'employee_balance_change':
      return Object.freeze({
        kind: 'balance-change' as const,
        period: Object.freeze({ kind: 'DATE_RANGE' as const, ...call.arguments }),
        workspace: 'EMPLOYEE' as const,
      });
    case 'employee_leave_projection':
      return Object.freeze({
        kind: 'leave-projection' as const,
        period: Object.freeze({ kind: 'DATE' as const, ...call.arguments }),
        workspace: 'EMPLOYEE' as const,
      });
    case 'employee_submission_blockers':
      return Object.freeze({
        kind: 'submission-blockers' as const,
        period: Object.freeze({ kind: 'MONTH' as const, ...call.arguments }),
        workspace: 'EMPLOYEE' as const,
      });
    case 'employee_today_explanation':
      return Object.freeze({
        kind: 'today-explanation' as const,
        period: Object.freeze({ kind: 'DATE' as const, ...call.arguments }),
        workspace: 'EMPLOYEE' as const,
      });
  }
}

function resultMatchesDefinition(
  result: InsightNativeResult,
  definition: InsightToolDefinition,
  request: InsightRequest,
  capturedAt: Instant,
): boolean {
  if (
    result.kind !== definition.nativeKind ||
    result.workspace !== 'EMPLOYEE' ||
    result.scope.kind !== 'SELF' ||
    result.freshness.capturedAt !== capturedAt ||
    !periodsMatch(result.period, request.period)
  ) {
    return false;
  }
  if (result.actions.length > definition.executionLimits.maxActions) return false;
  if (result.facts.length > definition.executionLimits.maxFacts) return false;
  if (
    result.freshness.boundaries.length > definition.executionLimits.maxFreshnessBoundaries ||
    result.limitations.length > definition.executionLimits.maxLimitations ||
    result.sources.length > definition.executionLimits.maxSources
  ) {
    return false;
  }

  const factCodes = new Set(definition.outputAllowlist.factCodes);
  if (result.facts.some(({ code }) => !factCodes.has(code))) return false;
  const limitationCodes = new Set(definition.outputAllowlist.limitationCodes);
  if (result.limitations.some(({ code }) => !limitationCodes.has(code))) return false;
  const freshnessKinds = new Set(definition.freshnessRules.boundaryKinds);
  if (result.freshness.boundaries.some(({ kind }) => !freshnessKinds.has(kind))) return false;

  for (const source of result.sources) {
    const rule = definition.outputAllowlist.sources.find(
      ({ destination, kind }) => destination === source.destination && kind === source.kind,
    );
    if (rule === undefined || (!rule.labelAllowed && source.label !== undefined)) return false;
  }
  for (const action of result.actions) {
    if (
      !definition.outputAllowlist.actions.some(
        ({ code, destination }) => code === action.code && destination === action.destination,
      )
    ) {
      return false;
    }
  }
  return true;
}

function periodsMatch(
  left: InsightNativeResult['period'],
  right: InsightRequest['period'],
): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case 'DATE':
      return right.kind === 'DATE' && left.date === right.date;
    case 'DATE_RANGE':
      return (
        right.kind === 'DATE_RANGE' &&
        left.startDate === right.startDate &&
        left.endDate === right.endDate
      );
    case 'MONTH':
      return right.kind === 'MONTH' && left.monthStart === right.monthStart;
  }
}

function sourceRule(
  kind: InsightSource['kind'],
  destination: InsightSource['destination'],
  labelAllowed: boolean,
): InsightToolSourceRule {
  return Object.freeze({ destination, kind, labelAllowed });
}

function actionRule(
  code: string,
  destination: InsightNativeAction['destination'],
): InsightToolActionRule {
  return Object.freeze({ code, destination });
}

function readToolCode(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || !('code' in input)) return undefined;
  return input.code;
}

function accessDenied(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
