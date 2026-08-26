import type { ReactNode } from 'react';

import {
  DataTable,
  FilterBar,
  Panel,
  RouteState,
  StatusBadge,
  type StatusBadgeProps,
} from '@workledger/ui';
import { Pagination } from './pagination.js';

export interface AuditExplorerQuery {
  action?: string | undefined;
  from?: string | undefined;
  limit: number;
  outcome?: 'SUCCESS' | 'DENIED' | 'FAILURE' | undefined;
  page: number;
  targetKind?: string | undefined;
  to?: string | undefined;
}

interface AuditActorView {
  kind: 'ACCOUNT' | 'SYSTEM';
  process?: string;
  role?: string | null;
}

interface AuditEventView {
  action: string;
  actor: AuditActorView;
  facts: object;
  id: string;
  occurredAt: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  privileged: boolean;
  reasonCode: string | null;
  targetKind: string;
  targetReference: string;
}

interface AuditPageView {
  items: readonly AuditEventView[];
  pagination: Readonly<{
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  }>;
}

interface AuditEventExplorerProps {
  caption: string;
  filterDescription: ReactNode;
  filterTitle: string;
  page: AuditPageView | undefined;
  query: AuditExplorerQuery;
  resultsTitle: string;
  scrollLabel: string;
  targetKinds: readonly string[];
  updateQuery: (values: Partial<Record<keyof AuditExplorerQuery, string | undefined>>) => void;
}

export function AuditEventExplorer({
  caption,
  filterDescription,
  filterTitle,
  page,
  query,
  resultsTitle,
  scrollLabel,
  targetKinds,
  updateQuery,
}: AuditEventExplorerProps) {
  return (
    <>
      <FilterBar
        description={filterDescription}
        onSubmit={(event) => event.preventDefault()}
        title={filterTitle}
      >
        <AuditDateField
          id="audit-from"
          label="From date"
          value={query.from ?? ''}
          onChange={(value) => updateQuery({ from: value || undefined })}
        />
        <AuditDateField
          id="audit-to"
          label="To date"
          value={query.to ?? ''}
          onChange={(value) => updateQuery({ to: value || undefined })}
        />
        <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-outcome">
          Outcome
          <select
            id="audit-outcome"
            className="min-h-11 rounded-lg border px-3"
            value={query.outcome ?? ''}
            onChange={(event) => updateQuery({ outcome: event.target.value || undefined })}
          >
            <option value="">All outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="DENIED">Denied</option>
            <option value="FAILURE">Failure</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-target">
          Target type
          <select
            id="audit-target"
            className="min-h-11 rounded-lg border px-3"
            value={query.targetKind ?? ''}
            onChange={(event) => updateQuery({ targetKind: event.target.value || undefined })}
          >
            <option value="">All target types</option>
            {targetKinds.map((kind) => (
              <option key={kind} value={kind}>
                {auditLabel(kind)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-64 gap-2 text-sm font-semibold" htmlFor="audit-action">
          Exact action code
          <input
            id="audit-action"
            className="min-h-11 rounded-lg border px-3"
            pattern="[A-Z][A-Z0-9_]*"
            value={query.action ?? ''}
            onChange={(event) =>
              updateQuery({ action: event.target.value.toUpperCase() || undefined })
            }
          />
        </label>
      </FilterBar>

      <Panel aria-labelledby="audit-results" className="grid gap-4">
        <div>
          <h2 id="audit-results" className="m-0 text-2xl font-bold">
            {resultsTitle}
          </h2>
          <p className="mb-0 text-sm text-[var(--wl-text-muted)]" role="status">
            {page === undefined
              ? 'Loading audit events…'
              : `${page.pagination.total} events found.`}
          </p>
        </div>
        {page === undefined ? (
          <RouteState kind="loading" title="Loading information">
            Audit evidence is being retrieved.
          </RouteState>
        ) : page.items.length === 0 ? (
          <RouteState kind="empty" title="No matching audit events">
            Change or clear the filters to review a wider time range.
          </RouteState>
        ) : (
          <DataTable
            caption={caption}
            className="min-w-[48rem]"
            scrollHint="On narrow screens, scroll this results region horizontally to compare every column."
            scrollLabel={scrollLabel}
          >
            <thead>
              <tr>
                <th scope="col">Occurred</th>
                <th scope="col">Action</th>
                <th scope="col">Outcome</th>
                <th scope="col">Target</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((event) => (
                <tr key={event.id}>
                  <td>{formatInstant(event.occurredAt)}</td>
                  <td>
                    <code className="break-all">{event.action}</code>
                  </td>
                  <td>
                    <StatusBadge tone={outcomeTone(event.outcome)}>
                      {auditLabel(event.outcome)}
                    </StatusBadge>
                  </td>
                  <td>{auditLabel(event.targetKind)}</td>
                  <td>
                    <details>
                      <summary>View redacted detail</summary>
                      <dl className="grid gap-2 py-3 text-sm">
                        <AuditDetail label="Actor">
                          {event.actor.kind === 'ACCOUNT'
                            ? auditLabel(event.actor.role ?? 'ACCOUNT')
                            : `System process ${event.actor.process ?? 'unknown'}`}
                        </AuditDetail>
                        <AuditDetail label="Target reference">
                          <code className="break-all">{event.targetReference}</code>
                        </AuditDetail>
                        <AuditDetail label="Privileged action">
                          {event.privileged ? 'Yes' : 'No'}
                        </AuditDetail>
                        {event.reasonCode === null ? null : (
                          <AuditDetail label="Reason code">
                            <code className="break-all">{event.reasonCode}</code>
                          </AuditDetail>
                        )}
                        {Object.keys(event.facts).length === 0 ? null : (
                          <AuditDetail label="Safe facts">{factText(event.facts)}</AuditDetail>
                        )}
                      </dl>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
        {page === undefined ? null : (
          <Pagination
            ariaLabel="Audit pagination"
            currentPage={query.page}
            onPageChange={(nextPage) => updateQuery({ page: String(nextPage) })}
            pageCount={page.pagination.totalPages}
            summary={`Page ${query.page} of ${Math.max(1, page.pagination.totalPages)}`}
          />
        )}
      </Panel>
    </>
  );
}

function AuditDateField({
  id,
  label,
  onChange,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        type="date"
        className="min-h-11 rounded-lg border px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AuditDetail({ children, label }: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function auditLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .toLocaleLowerCase('en-US')
    .replaceAll('_', ' ')
    .replace(/^./u, (character) => character.toUpperCase());
}

function formatInstant(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function factText(facts: object) {
  return Object.entries(facts)
    .map(([key, value]) => `${auditLabel(key)}: ${String(value)}`)
    .join('; ');
}

function outcomeTone(outcome: AuditEventView['outcome']): NonNullable<StatusBadgeProps['tone']> {
  if (outcome === 'SUCCESS') return 'success';
  if (outcome === 'DENIED') return 'warning';
  return 'danger';
}
