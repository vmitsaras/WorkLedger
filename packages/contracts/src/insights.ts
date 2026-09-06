import { z } from 'zod';

import { apiResponseMetaSchema, createSuccessEnvelopeSchema } from './api.js';
import { supportedLocaleSchema } from './locales.js';

export const MAX_INSIGHT_QUESTION_CODE_POINTS = 500;
export const MAX_INSIGHT_PRIOR_TURNS = 4;
export const MAX_INSIGHT_CONVERSATION_CODE_POINTS = 8_000;
export const MAX_INSIGHT_INTERPRETATION_STATEMENTS = 8;
export const MAX_INSIGHT_INTERPRETATION_PROSE_CODE_POINTS = 2_000;

export const INSIGHT_WORKSPACES = ['EMPLOYEE', 'MANAGER', 'HR', 'SYSTEM'] as const;
export const INSIGHT_SCOPE_KINDS = [
  'SELF',
  'CURRENT_DIRECT_REPORTS',
  'ORGANIZATION_AGGREGATE',
  'TECHNICAL_DIAGNOSTICS',
] as const;
export const INSIGHT_KINDS = [
  'balance-change',
  'submission-blockers',
  'leave-projection',
  'today-explanation',
  'manager-action-summary',
  'team-coverage',
  'HR_MONTHLY_CLOSURE_READINESS',
  'HR_NEUTRAL_ABSENCE_COVERAGE',
] as const;
export const SYSTEM_INSIGHT_KINDS = ['SYSTEM_TECHNICAL_OVERVIEW'] as const;
export const SYSTEM_INSIGHT_FACT_CODES = [
  'APPLICATION_VERSION',
  'SERVICE_HEALTH',
  'DATABASE_HEALTH',
  'EXPECTED_SCHEMA_STATUS',
  'BACKUP_MANAGEMENT',
  'MAIL_DELIVERY_CONFIGURATION',
  'SESSION_IDLE_TIMEOUT_MINUTES',
  'SESSION_ABSOLUTE_TIMEOUT_MINUTES',
  'SESSION_FRESH_WINDOW_MINUTES',
  'PERSISTENT_REMEMBER_ME',
] as const;
export const SYSTEM_INSIGHT_SOURCE_CODES = [
  'APPLICATION_MANIFEST',
  'DATABASE_READINESS',
  'HOST_OPERATOR_PROCEDURES',
  'MAIL_ADAPTER_CONFIGURATION',
  'AUTHENTICATION_SECURITY_PROFILE',
] as const;
export const INSIGHT_CONTEXT_KINDS = [
  'TODAY',
  'MY_TIME',
  'MY_BALANCES',
  'MY_REQUESTS',
  'REPORTS',
] as const;
export const INSIGHT_FACT_VALUE_KINDS = [
  'BOOLEAN',
  'COUNT',
  'DATE',
  'INSTANT',
  'MINUTES',
  'STATE',
] as const;
export const INSIGHT_FACT_QUALIFIERS = [
  'CURRENT',
  'INCOMPLETE',
  'POSTED',
  'PROJECTED',
  'PROVISIONAL',
  'RESERVED',
  'SUPPRESSED',
  'UNAVAILABLE',
] as const;
export const INSIGHT_FRESHNESS_BOUNDARY_KINDS = ['CALCULATED_THROUGH', 'POSTED_THROUGH'] as const;
export const INSIGHT_SOURCE_KINDS = [
  'DAILY_TIME_RECORD',
  'LEAVE_ENTITLEMENT_LEDGER',
  'MONTHLY_TIME_REPORT',
  'MONTHLY_PERIOD',
  'PERSONAL_REQUEST',
  'REPORT',
  'TIME_ACCOUNT_LEDGER',
  'TODAY_ATTENDANCE',
  'APPROVAL_INBOX',
  'TEAM_CALENDAR',
  'TEAM_STATUS',
] as const;
export const INSIGHT_NATIVE_ACTION_DESTINATIONS = [
  'MONTHLY_REVIEW',
  'MY_BALANCES',
  'MY_REQUESTS',
  'MY_TIME',
  'REPORTS',
  'TODAY',
  'APPROVAL_INBOX',
  'MONTHLY_TIME_REPORT',
  'TEAM_CALENDAR',
  'TEAM_STATUS',
] as const;

const dateSchema = z.iso.date();
const instantSchema = z.iso.datetime({ offset: true });
const signedMinuteSchema = z.number().int().safe();
const countSchema = z.number().int().safe().min(0);
const timeZoneSchema = z.string().min(1).max(255);
const isoMonthSchema = z.string().regex(/^(?:20\d{2}|2[1-9]\d{2}|[3-9]\d{3})-(?:0[1-9]|1[0-2])$/u);
const insightCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/u);
const opaqueInsightReferenceSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

export const insightWorkspaceSchema = z.enum(INSIGHT_WORKSPACES);
export const insightScopeKindSchema = z.enum(INSIGHT_SCOPE_KINDS);
export const insightKindSchema = z.enum(INSIGHT_KINDS);
export const insightContextKindSchema = z.enum(INSIGHT_CONTEXT_KINDS);
export const insightFactValueKindSchema = z.enum(INSIGHT_FACT_VALUE_KINDS);
export const insightFactQualifierSchema = z.enum(INSIGHT_FACT_QUALIFIERS);
export const insightFreshnessBoundaryKindSchema = z.enum(INSIGHT_FRESHNESS_BOUNDARY_KINDS);
export const insightSourceKindSchema = z.enum(INSIGHT_SOURCE_KINDS);
export const insightNativeActionDestinationSchema = z.enum(INSIGHT_NATIVE_ACTION_DESTINATIONS);

export const insightDatePeriodSchema = z.strictObject({
  date: dateSchema,
  kind: z.literal('DATE'),
});

export const insightDateRangePeriodSchema = z
  .strictObject({
    endDate: dateSchema,
    kind: z.literal('DATE_RANGE'),
    startDate: dateSchema,
  })
  .superRefine((period, context) => {
    if (period.startDate > period.endDate) {
      context.addIssue({
        code: 'custom',
        message: 'The Insight start date must not be after the end date.',
        path: ['endDate'],
      });
    }
  });

export const insightMonthPeriodSchema = z.strictObject({
  kind: z.literal('MONTH'),
  monthStart: dateSchema.refine(
    (value) => value.endsWith('-01'),
    'An Insight month must use its first local date.',
  ),
});

export const insightPeriodSchema = z.discriminatedUnion('kind', [
  insightDatePeriodSchema,
  insightDateRangePeriodSchema,
  insightMonthPeriodSchema,
]);

export const insightVisibleContextSchema = z
  .strictObject({
    kind: insightContextKindSchema,
    period: insightPeriodSchema.optional(),
    sourceReferences: z.array(opaqueInsightReferenceSchema).max(20),
  })
  .superRefine((visibleContext, context) => {
    if (new Set(visibleContext.sourceReferences).size !== visibleContext.sourceReferences.length) {
      context.addIssue({
        code: 'custom',
        message: 'Visible context source references must be unique.',
        path: ['sourceReferences'],
      });
    }
  });

const commonRequestShape = {
  context: insightVisibleContextSchema.optional(),
  workspace: z.literal('EMPLOYEE'),
};

export const balanceChangeInsightRequestSchema = z.strictObject({
  ...commonRequestShape,
  kind: z.literal('balance-change'),
  period: insightDateRangePeriodSchema,
});

export const submissionBlockersInsightRequestSchema = z.strictObject({
  ...commonRequestShape,
  kind: z.literal('submission-blockers'),
  period: insightMonthPeriodSchema,
});

export const leaveProjectionInsightRequestSchema = z.strictObject({
  ...commonRequestShape,
  kind: z.literal('leave-projection'),
  period: insightDatePeriodSchema,
});

export const todayExplanationInsightRequestSchema = z.strictObject({
  ...commonRequestShape,
  kind: z.literal('today-explanation'),
  period: insightDatePeriodSchema,
});

const managerRequestShape = {
  workspace: z.literal('MANAGER'),
};

export const managerActionSummaryInsightRequestSchema = z.strictObject({
  ...managerRequestShape,
  kind: z.literal('manager-action-summary'),
  period: insightDatePeriodSchema,
});

export const teamCoverageInsightRequestSchema = z.strictObject({
  ...managerRequestShape,
  kind: z.literal('team-coverage'),
  period: insightDatePeriodSchema,
});

const hrRequestShape = {
  month: isoMonthSchema,
  workspace: z.literal('HR'),
};

export const hrMonthlyClosureReadinessInsightRequestSchema = z.strictObject({
  ...hrRequestShape,
  kind: z.literal('HR_MONTHLY_CLOSURE_READINESS'),
});

export const hrNeutralAbsenceCoverageInsightRequestSchema = z.strictObject({
  ...hrRequestShape,
  kind: z.literal('HR_NEUTRAL_ABSENCE_COVERAGE'),
});

export const hrInsightRequestSchema = z.discriminatedUnion('kind', [
  hrMonthlyClosureReadinessInsightRequestSchema,
  hrNeutralAbsenceCoverageInsightRequestSchema,
]);

export const systemTechnicalOverviewInsightRequestSchema = z.strictObject({
  kind: z.literal('SYSTEM_TECHNICAL_OVERVIEW'),
  workspace: z.literal('SYSTEM'),
});

export const systemInsightRequestSchema = systemTechnicalOverviewInsightRequestSchema;

export const insightRequestSchema = z.discriminatedUnion('kind', [
  balanceChangeInsightRequestSchema,
  submissionBlockersInsightRequestSchema,
  leaveProjectionInsightRequestSchema,
  todayExplanationInsightRequestSchema,
  managerActionSummaryInsightRequestSchema,
  teamCoverageInsightRequestSchema,
]);

export const insightFactValueSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('BOOLEAN'), value: z.boolean() }),
  z.strictObject({ kind: z.literal('COUNT'), value: countSchema }),
  z.strictObject({ kind: z.literal('DATE'), value: dateSchema }),
  z.strictObject({ kind: z.literal('INSTANT'), value: instantSchema }),
  z.strictObject({ kind: z.literal('MINUTES'), value: signedMinuteSchema }),
  z.strictObject({ kind: z.literal('STATE'), value: insightCodeSchema }),
]);

export const insightFactSchema = z
  .strictObject({
    code: insightCodeSchema,
    qualifiers: z.array(insightFactQualifierSchema).min(1).max(INSIGHT_FACT_QUALIFIERS.length),
    reference: opaqueInsightReferenceSchema,
    sourceReferences: z.array(opaqueInsightReferenceSchema).min(1).max(20),
    value: insightFactValueSchema.nullable(),
  })
  .superRefine((fact, context) => {
    if (new Set(fact.qualifiers).size !== fact.qualifiers.length) {
      context.addIssue({
        code: 'custom',
        message: 'Insight fact qualifiers must be unique.',
        path: ['qualifiers'],
      });
    }
    if (new Set(fact.sourceReferences).size !== fact.sourceReferences.length) {
      context.addIssue({
        code: 'custom',
        message: 'Insight fact source references must be unique.',
        path: ['sourceReferences'],
      });
    }

    const terminalQualifier = fact.qualifiers.find(
      (qualifier) => qualifier === 'SUPPRESSED' || qualifier === 'UNAVAILABLE',
    );
    if (terminalQualifier !== undefined) {
      if (fact.qualifiers.length !== 1 || fact.value !== null) {
        context.addIssue({
          code: 'custom',
          message: 'Suppressed or unavailable Insight facts cannot expose a value or qualifier.',
          path: ['value'],
        });
      }
    } else if (fact.value === null) {
      context.addIssue({
        code: 'custom',
        message: 'A present Insight fact must expose its typed value.',
        path: ['value'],
      });
    }

    const evidenceQualifiers = fact.qualifiers.filter(
      (qualifier) =>
        qualifier === 'POSTED' || qualifier === 'PROJECTED' || qualifier === 'PROVISIONAL',
    );
    if (evidenceQualifiers.length > 1) {
      context.addIssue({
        code: 'custom',
        message: 'Posted, projected, and provisional evidence must remain separate facts.',
        path: ['qualifiers'],
      });
    }
  });

export const insightSourceSchema = z.strictObject({
  destination: insightNativeActionDestinationSchema,
  kind: insightSourceKindSchema,
  label: z.string().trim().min(1).max(200).optional(),
  period: insightPeriodSchema,
  reference: opaqueInsightReferenceSchema,
});

export const insightLimitationSchema = z.strictObject({
  code: insightCodeSchema,
  material: z.boolean(),
  reference: opaqueInsightReferenceSchema,
  sourceReferences: z.array(opaqueInsightReferenceSchema).max(20),
});

export const insightNativeActionSchema = z.strictObject({
  code: insightCodeSchema,
  destination: insightNativeActionDestinationSchema,
  period: insightPeriodSchema.optional(),
  reference: opaqueInsightReferenceSchema,
  sourceReferences: z.array(opaqueInsightReferenceSchema).max(20),
});

export const insightFreshnessBoundarySchema = z.strictObject({
  kind: insightFreshnessBoundaryKindSchema,
  localDate: dateSchema,
  sourceReferences: z.array(opaqueInsightReferenceSchema).min(1).max(20),
});

const nativePayloadShape = {
  actions: z.array(insightNativeActionSchema).max(20),
  facts: z.array(insightFactSchema).min(1).max(100),
  freshnessBoundaries: z
    .array(insightFreshnessBoundarySchema)
    .min(1)
    .max(INSIGHT_FRESHNESS_BOUNDARY_KINDS.length),
  limitations: z.array(insightLimitationSchema).max(20),
  sources: z.array(insightSourceSchema).min(1).max(50),
};

export const insightNativePayloadSchema = z.strictObject(nativePayloadShape);

export const insightNativeResultSchema = z
  .strictObject({
    actions: nativePayloadShape.actions,
    facts: nativePayloadShape.facts,
    freshness: z.strictObject({
      boundaries: nativePayloadShape.freshnessBoundaries,
      capturedAt: instantSchema,
    }),
    kind: insightKindSchema,
    limitations: nativePayloadShape.limitations,
    period: insightPeriodSchema,
    scope: z.strictObject({
      kind: insightScopeKindSchema,
      workspace: insightWorkspaceSchema,
    }),
    sources: nativePayloadShape.sources,
    timeZone: timeZoneSchema,
    workspace: insightWorkspaceSchema,
  })
  .superRefine((result, context) => {
    const expectedPeriodKind = {
      'balance-change': 'DATE_RANGE',
      'leave-projection': 'DATE',
      'submission-blockers': 'MONTH',
      'today-explanation': 'DATE',
      'manager-action-summary': 'DATE',
      'team-coverage': 'DATE',
      HR_MONTHLY_CLOSURE_READINESS: 'MONTH',
      HR_NEUTRAL_ABSENCE_COVERAGE: 'MONTH',
    }[result.kind];
    const expectedScopeKind = {
      EMPLOYEE: 'SELF',
      HR: 'ORGANIZATION_AGGREGATE',
      MANAGER: 'CURRENT_DIRECT_REPORTS',
      SYSTEM: 'TECHNICAL_DIAGNOSTICS',
    }[result.workspace];
    if (result.scope.workspace !== result.workspace) {
      context.addIssue({
        code: 'custom',
        message: 'The Insight scope must match its active workspace.',
        path: ['scope', 'workspace'],
      });
    }
    if (result.scope.kind !== expectedScopeKind) {
      context.addIssue({
        code: 'custom',
        message: 'The Insight scope kind must match its active workspace.',
        path: ['scope', 'kind'],
      });
    }
    if (result.period.kind !== expectedPeriodKind) {
      context.addIssue({
        code: 'custom',
        message: 'The Insight period must match its kind.',
        path: ['period'],
      });
    }

    const sourceReferences = new Set(result.sources.map(({ reference }) => reference));
    if (sourceReferences.size !== result.sources.length) {
      context.addIssue({
        code: 'custom',
        message: 'Insight source references must be unique.',
        path: ['sources'],
      });
    }

    const expectedSourceDestination = {
      DAILY_TIME_RECORD: 'MY_TIME',
      LEAVE_ENTITLEMENT_LEDGER: 'MY_BALANCES',
      MONTHLY_TIME_REPORT: 'MONTHLY_TIME_REPORT',
      MONTHLY_PERIOD: 'MONTHLY_REVIEW',
      PERSONAL_REQUEST: 'MY_REQUESTS',
      REPORT: 'REPORTS',
      TIME_ACCOUNT_LEDGER: 'MY_BALANCES',
      TODAY_ATTENDANCE: 'TODAY',
      APPROVAL_INBOX: 'APPROVAL_INBOX',
      TEAM_CALENDAR: 'TEAM_CALENDAR',
      TEAM_STATUS: 'TEAM_STATUS',
    } as const;
    for (const [index, source] of result.sources.entries()) {
      if (source.destination !== expectedSourceDestination[source.kind]) {
        context.addIssue({
          code: 'custom',
          message: 'An Insight source must use its allowlisted native destination.',
          path: ['sources', index, 'destination'],
        });
      }
    }

    for (const [collectionName, values] of [
      ['actions', result.actions],
      ['facts', result.facts],
      ['limitations', result.limitations],
    ] as const) {
      const references = values.map(({ reference }) => reference);
      if (new Set(references).size !== references.length) {
        context.addIssue({
          code: 'custom',
          message: `Insight ${collectionName} references must be unique.`,
          path: [collectionName],
        });
      }
    }

    const referencedCollections = [
      ...result.actions,
      ...result.facts,
      ...result.freshness.boundaries,
      ...result.limitations,
    ];
    for (const item of referencedCollections) {
      if (new Set(item.sourceReferences).size !== item.sourceReferences.length) {
        context.addIssue({
          code: 'custom',
          message: 'Insight metadata source references must be unique.',
          path: ['sources'],
        });
      }
      const unknownReference = item.sourceReferences.find(
        (reference) => !sourceReferences.has(reference),
      );
      if (unknownReference !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'Insight metadata must reference a source in the same native result.',
          path: ['sources'],
        });
      }
    }

    const boundaryKinds = result.freshness.boundaries.map(({ kind }) => kind);
    if (new Set(boundaryKinds).size !== boundaryKinds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Insight freshness boundary kinds must be unique.',
        path: ['freshness', 'boundaries'],
      });
    }
  });

export const insightNativeResultEnvelopeSchema =
  createSuccessEnvelopeSchema(insightNativeResultSchema);

export const insightInterpretationAvailabilitySchema = z.enum(['DISABLED', 'READY', 'UNAVAILABLE']);

const insightQuestionSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_INSIGHT_QUESTION_CODE_POINTS * 2)
  .refine(
    (value) => codePointLength(value) <= MAX_INSIGHT_QUESTION_CODE_POINTS,
    `An Insight question must not exceed ${MAX_INSIGHT_QUESTION_CODE_POINTS} Unicode code points.`,
  );

export const EMPLOYEE_INSIGHT_TOPICS = [
  'balance-change',
  'submission-blockers',
  'leave-projection',
  'today-explanation',
] as const;

/** English is the supported interaction language, not an inferred language guarantee. */
export const employeeInsightTopicRequestSchema = z.strictObject({
  language: z.literal('en'),
  question: insightQuestionSchema,
});
export const employeeInsightTopicResultSchema = z.strictObject({
  topic: z.enum([...EMPLOYEE_INSIGHT_TOPICS, 'UNKNOWN']),
});
export const employeeInsightTopicResultEnvelopeSchema = createSuccessEnvelopeSchema(
  employeeInsightTopicResultSchema,
);
export type EmployeeInsightTopicRequest = z.infer<typeof employeeInsightTopicRequestSchema>;
export type EmployeeInsightTopicResult = z.infer<typeof employeeInsightTopicResultSchema>;

const insightPriorAnswerSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_INSIGHT_INTERPRETATION_PROSE_CODE_POINTS * 2)
  .refine(
    (value) => codePointLength(value) <= MAX_INSIGHT_INTERPRETATION_PROSE_CODE_POINTS,
    `A prior Insight answer must not exceed ${MAX_INSIGHT_INTERPRETATION_PROSE_CODE_POINTS} Unicode code points.`,
  );

export const insightPriorTurnSchema = z.strictObject({
  answer: insightPriorAnswerSchema,
  question: insightQuestionSchema,
});

export const insightInterpretationRequestSchema = z
  .strictObject({
    insight: insightRequestSchema,
    priorTurns: z.array(insightPriorTurnSchema).max(MAX_INSIGHT_PRIOR_TURNS),
    question: insightQuestionSchema,
  })
  .superRefine((request, context) => {
    const totalCodePoints = [
      request.question,
      ...request.priorTurns.flatMap((turn) => [turn.question, turn.answer]),
    ].reduce((total, value) => total + codePointLength(value), 0);
    if (totalCodePoints > MAX_INSIGHT_CONVERSATION_CODE_POINTS) {
      context.addIssue({
        code: 'custom',
        message: `Insight conversation text must not exceed ${MAX_INSIGHT_CONVERSATION_CODE_POINTS} Unicode code points.`,
        path: ['priorTurns'],
      });
    }
  });

const interpretationReferenceArraySchema = z
  .array(opaqueInsightReferenceSchema)
  .max(20)
  .superRefine((references, context) => {
    if (new Set(references).size !== references.length) {
      context.addIssue({
        code: 'custom',
        message: 'Interpretation references must be unique.',
      });
    }
  });

export const insightInterpretationStatementSchema = z.strictObject({
  actionReferences: interpretationReferenceArraySchema,
  factReferences: interpretationReferenceArraySchema.min(1),
  limitationReferences: interpretationReferenceArraySchema,
  sourceReferences: interpretationReferenceArraySchema.min(1),
  text: z
    .string()
    .trim()
    .min(1)
    .max(1_000)
    .refine(
      (value) => codePointLength(value) <= 500,
      'An Insight interpretation statement must not exceed 500 Unicode code points.',
    ),
});

export const insightInterpretationSchema = z
  .strictObject({
    locale: supportedLocaleSchema,
    statements: z
      .array(insightInterpretationStatementSchema)
      .min(1)
      .max(MAX_INSIGHT_INTERPRETATION_STATEMENTS),
  })
  .superRefine((interpretation, context) => {
    const proseCodePoints = interpretation.statements.reduce(
      (total, statement) => total + codePointLength(statement.text),
      0,
    );
    if (proseCodePoints > MAX_INSIGHT_INTERPRETATION_PROSE_CODE_POINTS) {
      context.addIssue({
        code: 'custom',
        message: `Insight interpretation prose must not exceed ${MAX_INSIGHT_INTERPRETATION_PROSE_CODE_POINTS} Unicode code points.`,
        path: ['statements'],
      });
    }
  });

export const INSIGHT_INTERPRETATION_OUTPUT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: Object.freeze({
    locale: Object.freeze({
      description: 'Copy the exact requested account locale.',
      enum: ['en-GB', 'de-DE', 'es-ES'],
      type: 'string',
    }),
    statements: Object.freeze({
      description:
        'Return exactly one grounded explanation statement in the requested account locale.',
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: Object.freeze({
        type: 'object',
        additionalProperties: false,
        properties: Object.freeze({
          actionReferences: interpretationReferenceJsonSchema(
            0,
            'Copy only action references used by this statement.',
          ),
          factReferences: interpretationReferenceJsonSchema(
            1,
            'Copy every native fact reference used by this statement.',
          ),
          limitationReferences: interpretationReferenceJsonSchema(
            0,
            'Copy every native limitation reference used by this statement.',
          ),
          sourceReferences: interpretationReferenceJsonSchema(
            1,
            'Copy exactly the set union of sourceReferences on every fact, limitation, and action cited by this statement. Do not omit or add a source.',
          ),
          text: Object.freeze({
            description:
              'Explain only the relationship between cited native references. Do not copy numbers, dates, identifiers, statuses, source labels, limitation labels, action labels, or native reference strings.',
            type: 'string',
            minLength: 1,
            maxLength: 500,
          }),
        }),
        required: Object.freeze([
          'actionReferences',
          'factReferences',
          'limitationReferences',
          'sourceReferences',
          'text',
        ]),
      }),
    }),
  }),
  required: Object.freeze(['locale', 'statements']),
});

export const insightRunResponseEnvelopeSchema = z.strictObject({
  data: insightNativeResultSchema,
  meta: apiResponseMetaSchema.extend({
    interpretationAvailability: insightInterpretationAvailabilitySchema,
  }),
});

export const hrInsightSuppressedResultSchema = z.strictObject({
  capturedAt: instantSchema,
  kind: z.enum(['HR_MONTHLY_CLOSURE_READINESS', 'HR_NEUTRAL_ABSENCE_COVERAGE']),
  month: isoMonthSchema,
  reason: z.literal('PRIVACY_THRESHOLD_NOT_MET'),
});

export const hrInsightAvailableResultSchema = z.strictObject({
  nativeResult: insightNativeResultSchema,
});

export const hrInsightRunResultSchema = z.union([
  hrInsightAvailableResultSchema,
  hrInsightSuppressedResultSchema,
]);

export const hrInsightRunResponseEnvelopeSchema =
  createSuccessEnvelopeSchema(hrInsightRunResultSchema);

const systemInsightSourceCodeSchema = z.enum(SYSTEM_INSIGHT_SOURCE_CODES);

export const systemInsightFactSchema = z.discriminatedUnion('code', [
  z.strictObject({
    code: z.literal('APPLICATION_VERSION'),
    source: z.literal('APPLICATION_MANIFEST'),
    value: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+){2}(?:-[0-9A-Za-z.-]+)?$/u),
  }),
  z.strictObject({
    code: z.literal('SERVICE_HEALTH'),
    source: z.literal('DATABASE_READINESS'),
    value: z.enum(['HEALTHY', 'CRITICAL']),
  }),
  z.strictObject({
    code: z.literal('DATABASE_HEALTH'),
    source: z.literal('DATABASE_READINESS'),
    value: z.enum(['HEALTHY', 'UNAVAILABLE']),
  }),
  z.strictObject({
    code: z.literal('EXPECTED_SCHEMA_STATUS'),
    source: z.literal('DATABASE_READINESS'),
    value: z.enum(['READY', 'NOT_READY']),
  }),
  z.strictObject({
    code: z.literal('BACKUP_MANAGEMENT'),
    source: z.literal('HOST_OPERATOR_PROCEDURES'),
    value: z.literal('HOST_OPERATOR_MANAGED'),
  }),
  z.strictObject({
    code: z.literal('MAIL_DELIVERY_CONFIGURATION'),
    source: z.literal('MAIL_ADAPTER_CONFIGURATION'),
    value: z.enum(['CONFIGURED', 'NOT_CONFIGURED']),
  }),
  z.strictObject({
    code: z.literal('SESSION_IDLE_TIMEOUT_MINUTES'),
    source: z.literal('AUTHENTICATION_SECURITY_PROFILE'),
    value: z.number().int().positive(),
  }),
  z.strictObject({
    code: z.literal('SESSION_ABSOLUTE_TIMEOUT_MINUTES'),
    source: z.literal('AUTHENTICATION_SECURITY_PROFILE'),
    value: z.number().int().positive(),
  }),
  z.strictObject({
    code: z.literal('SESSION_FRESH_WINDOW_MINUTES'),
    source: z.literal('AUTHENTICATION_SECURITY_PROFILE'),
    value: z.number().int().positive(),
  }),
  z.strictObject({
    code: z.literal('PERSISTENT_REMEMBER_ME'),
    source: z.literal('AUTHENTICATION_SECURITY_PROFILE'),
    value: z.literal(false),
  }),
]);

export const systemInsightSourceSchema = z.strictObject({
  code: systemInsightSourceCodeSchema,
  destination: z.literal('SYSTEM_OPERATIONS'),
});

export const systemInsightLimitationSchema = z.strictObject({
  code: z.literal('BACKUP_RUNTIME_STATUS_HOST_OWNED'),
  material: z.literal(true),
  source: z.literal('HOST_OPERATOR_PROCEDURES'),
});

export const systemInsightActionSchema = z.strictObject({
  code: z.literal('OPEN_SYSTEM_OPERATIONS'),
  destination: z.literal('SYSTEM_OPERATIONS'),
  sourceCodes: z
    .array(systemInsightSourceCodeSchema)
    .min(1)
    .max(SYSTEM_INSIGHT_SOURCE_CODES.length),
});

export const systemInsightNativeResultSchema = z
  .strictObject({
    actions: z.array(systemInsightActionSchema).length(1),
    facts: z.array(systemInsightFactSchema).length(SYSTEM_INSIGHT_FACT_CODES.length),
    freshness: z.strictObject({ capturedAt: instantSchema }),
    kind: z.literal('SYSTEM_TECHNICAL_OVERVIEW'),
    limitations: z.array(systemInsightLimitationSchema).length(1),
    scope: z.strictObject({
      kind: z.literal('TECHNICAL_DIAGNOSTICS'),
      workspace: z.literal('SYSTEM'),
    }),
    sources: z.array(systemInsightSourceSchema).length(SYSTEM_INSIGHT_SOURCE_CODES.length),
    workspace: z.literal('SYSTEM'),
  })
  .superRefine((result, context) => {
    requireExactSystemCodes(
      result.facts.map(({ code }) => code),
      SYSTEM_INSIGHT_FACT_CODES,
      ['facts'],
      context,
    );
    requireExactSystemCodes(
      result.sources.map(({ code }) => code),
      SYSTEM_INSIGHT_SOURCE_CODES,
      ['sources'],
      context,
    );
    requireExactSystemCodes(
      result.actions[0]?.sourceCodes ?? [],
      SYSTEM_INSIGHT_SOURCE_CODES,
      ['actions', 0, 'sourceCodes'],
      context,
    );
  });

export const systemInsightRunResponseEnvelopeSchema = createSuccessEnvelopeSchema(
  systemInsightNativeResultSchema,
);

export const insightInterpretationResultSchema = z.strictObject({
  interpretation: insightInterpretationSchema,
  nativeResult: insightNativeResultSchema,
});

export const insightInterpretationResultEnvelopeSchema = createSuccessEnvelopeSchema(
  insightInterpretationResultSchema,
);

export type InsightWorkspace = z.infer<typeof insightWorkspaceSchema>;
export type InsightScopeKind = z.infer<typeof insightScopeKindSchema>;
export type InsightKind = z.infer<typeof insightKindSchema>;
export type InsightPeriod = z.infer<typeof insightPeriodSchema>;
export type InsightVisibleContext = z.infer<typeof insightVisibleContextSchema>;
export type BalanceChangeInsightRequest = z.infer<typeof balanceChangeInsightRequestSchema>;
export type SubmissionBlockersInsightRequest = z.infer<
  typeof submissionBlockersInsightRequestSchema
>;
export type LeaveProjectionInsightRequest = z.infer<typeof leaveProjectionInsightRequestSchema>;
export type TodayExplanationInsightRequest = z.infer<typeof todayExplanationInsightRequestSchema>;
export type ManagerActionSummaryInsightRequest = z.infer<
  typeof managerActionSummaryInsightRequestSchema
>;
export type TeamCoverageInsightRequest = z.infer<typeof teamCoverageInsightRequestSchema>;
export type ManagerInsightRequest = ManagerActionSummaryInsightRequest | TeamCoverageInsightRequest;
export type HrMonthlyClosureReadinessInsightRequest = z.infer<
  typeof hrMonthlyClosureReadinessInsightRequestSchema
>;
export type HrNeutralAbsenceCoverageInsightRequest = z.infer<
  typeof hrNeutralAbsenceCoverageInsightRequestSchema
>;
export type HrInsightRequest =
  HrMonthlyClosureReadinessInsightRequest | HrNeutralAbsenceCoverageInsightRequest;
export type InsightRequest = z.infer<typeof insightRequestSchema>;
export type EmployeeInsightKind = Extract<
  InsightKind,
  'balance-change' | 'submission-blockers' | 'leave-projection' | 'today-explanation'
>;
export type EmployeeInsightRequest =
  | BalanceChangeInsightRequest
  | SubmissionBlockersInsightRequest
  | LeaveProjectionInsightRequest
  | TodayExplanationInsightRequest;
export type InsightFactValue = z.infer<typeof insightFactValueSchema>;
export type InsightFact = z.infer<typeof insightFactSchema>;
export type InsightSource = z.infer<typeof insightSourceSchema>;
export type InsightLimitation = z.infer<typeof insightLimitationSchema>;
export type InsightNativeAction = z.infer<typeof insightNativeActionSchema>;
export type InsightFreshnessBoundary = z.infer<typeof insightFreshnessBoundarySchema>;
export type InsightNativePayload = z.infer<typeof insightNativePayloadSchema>;
export type InsightNativeResult = z.infer<typeof insightNativeResultSchema>;
export type InsightInterpretationAvailability = z.infer<
  typeof insightInterpretationAvailabilitySchema
>;
export type InsightPriorTurn = z.infer<typeof insightPriorTurnSchema>;
export type InsightInterpretationRequest = z.infer<typeof insightInterpretationRequestSchema>;
export type InsightInterpretationStatement = z.infer<typeof insightInterpretationStatementSchema>;
export type InsightInterpretation = z.infer<typeof insightInterpretationSchema>;
export type InsightInterpretationResult = z.infer<typeof insightInterpretationResultSchema>;
export type HrInsightRunResult = z.infer<typeof hrInsightRunResultSchema>;
export type SystemTechnicalOverviewInsightRequest = z.infer<
  typeof systemTechnicalOverviewInsightRequestSchema
>;
export type SystemInsightRequest = z.infer<typeof systemInsightRequestSchema>;
export type SystemInsightFact = z.infer<typeof systemInsightFactSchema>;
export type SystemInsightSource = z.infer<typeof systemInsightSourceSchema>;
export type SystemInsightNativeResult = z.infer<typeof systemInsightNativeResultSchema>;

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function requireExactSystemCodes(
  actual: readonly string[],
  expected: readonly string[],
  path: PropertyKey[],
  context: z.RefinementCtx,
): void {
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    expected.some((code) => !actual.includes(code))
  ) {
    context.addIssue({
      code: 'custom',
      message: 'A System Insight must contain every allowlisted technical code exactly once.',
      path,
    });
  }
}

function interpretationReferenceJsonSchema(minItems = 0, description?: string) {
  return Object.freeze({
    ...(description === undefined ? {} : { description }),
    type: 'array',
    minItems,
    maxItems: 20,
    uniqueItems: true,
    items: Object.freeze({
      type: 'string',
      minLength: 1,
      maxLength: 128,
      pattern: '^[A-Za-z0-9_-]+$',
    }),
  });
}
