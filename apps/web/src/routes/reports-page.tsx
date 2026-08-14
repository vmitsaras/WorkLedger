import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import type { ReportCatalogItem } from '@workledger/contracts';
import { buttonVariants } from '@workledger/ui';

import { reportCatalogQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

export function ReportsPage() {
  const query = useQuery(reportCatalogQuery());

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Reports"
        description="Review time, balance, leave, record-quality, and approval information within your current permission scope. Every result states the scope applied."
      />
      {query.isPending ? (
        <p className="wl-alert m-0 rounded-xl border p-4" role="status">
          Loading available reports…
        </p>
      ) : query.isError || query.data === undefined ? (
        <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4" role="alert">
          <p className="m-0 font-semibold">Reports are unavailable right now.</p>
          <button
            className={buttonVariants({ variant: 'secondary' })}
            type="button"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        <section className="grid gap-4" aria-labelledby="available-reports-heading">
          <div>
            <h2 id="available-reports-heading" className="m-0 text-xl font-bold">
              Available reports
            </h2>
            <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
              The catalog only lists reports your current account may run.
            </p>
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2" role="list">
            {query.data.reports.map((report) => (
              <li key={report.key}>
                <ReportCard
                  report={report}
                  from={query.data.defaultRange.from}
                  to={query.data.defaultRange.to}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function ReportCard({
  from,
  report,
  to,
}: Readonly<{ from: string; report: ReportCatalogItem; to: string }>) {
  const search = new URLSearchParams({
    direction: 'ASC',
    from,
    limit: '20',
    page: '1',
    sort: report.defaultSort,
    to,
  });
  return (
    <article className="grid h-full content-between gap-5 rounded-2xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-5 shadow-sm">
      <div>
        <h3 className="m-0 text-lg font-bold">{report.title}</h3>
        <p className="m-0 mt-2 text-sm leading-6 text-[var(--wl-text-muted)]">
          {report.description}
        </p>
      </div>
      <Link
        className={buttonVariants({ variant: 'secondary' })}
        to={`/reports/${report.key}?${search.toString()}`}
      >
        Open {report.title.toLocaleLowerCase()}
      </Link>
    </article>
  );
}
