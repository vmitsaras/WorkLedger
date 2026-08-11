import type { RefObject } from 'react';

export interface FormErrorSummaryProps {
  fieldErrors: Readonly<Record<string, string>>;
  formError: string | undefined;
  summaryRef: RefObject<HTMLDivElement | null>;
}

export function FormErrorSummary({ fieldErrors, formError, summaryRef }: FormErrorSummaryProps) {
  const entries = Object.entries(fieldErrors);
  if (entries.length === 0 && formError === undefined) return null;

  return (
    <div
      ref={summaryRef}
      role="alert"
      tabIndex={-1}
      className="wl-alert wl-alert-error grid gap-2 rounded-xl border p-4 outline-none"
    >
      <h2 className="m-0 text-base font-bold">There is a problem</h2>
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
    </div>
  );
}
