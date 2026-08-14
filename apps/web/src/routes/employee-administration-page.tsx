import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  employeeAdminQuerySchema,
  type EmployeeAdminDetail,
  type EmployeeAdminQuery,
} from '@workledger/contracts';
import { Button, linkVariants, TextField } from '@workledger/ui';

import {
  activateEmployeeForAdministration,
  ApiClientError,
  createEmployeeForAdministration,
  deactivateEmployeeForAdministration,
  reissueEmployeeInvitation,
  replaceEmployeeRolesForAdministration,
} from '../app/api-client.js';
import { employeeAdminDetailQuery, employeeAdminPageQuery } from '../app/query.js';
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
  const [status, setStatus] = useState(query.status);

  if (employeesQuery.isError) throw employeesQuery.error;

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

      <form
        className="wl-panel flex flex-wrap items-end gap-4"
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
      </form>

      {employeesQuery.isPending ? (
        <div className="wl-panel" aria-busy="true">
          Loading employees…
        </div>
      ) : employeesQuery.data.items.length === 0 ? (
        <div className="wl-panel">
          <h2 className="m-0 text-xl font-bold">No matching employees</h2>
          <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
            Change the status filter or create the first employee record.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border border-[var(--wl-border)]"
          role="region"
          aria-label="Employee administration results"
          tabIndex={0}
        >
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <caption className="sr-only">Employees matching the selected employment status</caption>
            <thead className="bg-[var(--wl-surface-subtle)]">
              <tr>
                <th className="px-4 py-3" scope="col">
                  Employee
                </th>
                <th className="px-4 py-3" scope="col">
                  Number
                </th>
                <th className="px-4 py-3" scope="col">
                  Employment
                </th>
                <th className="px-4 py-3" scope="col">
                  Account
                </th>
                <th className="px-4 py-3" scope="col">
                  Roles
                </th>
              </tr>
            </thead>
            <tbody>
              {employeesQuery.data.items.map((employee) => (
                <tr key={employee.id} className="border-t border-[var(--wl-border)] align-top">
                  <th className="px-4 py-4" scope="row">
                    <Link className="font-semibold" to={`/employees/${employee.id}`}>
                      {employee.displayName}
                    </Link>
                  </th>
                  <td className="px-4 py-4">{employee.employeeNumber}</td>
                  <td className="px-4 py-4">
                    {employee.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    {employee.currentEmployment === null
                      ? ' — no current period'
                      : ` — since ${formatDate(employee.currentEmployment.startsOn)}`}
                  </td>
                  <td className="px-4 py-4">
                    {employee.account === null
                      ? 'No linked account'
                      : employee.account.invitationPending
                        ? 'Invitation pending'
                        : employee.account.active
                          ? 'Active account'
                          : 'Inactive account'}
                  </td>
                  <td className="px-4 py-4">
                    {employee.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'None'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {employeesQuery.data === undefined ? null : (
        <nav aria-label="Employee result pages" className="flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            isDisabled={query.page <= 1}
            onPress={() =>
              setSearchParams({
                limit: query.limit.toString(),
                page: (query.page - 1).toString(),
                status: query.status,
              })
            }
          >
            Previous page
          </Button>
          <p className="m-0 text-sm">
            Page {query.page} of {Math.max(1, employeesQuery.data.pagination.totalPages)} —{' '}
            {employeesQuery.data.pagination.total} employees
          </p>
          <Button
            variant="secondary"
            isDisabled={query.page >= employeesQuery.data.pagination.totalPages}
            onPress={() =>
              setSearchParams({
                limit: query.limit.toString(),
                page: (query.page + 1).toString(),
                status: query.status,
              })
            }
          >
            Next page
          </Button>
        </nav>
      )}
    </section>
  );
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

export function EmployeeAdministrationDetailPage() {
  const employeeId = useParams()['employeeId'];
  if (employeeId === undefined) throw new Response(null, { status: 404 });
  const employeeQuery = useQuery(employeeAdminDetailQuery(employeeId));
  useEffect(() => {
    if (employeeQuery.data !== undefined) {
      window.requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[data-route-heading]')?.focus(),
      );
    }
  }, [employeeQuery.data]);
  if (employeeQuery.isPending) {
    return (
      <section aria-busy="true">
        <PageHeader title="Employee" description="Loading lifecycle history…" />
      </section>
    );
  }
  if (employeeQuery.isError) throw employeeQuery.error;
  return <EmployeeDetail employee={employeeQuery.data} />;
}

function EmployeeDetail({ employee }: Readonly<{ employee: EmployeeAdminDetail }>) {
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
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`wl-alert ${message.kind === 'error' ? 'wl-alert-error' : 'wl-alert-success'} rounded-xl border p-4`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="wl-panel grid content-start gap-4"
          aria-labelledby="employment-history-heading"
        >
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
        </section>

        <section
          className="wl-panel grid content-start gap-4"
          aria-labelledby="employee-account-heading"
        >
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
        </section>
      </div>

      {!employee.privilegedActionsAllowed ? (
        <div className="wl-alert rounded-xl border p-4">
          You may review your own employee record here, but privileged self-edit controls are
          unavailable.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section
            className="wl-panel grid content-start gap-5"
            aria-labelledby="role-management-heading"
          >
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
          </section>

          <section
            className="wl-panel grid content-start gap-5"
            aria-labelledby="lifecycle-actions-heading"
          >
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
          </section>
        </div>
      )}
    </section>
  );
}

function NativeDateField({
  error,
  id,
  label,
  onChange,
  value,
}: Readonly<{
  error?: string;
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
        value={value}
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
