import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import type { TeamCalendar, TeamCalendarEntry } from '@workledger/contracts';
import { Button, buttonVariants } from '@workledger/ui';

import { ApiClientError, clearSessionMemory } from '../app/api-client.js';
import { formatLocalDate } from '../app/date-time-format.js';
import { teamCalendarQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

type CalendarView = 'AGENDA' | 'MONTH';

export function TeamCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedMonth = searchParams.get('month') ?? undefined;
  const query = useQuery(
    teamCalendarQuery({ ...(requestedMonth === undefined ? {} : { month: requestedMonth }) }),
  );
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>(initialView);
  const [selectedDate, setSelectedDate] = useState<string>();

  useEffect(() => {
    if (!isAuthenticationError(query.error)) return;
    clearSessionMemory();
    queryClient.clear();
    if (query.error.code === 'AUTH_SESSION_EXPIRED') {
      setPendingSignInNotice('SESSION_EXPIRED');
    }
    void navigate('/sign-in', { replace: true });
  }, [navigate, query.error, queryClient]);

  useEffect(() => {
    const calendar = query.data;
    if (calendar === undefined) return;
    setSelectedDate(
      calendar.scopeAsOfLocalDate.startsWith(`${calendar.month}-`)
        ? calendar.scopeAsOfLocalDate
        : (calendar.days[0] ?? calendar.scopeAsOfLocalDate),
    );
  }, [query.data?.month]);

  if (
    query.isError &&
    query.error instanceof ApiClientError &&
    query.error.code === 'ACCESS_DENIED'
  ) {
    return <TeamCalendarPermissionDenied />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Team availability"
        title="Team calendar"
        description="Review neutral unavailability coverage for employees in your current authorized scope. Absence types and private context are never shown."
      />
      {query.isPending ? (
        <TeamCalendarLoading />
      ) : query.isError || query.data === undefined ? (
        <TeamCalendarError retry={() => void query.refetch()} />
      ) : (
        <TeamCalendarContent
          calendar={query.data}
          selectedDate={selectedDate ?? query.data.days[0] ?? query.data.scopeAsOfLocalDate}
          setSelectedDate={setSelectedDate}
          setView={setView}
          view={view}
          changeMonth={(direction) => {
            setSearchParams({ month: shiftMonth(query.data.month, direction) });
          }}
        />
      )}
    </section>
  );
}

function TeamCalendarContent({
  calendar,
  changeMonth,
  selectedDate,
  setSelectedDate,
  setView,
  view,
}: Readonly<{
  calendar: TeamCalendar;
  changeMonth: (direction: -1 | 1) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  setView: (view: CalendarView) => void;
  view: CalendarView;
}>) {
  const entries = useMemo(() => entriesByDate(calendar), [calendar]);
  const missingTeamCount = calendar.entries.filter(({ teamName }) => teamName === null).length;

  return (
    <>
      <section className="grid gap-4" aria-labelledby="team-calendar-month-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface)] p-4">
          <div className="grid gap-2">
            <h2 id="team-calendar-month-heading" className="m-0 text-xl font-bold">
              {formatMonth(calendar.month)}
            </h2>
            <p className="m-0 text-sm text-[var(--wl-text-muted)]">
              Current employee scope evaluated on {formatLocalDate(calendar.scopeAsOfLocalDate)} (
              {calendar.timeZone}).
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Team calendar month">
            <button
              type="button"
              className="wl-button-secondary"
              data-route-focus-key="team-calendar-previous-month"
              onClick={() => changeMonth(-1)}
            >
              Previous month
            </button>
            <button
              type="button"
              className="wl-button-secondary"
              data-route-focus-key="team-calendar-next-month"
              onClick={() => changeMonth(1)}
            >
              Next month
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Team calendar view">
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
        {calendar.entries.length === 0 ? (
          <p className="wl-alert m-0 rounded-xl border p-4" role="status">
            No team unavailability is recorded for this month.
          </p>
        ) : null}
        {missingTeamCount > 0 ? (
          <p className="wl-alert m-0 rounded-xl border p-4">
            {missingTeamCount} availability {missingTeamCount === 1 ? 'entry has' : 'entries have'}{' '}
            no current team assignment. The{' '}
            {missingTeamCount === 1 ? 'entry remains' : 'entries remain'}
            visible without guessing a team.
          </p>
        ) : null}
        {view === 'MONTH' ? (
          <MonthGrid
            calendar={calendar}
            entries={entries}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        ) : (
          <Agenda
            calendar={calendar}
            entries={entries}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        )}
      </section>
      <SelectedDate
        date={selectedDate}
        entries={entries.get(selectedDate) ?? []}
        isToday={selectedDate === calendar.scopeAsOfLocalDate}
      />
    </>
  );
}

function MonthGrid({
  calendar,
  entries,
  selectedDate,
  setSelectedDate,
}: Readonly<{
  calendar: TeamCalendar;
  entries: ReadonlyMap<string, readonly TeamCalendarEntry[]>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}>) {
  const dates = useMemo(
    () => [
      ...Array<string | null>(calendar.leadingEmptyDays).fill(null),
      ...calendar.days,
      ...Array<string | null>(
        (7 - ((calendar.leadingEmptyDays + calendar.days.length) % 7)) % 7,
      ).fill(null),
    ],
    [calendar.days, calendar.leadingEmptyDays],
  );
  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--wl-border)]"
      role="region"
      aria-label="Scrollable team availability month"
      tabIndex={0}
    >
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <caption className="p-3 text-left text-sm text-[var(--wl-text-muted)]">
          Neutral team unavailability for {formatMonth(calendar.month)}. Select a date for a focused
          list.
        </caption>
        <thead>
          <tr className="border-y border-[var(--wl-border)] text-sm">
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col" className="p-3">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks(dates).map((week, weekIndex) => (
            <tr key={weekIndex} className="align-top">
              {week.map((date, dayIndex) => {
                const dateEntries = date === null ? [] : (entries.get(date) ?? []);
                return (
                  <td
                    key={date ?? `${weekIndex.toString()}-${dayIndex.toString()}-blank`}
                    className="h-36 w-[14.28%] border-b border-r border-[var(--wl-border)] p-2 last:border-r-0"
                  >
                    {date === null ? null : (
                      <div className="grid gap-2">
                        <button
                          type="button"
                          className="w-fit rounded-md px-2 py-1 font-semibold"
                          aria-label={`Select ${formatLocalDate(date)}`}
                          aria-pressed={selectedDate === date}
                          onClick={() => setSelectedDate(date)}
                        >
                          {Number(date.slice(-2))}
                        </button>
                        <DateMarkers
                          entries={dateEntries}
                          isSelected={selectedDate === date}
                          isToday={calendar.scopeAsOfLocalDate === date}
                        />
                        {dateEntries.map((entry, index) => (
                          <AvailabilityEntry compact entry={entry} key={entryKey(entry, index)} />
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Agenda({
  calendar,
  entries,
  selectedDate,
  setSelectedDate,
}: Readonly<{
  calendar: TeamCalendar;
  entries: ReadonlyMap<string, readonly TeamCalendarEntry[]>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}>) {
  const dates = calendar.days.filter((date) => (entries.get(date)?.length ?? 0) > 0);
  if (dates.length === 0) return null;
  return (
    <ol
      className="m-0 grid gap-3 p-0"
      aria-label={`Team availability agenda for ${formatMonth(calendar.month)}`}
    >
      {dates.map((date) => (
        <li
          key={date}
          className="grid list-none gap-3 rounded-xl border border-[var(--wl-border)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-lg font-bold">{formatLocalDate(date)}</h3>
            <button
              type="button"
              className="wl-button-secondary"
              aria-pressed={selectedDate === date}
              onClick={() => setSelectedDate(date)}
            >
              Select date
            </button>
          </div>
          <DateMarkers
            entries={entries.get(date) ?? []}
            isSelected={selectedDate === date}
            isToday={calendar.scopeAsOfLocalDate === date}
          />
          <ul className="m-0 grid gap-2 p-0" role="list">
            {(entries.get(date) ?? []).map((entry, index) => (
              <li key={entryKey(entry, index)} className="list-none">
                <AvailabilityEntry entry={entry} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function SelectedDate({
  date,
  entries,
  isToday,
}: Readonly<{ date: string; entries: readonly TeamCalendarEntry[]; isToday: boolean }>) {
  return (
    <section
      className="grid gap-3 rounded-xl border border-[var(--wl-border)] bg-[var(--wl-surface-raised)] p-4"
      aria-labelledby="selected-team-date-heading"
    >
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Selected date</p>
        <h2 id="selected-team-date-heading" className="m-0 mt-1 text-xl font-bold">
          {formatLocalDate(date)}
          {isToday ? ' — Today' : ''}
        </h2>
      </div>
      {entries.length === 0 ? (
        <p className="m-0">No team unavailability is recorded for this date.</p>
      ) : (
        <ul className="m-0 grid gap-2 p-0" role="list">
          {entries.map((entry, index) => (
            <li key={entryKey(entry, index)} className="list-none">
              <AvailabilityEntry entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DateMarkers({
  entries,
  isSelected,
  isToday,
}: Readonly<{
  entries: readonly TeamCalendarEntry[];
  isSelected: boolean;
  isToday: boolean;
}>) {
  return (
    <p className="m-0 text-xs font-semibold text-[var(--wl-text-muted)]">
      {[isToday ? 'Today' : null, isSelected ? 'Selected' : null, availabilityCount(entries)]
        .filter((value): value is string => value !== null)
        .join(' · ')}
    </p>
  );
}

function AvailabilityEntry({
  compact = false,
  entry,
}: Readonly<{ compact?: boolean; entry: TeamCalendarEntry }>) {
  return (
    <div
      className={
        compact
          ? 'grid gap-0.5 text-xs leading-5'
          : 'grid gap-1 rounded-lg bg-[var(--wl-surface)] p-3'
      }
    >
      <p className="m-0 font-semibold">{entry.employeeDisplayName}</p>
      <p className="m-0">Unavailable — {coverageLabel(entry)}</p>
      <p className="m-0 text-[var(--wl-text-muted)]">
        {entry.teamName === null
          ? 'Current team assignment unavailable'
          : `Team: ${entry.teamName}`}
      </p>
    </div>
  );
}

function TeamCalendarLoading() {
  return (
    <div className="wl-panel grid gap-2" aria-busy="true">
      <h2 className="m-0 text-xl font-bold">Loading team calendar</h2>
      <p className="m-0 text-[var(--wl-text-muted)]">Checking authorized availability…</p>
    </div>
  );
}

function TeamCalendarError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <div className="wl-alert wl-alert-error grid gap-3 rounded-xl border p-4">
      <h2 className="m-0 text-xl font-bold">Team calendar is unavailable</h2>
      <p className="m-0">
        No restricted employee details were displayed. Try loading the authorized month again.
      </p>
      <Button className="w-fit" type="button" variant="secondary" onPress={retry}>
        Try again
      </Button>
    </div>
  );
}

function TeamCalendarPermissionDenied() {
  useBoundaryPresentation('Permission denied');
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow="Route status"
        title="Permission denied"
        description="Your current account cannot view the team calendar. No employee availability was disclosed."
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        Go to my home
      </Link>
    </section>
  );
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function initialView(): CalendarView {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'MONTH';
  return window.matchMedia('(max-width: 47.999rem)').matches ? 'AGENDA' : 'MONTH';
}

function entriesByDate(calendar: TeamCalendar): ReadonlyMap<string, readonly TeamCalendarEntry[]> {
  const entries = new Map<string, TeamCalendarEntry[]>();
  for (const entry of calendar.entries) {
    const current = entries.get(entry.localDate) ?? [];
    current.push(entry);
    entries.set(entry.localDate, current);
  }
  return new Map([...entries].map(([date, values]) => [date, Object.freeze(values)]));
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
  const [yearText = '', monthText = ''] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) return `${monthText} ${yearText}`;
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function availabilityCount(entries: readonly TeamCalendarEntry[]): string {
  return `${entries.length} unavailable ${entries.length === 1 ? 'entry' : 'entries'}`;
}

function coverageLabel(entry: TeamCalendarEntry): string {
  if (entry.coverageKind === 'FULL_DAY') return 'full day';
  if (entry.coverageKind === 'FIRST_HALF') return 'first half of expected work';
  if (entry.coverageKind === 'SECOND_HALF') return 'second half of expected work';
  return `${formatClock(entry.startsAtMinute)}–${formatClock(entry.endsAtMinute)}`;
}

function formatClock(value: number | null): string {
  if (value === null) return '';
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

function entryKey(entry: TeamCalendarEntry, index: number): string {
  return [
    entry.localDate,
    entry.employeeDisplayName,
    entry.coverageKind,
    entry.startsAtMinute ?? '',
    entry.endsAtMinute ?? '',
    index,
  ].join('-');
}

function isAuthenticationError(error: unknown): error is ApiClientError {
  return (
    error instanceof ApiClientError &&
    ['AUTH_REQUIRED', 'AUTH_SESSION_EXPIRED'].includes(error.code)
  );
}
