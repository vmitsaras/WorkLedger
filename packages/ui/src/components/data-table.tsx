import type { ReactNode, TableHTMLAttributes } from 'react';

export interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  caption: ReactNode;
  children: ReactNode;
}

export function DataTable({ caption, children, className, ...props }: DataTableProps) {
  return (
    <div className="wl-table-scroll" tabIndex={0}>
      <table {...props} className={['wl-data-table', className].filter(Boolean).join(' ')}>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
