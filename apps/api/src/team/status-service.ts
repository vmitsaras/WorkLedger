import type { TeamStatus } from '@workledger/contracts';
import {
  localDateAtInstant,
  parseDomainId,
  parseTimeZoneId,
  type DomainId,
  type Instant,
} from '@workledger/domain';
import type { AccountSelfContextRecord, WorkLedgerDatabase } from '@workledger/database';

import { employeeCollectionScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';

export type TeamStatusIdentity = Readonly<{ accountId: DomainId<'Account'> }>;

export function createTeamStatusService(database: WorkLedgerDatabase) {
  return Object.freeze({
    async list(identity: TeamStatusIdentity, at: Instant): Promise<TeamStatus> {
      return database.transaction(
        async (transaction) => {
          const context = requireActiveContext(
            await transaction.accountSelfService.findContext(identity.accountId, at),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw unavailable();
          const localDate = localDateAtInstant(at, timeZone.value);
          const actor = await transaction.authorization.findActor(
            context.organization.id,
            context.accountId,
            localDate,
          );
          if (actor === null) throw denied();
          const scope = employeeCollectionScope('TEAM_AVAILABILITY_READ', actor);
          if (scope === null) throw denied();
          const members = await transaction.teamStatus.listCurrent({
            actorEmployeeId: actor.employeeId,
            localDate,
            organizationId: context.organization.id,
            scope,
          });

          return Object.freeze({
            asOf: at,
            localDate,
            members: members.map((member) => Object.freeze({ ...member })),
            summary: summarize(members),
            timeZone: timeZone.value,
          });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseTeamStatusIdentity(accountIdValue: string): TeamStatusIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return Object.freeze({ accountId: accountId.value });
}

function summarize(members: readonly TeamStatus['members'][number][]): TeamStatus['summary'] {
  return Object.freeze({
    offWork: members.filter(({ availability }) => availability === 'OFF_WORK').length,
    onBreak: members.filter(({ availability }) => availability === 'ON_BREAK').length,
    total: members.length,
    unavailable: members.filter(({ availability }) => availability === 'UNAVAILABLE').length,
    unresolved: members.filter(({ hasUnresolvedRecords }) => hasUnresolvedRecords).length,
    working: members.filter(({ availability }) => availability === 'WORKING').length,
  });
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
