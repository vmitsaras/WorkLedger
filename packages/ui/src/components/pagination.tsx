import { Button } from './button.js';

export interface PaginationProps {
  ariaLabel?: string;
  currentPage: number;
  nextFocusKey?: string;
  onPageChange: (page: number) => void;
  pageCount: number;
  previousFocusKey?: string;
  summary?: string;
}

export function Pagination({
  ariaLabel = 'Pagination',
  currentPage,
  nextFocusKey,
  onPageChange,
  pageCount,
  previousFocusKey,
  summary,
}: PaginationProps) {
  if (pageCount < 1) return null;
  return (
    <nav aria-label={ariaLabel} className="wl-pagination">
      <p className="wl-pagination__summary" aria-live="polite">
        {summary ?? `Page ${currentPage} of ${pageCount}`}
      </p>
      <div className="wl-pagination__actions">
        <Button
          data-route-focus-key={previousFocusKey}
          isDisabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          variant="secondary"
        >
          Previous page
        </Button>
        <Button
          data-route-focus-key={nextFocusKey}
          isDisabled={currentPage >= pageCount}
          onPress={() => onPageChange(currentPage + 1)}
          variant="secondary"
        >
          Next page
        </Button>
      </div>
    </nav>
  );
}
