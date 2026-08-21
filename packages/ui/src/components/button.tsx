import { cva, type VariantProps } from 'class-variance-authority';
import {
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps,
} from 'react-aria-components';

export const buttonVariants = cva(
  [
    'wl-control inline-flex min-h-[var(--wl-control-min-block-size)] min-w-[var(--wl-control-min-inline-size)] items-center justify-center gap-2 rounded-[var(--wl-radius-control)] border px-[var(--wl-control-padding-inline)] py-[var(--wl-control-padding-block)]',
    'text-sm font-semibold leading-5 no-underline outline-none',
    'transition-[background-color,border-color,color,transform] duration-[var(--wl-motion-duration-fast)] ease-[var(--wl-motion-ease-standard)]',
    'focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-3 focus-visible:outline-[var(--wl-focus-ring)]',
    'data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-[var(--wl-focus-ring)]',
    'data-[pressed]:translate-y-px data-[disabled]:cursor-not-allowed data-[disabled]:opacity-[var(--wl-control-disabled-opacity)]',
  ],
  {
    variants: {
      variant: {
        primary:
          'border-[var(--wl-action-primary)] bg-[var(--wl-action-primary)] text-[var(--wl-action-primary-text)] data-[hovered]:border-[var(--wl-action-primary-hover)] data-[hovered]:bg-[var(--wl-action-primary-hover)] data-[pressed]:border-[var(--wl-action-primary-active)] data-[pressed]:bg-[var(--wl-action-primary-active)]',
        secondary:
          'border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] text-[var(--wl-text)] data-[hovered]:border-[var(--wl-action-primary)] data-[hovered]:bg-[var(--wl-surface-subtle)]',
        quiet:
          'border-transparent bg-transparent text-[var(--wl-text)] data-[hovered]:bg-[var(--wl-surface-subtle)]',
        danger:
          'border-[var(--wl-state-danger-border)] bg-[var(--wl-state-danger-surface)] text-[var(--wl-state-danger-text)] data-[hovered]:border-[var(--wl-state-danger-text)] data-[hovered]:bg-[var(--wl-surface-raised)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

export interface ButtonProps
  extends Omit<ReactAriaButtonProps, 'className'>, VariantProps<typeof buttonVariants> {
  className?: string;
}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <ReactAriaButton {...props} className={buttonVariants({ className, variant })} />;
}
