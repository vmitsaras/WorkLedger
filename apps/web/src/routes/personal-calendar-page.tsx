import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { PersonalCalendar } from '@workledger/contracts';
import {
  formatDateOnly,
  formatNumber,
  type MessageArguments,
  type MessageKey,
} from '@workledger/i18n';
import { useWorkLedgerI18n, useWorkLedgerMessage } from '@workledger/i18n/react';
import { Button, DataTable, Panel, RouteState, StatusBadge } from '@workledger/ui';

import { ApiClientError } from '../app/api-client.js';
import { personalCalendarQuery } from '../app/query.js';
import { workflowStatusMessageKey } from '../app/workflow-status-presentation.js';
import { PageHeader } from '../components/page-header.js';

type CalendarView = 'AGENDA' | 'MONTH';
type MessageTranslator = <Key extends MessageKey>(
  key: Key,
  ...args: MessageArguments<Key>
) => string;

export function PersonalCalendarPage() {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
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
        <RouteState kind="loading" title={t('employee.calendar.loading.title')}>
          <p>{t('employee.calendar.loading.description')}</p>
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
            <p className="m-0 text-sm font-semibold text-[var(--wl-text-muted)]">
              {t('employee.calendar.selectedMonth')}
            </p>
            <h2
              id="personal-calendar-month"
              className="m-0 mt-1 text-2xl font-bold"
              aria-live="polite"
            >
              {formatMonth(runtime.locale, calendar.month)}
            </h2>
          </div>
          <StatusBadge tone="info">
            {t('employee.calendar.entries', {
              count: calendar.holidays.length + calendar.absences.length,
            })}
          </StatusBadge>
        </div>
        <p className="m-0 text-sm text-[var(--wl-text-muted)]">
          {t('employee.calendar.description')}
        </p>
      </Panel>
      <div className="flex flex-wrap gap-2" aria-label={t('employee.calendar.view.label')}>
        <Button
          type="button"
          aria-pressed={view === 'MONTH'}
          variant="secondary"
          onPress={() => {
            viewWasChosen.current = true;
            setView('MONTH');
          }}
        >
          {t('employee.calendar.view.month')}
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
          {t('employee.calendar.view.agenda')}
        </Button>
      </div>
      {view === 'MONTH' ? <MonthGrid calendar={calendar} /> : <Agenda calendar={calendar} />}
      <nav className="flex flex-wrap gap-2" aria-label={t('employee.calendar.navigation.label')}>
        <Button type="button" variant="secondary" onPress={() => changeMonth(-1)}>
          {t('employee.calendar.navigation.previous')}
        </Button>
        <Button type="button" variant="secondary" onPress={() => changeMonth(1)}>
          {t('employee.calendar.navigation.next')}
        </Button>
      </nav>
    </CalendarFrame>
  );
}

function CalendarFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  const t = useWorkLedgerMessage();
  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow={t('employee.calendar.eyebrow')}
        title={t('employee.calendar.title')}
        description={t('employee.calendar.description')}
      />
      {children}
    </section>
  );
}

function MonthGrid({ calendar }: Readonly<{ calendar: PersonalCalendar }>) {
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const dates = useMemo(
    () =>
      Object.freeze([
        ...Array(calendar.leadingEmptyDays).fill(null),
        ...calendar.days,
        ...Array((7 - ((calendar.leadingEmptyDays + calendar.days.length) % 7)) % 7).fill(null),
      ]),
    [calendar.days, calendar.leadingEmptyDays],
  );
  const details = useMemo(() => detailsByDate(calendar, t), [calendar, t]);
  const formattedMonth = formatMonth(runtime.locale, calendar.month);
  return (
    <DataTable
      caption={t('employee.calendar.grid.caption', { month: formattedMonth })}
      className="min-w-[46rem]"
      scrollHint={t('employee.calendar.grid.scrollHint')}
      scrollLabel={t('employee.calendar.grid.scrollLabel')}
    >
      <thead>
        <tr>
          {weekdays(runtime.locale).map((day) => (
            <th key={day} scope="col">
              {day}
            </th>
          ))}
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
  const runtime = useWorkLedgerI18n();
  const t = useWorkLedgerMessage();
  const details = detailsByDate(calendar, t);
  const items = [...details.entries()].sort(([first], [second]) => first.localeCompare(second));
  if (items.length === 0)
    return (
      <RouteState kind="empty" title={t('employee.calendar.empty.title')}>
        <p>{t('employee.calendar.empty.description')}</p>
      </RouteState>
    );
  return (
    <ol
      className="m-0 grid gap-3 p-0"
      aria-label={t('employee.calendar.agenda.label', {
        month: formatMonth(runtime.locale, calendar.month),
      })}
    >
      {items.map(([date, entries]) => (
        <li key={date} className="list-none">
          <Panel as="article" className="grid gap-2" density="balanced">
            <h2 className="m-0 text-lg font-bold">{formatDateOnly(runtime.locale, date)}</h2>
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
  const runtime = useWorkLedgerI18n();
  return (
    <div className="grid gap-1">
      <span className="font-semibold">{formatNumber(runtime.locale, Number(date.slice(-2)))}</span>
      {details.map((detail) => (
        <p key={detail.key} className="m-0 text-xs leading-5">
          {detail.label}
        </p>
      ))}
    </div>
  );
}

function detailsByDate(
  calendar: PersonalCalendar,
  t: MessageTranslator,
): ReadonlyMap<string, readonly CalendarDetail[]> {
  const details = new Map<string, CalendarDetail[]>();
  const add = (date: string, detail: CalendarDetail) => {
    const current = details.get(date) ?? [];
    current.push(detail);
    details.set(date, current);
  };
  for (const holiday of calendar.holidays)
    add(holiday.localDate, {
      key: `holiday-${holiday.localDate}-${holiday.name}`,
      label: t('employee.calendar.detail.holiday', { name: holiday.name }),
    });
  for (const absence of calendar.absences)
    add(absence.localDate, {
      key: `absence-${absence.localDate}-${absence.kind}-${absence.startsAtMinute ?? ''}-${absence.status}`,
      label: t('employee.calendar.detail.absence', {
        coverage: coverageLabel(absence.kind, absence.startsAtMinute, absence.endsAtMinute, t),
        status: t(workflowStatusMessageKey(absence.status)),
        type: absence.absenceTypeName,
      }),
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
function formatMonth(locale: Parameters<typeof formatDateOnly>[0], month: string): string {
  return formatDateOnly(locale, `${month}-01`, { month: 'long', year: 'numeric' });
}
function coverageLabel(
  kind: PersonalCalendar['absences'][number]['kind'],
  startsAtMinute: number | null,
  endsAtMinute: number | null,
  t: MessageTranslator,
): string {
  if (kind === 'FULL_DAY') return t('employee.absence.coverage.name.fullDay');
  if (kind === 'FIRST_HALF') return t('employee.absence.coverage.name.firstHalf');
  if (kind === 'SECOND_HALF') return t('employee.absence.coverage.name.secondHalf');
  return `${formatClock(startsAtMinute)}–${formatClock(endsAtMinute)}`;
}
function formatClock(value: number | null): string {
  if (value === null) return '';
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
function initialCalendarView(): CalendarView {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'MONTH';
  return window.matchMedia('(max-width: 47.999rem)').matches ? 'AGENDA' : 'MONTH';
}
function CalendarError({ error, retry }: Readonly<{ error: unknown; retry: () => void }>) {
  const t = useWorkLedgerMessage();
  const denied = error instanceof ApiClientError && error.code === 'ACCESS_DENIED';
  return (
    <RouteState
      actions={
        denied ? undefined : (
          <Button variant="secondary" onPress={retry}>
            {t('shared.action.tryAgain')}
          </Button>
        )
      }
      kind={denied ? 'permission-denied' : 'error'}
      title={
        denied
          ? t('employee.calendar.error.denied.title')
          : t('employee.calendar.error.unavailable.title')
      }
    >
      <p>
        {denied
          ? t('employee.calendar.error.denied.description')
          : t('employee.calendar.error.unavailable.description')}
      </p>
    </RouteState>
  );
}

function weekdays(locale: Parameters<typeof formatDateOnly>[0]): readonly string[] {
  const formatter = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long' });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2024, 0, index + 1))),
  );
}
