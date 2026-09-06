import type { InsightInterpretation, InsightNativeResult } from '@workledger/contracts/insights';
import { insightLimitationDependencies } from '../src/insights/employee-insight-dependencies.js';
import {
  EMPLOYEE_INSIGHT_SAFE_PROSE,
  validateGroundedInterpretation,
} from '../src/insights/employee-insight-interpretation.js';
import {
  EMPLOYEE_INSIGHT_GOLDEN_SET,
  evaluateGoldenInterpretation,
} from './fixtures/employee-insight-golden-set.js';

const question = EMPLOYEE_INSIGHT_GOLDEN_SET.find(({ id }) => id === 'balance-projection');
if (question === undefined) throw new Error('Missing projection fixture.');
const native = question.nativeResult;

function answer(
  result: InsightNativeResult,
  facts: readonly string[],
  actions: readonly string[],
): InsightInterpretation {
  const limitations = result.limitations.filter((item) => item.material);
  const sources = new Set([
    ...result.facts
      .filter((item) => facts.includes(item.reference))
      .flatMap((item) => item.sourceReferences),
    ...result.actions
      .filter((item) => actions.includes(item.reference))
      .flatMap((item) => item.sourceReferences),
    ...limitations.flatMap((item) => item.sourceReferences),
  ]);
  return {
    locale: 'de-DE',
    statements: [
      {
        factReferences: [...facts],
        actionReferences: [...actions],
        limitationReferences: limitations.map((item) => item.reference),
        sourceReferences: [...sources],
        text: EMPLOYEE_INSIGHT_SAFE_PROSE['de-DE'],
      },
    ],
  };
}
const dependencies = insightLimitationDependencies(native).filter(
  ({ limitation }) => limitation.material,
);
const facts = [...new Set(dependencies.flatMap((item) => item.relatedFactReferences))];
const actions = [...new Set(dependencies.flatMap((item) => item.relatedActionReferences))];

test('rejects a missing material fact before checking missing actions, without retained detail', () => {
  expect(() =>
    validateGroundedInterpretation(answer(native, facts.slice(0, 1), []), native, 'de-DE'),
  ).toThrow(
    expect.objectContaining({
      validationFailureCode: 'FINAL_MATERIAL_FACT_MISSING',
      validationDetail: null,
    }),
  );
});

test('rejects missing material actions after all material facts are present', () => {
  expect(() => validateGroundedInterpretation(answer(native, facts, []), native, 'de-DE')).toThrow(
    expect.objectContaining({
      validationFailureCode: 'FINAL_MATERIAL_ACTION_MISSING',
      validationDetail: null,
    }),
  );
});

test('material closure alone does not satisfy the independent comparison obligation', () => {
  const interpretation = validateGroundedInterpretation(
    answer(native, facts, actions),
    native,
    'de-DE',
  );
  expect(evaluateGoldenInterpretation(question, interpretation)).toEqual([
    'Missing required fact reference fact_balance_posted_change.',
  ]);
});

test('nonmaterial limitations do not require their related facts/actions', () => {
  const result = {
    ...native,
    limitations: native.limitations.map((item) => ({ ...item, material: false })),
  };
  expect(() =>
    validateGroundedInterpretation(answer(result, facts.slice(0, 1), []), result, 'de-DE'),
  ).not.toThrow();
});

test('shared dependencies are direct, stable under reordering and do not select posted facts', () => {
  const reversed = {
    ...native,
    facts: [...native.facts].reverse(),
    actions: [...native.actions].reverse(),
  };
  expect(
    new Set(insightLimitationDependencies(reversed).flatMap((item) => item.relatedFactReferences)),
  ).toEqual(new Set(facts));
  expect(facts).not.toContain('fact_balance_posted_change');
  const duplicatedLimit = {
    ...native,
    limitations: [
      ...native.limitations,
      ...native.limitations.map((item) => ({ ...item, reference: `${item.reference}_second` })),
    ],
  };
  expect(() =>
    validateGroundedInterpretation(
      answer(duplicatedLimit, facts, actions),
      duplicatedLimit,
      'de-DE',
    ),
  ).not.toThrow();
});
