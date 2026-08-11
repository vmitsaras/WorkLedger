import type { TodayTimelineEvent } from '@workledger/contracts';

import { formatLocalDate, formatTime } from '../app/date-time-format.js';

const EVENT_CONTENT: Readonly<
  Record<TodayTimelineEvent['type'], Readonly<{ description: string; label: string }>>
> = {
  BREAK_END: { description: 'Working time resumed.', label: 'Break ended' },
  BREAK_START: { description: 'Working time paused.', label: 'Break started' },
  CLOCK_IN: { description: 'Work session started.', label: 'Clocked in' },
  CLOCK_OUT: { description: 'Work session ended.', label: 'Clocked out' },
};

export function TodayAttendanceTimeline({
  events,
  localDate,
  timeZone,
  truncated,
}: Readonly<{
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
          {events.length === 0
            ? 'No immutable attendance events are recorded for this organization-local day.'
            : `${events.length.toString()} immutable attendance ${events.length === 1 ? 'event' : 'events'} in recorded order.`}{' '}
          Times are shown in {timeZone} for {formatLocalDate(localDate)}. Events sharing one time
          keep their recorded order.
        </p>
      </div>
      {events.length === 0 ? (
        <div className="wl-panel">
          <p className="m-0">No attendance events have been recorded today.</p>
        </div>
      ) : (
        <ol className="wl-panel wl-timeline-list m-0 grid list-none gap-0 p-0">
          {events.map((event) => {
            const content = EVENT_CONTENT[event.type];
            return (
              <li key={event.id} className="wl-timeline-item grid min-w-0 gap-3">
                <span className="wl-timeline-marker" aria-hidden="true" />
                <div className="grid min-w-0 gap-1">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
                    <span className="font-semibold">{content.label}</span>
                    <time
                      className="shrink-0 font-semibold tabular-nums"
                      dateTime={event.occurredAt}
                    >
                      {formatTime(event.occurredAt, timeZone)}
                    </time>
                  </div>
                  <span className="text-sm leading-6 text-[var(--wl-text-muted)]">
                    {content.description}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {truncated ? (
        <p className="wl-alert wl-alert-error m-0 rounded-xl border p-4 text-sm">
          The timeline is too long to show completely. The calculation is marked incomplete.
        </p>
      ) : null}
    </section>
  );
}
