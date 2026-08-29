import {
  hrMonthlyClosureReadinessInsightRequestSchema,
  hrNeutralAbsenceCoverageInsightRequestSchema,
  insightNativeResultSchema,
  type HrInsightRequest,
  type HrInsightRunResult,
  type InsightFact,
  type InsightNativePayload,
  type InsightSource,
} from '@workledger/contracts/insights';
import {
  addLocalDateDays,
  localDateAtInstant,
  parseLocalDate,
  parseTimeZoneId,
  type Instant,
  type LocalDate,
} from '@workledger/domain';
import type {
  AccountSelfContextRecord,
  HrMonthlyClosureAggregateRecord,
  HrNeutralAbsenceAggregateRecord,
  WorkLedgerDatabase,
  WorkLedgerTransaction,
} from '@workledger/database';

import { employeeCollectionScope } from '../authorization/policy.js';
import { WorkLedgerApiError } from '../http/errors.js';
import type { InsightIdentity } from './insight-service.js';

export interface HrInsightService {
  run(
    identity: InsightIdentity,
    request: HrInsightRequest,
    capturedAt: Instant,
  ): Promise<HrInsightRunResult>;
}

export function createHrInsightService(database: WorkLedgerDatabase): HrInsightService {
  return Object.freeze({
    async run(
      identity: InsightIdentity,
      requestInput: HrInsightRequest,
      capturedAt: Instant,
    ): Promise<HrInsightRunResult> {
      const request = parseRequest(requestInput);
      return database.transaction(
        async (transaction) => {
          const context = requireActiveContext(
            await transaction.accountSelfService.findContext(identity.accountId, capturedAt),
          );
          const timeZone = parseTimeZoneId(context.organization.timeZone);
          if (!timeZone.ok) throw unavailable();
          const currentLocalDate = localDateAtInstant(capturedAt, timeZone.value);
          if (request.month > currentLocalDate.slice(0, 7)) throw validationFailed();
          const monthStart = requireMonthStart(request.month);
          const monthEnd = endOfMonth(monthStart);
          await requireCurrentHrAuthority(transaction, context, currentLocalDate);

          let payload: InsightNativePayload;
          if (request.kind === 'HR_MONTHLY_CLOSURE_READINESS') {
            const aggregate = await transaction.hrInsightAggregates.monthlyClosureReadiness(
              context.organization.id,
              monthStart,
              monthEnd,
            );
            if (aggregate.kind === 'SUPPRESSED') return suppressed(request, capturedAt);
            payload = closurePayload(aggregate, monthStart, monthEnd);
          } else {
            const aggregate = await transaction.hrInsightAggregates.neutralAbsenceCoverage(
              context.organization.id,
              monthStart,
              monthEnd,
            );
            if (aggregate.kind === 'SUPPRESSED') return suppressed(request, capturedAt);
            payload = absencePayload(aggregate, monthStart, monthEnd);
          }
          const { freshnessBoundaries, ...nativePayload } = payload;
          const result = insightNativeResultSchema.safeParse({
            ...nativePayload,
            freshness: { boundaries: freshnessBoundaries, capturedAt },
            kind: request.kind,
            period: { kind: 'MONTH', monthStart },
            scope: { kind: 'ORGANIZATION_AGGREGATE', workspace: 'HR' },
            timeZone: timeZone.value,
            workspace: 'HR',
          });
          if (!result.success) throw unavailable();
          return Object.freeze({ nativeResult: result.data });
        },
        { isolationLevel: 'repeatable read' },
      );
    },
  });
}

function suppressed(request: HrInsightRequest, capturedAt: Instant) {
  return Object.freeze({
    capturedAt,
    kind: request.kind,
    month: request.month,
    reason: 'PRIVACY_THRESHOLD_NOT_MET' as const,
  });
}

function parseRequest(input: HrInsightRequest): HrInsightRequest {
  const parsed =
    input.kind === 'HR_MONTHLY_CLOSURE_READINESS'
      ? hrMonthlyClosureReadinessInsightRequestSchema.safeParse(input)
      : hrNeutralAbsenceCoverageInsightRequestSchema.safeParse(input);
  if (!parsed.success) throw validationFailed();
  return parsed.data;
}

async function requireCurrentHrAuthority(
  transaction: WorkLedgerTransaction,
  context: AccountSelfContextRecord,
  currentLocalDate: LocalDate,
): Promise<void> {
  const actor = await transaction.authorization.findActor(
    context.organization.id,
    context.accountId,
    currentLocalDate,
  );
  if (
    actor === null ||
    !actor.roles.includes('HR_ADMINISTRATOR') ||
    employeeCollectionScope('REPORT_TIME_RUN', actor) !== 'ORGANIZATION'
  ) {
    throw new WorkLedgerApiError({ code: 'ACCESS_DENIED', statusCode: 403 });
  }
}

function closurePayload(
  aggregate: HrMonthlyClosureAggregateRecord,
  monthStart: LocalDate,
  monthEnd: LocalDate,
): InsightNativePayload {
  const source = monthSource(
    'source_monthly_time_report',
    'MONTHLY_TIME_REPORT',
    'MONTHLY_TIME_REPORT',
    monthStart,
  );
  return payload(
    [
      countFact(
        'HR_ELIGIBLE_EMPLOYEE_COUNT',
        'fact_hr_eligible_employees',
        source,
        aggregate.eligibleEmployeeCount,
      ),
      countFact(
        'HR_LOCKED_EMPLOYEE_COUNT',
        'fact_hr_locked_employees',
        source,
        aggregate.lockedEmployeeCount,
      ),
      countFact(
        'HR_OPEN_EMPLOYEE_COUNT',
        'fact_hr_open_employees',
        source,
        aggregate.openEmployeeCount,
      ),
      countFact(
        'HR_SUBMITTED_EMPLOYEE_COUNT',
        'fact_hr_submitted_employees',
        source,
        aggregate.submittedEmployeeCount,
      ),
      countFact(
        'HR_CHANGES_REQUESTED_EMPLOYEE_COUNT',
        'fact_hr_changes_requested_employees',
        source,
        aggregate.changesRequestedEmployeeCount,
      ),
      countFact(
        'HR_APPROVED_EMPLOYEE_COUNT',
        'fact_hr_approved_employees',
        source,
        aggregate.approvedEmployeeCount,
      ),
      countFact(
        'HR_INCOMPLETE_EMPLOYEE_DAY_COUNT',
        'fact_hr_incomplete_employee_days',
        source,
        aggregate.incompleteDayCount,
      ),
    ],
    source,
    monthEnd,
    'OPEN_MONTHLY_TIME_REPORT',
  );
}

function absencePayload(
  aggregate: HrNeutralAbsenceAggregateRecord,
  monthStart: LocalDate,
  monthEnd: LocalDate,
): InsightNativePayload {
  const source = monthSource('source_team_calendar', 'TEAM_CALENDAR', 'TEAM_CALENDAR', monthStart);
  return payload(
    [
      countFact(
        'HR_ELIGIBLE_EMPLOYEE_COUNT',
        'fact_hr_eligible_employees',
        source,
        aggregate.eligibleEmployeeCount,
      ),
      countFact(
        'HR_COVERED_EMPLOYEE_COUNT',
        'fact_hr_covered_employees',
        source,
        aggregate.coveredEmployeeCount,
      ),
      countFact(
        'HR_COVERAGE_CASE_COUNT',
        'fact_hr_coverage_cases',
        source,
        aggregate.coverageCaseCount,
      ),
      countFact(
        'HR_COVERED_EMPLOYEE_DAY_COUNT',
        'fact_hr_covered_employee_days',
        source,
        aggregate.coveredDayCount,
      ),
      minutesFact(
        'HR_COVERED_SCHEDULED_MINUTES',
        'fact_hr_covered_scheduled_minutes',
        source,
        aggregate.coveredScheduledMinutes,
      ),
    ],
    source,
    monthEnd,
    'OPEN_TEAM_CALENDAR',
  );
}

type MonthSource = InsightSource & Readonly<{ period: { kind: 'MONTH'; monthStart: string } }>;

function monthSource(
  reference: string,
  kind: InsightSource['kind'],
  destination: InsightSource['destination'],
  monthStart: LocalDate,
): MonthSource {
  return Object.freeze({
    destination,
    kind,
    period: { kind: 'MONTH' as const, monthStart },
    reference,
  });
}

function payload(
  facts: readonly InsightFact[],
  source: MonthSource,
  monthEnd: LocalDate,
  actionCode: string,
): InsightNativePayload {
  return Object.freeze({
    actions: [
      Object.freeze({
        code: actionCode,
        destination: source.destination,
        period: source.period,
        reference: `action_${source.reference}`,
        sourceReferences: [source.reference],
      }),
    ],
    facts: [...facts],
    freshnessBoundaries: [
      Object.freeze({
        kind: 'CALCULATED_THROUGH' as const,
        localDate: monthEnd,
        sourceReferences: [source.reference],
      }),
    ],
    limitations: [],
    sources: [source],
  });
}

function countFact(
  code: string,
  reference: string,
  source: InsightSource,
  value: number,
): InsightFact {
  return Object.freeze({
    code,
    qualifiers: ['CURRENT' as const],
    reference,
    sourceReferences: [source.reference],
    value: { kind: 'COUNT' as const, value },
  });
}

function minutesFact(
  code: string,
  reference: string,
  source: InsightSource,
  value: number,
): InsightFact {
  return Object.freeze({
    code,
    qualifiers: ['CURRENT' as const],
    reference,
    sourceReferences: [source.reference],
    value: { kind: 'MINUTES' as const, value },
  });
}

function requireActiveContext(context: AccountSelfContextRecord | null): AccountSelfContextRecord {
  if (context === null || !context.accountActive) {
    throw new WorkLedgerApiError({ code: 'AUTH_SESSION_EXPIRED', statusCode: 401 });
  }
  return context;
}

function requireMonthStart(month: string): LocalDate {
  const parsed = parseLocalDate(`${month}-01`);
  if (!parsed.ok) throw validationFailed();
  return parsed.value;
}

function endOfMonth(monthStart: LocalDate): LocalDate {
  let endDate = addLocalDateDays(monthStart, 27);
  while (addLocalDateDays(endDate, 1).slice(0, 7) === monthStart.slice(0, 7)) {
    endDate = addLocalDateDays(endDate, 1);
  }
  return endDate;
}

function validationFailed(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'VALIDATION_FAILED', statusCode: 422 });
}

function unavailable(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
