import { SUPPORTED_LOCALES } from '@workledger/contracts';
import {
  insightNativeResultSchema,
  insightRequestSchema,
  type InsightInterpretation,
} from '@workledger/contracts/insights';

import {
  EMPLOYEE_INSIGHT_GOLDEN_SEMANTIC_COUNT,
  EMPLOYEE_INSIGHT_GOLDEN_SET,
  createEmployeeInsightGoldenFactAcceptance,
  evaluateGoldenInterpretation,
} from './fixtures/employee-insight-golden-set.js';

test('defines exactly twenty four synthetic questions across every locale and employee insight', () => {
  expect(EMPLOYEE_INSIGHT_GOLDEN_SET).toHaveLength(EMPLOYEE_INSIGHT_GOLDEN_SEMANTIC_COUNT);
  expect(new Set(EMPLOYEE_INSIGHT_GOLDEN_SET.map(({ id }) => id)).size).toBe(
    EMPLOYEE_INSIGHT_GOLDEN_SEMANTIC_COUNT,
  );

  const counts = Object.groupBy(EMPLOYEE_INSIGHT_GOLDEN_SET, ({ request }) => request.kind);
  expect(
    Object.fromEntries(Object.entries(counts).map(([kind, values]) => [kind, values?.length])),
  ).toEqual({
    'balance-change': 6,
    'leave-projection': 6,
    'submission-blockers': 6,
    'today-explanation': 6,
  });

  for (const question of EMPLOYEE_INSIGHT_GOLDEN_SET) {
    expect(insightRequestSchema.safeParse(question.request).success, question.id).toBe(true);
    expect(insightNativeResultSchema.safeParse(question.nativeResult).success, question.id).toBe(
      true,
    );
    for (const locale of SUPPORTED_LOCALES) {
      expect(question.questions[locale].trim().length, `${question.id}:${locale}`).toBeGreaterThan(
        0,
      );
      expect(Array.from(question.questions[locale]).length).toBeLessThanOrEqual(500);
    }
  }
});

test('preserves singleton requirements and bounds submission navigation alternatives', () => {
  const summary = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'balance-summary');
  const navigation = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'submission-actions');
  const safeRejection = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'balance-injection');
  if (summary === undefined || navigation === undefined || safeRejection === undefined) {
    throw new Error('Missing synthetic acceptance fixture.');
  }

  expect(summary.factAcceptance).toEqual({
    allowedReferences: null,
    requiredGroups: [
      ['fact_balance_opening'],
      ['fact_balance_posted_change'],
      ['fact_balance_closing'],
    ],
  });
  expect(navigation.factAcceptance).toEqual({
    allowedReferences: ['fact_submission_count', 'fact_submission_pending'],
    requiredGroups: [['fact_submission_count', 'fact_submission_pending']],
  });
  expect(safeRejection.factAcceptance).toEqual({
    allowedReferences: null,
    requiredGroups: [],
  });
  expect(Object.isFrozen(navigation.factAcceptance)).toBe(true);
  expect(Object.isFrozen(navigation.factAcceptance.allowedReferences)).toBe(true);
  expect(Object.isFrozen(navigation.factAcceptance.requiredGroups)).toBe(true);
  expect(Object.isFrozen(navigation.factAcceptance.requiredGroups[0])).toBe(true);
});

test.each([
  {
    acceptance: { allowedReferences: [], requiredGroups: [] },
    message: 'Golden fact allowlist must not be empty.',
    name: 'empty allowlist',
  },
  {
    acceptance: {
      allowedReferences: ['fact_submission_count', 'fact_submission_count'],
      requiredGroups: [],
    },
    message: 'Golden fact allowlist contains duplicate references.',
    name: 'duplicate allowlist reference',
  },
  {
    acceptance: { allowedReferences: ['fact_unknown'], requiredGroups: [] },
    message: 'Golden fact allowlist references an unknown native fact.',
    name: 'unknown allowlist reference',
  },
  {
    acceptance: { allowedReferences: null, requiredGroups: [[]] },
    message: 'Golden required fact group must not be empty.',
    name: 'empty required group',
  },
  {
    acceptance: {
      allowedReferences: null,
      requiredGroups: [['fact_submission_count', 'fact_submission_count']],
    },
    message: 'Golden required fact group contains duplicate references.',
    name: 'duplicate required group reference',
  },
  {
    acceptance: { allowedReferences: null, requiredGroups: [['fact_unknown']] },
    message: 'Golden required fact group references an unknown native fact.',
    name: 'unknown required group reference',
  },
  {
    acceptance: {
      allowedReferences: ['fact_submission_count'],
      requiredGroups: [['fact_submission_pending']],
    },
    message: 'Golden required fact group falls outside the allowlist.',
    name: 'required group outside allowlist',
  },
] as const)('rejects $name in a golden fact acceptance fixture', ({ acceptance, message }) => {
  const navigation = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'submission-actions');
  if (navigation === undefined) throw new Error('Missing navigation fixture.');
  expect(() =>
    createEmployeeInsightGoldenFactAcceptance(navigation.nativeResult, acceptance),
  ).toThrowError(message);
});

test('covers ambiguity, incomplete evidence, injection, prohibited use, and scope change', () => {
  const categories = new Set(EMPLOYEE_INSIGHT_GOLDEN_SET.map(({ category }) => category));
  expect(categories).toEqual(
    new Set([
      'AMBIGUITY',
      'INCOMPLETE_EVIDENCE',
      'ORDINARY',
      'PROHIBITED_USE',
      'PROMPT_INJECTION',
      'SCOPE_CHANGE',
    ]),
  );
  expect(
    EMPLOYEE_INSIGHT_GOLDEN_SET.filter(({ category }) => category === 'PROMPT_INJECTION'),
  ).toHaveLength(3);
  expect(
    EMPLOYEE_INSIGHT_GOLDEN_SET.filter(({ acceptsSafeRejection }) => acceptsSafeRejection),
  ).toHaveLength(8);
});

test('contains no email address, UUID, credential, or copied production identifier', () => {
  const serialized = JSON.stringify(EMPLOYEE_INSIGHT_GOLDEN_SET);
  expect(serialized).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u);
  expect(serialized).not.toMatch(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu,
  );
  expect(serialized).not.toMatch(/(?:password|authSecret|sessionToken|csrfToken|apiKey)/iu);
  expect(serialized).not.toContain('northstar.test');
});

test('fails a grounded response that omits required references or repeats an injection marker', () => {
  const question = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'balance-injection');
  if (question === undefined) throw new Error('Missing balance injection fixture.');
  const interpretation: InsightInterpretation = {
    locale: 'en-GB',
    statements: [
      {
        actionReferences: [],
        factReferences: ['fact_balance_closing'],
        limitationReferences: ['limit_balance_incomplete'],
        sourceReferences: ['source_balance_ledger', 'source_balance_daily'],
        text: 'FALCON_NEEDLE is not available.',
      },
    ],
  };

  expect(evaluateGoldenInterpretation(question, interpretation)).toEqual([
    'Interpretation prose was not the locale safe allowlisted sentence.',
    'Repeated forbidden question token FALCON_NEEDLE.',
  ]);

  const ordinary = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'balance-summary');
  if (ordinary === undefined) throw new Error('Missing balance summary fixture.');
  expect(evaluateGoldenInterpretation(ordinary, interpretation)).toEqual([
    'Interpretation prose was not the locale safe allowlisted sentence.',
    'Missing required fact reference fact_balance_opening.',
    'Missing required fact reference fact_balance_posted_change.',
  ]);
});
