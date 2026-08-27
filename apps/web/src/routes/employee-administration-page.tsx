import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  DEFAULT_LOCALE,
  employeeAdminQuerySchema,
  type EmployeeAdminDetail,
  type EmployeeAdminQuery,
  type EmployeeAssignmentAdminDetail,
  type EmployeeScheduleAdminDetail,
  type EmployeePolicyAdminDetail,
  type EmployeeEntitlementAdminDetail,
  type EmployeeAdminPage,
  type EmployeeAdminSearchRequest,
  type SupportedLocale,
} from '@workledger/contracts';
import { formatDateOnly, translateStaticMessage, type MessageKey } from '@workledger/i18n';
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
  activateEmployeeForAdministration,
  ApiClientError,
  createEmployeeForAdministration,
  deactivateEmployeeForAdministration,
  reissueEmployeeInvitation,
  replaceManagerAssignmentForAdministration,
  replaceEmployeeRolesForAdministration,
  replaceTeamAssignmentForAdministration,
} from '../app/api-client.js';
import {
  employeeAdminDetailQuery,
  employeeAdminPageQuery,
  employeeAdminSearchPageQuery,
  employeeAssignmentAdminDetailQuery,
  employeeScheduleAdminDetailQuery,
  employeePolicyAdminDetailQuery,
  employeeEntitlementAdminDetailQuery,
} from '../app/query.js';
import { useWideAdministrationLayout } from '../app/use-wide-administration-layout.js';
import { useOptionalWebLocale } from '../app/locale.js';
import { EmployeeScheduleAdministration } from '../components/employee-schedule-administration.js';
import { EmployeePolicyAdministration } from '../components/employee-policy-administration.js';
import { EmployeeEntitlementAdministration } from '../components/employee-entitlement-administration.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';
import { LanguageSelect } from '../components/language-select.js';

const ROLE_MESSAGE_KEYS = Object.freeze({
  EMPLOYEE: 'shared.profile.role.employee',
  HR_ADMINISTRATOR: 'shared.profile.role.hrAdministrator',
  MANAGER: 'shared.profile.role.manager',
} as const satisfies Readonly<Record<'EMPLOYEE' | 'HR_ADMINISTRATOR' | 'MANAGER', MessageKey>>);

export function EmployeeAdministrationPage() {
  const t = useWorkLedgerMessage();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readEmployeeQuery(searchParams);
  const [status, setStatus] = useState(query.status);
  const [searchInput, setSearchInput] = useState('');
  const [searchRequest, setSearchRequest] = useState<EmployeeAdminSearchRequest | null>(null);
  const [searchError, setSearchError] = useState<string>();
  const employeesQuery = useQuery(
    searchRequest === null
      ? employeeAdminPageQuery(query)
      : employeeAdminSearchPageQuery(searchRequest),
  );
  const wideLayout = useWideAdministrationLayout();

  useEffect(() => {
    setStatus(query.status);
    setSearchRequest((current) =>
      current !== null && (current.status !== query.status || query.page !== 1) ? null : current,
    );
  }, [query.page, query.status]);

  if (employeesQuery.isError) throw employeesQuery.error;

  const activePage = searchRequest?.page ?? query.page;
  const activeSearch = searchRequest?.search ?? null;

  function submitDirectorySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = searchInput.trim();
    if (search.length === 1) {
      setSearchError(t('admin.employee.directory.validation.search'));
      document.querySelector<HTMLElement>('#employee-directory-search')?.focus();
      return;
    }
    setSearchError(undefined);
    setSearchParams({ limit: '20', page: '1', status });
    setSearchRequest(search === '' ? null : { limit: 20, page: 1, search, status });
  }

  function clearDirectorySearch() {
    setSearchInput('');
    setSearchError(undefined);
    setSearchRequest(null);
    setSearchParams({ limit: '20', page: '1', status });
    document.querySelector<HTMLElement>('#employee-directory-search')?.focus();
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('admin.employee.directory.page.eyebrow')}
        title={t('shared.route.title.employees')}
        description={t('admin.employee.directory.page.description')}
      >
        <div className="flex flex-wrap gap-3">
          <Link className={linkVariants({ prominence: 'default' })} to="/employees/new">
            {t('admin.employee.directory.page.addEmployee')}
          </Link>
          <Link className={linkVariants({ prominence: 'quiet' })} to="/teams">
            {t('admin.employee.directory.page.manageTeams')}
          </Link>
        </div>
      </PageHeader>

      <FilterBar
        description={t('admin.employee.directory.search.description')}
        title={t('admin.employee.directory.search.title')}
        onSubmit={submitDirectorySearch}
      >
        <TextField
          id="employee-directory-search"
          className="min-w-64 flex-[2_1_20rem]"
          label={t('admin.employee.directory.search.label')}
          maxLength={320}
          name="employee-search"
          value={searchInput}
          onChange={(value) => {
            setSearchInput(value);
            if (searchError !== undefined) setSearchError(undefined);
          }}
          errorMessage={searchError}
          isInvalid={searchError !== undefined}
          type="search"
        />
        <label className="grid gap-2 text-sm font-semibold" htmlFor="employee-status-filter">
          {t('admin.employee.directory.search.status')}
          <select
            id="employee-status-filter"
            className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as EmployeeAdminQuery['status'])}
          >
            <option value="ALL">{t('admin.employee.directory.search.all')}</option>
            <option value="ACTIVE">{t('shared.profile.status.active')}</option>
            <option value="INACTIVE">{t('shared.profile.status.inactive')}</option>
          </select>
        </label>
        <Button type="submit" variant="secondary">
          {t('admin.employee.directory.search.submit')}
        </Button>
        {activeSearch === null ? null : (
          <Button type="button" variant="quiet" onPress={clearDirectorySearch}>
            {t('admin.employee.directory.search.clear')}
          </Button>
        )}
      </FilterBar>

      {employeesQuery.isPending ? (
        <RouteState kind="loading" title={t('admin.employee.directory.loading.title')}>
          {t('admin.employee.directory.loading.description')}
        </RouteState>
      ) : employeesQuery.data.items.length === 0 ? (
        <RouteState
          kind="empty"
          title={
            activeSearch === null
              ? t('admin.employee.directory.empty.title')
              : t('admin.employee.directory.empty.searchTitle')
          }
        >
          {activeSearch === null
            ? t('admin.employee.directory.empty.description')
            : t('admin.employee.directory.empty.searchDescription')}
        </RouteState>
      ) : (
        <div className="grid gap-4">
          <p className="m-0 text-sm text-[var(--wl-text-muted)]" role="status" aria-live="polite">
            {t('admin.employee.directory.results.count', {
              count: employeesQuery.data.pagination.total,
            })}
          </p>
          {wideLayout ? (
            <EmployeeDirectoryTable employees={employeesQuery.data} />
          ) : (
            <EmployeeDirectoryList employees={employeesQuery.data} />
          )}
        </div>
      )}

      {employeesQuery.data === undefined ? null : (
        <Pagination
          ariaLabel={t('admin.employee.directory.pagination.label')}
          currentPage={activePage}
          onPageChange={(page) => {
            if (searchRequest === null) {
              setSearchParams({
                limit: query.limit.toString(),
                page: page.toString(),
                status: query.status,
              });
              return;
            }
            setSearchRequest({ ...searchRequest, page });
          }}
          pageCount={employeesQuery.data.pagination.totalPages}
          summary={t('admin.employee.directory.pagination.summary', {
            count: employeesQuery.data.pagination.total,
            current: activePage,
            total: Math.max(1, employeesQuery.data.pagination.totalPages),
          })}
        />
      )}
    </section>
  );
}

function EmployeeDirectoryTable({ employees }: Readonly<{ employees: EmployeeAdminPage }>) {
  const t = useWorkLedgerMessage();
  return (
    <DataTable
      caption={t('admin.employee.directory.results.caption')}
      className="min-w-[48rem]"
      scrollHint={t('admin.employee.directory.results.scrollHint')}
      scrollLabel={t('admin.employee.directory.results.scrollLabel')}
    >
      <thead>
        <tr>
          <th scope="col">{t('admin.employee.directory.column.employee')}</th>
          <th scope="col">{t('admin.employee.directory.column.number')}</th>
          <th scope="col">{t('admin.employee.directory.column.employment')}</th>
          <th scope="col">{t('admin.employee.directory.column.account')}</th>
          <th scope="col">{t('admin.employee.directory.column.roles')}</th>
          <th scope="col">{t('admin.employee.directory.column.action')}</th>
        </tr>
      </thead>
      <tbody>
        {employees.items.map((employee) => (
          <tr key={employee.id}>
            <th scope="row" className="font-semibold">
              {employee.displayName}
            </th>
            <td>{employee.employeeNumber}</td>
            <td>{employmentText(employee, t)}</td>
            <td>{accountText(employee, t)}</td>
            <td>
              {employee.roles.map((role) => t(ROLE_MESSAGE_KEYS[role])).join(', ') ||
                t('admin.employee.common.none')}
            </td>
            <td>
              <EmployeeRecordLink employee={employee} />
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function EmployeeDirectoryList({ employees }: Readonly<{ employees: EmployeeAdminPage }>) {
  const t = useWorkLedgerMessage();
  return (
    <ol
      className="m-0 grid list-none gap-3 p-0"
      aria-label={t('admin.employee.directory.results.scrollLabel')}
    >
      {employees.items.map((employee) => (
        <li key={employee.id}>
          <Panel as="article" className="grid gap-3" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-bold">{employee.displayName}</h2>
                <p className="m-0 text-sm text-[var(--wl-text-muted)]">{employee.employeeNumber}</p>
              </div>
              <StatusBadge tone={employee.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {employee.status === 'ACTIVE'
                  ? t('shared.profile.status.active')
                  : t('shared.profile.status.inactive')}
              </StatusBadge>
            </div>
            <dl className="m-0 grid gap-2 text-sm">
              <EmployeeFact
                label={t('admin.employee.directory.column.employment')}
                value={employmentText(employee, t)}
              />
              <EmployeeFact
                label={t('admin.employee.directory.column.account')}
                value={accountText(employee, t)}
              />
              <EmployeeFact
                label={t('admin.employee.directory.column.roles')}
                value={
                  employee.roles.map((role) => t(ROLE_MESSAGE_KEYS[role])).join(', ') ||
                  t('admin.employee.common.none')
                }
              />
            </dl>
            <div>
              <EmployeeRecordLink employee={employee} />
            </div>
          </Panel>
        </li>
      ))}
    </ol>
  );
}

function EmployeeRecordLink({
  employee,
}: Readonly<{ employee: EmployeeAdminPage['items'][number] }>) {
  const t = useWorkLedgerMessage();
  return (
    <Link
      aria-label={t('admin.employee.directory.openRecordLabel', { employee: employee.displayName })}
      className={linkVariants({ prominence: 'quiet' })}
      to={`/employees/${employee.id}`}
    >
      {t('admin.employee.directory.openRecord')}
    </Link>
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

function employmentText(
  employee: EmployeeAdminPage['items'][number],
  t: ReturnType<typeof useWorkLedgerMessage>,
) {
  const status =
    employee.status === 'ACTIVE'
      ? t('shared.profile.status.active')
      : t('shared.profile.status.inactive');
  return employee.currentEmployment === null
    ? t('admin.employee.directory.employment.noCurrent', { status })
    : t('admin.employee.directory.employment.since', {
        date: formatDate(employee.currentEmployment.startsOn),
        status,
      });
}

function accountText(
  employee: EmployeeAdminPage['items'][number],
  t: ReturnType<typeof useWorkLedgerMessage>,
) {
  return employee.account === null
    ? t('admin.employee.directory.account.none')
    : employee.account.invitationPending
      ? t('admin.employee.directory.account.invitationPending')
      : employee.account.active
        ? t('admin.employee.directory.account.active')
        : t('admin.employee.directory.account.inactive');
}

export function NewEmployeeAdministrationPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const accountLocale = useOptionalWebLocale();
  const [displayName, setDisplayName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [email, setEmail] = useState('');
  const [employmentStartsOn, setEmploymentStartsOn] = useState('');
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [manager, setManager] = useState(false);
  const [hrAdministrator, setHrAdministrator] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const mutation = useMutation({ mutationFn: createEmployeeForAdministration });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateEmployeeForm(
      { displayName, email, employeeNumber, employmentStartsOn },
      t,
    );
    setFieldErrors(errors);
    setFormError(undefined);
    if (Object.keys(errors).length > 0) return focusSummary(summaryRef);
    try {
      const employee = await mutation.mutateAsync({
        displayName: displayName.trim(),
        email: email.trim().toLocaleLowerCase('en-US'),
        employeeNumber: employeeNumber.trim(),
        employmentStartsOn,
        locale,
        roles: [
          'EMPLOYEE',
          ...(manager ? (['MANAGER'] as const) : []),
          ...(hrAdministrator ? (['HR_ADMINISTRATOR'] as const) : []),
        ],
      });
      await navigate(`/employees/${employee.id}`, {
        replace: true,
        state: { notice: t('admin.employee.create.feedback.created') },
      });
    } catch (error) {
      setFormError(employeeMutationError(error, t));
      focusSummary(summaryRef);
    }
  }

  return (
    <section className="grid max-w-3xl gap-8">
      <PageHeader
        eyebrow={t('admin.employee.create.page.eyebrow')}
        title={t('admin.employee.create.page.title')}
        description={t('admin.employee.create.page.description')}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form className="wl-panel grid gap-6" noValidate onSubmit={submit}>
        <TextField
          id="display-name"
          label={t('admin.employee.create.form.displayName')}
          value={displayName}
          onChange={setDisplayName}
          isInvalid={fieldErrors['display-name'] !== undefined}
          errorMessage={fieldErrors['display-name']}
          autoComplete="name"
        />
        <TextField
          id="employee-number"
          label={t('admin.employee.create.form.employeeNumber')}
          value={employeeNumber}
          onChange={setEmployeeNumber}
          isInvalid={fieldErrors['employee-number'] !== undefined}
          errorMessage={fieldErrors['employee-number']}
        />
        <TextField
          id="email"
          type="email"
          label={t('admin.employee.create.form.accountEmail')}
          description={t('admin.employee.create.form.accountEmailDescription')}
          value={email}
          onChange={setEmail}
          isInvalid={fieldErrors['email'] !== undefined}
          errorMessage={fieldErrors['email']}
          autoComplete="email"
        />
        <NativeDateField
          id="employment-starts-on"
          label={t('admin.employee.create.form.employmentStartsOn')}
          value={employmentStartsOn}
          onChange={setEmploymentStartsOn}
          {...(fieldErrors['employment-starts-on'] === undefined
            ? {}
            : { error: fieldErrors['employment-starts-on'] })}
        />
        <LanguageSelect
          description={
            accountLocale === null
              ? t('admin.employee.create.form.invitationDescription')
              : translateStaticMessage(accountLocale.runtime, 'shared.locale.invitationDescription')
          }
          id="employee-invitation-language"
          label={t('admin.employee.create.form.invitationLanguage')}
          value={locale}
          onChange={setLocale}
        />
        <fieldset className="grid gap-3 rounded-xl border border-[var(--wl-border)] p-4">
          <legend className="px-1 text-sm font-bold">
            {t('admin.employee.create.form.rolesHeading')}
          </legend>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('admin.employee.create.form.rolesDescription')}
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked disabled /> {t('shared.profile.role.employee')}
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={manager}
              onChange={(event) => setManager(event.target.checked)}
            />
            {t('shared.profile.role.manager')}
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={hrAdministrator}
              onChange={(event) => setHrAdministrator(event.target.checked)}
            />
            {t('shared.profile.role.hrAdministrator')}
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" isDisabled={mutation.isPending}>
            {mutation.isPending
              ? t('admin.employee.create.form.pending')
              : t('admin.employee.create.form.submit')}
          </Button>
          <Link className={linkVariants({ prominence: 'quiet' })} to="/employees">
            {t('admin.employee.create.form.cancel')}
          </Link>
        </div>
      </form>
    </section>
  );
}

export function EmployeeAdministrationDetailPage() {
  const t = useWorkLedgerMessage();
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
        <PageHeader
          title={t('admin.employee.detail.loading.heading')}
          description={t('admin.employee.detail.loading.pageDescription')}
        />
        <RouteState kind="loading" title={t('admin.employee.detail.loading.title')}>
          {t('admin.employee.detail.loading.description')}
        </RouteState>
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
  const t = useWorkLedgerMessage();
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
      setMessage({ kind: 'error', text: t('admin.employee.detail.validation.effectiveDate') });
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
            ? t('admin.employee.detail.feedback.invitationReissued')
            : t('admin.employee.detail.feedback.updated'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: employeeMutationError(error, t) });
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('admin.employee.detail.page.eyebrow')}
        title={employee.displayName}
        description={t('admin.employee.detail.page.description', {
          employeeNumber: employee.employeeNumber,
          status:
            employee.status === 'ACTIVE'
              ? t('admin.employee.detail.page.active')
              : t('admin.employee.detail.page.inactive'),
        })}
      >
        {
          <Link className={linkVariants({ prominence: 'quiet' })} to="/employees">
            {t('admin.employee.detail.page.back')}
          </Link>
        }
      </PageHeader>
      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error'
              ? t('admin.employee.detail.feedback.errorTitle')
              : t('admin.employee.detail.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="grid content-start gap-4" aria-labelledby="employment-history-heading">
          <h2 id="employment-history-heading" className="m-0 text-xl font-bold">
            {t('admin.employee.detail.employment.heading')}
          </h2>
          <ol className="m-0 grid gap-3 pl-5">
            {employee.employmentHistory.map((period) => (
              <li key={period.id}>
                {t('admin.employee.detail.range', {
                  from: formatDate(period.startsOn),
                  to:
                    period.endsOn === null
                      ? t('admin.employee.common.ongoing')
                      : formatDate(period.endsOn),
                })}
              </li>
            ))}
          </ol>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('admin.employee.detail.employment.description')}
          </p>
        </Panel>

        <Panel className="grid content-start gap-4" aria-labelledby="employee-account-heading">
          <h2 id="employee-account-heading" className="m-0 text-xl font-bold">
            {t('admin.employee.detail.account.heading')}
          </h2>
          {employee.account === null ? (
            <p className="m-0">{t('admin.employee.detail.account.none')}</p>
          ) : (
            <dl className="m-0 grid gap-3">
              <div>
                <dt className="font-semibold">{t('admin.employee.detail.account.email')}</dt>
                <dd className="m-0 break-all">{employee.account.email}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t('admin.employee.detail.account.state')}</dt>
                <dd className="m-0">
                  {employee.account.active
                    ? t('shared.profile.status.active')
                    : t('shared.profile.status.inactive')}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{t('admin.employee.detail.account.invitation')}</dt>
                <dd className="m-0">
                  {employee.account.invitationPending
                    ? t('admin.employee.detail.account.invitationPending')
                    : t('admin.employee.detail.account.noInvitation')}
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
        <Alert announce={false} title={t('admin.employee.detail.reviewOnly.title')} tone="info">
          <p>{t('admin.employee.detail.reviewOnly.description')}</p>
        </Alert>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel className="grid content-start gap-5" aria-labelledby="role-management-heading">
            <h2 id="role-management-heading" className="m-0 text-xl font-bold">
              {t('admin.employee.detail.roles.heading')}
            </h2>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              {t('admin.employee.detail.roles.description')}
            </p>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked disabled /> {t('shared.profile.role.employee')}
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={manager}
                onChange={(event) => setManager(event.target.checked)}
              />{' '}
              {t('shared.profile.role.manager')}
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                checked={hrAdministrator}
                onChange={(event) => setHrAdministrator(event.target.checked)}
              />{' '}
              {t('shared.profile.role.hrAdministrator')}
            </label>
            <Button isDisabled={mutation.isPending} onPress={() => void run('roles')}>
              {t('admin.employee.detail.roles.submit')}
            </Button>
          </Panel>

          <Panel className="grid content-start gap-5" aria-labelledby="lifecycle-actions-heading">
            <h2 id="lifecycle-actions-heading" className="m-0 text-xl font-bold">
              {t('admin.employee.detail.lifecycle.heading')}
            </h2>
            <NativeDateField
              id="employment-effective-date"
              label={
                employee.status === 'ACTIVE'
                  ? t('admin.employee.detail.lifecycle.endsOn')
                  : t('admin.employee.detail.lifecycle.startsOn')
              }
              value={effectiveDate}
              onChange={setEffectiveDate}
            />
            <Button
              variant="secondary"
              isDisabled={mutation.isPending}
              onPress={() => void run(employee.status === 'ACTIVE' ? 'deactivate' : 'activate')}
            >
              {employee.status === 'ACTIVE'
                ? t('admin.employee.detail.lifecycle.deactivate')
                : t('admin.employee.detail.lifecycle.activate')}
            </Button>
            {employee.account === null ? null : (
              <Button
                variant="quiet"
                isDisabled={mutation.isPending}
                onPress={() => void run('invite')}
              >
                {t('admin.employee.detail.lifecycle.reinvite')}
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
  const t = useWorkLedgerMessage();
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
        text:
          kind === 'team'
            ? t('admin.employee.assignment.validation.team')
            : t('admin.employee.assignment.validation.manager'),
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
        text:
          kind === 'team'
            ? t('admin.employee.assignment.feedback.teamUpdated')
            : t('admin.employee.assignment.feedback.managerUpdated'),
      });
    } catch (error) {
      setMessage({ kind: 'error', text: employeeMutationError(error, t) });
    }
  }

  return (
    <section className="grid gap-6" aria-labelledby="organization-assignments-heading">
      <div>
        <h2 id="organization-assignments-heading" className="m-0 text-2xl font-bold">
          {t('admin.employee.assignment.heading')}
        </h2>
        <p className="m-0 mt-2 text-sm text-[var(--wl-text-muted)]">
          {t('admin.employee.assignment.description', {
            date: formatDate(assignments.asOfLocalDate),
          })}
        </p>
      </div>
      {message === undefined ? null : (
        <Alert
          title={
            message.kind === 'error'
              ? t('admin.employee.assignment.feedback.errorTitle')
              : t('admin.employee.assignment.feedback.successTitle')
          }
          tone={message.kind === 'error' ? 'danger' : 'success'}
        >
          <p>{message.text}</p>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <AssignmentHistoryCard
          heading={t('admin.employee.assignment.teamHistory')}
          current={
            assignments.currentTeam?.team.name ?? t('admin.employee.assignment.noCurrentTeam')
          }
          items={assignments.teamHistory.map((assignment) => ({
            endsOn: assignment.endsOn,
            id: assignment.id,
            label: assignment.team.active
              ? assignment.team.name
              : t('admin.employee.assignment.inactiveTeam', { team: assignment.team.name }),
            startsOn: assignment.startsOn,
          }))}
        />
        <AssignmentHistoryCard
          heading={t('admin.employee.assignment.managerHistory')}
          current={
            assignments.currentManager?.manager.displayName ??
            t('admin.employee.assignment.noCurrentManager')
          }
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
            <h3 className="m-0 text-xl font-bold">{t('admin.employee.assignment.changeTeam')}</h3>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="team-assignment-choice">
              {t('admin.employee.assignment.teamChange')}
              <select
                id="team-assignment-choice"
                className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
                value={teamChoice}
                onChange={(event) => setTeamChoice(event.target.value)}
              >
                <option value="__UNCHANGED">{t('admin.employee.assignment.chooseChange')}</option>
                <option value="__NONE">{t('admin.employee.assignment.noTeam')}</option>
                {assignments.activeTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <NativeDateField
              id="team-assignment-date"
              label={t('admin.employee.common.effectiveFrom')}
              min={assignments.asOfLocalDate}
              value={teamDate}
              onChange={setTeamDate}
            />
            <Button type="submit" isDisabled={mutation.isPending}>
              {t('admin.employee.assignment.saveTeam')}
            </Button>
          </form>
          <form
            className="wl-panel grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save('manager');
            }}
          >
            <h3 className="m-0 text-xl font-bold">
              {t('admin.employee.assignment.changeManager')}
            </h3>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="manager-assignment-choice">
              {t('admin.employee.assignment.managerChange')}
              <select
                id="manager-assignment-choice"
                className="min-h-11 rounded-lg border border-[var(--wl-border-strong)] bg-[var(--wl-surface-raised)] px-3"
                value={managerChoice}
                onChange={(event) => setManagerChoice(event.target.value)}
              >
                <option value="__UNCHANGED">{t('admin.employee.assignment.chooseChange')}</option>
                <option value="__NONE">{t('admin.employee.assignment.noManager')}</option>
                {assignments.eligibleManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.displayName}
                    {' ('}
                    {manager.employeeNumber}
                    {')'}
                  </option>
                ))}
              </select>
            </label>
            <NativeDateField
              id="manager-assignment-date"
              label={t('admin.employee.common.effectiveFrom')}
              min={assignments.asOfLocalDate}
              value={managerDate}
              onChange={setManagerDate}
            />
            <Button type="submit" isDisabled={mutation.isPending}>
              {t('admin.employee.assignment.saveManager')}
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
  const t = useWorkLedgerMessage();
  return (
    <Panel className="grid content-start gap-4">
      <h3 className="m-0 text-xl font-bold">{heading}</h3>
      <p className="m-0 font-semibold">{t('admin.employee.assignment.current', { current })}</p>
      {items.length === 0 ? (
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('admin.employee.assignment.noHistory')}
        </p>
      ) : (
        <ol className="m-0 grid gap-2 pl-5">
          {items.map((item) => (
            <li key={item.id}>
              {t('admin.employee.assignment.historyItem', {
                from: formatDate(item.startsOn),
                label: item.label,
                to:
                  item.endsOn === null
                    ? t('admin.employee.common.ongoing')
                    : formatDate(item.endsOn),
              })}
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
  t: ReturnType<typeof useWorkLedgerMessage>,
) {
  const errors: Record<string, string> = {};
  if (input.displayName.trim() === '') {
    errors['display-name'] = t('admin.employee.create.validation.displayName');
  }
  if (input.employeeNumber.trim() === '') {
    errors['employee-number'] = t('admin.employee.create.validation.employeeNumber');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(input.email.trim())) {
    errors['email'] = t('admin.employee.create.validation.accountEmail');
  }
  if (input.employmentStartsOn === '') {
    errors['employment-starts-on'] = t('admin.employee.create.validation.employmentStartsOn');
  }
  return errors;
}

function employeeMutationError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'AUTH_SESSION_NOT_FRESH') return t('admin.employee.error.freshSession');
    if (error.code === 'ACCESS_DENIED') return t('admin.employee.error.accessDenied');
    if (error.code === 'ACCOUNT_EMAIL_ALREADY_EXISTS') return t('admin.employee.error.emailExists');
    if (error.code === 'EMPLOYEE_NUMBER_ALREADY_EXISTS')
      return t('admin.employee.error.employeeNumberExists');
    if (error.code === 'EMPLOYMENT_PERIOD_OVERLAP')
      return t('admin.employee.error.employmentOverlap');
    if (error.code === 'ASSIGNMENT_EFFECTIVE_DATE_INVALID')
      return t('admin.employee.error.assignmentDateInvalid');
    if (error.code === 'ASSIGNMENT_STATE_CONFLICT')
      return t('admin.employee.error.assignmentConflict');
    if (error.code === 'MANAGER_ASSIGNMENT_CYCLE') return t('admin.employee.error.managerCycle');
    if (error.code === 'MANAGER_NOT_ELIGIBLE') return t('admin.employee.error.managerNotEligible');
    if (error.code === 'TEAM_NAME_ALREADY_EXISTS') return t('admin.employee.error.teamNameExists');
    if (error.code === 'TEAM_STATE_CONFLICT') return t('admin.employee.error.teamStateConflict');
    if (error.code === 'EMPLOYEE_STATE_CONFLICT')
      return t('admin.employee.error.employeeStateConflict');
  }
  return t('admin.employee.error.generic');
}

function focusSummary(ref: { current: HTMLDivElement | null }) {
  window.requestAnimationFrame(() => ref.current?.focus());
}

function formatDate(value: string) {
  return formatDateOnly('en-GB', value, { dateStyle: 'medium' });
}
