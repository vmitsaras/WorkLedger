import type { SupportedLocale } from '@workledger/contracts';

import type { LoadedCatalog, MessageKey, MessageParameterMap } from './catalog.js';
import { loadCatalog } from './load-catalog.js';
import { getLocaleDirection, requireSupportedLocale, type TextDirection } from './locale.js';

export type LocaleRuntime = Readonly<{
  catalog: LoadedCatalog;
  direction: TextDirection;
  locale: SupportedLocale;
}>;

export type StaticMessageKey = {
  [Key in MessageKey]: MessageParameterMap[Key] extends undefined ? Key : never;
}[MessageKey];

/**
 * Loads the exact catalog requested by the caller without starting a translation engine.
 * This is the web bootstrap boundary while existing screens still contain English source copy.
 */
export async function initializeLocale(value: unknown): Promise<LocaleRuntime> {
  const locale = requireSupportedLocale(value);
  const catalog = await loadCatalog(locale);

  return {
    catalog,
    direction: getLocaleDirection(locale),
    locale,
  };
}

export function translateStaticMessage(runtime: LocaleRuntime, key: StaticMessageKey): string {
  const [namespace, ...segments] = key.split('.');
  let value: unknown = runtime.catalog.resources[namespace as keyof LoadedCatalog['resources']];
  for (const segment of segments) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('A WorkLedger static message must resolve to plain text.');
    }
    value = (value as Readonly<Record<string, unknown>>)[segment];
  }
  if (typeof value !== 'string') {
    throw new TypeError('A WorkLedger static message must resolve to plain text.');
  }
  return value;
}
