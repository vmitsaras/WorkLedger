import type { ReactNode } from 'react';

import { type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
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

const OUTCOME_MESSAGE_KEYS = Object.freeze({
  DENIED: 'system.audit.explorer.outcome.denied',
  FAILURE: 'system.audit.explorer.outcome.failure',
  SUCCESS: 'system.audit.explorer.outcome.success',
} as const satisfies Readonly<Record<AuditEventView['outcome'], MessageKey>>);

const TARGET_KIND_MESSAGE_KEYS = Object.freeze({
  ABSENCE_REQUEST: 'system.audit.explorer.target.absenceRequest',
  ACCOUNT: 'system.audit.explorer.target.account',
  ASSIGNMENT: 'system.audit.explorer.target.assignment',
  ATTENDANCE: 'system.audit.explorer.target.attendance',
  AUTHENTICATION: 'system.audit.explorer.target.authentication',
  AUTHORIZATION: 'system.audit.explorer.target.authorization',
  BACKUP: 'system.audit.explorer.target.backup',
  CONFIGURATION: 'system.audit.explorer.target.configuration',
  CORRECTION_REQUEST: 'system.audit.explorer.target.correctionRequest',
  EMPLOYEE: 'system.audit.explorer.target.employee',
  EXPORT: 'system.audit.explorer.target.export',
  INVITATION: 'system.audit.explorer.target.invitation',
  LEAVE_ENTITLEMENT: 'system.audit.explorer.target.leaveEntitlement',
  MONTHLY_PERIOD: 'system.audit.explorer.target.monthlyPeriod',
  NOTIFICATION_DELIVERY: 'system.audit.explorer.target.notificationDelivery',
  OPERATIONS: 'system.audit.explorer.target.operations',
  RECOVERY: 'system.audit.explorer.target.recovery',
  SECRET: 'system.audit.explorer.target.secret',
  SESSION: 'system.audit.explorer.target.session',
  TEAM: 'system.audit.explorer.target.team',
  TIME_ACCOUNT: 'system.audit.explorer.target.timeAccount',
} as const satisfies Readonly<Record<string, MessageKey>>);

const FACT_MESSAGE_KEYS = Object.freeze({
  attendanceRevision: 'system.audit.explorer.fact.attendanceRevision',
  authenticationMethod: 'system.audit.explorer.fact.authenticationMethod',
  changedRole: 'system.audit.explorer.fact.changedRole',
  effectiveDate: 'system.audit.explorer.fact.effectiveDate',
  eventCount: 'system.audit.explorer.fact.eventCount',
  failureCategory: 'system.audit.explorer.fact.failureCategory',
  httpStatus: 'system.audit.explorer.fact.httpStatus',
  minutes: 'system.audit.explorer.fact.minutes',
  nextStatus: 'system.audit.explorer.fact.nextStatus',
  previousStatus: 'system.audit.explorer.fact.previousStatus',
  scope: 'system.audit.explorer.fact.scope',
  sessionReference: 'system.audit.explorer.fact.sessionReference',
  sourceCount: 'system.audit.explorer.fact.sourceCount',
  version: 'system.audit.explorer.fact.version',
} as const satisfies Readonly<Record<string, MessageKey>>);

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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();

  return (
    <>
      <FilterBar
        description={filterDescription}
        onSubmit={(event) => event.preventDefault()}
        title={filterTitle}
      >
        <AuditDateField
          id="audit-from"
          label={t('system.audit.explorer.filter.from')}
          value={query.from ?? ''}
          onChange={(value) => updateQuery({ from: value || undefined })}
        />
        <AuditDateField
          id="audit-to"
          label={t('system.audit.explorer.filter.to')}
          value={query.to ?? ''}
          onChange={(value) => updateQuery({ to: value || undefined })}
        />
        <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-outcome">
          {t('system.audit.explorer.filter.outcome')}
          <select
            id="audit-outcome"
            className="min-h-11 rounded-lg border px-3"
            value={query.outcome ?? ''}
            onChange={(event) => updateQuery({ outcome: event.target.value || undefined })}
          >
            <option value="">{t('system.audit.explorer.filter.outcomeAll')}</option>
            <option value="SUCCESS">{t('system.audit.explorer.outcome.success')}</option>
            <option value="DENIED">{t('system.audit.explorer.outcome.denied')}</option>
            <option value="FAILURE">{t('system.audit.explorer.outcome.failure')}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="audit-target">
          {t('system.audit.explorer.filter.target')}
          <select
            id="audit-target"
            className="min-h-11 rounded-lg border px-3"
            value={query.targetKind ?? ''}
            onChange={(event) => updateQuery({ targetKind: event.target.value || undefined })}
          >
            <option value="">{t('system.audit.explorer.filter.targetAll')}</option>
            {targetKinds.map((kind) => (
              <option key={kind} value={kind}>
                {targetKindLabel(kind, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-64 gap-2 text-sm font-semibold" htmlFor="audit-action">
          {t('system.audit.explorer.filter.action')}
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
              ? t('system.audit.explorer.loading.inline')
              : t('system.audit.explorer.results.count', { count: page.pagination.total })}
          </p>
        </div>
        {page === undefined ? (
          <RouteState kind="loading" title={t('system.audit.explorer.loading.title')}>
            {t('system.audit.explorer.loading.description')}
          </RouteState>
        ) : page.items.length === 0 ? (
          <RouteState kind="empty" title={t('system.audit.explorer.empty.title')}>
            {t('system.audit.explorer.empty.description')}
          </RouteState>
        ) : (
          <DataTable
            caption={caption}
            className="min-w-[48rem]"
            scrollHint={t('system.audit.explorer.table.scrollHint')}
            scrollLabel={scrollLabel}
          >
            <thead>
              <tr>
                <th scope="col">{t('system.audit.explorer.table.column.occurred')}</th>
                <th scope="col">{t('system.audit.explorer.table.column.action')}</th>
                <th scope="col">{t('system.audit.explorer.table.column.outcome')}</th>
                <th scope="col">{t('system.audit.explorer.table.column.target')}</th>
                <th scope="col">{t('system.audit.explorer.table.column.detail')}</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((event) => (
                <tr key={event.id}>
                  <td>{formatInstant(runtime.locale, event.occurredAt)}</td>
                  <td>
                    <code className="break-all">{event.action}</code>
                  </td>
                  <td>
                    <StatusBadge tone={outcomeTone(event.outcome)}>
                      {t(OUTCOME_MESSAGE_KEYS[event.outcome])}
                    </StatusBadge>
                  </td>
                  <td>{targetKindLabel(event.targetKind, t)}</td>
                  <td>
                    <details>
                      <summary>{t('system.audit.explorer.detail.summary')}</summary>
                      <dl className="grid gap-2 py-3 text-sm">
                        <AuditDetail label={t('system.audit.explorer.detail.actor')}>
                          {event.actor.kind === 'ACCOUNT'
                            ? actorLabel(event.actor.role, t)
                            : t('system.audit.explorer.actor.systemProcess', {
                                process:
                                  event.actor.process ?? t('system.audit.explorer.actor.unknown'),
                              })}
                        </AuditDetail>
                        <AuditDetail label={t('system.audit.explorer.detail.targetReference')}>
                          <code className="break-all">{event.targetReference}</code>
                        </AuditDetail>
                        <AuditDetail label={t('system.audit.explorer.detail.privileged')}>
                          {event.privileged
                            ? t('system.audit.explorer.boolean.yes')
                            : t('system.audit.explorer.boolean.no')}
                        </AuditDetail>
                        {event.reasonCode === null ? null : (
                          <AuditDetail label={t('system.audit.explorer.detail.reasonCode')}>
                            <code className="break-all">{event.reasonCode}</code>
                          </AuditDetail>
                        )}
                        {Object.keys(event.facts).length === 0 ? null : (
                          <AuditDetail label={t('system.audit.explorer.detail.safeFacts')}>
                            {factText(event.facts, t)}
                          </AuditDetail>
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
            ariaLabel={t('system.audit.explorer.pagination.label')}
            currentPage={query.page}
            onPageChange={(nextPage) => updateQuery({ page: String(nextPage) })}
            pageCount={page.pagination.totalPages}
            summary={t('system.audit.explorer.pagination.summary', {
              current: query.page,
              total: Math.max(1, page.pagination.totalPages),
            })}
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

function actorLabel(value: string | null | undefined, t: ReturnType<typeof useWorkLedgerMessage>) {
  if (value === 'EMPLOYEE') return t('shared.profile.role.employee');
  if (value === 'HR_ADMINISTRATOR') return t('shared.profile.role.hrAdministrator');
  if (value === 'MANAGER') return t('shared.profile.role.manager');
  if (value === 'SYSTEM_ADMINISTRATOR') return t('shared.profile.role.systemAdministrator');
  return t('system.audit.explorer.actor.account');
}

function targetKindLabel(value: string, t: ReturnType<typeof useWorkLedgerMessage>) {
  const key = TARGET_KIND_MESSAGE_KEYS[value as keyof typeof TARGET_KIND_MESSAGE_KEYS];
  return key === undefined ? humanize(value) : t(key);
}

function formatInstant(locale: string, value: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function factText(facts: object, t: ReturnType<typeof useWorkLedgerMessage>) {
  return Object.entries(facts)
    .map(([key, value]) => {
      const messageKey = FACT_MESSAGE_KEYS[key as keyof typeof FACT_MESSAGE_KEYS];
      const label = messageKey === undefined ? humanize(key) : t(messageKey);
      return `${label}: ${String(value)}`;
    })
    .join('; ');
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .toLocaleLowerCase('en-US')
    .replaceAll('_', ' ')
    .replace(/^./u, (character) => character.toUpperCase());
}

function outcomeTone(outcome: AuditEventView['outcome']): NonNullable<StatusBadgeProps['tone']> {
  if (outcome === 'SUCCESS') return 'success';
  if (outcome === 'DENIED') return 'warning';
  return 'danger';
}
