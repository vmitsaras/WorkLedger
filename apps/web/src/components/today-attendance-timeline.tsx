import type { TodayAppliedCorrection, TodayTimelineEvent } from '@workledger/contracts';
import {
  formatCompactDuration,
  formatDateOnly,
  formatInstant,
  type I18nRuntime,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Alert, Panel } from '@workledger/ui';

const EVENT_CONTENT: Readonly<
  Record<TodayTimelineEvent['type'], Readonly<{ description: MessageKey; label: MessageKey }>>
> = {
  BREAK_END: {
    description: 'employee.today.timeline.event.breakEnd.description',
    label: 'employee.today.timeline.event.breakEnd.label',
  },
  BREAK_START: {
    description: 'employee.today.timeline.event.breakStart.description',
    label: 'employee.today.timeline.event.breakStart.label',
  },
  CLOCK_IN: {
    description: 'employee.today.timeline.event.clockIn.description',
    label: 'employee.today.timeline.event.clockIn.label',
  },
  CLOCK_OUT: {
    description: 'employee.today.timeline.event.clockOut.description',
    label: 'employee.today.timeline.event.clockOut.label',
  },
};

export function TodayAttendanceTimeline({
  appliedCorrections,
  events,
  localDate,
  timeZone,
  truncated,
}: Readonly<{
  appliedCorrections: readonly TodayAppliedCorrection[];
  events: readonly TodayTimelineEvent[];
  localDate: string;
  timeZone: string;
  truncated: boolean;
}>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const formattedDate = formatDateOnly(runtime.locale, localDate);
  return (
    <section className="grid gap-4" aria-labelledby="today-timeline-title">
      <div className="grid gap-1">
        <h2 id="today-timeline-title" className="m-0 text-2xl font-bold">
          {t('employee.today.timeline.title')}
        </h2>
        <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {events.length === 0
            ? t('employee.today.timeline.description.empty', {
                date: formattedDate,
                timeZone,
              })
            : t('employee.today.timeline.description.events', {
                count: events.length,
                date: formattedDate,
                timeZone,
              })}
        </p>
      </div>

      {appliedCorrections.length === 0 ? null : (
        <section className="wl-panel grid gap-2" aria-labelledby="today-corrections-title">
          <h3 id="today-corrections-title" className="m-0 text-lg font-bold">
            {t('employee.today.timeline.approvedInterpretation')}
          </h3>
          <ol className="m-0 grid gap-2 pl-5 text-sm leading-6">
            {appliedCorrections.map((correction, index) => (
              <li key={index}>
                {t('employee.today.timeline.correction', {
                  after: formatCompactDuration(runtime, correction.correctedWorkedMinutes),
                  before: formatCompactDuration(runtime, correction.originalWorkedMinutes),
                  difference: formatCompactDuration(
                    runtime,
                    correction.correctedWorkedMinutes - correction.originalWorkedMinutes,
                    true,
                  ),
                })}
              </li>
            ))}
          </ol>
        </section>
      )}

      {events.length === 0 ? (
        <Panel>
          <p className="m-0">{t('employee.today.timeline.empty')}</p>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {appliedCorrections.length === 0 ? null : (
            <h3 className="m-0 text-lg font-bold">{t('employee.today.timeline.originalEvents')}</h3>
          )}
          <ol className="wl-panel wl-timeline-list m-0 grid list-none gap-0 p-0">
            {events.map((event) => {
              const content = EVENT_CONTENT[event.type];
              return (
                <li key={event.id} className="wl-timeline-item grid min-w-0 gap-3">
                  <time className="shrink-0 font-semibold tabular-nums" dateTime={event.occurredAt}>
                    {formatClockTime(runtime, event.occurredAt, timeZone)}
                  </time>
                  <span className="wl-timeline-marker" aria-hidden="true" />
                  <span className="min-w-0 text-sm leading-6">
                    <strong>
                      {t(content.label)}
                      {'.'}
                    </strong>{' '}
                    {t(content.description)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {truncated ? (
        <Alert
          announce={false}
          headingLevel="h3"
          title={t('employee.today.timeline.incomplete.title')}
          tone="danger"
        >
          <p>{t('employee.today.timeline.incomplete.description')}</p>
        </Alert>
      ) : null}
    </section>
  );
}

function formatClockTime(runtime: I18nRuntime, value: string, timeZone: string): string {
  return formatInstant(runtime.locale, value, timeZone, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
