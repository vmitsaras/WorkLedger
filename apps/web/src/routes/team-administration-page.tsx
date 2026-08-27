import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import {
  teamAdminQuerySchema,
  type TeamAdminPage,
  type TeamAdminQuery,
} from '@workledger/contracts';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import {
  Alert,
  Button,
  DataTable,
  FilterBar,
  linkVariants,
  Panel,
  RouteState,
  StatusBadge,
  TextField,
} from '@workledger/ui';
import { Pagination } from '../components/pagination.js';

import {
  ApiClientError,
  createTeamForAdministration,
  setTeamStateForAdministration,
} from '../app/api-client.js';
import { teamAdminPageQuery } from '../app/query.js';
import { useWideAdministrationLayout } from '../app/use-wide-administration-layout.js';
import { PageHeader } from '../components/page-header.js';

type TeamOperation = Readonly<{ active?: boolean; teamId?: string }>;
type TeamItem = TeamAdminPage['items'][number];

export function TeamAdministrationPage() {
  const t = useWorkLedgerMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readTeamQuery(searchParams);
  const teamsQuery = useQuery(teamAdminPageQuery(query));
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(query.status);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const wideLayout = useWideAdministrationLayout();
  const mutation = useMutation({
    mutationFn: async (operation: TeamOperation) => {
      if (operation.teamId === undefined) return createTeamForAdministration({ name: name.trim() });
      return setTeamStateForAdministration(operation.teamId, operation.active ?? false);
    },
  });

  useEffect(() => setStatus(query.status), [query.status]);

  if (teamsQuery.isError) throw teamsQuery.error;

  async function run(operation: TeamOperation) {
    setMessage(undefined);
    if (operation.teamId === undefined && name.trim() === '') {
      setMessage({ kind: 'error', text: t('admin.team.validation.name') });
      document.querySelector<HTMLElement>('#new-team-name')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync(operation);
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['administration', 'teams'] });
      setMessage({ kind: 'success', text: t('admin.team.feedback.updated') });
    } catch (error) {
      setMessage({ kind: 'error', text: teamMutationError(error, t) });
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('admin.team.page.eyebrow')}
        title={t('shared.route.title.teams')}
        description={t('admin.team.page.description')}
      >
        <div className="flex flex-wrap gap-3">
          <a className={linkVariants({ prominence: 'default' })} href="#new-team-name">
            {t('admin.team.page.create')}
          </a>
          <Link className={linkVariants({ prominence: 'quiet' })} to="/employees">
            {t('admin.team.page.employeeDirectory')}
          </Link>
        </div>
      </PageHeader>

      <Panel className="grid gap-5" aria-labelledby="create-team-heading">
        <div>
          <h2 id="create-team-heading" className="m-0 text-xl font-bold">
            {t('admin.team.form.heading')}
          </h2>
          <p className="m-0 mt-2 max-w-3xl text-sm text-[var(--wl-text-muted)]">
            {t('admin.team.form.description')}
          </p>
        </div>
        {message === undefined ? null : (
          <Alert
            title={
              message.kind === 'error'
                ? t('admin.team.feedback.errorTitle')
                : t('admin.team.feedback.successTitle')
            }
            tone={message.kind === 'error' ? 'danger' : 'success'}
          >
            <p>{message.text}</p>
          </Alert>
        )}
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run({});
          }}
        >
          <TextField
            id="new-team-name"
            className="min-w-64 flex-[1_1_24rem]"
            description={t('admin.team.form.nameDescription')}
            label={t('admin.team.form.name')}
            name="team-name"
            value={name}
            onChange={setName}
          />
          <Button type="submit" isDisabled={mutation.isPending}>
            {mutation.isPending ? t('admin.team.form.pending') : t('admin.team.form.submit')}
          </Button>
        </form>
      </Panel>

      <FilterBar
        description={t('admin.team.filter.description')}
        title={t('admin.team.filter.title')}
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams({ limit: '20', page: '1', status });
        }}
      >
        <label className="grid gap-2 text-sm font-semibold" htmlFor="team-status-filter">
          {t('admin.team.filter.status')}
          <select
            id="team-status-filter"
            className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TeamAdminQuery['status'])}
          >
            <option value="ACTIVE">{t('admin.team.status.active')}</option>
            <option value="INACTIVE">{t('admin.team.status.inactive')}</option>
            <option value="ALL">{t('admin.team.filter.all')}</option>
          </select>
        </label>
        <Button type="submit" variant="secondary">
          {t('admin.team.filter.apply')}
        </Button>
      </FilterBar>

      {teamsQuery.isPending ? (
        <RouteState kind="loading" title={t('admin.team.loading.title')}>
          {t('admin.team.loading.description')}
        </RouteState>
      ) : teamsQuery.data.items.length === 0 ? (
        <RouteState kind="empty" title={t('admin.team.empty.title')}>
          {t('admin.team.empty.description')}
        </RouteState>
      ) : (
        <div className="grid gap-4">
          <p className="m-0 text-sm text-[var(--wl-text-muted)]" role="status" aria-live="polite">
            {t('admin.team.results.count', { count: teamsQuery.data.pagination.total })}
          </p>
          {wideLayout ? (
            <TeamDirectoryTable
              isPending={mutation.isPending}
              onAction={run}
              teams={teamsQuery.data}
            />
          ) : (
            <TeamDirectoryList
              isPending={mutation.isPending}
              onAction={run}
              teams={teamsQuery.data}
            />
          )}
        </div>
      )}

      {teamsQuery.data === undefined ? null : (
        <Pagination
          ariaLabel={t('admin.team.pagination.label')}
          currentPage={query.page}
          onPageChange={(page) =>
            setSearchParams({
              limit: query.limit.toString(),
              page: page.toString(),
              status: query.status,
            })
          }
          pageCount={teamsQuery.data.pagination.totalPages}
          summary={t('admin.team.pagination.summary', {
            count: teamsQuery.data.pagination.total,
            current: query.page,
            total: Math.max(1, teamsQuery.data.pagination.totalPages),
          })}
        />
      )}
    </section>
  );
}

function TeamDirectoryTable({
  isPending,
  onAction,
  teams,
}: Readonly<{
  isPending: boolean;
  onAction: (operation: TeamOperation) => Promise<void>;
  teams: TeamAdminPage;
}>) {
  const t = useWorkLedgerMessage();
  return (
    <DataTable
      caption={t('admin.team.results.caption')}
      className="min-w-[42rem]"
      scrollHint={t('admin.team.results.scrollHint')}
      scrollLabel={t('admin.team.results.scrollLabel')}
    >
      <thead>
        <tr>
          <th scope="col">{t('admin.team.column.team')}</th>
          <th scope="col">{t('admin.team.column.status')}</th>
          <th scope="col">{t('admin.team.column.members')}</th>
          <th scope="col">{t('admin.team.column.action')}</th>
        </tr>
      </thead>
      <tbody>
        {teams.items.map((team) => (
          <tr key={team.id}>
            <th scope="row" className="font-semibold">
              {team.name}
            </th>
            <td>
              <StatusBadge tone={team.active ? 'success' : 'neutral'}>
                {team.active ? t('admin.team.status.active') : t('admin.team.status.inactive')}
              </StatusBadge>
            </td>
            <td>{team.currentMemberCount}</td>
            <td>
              <TeamStateAction isPending={isPending} onAction={onAction} team={team} />
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function TeamDirectoryList({
  isPending,
  onAction,
  teams,
}: Readonly<{
  isPending: boolean;
  onAction: (operation: TeamOperation) => Promise<void>;
  teams: TeamAdminPage;
}>) {
  const t = useWorkLedgerMessage();
  return (
    <ol className="m-0 grid list-none gap-3 p-0" aria-label={t('admin.team.results.scrollLabel')}>
      {teams.items.map((team) => (
        <li key={team.id}>
          <Panel as="article" className="grid gap-3" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold">{team.name}</h2>
                <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                  {t('admin.team.results.members', { count: team.currentMemberCount })}
                </p>
              </div>
              <StatusBadge tone={team.active ? 'success' : 'neutral'}>
                {team.active ? t('admin.team.status.active') : t('admin.team.status.inactive')}
              </StatusBadge>
            </div>
            <TeamStateAction isPending={isPending} onAction={onAction} team={team} />
          </Panel>
        </li>
      ))}
    </ol>
  );
}

function TeamStateAction({
  isPending,
  onAction,
  team,
}: Readonly<{
  isPending: boolean;
  onAction: (operation: TeamOperation) => Promise<void>;
  team: TeamItem;
}>) {
  const t = useWorkLedgerMessage();
  const blocked = team.active && team.currentMemberCount > 0;
  return (
    <div className="grid max-w-sm justify-items-start gap-2">
      <Button
        {...(blocked ? { 'aria-describedby': `team-${team.id}-deactivation-reason` } : {})}
        variant="quiet"
        isDisabled={isPending || blocked}
        onPress={() => void onAction({ active: !team.active, teamId: team.id })}
      >
        {team.active
          ? t('admin.team.action.deactivate', { team: team.name })
          : t('admin.team.action.activate', { team: team.name })}
      </Button>
      {blocked ? (
        <p
          id={`team-${team.id}-deactivation-reason`}
          className="m-0 text-sm text-[var(--wl-text-muted)]"
        >
          {t('admin.team.action.blocked')}
        </p>
      ) : null}
    </div>
  );
}

function readTeamQuery(searchParams: URLSearchParams): TeamAdminQuery {
  const parsed = teamAdminQuerySchema.safeParse(Object.fromEntries(searchParams));
  return parsed.success ? parsed.data : { limit: 20, page: 1, status: 'ACTIVE' };
}

function teamMutationError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ACCESS_DENIED') return t('admin.team.error.accessDenied');
    if (error.code === 'TEAM_NAME_ALREADY_EXISTS') return t('admin.team.error.nameExists');
    if (error.code === 'TEAM_STATE_CONFLICT') return t('admin.team.error.stateConflict');
  }
  return t('admin.team.error.generic');
}
