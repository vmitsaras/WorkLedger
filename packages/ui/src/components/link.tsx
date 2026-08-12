import { cva, type VariantProps } from 'class-variance-authority';
import { Link as ReactAriaLink, type LinkProps as ReactAriaLinkProps } from 'react-aria-components';

export const linkVariants = cva(
  [
    'wl-link inline-flex min-h-6 min-w-6 items-center rounded-sm font-semibold text-[var(--wl-link)] underline decoration-2 underline-offset-4 outline-none',
    'transition-[color,text-decoration-thickness] duration-[var(--wl-motion-duration-fast)] ease-[var(--wl-motion-ease-standard)]',
    'data-[hovered]:text-[var(--wl-link-hover)] data-[hovered]:decoration-3',
    'data-[focus-visible]:outline-3 data-[focus-visible]:outline-solid data-[focus-visible]:outline-offset-3 data-[focus-visible]:outline-[var(--wl-focus-ring)]',
  ],
  {
    variants: {
      prominence: {
        default: '',
        quiet: 'font-medium text-[var(--wl-text-muted)]',
      },
    },
    defaultVariants: {
      prominence: 'default',
    },
  },
);

export interface LinkProps
  extends Omit<ReactAriaLinkProps, 'className' | 'href'>, VariantProps<typeof linkVariants> {
  className?: string;
  href: string;
}

export function Link({ className, prominence, ...props }: LinkProps) {
  return <ReactAriaLink {...props} className={linkVariants({ className, prominence })} />;
}
