import type { SupportedLocale } from '@workledger/contracts';

import type { LoadedCatalog } from './catalog.js';

type CatalogModule = Readonly<{ catalog: LoadedCatalog }>;

const catalogLoaders = {
  'de-DE': () => import('./catalogs/locales/de-DE/index.js'),
  'en-GB': () => import('./catalogs/locales/en-GB/index.js'),
  'es-ES': () => import('./catalogs/locales/es-ES/index.js'),
} satisfies Record<SupportedLocale, () => Promise<CatalogModule>>;

export async function loadCatalog(locale: SupportedLocale): Promise<LoadedCatalog> {
  const module = await catalogLoaders[locale]();
  if (module.catalog.locale !== locale) {
    throw new Error('The loaded catalog does not match the requested locale.');
  }
  return module.catalog;
}
