import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Button, buttonVariants, RouteState } from '@workledger/ui';

import { useBoundaryPresentation } from '../app/route-presentation.js';

export function RouteBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 503;
  const content =
    status === 403
      ? {
          description:
            'Your current account does not have access to this area. No restricted record details were disclosed.',
          title: 'Permission denied',
        }
      : status === 404
        ? {
            description: 'The page could not be found or is no longer available.',
            title: 'Page not found',
          }
        : {
            description:
              'WorkLedger could not load this page. Check the service and try again without resubmitting any form.',
            title: 'Page unavailable',
          };

  useBoundaryPresentation(content.title);

  const state = (
    <RouteState
      actions={
        <>
          <Link className={buttonVariants()} to="/">
            Go to my home
          </Link>
          {status >= 500 ? (
            <Button variant="secondary" onPress={() => window.location.reload()}>
              Try again
            </Button>
          ) : null}
        </>
      }
      headingLevel="h1"
      headingProps={{
        'data-route-focus-key': 'route-heading',
        'data-route-heading': true,
        tabIndex: -1,
      }}
      kind={status === 403 ? 'permission-denied' : status === 404 ? 'not-found' : 'error'}
      title={content.title}
    >
      <p className="m-0">{content.description}</p>
    </RouteState>
  );

  return status >= 500 ? <div role="alert">{state}</div> : state;
}

export function RootNotFoundPage() {
  useBoundaryPresentation('Page not found');
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh w-full max-w-3xl content-center px-5 py-12 sm:px-8"
    >
      <RouteState
        actions={
          <Link className={buttonVariants()} to="/">
            Return to WorkLedger
          </Link>
        }
        headingLevel="h1"
        headingProps={{
          'data-route-focus-key': 'route-heading',
          'data-route-heading': true,
          tabIndex: -1,
        }}
        kind="not-found"
        title="Page not found"
      >
        <p className="m-0">The page could not be found. Return to WorkLedger to continue.</p>
      </RouteState>
    </main>
  );
}
