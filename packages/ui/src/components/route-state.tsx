import type { ReactNode } from 'react';

import { Link } from './link.js';
import { Panel } from './panel.js';

export type RouteStateKind = 'empty' | 'error' | 'loading' | 'not-found' | 'permission-denied';

const defaultTitle: Record<RouteStateKind, string> = {
  empty: 'Nothing to show yet',
  error: 'This information is unavailable',
  loading: 'Loading information',
  'not-found': 'This record is unavailable',
  'permission-denied': 'You do not have access to this area',
};

export interface RouteStateProps {
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
  kind: RouteStateKind;
  title?: string;
}

export function RouteState({ actionHref, actionLabel, children, kind, title }: RouteStateProps) {
  const live = kind === 'loading' ? 'polite' : undefined;
  return (
    <Panel aria-live={live} className={`wl-route-state wl-route-state--${kind}`} density="balanced">
      <h2 className="wl-route-state__title">{title ?? defaultTitle[kind]}</h2>
      {children === undefined ? null : <div className="wl-route-state__body">{children}</div>}
      {actionHref === undefined || actionLabel === undefined ? null : (
        <Link href={actionHref}>{actionLabel}</Link>
      )}
    </Panel>
  );
}
