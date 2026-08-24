import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import type { TeamCalendar, TeamCalendarEntry } from '@workledger/contracts';
import {
  Alert,
  Button,
  DataTable,
  Panel,
  RouteState,
  StatusBadge,
  buttonVariants,
} from '@workledger/ui';

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
  const viewWasChosen = useRef(false);
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

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 47.999rem)');
    const selectResponsiveDefault = () => {
      if (!viewWasChosen.current) setView(media.matches ? 'AGENDA' : 'MONTH');
    };
    selectResponsiveDefault();
    media.addEventListener('change', selectResponsiveDefault);
    return () => media.removeEventListener('change', selectResponsiveDefault);
  }, []);

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
        description="Plan around neutral team availability while keeping the selected date and month in view."
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
          setView={(nextView) => {
            viewWasChosen.current = true;
            setView(nextView);
          }}
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
      <Panel aria-labelledby="team-calendar-month-heading" className="grid gap-4" density="compact">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Selected month</p>
            <h2
              id="team-calendar-month-heading"
              className="m-0 mt-1 text-2xl font-bold"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatMonth(calendar.month)}
            </h2>
          </div>
          <StatusBadge tone="info">
            {calendar.entries.length} unavailable{' '}
            {calendar.entries.length === 1 ? 'entry' : 'entries'}
          </StatusBadge>
        </div>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          Current employee scope evaluated on {formatLocalDate(calendar.scopeAsOfLocalDate)} (
          {calendar.timeZone}). Both views contain the same neutral availability.
        </p>
      </Panel>
      <div className="flex flex-wrap gap-2" aria-label="Team calendar view">
        <Button
          type="button"
          variant="secondary"
          aria-pressed={view === 'MONTH'}
          onPress={() => setView('MONTH')}
        >
          Month grid
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={view === 'AGENDA'}
          onPress={() => setView('AGENDA')}
        >
          Agenda list
        </Button>
      </div>
      {missingTeamCount > 0 ? (
        <Alert announce={false} title="Current team assignment unavailable" tone="warning">
          <p>
            {missingTeamCount} availability {missingTeamCount === 1 ? 'entry has' : 'entries have'}{' '}
            no current team assignment. The{' '}
            {missingTeamCount === 1 ? 'entry remains' : 'entries remain'} visible without guessing a
            team.
          </p>
        </Alert>
      ) : null}
      <SelectedDate
        date={selectedDate}
        entries={entries.get(selectedDate) ?? []}
        isToday={selectedDate === calendar.scopeAsOfLocalDate}
      />
      {calendar.entries.length === 0 ? (
        <RouteState kind="empty" title="No unavailability this month">
          <p>No team unavailability is recorded for this month.</p>
        </RouteState>
      ) : (
        <section aria-labelledby="team-availability-view-heading" className="grid gap-4">
          <h2 id="team-availability-view-heading" className="m-0 text-xl font-bold">
            Availability by date
          </h2>
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
      )}
      <nav className="flex flex-wrap gap-2" aria-label="Team calendar month">
        <Button
          type="button"
          variant="secondary"
          data-route-focus-key="team-calendar-previous-month"
          onPress={() => changeMonth(-1)}
        >
          Previous month
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-route-focus-key="team-calendar-next-month"
          onPress={() => changeMonth(1)}
        >
          Next month
        </Button>
      </nav>
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
    <DataTable
      caption={`Neutral team unavailability for ${formatMonth(calendar.month)}. Select a date for a focused list.`}
      className="min-w-[52rem]"
      scrollHint="Scroll horizontally to review all seven days."
      scrollLabel="Team availability month grid"
    >
      <thead>
        <tr>
          {WEEKDAYS.map((day) => (
            <th key={day} scope="col">
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
                  className="h-36 w-[14.28%]"
                >
                  {date === null ? null : (
                    <div className="grid gap-2">
                      <Button
                        type="button"
                        className="w-fit px-2 py-1"
                        variant="quiet"
                        aria-label={`Select ${formatLocalDate(date)}`}
                        aria-pressed={selectedDate === date}
                        onPress={() => setSelectedDate(date)}
                      >
                        {Number(date.slice(-2))}
                      </Button>
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
    </DataTable>
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
        <li key={date} className="list-none">
          <Panel as="article" className="grid gap-3" density="compact">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-lg font-bold">{formatLocalDate(date)}</h3>
              <Button
                type="button"
                variant="secondary"
                aria-pressed={selectedDate === date}
                onPress={() => setSelectedDate(date)}
              >
                Select date
              </Button>
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
          </Panel>
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
    <Panel className="grid gap-3" aria-labelledby="selected-team-date-heading" density="balanced">
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">Selected date</p>
        <h2
          id="selected-team-date-heading"
          className="m-0 mt-1 text-xl font-bold"
          aria-live="polite"
          aria-atomic="true"
        >
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
    </Panel>
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
    <RouteState kind="loading" title="Loading team calendar">
      <p>Preparing team availability for the selected month.</p>
    </RouteState>
  );
}

function TeamCalendarError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <Alert title="Team calendar is unavailable" tone="danger">
      <p>The selected month could not be loaded. Check your connection and try again.</p>
      <Button className="w-fit" type="button" variant="secondary" onPress={retry}>
        Try again
      </Button>
    </Alert>
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
