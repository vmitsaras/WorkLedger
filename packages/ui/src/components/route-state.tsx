import type { HTMLAttributes, ReactNode } from 'react';

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
  actions?: ReactNode;
  children?: ReactNode;
  headingLevel?: 'h1' | 'h2';
  headingProps?: HTMLAttributes<HTMLHeadingElement> & {
    'data-route-focus-key'?: string;
    'data-route-heading'?: boolean;
  };
  kind: RouteStateKind;
  title?: string;
}

export function RouteState({
  actionHref,
  actionLabel,
  actions,
  children,
  headingLevel: Heading = 'h2',
  headingProps,
  kind,
  title,
}: RouteStateProps) {
  const live = kind === 'loading' ? 'polite' : undefined;
  const actionLink =
    actionHref === undefined || actionLabel === undefined ? null : (
      <Link href={actionHref}>{actionLabel}</Link>
    );
  return (
    <Panel aria-live={live} className={`wl-route-state wl-route-state--${kind}`} density="balanced">
      <Heading
        {...headingProps}
        className={[
          'wl-route-state__title',
          Heading === 'h1' ? 'wl-route-state__title--route' : null,
          headingProps?.className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {title ?? defaultTitle[kind]}
      </Heading>
      {children === undefined ? null : <div className="wl-route-state__body">{children}</div>}
      {actionLink === null && actions === undefined ? null : (
        <div className="wl-route-state__actions">
          {actionLink}
          {actions}
        </div>
      )}
    </Panel>
  );
}
