import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  employeeAdminQuerySchema,
  type EmployeeAdminDetail,
  type EmployeeAdminQuery,
  type EmployeeAssignmentAdminDetail,
  type EmployeeScheduleAdminDetail,
  type EmployeePolicyAdminDetail,
  type EmployeeEntitlementAdminDetail,
  type EmployeeAdminPage,
  type TeamAdminPage,
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
  activateEmployeeForAdministration,
  ApiClientError,
  createEmployeeForAdministration,
  createTeamForAdministration,
  deactivateEmployeeForAdministration,
  reissueEmployeeInvitation,
  replaceManagerAssignmentForAdministration,
  replaceEmployeeRolesForAdministration,
  replaceTeamAssignmentForAdministration,
  setTeamStateForAdministration,
} from '../app/api-client.js';
import {
  employeeAdminDetailQuery,
  employeeAdminPageQuery,
  employeeAssignmentAdminDetailQuery,
  employeeScheduleAdminDetailQuery,
  employeePolicyAdminDetailQuery,
  employeeEntitlementAdminDetailQuery,
  teamAdminPageQuery,
} from '../app/query.js';
import { EmployeeScheduleAdministration } from '../components/employee-schedule-administration.js';
import { EmployeePolicyAdministration } from '../components/employee-policy-administration.js';
import { EmployeeEntitlementAdministration } from '../components/employee-entitlement-administration.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  HR_ADMINISTRATOR: 'HR administrator',
  MANAGER: 'Manager',
} as const;

export function EmployeeAdministrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readEmployeeQuery(searchParams);
  const employeesQuery = useQuery(employeeAdminPageQuery(query));
  const teamsQuery = useQuery(teamAdminPageQuery({ limit: 50, page: 1, status: 'ALL' }));
  const [status, setStatus] = useState(query.status);
  const wideLayout = useWideEmployeeLayout();

  if (employeesQuery.isError) throw employeesQuery.error;
  if (teamsQuery.isError) throw teamsQuery.error;

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="People administration"
        title="Employees"
        description="Manage employee lifecycle records without rewriting employment, account, role, or attendance history."
      >
        {
          <Link className={linkVariants({ prominence: 'default' })} to="/employees/new">
            Add employee
          </Link>
        }
      </PageHeader>

      <FilterBar
        description="Show active employees, inactive employees, or the complete directory."
        title="Filter employee directory"
        onSubmit={(event) => {
          event.preventDefault();
          setSearchParams({ limit: '20', page: '1', status });
        }}
      >
        <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-status-filter">
          Employment status
          <select
            id="employee-status-filter"
            className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
            value={status}
            onChange={(event) => setStatus(event.target.value as EmployeeAdminQuery['status'])}
          >
            <option value="ALL">All employees</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Apply filter
        </Button>
      </FilterBar>

      {employeesQuery.isPending ? (
        <RouteState kind="loading">Employee records are being retrieved.</RouteState>
      ) : employeesQuery.data.items.length === 0 ? (
        <RouteState kind="empty" title="No matching employees">
          Change the status filter or create the first employee record.
        </RouteState>
      ) : wideLayout ? (
        <EmployeeDirectoryTable employees={employeesQuery.data} />
      ) : (
        <EmployeeDirectoryList employees={employeesQuery.data} />
      )}

      {employeesQuery.data === undefined ? null : (
        <Pagination
          ariaLabel="Employee result pages"
          currentPage={query.page}
          onPageChange={(page) =>
            setSearchParams({
              limit: query.limit.toString(),
              page: page.toString(),
              status: query.status,
            })
          }
          pageCount={employeesQuery.data.pagination.totalPages}
          summary={`Page ${query.page} of ${Math.max(1, employeesQuery.data.pagination.totalPages)}. ${employeesQuery.data.pagination.total} employees.`}
        />
      )}

      <div className="border-t border-[var(--wl-border-strong)] pt-8">
        <TeamAdministration teams={teamsQuery.data} isPending={teamsQuery.isPending} />
      </div>
    </section>
  );
}

function EmployeeDirectoryTable({ employees }: Readonly<{ employees: EmployeeAdminPage }>) {
  return (
    <DataTable
      caption="Employees matching the selected employment status"
      className="min-w-[48rem]"
      scrollHint="Scroll horizontally if every employee comparison column does not fit."
      scrollLabel="Employee directory results"
    >
      <thead>
        <tr>
          <th scope="col">Employee</th>
          <th scope="col">Number</th>
          <th scope="col">Employment</th>
          <th scope="col">Account</th>
          <th scope="col">Roles</th>
        </tr>
      </thead>
      <tbody>
        {employees.items.map((employee) => (
          <tr key={employee.id}>
            <th scope="row">
              <Link className="font-semibold" to={`/employees/${employee.id}`}>
                {employee.displayName}
              </Link>
            </th>
            <td>{employee.employeeNumber}</td>
            <td>{employmentText(employee)}</td>
            <td>{accountText(employee)}</td>
            <td>{employee.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'None'}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function EmployeeDirectoryList({ employees }: Readonly<{ employees: EmployeeAdminPage }>) {
  return (
    <ol className="m-0 grid list-none gap-3 p-0" aria-label="Employee directory results">
      {employees.items.map((employee) => (
        <li key={employee.id}>
          <Panel as="article" className="grid gap-3" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold">
                  <Link to={`/employees/${employee.id}`}>{employee.displayName}</Link>
                </h2>
                <p className="m-0 text-sm text-[var(--wl-text-muted)]">{employee.employeeNumber}</p>
              </div>
              <StatusBadge tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {employee.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>
            <dl className="m-0 grid gap-2 text-sm">
              <EmployeeFact label="Employment" value={employmentText(employee)} />
              <EmployeeFact label="Account" value={accountText(employee)} />
              <EmployeeFact
                label="Roles"
                value={employee.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'None'}
              />
            </dl>
          </Panel>
        </li>
      ))}
    </ol>
  );
}

function EmployeeFact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="font-semibold text-[var(--wl-text-muted)]">{label}</dt>
      <dd className="m-0 break-words">{value}</dd>
    </div>
  );
}

function employmentText(employee: EmployeeAdminPage['items'][number]) {
  const status = employee.status === 'ACTIVE' ? 'Active' : 'Inactive';
  return employee.currentEmployment === null
    ? `${status}, no current period`
    : `${status} since ${formatDate(employee.currentEmployment.startsOn)}`;
}

function accountText(employee: EmployeeAdminPage['items'][number]) {
  return employee.account === null
    ? 'No linked account'
    : employee.account.invitationPending
      ? 'Invitation pending'
      : employee.account.active
        ? 'Active account'
        : 'Inactive account';
}

function useWideEmployeeLayout(): boolean {
  const [wide, setWide] = useState(readWideEmployeeLayout);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(min-width: 48rem)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);
  return wide;
}

function readWideEmployeeLayout(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 48rem)').matches;
}

export function NewEmployeeAdministrationPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [employmentStartsOn, setEmploymentStartsOn] = useState('');
  const [manager, setManager] = useState(false);
  const [hrAdministrator, setHrAdministrator] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const mutation = useMutation({ mutationFn: createEmployeeForAdministration });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateEmployeeForm({ displayName, email, employeeNumber, employmentStartsOn });
    setFieldErrors(errors);
    setFormError(undefined);
    if (Object.keys(errors).length > 0) return focusSummary(summaryRef);
    try {
      const employee = await mutation.mutateAsync({
        displayName: displayName.trim(),
        email: email.trim().toLocaleLowerCase('en-US'),
        employeeNumber: employeeNumber.trim(),
        employmentStartsOn,
        roles: [
          'EMPLOYEE',
          ...(manager ? (['MANAGER'] as const) : []),
          ...(hrAdministrator ? (['HR_ADMINISTRATOR'] as const) : []),
        ],
      });
      await navigate(`/employees/${employee.id}`, {
        replace: true,
        state: { notice: 'Employee created and invitation issued.' },
      });
    } catch (error) {
      setFormError(employeeMutationError(error));
      focusSummary(summaryRef);
    }
  }

  return (
    <section className="grid max-w-3xl gap-8">
      <PageHeader
        eyebrow="People administration"
        title="Add employee"
        description="Create the stable employee and first employment period, then issue a 24-hour account invitation."
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form className="wl-panel grid gap-6" noValidate onSubmit={submit}>
        <TextField
          id="display-name"
          label="Display name"
          value={displayName}
          onChange={setDisplayName}
          isInvalid={fieldErrors['display-name'] !== undefined}
          errorMessage={fieldErrors['display-name']}
          autoComplete="name"
        />
        <TextField
          id="employee-number"
          label="Employee number"
          value={employeeNumber}
          onChange={setEmployeeNumber}
          isInvalid={fieldErrors['employee-number'] !== undefined}
          errorMessage={fieldErrors['employee-number']}
        />
        <TextField
          id="email"
          type="email"
          label="Account email"
          description="A configured delivery service uses this address for the invitation. It is not used as an employment identifier."
          value={email}
          onChange={setEmail}
          isInvalid={fieldErrors['email'] !== undefined}
          errorMessage={fieldErrors['email']}
          autoComplete="email"
        />
        <NativeDateField
          id="employment-starts-on"
          label="Employment starts on"
          value={employmentStartsOn}
          onChange={setEmploymentStartsOn}
          {...(fieldErrors['employment-starts-on'] === undefined
            ? {}
            : { error: fieldErrors['employment-starts-on'] })}
        />
        <fieldset className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-4">
          <legend className="px-1 text-sm font-bold">Application roles</legend>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Employee is required. Technical system authority is administered separately.
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked disabled /> Employee
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={manager}
              onChange={(event) => setManager(event.target.checked)}
            />
            Manager
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={hrAdministrator}
              onChange={(event) => setHrAdministrator(event.target.checked)}
            />
            HR administrator
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" isDisabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create and invite employee'}
          </Button>
          <Link className={linkVariants({ prominence: 'quiet' })} to="/employees">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}

function TeamAdministration({
  isPending,
  teams,
}: Readonly<{ isPending: boolean; teams: TeamAdminPage | undefined }>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({
    mutationFn: async (operation: Readonly<{ active?: boolean; teamId?: string }>) => {
      if (operation.teamId === undefined) return createTeamForAdministration({ name: name.trim() });
      return setTeamStateForAdministration(operation.teamId, operation.active ?? false);
    },
  });

  async function run(operation: Readonly<{ active?: boolean; teamId?: string }>) {
    setMessage(undefined);
    if (operation.teamId === undefined && name.trim() === '') {
      setMessage({ kind: 'error', text: 'Enter a team name.' });
      document.querySelector<HTMLElement>('#new-team-name')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync(operation);
      setName('');
      await queryClient.invalidateQueries({ queryKey: ['administration'] });
      setMessage({ kind: 'success', text: 'The team catalog was updated.' });
    } catch (error) {
      setMessage({ kind: 'error', text: employeeMutationError(error) });
    }
  }

  return (
    <Panel className="grid gap-5" aria-labelledby="team-catalog-heading">
      <div>
        <h2 id="team-catalog-heading" className="m-0 text-xl font-bold">
          Teams
        </h2>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          Teams group employees for orientation only. Direct-manager assignments independently
          control manager scope. This catalog is a separate task from the employee directory above.
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
        <div className="min-w-64 flex-1">
          <TextField id="new-team-name" label="New team name" value={name} onChange={setName} />
        </div>
        <Button type="submit" isDisabled={mutation.isPending}>
          Create team
        </Button>
      </form>
      {isPending ? (
        <RouteState kind="loading">Team records are being retrieved.</RouteState>
      ) : teams === undefined || teams.items.length === 0 ? (
        <RouteState kind="empty" title="No teams have been created">
          Create a team when employees need a shared orientation group.
        </RouteState>
      ) : (
        <ul className="m-0 grid gap-3 p-0" aria-label="Team catalog">
          {teams.items.map((team) => (
            <li
              key={team.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--wl-border)] p-4"
            >
              <div>
                <h3 className="m-0 text-base font-bold">{team.name}</h3>
                <p className="m-0 mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--wl-text-muted)]">
                  <StatusBadge tone={team.active ? 'success' : 'neutral'}>
                    {team.active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                  <span>
                    {team.currentMemberCount}{' '}
                    {team.currentMemberCount === 1 ? 'current member' : 'current members'}
                  </span>
                </p>
              </div>
              <div className="grid max-w-sm justify-items-start gap-2">
                <Button
                  {...(team.active && team.currentMemberCount > 0
                    ? { 'aria-describedby': `team-${team.id}-deactivation-reason` }
                    : {})}
                  variant="quiet"
                  isDisabled={mutation.isPending || (team.active && team.currentMemberCount > 0)}
                  onPress={() => void run({ active: !team.active, teamId: team.id })}
                >
                  {team.active ? `Deactivate ${team.name}` : `Activate ${team.name}`}
                </Button>
                {team.active && team.currentMemberCount > 0 ? (
                  <p
                    id={`team-${team.id}-deactivation-reason`}
                    className="m-0 text-sm text-[var(--wl-text-muted)]"
                  >
                    Move all current members to another team or end their team assignments before
                    deactivating this team.
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function EmployeeAdministrationDetailPage() {
  const employeeId = useParams()['employeeId'];
  if (employeeId === undefined) throw new Response(null, { status: 404 });
  const employeeQuery = useQuery(employeeAdminDetailQuery(employeeId));
  const assignmentsQuery = useQuery(employeeAssignmentAdminDetailQuery(employeeId));
  const scheduleQuery = useQuery(employeeScheduleAdminDetailQuery(employeeId));
  const policyQuery = useQuery(employeePolicyAdminDetailQuery(employeeId));
  const entitlementQuery = useQuery(employeeEntitlementAdminDetailQuery(employeeId));
  useEffect(() => {
    if (
      employeeQuery.data !== undefined &&
      assignmentsQuery.data !== undefined &&
      scheduleQuery.data !== undefined &&
      policyQuery.data !== undefined &&
      entitlementQuery.data !== undefined
    ) {
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[data-route-heading]')?.focus(),
      );
    }
  }, [
    assignmentsQuery.data,
    employeeQuery.data,
    entitlementQuery.data,
    policyQuery.data,
    scheduleQuery.data,
  ]);
  if (
    employeeQuery.isPending ||
    assignmentsQuery.isPending ||
    scheduleQuery.isPending ||
    policyQuery.isPending ||
    entitlementQuery.isPending
  ) {
    return (
      <section className="grid gap-6">
        <PageHeader title="Employee" description="Loading lifecycle history…" />
        <RouteState kind="loading">Employee administration details are being retrieved.</RouteState>
      </section>
    );
  }
  if (employeeQuery.isError) throw employeeQuery.error;
  if (assignmentsQuery.isError) throw assignmentsQuery.error;
  if (scheduleQuery.isError) throw scheduleQuery.error;
  if (policyQuery.isError) throw policyQuery.error;
  if (entitlementQuery.isError) throw entitlementQuery.error;
  return (
    <EmployeeDetail
      assignments={assignmentsQuery.data}
      employee={employeeQuery.data}
      schedule={scheduleQuery.data}
      policy={policyQuery.data}
      entitlement={entitlementQuery.data}
    />
  );
}

function EmployeeDetail({
  assignments,
  employee,
  schedule,
  policy,
  entitlement,
}: Readonly<{
  assignments: EmployeeAssignmentAdminDetail;
  employee: EmployeeAdminDetail;
  schedule: EmployeeScheduleAdminDetail;
  policy: EmployeePolicyAdminDetail;
  entitlement: EmployeeEntitlementAdminDetail;
}>) {
  const queryClient = useQueryClient();
  const [manager, setManager] = useState(employee.roles.includes('MANAGER'));
  const [hrAdministrator, setHrAdministrator] = useState(
    employee.roles.includes('HR_ADMINISTRATOR'),
  );
  const [effectiveDate, setEffectiveDate] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({
    mutationFn: async (operation: 'activate' | 'deactivate' | 'invite' | 'roles') => {
      if (operation === 'activate') {
        return activateEmployeeForAdministration(employee.id, {
          employmentStartsOn: effectiveDate,
        });
      }
      if (operation === 'deactivate') {
        return deactivateEmployeeForAdministration(employee.id, {
          employmentEndsOn: effectiveDate,
        });
      }
      if (operation === 'invite') return reissueEmployeeInvitation(employee.id);
      return replaceEmployeeRolesForAdministration(employee.id, {
        roles: [
          'EMPLOYEE',
          ...(manager ? (['MANAGER'] as const) : []),
          ...(hrAdministrator ? (['HR_ADMINISTRATOR'] as const) : []),
        ],
      });
    },
  });

  async function run(operation: 'activate' | 'deactivate' | 'invite' | 'roles') {
    setMessage(undefined);
    if ((operation === 'activate' || operation === 'deactivate') && effectiveDate === '') {
      setMessage({ kind: 'error', text: 'Choose the effective employment date first.' });
      document.querySelector<HTMLElement>('#employment-effective-date')?.focus();
      return;
    }
    try {
      await mutation.mutateAsync(operation);
      await queryClient.invalidateQueries({ queryKey: ['administration'] });
      setMessage({
        kind: 'success',
        text:
          operation === 'invite'
            ? 'A new invitation was issued and the prior invitation was invalidated.'
            : 'The employee lifecycle record was updated.',
      });
    } catch (error) {
      setMessage({ kind: 'error', text: employeeMutationError(error) });
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="People administration"
        title={employee.displayName}
        description={`${employee.employeeNumber} — ${employee.status === 'ACTIVE' ? 'Active employee' : 'Inactive employee'}`}
      >
        {
          <Link className={linkVariants({ prominence: 'quiet' })} to="/employees">
            Back to employees
          </Link>
        }
      </PageHeader>
      {message === undefined ? null : (
        <Alert
          title={message.kind === 'error' ? 'Employee update failed' : 'Employee record updated'}
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="grid content-start gap-4" aria-labelledby="employment-history-heading">
          <h2 id="employment-history-heading" className="m-0 text-xl font-bold">
            Employment history
          </h2>
          <ol className="m-0 grid gap-3 pl-5">
            {employee.employmentHistory.map((period) => (
              <li key={period.id}>
                {formatDate(period.startsOn)} to{' '}
                {period.endsOn === null ? 'ongoing' : formatDate(period.endsOn)}
              </li>
            ))}
          </ol>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Re-employment adds a new non-overlapping period. Earlier attendance, balances,
            approvals, and audit attribution remain linked to this employee.
          </p>
        </Panel>

        <Panel className="grid content-start gap-4" aria-labelledby="employee-account-heading">
          <h2 id="employee-account-heading" className="m-0 text-xl font-bold">
            Employee-linked account
          </h2>
          {employee.account === null ? (
            <p className="m-0">No account is linked.</p>
          ) : (
            <dl className="m-0 grid gap-3">
              <div>
                <dt className="font-semibold">Email</dt>
                <dd className="m-0 break-all">{employee.account.email}</dd>
              </div>
              <div>
                <dt className="font-semibold">Account state</dt>
                <dd className="m-0">{employee.account.active ? 'Active' : 'Inactive'}</dd>
              </div>
              <div>
                <dt className="font-semibold">Invitation</dt>
                <dd className="m-0">
                  {employee.account.invitationPending
                    ? 'Pending for up to 24 hours'
                    : 'No active invitation'}
                </dd>
              </div>
            </dl>
          )}
        </Panel>
      </div>

      <AssignmentAdministration assignments={assignments} employeeId={employee.id} />

      <EmployeeScheduleAdministration employeeId={employee.id} schedule={schedule} />
      <EmployeePolicyAdministration employeeId={employee.id} policy={policy} />
      <EmployeeEntitlementAdministration employeeId={employee.id} entitlement={entitlement} />

      {!employee.privilegedActionsAllowed ? (
        <Alert announce={false} title="Review only" tone="info">
          <p>
            You may review your own employee record here, but privileged self-edit controls are
            unavailable. Ask another HR administrator to make a required change.
          </p>
        </Alert>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel className="grid content-start gap-5" aria-labelledby="role-management-heading">
            <h2 id="role-management-heading" className="m-0 text-xl font-bold">
              HR-managed roles
            </h2>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              Changing roles revokes the target account’s sessions. System authority is not
              available on this surface.
            </p>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked disabled /> Employee
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={manager}
                onChange={(event) => setManager(event.target.checked)}
              />{' '}
              Manager
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={hrAdministrator}
                onChange={(event) => setHrAdministrator(event.target.checked)}
              />{' '}
              HR administrator
            </label>
            <Button isDisabled={mutation.isPending} onPress={() => void run('roles')}>
              Save roles
            </Button>
          </Panel>

          <Panel className="grid content-start gap-5" aria-labelledby="lifecycle-actions-heading">
            <h2 id="lifecycle-actions-heading" className="m-0 text-xl font-bold">
              Lifecycle actions
            </h2>
            <NativeDateField
              id="employment-effective-date"
              label={employee.status === 'ACTIVE' ? 'Employment ends on' : 'Employment starts on'}
              value={effectiveDate}
              onChange={setEffectiveDate}
            />
            <Button
              variant="secondary"
              isDisabled={mutation.isPending}
              onPress={() => void run(employee.status === 'ACTIVE' ? 'deactivate' : 'activate')}
            >
              {employee.status === 'ACTIVE'
                ? 'Deactivate employee and account'
                : 'Activate employee and account'}
            </Button>
            {employee.account === null ? null : (
              <Button
                variant="quiet"
                isDisabled={mutation.isPending}
                onPress={() => void run('invite')}
              >
                Reissue 24-hour invitation
              </Button>
            )}
          </Panel>
        </div>
      )}
    </section>
  );
}

function AssignmentAdministration({
  assignments,
  employeeId,
}: Readonly<{ assignments: EmployeeAssignmentAdminDetail; employeeId: string }>) {
  const queryClient = useQueryClient();
  const [teamChoice, setTeamChoice] = useState('__UNCHANGED');
  const [teamDate, setTeamDate] = useState('');
  const [managerChoice, setManagerChoice] = useState('__UNCHANGED');
  const [managerDate, setManagerDate] = useState('');
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }>>();
  const mutation = useMutation({
    mutationFn: async (kind: 'manager' | 'team') => {
      if (kind === 'team') {
        return replaceTeamAssignmentForAdministration(employeeId, {
          effectiveFrom: teamDate,
          teamId: teamChoice === '__NONE' ? null : teamChoice,
        });
      }
      return replaceManagerAssignmentForAdministration(employeeId, {
        effectiveFrom: managerDate,
        managerEmployeeId: managerChoice === '__NONE' ? null : managerChoice,
      });
    },
  });

  async function save(kind: 'manager' | 'team') {
    setMessage(undefined);
    const choice = kind === 'team' ? teamChoice : managerChoice;
    const date = kind === 'team' ? teamDate : managerDate;
    if (choice === '__UNCHANGED' || date === '') {
      setMessage({
        kind: 'error',
        text: `Choose a ${kind === 'team' ? 'team change' : 'manager change'} and effective date.`,
      });
      document
        .querySelector<HTMLElement>(
          choice === '__UNCHANGED' ? `#${kind}-assignment-choice` : `#${kind}-assignment-date`,
        )
        ?.focus();
      return;
    }
    try {
      await mutation.mutateAsync(kind);
      await queryClient.invalidateQueries({ queryKey: ['administration'] });
      if (kind === 'team') {
        setTeamChoice('__UNCHANGED');
        setTeamDate('');
      } else {
        setManagerChoice('__UNCHANGED');
        setManagerDate('');
      }
      setMessage({
        kind: 'success',
        text: `The ${kind === 'team' ? 'team' : 'direct-manager'} assignment was updated without rewriting prior history.`,
      });
    } catch (error) {
      setMessage({ kind: 'error', text: employeeMutationError(error) });
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="organization-assignments-heading">
      <div>
        <h2 id="organization-assignments-heading" className="m-0 text-2xl font-bold">
          Team and direct manager
        </h2>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          Current state is resolved for {formatDate(assignments.asOfLocalDate)}. Team membership
          does not grant manager access; only the effective direct-manager relationship does.
        </p>
      </div>
      {message === undefined ? null : (
        <Alert
          title={message.kind === 'error' ? 'Assignment update failed' : 'Assignment updated'}
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <AssignmentHistoryCard
          heading="Team history"
          current={assignments.currentTeam?.team.name ?? 'No current team'}
          items={assignments.teamHistory.map((assignment) => ({
            endsOn: assignment.endsOn,
            id: assignment.id,
            label: `${assignment.team.name}${assignment.team.active ? '' : ' (inactive team)'}`,
            startsOn: assignment.startsOn,
          }))}
        />
        <AssignmentHistoryCard
          heading="Direct-manager history"
          current={assignments.currentManager?.manager.displayName ?? 'No current direct manager'}
          items={assignments.managerHistory.map((assignment) => ({
            endsOn: assignment.endsOn,
            id: assignment.id,
            label: `${assignment.manager.displayName} (${assignment.manager.employeeNumber})`,
            startsOn: assignment.startsOn,
          }))}
        />
      </div>
      {!assignments.privilegedActionsAllowed ? null : (
        <div className="grid gap-6 xl:grid-cols-2">
          <form
            className="wl-panel grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save('team');
            }}
          >
            <h3 className="m-0 text-xl font-bold">Change team</h3>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="team-assignment-choice">
              Team change
              <select
                id="team-assignment-choice"
                className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
                value={teamChoice}
                onChange={(event) => setTeamChoice(event.target.value)}
              >
                <option value="__UNCHANGED">Choose a change</option>
                <option value="__NONE">No team</option>
                {assignments.activeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <NativeDateField
              id="team-assignment-date"
              label="Effective from"
              min={assignments.asOfLocalDate}
              value={teamDate}
              onChange={setTeamDate}
            />
            <Button type="submit" isDisabled={mutation.isPending}>
              Save team assignment
            </Button>
          </form>
          <form
            className="wl-panel grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save('manager');
            }}
          >
            <h3 className="m-0 text-xl font-bold">Change direct manager</h3>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="manager-assignment-choice">
              Direct-manager change
              <select
                id="manager-assignment-choice"
                className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
                value={managerChoice}
                onChange={(event) => setManagerChoice(event.target.value)}
              >
                <option value="__UNCHANGED">Choose a change</option>
                <option value="__NONE">No direct manager</option>
                {assignments.eligibleManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.displayName} ({manager.employeeNumber})
                  </option>
                ))}
              </select>
            </label>
            <NativeDateField
              id="manager-assignment-date"
              label="Effective from"
              min={assignments.asOfLocalDate}
              value={managerDate}
              onChange={setManagerDate}
            />
            <Button type="submit" isDisabled={mutation.isPending}>
              Save direct-manager assignment
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}

function AssignmentHistoryCard({
  current,
  heading,
  items,
}: Readonly<{
  current: string;
  heading: string;
  items: readonly Readonly<{
    endsOn: string | null;
    id: string;
    label: string;
    startsOn: string;
  }>[];
}>) {
  return (
    <Panel className="grid content-start gap-4">
      <h3 className="m-0 text-xl font-bold">{heading}</h3>
      <p className="m-0 font-semibold">Current: {current}</p>
      {items.length === 0 ? (
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">No assignment history.</p>
      ) : (
        <ol className="m-0 grid gap-2 pl-5">
          {items.map((item) => (
            <li key={item.id}>
              {item.label}: {formatDate(item.startsOn)} to{' '}
              {item.endsOn === null ? 'ongoing' : formatDate(item.endsOn)}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function NativeDateField({
  error,
  id,
  label,
  min,
  onChange,
  value,
}: Readonly<{
  error?: string;
  id: string;
  label: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : `${id}-error`}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
      />
      {error === undefined ? null : (
        <span id={`${id}-error`} className="text-[var(--wl-danger)]">
          {error}
        </span>
      )}
    </label>
  );
}

function readEmployeeQuery(searchParams: URLSearchParams): EmployeeAdminQuery {
  const parsed = employeeAdminQuerySchema.safeParse(Object.fromEntries(searchParams));
  return parsed.success ? parsed.data : { limit: 20, page: 1, status: 'ALL' };
}

function validateEmployeeForm(
  input: Readonly<
    Record<'displayName' | 'email' | 'employeeNumber' | 'employmentStartsOn', string>
  >,
) {
  const errors: Record<string, string> = {};
  if (input.displayName.trim() === '') errors['display-name'] = 'Enter the employee display name.';
  if (input.employeeNumber.trim() === '') errors['employee-number'] = 'Enter an employee number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email.trim())) {
    errors['email'] = 'Enter a valid account email address.';
  }
  if (input.employmentStartsOn === '')
    errors['employment-starts-on'] = 'Choose the employment start date.';
  return errors;
}

function employeeMutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'AUTH_SESSION_NOT_FRESH')
      return 'Sign out and sign in again before making this privileged change.';
    if (error.code === 'ACCESS_DENIED')
      return 'You no longer have permission for this employee change.';
    if (error.code === 'ACCOUNT_EMAIL_ALREADY_EXISTS')
      return 'That account email is already in use.';
    if (error.code === 'EMPLOYEE_NUMBER_ALREADY_EXISTS')
      return 'That employee number is already in use.';
    if (error.code === 'EMPLOYMENT_PERIOD_OVERLAP')
      return 'The new employment period overlaps existing history.';
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return 'Choose a later effective date that does not replace an assignment beginning that day.';
    if (error.code === 'ASSIGNMENT_STATE_CONFLICT')
      return 'The assignment changed or already has that value. Refresh and review its history.';
    if (error.code === 'MANAGER_ASSIGNMENT_CYCLE')
      return 'That direct-manager change would create a reporting cycle.';
    if (error.code === 'MANAGER_NOT_ELIGIBLE')
      return 'Choose an active employee with a current account and Manager role.';
    if (error.code === 'TEAM_NAME_ALREADY_EXISTS') return 'A team already uses that name.';
    if (error.code === 'TEAM_STATE_CONFLICT')
      return 'The team changed or still has current or scheduled assignments.';
    if (error.code === 'EMPLOYEE_STATE_CONFLICT')
      return 'The employee state changed. Refresh and review the current record.';
  }
  return 'The employee change could not be completed. Try again.';
}

function focusSummary(ref: { current: HTMLDivElement | null }) {
  window.requestAnimationFrame(() => ref.current?.focus());
}

function formatDate(value: string) {
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00Z`));
}
