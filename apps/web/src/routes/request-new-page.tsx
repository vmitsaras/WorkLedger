import { useState } from 'react';
import { useSearchParams } from 'react-router';

import type { MessageKey } from '@workledger/i18n';
import { useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, Panel } from '@workledger/ui';

import { PageHeader } from '../components/page-header.js';
import { CorrectionRequestPage } from './correction-request-page.js';
import { SicknessReportPage } from './sickness-report-page.js';
import { VacationRequestPage } from './vacation-request-page.js';

type RequestWorkflow = 'CORRECTION' | 'SICKNESS' | 'VACATION';

const WORKFLOWS: readonly Readonly<{
  action: MessageKey;
  description: MessageKey;
  title: MessageKey;
  value: RequestWorkflow;
}>[] = [
  {
    action: 'employee.requests.new.workflow.vacation.action',
    description: 'employee.requests.new.workflow.vacation.description',
    title: 'employee.requests.new.workflow.vacation.title',
    value: 'VACATION',
  },
  {
    action: 'employee.requests.new.workflow.sickness.action',
    description: 'employee.requests.new.workflow.sickness.description',
    title: 'employee.requests.new.workflow.sickness.title',
    value: 'SICKNESS',
  },
  {
    action: 'employee.requests.new.workflow.correction.action',
    description: 'employee.requests.new.workflow.correction.description',
    title: 'employee.requests.new.workflow.correction.title',
    value: 'CORRECTION',
  },
];

export function RequestNewPage() {
  const t = useWorkLedgerMessage();
  const [search] = useSearchParams();
  const [workflow, setWorkflow] = useState<RequestWorkflow | null>(() =>
    search.has('recordId') ? 'CORRECTION' : null,
  );

  return (
    <section className="grid max-w-4xl gap-8">
      <PageHeader
        eyebrow={t('employee.requests.new.eyebrow')}
        title={t('employee.requests.history.new')}
        description={t('employee.requests.new.description')}
      />
      {workflow === null ? (
        <section aria-labelledby="request-workflow-heading" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="request-workflow-heading" className="m-0 text-xl font-bold">
              {t('employee.requests.new.selection.heading')}
            </h2>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              {t('employee.requests.new.selection.description')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOWS.map((choice) => (
              <Panel as="article" className="grid content-between gap-4" key={choice.value}>
                <div className="grid gap-2">
                  <h3 className="m-0 text-lg font-bold">{t(choice.title)}</h3>
                  <p className="m-0 text-sm text-[var(--wl-text-muted)]">{t(choice.description)}</p>
                </div>
                <Button onPress={() => setWorkflow(choice.value)} variant="secondary">
                  {t(choice.action)}
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
                {t('employee.requests.new.selection.selected')}
              </p>
              <h2 id="selected-workflow-heading" className="m-0 text-xl font-bold">
                {workflowTitle(workflow, t)}
              </h2>
            </div>
            <Button onPress={() => setWorkflow(null)} variant="quiet">
              {t('employee.requests.new.selection.change')}
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

function workflowTitle(
  workflow: RequestWorkflow,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (workflow === 'VACATION') return t('employee.requests.new.workflowTitle.vacation');
  if (workflow === 'SICKNESS') return t('employee.requests.new.workflowTitle.sickness');
  return t('employee.requests.new.workflowTitle.correction');
}
