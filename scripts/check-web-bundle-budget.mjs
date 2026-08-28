import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const APPLICATION_BUNDLE_BASELINE = Object.freeze({
  largestJavaScriptBytes: 500_000,
  totalJavaScriptBytes: 942_000,
  totalJavaScriptGzipBytes: 255_000,
  totalCssBytes: 51_000,
});

export const INTERNATIONALIZATION_RUNTIME_ALLOWANCE = Object.freeze({
  totalJavaScriptBytes: 96_000,
  totalJavaScriptGzipBytes: 22_000,
});

export const EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE = Object.freeze({
  totalJavaScriptBytes: 14_000,
  totalJavaScriptGzipBytes: 5_000,
});

export const BUNDLE_BUDGETS = Object.freeze({
  ...APPLICATION_BUNDLE_BASELINE,
  totalJavaScriptBytes:
    APPLICATION_BUNDLE_BASELINE.totalJavaScriptBytes +
    INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptBytes +
    EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE.totalJavaScriptBytes,
  totalJavaScriptGzipBytes:
    APPLICATION_BUNDLE_BASELINE.totalJavaScriptGzipBytes +
    INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptGzipBytes +
    EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE.totalJavaScriptGzipBytes,
});

export const LOCALE_BUNDLE_BUDGETS = Object.freeze({
  perLocaleBytes: 150 * 1024,
  perLocaleGzipBytes: 50 * 1024,
  totalBytes: 450 * 1024,
  totalGzipBytes: 150 * 1024,
});

const PRODUCTION_LOCALES = ['en-GB', 'de-DE', 'es-ES'];
const LOCALE_CHUNK_PATTERN = /^locale-(en-GB|de-DE|es-ES)-[^/]+\.js$/u;

export function localeForChunk(name) {
  return LOCALE_CHUNK_PATTERN.exec(name)?.[1] ?? null;
}

export function assertBundleBudget(entries, budgets = BUNDLE_BUDGETS) {
  const javascript = entries.filter(
    (entry) => entry.name.endsWith('.js') && localeForChunk(entry.name) === null,
  );
  const css = entries.filter((entry) => entry.name.endsWith('.css'));
  const values = {
    largestJavaScriptBytes: Math.max(0, ...javascript.map((entry) => entry.bytes)),
    totalJavaScriptBytes: javascript.reduce((total, entry) => total + entry.bytes, 0),
    totalJavaScriptGzipBytes: javascript.reduce((total, entry) => total + entry.gzipBytes, 0),
    totalCssBytes: css.reduce((total, entry) => total + entry.bytes, 0),
  };
  for (const [name, limit] of Object.entries(budgets)) {
    if (values[name] > limit)
      throw new Error(`${name} is ${values[name]} bytes; budget is ${limit}.`);
  }
  return values;
}

export function measureRuntimeAllowances(values) {
  return {
    rawBytes: Math.max(
      0,
      values.totalJavaScriptBytes - APPLICATION_BUNDLE_BASELINE.totalJavaScriptBytes,
    ),
    rawBudget:
      INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptBytes +
      EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE.totalJavaScriptBytes,
    gzipBytes: Math.max(
      0,
      values.totalJavaScriptGzipBytes - APPLICATION_BUNDLE_BASELINE.totalJavaScriptGzipBytes,
    ),
    gzipBudget:
      INTERNATIONALIZATION_RUNTIME_ALLOWANCE.totalJavaScriptGzipBytes +
      EMPLOYEE_LOCAL_AI_PILOT_ALLOWANCE.totalJavaScriptGzipBytes,
  };
}

export function assertLocaleBundleBudget(entries, budgets = LOCALE_BUNDLE_BUDGETS) {
  const valuesByLocale = Object.fromEntries(
    PRODUCTION_LOCALES.map((locale) => [locale, { bytes: 0, chunkCount: 0, gzipBytes: 0 }]),
  );
  for (const entry of entries) {
    const locale = localeForChunk(entry.name);
    if (locale === null) continue;
    valuesByLocale[locale].bytes += entry.bytes;
    valuesByLocale[locale].chunkCount += 1;
    valuesByLocale[locale].gzipBytes += entry.gzipBytes;
  }

  for (const locale of PRODUCTION_LOCALES) {
    const values = valuesByLocale[locale];
    if (values.chunkCount === 0) throw new Error(`Locale ${locale} has no emitted catalog chunk.`);
    if (values.bytes > budgets.perLocaleBytes) {
      throw new Error(
        `Locale ${locale} is ${values.bytes} bytes; budget is ${budgets.perLocaleBytes}.`,
      );
    }
    if (values.gzipBytes > budgets.perLocaleGzipBytes) {
      throw new Error(
        `Locale ${locale} gzip is ${values.gzipBytes} bytes; budget is ${budgets.perLocaleGzipBytes}.`,
      );
    }
  }

  const totalBytes = Object.values(valuesByLocale).reduce((total, value) => total + value.bytes, 0);
  const totalGzipBytes = Object.values(valuesByLocale).reduce(
    (total, value) => total + value.gzipBytes,
    0,
  );
  if (totalBytes > budgets.totalBytes) {
    throw new Error(`Locale total is ${totalBytes} bytes; budget is ${budgets.totalBytes}.`);
  }
  if (totalGzipBytes > budgets.totalGzipBytes) {
    throw new Error(
      `Locale gzip total is ${totalGzipBytes} bytes; budget is ${budgets.totalGzipBytes}.`,
    );
  }

  return { totalBytes, totalGzipBytes, valuesByLocale };
}

async function main() {
  const assetDirectory = path.resolve('apps/web/dist/browser/assets');
  const names = await readdir(assetDirectory);
  const entries = await Promise.all(
    names
      .filter((name) => /\.(?:css|js)$/.test(name))
      .map(async (name) => {
        const content = await readFile(path.join(assetDirectory, name));
        return { name, bytes: content.byteLength, gzipBytes: gzipSync(content).byteLength };
      }),
  );
  const application = assertBundleBudget(entries);
  const runtimeAllowances = measureRuntimeAllowances(application);
  const locales = assertLocaleBundleBudget(entries);
  console.log(
    `Web bundle budget valid: ${JSON.stringify({ application, runtimeAllowances, locales })}.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href
) {
  await main();
}
