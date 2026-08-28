import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPLICATION_BUNDLE_BASELINE,
  BUNDLE_BUDGETS,
  EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE,
  HR_AGGREGATE_INSIGHTS_ALLOWANCE,
  INTERNATIONALIZATION_RUNTIME_ALLOWANCE,
  MANAGER_INSIGHTS_ALLOWANCE,
  assertBundleBudget,
  assertLocaleBundleBudget,
  localeForChunk,
  measureRuntimeAllowances,
} from './check-web-bundle-budget.mjs';

test('accepts assets within every budget', () => {
  assert.equal(
    assertBundleBudget([{ name: 'app.js', bytes: 100, gzipBytes: 50 }]).totalJavaScriptBytes,
    100,
  );
});

test('rejects a JavaScript regression above a budget', () => {
  assert.throws(
    () =>
      assertBundleBudget([{ name: 'app.js', bytes: 101, gzipBytes: 50 }], {
        largestJavaScriptBytes: 100,
        totalJavaScriptBytes: 200,
        totalJavaScriptGzipBytes: 100,
        totalCssBytes: 100,
      }),
    /largestJavaScriptBytes/,
  );
});

test('adds only the governed runtime allowances to application totals', () => {
  assert.equal(
    BUNDLE_BUDGETS.totalJavaScriptBytes,
    APPLICATION_BUNDLE_BASELINE.totalJavaScriptBytes +
      INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptBytes +
      EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE.totalJavaScriptBytes +
      MANAGER_INSIGHTS_ALLOWANCE.totalJavaScriptBytes +
      HR_AGGREGATE_INSIGHTS_ALLOWANCE.totalJavaScriptBytes,
  );
  assert.equal(
    BUNDLE_BUDGETS.totalJavaScriptGzipBytes,
    APPLICATION_BUNDLE_BASELINE.totalJavaScriptGzipBytes +
      INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptGzipBytes +
      EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE.totalJavaScriptGzipBytes +
      MANAGER_INSIGHTS_ALLOWANCE.totalJavaScriptGzipBytes +
      HR_AGGREGATE_INSIGHTS_ALLOWANCE.totalJavaScriptGzipBytes,
  );
  assert.equal(
    BUNDLE_BUDGETS.largestJavaScriptBytes,
    APPLICATION_BUNDLE_BASELINE.largestJavaScriptBytes,
  );
  assert.equal(BUNDLE_BUDGETS.totalCssBytes, APPLICATION_BUNDLE_BASELINE.totalCssBytes);

  assert.deepEqual(
    measureRuntimeAllowances({
      totalJavaScriptBytes: 948_728,
      totalJavaScriptGzipBytes: 256_840,
    }),
    { rawBytes: 6_728, rawBudget: 125_000, gzipBytes: 1_840, gzipBudget: 32_000 },
  );
});

test('rejects totals above the combined application and runtime ceiling', () => {
  const entriesAtLimit = [
    { name: 'app-a.js', bytes: 500_000, gzipBytes: 120_000 },
    { name: 'app-b.js', bytes: 500_000, gzipBytes: 120_000 },
    { name: 'app-c.js', bytes: 67_000, gzipBytes: 47_000 },
  ];

  assert.equal(assertBundleBudget(entriesAtLimit).totalJavaScriptBytes, 1_067_000);
  assert.throws(
    () =>
      assertBundleBudget([
        entriesAtLimit[0],
        entriesAtLimit[1],
        { ...entriesAtLimit[2], bytes: entriesAtLimit[2].bytes + 1 },
      ]),
    /totalJavaScriptBytes/,
  );
  assert.throws(
    () =>
      assertBundleBudget([
        entriesAtLimit[0],
        entriesAtLimit[1],
        { ...entriesAtLimit[2], gzipBytes: entriesAtLimit[2].gzipBytes + 1 },
      ]),
    /totalJavaScriptGzipBytes/,
  );
});

test('keeps locale chunks outside the application and runtime JavaScript budget', () => {
  const entries = [
    { name: 'app.js', bytes: 100, gzipBytes: 50 },
    { name: 'locale-en-GB-a1.js', bytes: 30, gzipBytes: 10 },
  ];
  assert.equal(assertBundleBudget(entries).totalJavaScriptBytes, 100);
  assert.equal(localeForChunk('locale-en-GB-a1.js'), 'en-GB');
  assert.equal(localeForChunk('vendor-a1.js'), null);
});

test('accepts one or more bounded chunks for every production locale', () => {
  const values = assertLocaleBundleBudget([
    { name: 'locale-en-GB-a1.js', bytes: 30, gzipBytes: 10 },
    { name: 'locale-de-DE-a1.js', bytes: 40, gzipBytes: 12 },
    { name: 'locale-es-ES-a1.js', bytes: 50, gzipBytes: 14 },
  ]);
  assert.equal(values.totalBytes, 120);
  assert.equal(values.valuesByLocale['de-DE'].chunkCount, 1);
});

test('rejects a missing or oversized production locale chunk', () => {
  const entries = [
    { name: 'locale-en-GB-a1.js', bytes: 30, gzipBytes: 10 },
    { name: 'locale-de-DE-a1.js', bytes: 40, gzipBytes: 12 },
  ];
  assert.throws(() => assertLocaleBundleBudget(entries), /es-ES.*no emitted catalog chunk/);

  assert.throws(
    () =>
      assertLocaleBundleBudget(
        [...entries, { name: 'locale-es-ES-a1.js', bytes: 51, gzipBytes: 14 }],
        { perLocaleBytes: 50, perLocaleGzipBytes: 50, totalBytes: 500, totalGzipBytes: 500 },
      ),
    /es-ES is 51 bytes/,
  );
});
