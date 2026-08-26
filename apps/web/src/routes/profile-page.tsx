import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import type {
  SelfContext,
  SelfProfile,
  SelfSessionSummary,
  SupportedLocale,
} from '@workledger/contracts';
import {
  formatInstant,
  formatList,
  translateStaticMessage,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, Panel, RouteState, StatusBadge } from '@workledger/ui';

import {
  ApiClientError,
  clearSessionMemory,
  revokeSelfSession,
  updateSelfLocale,
} from '../app/api-client.js';
import { useWebLocale } from '../app/locale.js';
import { selfContextQuery, selfProfileQuery } from '../app/query.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';
import { LanguageSelect } from '../components/language-select.js';

type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

export function ProfilePage() {
  const t = useWorkLedgerMessage();
  const profileQuery = useQuery(selfProfileQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const locale = useWebLocale();
  const [status, setStatus] =
    useState<Readonly<{ kind: 'error' | 'success'; message: string; title: string }>>();
  const revokeMutation = useMutation({ mutationFn: revokeSelfSession });
  const localeMutation = useMutation({ mutationFn: updateSelfLocale });

  if (profileQuery.isPending) {
    return (
      <section className="grid gap-6" aria-busy="true">
        <PageHeader
          title={t('shared.profile.title')}
          description={t('shared.profile.description')}
        />
        <RouteState kind="loading" title={t('shared.profile.loading.title')}>
          <p>{t('shared.profile.loading.description')}</p>
        </RouteState>
      </section>
    );
  }
  if (profileQuery.isError || profileQuery.data === undefined) {
    if (isAuthenticationError(profileQuery.error)) throw profileQuery.error;
    return (
      <section className="grid gap-6">
        <PageHeader
          title={t('shared.profile.title')}
          description={t('shared.profile.description')}
        />
        <RouteState
          actions={
            <Button variant="secondary" onPress={() => void profileQuery.refetch()}>
              {t('shared.action.tryAgain')}
            </Button>
          }
          kind="error"
          title={t('shared.profile.unavailable.title')}
        >
          <p>{t('shared.profile.unavailable.description')}</p>
        </RouteState>
      </section>
    );
  }
  const profile = profileQuery.data;

  async function handleRevoke(session: SelfSessionSummary) {
    setStatus(undefined);
    try {
      const result = await revokeMutation.mutateAsync(session.id);
      if (result.revokedCurrentSession) {
        clearSessionMemory();
        queryClient.clear();
        try {
          await locale.activateSignedOutLocale();
        } catch {
          // Session revocation remains authoritative if a signed-out catalog cannot load.
        }
        setPendingSignInNotice('SIGNED_OUT');
        await navigate('/sign-in', { replace: true });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['self', 'profile'] });
      const device = sessionDevicePresentation(session, t);
      setStatus({
        kind: 'success',
        message: t('shared.profile.session.revoked', { device }),
        title: t('shared.profile.status.sessionRevoked.title'),
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: revokeErrorMessage(error, t),
        title: t('shared.profile.status.sessionNotRevoked.title'),
      });
    }
  }

  async function handleLocaleChange(nextLocale: SupportedLocale) {
    if (nextLocale === profile.locale) return;
    setStatus(undefined);
    const previousRuntime = locale.runtime;
    const contextKey = selfContextQuery().queryKey;
    const profileKey = selfProfileQuery().queryKey;
    const previousContext = queryClient.getQueryData<SelfContext>(contextKey);
    const previousProfile = queryClient.getQueryData<SelfProfile>(profileKey);

    try {
      const nextRuntime = await locale.activateLocale(nextLocale);
      queryClient.setQueryData<SelfContext>(contextKey, (current) =>
        current === undefined ? current : { ...current, locale: nextLocale },
      );
      queryClient.setQueryData<SelfProfile>(profileKey, (current) =>
        current === undefined ? current : { ...current, locale: nextLocale },
      );
      await localeMutation.mutateAsync(nextLocale);
      setStatus({
        kind: 'success',
        message: translateStaticMessage(nextRuntime, 'shared.locale.accountSaved'),
        title: translateStaticMessage(nextRuntime, 'shared.locale.accountSavedTitle'),
      });
    } catch {
      locale.restoreLocale(previousRuntime);
      queryClient.setQueryData(contextKey, previousContext);
      queryClient.setQueryData(profileKey, previousProfile);
      setStatus({
        kind: 'error',
        message: translateStaticMessage(previousRuntime, 'shared.locale.accountSaveFailed'),
        title: translateStaticMessage(previousRuntime, 'shared.locale.accountSaveFailedTitle'),
      });
    }
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        eyebrow={t('shared.navigation.account')}
        title={t('shared.profile.title')}
        description={t('shared.profile.description')}
      />

      {status === undefined ? null : (
        <div aria-live="polite" role="status">
          <Alert
            announce={false}
            title={status.title}
            tone={status.kind === 'error' ? 'danger' : 'success'}
          >
            <p className="m-0">{status.message}</p>
          </Alert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="grid content-start gap-5" aria-labelledby="account-details-title">
          <div>
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              {t('shared.profile.account.details')}
            </p>
            <h2 id="account-details-title" className="m-0 mt-1 text-2xl font-bold">
              {profile.account.name}
            </h2>
          </div>
          <DescriptionList
            entries={[
              [t('shared.profile.field.email'), profile.account.email],
              [t('shared.profile.field.organization'), profile.organization.name],
              [
                t('shared.profile.field.applicationRoles'),
                formatList(
                  profile.locale,
                  profile.roles.map((role) => rolePresentation(role, t)),
                ),
              ],
            ]}
            noneAssignedLabel={t('shared.profile.noneAssigned')}
          />
          <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('shared.profile.account.readOnlyHelp')}
          </p>
        </Panel>

        <Panel className="grid content-start gap-5" aria-labelledby="employee-summary-title">
          <div>
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              {t('shared.profile.employee.details')}
            </p>
            <h2 id="employee-summary-title" className="m-0 mt-1 text-2xl font-bold">
              {profile.employee?.displayName ?? t('shared.profile.employee.notLinked')}
            </h2>
          </div>
          {profile.employee === null ? (
            <p className="m-0 text-sm leading-6 text-[var(--wl-text-muted)]">
              {t('shared.profile.employee.technicalAccount')}
            </p>
          ) : (
            <DescriptionList
              entries={[
                [t('shared.profile.field.employeeNumber'), profile.employee.employeeNumber],
                [
                  t('shared.profile.field.employmentStatus'),
                  employeeStatus(profile.employee.status, t),
                ],
              ]}
              noneAssignedLabel={t('shared.profile.noneAssigned')}
            />
          )}
        </Panel>

        <Panel
          className="grid content-start gap-5 xl:col-span-2"
          aria-labelledby="language-preference-title"
        >
          <div>
            <p className="m-0 text-sm font-bold uppercase tracking-[0.1em] text-[var(--wl-text-muted)]">
              {t('shared.profile.preference.eyebrow')}
            </p>
            <h2 id="language-preference-title" className="m-0 mt-1 text-2xl font-bold">
              {t('shared.profile.preference.title')}
            </h2>
          </div>
          <div className="max-w-md">
            <LanguageSelect
              description={translateStaticMessage(
                locale.runtime,
                'shared.locale.accountDescription',
              )}
              disabled={localeMutation.isPending}
              id="account-language"
              label={translateStaticMessage(locale.runtime, 'shared.locale.label')}
              restoreFocusAfterDisabled
              value={profile.locale}
              onChange={(nextLocale) => void handleLocaleChange(nextLocale)}
            />
          </div>
        </Panel>
      </div>

      <section className="grid gap-5" aria-labelledby="active-sessions-title">
        <div className="grid gap-2">
          <h2 id="active-sessions-title" className="m-0 text-2xl font-bold">
            {t('shared.profile.sessions.title')}
          </h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-[var(--wl-text-muted)]">
            {t('shared.profile.sessions.description')}
          </p>
        </div>
        {profile.sessions.length === 0 ? (
          <RouteState kind="empty" title={t('shared.profile.sessions.empty.title')}>
            <p>{t('shared.profile.sessions.empty.description')}</p>
          </RouteState>
        ) : (
          <ul className="m-0 grid list-none gap-4 p-0" role="list">
            {profile.sessions.map((session) => (
              <li key={session.id}>
                <Panel
                  as="article"
                  className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-lg font-bold">
                        {sessionDevicePresentation(session, t)}
                      </h3>
                      {session.current ? (
                        <StatusBadge tone="info">{t('shared.profile.session.current')}</StatusBadge>
                      ) : null}
                    </div>
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                      {t('shared.profile.session.lastActive', {
                        value: formatInstant(
                          profile.locale,
                          session.lastActiveAt,
                          profile.timeZone,
                        ),
                      })}
                    </p>
                    <p className="m-0 text-sm text-[var(--wl-text-muted)]">
                      {t('shared.profile.session.expires', {
                        value: formatInstant(profile.locale, session.expiresAt, profile.timeZone),
                      })}
                    </p>
                  </div>
                  <Button
                    variant={session.current ? 'secondary' : 'quiet'}
                    isDisabled={revokeMutation.isPending}
                    onPress={() => void handleRevoke(session)}
                  >
                    {revokeMutation.isPending && revokeMutation.variables === session.id
                      ? t('shared.profile.session.signingOut')
                      : session.current
                        ? t('shared.profile.session.signOutCurrent')
                        : t('shared.profile.session.revoke')}
                  </Button>
                </Panel>
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
  noneAssignedLabel,
}: Readonly<{
  entries: readonly (readonly [string, string])[];
  noneAssignedLabel: string;
}>) {
  return (
    <dl className="m-0 grid gap-4">
      {entries.map(([term, description]) => (
        <div
          key={term}
          className="grid gap-1 border-b border-[var(--wl-border)] pb-3 last:border-0 last:pb-0"
        >
          <dt className="text-sm font-semibold text-[var(--wl-text-muted)]">{term}</dt>
          <dd className="m-0 break-words text-base text-[var(--wl-text)]">
            {description || noneAssignedLabel}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function rolePresentation(role: SelfContext['roles'][number], t: MessageTranslator): string {
  switch (role) {
    case 'EMPLOYEE':
      return t('shared.profile.role.employee');
    case 'HR_ADMINISTRATOR':
      return t('shared.profile.role.hrAdministrator');
    case 'MANAGER':
      return t('shared.profile.role.manager');
    case 'SYSTEM_ADMINISTRATOR':
      return t('shared.profile.role.systemAdministrator');
  }
}

function employeeStatus(
  status: NonNullable<SelfContext['employee']>['status'],
  t: MessageTranslator,
): string {
  return status === 'ACTIVE'
    ? t('shared.profile.status.active')
    : t('shared.profile.status.inactive');
}

function sessionDevicePresentation(
  session: Pick<SelfSessionSummary, 'browser' | 'platform'>,
  t: MessageTranslator,
): string {
  const browserKey = {
    BROWSER: 'shared.profile.session.deviceLabels.browser',
    CHROME: 'shared.profile.session.deviceLabels.chrome',
    EDGE: 'shared.profile.session.deviceLabels.edge',
    FIREFOX: 'shared.profile.session.deviceLabels.firefox',
    SAFARI: 'shared.profile.session.deviceLabels.safari',
    UNRECOGNIZED: 'shared.profile.session.deviceLabels.unrecognized',
  } as const satisfies Readonly<Record<SelfSessionSummary['browser'], MessageKey>>;
  const browser = t(browserKey[session.browser]);
  if (session.browser === 'UNRECOGNIZED' || session.platform === null) return browser;
  const platformKey = {
    ANDROID: 'shared.profile.session.platform.android',
    IOS: 'shared.profile.session.platform.ios',
    LINUX: 'shared.profile.session.platform.linux',
    MACOS: 'shared.profile.session.platform.macos',
    WINDOWS: 'shared.profile.session.platform.windows',
  } as const satisfies Readonly<Record<NonNullable<SelfSessionSummary['platform']>, MessageKey>>;
  return t('shared.profile.session.device', {
    browser,
    platform: t(platformKey[session.platform]),
  });
}

function revokeErrorMessage(error: unknown, t: MessageTranslator): string {
  if (error instanceof ApiClientError && error.code === 'AUTH_SESSION_NOT_FRESH') {
    return t('shared.profile.status.sessionNotRevoked.freshSession');
  }
  if (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  ) {
    return t('shared.profile.status.sessionNotRevoked.sessionExpired');
  }
  return t('shared.profile.status.sessionNotRevoked.description');
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
