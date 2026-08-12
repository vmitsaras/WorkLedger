import type { ReactNode } from 'react';

export interface PageHeaderProps {
  children?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}

export function PageHeader({ children, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="wl-page-header grid gap-3">
      {eyebrow === undefined ? null : (
        <p className="m-0 text-sm font-bold uppercase tracking-[0.12em] text-[var(--wl-text-muted)]">
          {eyebrow}
        </p>
      )}
      <h1
        data-route-focus-key="route-heading"
        data-route-heading
        tabIndex={-1}
        className="m-0 max-w-3xl text-3xl font-bold tracking-[-0.025em] text-[var(--wl-text)] outline-none focus-visible:outline-solid sm:text-4xl"
      >
        {title}
      </h1>
      {description === undefined ? null : (
        <p className="m-0 max-w-2xl text-base leading-7 text-[var(--wl-text-muted)]">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}
