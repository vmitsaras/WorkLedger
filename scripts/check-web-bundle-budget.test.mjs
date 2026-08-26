import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPLICATION_BUNDLE_BASELINE,
  BUNDLE_BUDGETS,
  INTERNATIONALIZATION_RUNTIME_ALLOWANCE,
  assertBundleBudget,
  assertLocaleBundleBudget,
  localeForChunk,
  measureInternationalizationRuntimeAllowance,
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

test('adds only the measured internationalization runtime allowance to application totals', () => {
  assert.equal(
    BUNDLE_BUDGETS.totalJavaScriptBytes,
    APPLICATION_BUNDLE_BASELINE.totalJavaScriptBytes +
      INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptBytes,
  );
  assert.equal(
    BUNDLE_BUDGETS.totalJavaScriptGzipBytes,
    APPLICATION_BUNDLE_BASELINE.totalJavaScriptGzipBytes +
      INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptGzipBytes,
  );
  assert.equal(
    BUNDLE_BUDGETS.largestJavaScriptBytes,
    APPLICATION_BUNDLE_BASELINE.largestJavaScriptBytes,
  );
  assert.equal(BUNDLE_BUDGETS.totalCssBytes, APPLICATION_BUNDLE_BASELINE.totalCssBytes);

  assert.deepEqual(
    measureInternationalizationRuntimeAllowance({
      totalJavaScriptBytes: 916_728,
      totalJavaScriptGzipBytes: 247_840,
    }),
    { rawBytes: 6_728, rawBudget: 76_000, gzipBytes: 1_840, gzipBudget: 22_000 },
  );
});

test('rejects totals above the combined application and runtime ceiling', () => {
  const entriesAtLimit = [
    { name: 'app-a.js', bytes: 493_000, gzipBytes: 134_000 },
    { name: 'app-b.js', bytes: 493_000, gzipBytes: 134_000 },
  ];

  assert.equal(assertBundleBudget(entriesAtLimit).totalJavaScriptBytes, 986_000);
  assert.throws(
    () =>
      assertBundleBudget([
        entriesAtLimit[0],
        { ...entriesAtLimit[1], bytes: entriesAtLimit[1].bytes + 1 },
      ]),
    /totalJavaScriptBytes/,
  );
  assert.throws(
    () =>
      assertBundleBudget([
        entriesAtLimit[0],
        { ...entriesAtLimit[1], gzipBytes: entriesAtLimit[1].gzipBytes + 1 },
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
