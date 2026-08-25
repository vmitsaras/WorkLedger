import type { TodayAppliedCorrection, TodayTimelineEvent } from '@workledger/contracts';
import { Alert, Panel } from '@workledger/ui';

import { formatDuration, formatLocalDate, formatTime } from '../app/date-time-format.js';

const EVENT_CONTENT: Readonly<
  Record<TodayTimelineEvent['type'], Readonly<{ description: string; label: string }>>
> = {
  BREAK_END: { description: 'Working time resumed.', label: 'Break ended' },
  BREAK_START: { description: 'Working time paused.', label: 'Break started' },
  CLOCK_IN: { description: 'Work session started.', label: 'Clocked in' },
  CLOCK_OUT: { description: 'Work session ended.', label: 'Clocked out' },
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
  return (
    <section className="grid gap-4" aria-labelledby="today-timeline-title">
      <div className="grid gap-1">
        <h2 id="today-timeline-title" className="m-0 text-2xl font-bold">
          Today’s timeline
        </h2>
        <p className="m-0 max-w-3xl text-sm leading-6 text-[var(--wl-text-muted)]">
          {formatLocalDate(localDate)} in {timeZone}.{' '}
          {events.length === 0
            ? 'No original attendance events are recorded.'
            : `${events.length.toString()} original ${events.length === 1 ? 'event' : 'events'} in recorded order.`}{' '}
          Events sharing one time keep their recorded order.
        </p>
      </div>

      {appliedCorrections.length === 0 ? null : (
        <section className="wl-panel grid gap-2" aria-labelledby="today-corrections-title">
          <h3 id="today-corrections-title" className="m-0 text-lg font-bold">
            Approved interpretation
          </h3>
          <ol className="m-0 grid gap-2 pl-5 text-sm leading-6">
            {appliedCorrections.map((correction, index) => (
              <li key={index}>
                Worked time changed from {formatDuration(correction.originalWorkedMinutes)} to{' '}
                {formatDuration(correction.correctedWorkedMinutes)} (
                {formatDuration(
                  correction.correctedWorkedMinutes - correction.originalWorkedMinutes,
                  true,
                )}
                ).
              </li>
            ))}
          </ol>
        </section>
      )}

      {events.length === 0 ? (
        <Panel>
          <p className="m-0">No attendance events have been recorded today.</p>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {appliedCorrections.length === 0 ? null : (
            <h3 className="m-0 text-lg font-bold">Original recorded events</h3>
          )}
          <ol className="wl-panel wl-timeline-list m-0 grid list-none gap-0 p-0">
            {events.map((event) => {
              const content = EVENT_CONTENT[event.type];
              return (
                <li key={event.id} className="wl-timeline-item grid min-w-0 gap-3">
                  <time className="shrink-0 font-semibold tabular-nums" dateTime={event.occurredAt}>
                    {formatTime(event.occurredAt, timeZone)}
                  </time>
                  <span className="wl-timeline-marker" aria-hidden="true" />
                  <span className="min-w-0 text-sm leading-6">
                    <strong>{content.label}.</strong> {content.description}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {truncated ? (
        <Alert announce={false} headingLevel="h3" title="Timeline incomplete" tone="danger">
          <p>The timeline is too long to show completely. The calculation is marked incomplete.</p>
        </Alert>
      ) : null}
    </section>
  );
}
