import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Button, buttonVariants, RouteState } from '@workledger/ui';
import { translate, type MessageKey } from '@workledger/i18n';
import { useOptionalWorkLedgerI18n } from '@workledger/i18n/react';

import { ApiClientError } from '../app/api-client.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';

export function RootRouteBoundary() {
  const error = useRouteError();
  const requestId = error instanceof ApiClientError ? error.requestId : undefined;
  const runtime = useOptionalWorkLedgerI18n();
  const title = localizedMessage(
    runtime,
    'shared.route.boundary.rootUnavailable.title',
    'WorkLedger is temporarily unavailable',
  );
  const description = localizedMessage(
    runtime,
    'shared.route.boundary.rootUnavailable.description',
    'WorkLedger could not complete the service check needed to start this page. Try again after the service is available.',
  );

  useBoundaryPresentation(title);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh w-full max-w-3xl content-center px-5 py-12 sm:px-8"
    >
      <div role="alert">
        <RouteState
          actions={
            <Button variant="secondary" onPress={() => window.location.reload()}>
              {localizedMessage(runtime, 'shared.action.tryAgain', 'Try again')}
            </Button>
          }
          headingLevel="h1"
          headingProps={{
            'data-route-focus-key': 'route-heading',
            'data-route-heading': true,
            tabIndex: -1,
          }}
          kind="error"
          title={title}
        >
          <p className="m-0">{description}</p>
          {requestId === undefined ? null : (
            <p className="m-0 break-all text-xs">Request reference: {requestId}</p>
          )}
        </RouteState>
      </div>
    </main>
  );
}

export function RouteBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 503;
  const runtime = useOptionalWorkLedgerI18n();
  const content =
    status === 403
      ? {
          description: localizedMessage(
            runtime,
            'shared.route.boundary.permissionDenied.description',
            'Your current account does not have access to this area. No restricted record details were disclosed.',
          ),
          title: localizedMessage(
            runtime,
            'shared.route.boundary.permissionDenied.title',
            'Permission denied',
          ),
        }
      : status === 404
        ? {
            description: localizedMessage(
              runtime,
              'shared.route.boundary.notFound.description',
              'The page could not be found or is no longer available.',
            ),
            title: localizedMessage(
              runtime,
              'shared.route.boundary.notFound.title',
              'Page not found',
            ),
          }
        : {
            description: localizedMessage(
              runtime,
              'shared.route.boundary.unavailable.description',
              'WorkLedger could not load this page. Check the service and try again without resubmitting any form.',
            ),
            title: localizedMessage(
              runtime,
              'shared.route.boundary.unavailable.title',
              'Page unavailable',
            ),
          };

  useBoundaryPresentation(content.title);

  const state = (
    <RouteState
      actions={
        <>
          <Link className={buttonVariants()} to="/">
            {localizedMessage(runtime, 'shared.action.goHome', 'Go to my home')}
          </Link>
          {status >= 500 ? (
            <Button variant="secondary" onPress={() => window.location.reload()}>
              {localizedMessage(runtime, 'shared.action.tryAgain', 'Try again')}
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
  const runtime = useOptionalWorkLedgerI18n();
  const title = localizedMessage(runtime, 'shared.route.boundary.notFound.title', 'Page not found');
  const description = localizedMessage(
    runtime,
    'shared.route.boundary.notFound.description',
    'The page could not be found or is no longer available.',
  );
  useBoundaryPresentation(title);
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh w-full max-w-3xl content-center px-5 py-12 sm:px-8"
    >
      <RouteState
        actions={
          <Link className={buttonVariants()} to="/">
            {localizedMessage(runtime, 'shared.action.returnHome', 'Return to WorkLedger')}
          </Link>
        }
        headingLevel="h1"
        headingProps={{
          'data-route-focus-key': 'route-heading',
          'data-route-heading': true,
          tabIndex: -1,
        }}
        kind="not-found"
        title={title}
      >
        <p className="m-0">{description}</p>
      </RouteState>
    </main>
  );
}

function localizedMessage(
  runtime: ReturnType<typeof useOptionalWorkLedgerI18n>,
  key: MessageKey,
  fallback: string,
): string {
  return runtime === null ? fallback : translate(runtime, key);
}
