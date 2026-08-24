import type { ReactNode, TableHTMLAttributes } from 'react';

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  caption: ReactNode;
  children: ReactNode;
  scrollHint?: ReactNode;
  scrollLabel?: string;
}

export function DataTable({
  caption,
  children,
  className,
  scrollHint,
  scrollLabel,
  ...props
}: DataTableProps) {
  return (
    <div
      aria-label={scrollLabel}
      className="wl-table-scroll"
      role={scrollLabel === undefined ? undefined : 'region'}
      tabIndex={0}
    >
      {scrollHint === undefined ? null : (
        <p className="m-0 p-3 pb-0 text-sm text-[var(--wl-text-muted)]">{scrollHint}</p>
      )}
      <table {...props} className={['wl-data-table', className].filter(Boolean).join(' ')}>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
