import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { linkVariants } from '@workledger/ui';

import { useBoundaryPresentation } from '../app/route-presentation.js';
import { PageHeader } from '../components/page-header.js';

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

  return (
    <section className="grid max-w-2xl gap-6" role={status >= 500 ? 'alert' : undefined}>
      <PageHeader title={content.title} description={content.description} eyebrow="Route status" />
      <div className="flex flex-wrap gap-3">
        <Link className={linkVariants({ prominence: 'default' })} to="/">
          Go to my home
        </Link>
        {status >= 500 ? (
          <button type="button" className="wl-text-button" onClick={() => window.location.reload()}>
            Try again
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function RootNotFoundPage() {
  useBoundaryPresentation('Page not found');
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh w-full max-w-3xl content-center px-5 py-12 sm:px-8"
    >
      <section className="grid gap-6">
        <PageHeader
          eyebrow="Route status"
          title="Page not found"
          description="The page could not be found. Return to WorkLedger to continue."
        />
        <Link className={linkVariants({ prominence: 'default' })} to="/">
          Return to WorkLedger
        </Link>
      </section>
    </main>
  );
}
