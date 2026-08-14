import type { ApprovalInbox, ApprovalInboxQuery } from '@workledger/contracts';
import {
  localDateAtInstant,
  parseDomainId,
  parseLocalDate,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  ApprovalInboxItemRecord,
  WorkLedgerDatabase,
} from '@workledger/database';

import { employeeCollectionScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type ApprovalInboxIdentity = Readonly<{
  accountId: DomainId<'Account'>;
}>;

export function createApprovalInboxService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async list(
      identity: ApprovalInboxIdentity,
      query: ApprovalInboxQuery,
      at: Instant,
    ): Promise<ApprovalInbox> {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) {
            throw new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
          }
          const localDate = localDateAtInstant(at, timeZone.value);
          const actor = await transaction.authorization.findActor(
            context.organization.id,
            context.accountId,
            localDate,
          );
          if (actor === null) throw denied();
          const scope = employeeCollectionScope('APPROVAL_INBOX_READ', actor);
          if (scope === null) throw denied();

          const page = await transaction.approvalInbox.list({
            actorEmployeeId: actor.employeeId,
            direction: query.direction,
            employeeId: null,
            from: parseOptionalLocalDate(query.from),
            limit: query.limit,
            localDate,
            offset: (query.page - 1) * query.limit,
            organizationId: context.organization.id,
            scope,
            sort: query.sort,
            status: query.status,
            teamId: parseOptionalTeamId(query.team),
            to: parseOptionalLocalDate(query.to),
            type: query.type,
          });

          return Object.freeze({
            filterOptions: Object.freeze({
              teams: page.teams.map((team) => Object.freeze({ id: team.id, name: team.name })),
            }),
            items: page.items.map(toContractItem),
            pagination: Object.freeze({
              limit: query.limit,
              page: query.page,
              total: page.total,
              totalPages: Math.ceil(page.total / query.limit),
            }),
            timeZone: timeZone.value,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseApprovalInboxIdentity(accountIdValue: string): ApprovalInboxIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value });
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function parseOptionalLocalDate(value: string | undefined): LocalDate | null {
  if (value === undefined) return null;
  const parsed = parseLocalDate(value);
  if (!parsed.ok) {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }
  return parsed.value;
}

function parseOptionalTeamId(value: string | undefined): DomainId<'Team'> | null {
  if (value === undefined) return null;
  const parsed = parseDomainId<'Team'>(value);
  if (!parsed.ok) {
    throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  }
  return parsed.value;
}

function toContractItem(item: ApprovalInboxItemRecord): ApprovalInbox['items'][number] {
  return Object.freeze({
    affectedEndDate: item.affectedEndDate,
    affectedStartDate: item.affectedStartDate,
    employeeDisplayName: item.employeeDisplayName,
    id: item.id,
    kind: item.type,
    status: item.status,
    submittedAt: item.submittedAt,
    ...(item.team === null
      ? {}
      : { team: Object.freeze({ id: item.team.id, name: item.team.name }) }),
    version: item.version,
  });
}

function denied() {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
