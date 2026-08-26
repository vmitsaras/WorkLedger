import { render, screen } from '@testing-library/react';
import { useLocale } from 'react-aria';
import { useTranslation } from 'react-i18next';

import { initializeI18n, initializeLocale, translate } from '../src/index.js';
import {
  WorkLedgerI18nProvider,
  WorkLedgerLocaleProvider,
  synchronizeDocumentLocale,
  useWorkLedgerI18n,
  useWorkLedgerLocale,
} from '../src/react.js';

test('boots React Aria with one locale before translated workflows are activated', async () => {
  const runtime = await initializeLocale('es-ES');

  render(
    <WorkLedgerLocaleProvider runtime={runtime}>
      <LocaleBootstrapProbe />
    </WorkLedgerLocaleProvider>,
  );

  expect(document.documentElement.lang).toBe('es-ES');
  expect(document.documentElement.dir).toBe('ltr');
  expect(screen.getByText('es-ES|es-ES')).toBeVisible();
});

test('keeps product translation, React Aria, lang, and direction on one locale', async () => {
  const runtime = await initializeI18n('de-DE');
  synchronizeDocumentLocale(runtime);

  render(
    <WorkLedgerI18nProvider runtime={runtime}>
      <LocaleProbe />
    </WorkLedgerI18nProvider>,
  );

  expect(document.documentElement.lang).toBe('de-DE');
  expect(document.documentElement.dir).toBe('ltr');
  expect(screen.getByText('de-DE|de-DE|Spracheinstellungen werden geladen…')).toBeVisible();
});

test('renders interpolated user text as text rather than executable markup', async () => {
  const runtime = await initializeI18n('en-GB');
  render(
    <WorkLedgerI18nProvider runtime={runtime}>
      <p>{translate(runtime, 'shared.i18n.greeting', { name: '<img src=x>' })}</p>
    </WorkLedgerI18nProvider>,
  );

  expect(screen.getByText('Hello, <img src=x>.')).toBeVisible();
  expect(document.querySelector('img')).toBeNull();
});

function LocaleProbe() {
  const runtime = useWorkLedgerI18n();
  const ariaLocale = useLocale();
  const { t } = useTranslation('shared');
  return <p>{`${runtime.locale}|${ariaLocale.locale}|${t('i18n.initializing')}`}</p>;
}

function LocaleBootstrapProbe() {
  const runtime = useWorkLedgerLocale();
  const ariaLocale = useLocale();
  return <p>{`${runtime.locale}|${ariaLocale.locale}`}</p>;
}
