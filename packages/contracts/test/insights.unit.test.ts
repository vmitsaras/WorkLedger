import {
  INSIGHT_TOOL_CODES,
  MAX_INSIGHT_TOOL_DATE_RANGE_DAYS,
  insightToolArgumentSchemas,
  insightToolCallSchema,
} from '../src/insight-tools.js';
import {
  MAX_INSIGHT_PRIOR_TURNS,
  MAX_INSIGHT_QUESTION_CODE_POINTS,
  insightInterpretationRequestSchema,
  insightInterpretationSchema,
  insightNativePayloadSchema,
  insightNativeResultSchema,
  insightRequestSchema,
  insightRunResponseEnvelopeSchema,
  hrInsightRequestSchema,
  hrInsightRunResponseEnvelopeSchema,
  systemInsightNativeResultSchema,
  systemInsightRequestSchema,
} from '../src/insights.js';

const source = Object.freeze({
  destination: 'MY_BALANCES' as const,
  kind: 'TIME_ACCOUNT_LEDGER' as const,
  period: Object.freeze({
    endDate: '2026-08-31',
    kind: 'DATE_RANGE' as const,
    startDate: '2026-08-01',
  }),
  reference: 'source_balance_ledger',
});

const payload = Object.freeze({
  actions: [
    Object.freeze({
      code: 'OPEN_BALANCE_HISTORY',
      destination: 'MY_BALANCES' as const,
      period: source.period,
      reference: 'action_balance_history',
      sourceReferences: [source.reference],
    }),
  ],
  facts: [
    Object.freeze({
      code: 'CLOSING_BALANCE_MINUTES',
      qualifiers: ['POSTED' as const],
      reference: 'fact_closing_balance',
      sourceReferences: [source.reference],
      value: Object.freeze({ kind: 'MINUTES' as const, value: 135 }),
    }),
  ],
  freshnessBoundaries: [
    Object.freeze({
      kind: 'POSTED_THROUGH' as const,
      localDate: '2026-08-31',
      sourceReferences: [source.reference],
    }),
  ],
  limitations: [],
  sources: [source],
});

function validBalanceChangeResult() {
  return Object.freeze({
    actions: payload.actions,
    facts: payload.facts,
    freshness: Object.freeze({
      boundaries: payload.freshnessBoundaries,
      capturedAt: '2026-09-01T08:15:30Z',
    }),
    kind: 'balance-change' as const,
    limitations: payload.limitations,
    period: source.period,
    scope: Object.freeze({ kind: 'SELF' as const, workspace: 'EMPLOYEE' as const }),
    sources: payload.sources,
    timeZone: 'Europe/Berlin',
    workspace: 'EMPLOYEE' as const,
  });
}

describe('Insight contracts', () => {
  it('accepts only the complete allowlisted System technical overview', () => {
    const request = { kind: 'SYSTEM_TECHNICAL_OVERVIEW', workspace: 'SYSTEM' } as const;
    expect(systemInsightRequestSchema.parse(request)).toEqual(request);
    expect(
      systemInsightRequestSchema.safeParse({ ...request, employeeId: 'employee-1' }).success,
    ).toBe(false);

    const sourceCodes = [
      'APPLICATION_MANIFEST',
      'DATABASE_READINESS',
      'HOST_OPERATOR_PROCEDURES',
      'MAIL_ADAPTER_CONFIGURATION',
      'AUTHENTICATION_SECURITY_PROFILE',
    ] as const;
    const result = {
      actions: [
        {
          code: 'OPEN_SYSTEM_OPERATIONS',
          destination: 'SYSTEM_OPERATIONS',
          sourceCodes,
        },
      ],
      facts: [
        { code: 'APPLICATION_VERSION', source: 'APPLICATION_MANIFEST', value: '0.15.0' },
        { code: 'SERVICE_HEALTH', source: 'DATABASE_READINESS', value: 'HEALTHY' },
        { code: 'DATABASE_HEALTH', source: 'DATABASE_READINESS', value: 'HEALTHY' },
        { code: 'EXPECTED_SCHEMA_STATUS', source: 'DATABASE_READINESS', value: 'READY' },
        {
          code: 'BACKUP_MANAGEMENT',
          source: 'HOST_OPERATOR_PROCEDURES',
          value: 'HOST_OPERATOR_MANAGED',
        },
        {
          code: 'MAIL_DELIVERY_CONFIGURATION',
          source: 'MAIL_ADAPTER_CONFIGURATION',
          value: 'NOT_CONFIGURED',
        },
        {
          code: 'SESSION_IDLE_TIMEOUT_MINUTES',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: 30,
        },
        {
          code: 'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: 720,
        },
        {
          code: 'SESSION_FRESH_WINDOW_MINUTES',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: 15,
        },
        {
          code: 'PERSISTENT_REMEMBER_ME',
          source: 'AUTHENTICATION_SECURITY_PROFILE',
          value: false,
        },
      ],
      freshness: { capturedAt: '2026-08-28T12:00:00Z' },
      kind: request.kind,
      limitations: [
        {
          code: 'BACKUP_RUNTIME_STATUS_HOST_OWNED',
          material: true,
          source: 'HOST_OPERATOR_PROCEDURES',
        },
      ],
      scope: { kind: 'TECHNICAL_DIAGNOSTICS', workspace: request.workspace },
      sources: sourceCodes.map((code) => ({ code, destination: 'SYSTEM_OPERATIONS' })),
      workspace: request.workspace,
    } as const;

    expect(systemInsightNativeResultSchema.parse(result)).toEqual(result);
    expect(
      systemInsightNativeResultSchema.safeParse({ ...result, facts: result.facts.slice(1) })
        .success,
    ).toBe(false);
    expect(
      systemInsightNativeResultSchema.safeParse({
        ...result,
        facts: [...result.facts.slice(0, -1), result.facts[0]],
      }).success,
    ).toBe(false);
    const serialized = JSON.stringify(result);
    for (const forbidden of [
      'employee',
      'attendance',
      'absence',
      'balance',
      'requestId',
      'organizationId',
      'email',
      'prompt',
      'model',
    ]) {
      expect(serialized.toLocaleLowerCase('en-US')).not.toContain(
        forbidden.toLocaleLowerCase('en-US'),
      );
    }
  });

  it('accepts only the four purpose specific tool calls with strict bounded arguments', () => {
    const calls = [
      {
        arguments: { endDate: '2026-12-31', startDate: '2026-01-01' },
        code: 'employee_balance_change',
      },
      {
        arguments: { date: '2026-08-31' },
        code: 'employee_leave_projection',
      },
      {
        arguments: { monthStart: '2026-08-01' },
        code: 'employee_submission_blockers',
      },
      {
        arguments: { date: '2026-08-27' },
        code: 'employee_today_explanation',
      },
    ] as const;

    expect(INSIGHT_TOOL_CODES).toEqual(calls.map(({ code }) => code));
    for (const call of calls) {
      expect(insightToolCallSchema.parse(call)).toEqual(call);
      expect(insightToolArgumentSchemas[call.code].parse(call.arguments)).toEqual(call.arguments);
    }
    expect(
      insightToolArgumentSchemas.employee_balance_change.safeParse({
        endDate: '2027-01-01',
        startDate: '2026-01-01',
      }).success,
    ).toBe(true);
    expect(MAX_INSIGHT_TOOL_DATE_RANGE_DAYS).toBe(366);
  });

  it('rejects unrestricted ranges, authority claims, generic queries, and unknown tool calls', () => {
    for (const call of [
      {
        arguments: { endDate: '2027-01-02', startDate: '2026-01-01' },
        code: 'employee_balance_change',
      },
      {
        arguments: { endDate: '2026-08-01', startDate: '2026-08-02' },
        code: 'employee_balance_change',
      },
      {
        arguments: { date: '2026-08-27', employeeId: 'employee-1' },
        code: 'employee_today_explanation',
      },
      {
        arguments: { monthStart: '2026-08-02' },
        code: 'employee_submission_blockers',
      },
      {
        arguments: { date: '2026-08-27', role: 'HR_ADMINISTRATOR' },
        code: 'employee_today_explanation',
      },
      {
        arguments: { query: 'select * from employees' },
        code: 'database_query',
      },
      {
        arguments: { fields: ['*'], filters: {} },
        code: 'report_query',
      },
    ]) {
      expect(insightToolCallSchema.safeParse(call).success).toBe(false);
    }
  });

  it('accepts only the kind specific bounded period and optional visible context', () => {
    expect(
      insightRequestSchema.parse({
        context: {
          kind: 'MY_BALANCES',
          period: source.period,
          sourceReferences: ['source_balance_ledger'],
        },
        kind: 'balance-change',
        period: source.period,
        workspace: 'EMPLOYEE',
      }),
    ).toEqual({
      context: {
        kind: 'MY_BALANCES',
        period: source.period,
        sourceReferences: ['source_balance_ledger'],
      },
      kind: 'balance-change',
      period: source.period,
      workspace: 'EMPLOYEE',
    });

    for (const request of [
      {
        kind: 'submission-blockers',
        period: { kind: 'MONTH', monthStart: '2026-08-01' },
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'leave-projection',
        period: { date: '2026-08-31', kind: 'DATE' },
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        workspace: 'EMPLOYEE',
      },
    ]) {
      expect(insightRequestSchema.safeParse(request).success).toBe(true);
    }
  });

  it('rejects caller supplied authority, raw filters, prose, and mismatched periods', () => {
    for (const request of [
      {
        accountId: 'account-1',
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'balance-change',
        organizationId: 'organization-1',
        period: source.period,
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'balance-change',
        period: source.period,
        rawFilter: { employeeIds: ['employee-1'] },
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'today-explanation',
        period: { kind: 'MONTH', monthStart: '2026-08-01' },
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'submission-blockers',
        period: { kind: 'MONTH', monthStart: '2026-08-02' },
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        question: 'Inspect another employee',
        role: 'HR_ADMINISTRATOR',
        workspace: 'EMPLOYEE',
      },
      {
        kind: 'today-explanation',
        period: { date: '2026-08-27', kind: 'DATE' },
        workspace: 'MANAGER',
      },
    ]) {
      expect(insightRequestSchema.safeParse(request).success).toBe(false);
    }
  });

  it('validates a complete model independent native result', () => {
    expect(insightNativePayloadSchema.parse(payload)).toEqual(payload);
    expect(insightNativeResultSchema.parse(validBalanceChangeResult())).toEqual(
      validBalanceChangeResult(),
    );

    const serialized = JSON.stringify(validBalanceChangeResult());
    for (const forbidden of [
      'accountId',
      'employeeId',
      'organizationId',
      'role',
      'question',
      'prompt',
      'model',
      'reason',
      'note',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('keeps posted, projected, provisional, suppressed, and unavailable facts distinct', () => {
    const invalidFacts = [
      {
        ...payload.facts[0],
        qualifiers: ['POSTED', 'PROVISIONAL'],
      },
      {
        ...payload.facts[0],
        qualifiers: ['SUPPRESSED'],
      },
      {
        ...payload.facts[0],
        qualifiers: ['CURRENT'],
        value: null,
      },
      {
        ...payload.facts[0],
        value: { kind: 'MINUTES', value: 1.5 },
      },
    ];

    for (const fact of invalidFacts) {
      expect(
        insightNativePayloadSchema.safeParse({
          ...payload,
          facts: [fact],
        }).success,
      ).toBe(false);
    }

    expect(
      insightNativePayloadSchema.safeParse({
        ...payload,
        facts: [
          {
            ...payload.facts[0],
            qualifiers: ['SUPPRESSED'],
            value: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects duplicate and unresolved native references', () => {
    expect(
      insightNativeResultSchema.safeParse({
        ...validBalanceChangeResult(),
        sources: [source, source],
      }).success,
    ).toBe(false);
    expect(
      insightNativeResultSchema.safeParse({
        ...validBalanceChangeResult(),
        scope: { kind: 'TECHNICAL_DIAGNOSTICS', workspace: 'EMPLOYEE' },
      }).success,
    ).toBe(false);
    expect(
      insightNativeResultSchema.safeParse({
        ...validBalanceChangeResult(),
        sources: [{ ...source, destination: 'TODAY' }],
      }).success,
    ).toBe(false);
    expect(
      insightNativeResultSchema.safeParse({
        ...validBalanceChangeResult(),
        facts: [
          {
            ...payload.facts[0],
            sourceReferences: ['source_not_in_result'],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      insightNativeResultSchema.safeParse({
        ...validBalanceChangeResult(),
        freshness: {
          boundaries: [payload.freshnessBoundaries[0], payload.freshnessBoundaries[0]],
          capturedAt: '2026-09-01T08:15:30Z',
        },
      }).success,
    ).toBe(false);
  });

  it('bounds employee interpretation questions and prior turns in request memory', () => {
    const request = {
      insight: {
        kind: 'balance-change',
        period: source.period,
        workspace: 'EMPLOYEE',
      },
      priorTurns: Array.from({ length: MAX_INSIGHT_PRIOR_TURNS }, (_, index) => ({
        answer: `Grounded answer ${index}`,
        question: `Follow up ${index}`,
      })),
      question: 'Why did this change?',
    };
    expect(insightInterpretationRequestSchema.parse(request)).toEqual(request);
    expect(
      insightInterpretationRequestSchema.safeParse({
        ...request,
        question: '🕘'.repeat(MAX_INSIGHT_QUESTION_CODE_POINTS),
      }).success,
    ).toBe(true);

    for (const invalid of [
      { ...request, question: '' },
      { ...request, question: 'x'.repeat(MAX_INSIGHT_QUESTION_CODE_POINTS + 1) },
      {
        ...request,
        priorTurns: [...request.priorTurns, { answer: 'Another answer', question: 'Another' }],
      },
      { ...request, employeeId: 'employee-1' },
    ]) {
      expect(insightInterpretationRequestSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('accepts only strict provider independent interpretation references and safe availability', () => {
    const interpretation = {
      locale: 'en-GB',
      statements: [
        {
          actionReferences: ['action_balance_history'],
          factReferences: ['fact_closing_balance'],
          limitationReferences: [],
          sourceReferences: ['source_balance_ledger'],
          text: 'The current evidence explains the change.',
        },
      ],
    };
    expect(insightInterpretationSchema.parse(interpretation)).toEqual(interpretation);
    expect(
      insightInterpretationSchema.safeParse({
        ...interpretation,
        statements: [
          {
            ...interpretation.statements[0],
            factReferences: ['fact_closing_balance', 'fact_closing_balance'],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      insightRunResponseEnvelopeSchema.safeParse({
        data: validBalanceChangeResult(),
        meta: {
          interpretationAvailability: 'READY',
          requestId: '123e4567-e89b-42d3-a456-426614174000',
        },
      }).success,
    ).toBe(true);
  });

  it('keeps manager purposes date-scoped, current-direct-report scoped, and source-bound', () => {
    const request = {
      kind: 'team-coverage',
      period: { date: '2026-08-28', kind: 'DATE' },
      workspace: 'MANAGER',
    } as const;
    expect(insightRequestSchema.parse(request)).toEqual(request);
    expect(insightRequestSchema.safeParse({ ...request, employeeId: 'employee-1' }).success).toBe(
      false,
    );

    const source = {
      destination: 'TEAM_STATUS',
      kind: 'TEAM_STATUS',
      period: request.period,
      reference: 'source_team_status',
    } as const;
    expect(
      insightNativeResultSchema.safeParse({
        actions: [
          {
            code: 'OPEN_TEAM_STATUS',
            destination: 'TEAM_STATUS',
            reference: 'action_team_status',
            sourceReferences: [source.reference],
          },
        ],
        facts: [
          {
            code: 'TEAM_UNAVAILABLE_COUNT',
            qualifiers: ['CURRENT'],
            reference: 'fact_team_unavailable',
            sourceReferences: [source.reference],
            value: { kind: 'COUNT', value: 2 },
          },
        ],
        freshness: {
          boundaries: [
            {
              kind: 'CALCULATED_THROUGH',
              localDate: request.period.date,
              sourceReferences: [source.reference],
            },
          ],
          capturedAt: '2026-08-28T08:15:30Z',
        },
        kind: request.kind,
        limitations: [],
        period: request.period,
        scope: { kind: 'CURRENT_DIRECT_REPORTS', workspace: 'MANAGER' },
        sources: [source],
        timeZone: 'Europe/Berlin',
        workspace: 'MANAGER',
      }).success,
    ).toBe(true);
  });

  it('accepts only fixed HR purposes and keeps suppression free of metrics and actions', () => {
    const request = {
      kind: 'HR_NEUTRAL_ABSENCE_COVERAGE',
      month: '2026-08',
      workspace: 'HR',
    } as const;
    expect(hrInsightRequestSchema.parse(request)).toEqual(request);
    for (const invalid of [
      { ...request, employeeId: 'employee-1' },
      { ...request, month: '2026-08-01' },
      { ...request, month: '1999-12' },
      { ...request, workspace: 'MANAGER' },
      { ...request, absenceType: 'SICKNESS' },
      { ...request, comparisonMonth: '2026-07' },
    ]) {
      expect(hrInsightRequestSchema.safeParse(invalid).success).toBe(false);
    }
    expect(
      hrInsightRunResponseEnvelopeSchema.safeParse({
        data: {
          capturedAt: '2026-08-28T08:15:30Z',
          kind: request.kind,
          month: request.month,
          reason: 'PRIVACY_THRESHOLD_NOT_MET',
        },
        meta: { requestId: '123e4567-e89b-42d3-a456-426614174000' },
      }).success,
    ).toBe(true);
    expect(
      hrInsightRunResponseEnvelopeSchema.safeParse({
        data: {
          actions: [],
          capturedAt: '2026-08-28T08:15:30Z',
          eligibleEmployeeCount: 9,
          kind: request.kind,
          month: request.month,
          reason: 'PRIVACY_THRESHOLD_NOT_MET',
        },
        meta: { requestId: '123e4567-e89b-42d3-a456-426614174000' },
      }).success,
    ).toBe(false);
  });
});
