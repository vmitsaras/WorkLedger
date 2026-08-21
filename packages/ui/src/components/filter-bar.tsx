import type { FormHTMLAttributes, ReactNode } from 'react';

export interface FilterBarProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'title'> {
  children: ReactNode;
  description?: ReactNode;
  title?: ReactNode;
}

export function FilterBar({ children, className, description, title, ...props }: FilterBarProps) {
  return (
    <form
      {...props}
      aria-label={typeof title === 'string' ? title : props['aria-label']}
      className={['wl-filter-bar', className].filter(Boolean).join(' ')}
    >
      {title === undefined ? null : <h2 className="wl-filter-bar__title">{title}</h2>}
      {description === undefined ? null : (
        <p className="wl-filter-bar__description">{description}</p>
      )}
      <div className="wl-filter-bar__controls">{children}</div>
    </form>
  );
}
