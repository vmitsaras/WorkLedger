import type { TeamCalendar, TeamCalendarQuery } from '@workledger/contracts';
import {
  addLocalDateDays,
  localDateAtInstant,
  parseDomainId,
  parseLocalDate,
  parseTimeZoneId,
  startOfLocalMonth,
  weekdayOfLocalDate,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';

import { employeeCollectionScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type TeamCalendarIdentity = Readonly<{ accountId: DomainId<'Account'> }>;

export function createTeamCalendarService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async list(
      identity: TeamCalendarIdentity,
      query: TeamCalendarQuery,
      at: Instant,
    ): Promise<TeamCalendar> {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw unavailable();
          const scopeAsOfLocalDate = localDateAtInstant(at, timeZone.value);
          const actor = await transaction.authorization.findActor(
            context.organization.id,
            context.accountId,
            scopeAsOfLocalDate,
          );
          if (actor === null) throw denied();
          const scope = employeeCollectionScope('TEAM_AVAILABILITY_READ', actor);
          if (scope === null) throw denied();

          const startDate = resolveMonthStart(query.month, scopeAsOfLocalDate);
          const endDate = endOfMonth(startDate);
          const entries = await transaction.teamStatus.listCalendar({
            actorEmployeeId: actor.employeeId,
            endDate,
            organizationId: context.organization.id,
            scope,
            scopeLocalDate: scopeAsOfLocalDate,
            startDate,
          });
          if (entries.length > 100_000) throw unavailable();

          return Object.freeze({
            days: [...listMonthDates(startDate, endDate)],
            entries: entries.map((entry) =>
              Object.freeze({ ...entry, availability: 'UNAVAILABLE' as const }),
            ),
            leadingEmptyDays: weekdayOfLocalDate(startDate) - 1,
            month: startDate.slice(0, 7),
            scopeAsOfLocalDate,
            timeZone: timeZone.value,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseTeamCalendarIdentity(accountIdValue: string): TeamCalendarIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value });
}

function listMonthDates(startDate: LocalDate, endDate: LocalDate): readonly LocalDate[] {
  const dates: LocalDate[] = [];
  for (let date = startDate; date <= endDate; date = addLocalDateDays(date, 1)) dates.push(date);
  return Object.freeze(dates);
}

function resolveMonthStart(month: string | undefined, fallbackDate: LocalDate): LocalDate {
  if (month === undefined) return startOfLocalMonth(fallbackDate);
  const parsed = parseLocalDate(`${month}-01`);
  if (!parsed.ok) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.value;
}

function endOfMonth(startDate: LocalDate): LocalDate {
  let endDate = addLocalDateDays(startDate, 27);
  while (addLocalDateDays(endDate, 1).slice(0, 7) === startDate.slice(0, 7)) {
    endDate = addLocalDateDays(endDate, 1);
  }
  return endDate;
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}

function unavailable() {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
