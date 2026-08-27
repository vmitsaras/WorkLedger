import type { SupportedLocale } from '@workledger/contracts';
import {
  initializeI18n,
  translate,
  type I18nRuntime,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';

export type OutputMessageKey = Extract<MessageKey, `output.${string}`>;
export type OutputMessageTranslator = <Key extends OutputMessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

const runtimeByLocale = new Map<SupportedLocale, Promise<I18nRuntime>>();

export async function createOutputMessageTranslator(
  locale: SupportedLocale,
): Promise<OutputMessageTranslator> {
  const runtime = await outputRuntime(locale);
  return <Key extends OutputMessageKey>(key: Key, ...args: MessageArguments<Key>) =>
    translate(runtime, key, ...args);
}

function outputRuntime(locale: SupportedLocale): Promise<I18nRuntime> {
  const existing = runtimeByLocale.get(locale);
  if (existing !== undefined) return existing;
  const pending = initializeI18n(locale);
  runtimeByLocale.set(locale, pending);
  return pending;
}
