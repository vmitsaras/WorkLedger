import { createContext, useContext, useLayoutEffect, type ReactNode } from 'react';
import { I18nProvider as ReactAriaI18nProvider } from 'react-aria';
import { I18nextProvider } from 'react-i18next';

import { type LocaleRuntime } from './locale-runtime.js';
import { type I18nRuntime } from './runtime.js';

const WorkLedgerI18nContext = createContext<I18nRuntime | null>(null);
const WorkLedgerLocaleContext = createContext<LocaleRuntime | null>(null);

export type WorkLedgerLocaleProviderProps = Readonly<{
  children: ReactNode;
  runtime: LocaleRuntime;
}>;

export type WorkLedgerI18nProviderProps = Readonly<{
  children: ReactNode;
  runtime: I18nRuntime;
}>;

export function synchronizeDocumentLocale(
  runtime: Pick<LocaleRuntime, 'direction' | 'locale'>,
  documentElement: HTMLElement = document.documentElement,
): void {
  documentElement.lang = runtime.locale;
  documentElement.dir = runtime.direction;
}

export function WorkLedgerLocaleProvider({ children, runtime }: WorkLedgerLocaleProviderProps) {
  useLayoutEffect(() => {
    synchronizeDocumentLocale(runtime);
  }, [runtime]);

  return (
    <WorkLedgerLocaleContext.Provider value={runtime}>
      <ReactAriaI18nProvider locale={runtime.locale}>{children}</ReactAriaI18nProvider>
    </WorkLedgerLocaleContext.Provider>
  );
}

export function WorkLedgerI18nProvider({ children, runtime }: WorkLedgerI18nProviderProps) {
  return (
    <WorkLedgerI18nContext.Provider value={runtime}>
      <I18nextProvider i18n={runtime.instance}>
        <WorkLedgerLocaleProvider runtime={runtime}>{children}</WorkLedgerLocaleProvider>
      </I18nextProvider>
    </WorkLedgerI18nContext.Provider>
  );
}

export function useWorkLedgerLocale(): LocaleRuntime {
  const runtime = useContext(WorkLedgerLocaleContext);
  if (runtime === null) {
    throw new Error('useWorkLedgerLocale must be used inside WorkLedgerLocaleProvider.');
  }
  return runtime;
}

export function useWorkLedgerI18n(): I18nRuntime {
  const runtime = useContext(WorkLedgerI18nContext);
  if (runtime === null) {
    throw new Error('useWorkLedgerI18n must be used inside WorkLedgerI18nProvider.');
  }
  return runtime;
}
