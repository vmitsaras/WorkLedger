import type { SupportedLocale } from '@workledger/contracts';

import { translate, type I18nRuntime } from './runtime.js';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

export function formatDateOnly(
  locale: SupportedLocale,
  localDate: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'full' },
): string {
  const match = ISO_DATE_PATTERN.exec(localDate);
  if (match === null) throw new RangeError('Expected an ISO date-only value.');

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) {
    throw new RangeError('Expected a valid ISO date-only value.');
  }

  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(value);
}

export function formatInstant(
  locale: SupportedLocale,
  instant: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
): string {
  const value = new Date(instant);
  if (Number.isNaN(value.valueOf())) throw new RangeError('Expected a valid event instant.');
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(value);
}

export function formatNumber(
  locale: SupportedLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatList(
  locale: SupportedLocale,
  values: readonly string[],
  options?: Intl.ListFormatOptions,
): string {
  return new Intl.ListFormat(locale, options).format(values);
}

export function formatDuration(
  runtime: I18nRuntime,
  minutes: number,
  showPositiveSign = false,
): string {
  if (!Number.isSafeInteger(minutes)) {
    throw new RangeError('A duration must use integer minutes.');
  }

  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainder = absoluteMinutes % 60;
  const parts = [
    translate(runtime, 'shared.duration.hours', { count: hours }),
    translate(runtime, 'shared.duration.minutes', { count: remainder }),
  ];
  const formatted = formatList(runtime.locale, parts, {
    style: 'long',
    type: 'conjunction',
  });
  const sign = minutes < 0 ? '−' : showPositiveSign && minutes > 0 ? '+' : '';
  return `${sign}${formatted}`;
}

export function formatCompactDuration(
  runtime: I18nRuntime,
  minutes: number,
  showPositiveSign = false,
): string {
  if (!Number.isSafeInteger(minutes)) {
    throw new RangeError('A duration must use integer minutes.');
  }

  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainder = absoluteMinutes % 60;
  const sign = minutes < 0 ? '−' : showPositiveSign && minutes > 0 ? '+' : '';
  return `${sign}${translate(runtime, 'shared.duration.compact', {
    hours: formatNumber(runtime.locale, hours),
    minutes: formatNumber(runtime.locale, remainder, {
      minimumIntegerDigits: 2,
      useGrouping: false,
    }),
  })}`;
}
