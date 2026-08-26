import { useEffect, useId, useRef } from 'react';

import { SUPPORTED_LOCALES, type SupportedLocale } from '@workledger/contracts';

const LOCALE_LABELS = Object.freeze({
  'de-DE': 'Deutsch',
  'en-GB': 'English (UK)',
  'es-ES': 'Español',
}) satisfies Readonly<Record<SupportedLocale, string>>;

export function LanguageSelect({
  description,
  disabled = false,
  id: providedId,
  label,
  onChange,
  restoreFocusAfterDisabled = false,
  value,
}: Readonly<{
  description: string;
  disabled?: boolean;
  id?: string;
  label: string;
  onChange(locale: SupportedLocale): void;
  restoreFocusAfterDisabled?: boolean;
  value: SupportedLocale;
}>) {
  const generatedId = useId();
  const id = providedId ?? `workledger-language-${generatedId}`;
  const descriptionId = `${id}-description`;
  const selectRef = useRef<HTMLSelectElement>(null);
  const wasDisabled = useRef(disabled);

  useEffect(() => {
    const shouldRestoreFocus = restoreFocusAfterDisabled && wasDisabled.current && !disabled;
    wasDisabled.current = disabled;
    if (shouldRestoreFocus) selectRef.current?.focus({ preventScroll: true });
  }, [disabled, restoreFocusAfterDisabled]);

  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={descriptionId}
        className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
        disabled={disabled}
        id={id}
        ref={selectRef}
        value={value}
        onChange={(event) => onChange(event.target.value as SupportedLocale)}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} lang={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
      <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]" id={descriptionId}>
        {description}
      </p>
    </div>
  );
}
