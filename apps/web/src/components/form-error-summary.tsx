import type { RefObject } from 'react';

import { translate } from '@workledger/i18n';
import { useOptionalWorkLedgerI18n } from '@workledger/i18n/react';
import { Alert } from '@workledger/ui';

export interface FormErrorSummaryProps {
  fieldErrors: Readonly<Record<string, string>>;
  formError: string | undefined;
  summaryRef: RefObject<HTMLElement | null>;
}

export function FormErrorSummary({ fieldErrors, formError, summaryRef }: FormErrorSummaryProps) {
  const runtime = useOptionalWorkLedgerI18n();
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0 && formError === undefined) return null;

  return (
    <Alert
      className="outline-none"
      ref={summaryRef}
      tabIndex={-1}
      title={
        runtime === null
          ? 'There is a problem'
          : translate(runtime, 'shared.validation.problemTitle')
      }
      tone="danger"
    >
      {formError === undefined ? null : <p className="m-0 text-sm">{formError}</p>}
      {entries.length === 0 ? null : (
        <ul className="m-0 grid gap-1 pl-5 text-sm">
          {entries.map(([field, message]) => (
            <li key={field}>
              <a
                href={`#${field}`}
                onClick={(event) => {
                  event.preventDefault();
                  document.querySelector<HTMLElement>(`#${field}`)?.focus();
                }}
              >
                {message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Alert>
  );
}
