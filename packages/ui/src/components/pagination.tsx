import { Button } from './button.js';

export interface PaginationProps {
  ariaLabel: string;
  currentPage: number;
  nextFocusKey?: string;
  nextLabel: string;
  onPageChange: (page: number) => void;
  pageCount: number;
  previousFocusKey?: string;
  previousLabel: string;
  summary: string;
}

export function Pagination({
  ariaLabel,
  currentPage,
  nextFocusKey,
  nextLabel,
  onPageChange,
  pageCount,
  previousFocusKey,
  previousLabel,
  summary,
}: PaginationProps) {
  if (pageCount < 1) return null;
  return (
    <nav aria-label={ariaLabel} className="wl-pagination">
      <p className="wl-pagination__summary" aria-live="polite">
        {summary}
      </p>
      <div className="wl-pagination__actions">
        <Button
          data-route-focus-key={previousFocusKey}
          isDisabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          variant="secondary"
        >
          {previousLabel}
        </Button>
        <Button
          data-route-focus-key={nextFocusKey}
          isDisabled={currentPage >= pageCount}
          onPress={() => onPageChange(currentPage + 1)}
          variant="secondary"
        >
          {nextLabel}
        </Button>
      </div>
    </nav>
  );
}
