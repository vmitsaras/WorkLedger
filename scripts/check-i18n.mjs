import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from '@babel/parser';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractsLocalePath = path.join(repositoryRoot, 'packages/contracts/src/locales.ts');
const catalogContractPath = path.join(repositoryRoot, 'packages/i18n/src/catalog.ts');
const catalogRoot = path.join(repositoryRoot, 'packages/i18n/src/catalogs/locales');
const descriptorMapPath = path.join(
  repositoryRoot,
  'packages/i18n/src/catalogs/descriptor-map.json',
);
const governedSourcePaths = [
  path.join(repositoryRoot, 'packages/i18n/src/react.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/today-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/daily-time-breakdown.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/today-attendance-controls.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/today-attendance-overview.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/today-attendance-timeline.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/today-attention.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/my-time-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/daily-time-record-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/request-history-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/request-new-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/notifications-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/vacation-request-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/sickness-report-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/correction-request-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/request-detail-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/personal-calendar-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/routes/monthly-period-page.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/monthly-period-print.tsx'),
  path.join(repositoryRoot, 'apps/web/src/components/workflow-status-badge.tsx'),
];
const PLURAL_SUFFIX_PATTERN = /_(zero|one|two|few|many|other)$/u;
const INTERPOLATION_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu;
const SEMANTIC_KEY_PATTERN = /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*){2,}$/u;

function unwrapExpression(node) {
  if (
    node?.type === 'TSAsExpression' ||
    node?.type === 'TSSatisfiesExpression' ||
    node?.type === 'TypeCastExpression'
  ) {
    return unwrapExpression(node.expression);
  }
  return node;
}

export function readStringConstant(source, name) {
  const program = parse(source, { plugins: ['typescript'], sourceType: 'module' }).program;
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration') continue;
    const declaration = statement.declaration;
    if (declaration?.type !== 'VariableDeclaration') continue;
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.id.name !== name) continue;
      const value = unwrapExpression(declarator.init);
      if (value?.type !== 'StringLiteral') throw new Error(`${name} must be a string literal.`);
      return value.value;
    }
  }
  throw new Error(`Cannot find exported string constant ${name}.`);
}

export function readStringArrayConstant(source, name) {
  const program = parse(source, { plugins: ['typescript'], sourceType: 'module' }).program;
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration') continue;
    const declaration = statement.declaration;
    if (declaration?.type !== 'VariableDeclaration') continue;
    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.id.name !== name) continue;
      const value = unwrapExpression(declarator.init);
      if (value?.type !== 'ArrayExpression') throw new Error(`${name} must be an array literal.`);
      return value.elements.map((element) => {
        if (element?.type !== 'StringLiteral') {
          throw new Error(`${name} may contain only string literals.`);
        }
        return element.value;
      });
    }
  }
  throw new Error(`Cannot find exported string array constant ${name}.`);
}

function flattenCatalog(value, prefix = '', messages = new Map()) {
  if (typeof value === 'string') {
    messages.set(prefix, value);
    return messages;
  }
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`Catalog value ${prefix || '<root>'} must be text or an object.`);
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    flattenCatalog(nestedValue, prefix === '' ? key : `${prefix}.${key}`, messages);
  }
  return messages;
}

function interpolationParameters(message) {
  return [...message.matchAll(INTERPOLATION_PATTERN)].map((match) => match[1]).sort();
}

function normalizedMessageKey(key) {
  return key.replace(PLURAL_SUFFIX_PATTERN, '');
}

function assertSameValues(actual, expected, label) {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    throw new Error(`${label} mismatch: ${JSON.stringify(actualSorted)}.`);
  }
}

export function validateI18nCatalogs({
  catalogs,
  defaultLocale,
  descriptorMap,
  messageKeys,
  namespaces,
  supportedLocales,
}) {
  assertSameValues(supportedLocales, ['en-GB', 'de-DE', 'es-ES'], 'Production locale allowlist');
  if (defaultLocale !== 'en-GB') throw new Error('The only runtime fallback must be en-GB.');
  assertSameValues(
    namespaces,
    ['shared', 'auth', 'employee', 'manager', 'admin', 'system', 'output'],
    'Catalog namespace contract',
  );

  const flattenedByLocale = new Map();
  for (const locale of supportedLocales) {
    const catalog = catalogs[locale];
    if (catalog === undefined) throw new Error(`Catalog ${locale} is missing.`);
    assertSameValues(Object.keys(catalog), namespaces, `${locale} namespaces`);

    const flattened = new Map();
    for (const namespace of namespaces) {
      for (const [key, message] of flattenCatalog(catalog[namespace])) {
        const fullKey = `${namespace}.${key}`;
        if (/[<>]/u.test(message)) {
          throw new Error(`${locale} message ${fullKey} must remain text only.`);
        }
        flattened.set(fullKey, message);
      }
    }
    flattenedByLocale.set(locale, flattened);
  }

  const source = flattenedByLocale.get(defaultLocale);
  const sourceLeafKeys = [...source.keys()];
  const sourceMessageKeys = new Set(sourceLeafKeys.map(normalizedMessageKey));
  for (const key of sourceMessageKeys) {
    if (!SEMANTIC_KEY_PATTERN.test(key)) throw new Error(`Message key ${key} is not semantic.`);
  }
  assertSameValues(sourceMessageKeys, messageKeys, 'Typed message key contract');

  for (const locale of supportedLocales) {
    const messages = flattenedByLocale.get(locale);
    assertSameValues(
      new Set([...messages.keys()].map(normalizedMessageKey)),
      sourceMessageKeys,
      `${locale} catalog key parity`,
    );
    for (const baseKey of sourceMessageKeys) {
      const sourceVariants = sourceLeafKeys.filter((key) => normalizedMessageKey(key) === baseKey);
      const expectedParameters = interpolationParameters(source.get(sourceVariants[0]));
      for (const sourceVariant of sourceVariants) {
        assertSameValues(
          interpolationParameters(source.get(sourceVariant)),
          expectedParameters,
          `${defaultLocale} interpolation parameters for ${baseKey}`,
        );
      }
      for (const [key, message] of messages) {
        if (normalizedMessageKey(key) !== baseKey) continue;
        assertSameValues(
          interpolationParameters(message),
          expectedParameters,
          `${locale} interpolation parameters for ${baseKey}`,
        );
      }
    }

    const expectedPluralCategories = new Intl.PluralRules(locale).resolvedOptions()
      .pluralCategories;
    for (const baseKey of sourceMessageKeys) {
      const pluralLeaves = [...messages.keys()].filter(
        (key) => normalizedMessageKey(key) === baseKey && PLURAL_SUFFIX_PATTERN.test(key),
      );
      if (pluralLeaves.length === 0) continue;
      assertSameValues(
        pluralLeaves.map((key) => key.match(PLURAL_SUFFIX_PATTERN)?.[1]),
        expectedPluralCategories,
        `${locale} plural forms for ${baseKey}`,
      );
    }
  }

  for (const [descriptor, messageKey] of Object.entries(descriptorMap)) {
    if (typeof messageKey !== 'string' || !sourceMessageKeys.has(messageKey)) {
      throw new Error(`Descriptor ${descriptor} does not map to a typed message key.`);
    }
  }

  return {
    descriptorCount: Object.keys(descriptorMap).length,
    localeCount: supportedLocales.length,
    messageCount: sourceMessageKeys.size,
    namespaceCount: namespaces.length,
  };
}

export function findHardCodedJsxCopy(source, fileName = 'source.tsx') {
  const program = parse(source, {
    plugins: ['jsx', 'typescript'],
    sourceFilename: fileName,
    sourceType: 'module',
  });
  const findings = [];

  function visit(node) {
    if (node === null || typeof node !== 'object') return;
    if (node.type === 'JSXText' && /\S/u.test(node.value)) {
      findings.push({ file: fileName, line: node.loc?.start.line ?? 1 });
    }
    if (node.type === 'JSXAttribute' && node.name?.type === 'JSXIdentifier') {
      const governedAttribute = ['alt', 'aria-label', 'placeholder', 'title'].includes(
        node.name.name,
      );
      if (
        governedAttribute &&
        node.value?.type === 'StringLiteral' &&
        /\S/u.test(node.value.value)
      ) {
        findings.push({ file: fileName, line: node.loc?.start.line ?? 1 });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (['comments', 'errors', 'loc', 'tokens'].includes(key)) continue;
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else {
        visit(value);
      }
    }
  }

  visit(program);
  return findings;
}

export async function checkI18n(repositoryDirectory = repositoryRoot) {
  const contractsSource = await readFile(
    path.join(repositoryDirectory, path.relative(repositoryRoot, contractsLocalePath)),
    'utf8',
  );
  const catalogContractSource = await readFile(
    path.join(repositoryDirectory, path.relative(repositoryRoot, catalogContractPath)),
    'utf8',
  );
  const supportedLocales = readStringArrayConstant(contractsSource, 'SUPPORTED_LOCALES');
  const defaultLocale = readStringConstant(contractsSource, 'DEFAULT_LOCALE');
  const namespaces = readStringArrayConstant(catalogContractSource, 'CATALOG_NAMESPACES');
  const messageKeys = readStringArrayConstant(catalogContractSource, 'MESSAGE_KEYS');
  const actualCatalogRoot = path.join(
    repositoryDirectory,
    path.relative(repositoryRoot, catalogRoot),
  );
  const localeDirectories = (await readdir(actualCatalogRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assertSameValues(localeDirectories, supportedLocales, 'Catalog locale directories');

  const catalogs = {};
  for (const locale of supportedLocales) {
    catalogs[locale] = {};
    const localeDirectory = path.join(actualCatalogRoot, locale);
    const jsonFiles = (await readdir(localeDirectory)).filter((name) => name.endsWith('.json'));
    assertSameValues(
      jsonFiles.map((name) => name.slice(0, -'.json'.length)),
      namespaces,
      `${locale} namespace files`,
    );
    for (const namespace of namespaces) {
      catalogs[locale][namespace] = JSON.parse(
        await readFile(path.join(localeDirectory, `${namespace}.json`), 'utf8'),
      );
    }
  }

  const descriptorMap = JSON.parse(
    await readFile(
      path.join(repositoryDirectory, path.relative(repositoryRoot, descriptorMapPath)),
      'utf8',
    ),
  );
  const values = validateI18nCatalogs({
    catalogs,
    defaultLocale,
    descriptorMap,
    messageKeys,
    namespaces,
    supportedLocales,
  });

  const copyFindings = [];
  for (const sourcePath of governedSourcePaths) {
    const relativePath = path.relative(repositoryRoot, sourcePath);
    const source = await readFile(path.join(repositoryDirectory, relativePath), 'utf8');
    copyFindings.push(...findHardCodedJsxCopy(source, relativePath));
  }
  if (copyFindings.length > 0) {
    throw new Error(
      `Governed JSX contains hard-coded product copy: ${copyFindings
        .map(({ file, line }) => `${file}:${line}`)
        .join(', ')}.`,
    );
  }

  return { ...values, governedSourceCount: governedSourcePaths.length };
}

if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href
) {
  const values = await checkI18n();
  console.log(`Internationalization contract valid: ${JSON.stringify(values)}.`);
}
