import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react';

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

export interface AlertProps
  extends
    VariantProps<typeof alertVariants>,
    Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'title'> {
  announce?: boolean;
  children: ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3';
  title: ReactNode;
}

export const Alert = forwardRef<HTMLElement, AlertProps>(function Alert(
  { announce = true, children, className, headingLevel: Heading = 'h2', title, tone, ...props },
  ref,
) {
  const titleId = useId();
  const role =
    announce === false ? undefined : tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={alertVariants({ className, tone })}
      ref={ref}
      role={role}
    >
      <Heading id={titleId} className="wl-alert__title">
        {title}
      </Heading>
      <div className="wl-alert__body">{children}</div>
    </section>
  );
});
