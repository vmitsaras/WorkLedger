import {
  insightNativeResultSchema,
  managerActionSummaryInsightRequestSchema,
  teamCoverageInsightRequestSchema,
  type InsightFact,
  type InsightFreshnessBoundary,
  type InsightNativeAction,
  type InsightNativePayload,
  type InsightNativeResult,
  type InsightSource,
  type ManagerActionSummaryInsightRequest,
  type TeamCoverageInsightRequest,
} from '@workledger/contracts/insights';
import {
  localDateAtInstant,
  parseDomainId,
  parseTimeZoneId,
  type DomainId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { employeeCollectionScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import type { InsightIdentity } from './insight-service.js';

type ManagerInsightRequest = ManagerActionSummaryInsightRequest | TeamCoverageInsightRequest;

export interface ManagerInsightService {
  run(
    identity: InsightIdentity,
    request: ManagerInsightRequest,
    capturedAt: Instant,
  ): Promise<InsightNativeResult>;
}

export function createManagerInsightService(database: WorkLedgerDatabase): ManagerInsightService {
  return Object.freeze({
    async run(identity: InsightIdentity, requestInput: ManagerInsightRequest, capturedAt: Instant) {
      const request = parseManagerRequest(requestInput);
      return database.transaction(
        async (transaction) => {
          const context = requireActiveManagerContext(
            await transaction.accountSelfService.findContext(identity.accountId, capturedAt),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw unavailable();
          const currentLocalDate = localDateAtInstant(capturedAt, timeZone.value);
          const actor = await transaction.authorization.findActor(
            context.organization.id,
            context.accountId,
            currentLocalDate,
          );
          if (
            actor === null ||
            actor.employeeId === null ||
            !actor.employeeCapabilityActive ||
            !actor.roles.includes('MANAGER') ||
            employeeCollectionScope('TEAM_AVAILABILITY_READ', actor) === null
          ) {
            throw denied();
          }

          const payload =
            request.kind === 'manager-action-summary'
              ? await createActionSummaryPayload(
                  transaction,
                  context,
                  actor.employeeId,
                  request,
                  currentLocalDate,
                )
              : await createCoveragePayload(
                  transaction,
                  context,
                  actor.employeeId,
                  request,
                  currentLocalDate,
                );
          const result = insightNativeResultSchema.safeParse({
            ...payload,
            freshness: { boundaries: payload.freshnessBoundaries, capturedAt },
            kind: request.kind,
            period: request.period,
            scope: { kind: 'CURRENT_DIRECT_REPORTS', workspace: 'MANAGER' },
            timeZone: timeZone.value,
            workspace: 'MANAGER',
          });
          if (!result.success) throw unavailable();
          return result.data;
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

export function parseManagerInsightIdentity(
  accountIdValue: string,
  sessionFresh: boolean,
): InsightIdentity {
  const accountId = parseDomainId<'Account'>(accountIdValue);
  if (!accountId.ok)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  return Object.freeze({ accountId: accountId.value, sessionFresh });
}

function parseManagerRequest(input: ManagerInsightRequest): ManagerInsightRequest {
  const parsed =
    input.kind === 'manager-action-summary'
      ? managerActionSummaryInsightRequestSchema.safeParse(input)
      : teamCoverageInsightRequestSchema.safeParse(input);
  if (!parsed.success) throw new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
  return parsed.data;
}

async function createActionSummaryPayload(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  actorEmployeeId: DomainId<'Employee'>,
  request: ManagerActionSummaryInsightRequest,
  currentLocalDate: LocalDate,
): Promise<InsightNativePayload> {
  const source = insightSource(
    'source_approval_inbox',
    'APPROVAL_INBOX',
    'APPROVAL_INBOX',
    request.period,
  );
  if (request.period.date !== currentLocalDate)
    return unavailablePayload(source, 'ACTION_SUMMARY_DATE_NOT_CURRENT');
  const page = await transaction.approvalInbox.list({
    actorEmployeeId,
    direction: 'DESC',
    employeeId: null,
    from: null,
    limit: 10,
    localDate: currentLocalDate,
    offset: 0,
    organizationId: context.organization.id,
    scope: 'REPORTS',
    sort: 'SUBMITTED_AT',
    status: 'ACTION_REQUIRED',
    teamId: null,
    to: null,
    type: 'ALL',
  });
  return payload(
    [
      countFact(
        'MANAGER_ACTION_REQUIRED_COUNT',
        'CURRENT',
        'fact_manager_action_required',
        source,
        page.total,
      ),
    ],
    source,
    'OPEN_APPROVAL_INBOX',
  );
}

async function createCoveragePayload(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  actorEmployeeId: DomainId<'Employee'>,
  request: TeamCoverageInsightRequest,
  currentLocalDate: LocalDate,
): Promise<InsightNativePayload> {
  const source = insightSource('source_team_status', 'TEAM_STATUS', 'TEAM_STATUS', request.period);
  if (request.period.date !== currentLocalDate)
    return unavailablePayload(source, 'TEAM_COVERAGE_DATE_NOT_CURRENT');
  const members = await transaction.teamStatus.listCurrent({
    actorEmployeeId,
    localDate: currentLocalDate,
    organizationId: context.organization.id,
    scope: 'REPORTS',
  });
  const count = (availability: string) =>
    members.filter((member) => member.availability === availability).length;
  return payload(
    [
      countFact('TEAM_MEMBER_COUNT', 'CURRENT', 'fact_team_member_count', source, members.length),
      countFact(
        'TEAM_WORKING_COUNT',
        'CURRENT',
        'fact_team_working_count',
        source,
        count('WORKING'),
      ),
      countFact(
        'TEAM_ON_BREAK_COUNT',
        'CURRENT',
        'fact_team_on_break_count',
        source,
        count('ON_BREAK'),
      ),
      countFact(
        'TEAM_UNAVAILABLE_COUNT',
        'CURRENT',
        'fact_team_unavailable_count',
        source,
        count('UNAVAILABLE'),
      ),
      countFact(
        'TEAM_OFF_WORK_COUNT',
        'CURRENT',
        'fact_team_off_work_count',
        source,
        count('OFF_WORK'),
      ),
      countFact(
        'TEAM_UNRESOLVED_RECORD_COUNT',
        'CURRENT',
        'fact_team_unresolved_count',
        source,
        members.filter((member) => member.hasUnresolvedRecords).length,
      ),
    ],
    source,
    'OPEN_TEAM_STATUS',
  );
}

function payload(
  facts: InsightFact[],
  source: DateSource,
  actionCode: string,
): InsightNativePayload {
  const action: InsightNativeAction = Object.freeze({
    code: actionCode,
    destination: source.destination,
    reference: `action_${source.reference}`,
    sourceReferences: [source.reference],
  });
  const boundary: InsightFreshnessBoundary = Object.freeze({
    kind: 'CALCULATED_THROUGH',
    localDate: source.period.date,
    sourceReferences: [source.reference],
  });
  return Object.freeze({
    actions: [action],
    facts,
    freshnessBoundaries: [boundary],
    limitations: [],
    sources: [source],
  });
}

function unavailablePayload(source: DateSource, code: string): InsightNativePayload {
  return Object.freeze({
    actions: [],
    facts: [
      Object.freeze({
        code: 'MANAGER_INSIGHT_AVAILABLE',
        qualifiers: ['UNAVAILABLE' as const],
        reference: 'fact_manager_unavailable',
        sourceReferences: [source.reference],
        value: null,
      }),
    ],
    freshnessBoundaries: [
      Object.freeze({
        kind: 'CALCULATED_THROUGH',
        localDate: source.period.date,
        sourceReferences: [source.reference],
      }),
    ],
    limitations: [
      Object.freeze({
        code,
        material: true,
        reference: 'limitation_manager_unavailable',
        sourceReferences: [source.reference],
      }),
    ],
    sources: [source],
  });
}

type DateSource = InsightSource & Readonly<{ period: { date: string; kind: 'DATE' } }>;

function insightSource(
  reference: string,
  kind: InsightSource['kind'],
  destination: InsightSource['destination'],
  period: { date: string; kind: 'DATE' },
): DateSource {
  return Object.freeze({ destination, kind, period, reference });
}

function countFact(
  code: string,
  qualifier: 'CURRENT',
  reference: string,
  source: InsightSource,
  value: number,
): InsightFact {
  return Object.freeze({
    code,
    qualifiers: [qualifier],
    reference,
    sourceReferences: [source.reference],
    value: { kind: 'COUNT' as const, value },
  });
}

function requireActiveManagerContext(
  context: AccountSelfContextRecord | null,
): AccountSelfContextRecord {
  if (context === null || !context.accountActive)
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  if (!context.employeeCapabilityActive || context.employee?.status !== 'ACTIVE') throw denied();
  return context;
}

function denied(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
}
function unavailable(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
