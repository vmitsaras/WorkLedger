import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button, Panel } from '@workledger/ui';

import { PageHeader } from '../components/page-header.js';
import { CorrectionRequestPage } from './correction-request-page.js';
import { SicknessReportPage } from './sickness-report-page.js';
import { VacationRequestPage } from './vacation-request-page.js';

type RequestWorkflow = 'CORRECTION' | 'SICKNESS' | 'VACATION';

const WORKFLOWS: readonly Readonly<{
  description: string;
  title: string;
  value: RequestWorkflow;
}>[] = [
  {
    description: 'Reserve vacation entitlement for full days, part days, or an exact interval.',
    title: 'Vacation',
    value: 'VACATION',
  },
  {
    description: 'Record sickness coverage without entering medical details.',
    title: 'Sickness',
    value: 'SICKNESS',
  },
  {
    description: 'Propose a replacement interval while preserving the original attendance events.',
    title: 'Time correction',
    value: 'CORRECTION',
  },
];

export function RequestNewPage() {
  const [search] = useSearchParams();
  const [workflow, setWorkflow] = useState<RequestWorkflow | null>(() =>
    search.has('recordId') ? 'CORRECTION' : null,
  );

  return (
    <section className="grid max-w-4xl gap-8">
      <PageHeader
        eyebrow="Requests"
        title="New request"
        description="Choose the workflow that matches what happened. This choice stays on this page and is not added to the address."
      />
      {workflow === null ? (
        <section aria-labelledby="request-workflow-heading" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="request-workflow-heading" className="m-0 text-xl font-bold">
              What do you need to record?
            </h2>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              Each workflow explains its effect before you submit.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOWS.map((choice) => (
              <Panel as="article" className="grid content-between gap-4" key={choice.value}>
                <div className="grid gap-2">
                  <h3 className="m-0 text-lg font-bold">{choice.title}</h3>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">{choice.description}</p>
                </div>
                <Button onPress={() => setWorkflow(choice.value)} variant="secondary">
                  Choose {choice.title.toLocaleLowerCase()}
                </Button>
              </Panel>
            ))}
          </div>
        </section>
      ) : (
        <section aria-labelledby="selected-workflow-heading" className="grid gap-6">
          <Panel className="flex flex-wrap items-center justify-between gap-4" density="compact">
            <div className="grid gap-1">
              <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
                Selected workflow
              </p>
              <h2 id="selected-workflow-heading" className="m-0 text-xl font-bold">
                {workflowTitle(workflow)}
              </h2>
            </div>
            <Button onPress={() => setWorkflow(null)} variant="quiet">
              Choose a different workflow
            </Button>
          </Panel>
          {workflow === 'VACATION' ? <VacationRequestPage embedded /> : null}
          {workflow === 'SICKNESS' ? <SicknessReportPage embedded /> : null}
          {workflow === 'CORRECTION' ? <CorrectionRequestPage embedded /> : null}
        </section>
      )}
    </section>
  );
}

function workflowTitle(workflow: RequestWorkflow): string {
  if (workflow === 'VACATION') return 'Vacation request';
  if (workflow === 'SICKNESS') return 'Sickness report';
  return 'Time correction';
}
