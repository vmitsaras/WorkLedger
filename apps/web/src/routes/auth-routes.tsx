import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import {
  DEFAULT_COMPANY_IDENTITY,
  PASSWORD_MAXIMUM_LENGTH,
  PASSWORD_MINIMUM_LENGTH,
} from '@workledger/contracts';
import { Button, linkVariants, TextField } from '@workledger/ui';

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function AuthenticationLayout() {
  const { data: identity = DEFAULT_COMPANY_IDENTITY } = useQuery(companyIdentityQuery());
  return (
    <div className="wl-auth-layout min-h-dvh">
      <CompanyIdentityEffects identity={identity} />
      <a className="wl-skip-link" href="#main-content">
        Skip to content
      </a>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,0.7fr)] lg:items-center lg:gap-16"
      >
        <section
          className="grid max-w-xl gap-5"
          aria-label={`${identity.organizationName} WorkLedger introduction`}
        >
          <CompanyIdentity identity={identity} presentation="authentication" />
          <p className="m-0 text-3xl font-bold leading-tight tracking-[-0.03em] text-[var(--wl-text)] sm:text-5xl">
            Working time you can understand.
          </p>
          <p className="m-0 max-w-lg text-base leading-7 text-[var(--wl-text-muted)]">
            A calm, auditable place for attendance, flexible-time balances, absences, and monthly
            records.
          </p>
        </section>
        <div className="wl-auth-card rounded-3xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-6 shadow-[var(--wl-shadow-card)] sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function SignInPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
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
    const errors = validateEmailPassword(email, password);
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
      await navigate(context.defaultPath, { replace: true });
    } catch (error) {
      setFormError(signInErrorMessage(error));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Account access"
        title="Sign in"
        description="Use the email address from your WorkLedger invitation. There is no public registration."
      />
      {notice === null ? null : (
        <div
          role={notice === 'SESSION_EXPIRED' ? 'alert' : 'status'}
          className="wl-alert rounded-xl border p-4 text-sm"
        >
          {noticeMessage(notice)}
        </div>
      )}
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          isInvalid={fieldErrors['email'] !== undefined}
          errorMessage={fieldErrors['email']}
          label="Email address"
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
          label="Password"
          value={password}
          onChange={setPassword}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link className={linkVariants({ prominence: 'quiet' })} to="/forgot-password">
            Forgot password?
          </Link>
          <Button type="submit" isDisabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function ForgotPasswordPage() {
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
    const errors = validateEmail(email);
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
      setFormError(recoveryRequestErrorMessage(error));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <section className="grid gap-6">
        <PageHeader
          eyebrow="Password recovery"
          title="Check your email"
          description="If an eligible WorkLedger account matches that address, recovery instructions will arrive shortly. The link expires after 30 minutes."
        />
        <h2 ref={completionHeadingRef} tabIndex={-1} className="sr-only">
          Recovery request complete
        </h2>
        <Link className={linkVariants({ prominence: 'default' })} to="/sign-in">
          Return to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Password recovery"
        title="Reset your password"
        description="Enter your account email. The completion message is the same whether or not an eligible account exists."
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          isInvalid={fieldErrors['email'] !== undefined}
          errorMessage={fieldErrors['email']}
          label="Email address"
          value={email}
          onChange={setEmail}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link className={linkVariants({ prominence: 'quiet' })} to="/sign-in">
            Back to sign in
          </Link>
          <Button type="submit" isDisabled={pending}>
            {pending ? 'Sending…' : 'Send recovery link'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function ResetPasswordPage() {
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
    const errors = validateNewPassword(password, confirmation);
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
      setFormError(resetErrorMessage(error));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  if (grant === null) {
    return (
      <section className="grid gap-6">
        <PageHeader
          eyebrow="Password recovery"
          title="Recovery link unavailable"
          description="This recovery link is invalid, expired, or already used. Request a new link to continue."
        />
        <Link className={linkVariants({ prominence: 'default' })} to="/forgot-password">
          Request another recovery link
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Password recovery"
        title="Choose a new password"
        description={`Use ${PASSWORD_MINIMUM_LENGTH} to ${PASSWORD_MAXIMUM_LENGTH} characters. Spaces, Unicode, paste, and password managers are supported.`}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          isInvalid={fieldErrors['new-password'] !== undefined}
          errorMessage={fieldErrors['new-password']}
          label="New password"
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
          label="Confirm new password"
          value={confirmation}
          onChange={setConfirmation}
        />
        <Button type="submit" isDisabled={pending}>
          {pending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </section>
  );
}

export function ActivateAccountPage() {
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
    const errors = validateNewPassword(password, confirmation);
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
      setFormError(invitationErrorMessage(error));
      focusSummary(summaryRef);
    } finally {
      setPending(false);
    }
  }

  if (grant === null) {
    return (
      <section className="grid gap-6">
        <PageHeader
          eyebrow="Account invitation"
          title="Invitation link unavailable"
          description="This invitation is invalid, expired, or already used. Ask your administrator to issue a new invitation."
        />
        <Link className={linkVariants({ prominence: 'default' })} to="/sign-in">
          Return to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Account invitation"
        title="Activate your account"
        description={`Choose a password with ${PASSWORD_MINIMUM_LENGTH} to ${PASSWORD_MAXIMUM_LENGTH} characters. Activation does not sign you in automatically.`}
      />
      <FormErrorSummary fieldErrors={fieldErrors} formError={formError} summaryRef={summaryRef} />
      <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
        <TextField
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          isInvalid={fieldErrors['new-password'] !== undefined}
          errorMessage={fieldErrors['new-password']}
          label="New password"
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
          label="Confirm new password"
          value={confirmation}
          onChange={setConfirmation}
        />
        <Button type="submit" isDisabled={pending}>
          {pending ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </section>
  );
}

function validateEmail(email: string): Record<string, string> {
  if (email.trim() === '') return { email: 'Enter your email address.' };
  return EMAIL_PATTERN.test(email.trim()) ? {} : { email: 'Enter a valid email address.' };
}

function validateEmailPassword(email: string, password: string): Record<string, string> {
  return {
    ...validateEmail(email),
    ...(password === '' ? { password: 'Enter your password.' } : {}),
  };
}

function validateNewPassword(password: string, confirmation: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (password.length < PASSWORD_MINIMUM_LENGTH || password.length > PASSWORD_MAXIMUM_LENGTH) {
    errors['new-password'] =
      `Use ${PASSWORD_MINIMUM_LENGTH} to ${PASSWORD_MAXIMUM_LENGTH} characters.`;
  }
  if (confirmation === '') errors['confirm-password'] = 'Confirm your new password.';
  else if (confirmation !== password) errors['confirm-password'] = 'The passwords do not match.';
  return errors;
}

function focusSummary(summaryRef: { current: HTMLDivElement | null }): void {
  window.requestAnimationFrame(() => summaryRef.current?.focus());
}

function signInErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
    return 'Too many sign-in attempts. Wait a moment and try again.';
  }
  if (error instanceof ApiClientError && error.code === 'AUTH_INVALID_CREDENTIALS') {
    return 'The email or password is not valid, or this account cannot sign in.';
  }
  return 'WorkLedger could not sign you in. Check the service and try again.';
}

function recoveryRequestErrorMessage(error: unknown): string {
  return error instanceof ApiClientError && error.code === 'RATE_LIMITED'
    ? 'Too many recovery requests. Wait a moment and try again.'
    : 'WorkLedger could not send recovery instructions. Try again later.';
}

function resetErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
    return 'Too many reset attempts. Wait a moment and request a new link if needed.';
  }
  if (error instanceof ApiClientError && error.code === 'AUTH_PASSWORD_POLICY_REJECTED') {
    return 'Choose a password that meets the length guidance and is not commonly used.';
  }
  return 'This recovery link is invalid, expired, or already used. Request a new link to continue.';
}

function invitationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'RATE_LIMITED') {
    return 'Too many activation attempts. Wait a moment and try again.';
  }
  if (error instanceof ApiClientError && error.code === 'VALIDATION_FAILED') {
    return 'Choose a password that meets the length guidance and is not commonly used.';
  }
  return 'This invitation is invalid, expired, or already used. Ask your administrator to issue a new invitation.';
}

function noticeMessage(notice: ReturnType<typeof readPendingSignInNotice>): string {
  if (notice === 'SESSION_EXPIRED') return 'Your session expired. Sign in again to continue.';
  if (notice === 'ACCOUNT_ACTIVATED')
    return 'Your account is active. Sign in with your new password.';
  if (notice === 'PASSWORD_RESET')
    return 'Your password was updated. Sign in with the new password.';
  return 'You have signed out.';
}
