import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import type { ApplicationRole, SelfSessionSummary } from '@workledger/contracts';
import { Button } from '@workledger/ui';

import { ApiClientError, clearSessionMemory, revokeSelfSession } from '../app/api-client.js';
import { selfProfileQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

const ROLE_LABELS: Readonly<Record<ApplicationRole, string>> = {
  EMPLOYEE: 'Employee',
  HR_ADMINISTRATOR: 'HR administrator',
  MANAGER: 'Manager',
  SYSTEM_ADMINISTRATOR: 'System administrator',
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function ProfilePage() {
  const profileQuery = useQuery(selfProfileQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Readonly<{ kind: 'error' | 'success'; message: string }>>();
  const revokeMutation = useMutation({ mutationFn: revokeSelfSession });

  if (profileQuery.isPending) {
    return (
      <section className="grid gap-6" aria-busy="true">
        <PageHeader title="Profile" description="Loading your account and active sessions…" />
      </section>
    );
  }
  if (profileQuery.isError) throw profileQuery.error;
  const profile = profileQuery.data;

  async function handleRevoke(session: SelfSessionSummary) {
    setStatus(undefined);
    try {
      const result = await revokeMutation.mutateAsync(session.id);
      if (result.revokedCurrentSession) {
        clearSessionMemory();
        queryClient.clear();
        setPendingSignInNotice('SIGNED_OUT');
        await navigate('/sign-in', { replace: true });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['self', 'profile'] });
      setStatus({ kind: 'success', message: `${session.deviceSummary} was signed out.` });
    } catch (error) {
      setStatus({ kind: 'error', message: revokeErrorMessage(error) });
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Review your account context and active sessions. Employment and role information is read-only here."
      />

      {status === undefined ? null : (
        <div
          role={status.kind === 'error' ? 'alert' : 'status'}
          className={`wl-alert ${status.kind === 'error' ? 'wl-alert-error' : 'wl-alert-success'} rounded-xl border p-4 text-sm`}
        >
          {status.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section
          className="wl-panel grid content-start gap-5"
          aria-labelledby="account-details-title"
        >
          <div>
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              Account details
            </p>
            <h2 id="account-details-title" className="m-0 mt-1 text-2xl font-bold">
              {profile.account.name}
            </h2>
          </div>
          <DescriptionList
            entries={[
              ['Email address', profile.account.email],
              ['Organization', profile.organization.name],
              ['Application roles', profile.roles.map((role) => ROLE_LABELS[role]).join(', ')],
            ]}
          />
          <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
            Account, role, and employee facts are managed through authorized administration
            workflows and cannot be edited from Profile.
          </p>
        </section>

        <section
          className="wl-panel grid content-start gap-5"
          aria-labelledby="employee-summary-title"
        >
          <div>
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              Employee summary
            </p>
            <h2 id="employee-summary-title" className="m-0 mt-1 text-2xl font-bold">
              {profile.employee?.displayName ?? 'No employee profile linked'}
            </h2>
          </div>
          {profile.employee === null ? (
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              This technical account has no employee self-service profile.
            </p>
          ) : (
            <DescriptionList
              entries={[
                ['Employee number', profile.employee.employeeNumber],
                ['Employment status', titleCase(profile.employee.status)],
              ]}
            />
          )}
        </section>
      </div>

      <section className="grid gap-5" aria-labelledby="active-sessions-title">
        <div className="grid gap-2">
          <h2 id="active-sessions-title" className="m-0 text-2xl font-bold">
            Active sessions
          </h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">
            Device labels are deliberately approximate. WorkLedger does not expose complete browser
            headers or IP addresses here.
          </p>
        </div>
        {profile.sessions.length === 0 ? (
          <div className="wl-panel">
            <p className="m-0">No active sessions are available.</p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0" role="list">
            {profile.sessions.map((session) => (
              <li
                key={session.id}
                className="wl-panel flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="grid gap-1">
                  <h3 className="m-0 text-lg font-bold">
                    {session.deviceSummary}
                    {session.current ? ' — Current session' : ''}
                  </h3>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    Last active {formatDateTime(session.lastActiveAt)}
                  </p>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                    Expires {formatDateTime(session.expiresAt)}
                  </p>
                </div>
                <Button
                  variant={session.current ? 'secondary' : 'quiet'}
                  isDisabled={revokeMutation.isPending}
                  onPress={() => void handleRevoke(session)}
                >
                  {revokeMutation.isPending && revokeMutation.variables === session.id
                    ? 'Signing out…'
                    : session.current
                      ? 'Sign out this session'
                      : 'Revoke session'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function DescriptionList({
  entries,
}: Readonly<{ entries: readonly (readonly [string, string])[] }>) {
  return (
    <dl className="m-0 grid gap-4">
      {entries.map(([term, description]) => (
        <div
          key={term}
          className="grid gap-1 border-b border-[var(--wl-border)] pb-3 last:border-0 last:pb-0"
        >
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{term}</dt>
          <dd className="m-0 break-words text-base text-[var(--wl-text)]">
            {description || 'None assigned'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLocaleLowerCase('en-US');
}

function revokeErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'AUTH_SESSION_NOT_FRESH') {
    return 'Sign out and sign in again before revoking another session.';
  }
  if (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  ) {
    return 'Your session expired. Sign in again to continue.';
  }
  return 'WorkLedger could not revoke that session. Refresh the profile and try again.';
}
