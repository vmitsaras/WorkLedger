import { cva, type VariantProps } from 'class-variance-authority';
import {
  Button as ReactAriaButton,
  type ButtonProps as ReactAriaButtonProps,
} from 'react-aria-components';

export const buttonVariants = cva(
  [
    'wl-control inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg border px-4 py-2',
    'text-sm font-semibold leading-5 no-underline outline-none',
    'transition-[background-color,border-color,color,transform] duration-[var(--wl-motion-duration-fast)] ease-[var(--wl-motion-ease-standard)]',
    'data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-[var(--wl-focus-ring)]',
    'data-[pressed]:translate-y-px data-[disabled]:cursor-not-allowed data-[disabled]:opacity-55',
  ],
  {
    variants: {
      variant: {
        primary:
          'border-[var(--wl-action-primary)] bg-[var(--wl-action-primary)] text-[var(--wl-action-primary-text)] data-[hovered]:border-[var(--wl-action-primary-hover)] data-[hovered]:bg-[var(--wl-action-primary-hover)]',
        secondary:
          'border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] text-[var(--wl-text)] data-[hovered]:bg-[var(--wl-surface-subtle)]',
        quiet:
          'border-transparent bg-transparent text-[var(--wl-text)] data-[hovered]:bg-[var(--wl-surface-subtle)]',
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
