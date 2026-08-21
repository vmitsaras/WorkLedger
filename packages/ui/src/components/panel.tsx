import type { HTMLAttributes, ReactNode } from 'react';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  density?: 'comfortable' | 'balanced' | 'compact';
  heading?: ReactNode;
  as?: 'article' | 'section';
}

export function Panel({
  as: Component = 'section',
  children,
  className,
  density = 'balanced',
  heading,
  ...props
}: PanelProps) {
  return (
    <Component
      {...props}
      className={['wl-panel', `wl-panel--${density}`, className].filter(Boolean).join(' ')}
    >
      {heading === undefined ? null : <div className="wl-panel__heading">{heading}</div>}
      {children}
    </Component>
  );
}
