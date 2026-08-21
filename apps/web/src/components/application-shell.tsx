import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useLoaderData, useLocation, useNavigate } from 'react-router';

import type { NavigationArea, SelfContext } from '@workledger/contracts';
import { Button, Drawer } from '@workledger/ui';

import { clearSessionMemory, signOut } from '../app/api-client.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import {
  CompanyIdentity,
  CompanyIdentityEffects,
  companyIdentityFromOrganization,
} from './company-identity.js';

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
  { area: 'HR', label: 'Time settings', to: '/settings/time' },
  { area: 'HR', label: 'Absence settings', to: '/settings/absence' },
  { area: 'HR', label: 'Holiday calendars', to: '/settings/holidays' },
  { area: 'HR', label: 'Audit', to: '/audit' },
  { area: 'SYSTEM', label: 'Accounts and sessions', to: '/system/accounts' },
  { area: 'SYSTEM', label: 'Operations', to: '/system/operations' },
  { area: 'SYSTEM', label: 'Technical audit', to: '/system/audit' },
];

const HR_APPROVAL_ITEM: NavigationItem = {
  area: 'HR',
  label: 'Approvals',
  to: '/approvals',
};

const HR_TEAM_CALENDAR_ITEM: NavigationItem = {
  area: 'HR',
  label: 'Team calendar',
  to: '/team-calendar',
};

const AREA_LABELS: Readonly<Record<NavigationArea, string>> = {
  EMPLOYEE: 'My work',
  HR: 'People and policy',
  MANAGER: 'Team',
  SYSTEM: 'System',
};

const AREA_LANDING_PATHS: Readonly<Record<NavigationArea, string>> = {
  EMPLOYEE: '/today',
  HR: '/employees',
  MANAGER: '/team',
  SYSTEM: '/system/operations',
};

const REPORTS_ITEM: NavigationItem = { area: 'EMPLOYEE', label: 'Reports', to: '/reports' };

export function ApplicationShell() {
  const context = useLoaderData<SelfContext>();
  const identity = companyIdentityFromOrganization(context.organization);
  const location = useLocation();
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const routeArea = areaForPath(location.pathname, context.navigationAreas);
  const [currentArea, setCurrentArea] = useState<NavigationArea | null>(() =>
    initialAreaForPath(location.pathname, context.navigationAreas),
  );
  const activeArea =
    routeArea ??
    (currentArea !== null && context.navigationAreas.includes(currentArea)
      ? currentArea
      : (context.navigationAreas[0] ?? null));

  useEffect(() => {
    if (routeArea !== null) {
      setCurrentArea(routeArea);
      return;
    }
    setCurrentArea((area) =>
      area !== null && context.navigationAreas.includes(area)
        ? area
        : (context.navigationAreas[0] ?? null),
    );
  }, [context.navigationAreas, routeArea]);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const shell = shellRef.current;
    if (header === null || shell === null) return;

    const updateHeaderBlockSize = () => {
      const blockSize = header.getBoundingClientRect().height;
      if (blockSize > 0) {
        shell.style.setProperty('--shell-header-size', `${blockSize.toString()}px`);
      }
    };
    updateHeaderBlockSize();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateHeaderBlockSize);
    observer.observe(header);
    return () => {
      observer.disconnect();
      shell.style.removeProperty('--shell-header-size');
    };
  }, []);

  return (
    <div ref={shellRef} className="wl-app-shell min-h-dvh">
      <CompanyIdentityEffects identity={identity} />
      <a className="wl-skip-link" href="#main-content">
        Skip to content
      </a>
      <header
        ref={headerRef}
        className="wl-app-header flex items-center justify-between gap-4 border-b border-[var(--wl-border)] bg-[var(--wl-surface-raised)] px-4 py-3 sm:px-6"
      >
        <Link
          to="/"
          aria-label={`${identity.organizationName} home`}
          className="wl-brand-link min-w-0 rounded-md text-[var(--wl-text)] no-underline outline-none"
          data-route-focus-key="brand"
        >
          <CompanyIdentity identity={identity} presentation="shell" />
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <div className="wl-mobile-navigation">
            <Drawer title="Navigation" triggerLabel="Menu">
              {(close) => (
                <NavigationPanel
                  activeArea={activeArea}
                  context={context}
                  mode="mobile"
                  onAreaChange={setCurrentArea}
                  onNavigate={close}
                />
              )}
            </Drawer>
          </div>
        </div>
      </header>

      <div className="wl-shell-grid">
        <aside className="wl-desktop-navigation border-r border-[var(--wl-border)] bg-[var(--wl-surface-raised)]">
          <NavigationPanel
            activeArea={activeArea}
            context={context}
            mode="desktop"
            onAreaChange={setCurrentArea}
          />
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

function NavigationPanel({
  activeArea,
  context,
  mode,
  onAreaChange,
  onNavigate,
}: Readonly<{
  activeArea: NavigationArea | null;
  context: SelfContext;
  mode: 'desktop' | 'mobile';
  onAreaChange: (area: NavigationArea) => void;
  onNavigate?: () => void;
}>) {
  const items = activeArea === null ? [] : navigationItemsFor(activeArea, context.navigationAreas);
  const navigationLabel = activeArea === null ? null : AREA_LABELS[activeArea];

  return (
    <div className="wl-navigation-panel">
      <div className="wl-navigation-destinations">
        {context.navigationAreas.length <= 1 ? null : (
          <nav aria-label={mode === 'mobile' ? 'Mobile work areas' : 'Work areas'}>
            <p className="wl-navigation-label">Work areas</p>
            <ul className="wl-work-area-list">
              {context.navigationAreas.map((area) => {
                const isCurrent = area === activeArea;
                return (
                  <li key={area}>
                    <Link
                      to={AREA_LANDING_PATHS[area]}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={`wl-work-area-link ${isCurrent ? 'wl-work-area-link-active' : ''}`.trim()}
                      data-route-focus-key={`${mode}:area:${area}`}
                      onClick={() => {
                        onAreaChange(area);
                        onNavigate?.();
                      }}
                    >
                      <span>{AREA_LABELS[area]}</span>
                      {isCurrent ? (
                        <span aria-hidden="true" className="wl-work-area-current">
                          Current
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {navigationLabel === null ? null : (
          <nav
            aria-label={
              mode === 'mobile'
                ? `Mobile ${navigationLabel} navigation`
                : `${navigationLabel} navigation`
            }
          >
            <p className="wl-navigation-label">{navigationLabel}</p>
            <ul className="m-0 mt-2 grid list-none gap-1 p-0" role="list">
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
          </nav>
        )}
      </div>

      <div className="wl-navigation-utilities">
        <nav aria-label={mode === 'mobile' ? 'Mobile account' : 'Account'}>
          <p className="wl-navigation-label">Account</p>
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
            <p className="m-0 text-sm font-semibold text-[var(--wl-text)]">
              {context.account.name}
            </p>
            <p className="m-0 break-all text-xs text-[var(--wl-text-muted)]">
              {context.account.email}
            </p>
          </div>
          <ShellSignOutButton />
        </div>
      </div>
    </div>
  );
}

function areaForPath(
  pathname: string,
  authorizedAreas: readonly NavigationArea[],
): NavigationArea | null {
  const has = (area: NavigationArea) => authorizedAreas.includes(area);
  if (pathname.startsWith('/system/') && has('SYSTEM')) return 'SYSTEM';
  if (
    (pathname === '/employees' ||
      pathname.startsWith('/employees/') ||
      pathname.startsWith('/settings/') ||
      pathname === '/audit') &&
    has('HR')
  ) {
    return 'HR';
  }
  if (
    pathname === '/team' ||
    pathname === '/team-calendar' ||
    pathname === '/approvals' ||
    pathname.startsWith('/approvals/')
  ) {
    if (has('MANAGER')) return 'MANAGER';
    if (has('HR')) return 'HR';
  }
  if (
    (pathname === '/today' ||
      pathname === '/my-time' ||
      pathname === '/my-balances' ||
      pathname === '/requests' ||
      pathname.startsWith('/requests/') ||
      pathname === '/calendar') &&
    has('EMPLOYEE')
  ) {
    return 'EMPLOYEE';
  }
  return null;
}

function initialAreaForPath(
  pathname: string,
  authorizedAreas: readonly NavigationArea[],
): NavigationArea | null {
  return areaForPath(pathname, authorizedAreas) ?? authorizedAreas[0] ?? null;
}

function navigationItemsFor(
  area: NavigationArea,
  authorizedAreas: readonly NavigationArea[],
): readonly NavigationItem[] {
  return [
    ...NAVIGATION_ITEMS.filter((item) => item.area === area),
    ...(area === 'HR' && !authorizedAreas.includes('MANAGER')
      ? [HR_APPROVAL_ITEM, HR_TEAM_CALENDAR_ITEM]
      : []),
    ...(area === 'SYSTEM' ? [] : [REPORTS_ITEM]),
  ];
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
