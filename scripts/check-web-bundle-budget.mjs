import { gzipSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const BUNDLE_BUDGETS = Object.freeze({
  largestJavaScriptBytes: 500_000,
  totalJavaScriptBytes: 850_000,
  totalJavaScriptGzipBytes: 230_000,
  totalCssBytes: 50_000,
});

export function assertBundleBudget(entries, budgets = BUNDLE_BUDGETS) {
  const javascript = entries.filter((entry) => entry.name.endsWith('.js'));
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
  const values = assertBundleBudget(entries);
  console.log(`Web bundle budget valid: ${JSON.stringify(values)}.`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href
) {
  await main();
}
