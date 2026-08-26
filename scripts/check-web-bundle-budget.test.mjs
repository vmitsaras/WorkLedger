import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertBundleBudget,
  assertLocaleBundleBudget,
  localeForChunk,
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

test('keeps locale chunks outside the unchanged application JavaScript budget', () => {
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
