import type { SupportedLocale } from '@workledger/contracts';

import type { LoadedCatalog } from './catalog.js';
import { loadCatalog } from './load-catalog.js';
import { getLocaleDirection, requireSupportedLocale, type TextDirection } from './locale.js';

export type LocaleRuntime = Readonly<{
  catalog: LoadedCatalog;
  direction: TextDirection;
  locale: SupportedLocale;
}>;

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
