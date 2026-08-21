import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

export const statusBadgeVariants = cva('wl-status-badge', {
  variants: {
    tone: {
      neutral: 'wl-status-badge--neutral',
      info: 'wl-status-badge--info',
      success: 'wl-status-badge--success',
      warning: 'wl-status-badge--warning',
      danger: 'wl-status-badge--danger',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ children, className, tone }: StatusBadgeProps) {
  return <span className={statusBadgeVariants({ className, tone })}>{children}</span>;
}
