import { initializeI18n } from '@workledger/i18n';

import {
  createWebLocaleController,
  DEVICE_LOCALE_STORAGE_KEY,
  resolveDeviceLocale,
  saveDeviceLocale,
} from '../src/app/locale.js';

test('resolves and cleans signed-out device preferences without identity data', () => {
  const values = new Map<string, string>([[DEVICE_LOCALE_STORAGE_KEY, 'en-US']]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };

  expect(resolveDeviceLocale(storage, ['fr-FR', 'es-MX'])).toBe('es-ES');
  expect(values.has(DEVICE_LOCALE_STORAGE_KEY)).toBe(false);
  expect(saveDeviceLocale('de-DE', storage)).toBe(true);
  expect(values).toEqual(new Map([[DEVICE_LOCALE_STORAGE_KEY, 'de-DE']]));
});

test('treats unavailable device storage as a recoverable preference failure', () => {
  const storage = {
    getItem: () => {
      throw new DOMException('Unavailable', 'SecurityError');
    },
    removeItem: () => undefined,
    setItem: () => {
      throw new DOMException('Unavailable', 'SecurityError');
    },
  };

  expect(resolveDeviceLocale(storage, ['de-AT'])).toBe('de-DE');
  expect(saveDeviceLocale('es-ES', storage)).toBe(false);
});

test('commits and restores one locale runtime while preserving subscribers', async () => {
  const english = await initializeI18n('en-GB');
  const controller = createWebLocaleController(english);
  const listener = vi.fn();
  const unsubscribe = controller.subscribe(listener);

  await controller.activate('de-DE');
  expect(controller.getRuntime().locale).toBe('de-DE');
  expect(listener).toHaveBeenCalledTimes(1);

  controller.restore(english);
  expect(controller.getRuntime()).toBe(english);
  expect(listener).toHaveBeenCalledTimes(2);

  unsubscribe();
});
