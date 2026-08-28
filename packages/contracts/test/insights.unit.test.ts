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
});
