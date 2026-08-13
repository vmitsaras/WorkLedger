import type { PersonalCalendar, PersonalCalendarQuery } from '@workledger/contracts';
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

import { authorizeEmployeeTarget } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type PersonalCalendarIdentity = Readonly<{
  accountId: DomainId<'Account'>;
  sessionFresh: boolean;
}>;

export function createPersonalCalendarService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async get(identity: PersonalCalendarIdentity, query: PersonalCalendarQuery, at: Instant) {
      return database.transaction(async (transaction): Promise<PersonalCalendar> => {
        const context = requireActiveEmployeeContext(
          await transaction.accountSelfService.findContext(identity.accountId, at),
        );
        const employee = context.employee;
        if (employee === null) throw denied();
        const authorization = authorizeEmployeeTarget({
          action: 'PERSONAL_CALENDAR_READ',
          actor: {
            accountActive: context.accountActive,
            accountId: context.accountId,
            employeeCapabilityActive: context.employeeCapabilityActive,
            employeeId: employee.id,
            organizationId: context.organization.id,
            roles: context.roles,
          },
          isCurrentManager: false,
          sessionFresh: identity.sessionFresh,
          targetEmployeeId: employee.id,
          targetOrganizationId: context.organization.id,
        });
        if (!authorization.allowed) throw denied();

        const timeZone = parseTimeZoneId(context.organization.timeZone);
        if (!timeZone.ok) throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
        const startDate = resolveMonthStart(query.month, localDateAtInstant(at, timeZone.value));
        const endDate = endOfMonth(startDate);
        const source = await transaction.absenceRequests.listPersonalCalendar(
          context.organization.id,
          employee.id,
          startDate,
          endDate,
        );
        return Object.freeze({
          absences: [...source.absences],
          days: [...listMonthDates(startDate, endDate)],
          holidays: [...source.holidays],
          leadingEmptyDays: weekdayOfLocalDate(startDate) - 1,
          month: startDate.slice(0, 7),
        });
      });
    },
  });
}

function listMonthDates(startDate: LocalDate, endDate: LocalDate): readonly LocalDate[] {
  const dates: LocalDate[] = [];
  for (let date = startDate; date <= endDate; date = addLocalDateDays(date, 1)) dates.push(date);
  return Object.freeze(dates);
}

export function parsePersonalCalendarIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): PersonalCalendarIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
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

function requireActiveEmployeeContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE') throw denied();
  return context;
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
