import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TableHTMLAttributes,
} from 'react';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement === null) return;

    const updateOverflow = () => {
      setIsOverflowing(scrollElement.scrollWidth - scrollElement.clientWidth > 1);
    };
    updateOverflow();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateOverflow);
      return () => window.removeEventListener('resize', updateOverflow);
    }

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(scrollElement);
    const table = scrollElement.querySelector('table');
    if (table !== null) observer.observe(table);
    return () => observer.disconnect();
  }, []);

  const isNamedOverflowRegion = isOverflowing && scrollLabel !== undefined;

  return (
    <div
      ref={scrollRef}
      aria-describedby={isOverflowing && scrollHint !== undefined ? hintId : undefined}
      aria-label={isNamedOverflowRegion ? scrollLabel : undefined}
      className="wl-table-scroll"
      data-overflowing={isOverflowing ? 'true' : undefined}
      role={isNamedOverflowRegion ? 'region' : undefined}
      tabIndex={isNamedOverflowRegion ? 0 : undefined}
    >
      {!isOverflowing || scrollHint === undefined ? null : (
        <p id={hintId} className="m-0 p-3 pb-0 text-sm text-[var(--wl-text-muted)]">
          {scrollHint}
        </p>
      )}
      <table {...props} className={['wl-data-table', className].filter(Boolean).join(' ')}>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
