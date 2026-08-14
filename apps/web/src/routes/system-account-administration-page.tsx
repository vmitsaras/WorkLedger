import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button, TextField } from '@workledger/ui';

import {
  ApiClientError,
  createTechnicalAccount,
  revokeSystemAccountSession,
  setSystemAccountState,
  setSystemAdministratorRole,
} from '../app/api-client.js';
import { systemAccountPageQuery } from '../app/query.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function SystemAccountAdministrationPage() {
  const queryClient = useQueryClient();
  const accountsQuery = useQuery(systemAccountPageQuery({ limit: 20, page: 1 }));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const createMutation = useMutation({ mutationFn: createTechnicalAccount });
  const actionMutation = useMutation({
    mutationFn: async (
      input:
        | Readonly<{ accountId: string; active: boolean; kind: 'state' }>
        | Readonly<{ accountId: string; enabled: boolean; kind: 'role' }>
        | Readonly<{ accountId: string; kind: 'session'; sessionId: string }>,
    ) => {
      if (input.kind === 'state') return setSystemAccountState(input.accountId, input.active);
      if (input.kind === 'role') return setSystemAdministratorRole(input.accountId, input.enabled);
      return revokeSystemAccountSession(input.accountId, input.sessionId);
    },
  });

  if (accountsQuery.isError) throw accountsQuery.error;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (name.trim() === '') errors['technical-account-name'] = 'Enter an account name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
      errors['technical-account-email'] = 'Enter a valid account email address.';
    }
    setFieldErrors(errors);
    setFormError(undefined);
    setStatus(undefined);
    if (Object.keys(errors).length > 0) {
      window.requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    try {
      await createMutation.mutateAsync({
        email: email.trim().toLocaleLowerCase('en-US'),
        name: name.trim(),
        systemAdministrator: true,
      });
      setName('');
      setEmail('');
      await queryClient.invalidateQueries({ queryKey: ['administration', 'system-accounts'] });
      setStatus('Technical account created and a 24-hour invitation was issued.');
    } catch (error) {
      setFormError(systemMutationError(error));
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  async function runAction(input: Parameters<typeof actionMutation.mutateAsync>[0]) {
    setStatus(undefined);
    setFormError(undefined);
    try {
      await actionMutation.mutateAsync(input);
      await queryClient.invalidateQueries({ queryKey: ['administration', 'system-accounts'] });
      setStatus('The technical account state was updated and affected sessions were revoked.');
    } catch (error) {
      setFormError(systemMutationError(error));
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="System administration"
        title="Accounts and sessions"
        description="Manage technical account access, system-administrator authority, and sessions without opening employee or HR domain records."
      />

      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      {status === undefined ? null : (
        <div role="status" className="wl-alert wl-alert-success rounded-xl border p-4">
          {status}
        </div>
      )}

      <section
        className="wl-panel grid max-w-3xl gap-5"
        aria-labelledby="create-technical-account-heading"
      >
        <div className="grid gap-2">
          <h2 id="create-technical-account-heading" className="m-0 text-xl font-bold">
            Invite technical administrator
          </h2>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Technical accounts have no fabricated employee record. HR, attendance, balance, absence,
            and domain-audit access are not granted here.
          </p>
        </div>
        <form className="grid gap-5" noValidate onSubmit={submit}>
          <TextField
            id="technical-account-name"
            label="Account name"
            value={name}
            onChange={setName}
            isInvalid={fieldErrors['technical-account-name'] !== undefined}
            errorMessage={fieldErrors['technical-account-name']}
            autoComplete="name"
          />
          <TextField
            id="technical-account-email"
            type="email"
            label="Account email"
            value={email}
            onChange={setEmail}
            isInvalid={fieldErrors['technical-account-email'] !== undefined}
            errorMessage={fieldErrors['technical-account-email']}
            autoComplete="email"
          />
          <Button type="submit" isDisabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create and invite technical account'}
          </Button>
        </form>
      </section>

      <section className="grid gap-5" aria-labelledby="account-directory-heading">
        <div className="grid gap-2">
          <h2 id="account-directory-heading" className="m-0 text-2xl font-bold">
            Account directory
          </h2>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Employee-linked is shown only to prevent accidental technical lifecycle changes. No
            employee number, employment status, team, schedule, balance, request, or sickness data
            appears in this view.
          </p>
        </div>
        {accountsQuery.isPending ? (
          <div className="wl-panel" aria-busy="true">
            Loading accounts…
          </div>
        ) : accountsQuery.data.items.length === 0 ? (
          <div className="wl-panel">No accounts are associated with this installation.</div>
        ) : (
          <ul className="m-0 grid list-none gap-5 p-0" role="list">
            {accountsQuery.data.items.map((account) => (
              <li key={account.id} className="wl-panel grid gap-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <h3 className="m-0 text-xl font-bold">{account.name}</h3>
                    <p className="m-0 break-all text-sm text-[var(--wl-text-muted)]">
                      {account.email}
                    </p>
                  </div>
                  <p className="m-0 font-semibold">
                    {account.active
                      ? 'Active account'
                      : account.invitationPending
                        ? 'Invitation pending'
                        : 'Inactive account'}
                    {' — '}
                    {account.systemAdministrator ? 'System administrator' : 'No system role'}
                    {account.employeeLinked ? ' — Employee-linked' : ' — Technical-only'}
                  </p>
                </div>

                {!account.privilegedActionsAllowed ? (
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    This is your current account. Use Profile for your own sessions; self role and
                    account-state changes are prohibited.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      isDisabled={actionMutation.isPending}
                      onPress={() =>
                        void runAction({
                          accountId: account.id,
                          active: !account.active,
                          kind: 'state',
                        })
                      }
                    >
                      {account.active ? 'Deactivate account' : 'Activate account'}
                    </Button>
                    <Button
                      variant="quiet"
                      isDisabled={actionMutation.isPending}
                      onPress={() =>
                        void runAction({
                          accountId: account.id,
                          enabled: !account.systemAdministrator,
                          kind: 'role',
                        })
                      }
                    >
                      {account.systemAdministrator ? 'Revoke system role' : 'Assign system role'}
                    </Button>
                  </div>
                )}

                <section className="grid gap-3" aria-labelledby={`sessions-${account.id}`}>
                  <h4 id={`sessions-${account.id}`} className="m-0 text-base font-bold">
                    Active sessions
                  </h4>
                  {account.sessions.length === 0 ? (
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">No active sessions.</p>
                  ) : (
                    <ul className="m-0 grid list-none gap-3 p-0" role="list">
                      {account.sessions.map((session) => (
                        <li
                          key={session.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--wl-border)] p-3"
                        >
                          <span>
                            <strong>{session.deviceSummary}</strong>
                            {' — last active '}
                            {DATE_TIME_FORMATTER.format(new Date(session.lastActiveAt))}
                          </span>
                          {account.privilegedActionsAllowed ? (
                            <Button
                              variant="quiet"
                              isDisabled={actionMutation.isPending}
                              onPress={() =>
                                void runAction({
                                  accountId: account.id,
                                  kind: 'session',
                                  sessionId: session.id,
                                })
                              }
                            >
                              Revoke session
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function systemMutationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'AUTH_SESSION_NOT_FRESH')
      return 'Sign out and sign in again before making this privileged change.';
    if (error.code === 'ACCESS_DENIED')
      return 'You no longer have technical authority for this action, or the action targets your own account.';
    if (error.code === 'ACCOUNT_EMAIL_ALREADY_EXISTS')
      return 'That account email is already in use.';
    if (error.code === 'ACCOUNT_STATE_CONFLICT')
      return 'The account state changed. Refresh and review the current account.';
  }
  return 'The technical account change could not be completed. Try again.';
}
