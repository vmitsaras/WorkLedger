import { SUPPORTED_LOCALES } from '@workledger/contracts';
import { insightNativeResultSchema } from '@workledger/contracts/insights';
import {
  EMPLOYEE_INSIGHT_SAFE_PROSE,
  validateGroundedInterpretation,
} from '../src/insights/employee-insight-interpretation.js';
import { createEmployeeInsightSelectionCodec } from '../src/insights/employee-insight-selection.js';
import {
  EMPLOYEE_INSIGHT_GOLDEN_SET,
  evaluateGoldenInterpretation,
} from './fixtures/employee-insight-golden-set.js';

const question = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'balance-summary');
if (question === undefined) throw new Error('Missing synthetic balance fixture.');
const result = question.nativeResult;
const text = EMPLOYEE_INSIGHT_SAFE_PROSE['en-GB'];
const selection = {
  actionSelections: [true],
  factSelections: [true, true, true, true, true],
  limitationSelections: [true],
  sourceSelections: [true, true],
  text,
};
const wire = { locale: 'en-GB', statements: [selection] };
const codec = createEmployeeInsightSelectionCodec(result, 'en-GB', text);

test.each(SUPPORTED_LOCALES)(
  'reports first empty required evidence without repairing %s',
  (locale) => {
    const navigation = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'submission-actions');
    if (!navigation) throw new Error('Missing navigation fixture.');
    for (const reversed of [false, true]) {
      const native = structuredClone(navigation.nativeResult);
      if (reversed) native.actions.reverse();
      const localized = createEmployeeInsightSelectionCodec(
        native,
        locale,
        EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
      );
      for (const empty of ['facts', 'sources', 'both'] as const) {
        const decoded = localized.decode({
          locale,
          statements: [
            {
              ...selection,
              text: EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
              actionSelections: native.actions.map(() => true),
              limitationSelections: [],
              factSelections: native.facts.map(() => empty === 'sources'),
              sourceSelections: native.sources.map(() => empty === 'facts'),
            },
          ],
        });
        if (!decoded.ok) throw new Error('Expected full-length selections.');
        expect(() =>
          validateGroundedInterpretation(decoded.candidate, native, locale),
        ).toThrowError(
          expect.objectContaining({
            validationFailureCode: 'FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID',
            validationDetail: {
              kind: 'REFERENCE_CARDINALITY',
              field: empty === 'sources' ? 'sourceReferences' : 'factReferences',
              reason: 'EMPTY_REQUIRED',
            },
          }),
        );
      }
    }
  },
);

test.each(SUPPORTED_LOCALES)(
  'accepts only destination-related navigation facts across reordered tables in %s',
  (locale) => {
    const navigation = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'submission-actions');
    if (navigation === undefined) throw new Error('Missing navigation fixture.');
    const scenarios: readonly {
      errors: readonly string[];
      references: readonly string[];
    }[] = [
      { errors: [], references: ['fact_submission_count'] },
      { errors: [], references: ['fact_submission_pending'] },
      { errors: [], references: ['fact_submission_count', 'fact_submission_pending'] },
      {
        errors: [
          'Missing required fact reference alternative (fact_submission_count | fact_submission_pending).',
          'Unexpected fact reference fact_submission_schedule.',
        ],
        references: ['fact_submission_schedule'],
      },
      {
        errors: [
          'Missing required fact reference alternative (fact_submission_count | fact_submission_pending).',
          'Unexpected fact reference fact_submission_ledger.',
        ],
        references: ['fact_submission_ledger'],
      },
      {
        errors: ['Unexpected fact reference fact_submission_schedule.'],
        references: ['fact_submission_pending', 'fact_submission_schedule'],
      },
    ];

    for (const reversed of [false, true]) {
      const native = structuredClone(navigation.nativeResult);
      if (reversed) {
        native.facts.reverse();
        native.actions.reverse();
      }
      const localized = createEmployeeInsightSelectionCodec(
        native,
        locale,
        EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
      );

      for (const scenario of scenarios) {
        const selectedReferences = new Set(scenario.references);
        const selectedFacts = native.facts.filter(({ reference }) =>
          selectedReferences.has(reference),
        );
        const selectedSources = new Set(
          [...selectedFacts, ...native.actions].flatMap((item) => item.sourceReferences),
        );
        const decoded = localized.decode({
          locale,
          statements: [
            {
              actionSelections: native.actions.map(() => true),
              factSelections: native.facts.map(({ reference }) =>
                selectedReferences.has(reference),
              ),
              limitationSelections: [],
              sourceSelections: native.sources.map(({ reference }) =>
                selectedSources.has(reference),
              ),
              text: EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
            },
          ],
        });
        if (!decoded.ok) throw new Error('Expected valid navigation selections.');
        const grounded = validateGroundedInterpretation(decoded.candidate, native, locale);

        expect(grounded.statements[0]).toMatchObject({
          actionReferences: native.actions.map(({ reference }) => reference),
          factReferences: selectedFacts.map(({ reference }) => reference),
          sourceReferences: native.sources
            .filter(({ reference }) => selectedSources.has(reference))
            .map(({ reference }) => reference),
        });
        expect(
          evaluateGoldenInterpretation({ ...navigation, nativeResult: native }, grounded),
        ).toEqual(scenario.errors);
      }
    }
  },
);

test.each([
  'factReferences',
  'sourceReferences',
  'actionReferences',
  'limitationReferences',
] as const)('preserves the 20/21 final boundary and earlier type precedence for %s', (field) => {
  const decoded = codec.decode(wire);
  if (!decoded.ok) throw new Error('Expected valid selections.');
  const valid = validateGroundedInterpretation(decoded.candidate, result, 'en-GB');
  const statement = valid.statements[0];
  if (!statement) throw new Error('Missing statement.');
  for (const count of [20, 21]) {
    const candidate = {
      ...valid,
      statements: [
        {
          ...statement,
          [field]: Array.from({ length: count }, (_, i) => `synthetic_reference_${i}`),
        },
      ],
    };
    // At 20 the schema admits the array and grounding rejects the unknown synthetic IDs.
    expect(() => validateGroundedInterpretation(candidate, result, 'en-GB')).toThrowError(
      expect.objectContaining({
        validationFailureCode:
          count === 20 ? 'FINAL_REFERENCE_UNKNOWN' : 'FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID',
        validationDetail:
          count === 20 ? null : { kind: 'REFERENCE_CARDINALITY', field, reason: 'EXCEEDS_LIMIT' },
      }),
    );
  }
  expect(() =>
    validateGroundedInterpretation(
      {
        ...valid,
        statements: [
          {
            ...statement,
            factReferences: [],
            [field]: [null],
          },
        ],
      },
      result,
      'en-GB',
    ),
  ).toThrowError(
    expect.objectContaining({
      validationFailureCode: 'FINAL_SCHEMA_REFERENCES_INVALID',
      validationDetail: null,
    }),
  );
});

test.each(SUPPORTED_LOCALES)(
  'preserves optional navigation and exposes question-action omissions to golden acceptance in %s',
  (locale) => {
    const navigation = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'submission-actions');
    if (navigation === undefined) throw new Error('Missing navigation fixture.');
    const unrelated = result.actions[0];
    if (unrelated === undefined) throw new Error('Missing optional navigation fixture.');
    for (const reversed of [false, true]) {
      for (const scenario of ['both', 'omitted', 'single', 'none'] as const) {
        const required =
          scenario === 'none'
            ? []
            : scenario === 'single'
              ? ['action_submission_review']
              : navigation.requiredActionReferences;
        const selected =
          scenario === 'both'
            ? navigation.requiredActionReferences
            : scenario === 'none'
              ? []
              : ['action_submission_review'];
        const actions = scenario === 'none' ? [] : [...navigation.nativeResult.actions, unrelated];
        if (reversed) actions.reverse();
        const native = insightNativeResultSchema.parse({
          ...navigation.nativeResult,
          actions,
          sources: [...navigation.nativeResult.sources, ...result.sources],
        });
        expect(native.limitations).toEqual([]);
        const selectedFacts = native.facts.filter(
          ({ reference }) => reference === 'fact_submission_count',
        );
        const selectedActions = native.actions.filter(({ reference }) =>
          selected.includes(reference),
        );
        const sourceReferences = new Set(
          [...selectedFacts, ...selectedActions].flatMap((item) => item.sourceReferences),
        );
        const localized = createEmployeeInsightSelectionCodec(
          native,
          locale,
          EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
        );
        const decoded = localized.decode({
          locale,
          statements: [
            {
              text: EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
              actionSelections: native.actions.map(({ reference }) => selected.includes(reference)),
              factSelections: native.facts.map(
                ({ reference }) => reference === 'fact_submission_count',
              ),
              limitationSelections: [],
              sourceSelections: native.sources.map(({ reference }) =>
                sourceReferences.has(reference),
              ),
            },
          ],
        });
        if (!decoded.ok) throw new Error('Expected valid navigation structure.');
        const grounded = validateGroundedInterpretation(decoded.candidate, native, locale);
        expect(grounded.statements[0]?.actionReferences).toEqual(
          selectedActions.map((item) => item.reference),
        );
        expect(grounded.statements[0]?.actionReferences).not.toContain(unrelated.reference);
        const errors = evaluateGoldenInterpretation(
          { ...navigation, requiredActionReferences: required },
          grounded,
        );
        expect(errors).toEqual(
          scenario === 'omitted'
            ? ['Missing required action reference action_submission_requests.']
            : [],
        );
      }
    }
  },
);

test.each(SUPPORTED_LOCALES)('preserves golden acceptance and shared sources in %s', (locale) => {
  const localized = createEmployeeInsightSelectionCodec(
    result,
    locale,
    EMPLOYEE_INSIGHT_SAFE_PROSE[locale],
  );
  const decoded = localized.decode({
    locale,
    statements: [{ ...selection, text: EMPLOYEE_INSIGHT_SAFE_PROSE[locale] }],
  });
  if (!decoded.ok) throw new Error('Expected a valid selection.');
  const interpretation = validateGroundedInterpretation(decoded.candidate, result, locale);
  expect(evaluateGoldenInterpretation(question, interpretation)).toEqual([]);
  expect(interpretation.statements[0]?.sourceReferences).toEqual(
    result.sources.map(({ reference }) => reference),
  );
});

test('every small-table subset has unique references and a distinct representation', () => {
  const observed = new Set<string>();
  for (let mask = 0; mask < 32; mask += 1) {
    const flags = result.facts.map((_fact, index) => Boolean(mask & (1 << index)));
    const decoded = codec.decode({
      ...wire,
      statements: [{ ...selection, factSelections: flags }],
    });
    expect(decoded).toMatchObject({
      ok: true,
      candidate: {
        statements: [
          {
            factReferences: result.facts
              .filter((_fact, index) => flags[index])
              .map(({ reference }) => reference),
          },
        ],
      },
    });
    if (!decoded.ok) throw new Error('Expected valid decoding.');
    observed.add(JSON.stringify(decoded.candidate));
  }
  expect(observed.size).toBe(32);
});

test.each([
  ['actionSelections', 'actionReferences', 1],
  ['factSelections', 'factReferences', 5],
  ['limitationSelections', 'limitationReferences', 1],
  ['sourceSelections', 'sourceReferences', 2],
] as const)('rejects malformed %s with content-free detail', (selectionField, field, length) => {
  for (const [value, reason] of [
    [null, 'NOT_ARRAY'],
    ['private-canary', 'NOT_ARRAY'],
    [Array.from({ length: length - 1 }, () => true), 'LENGTH'],
    [Array.from({ length: length + 1 }, () => true), 'LENGTH'],
    [Array.from({ length }, () => 'private-canary'), 'ITEM_TYPE'],
    [Array.from({ length }, () => 1), 'ITEM_TYPE'],
  ] as const) {
    const failure = codec.decode({
      ...wire,
      statements: [{ ...selection, [selectionField]: value }],
    });
    expect(failure).toEqual({
      ok: false,
      code: 'FINAL_SELECTION_INVALID',
      detail: { kind: 'SELECTION_INVALID', field, reason },
    });
    expect(JSON.stringify(failure)).not.toContain('private-canary');
  }
});

test.each([
  null,
  { ...wire, extra: 'private-canary' },
  { ...wire, locale: 'de-DE' },
  { ...wire, statements: [] },
  { ...wire, statements: [{ ...selection, extra: true }] },
  { ...wire, statements: [{ factSelections: [true] }] },
  { ...wire, statements: [{ ...selection, text: null }] },
  { ...wire, statements: [{ factReferences: ['private-canary'], text }] },
])('rejects an invalid envelope without content detail', (input) => {
  expect(codec.decode(input)).toMatchObject({ ok: false, detail: null });
  expect(JSON.stringify(codec.decode(input))).not.toContain('private-canary');
});

test('does not repair missing sources, limitations, required facts or non-allowlisted prose', () => {
  for (const [changes, code] of [
    [{ sourceSelections: [true, false] }, 'FINAL_SOURCE_MISMATCH'],
    [{ limitationSelections: [false] }, 'FINAL_LIMITATION_MISSING'],
    [{ text: 'A policy conclusion applies.' }, 'FINAL_PROSE_NOT_ALLOWLISTED'],
    [
      { factSelections: [false, false, false, false, false] },
      'FINAL_SCHEMA_REFERENCE_CARDINALITY_INVALID',
    ],
  ] as const) {
    const decoded = codec.decode({ ...wire, statements: [{ ...selection, ...changes }] });
    if (!decoded.ok) throw new Error('Expected structurally valid selections.');
    expect(() => validateGroundedInterpretation(decoded.candidate, result, 'en-GB')).toThrowError(
      expect.objectContaining({ validationFailureCode: code }),
    );
  }
  const decoded = codec.decode({
    ...wire,
    statements: [{ ...selection, factSelections: [false, false, true, true, true] }],
  });
  if (!decoded.ok) throw new Error('Expected valid selections.');
  const grounded = validateGroundedInterpretation(decoded.candidate, result, 'en-GB');
  expect(evaluateGoldenInterpretation(question, grounded)).toHaveLength(2);
});

test('supports empty tables and full native bounds while preserving the public 20-reference limit', () => {
  const fact = result.facts[0];
  const source = result.sources[0];
  const action = result.actions[0];
  const limitation = result.limitations[0];
  if (!fact || !source || !action || !limitation) throw new Error('Missing synthetic entries.');
  const large = {
    ...result,
    facts: Array.from({ length: 100 }, (_, i) => ({ ...fact, reference: `fact_large_${i}` })),
    sources: [
      ...result.sources,
      ...Array.from({ length: 48 }, (_, i) => ({ ...source, reference: `source_large_${i}` })),
    ],
    actions: Array.from({ length: 20 }, (_, i) => ({ ...action, reference: `action_large_${i}` })),
    limitations: Array.from({ length: 20 }, (_, i) => ({
      ...limitation,
      material: false,
      reference: `limit_large_${i}`,
    })),
  };
  expect(insightNativeResultSchema.safeParse(large).success).toBe(true);
  const largeCodec = createEmployeeInsightSelectionCodec(large, 'en-GB', text);
  for (const count of [20, 21]) {
    const decoded = largeCodec.decode({
      ...wire,
      statements: [
        {
          text,
          factSelections: large.facts.map((_fact, index) => index < count),
          sourceSelections: large.sources.map((_source, index) => index === 0),
          actionSelections: large.actions.map(() => false),
          limitationSelections: large.limitations.map(() => false),
        },
      ],
    });
    if (!decoded.ok) throw new Error('Expected full-length selections.');
    if (count === 20)
      expect(
        validateGroundedInterpretation(decoded.candidate, large, 'en-GB').statements[0]
          ?.factReferences,
      ).toHaveLength(20);
    else
      expect(() =>
        validateGroundedInterpretation(decoded.candidate, large, 'en-GB'),
      ).toThrowError();
  }
  const empty = { ...result, actions: [], limitations: [] };
  const decoded = createEmployeeInsightSelectionCodec(empty, 'en-GB', text).decode({
    ...wire,
    statements: [{ ...selection, actionSelections: [], limitationSelections: [] }],
  });
  if (!decoded.ok) throw new Error('Expected empty optional selections.');
  expect(
    validateGroundedInterpretation(decoded.candidate, empty, 'en-GB').statements[0]
      ?.actionReferences,
  ).toEqual([]);
});

test.each([
  'actionReferences',
  'factReferences',
  'limitationReferences',
  'sourceReferences',
] as const)('keeps strict duplicate rejection and bounded counts for %s', (field) => {
  const decoded = codec.decode(wire);
  if (!decoded.ok) throw new Error('Expected valid selections.');
  const valid = validateGroundedInterpretation(decoded.candidate, result, 'en-GB');
  const statement = valid.statements[0];
  if (!statement) throw new Error('Missing statement.');
  for (const count of [2, 20, 21]) {
    expect(() =>
      validateGroundedInterpretation(
        {
          ...valid,
          statements: [
            {
              ...statement,
              [field]: Array.from({ length: count }, () => 'private-canary'),
            },
          ],
        },
        result,
        'en-GB',
      ),
    ).toThrowError(
      expect.objectContaining({
        validationFailureCode: 'FINAL_SCHEMA_REFERENCES_DUPLICATE',
        validationDetail:
          count > 20
            ? null
            : {
                kind: 'REFERENCE_DUPLICATE',
                field,
                itemCount: count,
                distinctCount: 1,
                duplicateCount: count - 1,
              },
      }),
    );
  }
});

test('separate codecs retain their original table order across input mutation', () => {
  const snapshot = structuredClone(result);
  const first = createEmployeeInsightSelectionCodec(snapshot, 'en-GB', text);
  snapshot.facts.reverse();
  const second = createEmployeeInsightSelectionCodec(snapshot, 'en-GB', text);
  const input = {
    ...wire,
    statements: [{ ...selection, factSelections: [true, false, false, false, false] }],
  };
  expect(first.decode(input)).toMatchObject({
    candidate: { statements: [{ factReferences: [result.facts[0]?.reference] }] },
  });
  expect(second.decode(input)).toMatchObject({
    candidate: { statements: [{ factReferences: [result.facts[4]?.reference] }] },
  });
});
