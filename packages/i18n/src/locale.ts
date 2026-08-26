import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type SupportedLocale,
} from '@workledger/contracts';

export type TextDirection = 'ltr' | 'rtl';
export type LocaleResolutionSource = 'device' | 'browser' | 'fallback';

export const LOCALE_DIRECTIONS = Object.freeze({
  'de-DE': 'ltr',
  'en-GB': 'ltr',
  'es-ES': 'ltr',
}) satisfies Readonly<Record<SupportedLocale, TextDirection>>;

export type SignedOutLocaleResolution = Readonly<{
  discardUnsupportedDevicePreference: boolean;
  locale: SupportedLocale;
  source: LocaleResolutionSource;
}>;

export class UnsupportedLocaleError extends Error {
  public constructor() {
    super('The locale is not supported by this WorkLedger installation.');
    this.name = 'UnsupportedLocaleError';
  }
}

export function getLocaleDirection(locale: SupportedLocale): TextDirection {
  return LOCALE_DIRECTIONS[locale];
}

export function requireSupportedLocale(value: unknown): SupportedLocale {
  if (!isSupportedLocale(value)) throw new UnsupportedLocaleError();
  return value;
}

export function matchBrowserLocale(value: string): SupportedLocale | null {
  let language: string;
  try {
    language = new Intl.Locale(value).language;
  } catch {
    return null;
  }

  switch (language) {
    case 'de':
      return 'de-DE';
    case 'en':
      return 'en-GB';
    case 'es':
      return 'es-ES';
    default:
      return null;
  }
}

export function resolveSignedOutLocale(input: {
  readonly browserLanguages: readonly string[];
  readonly devicePreference?: unknown;
}): SignedOutLocaleResolution {
  if (isSupportedLocale(input.devicePreference)) {
    return {
      discardUnsupportedDevicePreference: false,
      locale: input.devicePreference,
      source: 'device',
    };
  }

  const discardUnsupportedDevicePreference =
    input.devicePreference !== undefined && input.devicePreference !== null;

  for (const browserLanguage of input.browserLanguages) {
    const locale = matchBrowserLocale(browserLanguage);
    if (locale !== null) {
      return { discardUnsupportedDevicePreference, locale, source: 'browser' };
    }
  }

  return {
    discardUnsupportedDevicePreference,
    locale: DEFAULT_LOCALE,
    source: 'fallback',
  };
}

export function isProductionLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.some((locale) => locale === value);
}
