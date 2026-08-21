import { cva, type VariantProps } from 'class-variance-authority';
import { useId, type ReactNode } from 'react';

export const alertVariants = cva('wl-alert', {
  variants: {
    tone: {
      info: 'wl-alert--info',
      success: 'wl-alert--success',
      warning: 'wl-alert--warning',
      danger: 'wl-alert--danger',
    },
  },
  defaultVariants: { tone: 'info' },
});

export interface AlertProps extends VariantProps<typeof alertVariants> {
  children: ReactNode;
  className?: string;
  title: ReactNode;
}

export function Alert({ children, className, title, tone }: AlertProps) {
  const titleId = useId();
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
  return (
    <section aria-labelledby={titleId} className={alertVariants({ className, tone })} role={role}>
      <h2 id={titleId} className="wl-alert__title">
        {title}
      </h2>
      <div className="wl-alert__body">{children}</div>
    </section>
  );
}
