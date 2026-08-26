import { DEFAULT_LOCALE, type SupportedLocale } from '@workledger/contracts';
import { initializeLocale, resolveSignedOutLocale, type LocaleRuntime } from '@workledger/i18n';
import { synchronizeDocumentLocale, WorkLedgerLocaleProvider } from '@workledger/i18n/react';
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

export const DEVICE_LOCALE_STORAGE_KEY = 'workledger.locale';

type LocaleStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type WebLocaleController = Readonly<{
  activate(locale: SupportedLocale): Promise<LocaleRuntime>;
  activateSignedOut(): Promise<LocaleRuntime>;
  getRuntime(): LocaleRuntime;
  restore(runtime: LocaleRuntime): void;
  subscribe(listener: () => void): () => void;
}>;

export type WebLocaleContextValue = Readonly<{
  activateLocale(locale: SupportedLocale): Promise<LocaleRuntime>;
  activateSignedOutLocale(): Promise<LocaleRuntime>;
  restoreLocale(runtime: LocaleRuntime): void;
  runtime: LocaleRuntime;
}>;

const WebLocaleContext = createContext<WebLocaleContextValue | null>(null);

export function createWebLocaleController(initialRuntime: LocaleRuntime): WebLocaleController {
  let runtime = initialRuntime;
  let revision = 0;
  const listeners = new Set<() => void>();

  function commit(nextRuntime: LocaleRuntime): LocaleRuntime {
    runtime = nextRuntime;
    if (typeof document !== 'undefined') synchronizeDocumentLocale(runtime);
    for (const listener of listeners) listener();
    return runtime;
  }

  async function activate(locale: SupportedLocale): Promise<LocaleRuntime> {
    if (runtime.locale === locale) return runtime;
    const activationRevision = ++revision;
    const nextRuntime = await initializeLocale(locale);
    if (activationRevision !== revision) return runtime;
    return commit(nextRuntime);
  }

  return Object.freeze({
    activate,
    async activateSignedOut() {
      return activate(resolveDeviceLocale());
    },
    getRuntime() {
      return runtime;
    },
    restore(previousRuntime) {
      revision += 1;
      commit(previousRuntime);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export function resolveDeviceLocale(
  storage: LocaleStorage | null = browserStorage(),
  browserLanguages: readonly string[] = browserLocalePreferences(),
): SupportedLocale {
  let devicePreference: string | null | undefined;
  try {
    devicePreference = storage?.getItem(DEVICE_LOCALE_STORAGE_KEY);
  } catch {
    devicePreference = undefined;
  }

  const resolution = resolveSignedOutLocale({ browserLanguages, devicePreference });
  if (resolution.discardUnsupportedDevicePreference) {
    try {
      storage?.removeItem(DEVICE_LOCALE_STORAGE_KEY);
    } catch {
      // An unavailable device preference store must not block signed-out access.
    }
  }
  return resolution.locale;
}

export function saveDeviceLocale(
  locale: SupportedLocale,
  storage: LocaleStorage | null = browserStorage(),
): boolean {
  try {
    storage?.setItem(DEVICE_LOCALE_STORAGE_KEY, locale);
    return storage !== null;
  } catch {
    return false;
  }
}

export function LocaleControllerProvider({
  children,
  controller,
}: Readonly<{ children: ReactNode; controller: WebLocaleController }>) {
  const runtime = useSyncExternalStore(
    controller.subscribe,
    controller.getRuntime,
    controller.getRuntime,
  );
  const value = useMemo<WebLocaleContextValue>(
    () => ({
      activateLocale: controller.activate,
      activateSignedOutLocale: controller.activateSignedOut,
      restoreLocale: controller.restore,
      runtime,
    }),
    [controller, runtime],
  );

  return (
    <WebLocaleContext.Provider value={value}>
      <WorkLedgerLocaleProvider runtime={runtime}>{children}</WorkLedgerLocaleProvider>
    </WebLocaleContext.Provider>
  );
}

export function useOptionalWebLocale(): WebLocaleContextValue | null {
  return useContext(WebLocaleContext);
}

export function useWebLocale(): WebLocaleContextValue {
  const context = useOptionalWebLocale();
  if (context === null) {
    throw new Error('useWebLocale must be used inside LocaleControllerProvider.');
  }
  return context;
}

function browserStorage(): LocaleStorage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function browserLocalePreferences(): readonly string[] {
  if (typeof globalThis.navigator === 'undefined') return [DEFAULT_LOCALE];
  return globalThis.navigator.languages.length > 0
    ? globalThis.navigator.languages
    : [globalThis.navigator.language];
}
