import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useLoaderData, useNavigate } from 'react-router';

import type { NavigationArea, SelfContext } from '@workledger/contracts';
import { Button, Drawer } from '@workledger/ui';

import { clearSessionMemory, signOut } from '../app/api-client.js';
import { setPendingSignInNotice } from '../app/session-notice.js';

type NavigationItem = Readonly<{
  area: NavigationArea;
  label: string;
  to: string;
}>;

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { area: 'EMPLOYEE', label: 'Today', to: '/today' },
  { area: 'EMPLOYEE', label: 'My time', to: '/my-time' },
  { area: 'EMPLOYEE', label: 'My balances', to: '/my-balances' },
  { area: 'EMPLOYEE', label: 'Requests', to: '/requests' },
  { area: 'EMPLOYEE', label: 'Calendar', to: '/calendar' },
  { area: 'MANAGER', label: 'Team', to: '/team' },
  { area: 'MANAGER', label: 'Approvals', to: '/approvals' },
  { area: 'MANAGER', label: 'Team calendar', to: '/team-calendar' },
  { area: 'HR', label: 'Employees', to: '/employees' },
  { area: 'HR', label: 'Reports', to: '/reports' },
  { area: 'HR', label: 'Time settings', to: '/settings/time' },
  { area: 'HR', label: 'Absence settings', to: '/settings/absence' },
  { area: 'HR', label: 'Holiday calendars', to: '/settings/holidays' },
  { area: 'HR', label: 'Audit', to: '/audit' },
  { area: 'SYSTEM', label: 'Accounts and sessions', to: '/system/accounts' },
  { area: 'SYSTEM', label: 'Operations', to: '/system/operations' },
  { area: 'SYSTEM', label: 'Technical audit', to: '/system/audit' },
];

const AREA_LABELS: Readonly<Record<NavigationArea, string>> = {
  EMPLOYEE: 'My work',
  HR: 'People administration',
  MANAGER: 'Team management',
  SYSTEM: 'System administration',
};

export function ApplicationShell() {
  const context = useLoaderData<SelfContext>();

  return (
    <div className="wl-app-shell min-h-dvh">
      <a className="wl-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="wl-app-header flex items-center justify-between gap-4 border-b border-[var(--wl-border)] bg-[var(--wl-surface-raised)] px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="wl-brand-link rounded-md text-lg font-bold tracking-[-0.02em] text-[var(--wl-text)] no-underline outline-none"
          data-route-focus-key="brand"
        >
          WorkLedger
        </Link>
        <div className="flex items-center gap-3">
          <p className="m-0 hidden text-sm text-[var(--wl-text-muted)] sm:block">
            {context.organization.name}
          </p>
          <div className="wl-mobile-navigation">
            <Drawer title="Navigation" triggerLabel="Menu">
              {(close) => <NavigationLists context={context} mode="mobile" onNavigate={close} />}
            </Drawer>
          </div>
        </div>
      </header>

      <div className="wl-shell-grid">
        <aside className="wl-desktop-navigation border-r border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-5">
          <NavigationLists context={context} mode="desktop" />
        </aside>
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function NavigationLists({
  context,
  mode,
  onNavigate,
}: Readonly<{
  context: SelfContext;
  mode: 'desktop' | 'mobile';
  onNavigate?: () => void;
}>) {
  return (
    <div className="grid content-start gap-7">
      <nav aria-label={mode === 'mobile' ? 'Mobile primary' : 'Primary'}>
        <div className="grid gap-6">
          {context.navigationAreas.map((area) => {
            const items = NAVIGATION_ITEMS.filter((item) => item.area === area);
            if (items.length === 0) return null;
            return (
              <div key={area} className="grid gap-2">
                <p className="m-0 px-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--wl-text-muted)]">
                  {AREA_LABELS[area]}
                </p>
                <ul className="m-0 grid list-none gap-1 p-0" role="list">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        data-route-focus-key={`${mode}:${item.to}`}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                          `wl-nav-link ${isActive ? 'wl-nav-link-active' : ''}`.trim()
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      <nav aria-label={mode === 'mobile' ? 'Mobile account' : 'Account'}>
        <p className="m-0 px-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--wl-text-muted)]">
          Account
        </p>
        <ul className="m-0 mt-2 grid list-none gap-1 p-0" role="list">
          <li>
            <NavLink
              to="/notifications"
              data-route-focus-key={`${mode}:/notifications`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `wl-nav-link ${isActive ? 'wl-nav-link-active' : ''}`.trim()
              }
            >
              Notifications
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/profile"
              data-route-focus-key={`${mode}:/profile`}
              onClick={onNavigate}
              className={({ isActive }) =>
                `wl-nav-link ${isActive ? 'wl-nav-link-active' : ''}`.trim()
              }
            >
              Profile
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="grid gap-3 border-t border-[var(--wl-border)] px-3 pt-5">
        <div>
          <p className="m-0 text-sm font-semibold text-[var(--wl-text)]">{context.account.name}</p>
          <p className="m-0 break-all text-xs text-[var(--wl-text-muted)]">
            {context.account.email}
          </p>
        </div>
        <ShellSignOutButton />
      </div>
    </div>
  );
}

function ShellSignOutButton() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div className="grid gap-2">
      {error === undefined ? null : (
        <p role="alert" className="m-0 text-sm font-semibold text-[var(--wl-danger)]">
          {error}
        </p>
      )}
      <Button
        variant="secondary"
        isDisabled={pending}
        onPress={async () => {
          setPending(true);
          setError(undefined);
          try {
            await signOut();
            clearSessionMemory();
            queryClient.clear();
            setPendingSignInNotice('SIGNED_OUT');
            await navigate('/sign-in', { replace: true });
          } catch {
            setError('Could not sign out. Try again.');
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
