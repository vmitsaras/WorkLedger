import type { ReactNode } from 'react';
import {
  FieldError,
  Input,
  Label,
  Text,
  TextField as ReactAriaTextField,
  type TextFieldProps as ReactAriaTextFieldProps,
} from 'react-aria-components';

export interface TextFieldProps extends Omit<ReactAriaTextFieldProps, 'children' | 'className'> {
  className?: string;
  description?: ReactNode;
  errorMessage?: ReactNode;
  label: ReactNode;
  placeholder?: string;
}

export function TextField({
  className,
  description,
  errorMessage,
  label,
  placeholder,
  ...props
}: TextFieldProps) {
  return (
    <ReactAriaTextField {...props} className={`wl-field grid gap-2 ${className ?? ''}`.trim()}>
      <Label className="text-sm font-semibold text-[var(--wl-text)]">{label}</Label>
      {description ? (
        <Text slot="description" className="text-sm leading-5 text-[var(--wl-text-muted)]">
          {description}
        </Text>
      ) : null}
      <Input
        {...(placeholder === undefined ? {} : { placeholder })}
        className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3 py-2 text-base text-[var(--wl-text)] outline-none placeholder:text-[var(--wl-text-muted)] data-[focus-visible]:outline-3 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-[var(--wl-focus-ring)] data-[invalid]:border-[var(--wl-danger)]"
      />
      <FieldError className="text-sm font-semibold text-[var(--wl-danger)]">
        {errorMessage}
      </FieldError>
    </ReactAriaTextField>
  );
}
