import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@workledger/contracts';
import { createInstance, type i18n } from 'i18next';

import {
  CATALOG_NAMESPACES,
  type MessageArguments,
  type MessageKey,
  toRuntimeMessageKey,
} from './catalog.js';
import { initializeLocale, type LocaleRuntime } from './locale-runtime.js';

export type I18nRuntime = LocaleRuntime &
  Readonly<{
    instance: i18n;
  }>;

export async function initializeI18n(value: unknown): Promise<I18nRuntime> {
  const localeRuntime = await initializeLocale(value);
  const instance = createInstance();

  await instance.init({
    defaultNS: 'shared',
    fallbackLng: DEFAULT_LOCALE,
    fallbackNS: false,
    interpolation: {
      escapeValue: false,
    },
    lng: localeRuntime.locale,
    load: 'currentOnly',
    nonExplicitSupportedLngs: false,
    ns: [...CATALOG_NAMESPACES],
    resources: {
      [localeRuntime.locale]: localeRuntime.catalog.resources,
    },
    returnNull: false,
    supportedLngs: [...SUPPORTED_LOCALES],
  });

  return {
    ...localeRuntime,
    instance,
  };
}

export function translate<Key extends MessageKey>(
  runtime: I18nRuntime,
  key: Key,
  ...args: MessageArguments<Key>
): string {
  const result = runtime.instance.t(toRuntimeMessageKey(key), args[0] ?? {});
  if (typeof result !== 'string') {
    throw new TypeError('A WorkLedger message must resolve to plain text.');
  }
  return result;
}
