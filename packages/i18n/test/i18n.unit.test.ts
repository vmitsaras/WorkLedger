import {
  UnsupportedLocaleError,
  formatDateOnly,
  formatDuration,
  formatInstant,
  initializeI18n,
  loadCatalog,
  matchBrowserLocale,
  requireSupportedLocale,
  resolveSignedOutLocale,
  translate,
} from '../src/index.js';

test('resolves an allowlisted device preference before browser languages', () => {
  expect(
    resolveSignedOutLocale({
      browserLanguages: ['es-MX', 'en-US'],
      devicePreference: 'de-DE',
    }),
  ).toEqual({
    discardUnsupportedDevicePreference: false,
    locale: 'de-DE',
    source: 'device',
  });
});

test('discards an unsupported device value and matches the first supported browser language', () => {
  expect(
    resolveSignedOutLocale({
      browserLanguages: ['fr-FR', 'es-MX', 'de-AT'],
      devicePreference: 'en-XA',
    }),
  ).toEqual({
    discardUnsupportedDevicePreference: true,
    locale: 'es-ES',
    source: 'browser',
  });
  expect(matchBrowserLocale('en-US')).toBe('en-GB');
  expect(matchBrowserLocale('de-AT')).toBe('de-DE');
  expect(matchBrowserLocale('es-419')).toBe('es-ES');
  expect(matchBrowserLocale('not a locale')).toBeNull();
});

test('uses British English when no signed-out preference matches', () => {
  expect(resolveSignedOutLocale({ browserLanguages: ['fr-FR', 'ar-EG'] })).toEqual({
    discardUnsupportedDevicePreference: false,
    locale: 'en-GB',
    source: 'fallback',
  });
});

test('treats an unsupported account locale and a pseudo locale as integrity failures', () => {
  expect(() => requireSupportedLocale('en-XA')).toThrow(UnsupportedLocaleError);
  expect(() => requireSupportedLocale('en-US')).toThrow(UnsupportedLocaleError);
  expect(() => requireSupportedLocale(null)).toThrow(UnsupportedLocaleError);
});

test('loads one requested local catalog with every production namespace', async () => {
  const catalog = await loadCatalog('de-DE');
  expect(catalog.locale).toBe('de-DE');
  expect(Object.keys(catalog.resources).sort()).toEqual([
    'admin',
    'auth',
    'employee',
    'manager',
    'output',
    'shared',
    'system',
  ]);
});

test('initializes a typed plain-text runtime with British English fallback configured', async () => {
  const runtime = await initializeI18n('es-ES');
  expect(runtime.locale).toBe('es-ES');
  expect(runtime.direction).toBe('ltr');
  expect(runtime.instance.options.fallbackLng).toEqual(['en-GB']);
  expect(translate(runtime, 'shared.i18n.initializing')).toBe(
    'Cargando la configuración de idioma…',
  );
  expect(translate(runtime, 'shared.i18n.greeting', { name: '<img src=x onerror=alert(1)>' })).toBe(
    'Hola, <img src=x onerror=alert(1)>.',
  );
});

test('formats dates with explicit locale and authoritative timezone inputs', () => {
  expect(formatDateOnly('en-GB', '2026-08-26', { dateStyle: 'long' })).toBe('26 August 2026');
  expect(formatDateOnly('de-DE', '2026-08-26', { dateStyle: 'long' })).toBe('26. August 2026');
  expect(
    formatInstant('en-GB', '2026-10-25T01:30:00Z', 'Europe/Berlin', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'shortOffset',
    }),
  ).toMatch(/02:30 GMT\+1/u);
  expect(() => formatDateOnly('en-GB', '2026-02-30')).toThrow(RangeError);
});

test('formats integer-minute durations through locale plural messages', async () => {
  const english = await initializeI18n('en-GB');
  const german = await initializeI18n('de-DE');
  expect(formatDuration(english, 61)).toBe('1 hour and 1 minute');
  expect(formatDuration(english, -120)).toBe('−2 hours and 0 minutes');
  expect(formatDuration(german, 122, true)).toBe('+2 Stunden und 2 Minuten');
  expect(() => formatDuration(english, 1.5)).toThrow(RangeError);
});
