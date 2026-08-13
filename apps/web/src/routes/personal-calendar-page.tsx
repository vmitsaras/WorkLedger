import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { PersonalCalendar } from '@workledger/contracts';

import { ApiClientError } from '../app/api-client.js';
import { formatLocalDate } from '../app/date-time-format.js';
import { personalCalendarQuery } from '../app/query.js';
import { PageHeader } from '../components/page-header.js';

type CalendarView = 'AGENDA' | 'MONTH';

export function PersonalCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMonth = searchParams.get('month') ?? undefined;
  const query = useQuery(
    personalCalendarQuery({ ...(requestedMonth === undefined ? {} : { month: requestedMonth }) }),
  );
  const [view, setView] = useState<CalendarView>('MONTH');

  if (query.isPending)
    return (
      <CalendarFrame>
        <p role="status">Loading your calendar…</p>
      </CalendarFrame>
    );
  if (query.isError || query.data === undefined)
    return (
      <CalendarFrame>
        <CalendarError error={query.error} retry={() => void query.refetch()} />
      </CalendarFrame>
    );

  const calendar = query.data;
  const changeMonth = (direction: -1 | 1) => {
    setSearchParams({ month: shiftMonth(calendar.month, direction) });
  };

  return (
    <CalendarFrame>
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface)] p-4">
        <div className="grid gap-2">
          <h2 className="m-0 text-xl font-bold" aria-live="polite">
            {formatMonth(calendar.month)}
          </h2>
          <p className="m-0 text-sm text-[var(--wl-text-muted)]">
            Public holidays and your own absence coverage. Calendar and agenda contain the same
            information.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Calendar month">
          <button type="button" className="wl-button-secondary" onClick={() => changeMonth(-1)}>
            Previous month
          </button>
          <button type="button" className="wl-button-secondary" onClick={() => changeMonth(1)}>
            Next month
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Calendar view">
        <button
          type="button"
          className="wl-button-secondary"
          aria-pressed={view === 'MONTH'}
          onClick={() => setView('MONTH')}
        >
          Month grid
        </button>
        <button
          type="button"
          className="wl-button-secondary"
          aria-pressed={view === 'AGENDA'}
          onClick={() => setView('AGENDA')}
        >
          Agenda list
        </button>
      </div>
      {view === 'MONTH' ? <MonthGrid calendar={calendar} /> : <Agenda calendar={calendar} />}
    </CalendarFrame>
  );
}

function CalendarFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="My work"
        title="Calendar"
        description="Review your public holidays and absence coverage by month."
      />
      {children}
    </section>
  );
}

function MonthGrid({ calendar }: Readonly<{ calendar: PersonalCalendar }>) {
  const dates = useMemo(
    () =>
      Object.freeze([
        ...Array(calendar.leadingEmptyDays).fill(null),
        ...calendar.days,
        ...Array((7 - ((calendar.leadingEmptyDays + calendar.days.length) % 7)) % 7).fill(null),
      ]),
    [calendar.days, calendar.leadingEmptyDays],
  );
  const details = useMemo(() => detailsByDate(calendar), [calendar]);
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--wl-border)]">
      <table className="w-full min-w-[46rem] border-collapse text-left">
        <caption className="sr-only">
          Personal holidays and absence coverage for {formatMonth(calendar.month)}
        </caption>
        <thead>
          <tr className="border-b border-[var(--wl-border)] text-sm">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
              (day) => (
                <th key={day} scope="col" className="p-3">
                  {day}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {weeks(dates).map((week, index) => (
            <tr key={index} className="align-top">
              {week.map((date) => (
                <td
                  key={date ?? `${index}-blank`}
                  className="h-32 w-[14.28%] border-b border-r border-[var(--wl-border)] p-2 last:border-r-0"
                >
                  {date === null ? null : (
                    <DayContent date={date} details={details.get(date) ?? []} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Agenda({ calendar }: Readonly<{ calendar: PersonalCalendar }>) {
  const details = detailsByDate(calendar);
  const items = [...details.entries()].sort(([first], [second]) => first.localeCompare(second));
  if (items.length === 0)
    return (
      <p className="wl-alert m-0 rounded-xl border p-4" role="status">
        No public holidays or personal absence coverage this month.
      </p>
    );
  return (
    <ol
      className="m-0 grid gap-3 p-0"
      aria-label={`Calendar agenda for ${formatMonth(calendar.month)}`}
    >
      {items.map(([date, entries]) => (
        <li
          key={date}
          className="grid list-none gap-2 rounded-xl border border-[var(--wl-border)] p-4"
        >
          <h2 className="m-0 text-lg font-bold">{formatLocalDate(date)}</h2>
          <ul className="m-0 grid gap-1 pl-5">
            {entries.map((entry) => (
              <li key={entry.key}>{entry.label}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

type CalendarDetail = Readonly<{ key: string; label: string }>;
function DayContent({
  date,
  details,
}: Readonly<{ date: string; details: readonly CalendarDetail[] }>) {
  return (
    <div className="grid gap-1">
      <span className="font-semibold">{date.slice(-2).replace(/^0/u, '')}</span>
      {details.map((detail) => (
        <p key={detail.key} className="m-0 text-xs leading-5">
          {detail.label}
        </p>
      ))}
    </div>
  );
}

function detailsByDate(calendar: PersonalCalendar): ReadonlyMap<string, readonly CalendarDetail[]> {
  const details = new Map<string, CalendarDetail[]>();
  const add = (date: string, detail: CalendarDetail) => {
    const current = details.get(date) ?? [];
    current.push(detail);
    details.set(date, current);
  };
  for (const holiday of calendar.holidays)
    add(holiday.localDate, {
      key: `holiday-${holiday.localDate}-${holiday.name}`,
      label: `Public holiday: ${holiday.name}`,
    });
  for (const absence of calendar.absences)
    add(absence.localDate, {
      key: `absence-${absence.localDate}-${absence.kind}-${absence.startsAtMinute ?? ''}-${absence.status}`,
      label: `${absence.absenceTypeName}: ${coverageLabel(absence.kind, absence.startsAtMinute, absence.endsAtMinute)} (${statusLabel(absence.status)})`,
    });
  return new Map([...details.entries()].map(([date, entries]) => [date, Object.freeze(entries)]));
}

function weeks(dates: readonly (string | null)[]): readonly (readonly (string | null)[])[] {
  return Array.from({ length: dates.length / 7 }, (_, index) =>
    dates.slice(index * 7, index * 7 + 7),
  );
}
function shiftMonth(month: string, direction: -1 | 1): string {
  const [yearText = '', monthText = ''] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText) + direction;
  if (monthNumber === 0) return `${year - 1}-12`;
  if (monthNumber === 13) return `${year + 1}-01`;
  return `${year}-${monthNumber.toString().padStart(2, '0')}`;
}
function formatMonth(month: string): string {
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const [year = '', number = ''] = month.split('-');
  return `${names[Number(number) - 1] ?? month} ${year}`;
}
function coverageLabel(
  kind: PersonalCalendar['absences'][number]['kind'],
  startsAtMinute: number | null,
  endsAtMinute: number | null,
): string {
  if (kind === 'FULL_DAY') return 'Full day';
  if (kind === 'FIRST_HALF') return 'First half of expected work';
  if (kind === 'SECOND_HALF') return 'Second half of expected work';
  return `${formatClock(startsAtMinute)}–${formatClock(endsAtMinute)}`;
}
function formatClock(value: number | null): string {
  if (value === null) return '';
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
function statusLabel(status: PersonalCalendar['absences'][number]['status']): string {
  return status.replaceAll('_', ' ').toLowerCase();
}
function CalendarError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const message =
    error instanceof ApiClientError && error.code === 'ACCESS_DENIED'
      ? 'You do not have access to a personal calendar.'
      : 'WorkLedger could not load your calendar.';
  return (
    <div className="wl-alert m-0 grid gap-3 rounded-xl border p-4" role="alert">
      <p className="m-0">{message}</p>
      <button type="button" className="wl-button-secondary w-fit" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
