import { z } from 'zod';

export const SUPPORTED_LOCALES = ['en-GB', 'de-DE', 'es-ES'] as const;
export const DEFAULT_LOCALE = 'en-GB' satisfies SupportedLocale;

export const supportedLocaleSchema = z.enum(SUPPORTED_LOCALES);

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return supportedLocaleSchema.safeParse(value).success;
}
