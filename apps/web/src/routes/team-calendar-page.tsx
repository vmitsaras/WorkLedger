import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import type { TeamCalendar, TeamCalendarEntry } from '@workledger/contracts';
import { formatDateOnly, type MessageKey } from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
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
import { teamCalendarQuery } from '../app/query.js';
import { useBoundaryPresentation } from '../app/route-presentation.js';
import { setPendingSignInNotice } from '../app/session-notice.js';
import { PageHeader } from '../components/page-header.js';

type CalendarView = 'AGENDA' | 'MONTH';

const WEEKDAY_KEYS = [
  'manager.team.calendar.weekday.monday',
  'manager.team.calendar.weekday.tuesday',
  'manager.team.calendar.weekday.wednesday',
  'manager.team.calendar.weekday.thursday',
  'manager.team.calendar.weekday.friday',
  'manager.team.calendar.weekday.saturday',
  'manager.team.calendar.weekday.sunday',
] as const satisfies readonly MessageKey[];

export function TeamCalendarPage() {
  const t = useWorkLedgerMessage();
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
        eyebrow={t('manager.team.calendar.page.eyebrow')}
        title={t('shared.route.title.teamCalendar')}
        description={t('manager.team.calendar.page.description')}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
  const entries = useMemo(() => entriesByDate(calendar), [calendar]);
  const missingTeamCount = calendar.entries.filter(({ teamName }) => teamName === null).length;

  return (
    <>
      <Panel aria-labelledby="team-calendar-month-heading" className="grid gap-4" density="compact">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('manager.team.calendar.selectedMonth')}
            </p>
            <h2
              id="team-calendar-month-heading"
              className="m-0 mt-1 text-2xl font-bold"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatMonth(calendar.month, locale)}
            </h2>
          </div>
          <StatusBadge tone="info">
            {t('manager.team.calendar.unavailableCount', { count: calendar.entries.length })}
          </StatusBadge>
        </div>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('manager.team.calendar.scopeAsOf', {
            date: formatDateOnly(locale, calendar.scopeAsOfLocalDate, { dateStyle: 'full' }),
            timeZone: calendar.timeZone,
          })}
        </p>
      </Panel>
      <div className="flex flex-wrap gap-2" aria-label={t('manager.team.calendar.view.label')}>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={view === 'MONTH'}
          onPress={() => setView('MONTH')}
        >
          {t('manager.team.calendar.view.month')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-pressed={view === 'AGENDA'}
          onPress={() => setView('AGENDA')}
        >
          {t('manager.team.calendar.view.agenda')}
        </Button>
      </div>
      {missingTeamCount > 0 ? (
        <Alert announce={false} title={t('manager.team.calendar.missingTeam.title')} tone="warning">
          <p>{t('manager.team.calendar.missingTeam.description', { count: missingTeamCount })}</p>
        </Alert>
      ) : null}
      <SelectedDate
        date={selectedDate}
        entries={entries.get(selectedDate) ?? []}
        isToday={selectedDate === calendar.scopeAsOfLocalDate}
      />
      {calendar.entries.length === 0 ? (
        <RouteState kind="empty" title={t('manager.team.calendar.empty.monthTitle')}>
          <p>{t('manager.team.calendar.empty.monthDescription')}</p>
        </RouteState>
      ) : (
        <section aria-labelledby="team-availability-view-heading" className="grid gap-4">
          <h2 id="team-availability-view-heading" className="m-0 text-xl font-bold">
            {t('manager.team.calendar.byDate')}
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
      <nav
        className="flex flex-wrap gap-2"
        aria-label={t('manager.team.calendar.navigation.label')}
      >
        <Button
          type="button"
          variant="secondary"
          data-route-focus-key="team-calendar-previous-month"
          onPress={() => changeMonth(-1)}
        >
          {t('manager.team.calendar.navigation.previous')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          data-route-focus-key="team-calendar-next-month"
          onPress={() => changeMonth(1)}
        >
          {t('manager.team.calendar.navigation.next')}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
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
      caption={t('manager.team.calendar.grid.caption', {
        month: formatMonth(calendar.month, locale),
      })}
      className="min-w-[52rem]"
      scrollHint={t('manager.team.calendar.grid.scrollHint')}
      scrollLabel={t('manager.team.calendar.grid.scrollLabel')}
    >
      <thead>
        <tr>
          {WEEKDAY_KEYS.map((day) => (
            <th key={day} scope="col">
              {t(day)}
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
                        aria-label={t('manager.team.calendar.grid.selectDate', {
                          date: formatDateOnly(locale, date, { dateStyle: 'full' }),
                        })}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
  const dates = calendar.days.filter((date) => (entries.get(date)?.length ?? 0) > 0);
  if (dates.length === 0) return null;
  return (
    <ol
      className="m-0 grid gap-3 p-0"
      aria-label={t('manager.team.calendar.agenda.label', {
        month: formatMonth(calendar.month, locale),
      })}
    >
      {dates.map((date) => (
        <li key={date} className="list-none">
          <Panel as="article" className="grid gap-3" density="compact">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="m-0 text-lg font-bold">
                {formatDateOnly(locale, date, { dateStyle: 'full' })}
              </h3>
              <Button
                type="button"
                variant="secondary"
                aria-pressed={selectedDate === date}
                onPress={() => setSelectedDate(date)}
              >
                {t('manager.team.calendar.agenda.selectDate')}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const locale = runtime.locale as Parameters<typeof formatDateOnly>[0];
  return (
    <Panel className="grid gap-3" aria-labelledby="selected-team-date-heading" density="balanced">
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
          {t('manager.team.calendar.selectedDate')}
        </p>
        <h2
          id="selected-team-date-heading"
          className="m-0 mt-1 text-xl font-bold"
          aria-live="polite"
          aria-atomic="true"
        >
          {formatDateOnly(locale, date, { dateStyle: 'full' })}
          {isToday ? t('manager.team.calendar.todaySuffix') : ''}
        </h2>
      </div>
      {entries.length === 0 ? (
        <p className="m-0">{t('manager.team.calendar.empty.dateDescription')}</p>
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
  const t = useWorkLedgerMessage();
  return (
    <p className="m-0 text-xs font-semibold text-[var(--wl-text-muted)]">
      {[
        isToday ? t('manager.team.calendar.marker.today') : null,
        isSelected ? t('manager.team.calendar.marker.selected') : null,
        availabilityCount(entries, t),
      ]
        .filter((value): value is string => value !== null)
        .join(' · ')}
    </p>
  );
}

function AvailabilityEntry({
  compact = false,
  entry,
}: Readonly<{ compact?: boolean; entry: TeamCalendarEntry }>) {
  const t = useWorkLedgerMessage();
  return (
    <div
      className={
        compact
          ? 'grid gap-0.5 text-xs leading-5'
          : 'grid gap-1 rounded-lg bg-[var(--wl-surface)] p-3'
      }
    >
      <p className="m-0 font-semibold">{entry.employeeDisplayName}</p>
      <p className="m-0">
        {t('manager.team.calendar.entry.summary', { coverage: coverageLabel(entry, t) })}
      </p>
      <p className="m-0 text-[var(--wl-text-muted)]">
        {entry.teamName === null
          ? t('manager.team.calendar.entry.teamMissing')
          : t('manager.team.calendar.entry.team', { team: entry.teamName })}
      </p>
    </div>
  );
}

function TeamCalendarLoading() {
  const t = useWorkLedgerMessage();
  return (
    <RouteState kind="loading" title={t('manager.team.calendar.loading.title')}>
      <p>{t('manager.team.calendar.loading.description')}</p>
    </RouteState>
  );
}

function TeamCalendarError({ retry }: Readonly<{ retry: () => void }>) {
  const t = useWorkLedgerMessage();
  return (
    <Alert title={t('manager.team.calendar.error.title')} tone="danger">
      <p>{t('manager.team.calendar.error.description')}</p>
      <Button className="w-fit" type="button" variant="secondary" onPress={retry}>
        {t('shared.action.tryAgain')}
      </Button>
    </Alert>
  );
}

function TeamCalendarPermissionDenied() {
  const t = useWorkLedgerMessage();
  useBoundaryPresentation(t('shared.route.boundary.permissionDenied.title'));
  return (
    <section className="grid max-w-2xl gap-6">
      <PageHeader
        eyebrow={t('manager.team.calendar.permission.eyebrow')}
        title={t('shared.route.boundary.permissionDenied.title')}
        description={t('manager.team.calendar.permission.description')}
      />
      <Link className={buttonVariants({ variant: 'secondary' })} to="/">
        {t('shared.action.goHome')}
      </Link>
    </section>
  );
}

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

function formatMonth(month: string, locale: Parameters<typeof formatDateOnly>[0]): string {
  const [yearText = '', monthText = ''] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) return `${monthText} ${yearText}`;
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function availabilityCount(
  entries: readonly TeamCalendarEntry[],
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  return t('manager.team.calendar.unavailableCount', { count: entries.length });
}

function coverageLabel(
  entry: TeamCalendarEntry,
  t: ReturnType<typeof useWorkLedgerMessage>,
): string {
  if (entry.coverageKind === 'FULL_DAY') return t('manager.team.calendar.coverage.fullDay');
  if (entry.coverageKind === 'FIRST_HALF') return t('manager.team.calendar.coverage.firstHalf');
  if (entry.coverageKind === 'SECOND_HALF') return t('manager.team.calendar.coverage.secondHalf');
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
