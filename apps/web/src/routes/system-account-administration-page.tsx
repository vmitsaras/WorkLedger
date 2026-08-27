import { useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_LOCALE, type SupportedLocale } from '@workledger/contracts';
import { translateStaticMessage, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, StatusBadge, TextField } from '@workledger/ui';

import {
  ApiClientError,
  createTechnicalAccount,
  revokeSystemAccountSession,
  setSystemAccountState,
  setSystemAdministratorRole,
} from '../app/api-client.js';
import { systemAccountPageQuery } from '../app/query.js';
import { useOptionalWebLocale } from '../app/locale.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';
import { LanguageSelect } from '../components/language-select.js';

export function SystemAccountAdministrationPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const queryClient = useQueryClient();
  const accountLocale = useOptionalWebLocale();
  const accountsQuery = useQuery(systemAccountPageQuery({ limit: 20, page: 1 }));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);
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
    if (name.trim() === '') {
      errors['technical-account-name'] = t('system.accounts.validation.accountName');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())) {
      errors['technical-account-email'] = t('system.accounts.validation.accountEmail');
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
        locale,
        name: name.trim(),
        systemAdministrator: true,
      });
      setName('');
      setEmail('');
      setLocale(DEFAULT_LOCALE);
      await queryClient.invalidateQueries({ queryKey: ['administration', 'system-accounts'] });
      setStatus(t('system.accounts.feedback.created'));
    } catch (error) {
      setFormError(systemMutationError(error, t));
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  async function runAction(input: Parameters<typeof actionMutation.mutateAsync>[0]) {
    setStatus(undefined);
    setFormError(undefined);
    try {
      await actionMutation.mutateAsync(input);
      await queryClient.invalidateQueries({ queryKey: ['administration', 'system-accounts'] });
      setStatus(t('system.accounts.feedback.updated'));
    } catch (error) {
      setFormError(systemMutationError(error, t));
      window.requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('system.accounts.page.eyebrow')}
        title={t('shared.route.title.systemAccounts')}
        description={t('system.accounts.page.description')}
      />

      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      {status === undefined ? null : (
        <Alert title={t('system.accounts.feedback.title')} tone="success">
          <p>{status}</p>
        </Alert>
      )}

      <Panel className="grid max-w-3xl gap-5" aria-labelledby="create-technical-account-heading">
        <div className="grid gap-2">
          <h2 id="create-technical-account-heading" className="m-0 text-xl font-bold">
            {t('system.accounts.create.heading')}
          </h2>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('system.accounts.create.description')}
          </p>
        </div>
        <form className="grid gap-5" noValidate onSubmit={submit}>
          <TextField
            id="technical-account-name"
            label={t('system.accounts.create.accountName')}
            value={name}
            onChange={setName}
            isInvalid={fieldErrors['technical-account-name'] !== undefined}
            errorMessage={fieldErrors['technical-account-name']}
            autoComplete="name"
          />
          <TextField
            id="technical-account-email"
            type="email"
            label={t('system.accounts.create.accountEmail')}
            value={email}
            onChange={setEmail}
            isInvalid={fieldErrors['technical-account-email'] !== undefined}
            errorMessage={fieldErrors['technical-account-email']}
            autoComplete="email"
          />
          <LanguageSelect
            description={
              accountLocale === null
                ? t('system.accounts.create.invitationDescription')
                : translateStaticMessage(
                    accountLocale.runtime,
                    'shared.locale.invitationDescription',
                  )
            }
            id="technical-account-invitation-language"
            label={t('system.accounts.create.invitationLanguage')}
            value={locale}
            onChange={setLocale}
          />
          <Button type="submit" isDisabled={createMutation.isPending}>
            {createMutation.isPending
              ? t('system.accounts.create.pending')
              : t('system.accounts.create.action')}
          </Button>
        </form>
      </Panel>

      <section className="grid gap-5" aria-labelledby="account-directory-heading">
        <div className="grid gap-2">
          <h2 id="account-directory-heading" className="m-0 text-2xl font-bold">
            {t('system.accounts.directory.heading')}
          </h2>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            {t('system.accounts.directory.description')}
          </p>
        </div>
        {accountsQuery.isPending ? (
          <RouteState kind="loading" title={t('system.accounts.loading.title')}>
            {t('system.accounts.loading.description')}
          </RouteState>
        ) : accountsQuery.data.items.length === 0 ? (
          <RouteState kind="empty" title={t('system.accounts.empty.title')}>
            {t('system.accounts.empty.description')}
          </RouteState>
        ) : (
          <ul className="m-0 grid list-none gap-5 p-0" role="list">
            {accountsQuery.data.items.map((account) => (
              <li key={account.id}>
                <Panel as="article" className="grid gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-1">
                      <h3 className="m-0 text-xl font-bold">{account.name}</h3>
                      <p className="m-0 break-all text-sm text-[var(--wl-text-muted)]">
                        {account.email}
                      </p>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      aria-label={t('system.accounts.directory.stateAndAuthority')}
                    >
                      <StatusBadge
                        tone={
                          account.active
                            ? 'success'
                            : account.invitationPending
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {accountStateLabel(account.active, account.invitationPending, t)}
                      </StatusBadge>
                      <StatusBadge tone={account.systemAdministrator ? 'warning' : 'neutral'}>
                        {account.systemAdministrator
                          ? t('shared.profile.role.systemAdministrator')
                          : t('system.accounts.directory.noSystemRole')}
                      </StatusBadge>
                      <StatusBadge tone="neutral">
                        {account.employeeLinked
                          ? t('system.accounts.directory.employeeLinked')
                          : t('system.accounts.directory.technicalOnly')}
                      </StatusBadge>
                    </div>
                  </div>

                  {!account.privilegedActionsAllowed ? (
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                      {t('system.accounts.directory.currentAccount')}
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
                        {account.active
                          ? t('system.accounts.action.deactivateAccount')
                          : t('system.accounts.action.activateAccount')}
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
                        {account.systemAdministrator
                          ? t('system.accounts.action.revokeSystemRole')
                          : t('system.accounts.action.assignSystemRole')}
                      </Button>
                    </div>
                  )}

                  <section className="grid gap-3" aria-labelledby={`sessions-${account.id}`}>
                    <h4 id={`sessions-${account.id}`} className="m-0 text-base font-bold">
                      {t('system.accounts.directory.activeSessions')}
                    </h4>
                    {account.sessions.length === 0 ? (
                      <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                        {t('system.accounts.directory.noActiveSessions')}
                      </p>
                    ) : (
                      <ul className="m-0 grid list-none gap-3 p-0" role="list">
                        {account.sessions.map((session) => (
                          <li
                            key={session.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--wl-border)] p-3"
                          >
                            <span>
                              <strong>{sessionDevicePresentation(session, t)}</strong>
                              {t('system.accounts.directory.lastActive', {
                                value: new Intl.DateTimeFormat(runtime.locale, {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }).format(new Date(session.lastActiveAt)),
                              })}
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
                                {t('shared.profile.session.revoke')}
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function accountStateLabel(
  active: boolean,
  invitationPending: boolean,
  t: ReturnType<typeof useWorkLedgerMessage>,
) {
  if (active) return t('system.accounts.directory.activeAccount');
  if (invitationPending) return t('system.accounts.directory.invitationPending');
  return t('system.accounts.directory.inactiveAccount');
}

function sessionDevicePresentation(
  session: Readonly<{ browser: string; platform: string | null }>,
  t: ReturnType<typeof useWorkLedgerMessage>,
) {
  const browserKey = {
    BROWSER: 'shared.profile.session.deviceLabels.browser',
    CHROME: 'shared.profile.session.deviceLabels.chrome',
    EDGE: 'shared.profile.session.deviceLabels.edge',
    FIREFOX: 'shared.profile.session.deviceLabels.firefox',
    SAFARI: 'shared.profile.session.deviceLabels.safari',
    UNRECOGNIZED: 'shared.profile.session.deviceLabels.unrecognized',
  } as const satisfies Readonly<Record<string, MessageKey>>;
  const browser = t(
    (browserKey as Readonly<Record<string, MessageKey>>)[session.browser] ??
      'shared.profile.session.deviceLabels.unrecognized',
  );
  if (session.browser === 'UNRECOGNIZED' || session.platform === null) return browser;
  const platformKey = {
    ANDROID: 'shared.profile.session.platform.android',
    IOS: 'shared.profile.session.platform.ios',
    LINUX: 'shared.profile.session.platform.linux',
    MACOS: 'shared.profile.session.platform.macos',
    WINDOWS: 'shared.profile.session.platform.windows',
  } as const satisfies Readonly<Record<string, MessageKey>>;
  return t('shared.profile.session.device', {
    browser,
    platform: t(
      (platformKey as Readonly<Record<string, MessageKey>>)[session.platform] ??
        'shared.profile.session.deviceLabels.unrecognized',
    ),
  });
}

function systemMutationError(error: unknown, t: ReturnType<typeof useWorkLedgerMessage>): string {
  if (error instanceof ApiClientError) {
    if (error.code === 'AUTH_SESSION_NOT_FRESH') return t('system.accounts.error.freshSession');
    if (error.code === 'ACCESS_DENIED') return t('system.accounts.error.accessDenied');
    if (error.code === 'ACCOUNT_EMAIL_ALREADY_EXISTS')
      return t('system.accounts.error.emailExists');
    if (error.code === 'ACCOUNT_STATE_CONFLICT') return t('system.accounts.error.stateConflict');
  }
  return t('system.accounts.error.generic');
}
