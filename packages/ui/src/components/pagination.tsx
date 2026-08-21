import { Button } from './button.js';

export interface PaginationProps {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageCount: number;
  summary?: string;
}

export function Pagination({ currentPage, onPageChange, pageCount, summary }: PaginationProps) {
  if (pageCount < 1) return null;
  return (
    <nav aria-label="Pagination" className="wl-pagination">
      <p className="wl-pagination__summary" aria-live="polite">
        {summary ?? `Page ${currentPage} of ${pageCount}`}
      </p>
      <div className="wl-pagination__actions">
        <Button
          isDisabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          variant="secondary"
        >
          Previous page
        </Button>
        <Button
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
