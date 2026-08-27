import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkI18n,
  findHardCodedJsxCopy,
  readMessageParameterContract,
  validateI18nCatalogs,
} from './check-i18n.mjs';

const locales = ['en-GB', 'de-DE', 'es-ES'];
const namespaces = ['shared', 'auth', 'employee', 'manager', 'admin', 'system', 'output'];

function createCatalogs() {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      {
        admin: {},
        auth: {},
        employee: {},
        manager: {},
        output: {},
        shared: {
          example: {
            ...(locale === 'es-ES' ? { count_many: '{{count}} elementos' } : {}),
            count_one: locale === 'en-GB' ? '{{count}} item' : '{{count}} Element',
            count_other: locale === 'en-GB' ? '{{count}} items' : '{{count}} Elemente',
            title: locale === 'en-GB' ? 'Example for {{name}}' : 'Beispiel für {{name}}',
          },
        },
        system: {},
      },
    ]),
  );
}

function validate(catalogs = createCatalogs(), overrides = {}) {
  return validateI18nCatalogs({
    catalogs,
    defaultLocale: 'en-GB',
    descriptorMap: { EXAMPLE: 'shared.example.title' },
    messageKeys: ['shared.example.count', 'shared.example.title'],
    namespaces,
    parameterContract: new Map([
      ['shared.example.count', ['count']],
      ['shared.example.title', ['name']],
    ]),
    requiredDescriptors: ['EXAMPLE'],
    supportedLocales: locales,
    ...overrides,
  });
}

test('accepts the repository locale, namespace, key, parameter, plural, and descriptor contract', async () => {
  const values = await checkI18n();
  assert.equal(values.localeCount, 3);
  assert.equal(values.namespaceCount, 7);
  assert.equal(values.messageCount, 2206);
  assert.equal(values.governedSourceCount, 40);
});

test('rejects pseudo locales and a different runtime fallback', () => {
  assert.throws(
    () => validate(undefined, { supportedLocales: [...locales, 'en-XA'] }),
    /allowlist/,
  );
  assert.throws(() => validate(undefined, { defaultLocale: 'de-DE' }), /runtime fallback/);
});

test('rejects missing keys and mismatched interpolation parameters', () => {
  const missing = createCatalogs();
  delete missing['de-DE'].shared.example.title;
  assert.throws(() => validate(missing), /key parity/);

  const mismatched = createCatalogs();
  mismatched['es-ES'].shared.example.title = 'Example for {{employee}}';
  assert.throws(() => validate(mismatched), /interpolation parameters/);
});

test('rejects missing, extra, and unknown descriptor mappings', () => {
  assert.throws(
    () => validate(undefined, { descriptorMap: {}, requiredDescriptors: ['EXAMPLE'] }),
    /Descriptor coverage/,
  );
  assert.throws(
    () =>
      validate(undefined, {
        descriptorMap: { EXAMPLE: 'shared.example.missing' },
        requiredDescriptors: ['EXAMPLE'],
      }),
    /does not map to a typed message key/,
  );
});

test('reads typed interpolation parameters and rejects source messages that omit them', () => {
  const contract = readMessageParameterContract(`
    export type MessageParameterMap = Readonly<{
      'shared.example.count': Readonly<{ count: number }>;
      'shared.example.title': Readonly<{ name: string }>;
    }>;
  `);
  assert.deepEqual(contract.get('shared.example.count'), ['count']);

  const catalogs = createCatalogs();
  for (const locale of locales) catalogs[locale].shared.example.title = 'Example';
  assert.throws(() => validate(catalogs), /Typed interpolation parameters/);
});

test('rejects incomplete locale plural forms and markup-bearing messages', () => {
  const incompletePlural = createCatalogs();
  delete incompletePlural['de-DE'].shared.example.count_one;
  assert.throws(() => validate(incompletePlural), /key parity|plural forms/);

  const markup = createCatalogs();
  markup['es-ES'].shared.example.title = '<strong>{{name}}</strong>';
  assert.throws(() => validate(markup), /text only/);

  const empty = createCatalogs();
  empty['de-DE'].shared.example.title = '   ';
  assert.throws(() => validate(empty), /must not be empty/);

  const bidiControl = createCatalogs();
  bidiControl['de-DE'].shared.example.title = 'Beispiel \u202e für {{name}}';
  assert.throws(() => validate(bidiControl), /bidi control/);
});

test('rejects a non-source catalog that is mostly copied source text', () => {
  const copied = createCatalogs();
  copied['de-DE'].shared.example = { ...copied['en-GB'].shared.example };
  assert.throws(() => validate(copied), /translation appears incomplete/);
});

test('detects governed visible and accessibility JSX literals', () => {
  assert.deepEqual(findHardCodedJsxCopy('export const A = () => <p />;'), []);
  assert.equal(findHardCodedJsxCopy('export const A = () => <p>Hello</p>;').length, 1);
  assert.equal(
    findHardCodedJsxCopy('export const A = () => <input aria-label="Search" />;').length,
    1,
  );
});
