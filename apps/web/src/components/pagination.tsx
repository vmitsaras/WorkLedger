import { translate } from '@workledger/i18n';
import { useOptionalWorkLedgerI18n } from '@workledger/i18n/react';
import {
  Pagination as UiPagination,
  type PaginationProps as UiPaginationProps,
} from '@workledger/ui';

export type PaginationProps = Omit<
  UiPaginationProps,
  'ariaLabel' | 'nextLabel' | 'previousLabel' | 'summary'
> &
  Readonly<{
    ariaLabel?: string;
    summary?: string;
  }>;

export function Pagination({
  ariaLabel,
  currentPage,
  pageCount,
  summary,
  ...props
}: PaginationProps) {
  const runtime = useOptionalWorkLedgerI18n();
  const paginationLabel =
    runtime === null ? 'Pagination' : translate(runtime, 'shared.pagination.label');
  const nextLabel = runtime === null ? 'Next page' : translate(runtime, 'shared.pagination.next');
  const previousLabel =
    runtime === null ? 'Previous page' : translate(runtime, 'shared.pagination.previous');
  return (
    <UiPagination
      {...props}
      ariaLabel={ariaLabel ?? paginationLabel}
      currentPage={currentPage}
      nextLabel={nextLabel}
      pageCount={pageCount}
      previousLabel={previousLabel}
      summary={
        summary ??
        (runtime === null
          ? `Page ${currentPage} of ${pageCount}`
          : translate(runtime, 'shared.pagination.summary', {
              current: currentPage,
              total: pageCount,
            }))
      }
    />
  );
}
