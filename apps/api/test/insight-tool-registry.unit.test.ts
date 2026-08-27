import type {
  BalanceChangeInsightRequest,
  InsightNativeResult,
} from '@workledger/contracts/insights';
import { parseDomainId, parseInstant, type DomainId, type Instant } from '@workledger/domain';

import {
  INSIGHT_TOOL_RESULT_FIELDS,
  createInsightToolRegistry,
} from '../src/insights/insight-tool-registry.js';
import type { InsightIdentity, InsightService } from '../src/insights/insight-service.js';

const ACCOUNT_ID = domainId<'Account'>('00000000-0000-4000-8000-000000000101');
const CAPTURED_AT = instant('2026-08-27T09:30:45Z');
const IDENTITY = Object.freeze({ accountId: ACCOUNT_ID, sessionFresh: true });
const BALANCE_CALL = Object.freeze({
  arguments: Object.freeze({ endDate: '2026-08-26', startDate: '2026-08-01' }),
  code: 'employee_balance_change' as const,
});

describe('Insight tool registry', () => {
  it('declares the exhaustive deny by default employee tool metadata', () => {
    const registry = createInsightToolRegistry(unexpectedService());

    expect(
      registry.definitions.map((definition) => ({
        actions: definition.outputAllowlist.actions,
        authorizationPolicy: definition.authorizationPolicy,
        code: definition.code,
        externalAdapterExposure: definition.externalAdapterExposure,
        factCodes: definition.outputAllowlist.factCodes,
        freshnessRules: definition.freshnessRules,
        limitationCodes: definition.outputAllowlist.limitationCodes,
        limits: definition.executionLimits,
        minimumResultFields: definition.minimumResultFields,
        modelExposure: definition.modelExposure,
        nativeKind: definition.nativeKind,
        purpose: definition.purpose,
        readOnly: definition.readOnly,
        sensitivity: definition.sensitivity,
        sources: definition.outputAllowlist.sources,
        workspaces: definition.workspaces,
      })),
    ).toEqual([
      {
        actions: [
          { code: 'OPEN_BALANCE_HISTORY', destination: 'MY_BALANCES' },
          { code: 'OPEN_TIME_RECORDS', destination: 'MY_TIME' },
        ],
        authorizationPolicy: {
          code: 'CURRENT_EMPLOYEE_SELF',
          requiredActions: ['TIME_BALANCE_READ'],
          requiredScope: 'SELF',
        },
        code: 'employee_balance_change',
        externalAdapterExposure: 'DENIED',
        factCodes: [
          'BALANCE_OPENING_MINUTES',
          'BALANCE_CHANGE_MINUTES',
          'BALANCE_CLOSING_MINUTES',
          'BALANCE_INCOMPLETE_DATE_COUNT',
        ],
        freshnessRules: {
          boundaryKinds: ['CALCULATED_THROUGH', 'POSTED_THROUGH'],
          mode: 'REAUTHORIZE_AND_RECOMPUTE',
        },
        limitationCodes: ['INCOMPLETE_DATES_EXCLUDED_FROM_PROJECTION'],
        limits: {
          maxActions: 2,
          maxFacts: 5,
          maxFreshnessBoundaries: 2,
          maxLimitations: 1,
          maxSources: 2,
        },
        minimumResultFields: INSIGHT_TOOL_RESULT_FIELDS,
        modelExposure: 'PRIVATE_LOCAL_MINIMIZED',
        nativeKind: 'balance-change',
        purpose: 'EXPLAIN_EMPLOYEE_BALANCE_CHANGE',
        readOnly: true,
        sensitivity: 'HIGH_PERSONAL_OPERATIONAL',
        sources: [
          { destination: 'MY_BALANCES', kind: 'TIME_ACCOUNT_LEDGER', labelAllowed: false },
          { destination: 'MY_TIME', kind: 'DAILY_TIME_RECORD', labelAllowed: false },
        ],
        workspaces: ['EMPLOYEE'],
      },
      {
        actions: [{ code: 'OPEN_LEAVE_BALANCES', destination: 'MY_BALANCES' }],
        authorizationPolicy: {
          code: 'CURRENT_EMPLOYEE_SELF',
          requiredActions: ['LEAVE_BALANCE_READ'],
          requiredScope: 'SELF',
        },
        code: 'employee_leave_projection',
        externalAdapterExposure: 'DENIED',
        factCodes: [
          'LEAVE_PROJECTION_AVAILABLE',
          'LEAVE_ACCOUNT_COUNT',
          'LEAVE_AVAILABLE_MINUTES',
          'LEAVE_RESERVED_MINUTES',
          'LEAVE_PROJECTED_REMAINING_MINUTES',
        ],
        freshnessRules: {
          boundaryKinds: ['CALCULATED_THROUGH'],
          mode: 'REAUTHORIZE_AND_RECOMPUTE',
        },
        limitationCodes: ['LEAVE_ENTITLEMENT_NOT_AVAILABLE', 'LEAVE_ACCOUNT_DETAILS_LIMITED'],
        limits: {
          maxActions: 1,
          maxFacts: 61,
          maxFreshnessBoundaries: 1,
          maxLimitations: 1,
          maxSources: 21,
        },
        minimumResultFields: INSIGHT_TOOL_RESULT_FIELDS,
        modelExposure: 'PRIVATE_LOCAL_MINIMIZED',
        nativeKind: 'leave-projection',
        purpose: 'EXPLAIN_EMPLOYEE_LEAVE_PROJECTION',
        readOnly: true,
        sensitivity: 'HIGH_PERSONAL_OPERATIONAL',
        sources: [
          { destination: 'MY_BALANCES', kind: 'LEAVE_ENTITLEMENT_LEDGER', labelAllowed: true },
        ],
        workspaces: ['EMPLOYEE'],
      },
      {
        actions: [
          { code: 'OPEN_MONTHLY_REVIEW', destination: 'MONTHLY_REVIEW' },
          { code: 'OPEN_TIME_RECORDS', destination: 'MY_TIME' },
          { code: 'OPEN_MY_REQUESTS', destination: 'MY_REQUESTS' },
        ],
        authorizationPolicy: {
          code: 'CURRENT_EMPLOYEE_SELF',
          requiredActions: ['MONTHLY_PERIOD_READ'],
          requiredScope: 'SELF',
        },
        code: 'employee_submission_blockers',
        externalAdapterExposure: 'DENIED',
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
        freshnessRules: {
          boundaryKinds: ['CALCULATED_THROUGH'],
          mode: 'REAUTHORIZE_AND_RECOMPUTE',
        },
        limitationCodes: [
          'MONTHLY_PERIOD_NOT_AVAILABLE',
          'MONTH_NOT_ENDED',
          'SUBMISSION_NOT_AVAILABLE_IN_CURRENT_STATE',
          'SUBMISSION_BLOCKER_DETAILS_LIMITED',
        ],
        limits: {
          maxActions: 3,
          maxFacts: 100,
          maxFreshnessBoundaries: 1,
          maxLimitations: 3,
          maxSources: 50,
        },
        minimumResultFields: INSIGHT_TOOL_RESULT_FIELDS,
        modelExposure: 'PRIVATE_LOCAL_MINIMIZED',
        nativeKind: 'submission-blockers',
        purpose: 'EXPLAIN_EMPLOYEE_SUBMISSION_BLOCKERS',
        readOnly: true,
        sensitivity: 'HIGH_PERSONAL_OPERATIONAL',
        sources: [
          { destination: 'MONTHLY_REVIEW', kind: 'MONTHLY_PERIOD', labelAllowed: false },
          { destination: 'MY_TIME', kind: 'DAILY_TIME_RECORD', labelAllowed: false },
          { destination: 'MY_REQUESTS', kind: 'PERSONAL_REQUEST', labelAllowed: false },
        ],
        workspaces: ['EMPLOYEE'],
      },
      {
        actions: [
          { code: 'OPEN_TODAY', destination: 'TODAY' },
          { code: 'OPEN_BALANCE_HISTORY', destination: 'MY_BALANCES' },
          { code: 'OPEN_MY_REQUESTS', destination: 'MY_REQUESTS' },
          { code: 'OPEN_MY_TIME', destination: 'MY_TIME' },
        ],
        authorizationPolicy: {
          code: 'CURRENT_EMPLOYEE_SELF',
          requiredActions: ['ATTENDANCE_READ', 'TIME_BALANCE_READ'],
          requiredScope: 'SELF',
        },
        code: 'employee_today_explanation',
        externalAdapterExposure: 'DENIED',
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
        freshnessRules: {
          boundaryKinds: ['CALCULATED_THROUGH', 'POSTED_THROUGH'],
          mode: 'REAUTHORIZE_AND_RECOMPUTE',
        },
        limitationCodes: [
          'REQUESTED_DATE_IS_NOT_TODAY',
          'TODAY_CALCULATION_INCOMPLETE',
          'TODAY_VALUES_PROVISIONAL',
          'TODAY_TIMELINE_TRUNCATED',
        ],
        limits: {
          maxActions: 4,
          maxFacts: 100,
          maxFreshnessBoundaries: 2,
          maxLimitations: 2,
          maxSources: 2,
        },
        minimumResultFields: INSIGHT_TOOL_RESULT_FIELDS,
        modelExposure: 'PRIVATE_LOCAL_MINIMIZED',
        nativeKind: 'today-explanation',
        purpose: 'EXPLAIN_EMPLOYEE_TODAY',
        readOnly: true,
        sensitivity: 'HIGH_PERSONAL_OPERATIONAL',
        sources: [
          { destination: 'TODAY', kind: 'TODAY_ATTENDANCE', labelAllowed: false },
          { destination: 'MY_BALANCES', kind: 'TIME_ACCOUNT_LEDGER', labelAllowed: false },
        ],
        workspaces: ['EMPLOYEE'],
      },
    ]);

    expect(Object.isFrozen(registry.definitions)).toBe(true);
    for (const definition of registry.definitions) {
      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.authorizationPolicy.requiredActions)).toBe(true);
      expect(Object.isFrozen(definition.outputAllowlist.factCodes)).toBe(true);
    }
  });

  it('constructs the exact Employee request and executes through the authorizing service', async () => {
    const executions: Array<{
      capturedAt: Instant;
      identity: InsightIdentity;
      request: BalanceChangeInsightRequest;
    }> = [];
    const service: InsightService = Object.freeze({
      async run(identity, request, capturedAt) {
        if (request.kind !== 'balance-change') throw new Error('Unexpected Insight kind.');
        executions.push({ capturedAt, identity, request });
        return balanceResult(request, capturedAt);
      },
    });
    const registry = createInsightToolRegistry(service);

    const result = await registry.execute(employeeContext(), BALANCE_CALL);

    expect(executions).toEqual([
      {
        capturedAt: CAPTURED_AT,
        identity: IDENTITY,
        request: {
          kind: 'balance-change',
          period: { endDate: '2026-08-26', kind: 'DATE_RANGE', startDate: '2026-08-01' },
          workspace: 'EMPLOYEE',
        },
      },
    ]);
    const execution = executions[0];
    if (execution === undefined) throw new Error('Expected one Insight tool execution.');
    expect(result).toEqual(balanceResult(execution.request, CAPTURED_AT));
  });

  it('denies unknown tools and workspace mixing before any service execution', async () => {
    let executions = 0;
    const registry = createInsightToolRegistry(
      Object.freeze({
        async run() {
          executions += 1;
          throw new Error('The authorizing service must not run.');
        },
      }),
    );

    await expect(
      registry.execute(employeeContext(), {
        arguments: { employeeIds: ['employee-1'], sql: 'select * from employees' },
        code: 'database_query',
      }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
    await expect(
      registry.execute({ ...employeeContext(), activeWorkspace: 'MANAGER' }, BALANCE_CALL),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
    await expect(
      registry.execute(employeeContext(), {
        ...BALANCE_CALL,
        arguments: { ...BALANCE_CALL.arguments, role: 'MANAGER' },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', statusCode: 422 });
    expect(executions).toBe(0);
  });

  it('rejects a globally valid result that exceeds the purpose output allowlist', async () => {
    const service: InsightService = Object.freeze({
      async run(_identity, request, capturedAt) {
        if (request.kind !== 'balance-change') throw new Error('Unexpected Insight kind.');
        return Object.freeze({
          actions: [
            Object.freeze({
              code: 'OPEN_TODAY',
              destination: 'TODAY' as const,
              period: request.period,
              reference: 'action_today',
              sourceReferences: ['source_today'],
            }),
          ],
          facts: [
            Object.freeze({
              code: 'TODAY_ATTENDANCE_STATE',
              qualifiers: ['CURRENT' as const],
              reference: 'fact_today_state',
              sourceReferences: ['source_today'],
              value: Object.freeze({ kind: 'STATE' as const, value: 'WORKING' }),
            }),
          ],
          freshness: Object.freeze({
            boundaries: [
              Object.freeze({
                kind: 'CALCULATED_THROUGH' as const,
                localDate: request.period.endDate,
                sourceReferences: ['source_today'],
              }),
            ],
            capturedAt,
          }),
          kind: request.kind,
          limitations: [],
          period: request.period,
          scope: Object.freeze({ kind: 'SELF' as const, workspace: 'EMPLOYEE' as const }),
          sources: [
            Object.freeze({
              destination: 'TODAY' as const,
              kind: 'TODAY_ATTENDANCE' as const,
              period: request.period,
              reference: 'source_today',
            }),
          ],
          timeZone: 'Europe/Berlin',
          workspace: 'EMPLOYEE' as const,
        });
      },
    });

    await expect(
      createInsightToolRegistry(service).execute(employeeContext(), BALANCE_CALL),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', statusCode: 503 });
  });
});

function balanceResult(
  request: BalanceChangeInsightRequest,
  capturedAt: Instant,
): InsightNativeResult {
  return Object.freeze({
    actions: [
      Object.freeze({
        code: 'OPEN_BALANCE_HISTORY',
        destination: 'MY_BALANCES' as const,
        period: request.period,
        reference: 'action_balance_history',
        sourceReferences: ['source_balance_ledger'],
      }),
    ],
    facts: [
      Object.freeze({
        code: 'BALANCE_CHANGE_MINUTES',
        qualifiers: ['POSTED' as const],
        reference: 'fact_balance_change',
        sourceReferences: ['source_balance_ledger'],
        value: Object.freeze({ kind: 'MINUTES' as const, value: 75 }),
      }),
    ],
    freshness: Object.freeze({
      boundaries: [
        Object.freeze({
          kind: 'POSTED_THROUGH' as const,
          localDate: request.period.endDate,
          sourceReferences: ['source_balance_ledger'],
        }),
      ],
      capturedAt,
    }),
    kind: request.kind,
    limitations: [],
    period: request.period,
    scope: Object.freeze({ kind: 'SELF' as const, workspace: 'EMPLOYEE' as const }),
    sources: [
      Object.freeze({
        destination: 'MY_BALANCES' as const,
        kind: 'TIME_ACCOUNT_LEDGER' as const,
        period: request.period,
        reference: 'source_balance_ledger',
      }),
    ],
    timeZone: 'Europe/Berlin',
    workspace: 'EMPLOYEE' as const,
  });
}

function employeeContext() {
  return Object.freeze({
    activeWorkspace: 'EMPLOYEE' as const,
    capturedAt: CAPTURED_AT,
    identity: IDENTITY,
  });
}

function unexpectedService(): InsightService {
  return Object.freeze({
    async run() {
      throw new Error('Unexpected Insight service execution.');
    },
  });
}

function domainId<Entity extends string>(value: string): DomainId<Entity> {
  const result = parseDomainId<Entity>(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}

function instant(value: string): Instant {
  const result = parseInstant(value);
  if (!result.ok) throw new Error(`Invalid test ${result.error.code}.`);
  return result.value;
}
