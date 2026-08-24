import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { PersonalCalendar } from '@workledger/contracts';
import { Button, DataTable, Panel, RouteState, StatusBadge } from '@workledger/ui';

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
  const viewWasChosen = useRef(false);
  const [view, setView] = useState<CalendarView>(initialCalendarView);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(max-width: 47.999rem)');
    const selectResponsiveDefault = () => {
      if (!viewWasChosen.current) setView(media.matches ? 'AGENDA' : 'MONTH');
    };
    selectResponsiveDefault();
    media.addEventListener('change', selectResponsiveDefault);
    return () => media.removeEventListener('change', selectResponsiveDefault);
  }, []);

  if (query.isPending)
    return (
      <CalendarFrame>
        <RouteState kind="loading" title="Loading your calendar">
          <p>Checking public holidays and your own absence coverage.</p>
        </RouteState>
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
      <Panel aria-labelledby="personal-calendar-month" className="grid gap-4" density="balanced">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Selected month</p>
            <h2
              id="personal-calendar-month"
              className="m-0 mt-1 text-2xl font-bold"
              aria-live="polite"
            >
              {formatMonth(calendar.month)}
            </h2>
          </div>
          <StatusBadge tone="info">
            {calendar.holidays.length + calendar.absences.length} calendar{' '}
            {calendar.holidays.length + calendar.absences.length === 1 ? 'entry' : 'entries'}
          </StatusBadge>
        </div>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Public holidays and your own absence coverage. The agenda and month grid contain the same
          authorized information.
        </p>
      </Panel>
      <div className="flex flex-wrap gap-2" aria-label="Calendar view">
        <Button
          type="button"
          aria-pressed={view === 'MONTH'}
          variant="secondary"
          onPress={() => {
            viewWasChosen.current = true;
            setView('MONTH');
          }}
        >
          Month grid
        </Button>
        <Button
          type="button"
          aria-pressed={view === 'AGENDA'}
          variant="secondary"
          onPress={() => {
            viewWasChosen.current = true;
            setView('AGENDA');
          }}
        >
          Agenda list
        </Button>
      </div>
      {view === 'MONTH' ? <MonthGrid calendar={calendar} /> : <Agenda calendar={calendar} />}
      <nav className="flex flex-wrap gap-2" aria-label="Calendar month">
        <Button type="button" variant="secondary" onPress={() => changeMonth(-1)}>
          Previous month
        </Button>
        <Button type="button" variant="secondary" onPress={() => changeMonth(1)}>
          Next month
        </Button>
      </nav>
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
    <DataTable
      caption={`Personal holidays and absence coverage for ${formatMonth(calendar.month)}`}
      className="min-w-[46rem]"
      scrollHint="Scroll horizontally to review all seven days."
      scrollLabel="Personal calendar month grid"
    >
      <thead>
        <tr>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
            (day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {weeks(dates).map((week, index) => (
          <tr key={index} className="align-top">
            {week.map((date, dayIndex) => (
              <td key={date ?? `${index}-${dayIndex}-blank`} className="h-32 w-[14.28%] align-top">
                {date === null ? null : (
                  <DayContent date={date} details={details.get(date) ?? []} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function Agenda({ calendar }: Readonly<{ calendar: PersonalCalendar }>) {
  const details = detailsByDate(calendar);
  const items = [...details.entries()].sort(([first], [second]) => first.localeCompare(second));
  if (items.length === 0)
    return (
      <RouteState kind="empty" title="Nothing scheduled this month">
        <p>No public holidays or personal absence coverage appears in this month.</p>
      </RouteState>
    );
  return (
    <ol
      className="m-0 grid gap-3 p-0"
      aria-label={`Calendar agenda for ${formatMonth(calendar.month)}`}
    >
      {items.map(([date, entries]) => (
        <li key={date} className="list-none">
          <Panel as="article" className="grid gap-2" density="balanced">
            <h2 className="m-0 text-lg font-bold">{formatLocalDate(date)}</h2>
            <ul className="m-0 grid gap-1 pl-5">
              {entries.map((entry) => (
                <li key={entry.key}>{entry.label}</li>
              ))}
            </ul>
          </Panel>
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
function initialCalendarView(): CalendarView {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'MONTH';
  return window.matchMedia('(max-width: 47.999rem)').matches ? 'AGENDA' : 'MONTH';
}
function CalendarError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <RouteState
      actions={
        denied ? undefined : (
          <Button variant="secondary" onPress={retry}>
            Try again
          </Button>
        )
      }
      kind={denied ? 'permission-denied' : 'error'}
      title={denied ? 'You cannot view this calendar' : 'Your calendar is unavailable'}
    >
      <p>
        {denied
          ? 'Your current account does not have employee calendar access.'
          : 'No holiday or absence information was displayed. Try again.'}
      </p>
    </RouteState>
  );
}
