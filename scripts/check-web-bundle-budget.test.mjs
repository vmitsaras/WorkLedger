import assert from 'node:assert/strict';
import test from 'node:test';

import { assertBundleBudget } from './check-web-bundle-budget.mjs';

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
