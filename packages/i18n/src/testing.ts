import { createInstance, type i18n } from 'i18next';

import {
  CATALOG_NAMESPACES,
  type CatalogResource,
  type CatalogTree,
  type LoadedCatalog,
  type MessageArguments,
  type MessageKey,
  toRuntimeMessageKey,
} from './catalog.js';
import { loadCatalog } from './load-catalog.js';

export const PSEUDO_LOCALE = 'en-XA' as const;

export type PseudoLocale = typeof PSEUDO_LOCALE;
export type PseudoCatalog = Readonly<{
  locale: PseudoLocale;
  resources: CatalogResource;
}>;
export type PseudoI18nRuntime = Readonly<{
  catalog: PseudoCatalog;
  direction: 'ltr';
  instance: i18n;
  locale: PseudoLocale;
}>;

const INTERPOLATION_TOKEN = /\{\{\s*[A-Za-z][A-Za-z0-9]*\s*\}\}/gu;
const ACCENTED_CHARACTERS: Readonly<Record<string, string>> = Object.freeze({
  A: 'Å',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'Ë',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ħ',
  I: 'Ï',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ŀ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ø',
  P: 'Þ',
  Q: 'Ǫ',
  R: 'Ŗ',
  S: 'Š',
  T: 'Ŧ',
  U: 'Ü',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẍ',
  Y: 'Ÿ',
  Z: 'Ž',
  a: 'å',
  b: 'ƀ',
  c: 'ç',
  d: 'ð',
  e: 'ë',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ħ',
  i: 'ï',
  j: 'ĵ',
  k: 'ķ',
  l: 'ŀ',
  m: 'ṁ',
  n: 'ñ',
  o: 'ø',
  p: 'þ',
  q: 'ǫ',
  r: 'ŗ',
  s: 'š',
  t: 'ŧ',
  u: 'ü',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẍ',
  y: 'ÿ',
  z: 'ž',
});

function accentText(value: string): string {
  return [...value].map((character) => ACCENTED_CHARACTERS[character] ?? character).join('');
}

/**
 * Produces visibly artificial, expanded text while leaving i18next interpolation tokens intact.
 * This helper is exported only from `@workledger/i18n/testing`; production locale resolution and
 * persistence continue to accept only the three `SupportedLocale` values.
 */
export function pseudoLocalizeMessage(message: string): string {
  const transformed = message.split(INTERPOLATION_TOKEN).map((part) => accentText(part));
  const tokens = [...message.matchAll(INTERPOLATION_TOKEN)].map((match) => match[0]);
  const body = transformed.flatMap((part, index) =>
    index < tokens.length ? [part, tokens[index]] : [part],
  );
  const visibleCharacterCount = message.replace(INTERPOLATION_TOKEN, '').replace(/\s/gu, '').length;
  const expansion = ' ·'.repeat(Math.max(2, Math.ceil(visibleCharacterCount * 0.3)));
  return `⟦${body.join('')}${expansion}⟧`;
}

function pseudoLocalizeTree(tree: CatalogTree): CatalogTree {
  const transformed: Record<string, string | CatalogTree> = {};
  for (const [key, value] of Object.entries(tree)) {
    transformed[key] =
      typeof value === 'string' ? pseudoLocalizeMessage(value) : pseudoLocalizeTree(value);
  }
  return transformed;
}

export function createPseudoCatalog(source: LoadedCatalog): PseudoCatalog {
  return {
    locale: PSEUDO_LOCALE,
    resources: {
      admin: pseudoLocalizeTree(source.resources.admin),
      auth: pseudoLocalizeTree(source.resources.auth),
      employee: pseudoLocalizeTree(source.resources.employee),
      manager: pseudoLocalizeTree(source.resources.manager),
      output: pseudoLocalizeTree(source.resources.output),
      shared: pseudoLocalizeTree(source.resources.shared),
      system: pseudoLocalizeTree(source.resources.system),
    },
  };
}

export async function initializePseudoI18n(): Promise<PseudoI18nRuntime> {
  const source = await loadCatalog('en-GB');
  const catalog = createPseudoCatalog(source);
  const instance = createInstance();

  await instance.init({
    defaultNS: 'shared',
    fallbackLng: false,
    interpolation: { escapeValue: false },
    lng: PSEUDO_LOCALE,
    load: 'currentOnly',
    nonExplicitSupportedLngs: false,
    ns: [...CATALOG_NAMESPACES],
    resources: { [PSEUDO_LOCALE]: catalog.resources },
    returnNull: false,
    supportedLngs: [PSEUDO_LOCALE],
  });

  return { catalog, direction: 'ltr', instance, locale: PSEUDO_LOCALE };
}

export function translatePseudo<Key extends MessageKey>(
  runtime: PseudoI18nRuntime,
  key: Key,
  ...args: MessageArguments<Key>
): string {
  const result = runtime.instance.t(toRuntimeMessageKey(key), args[0] ?? {});
  if (typeof result !== 'string') {
    throw new TypeError('A WorkLedger pseudo-locale message must resolve to plain text.');
  }
  return result;
}
