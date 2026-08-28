import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, NavLink, Outlet, useLoaderData, useLocation, useNavigate } from 'react-router';

import type { NavigationArea, SelfContext } from '@workledger/contracts';
import { translate, type MessageKey } from '@workledger/i18n';
import { useOptionalWorkLedgerI18n } from '@workledger/i18n/react';
import { Alert, Button, Drawer } from '@workledger/ui';

import { clearSessionMemory, signOut } from '../app/api-client.js';
import { useOptionalWebLocale } from '../app/locale.js';
import {
  CANONICAL_ROUTE_MESSAGE_KEYS,
  canonicalRouteLabel,
  canonicalRouteMessageKey,
  type CanonicalRoutePath,
} from '../app/route-copy.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import {
  CompanyIdentity,
  CompanyIdentityEffects,
  companyIdentityFromOrganization,
} from './company-identity.js';

type NavigationItem = Readonly<{
  area: NavigationArea;
  label: MessageKey;
  to: string;
}>;

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { area: 'EMPLOYEE', label: canonicalRouteMessageKey('/today'), to: '/today' },
  { area: 'EMPLOYEE', label: canonicalRouteMessageKey('/my-time'), to: '/my-time' },
  { area: 'EMPLOYEE', label: canonicalRouteMessageKey('/my-balances'), to: '/my-balances' },
  { area: 'EMPLOYEE', label: canonicalRouteMessageKey('/requests'), to: '/requests' },
  { area: 'EMPLOYEE', label: canonicalRouteMessageKey('/calendar'), to: '/calendar' },
  { area: 'EMPLOYEE', label: canonicalRouteMessageKey('/insights'), to: '/insights' },
  { area: 'MANAGER', label: canonicalRouteMessageKey('/team'), to: '/team' },
  { area: 'MANAGER', label: canonicalRouteMessageKey('/team-insights'), to: '/team-insights' },
  { area: 'MANAGER', label: canonicalRouteMessageKey('/approvals'), to: '/approvals' },
  { area: 'MANAGER', label: canonicalRouteMessageKey('/team-calendar'), to: '/team-calendar' },
  { area: 'HR', label: canonicalRouteMessageKey('/employees'), to: '/employees' },
  { area: 'HR', label: canonicalRouteMessageKey('/hr-insights'), to: '/hr-insights' },
  { area: 'HR', label: canonicalRouteMessageKey('/teams'), to: '/teams' },
  { area: 'HR', label: canonicalRouteMessageKey('/settings/time'), to: '/settings/time' },
  { area: 'HR', label: canonicalRouteMessageKey('/settings/absence'), to: '/settings/absence' },
  { area: 'HR', label: canonicalRouteMessageKey('/settings/holidays'), to: '/settings/holidays' },
  { area: 'HR', label: canonicalRouteMessageKey('/audit'), to: '/audit' },
  { area: 'SYSTEM', label: canonicalRouteMessageKey('/system/accounts'), to: '/system/accounts' },
  { area: 'SYSTEM', label: canonicalRouteMessageKey('/system/insights'), to: '/system/insights' },
  {
    area: 'SYSTEM',
    label: canonicalRouteMessageKey('/system/operations'),
    to: '/system/operations',
  },
  { area: 'SYSTEM', label: canonicalRouteMessageKey('/system/audit'), to: '/system/audit' },
];

const HR_APPROVAL_ITEM: NavigationItem = {
  area: 'HR',
  label: canonicalRouteMessageKey('/approvals'),
  to: '/approvals',
};

const HR_TEAM_CALENDAR_ITEM: NavigationItem = {
  area: 'HR',
  label: canonicalRouteMessageKey('/team-calendar'),
  to: '/team-calendar',
};

const AREA_LABELS: Readonly<Record<NavigationArea, MessageKey>> = {
  EMPLOYEE: 'shared.navigation.workArea.employee',
  HR: 'shared.navigation.workArea.hr',
  MANAGER: 'shared.navigation.workArea.manager',
  SYSTEM: 'shared.navigation.workArea.system',
};

const AREA_LANDING_PATHS: Readonly<Record<NavigationArea, string>> = {
  EMPLOYEE: '/today',
  HR: '/employees',
  MANAGER: '/team',
  SYSTEM: '/system/operations',
};

const REPORTS_ITEM: NavigationItem = {
  area: 'EMPLOYEE',
  label: canonicalRouteMessageKey('/reports'),
  to: '/reports',
};

export function ApplicationShell() {
  const context = useLoaderData<SelfContext>();
  const runtime = useOptionalWorkLedgerI18n();
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
        {runtimeMessage(runtime, 'shared.navigation.skipToContent')}
      </a>
      <header
        ref={headerRef}
        className="wl-app-header flex items-center justify-between gap-4 border-b border-[var(--wl-border)] bg-[var(--wl-surface-raised)] px-4 py-3 sm:px-6"
      >
        <Link
          to="/"
          aria-label={runtimeMessage(
            runtime,
            'shared.navigation.brandHome',
            identity.organizationName,
          )}
          className="wl-brand-link min-w-0 rounded-md text-[var(--wl-text)] no-underline outline-none"
          data-route-focus-key="brand"
        >
          <CompanyIdentity identity={identity} presentation="shell" />
        </Link>
        <div className="flex shrink-0 items-center gap-3">
          <div className="wl-mobile-navigation">
            <Drawer
              closeLabel={runtimeMessage(runtime, 'shared.action.close')}
              title={runtimeMessage(runtime, 'shared.navigation.drawerTitle')}
              triggerLabel={runtimeMessage(runtime, 'shared.navigation.menu')}
            >
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
  const runtime = useOptionalWorkLedgerI18n();
  const message = (key: MessageKey) =>
    runtime === null ? englishNavigationMessage(key) : translate(runtime, key);
  const items = activeArea === null ? [] : navigationItemsFor(activeArea, context.navigationAreas);
  const navigationLabel = activeArea === null ? null : message(AREA_LABELS[activeArea]);

  return (
    <div className="wl-navigation-panel">
      <div className="wl-navigation-destinations">
        {context.navigationAreas.length <= 1 ? null : (
          <nav
            aria-label={
              mode === 'mobile'
                ? message('shared.navigation.mobileWorkAreas')
                : message('shared.navigation.workAreas')
            }
          >
            <p className="wl-navigation-label">{message('shared.navigation.workAreas')}</p>
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
                      <span>{message(AREA_LABELS[area])}</span>
                      {isCurrent ? (
                        <span aria-hidden="true" className="wl-work-area-current">
                          {message('shared.navigation.current')}
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
                ? runtimeMessage(runtime, 'shared.navigation.destination.mobile', navigationLabel)
                : runtimeMessage(runtime, 'shared.navigation.destination.desktop', navigationLabel)
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
                    {message(item.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="wl-navigation-utilities">
        <nav
          aria-label={
            mode === 'mobile'
              ? message('shared.navigation.mobileAccount')
              : message('shared.navigation.account')
          }
        >
          <p className="wl-navigation-label">{message('shared.navigation.account')}</p>
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
                {message(canonicalRouteMessageKey('/notifications'))}
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
                {message(canonicalRouteMessageKey('/profile'))}
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

function englishNavigationMessage(key: MessageKey): string {
  const messages: Partial<Record<MessageKey, string>> = {
    'shared.navigation.account': 'Account',
    'shared.navigation.current': 'Current',
    'shared.navigation.mobileAccount': 'Mobile account',
    'shared.navigation.mobileWorkAreas': 'Mobile work areas',
    'shared.navigation.workAreas': 'Work areas',
    'shared.navigation.workArea.employee': 'My work',
    'shared.navigation.workArea.hr': 'People and policy',
    'shared.navigation.workArea.manager': 'Team',
    'shared.navigation.workArea.system': 'System',
  };
  if (key in messages) return messages[key] ?? key;
  const path = Object.entries(CANONICAL_ROUTE_MESSAGE_KEYS).find(([, value]) => value === key)?.[0];
  return path === undefined ? key : canonicalRouteLabel(path as CanonicalRoutePath);
}

function runtimeMessage(
  runtime: ReturnType<typeof useOptionalWorkLedgerI18n>,
  key:
    | 'shared.navigation.brandHome'
    | 'shared.navigation.destination.desktop'
    | 'shared.navigation.destination.mobile'
    | 'shared.navigation.drawerTitle'
    | 'shared.navigation.menu'
    | 'shared.navigation.skipToContent'
    | 'shared.action.close',
  value?: string,
): string {
  if (runtime !== null) {
    if (key === 'shared.navigation.brandHome') {
      return translate(runtime, key, { organizationName: value ?? '' });
    }
    if (
      key === 'shared.navigation.destination.desktop' ||
      key === 'shared.navigation.destination.mobile'
    ) {
      return translate(runtime, key, { area: value ?? '' });
    }
    return translate(runtime, key);
  }
  if (key === 'shared.navigation.brandHome') return `${value ?? ''} home`;
  if (key === 'shared.navigation.destination.mobile') return `Mobile ${value ?? ''} navigation`;
  if (key === 'shared.navigation.destination.desktop') return `${value ?? ''} navigation`;
  if (key === 'shared.navigation.skipToContent') return 'Skip to content';
  if (key === 'shared.navigation.drawerTitle') return 'Navigation';
  if (key === 'shared.action.close') return 'Close';
  return 'Menu';
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
      pathname === '/hr-insights' ||
      pathname === '/teams' ||
      pathname.startsWith('/settings/') ||
      pathname === '/audit') &&
    has('HR')
  ) {
    return 'HR';
  }
  if (
    pathname === '/team' ||
    pathname === '/team-insights' ||
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
      pathname === '/calendar' ||
      pathname === '/insights') &&
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
  const runtime = useOptionalWorkLedgerI18n();
  const message = (key: MessageKey, fallback: string) =>
    runtime === null ? fallback : translate(runtime, key);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const locale = useOptionalWebLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  return (
    <div className="grid gap-2">
      {error === undefined ? null : (
        <Alert
          headingLevel="h3"
          title={message('shared.signOut.failureTitle', 'Sign out failed')}
          tone="danger"
        >
          <p>{error}</p>
        </Alert>
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
            try {
              await locale?.activateSignedOutLocale();
            } catch {
              // A completed sign-out must not be reported as failed if a catalog cannot load.
            }
            setPendingSignInNotice('SIGNED_OUT');
            await navigate('/sign-in', { replace: true });
          } catch {
            setError(
              message('shared.signOut.failureDescription', 'Could not sign out. Try again.'),
            );
          } finally {
            setPending(false);
          }
        }}
      >
        {pending
          ? message('shared.signOut.actionPending', 'Signing out…')
          : message('shared.signOut.action', 'Sign out')}
      </Button>
    </div>
  );
}
