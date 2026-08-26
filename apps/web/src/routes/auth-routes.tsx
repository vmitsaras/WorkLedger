import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import {
  DEFAULT_COMPANY_IDENTITY,
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
  type SupportedLocale,
} from '@workledger/contracts';
import { translateStaticMessage, type MessageArguments, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Button, linkVariants, TextField } from '@workledger/ui';

import {
  ApiClientError,
  activateAccountInvitation,
  clearSessionMemory,
  requestPasswordReset,
  resetPassword,
  signIn,
} from '../app/api-client.js';
import { companyIdentityQuery, selfContextQuery } from '../app/query.js';
import {
  clearInvitationGrant,
  clearResetGrant,
  readInvitationGrant,
  readResetGrant,
} from '../app/reset-grant.js';
import {
  clearPendingSignInNotice,
  readPendingSignInNotice,
  setPendingSignInNotice,
} from '../app/session-notice.js';
import { FormErrorSummary } from '../components/form-error-summary.js';
import { PageHeader } from '../components/page-header.js';
import { CompanyIdentity, CompanyIdentityEffects } from '../components/company-identity.js';
import { LanguageSelect } from '../components/language-select.js';
import { saveDeviceLocale, useWebLocale } from '../app/locale.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

export function AuthenticationLayout() {
  const t = useWorkLedgerMessage();
  const { data: identity = DEFAULT_COMPANY_IDENTITY } = useQuery(companyIdentityQuery());
  return (
    <div className="wl-auth-layout min-h-dvh">
      <CompanyIdentityEffects identity={identity} />
      <a className="wl-skip-link" href="#main-content">
        {t('auth.layout.skipToContent')}
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,0.7fr)] lg:items-center lg:gap-16"
      >
        <section
          className="wl-auth-introduction grid max-w-xl gap-5"
          aria-label={t('auth.layout.introductionLabel', {
            organizationName: identity.organizationName,
          })}
        >
          <CompanyIdentity identity={identity} presentation="authentication" />
          <p className="m-0 text-3xl font-bold leading-tight tracking-[-0.03em] text-[var(--wl-text)] sm:text-5xl">
            {t('auth.layout.title')}
          </p>
          <p className="m-0 max-w-lg text-base leading-7 text-[var(--wl-text-muted)]">
            {t('auth.layout.description')}
          </p>
        </section>
        <div className="wl-auth-card rounded-3xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-6 shadow-[var(--wl-shadow-card)] sm:p-8">
          <div className="grid gap-8">
            <SignedOutLanguageControl />
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export function SignInPage() {
  const t = useWorkLedgerMessage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const locale = useWebLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [notice] = useState(readPendingSignInNotice);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notice !== null) clearPendingSignInNotice(notice);
  }, [notice]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateEmailPassword(email, password, t);
    setFieldErrors(errors);
    setFormError(undefined);
    if (Object.keys(errors).length > 0) {
      focusSummary(summaryRef);
      return;
    }

    setPending(true);
    try {
      await signIn(email.trim().toLocaleLowerCase('en-US'), password);
      clearSessionMemory();
      queryClient.removeQueries({ queryKey: ['self'] });
      const context = await queryClient.fetchQuery(selfContextQuery());
      await locale.activateLocale(context.locale);
      await navigate(context.defaultPath, { replace: true });
    } catch (error) {
      setFormError(signInErrorMessage(error, t));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('auth.signIn.eyebrow')}
        title={t('auth.signIn.title')}
        description={t('auth.signIn.description')}
      />
      {notice === null ? null : (
        <Alert title={noticeTitle(notice, t)} tone={noticeTone(notice)}>
          <p>{noticeMessage(notice, t)}</p>
        </Alert>
      )}
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form aria-busy={pending} className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          isInvalid={fieldErrors['email'] !== undefined}
          errorMessage={fieldErrors['email']}
          label={t('auth.field.email')}
          value={email}
          onChange={setEmail}
        />
        <TextField
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          isInvalid={fieldErrors['password'] !== undefined}
          errorMessage={fieldErrors['password']}
          label={t('auth.field.password')}
          value={password}
          onChange={setPassword}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link className={linkVariants({ prominence: 'quiet' })} to="/forgot-password">
            {t('auth.navigation.forgotPassword')}
          </Link>
          <Button type="submit" isDisabled={pending}>
            {pending ? t('auth.signIn.actionPending') : t('auth.signIn.action')}
          </Button>
        </div>
      </form>
    </section>
  );
}

function SignedOutLanguageControl() {
  const t = useWorkLedgerMessage();
  const locale = useWebLocale();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string>();
  const currentLocale = locale.runtime.locale;

  async function changeLocale(nextLocale: SupportedLocale) {
    if (nextLocale === currentLocale) return;
    setPending(true);
    setStatus(undefined);
    const previousRuntime = locale.runtime;
    try {
      const nextRuntime = await locale.activateLocale(nextLocale);
      if (!saveDeviceLocale(nextLocale)) {
        locale.restoreLocale(previousRuntime);
        setStatus(translateStaticMessage(previousRuntime, 'shared.locale.deviceSaveFailed'));
        return;
      }
      setStatus(translateStaticMessage(nextRuntime, 'shared.locale.deviceSaved'));
    } catch {
      locale.restoreLocale(previousRuntime);
      setStatus(translateStaticMessage(previousRuntime, 'shared.locale.deviceSaveFailed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2 border-b border-[var(--wl-border)] pb-6">
      <LanguageSelect
        description={t('shared.locale.deviceDescription')}
        disabled={pending}
        id="signed-out-language"
        label={t('shared.locale.label')}
        restoreFocusAfterDisabled
        value={currentLocale}
        onChange={(nextLocale) => void changeLocale(nextLocale)}
      />
      {status === undefined ? null : (
        <p aria-live="polite" className="m-0 text-sm" role="status">
          {status}
        </p>
      )}
    </div>
  );
}

export function ForgotPasswordPage() {
  const t = useWorkLedgerMessage();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const completionHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (complete) completionHeadingRef.current?.focus();
  }, [complete]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateEmail(email, t);
    setFieldErrors(errors);
    setFormError(undefined);
    if (Object.keys(errors).length > 0) {
      focusSummary(summaryRef);
      return;
    }
    setPending(true);
    try {
      await requestPasswordReset(email.trim().toLocaleLowerCase('en-US'));
      setComplete(true);
    } catch (error) {
      setFormError(recoveryRequestErrorMessage(error, t));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <section className="grid gap-6">
        <PageHeader
          eyebrow={t('auth.recovery.eyebrow')}
          title={t('auth.recovery.complete.title')}
          description={t('auth.recovery.complete.description')}
        />
        <h2 ref={completionHeadingRef} tabIndex={-1} className="sr-only">
          {t('auth.recovery.complete.focus')}
        </h2>
        <Link className={linkVariants({ prominence: 'default' })} to="/sign-in">
          {t('auth.navigation.returnToSignIn')}
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('auth.recovery.eyebrow')}
        title={t('auth.recovery.title')}
        description={t('auth.recovery.description')}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form aria-busy={pending} className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          isInvalid={fieldErrors['email'] !== undefined}
          errorMessage={fieldErrors['email']}
          label={t('auth.field.email')}
          value={email}
          onChange={setEmail}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link className={linkVariants({ prominence: 'quiet' })} to="/sign-in">
            {t('auth.navigation.backToSignIn')}
          </Link>
          <Button type="submit" isDisabled={pending}>
            {pending ? t('auth.recovery.actionPending') : t('auth.recovery.action')}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function ResetPasswordPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const [grant] = useState(readResetGrant);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => clearResetGrant(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (grant === null) return;
    const errors = validateNewPassword(password, confirmation, t);
    setFieldErrors(errors);
    setFormError(undefined);
    if (Object.keys(errors).length > 0) {
      focusSummary(summaryRef);
      return;
    }
    setPending(true);
    try {
      await resetPassword(grant, password);
      setPendingSignInNotice('PASSWORD_RESET');
      await navigate('/sign-in', { replace: true });
    } catch (error) {
      setFormError(resetErrorMessage(error, t));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  if (grant === null) {
    return (
      <section className="grid gap-6">
        <PageHeader
          eyebrow={t('auth.recovery.eyebrow')}
          title={t('auth.reset.invalid.title')}
          description={t('auth.reset.invalid.description')}
        />
        <Link className={linkVariants({ prominence: 'default' })} to="/forgot-password">
          {t('auth.navigation.requestAnotherRecovery')}
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('auth.recovery.eyebrow')}
        title={t('auth.reset.title')}
        description={t('auth.reset.description', {
          maximum: PASSWORD_MAXIMUM_LENGTH,
          minimum: PASSWORD_MINIMUM_LENGTH,
        })}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form aria-busy={pending} className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          isInvalid={fieldErrors['new-password'] !== undefined}
          errorMessage={fieldErrors['new-password']}
          label={t('auth.field.newPassword')}
          value={password}
          onChange={setPassword}
        />
        <TextField
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          isInvalid={fieldErrors['confirm-password'] !== undefined}
          errorMessage={fieldErrors['confirm-password']}
          label={t('auth.field.confirmPassword')}
          value={confirmation}
          onChange={setConfirmation}
        />
        <Button type="submit" isDisabled={pending}>
          {pending ? t('auth.reset.actionPending') : t('auth.reset.action')}
        </Button>
      </form>
    </section>
  );
}

export function ActivateAccountPage() {
  const t = useWorkLedgerMessage();
  const navigate = useNavigate();
  const [grant] = useState(readInvitationGrant);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => clearInvitationGrant(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (grant === null) return;
    const errors = validateNewPassword(password, confirmation, t);
    setFieldErrors(errors);
    setFormError(undefined);
    if (Object.keys(errors).length > 0) {
      focusSummary(summaryRef);
      return;
    }
    setPending(true);
    try {
      await activateAccountInvitation(grant, password);
      setPendingSignInNotice('ACCOUNT_ACTIVATED');
      await navigate('/sign-in', { replace: true });
    } catch (error) {
      setFormError(invitationErrorMessage(error, t));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  if (grant === null) {
    return (
      <section className="grid gap-6">
        <PageHeader
          eyebrow={t('auth.activation.eyebrow')}
          title={t('auth.activation.invalid.title')}
          description={t('auth.activation.invalid.description')}
        />
        <Link className={linkVariants({ prominence: 'default' })} to="/sign-in">
          {t('auth.navigation.returnToSignIn')}
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('auth.activation.eyebrow')}
        title={t('auth.activation.title')}
        description={t('auth.activation.description', {
          maximum: PASSWORD_MAXIMUM_LENGTH,
          minimum: PASSWORD_MINIMUM_LENGTH,
        })}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form aria-busy={pending} className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          isInvalid={fieldErrors['new-password'] !== undefined}
          errorMessage={fieldErrors['new-password']}
          label={t('auth.field.newPassword')}
          value={password}
          onChange={setPassword}
        />
        <TextField
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          isInvalid={fieldErrors['confirm-password'] !== undefined}
          errorMessage={fieldErrors['confirm-password']}
          label={t('auth.field.confirmPassword')}
          value={confirmation}
          onChange={setConfirmation}
        />
        <Button type="submit" isDisabled={pending}>
          {pending ? t('auth.activation.actionPending') : t('auth.activation.action')}
        </Button>
      </form>
    </section>
  );
}

function validateEmail(email: string, t: MessageTranslator): Record<string, string> {
  if (email.trim() === '') return { email: t('auth.validation.emailRequired') };
  return EMAIL_PATTERN.test(email.trim()) ? {} : { email: t('auth.validation.emailInvalid') };
}

function validateEmailPassword(
  email: string,
  password: string,
  t: MessageTranslator,
): Record<string, string> {
  return {
    ...validateEmail(email, t),
    ...(password === '' ? { password: t('auth.validation.passwordRequired') } : {}),
  };
}

function validateNewPassword(
  password: string,
  confirmation: string,
  t: MessageTranslator,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (password.length < PASSWORD_MINIMUM_LENGTH || password.length > PASSWORD_MAXIMUM_LENGTH) {
    errors['new-password'] = t('auth.validation.passwordLength', {
      maximum: PASSWORD_MAXIMUM_LENGTH,
      minimum: PASSWORD_MINIMUM_LENGTH,
    });
  }
  if (confirmation === '') {
    errors['confirm-password'] = t('auth.validation.confirmPasswordRequired');
  } else if (confirmation !== password) {
    errors['confirm-password'] = t('auth.validation.passwordMismatch');
  }
  return errors;
}

function focusSummary(summaryRef: { current: HTMLDivElement | null }): void {
  window.requestAnimationFrame(() => summaryRef.current?.focus());
}

function signInErrorMessage(error: unknown, t: MessageTranslator): string {
  if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
    return t('auth.error.signIn.rateLimited');
  }
  if (error instanceof ApiClientError && error.code === 'AUTH_INVALID_CREDENTIALS') {
    return t('auth.error.signIn.invalid');
  }
  return t('auth.error.signIn.generic');
}

function recoveryRequestErrorMessage(error: unknown, t: MessageTranslator): string {
  return error instanceof ApiClientError && error.code === 'RATE_LIMITED'
    ? t('auth.error.recovery.rateLimited')
    : t('auth.error.recovery.generic');
}

function resetErrorMessage(error: unknown, t: MessageTranslator): string {
  if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
    return t('auth.error.reset.rateLimited');
  }
  if (error instanceof ApiClientError && error.code === 'AUTH_PASSWORD_POLICY_REJECTED') {
    return t('auth.error.passwordPolicy');
  }
  return t('auth.error.reset.invalid');
}

function invitationErrorMessage(error: unknown, t: MessageTranslator): string {
  if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
    return t('auth.error.activation.rateLimited');
  }
  if (error instanceof ApiClientError && error.code === 'VALIDATION_FAILED') {
    return t('auth.error.passwordPolicy');
  }
  return t('auth.error.activation.invalid');
}

function noticeMessage(
  notice: ReturnType<typeof readPendingSignInNotice>,
  t: MessageTranslator,
): string {
  if (notice === 'SESSION_EXPIRED') return t('auth.notice.sessionExpired.message');
  if (notice === 'ACCOUNT_ACTIVATED') return t('auth.notice.accountActivated.message');
  if (notice === 'PASSWORD_RESET') return t('auth.notice.passwordReset.message');
  return t('auth.notice.signedOut.message');
}

function noticeTitle(
  notice: NonNullable<ReturnType<typeof readPendingSignInNotice>>,
  t: MessageTranslator,
): string {
  if (notice === 'SESSION_EXPIRED') return t('auth.notice.sessionExpired.title');
  if (notice === 'ACCOUNT_ACTIVATED') return t('auth.notice.accountActivated.title');
  if (notice === 'PASSWORD_RESET') return t('auth.notice.passwordReset.title');
  return t('auth.notice.signedOut.title');
}

function noticeTone(
  notice: NonNullable<ReturnType<typeof readPendingSignInNotice>>,
): 'info' | 'success' | 'warning' {
  if (notice === 'SESSION_EXPIRED') return 'warning';
  if (notice === 'ACCOUNT_ACTIVATED' || notice === 'PASSWORD_RESET') return 'success';
  return 'info';
}
