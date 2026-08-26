import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';

import {
  teamAdminQuerySchema,
  type TeamAdminPage,
  type TeamAdminQuery,
} from '@workledger/contracts';
import {
  Alert,
  Button,
  DataTable,
  FilterBar,
  linkVariants,
  Pagination,
  Panel,
  RouteState,
  StatusBadge,
  TextField,
} from '@workledger/ui';

import {
  ApiClientError,
  createTeamForAdministration,
  setTeamStateForAdministration,
} from '../app/api-client.js';
import { teamAdminPageQuery } from '../app/query.js';
import { canonicalRouteLabel } from '../app/route-copy.js';
import { useWideAdministrationLayout } from '../app/use-wide-administration-layout.js';
import { PageHeader } from '../components/page-header.js';

type TeamOperation = Readonly<{ active?: boolean; teamId?: string }>;
type TeamItem = TeamAdminPage['items'][number];

export function TeamAdministrationPage() {
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
      setMessage({ kind: 'error', text: 'Enter a team name.' });
      document.querySelector<HTMLElement>('#new-team-name')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync(operation);
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['administration', 'teams'] });
      setMessage({ kind: 'success', text: 'The team catalog was updated.' });
    } catch (error) {
      setMessage({ kind: 'error', text: teamMutationError(error) });
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="People administration"
        title={canonicalRouteLabel('/teams')}
        description="Create and maintain orientation teams used to organize employee records. Manager access still follows direct-manager assignments."
      >
        <div className="flex flex-wrap gap-3">
          <a className={linkVariants({ prominence: 'default' })} href="#new-team-name">
            Create team
          </a>
          <Link className={linkVariants({ prominence: 'quiet' })} to="/employees">
            Employee directory
          </Link>
        </div>
      </PageHeader>

      <Panel className="grid gap-5" aria-labelledby="create-team-heading">
        <div>
          <h2 id="create-team-heading" className="m-0 text-xl font-bold">
            Add an orientation team
          </h2>
          <p className="m-0 mt-2 max-w-3xl text-sm text-[var(--wl-text-muted)]">
            Creating a team does not assign employees or change reporting access. Assign membership
            from an employee record after the team exists.
          </p>
        </div>
        {message === undefined ? null : (
          <Alert
            title={message.kind === 'error' ? 'Team update failed' : 'Team catalog updated'}
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
            description="Use the name employees and managers recognize in daily work."
            label="Team name"
            name="team-name"
            value={name}
            onChange={setName}
          />
          <Button type="submit" isDisabled={mutation.isPending}>
            {mutation.isPending ? 'Updating…' : 'Create team'}
          </Button>
        </form>
      </Panel>

      <FilterBar
        description="Show teams available for new assignments, inactive historical teams, or the complete catalog."
        title="Filter team catalog"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams({ limit: '20', page: '1', status });
        }}
      >
        <label className="grid gap-2 text-sm font-semibold" htmlFor="team-status-filter">
          Team status
          <select
            id="team-status-filter"
            className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TeamAdminQuery['status'])}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All teams</option>
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Apply filter
        </Button>
      </FilterBar>

      {teamsQuery.isPending ? (
        <RouteState kind="loading">Team records are being retrieved.</RouteState>
      ) : teamsQuery.data.items.length === 0 ? (
        <RouteState kind="empty" title="No teams in this view">
          Change the team status or create a team for a new orientation group.
        </RouteState>
      ) : (
        <div className="grid gap-4">
          <p className="m-0 text-sm text-[var(--wl-text-muted)]" role="status" aria-live="polite">
            {teamsQuery.data.pagination.total}{' '}
            {teamsQuery.data.pagination.total === 1 ? 'team' : 'teams'} in this result.
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
          ariaLabel="Team result pages"
          currentPage={query.page}
          onPageChange={(page) =>
            setSearchParams({
              limit: query.limit.toString(),
              page: page.toString(),
              status: query.status,
            })
          }
          pageCount={teamsQuery.data.pagination.totalPages}
          summary={`Page ${query.page} of ${Math.max(1, teamsQuery.data.pagination.totalPages)}. ${teamsQuery.data.pagination.total} teams.`}
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
  return (
    <DataTable
      caption="Teams matching the selected team status"
      className="min-w-[42rem]"
      scrollHint="Scroll horizontally if every team comparison column does not fit."
      scrollLabel="Team catalog results"
    >
      <thead>
        <tr>
          <th scope="col">Team</th>
          <th scope="col">Status</th>
          <th scope="col">Current members</th>
          <th scope="col">Action</th>
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
                {team.active ? 'Active' : 'Inactive'}
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
  return (
    <ol className="m-0 grid list-none gap-3 p-0" aria-label="Team catalog results">
      {teams.items.map((team) => (
        <li key={team.id}>
          <Panel as="article" className="grid gap-3" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold">{team.name}</h2>
                <p className="m-0 mt-1 text-sm text-[var(--wl-text-muted)]">
                  {team.currentMemberCount}{' '}
                  {team.currentMemberCount === 1 ? 'current member' : 'current members'}
                </p>
              </div>
              <StatusBadge tone={team.active ? 'success' : 'neutral'}>
                {team.active ? 'Active' : 'Inactive'}
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
  const blocked = team.active && team.currentMemberCount > 0;
  return (
    <div className="grid max-w-sm justify-items-start gap-2">
      <Button
        {...(blocked ? { 'aria-describedby': `team-${team.id}-deactivation-reason` } : {})}
        variant="quiet"
        isDisabled={isPending || blocked}
        onPress={() => void onAction({ active: !team.active, teamId: team.id })}
      >
        {team.active ? `Deactivate ${team.name}` : `Activate ${team.name}`}
      </Button>
      {blocked ? (
        <p
          id={`team-${team.id}-deactivation-reason`}
          className="m-0 text-sm text-[var(--wl-text-muted)]"
        >
          Move all current members to another team or end their team assignments before deactivating
          this team. Existing assignment history remains unchanged.
        </p>
      ) : null}
    </div>
  );
}

function readTeamQuery(searchParams: URLSearchParams): TeamAdminQuery {
  const parsed = teamAdminQuerySchema.safeParse(Object.fromEntries(searchParams));
  return parsed.success ? parsed.data : { limit: 20, page: 1, status: 'ACTIVE' };
}

function teamMutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'ACCESS_DENIED') return 'You no longer have permission to manage teams.';
    if (error.code === 'TEAM_NAME_ALREADY_EXISTS') return 'A team already uses that name.';
    if (error.code === 'TEAM_STATE_CONFLICT')
      return 'The team changed or still has current or scheduled assignments. Refresh and review the catalog.';
  }
  return 'The team change could not be completed. Try again.';
}
