import type {
  BalanceChangeInsightRequest,
  InsightFact,
  InsightFreshnessBoundary,
  InsightLimitation,
  InsightNativeAction,
  InsightNativePayload,
  InsightPeriod,
  InsightSource,
  LeaveProjectionInsightRequest,
  SubmissionBlockersInsightRequest,
  TodayExplanationInsightRequest,
} from '@workledger/contracts/insights';
import type { MonthlyPeriod, TodayAttendance } from '@workledger/contracts';
import {
  addLocalDateDays,
  calculateLeaveEntitlementLedger,
  calculateTimeAccountLedger,
  localDateAtInstant,
  parseDomainId,
  parseLocalDate,
  parseSignedMinutes,
  type LocalDate,
  type SignedMinutes,
  type TimeAccountLedgerEntry,
} from '@workledger/domain';
import type {
  DailyProjectionRecord,
  LeaveEntitlementEntryRecord,
  MonthlyPeriodProjectionSourceRecord,
} from '@workledger/database';

import { loadTodayAttendanceForEmployee } from '../attendance/today-service.js';
import { WorkLedgerApiError } from '../http/errors.js';
import { projectMonthlyPeriod } from '../monthly/monthly-period-service.js';
import type { InsightHandler, InsightHandlers } from './insight-service.js';

const ZERO_MINUTES = signedMinutes(0);
const MONTHLY_DETAIL_FACT_LIMIT = 94;
const LEAVE_ACCOUNT_DETAIL_LIMIT = 20;
const EMPTY_ORGANIZATION_ID = domainId<'Organization'>('00000000-0000-4000-8000-000000000000');
const EMPTY_EMPLOYEE_ID = domainId<'Employee'>('00000000-0000-4000-8000-000000000000');

type InsightFactQualifier = InsightFact['qualifiers'][number];

export function createEmployeeInsightHandlers(): Required<InsightHandlers> {
  return Object.freeze({
    'balance-change': balanceChangeInsightHandler,
    'leave-projection': leaveProjectionInsightHandler,
    'submission-blockers': submissionBlockersInsightHandler,
    'today-explanation': todayExplanationInsightHandler,
  });
}

export const balanceChangeInsightHandler: InsightHandler<BalanceChangeInsightRequest> = async ({
  authority,
  capturedAt,
  request,
  transaction,
}) => {
  const ledgerEntries = await transaction.timeAccount.listForEmployeeThroughSnapshot(
    authority.organizationId,
    authority.employeeId,
    localDate(request.period.endDate),
    capturedAt,
  );
  const projections = await transaction.dailyProjections.listForEmployeeRange(
    authority.organizationId,
    authority.employeeId,
    localDate(request.period.startDate),
    localDate(request.period.endDate),
  );
  return createBalanceChangePayload(request, ledgerEntries, projections);
};

export const leaveProjectionInsightHandler: InsightHandler<LeaveProjectionInsightRequest> = async ({
  authority,
  capturedAt,
  request,
  transaction,
}) => {
  const entries = await transaction.leaveEntitlements.listForEmployee(
    authority.organizationId,
    authority.employeeId,
  );
  return createLeaveProjectionPayload(
    request,
    entries.filter(
      ({ effectiveOn, postedAt }) => effectiveOn <= request.period.date && postedAt <= capturedAt,
    ),
  );
};

export const submissionBlockersInsightHandler: InsightHandler<
  SubmissionBlockersInsightRequest
> = async ({ authority, capturedAt, request, transaction }) => {
  const period = await transaction.monthlyPeriods.findByEmployeeMonth(
    authority.organizationId,
    authority.employeeId,
    localDate(request.period.monthStart),
  );
  const currentLocalDate = localDateAtInstant(capturedAt, authority.timeZone);
  if (period === null) {
    return createUnavailableSubmissionPayload(request, currentLocalDate);
  }
  const source = await transaction.monthlyPeriods.loadProjectionSource(
    authority.organizationId,
    period.id,
  );
  if (source === null || source.period.employeeId !== authority.employeeId) {
    throw internalError();
  }
  const latestSnapshot = await transaction.monthlyPeriods.findLatestSnapshot(
    authority.organizationId,
    period.id,
  );
  const projection = projectMonthlyPeriod(
    source,
    currentLocalDate,
    authority.timeZone,
    { canLock: false, canReview: false, canSubmit: false },
    latestSnapshot,
  );
  return createSubmissionBlockersPayload(request, projection, source, currentLocalDate);
};

export const todayExplanationInsightHandler: InsightHandler<
  TodayExplanationInsightRequest
> = async ({ authority, capturedAt, request, transaction }) => {
  const currentLocalDate = localDateAtInstant(capturedAt, authority.timeZone);
  if (request.period.date !== currentLocalDate) {
    return createUnavailableTodayPayload(currentLocalDate);
  }
  const today = await loadTodayAttendanceForEmployee({
    at: capturedAt,
    employeeId: authority.employeeId,
    organizationId: authority.organizationId,
    timeZone: authority.timeZone,
    transaction,
  });
  return createTodayExplanationPayload(request, today);
};

export function createBalanceChangePayload(
  request: BalanceChangeInsightRequest,
  ledgerEntries: readonly TimeAccountLedgerEntry[],
  projections: readonly DailyProjectionRecord[],
): InsightNativePayload {
  const throughStart = ledgerEntries.filter(
    ({ effectiveDate }) => effectiveDate < request.period.startDate,
  );
  const inRange = ledgerEntries.filter(
    ({ effectiveDate }) =>
      effectiveDate >= request.period.startDate && effectiveDate <= request.period.endDate,
  );
  const opening = calculatePostedLedger(throughStart);
  const range = calculatePostedLedger(inRange);
  const closing = calculatePostedLedger(ledgerEntries);
  const postedProjectionKeys = new Set(ledgerEntries.map(({ sourceKey }) => String(sourceKey)));
  const eligibleProjections = projections.filter(
    ({ calculationStatus, id }) =>
      calculationStatus === 'COMPLETE' && !postedProjectionKeys.has(String(id)),
  );
  const eligibleRangeProjections = eligibleProjections.filter(
    ({ localDate }) => localDate >= request.period.startDate && localDate <= request.period.endDate,
  );
  const projectedRangeChange = addMinutes(
    range.entryTotalMinutes,
    sumMinutes(eligibleRangeProjections.map(({ balanceMinutes }) => balanceMinutes)),
  );
  const incompleteCount = projections.filter(
    ({ calculationStatus }) => calculationStatus !== 'COMPLETE',
  ).length;
  const ledgerSource = source(
    'source_balance_ledger',
    'TIME_ACCOUNT_LEDGER',
    'MY_BALANCES',
    request.period,
  );
  const dailySource = source(
    'source_balance_daily_records',
    'DAILY_TIME_RECORD',
    'MY_TIME',
    request.period,
  );
  const facts: InsightFact[] = [
    minuteFact(
      'BALANCE_OPENING_MINUTES',
      'POSTED',
      'fact_balance_opening',
      ledgerSource,
      opening.closingBalanceMinutes,
    ),
    minuteFact(
      'BALANCE_CHANGE_MINUTES',
      'POSTED',
      'fact_balance_change',
      ledgerSource,
      range.entryTotalMinutes,
    ),
    minuteFact(
      'BALANCE_CLOSING_MINUTES',
      'POSTED',
      'fact_balance_closing',
      ledgerSource,
      closing.closingBalanceMinutes,
    ),
  ];
  const sources: InsightSource[] = [ledgerSource];
  const freshnessBoundaries: InsightFreshnessBoundary[] = [
    freshness('POSTED_THROUGH', request.period.endDate, ledgerSource),
  ];
  const limitations: InsightLimitation[] = [];
  const actions: InsightNativeAction[] = [
    action(
      'OPEN_BALANCE_HISTORY',
      'MY_BALANCES',
      'action_balance_history',
      [ledgerSource],
      request.period,
    ),
  ];

  if (eligibleRangeProjections.length > 0 || incompleteCount > 0) {
    sources.push(dailySource);
    facts.push(
      minuteFact(
        'BALANCE_CHANGE_MINUTES',
        'PROJECTED',
        'fact_balance_change_projected',
        dailySource,
        projectedRangeChange,
      ),
      countFact(
        'BALANCE_INCOMPLETE_DATE_COUNT',
        incompleteCount === 0 ? 'CURRENT' : 'INCOMPLETE',
        'fact_balance_incomplete_count',
        dailySource,
        incompleteCount,
      ),
    );
    freshnessBoundaries.push(freshness('CALCULATED_THROUGH', request.period.endDate, dailySource));
    actions.push(
      action(
        'OPEN_TIME_RECORDS',
        'MY_TIME',
        'action_balance_time_records',
        [dailySource],
        request.period,
      ),
    );
    if (incompleteCount > 0) {
      limitations.push(
        limitation(
          'INCOMPLETE_DATES_EXCLUDED_FROM_PROJECTION',
          true,
          'limitation_balance_incomplete',
          [dailySource],
        ),
      );
    }
  }

  return Object.freeze({
    actions,
    facts,
    freshnessBoundaries,
    limitations,
    sources,
  });
}

export function createLeaveProjectionPayload(
  request: LeaveProjectionInsightRequest,
  entries: readonly LeaveEntitlementEntryRecord[],
): InsightNativePayload {
  const accounts = groupLeaveAccounts(entries);
  if (accounts.length === 0) {
    const ledgerSource = source(
      'source_leave_ledger',
      'LEAVE_ENTITLEMENT_LEDGER',
      'MY_BALANCES',
      request.period,
    );
    return Object.freeze({
      actions: [
        action('OPEN_LEAVE_BALANCES', 'MY_BALANCES', 'action_leave_balances', [ledgerSource]),
      ],
      facts: [
        unavailableFact('LEAVE_PROJECTION_AVAILABLE', 'fact_leave_unavailable', ledgerSource),
      ],
      freshnessBoundaries: [freshness('CALCULATED_THROUGH', request.period.date, ledgerSource)],
      limitations: [
        limitation('LEAVE_ENTITLEMENT_NOT_AVAILABLE', true, 'limitation_leave_unavailable', [
          ledgerSource,
        ]),
      ],
      sources: [ledgerSource],
    });
  }

  const aggregateSource = source(
    'source_leave_ledger',
    'LEAVE_ENTITLEMENT_LEDGER',
    'MY_BALANCES',
    request.period,
  );
  const facts: InsightFact[] = [
    countFact(
      'LEAVE_ACCOUNT_COUNT',
      'CURRENT',
      'fact_leave_account_count',
      aggregateSource,
      accounts.length,
    ),
  ];
  const sources: InsightSource[] = [aggregateSource];
  for (const [index, account] of accounts.slice(0, LEAVE_ACCOUNT_DETAIL_LIMIT).entries()) {
    const firstEntry = account.entries[0];
    if (firstEntry === undefined) throw internalError();
    const ledger = calculateLeaveEntitlementLedger({
      absenceTypeId: firstEntry.absenceTypeId,
      entries: account.entries,
      organizationId: firstEntry.organizationId,
      subjectEmployeeId: firstEntry.subjectEmployeeId,
    });
    if (!ledger.ok) throw internalError();
    const sourceReference = `source_leave_account_${index + 1}`;
    const accountSource = Object.freeze({
      ...source(sourceReference, 'LEAVE_ENTITLEMENT_LEDGER', 'MY_BALANCES', request.period),
      label: account.name,
    });
    sources.push(accountSource);
    facts.push(
      minuteFact(
        'LEAVE_AVAILABLE_MINUTES',
        'PROJECTED',
        `fact_leave_${index + 1}_available`,
        accountSource,
        ledger.value.availableMinutes,
      ),
      minuteFact(
        'LEAVE_RESERVED_MINUTES',
        'RESERVED',
        `fact_leave_${index + 1}_reserved`,
        accountSource,
        ledger.value.reservedMinutes,
      ),
      minuteFact(
        'LEAVE_PROJECTED_REMAINING_MINUTES',
        'PROJECTED',
        `fact_leave_${index + 1}_projected`,
        accountSource,
        ledger.value.projectedRemainingMinutes,
      ),
    );
  }

  const limitations: InsightLimitation[] = [];
  if (accounts.length > LEAVE_ACCOUNT_DETAIL_LIMIT) {
    limitations.push(
      limitation('LEAVE_ACCOUNT_DETAILS_LIMITED', true, 'limitation_leave_account_limit', [
        aggregateSource,
      ]),
    );
  }

  return Object.freeze({
    actions: [
      action('OPEN_LEAVE_BALANCES', 'MY_BALANCES', 'action_leave_balances', [aggregateSource]),
    ],
    facts,
    freshnessBoundaries: [
      Object.freeze({
        kind: 'CALCULATED_THROUGH' as const,
        localDate: request.period.date,
        sourceReferences: [aggregateSource.reference],
      }),
    ],
    limitations,
    sources,
  });
}

export function createSubmissionBlockersPayload(
  request: SubmissionBlockersInsightRequest,
  projection: MonthlyPeriod,
  sourceRecord: Pick<MonthlyPeriodProjectionSourceRecord, 'sourceBlockers'>,
  currentLocalDate: LocalDate,
): InsightNativePayload {
  const monthSource = source(
    'source_monthly_period',
    'MONTHLY_PERIOD',
    'MONTHLY_REVIEW',
    request.period,
  );
  const sources = new Map<string, InsightSource>([[monthSource.reference, monthSource]]);
  const blockers = projection.attention.blockers;
  const facts: InsightFact[] = [
    stateFact(
      'MONTHLY_WORKFLOW_STATUS',
      'CURRENT',
      'fact_monthly_workflow',
      monthSource,
      projection.workflow.status,
    ),
    booleanFact(
      'MONTH_ENDED',
      'CURRENT',
      'fact_month_ended',
      monthSource,
      projection.readiness.monthEnded,
    ),
    countFact(
      'SUBMISSION_BLOCKER_COUNT',
      blockers.length === 0 ? 'CURRENT' : 'INCOMPLETE',
      'fact_submission_blocker_count',
      monthSource,
      blockers.length,
    ),
    countFact(
      'MONTHLY_COMPLETE_DATE_COUNT',
      'CURRENT',
      'fact_monthly_complete_dates',
      monthSource,
      projection.readiness.completeDateCount,
    ),
    countFact(
      'MONTHLY_COVERED_DATE_COUNT',
      'CURRENT',
      'fact_monthly_covered_dates',
      monthSource,
      projection.readiness.coveredDateCount,
    ),
  ];
  if (projection.readiness.status !== null) {
    facts.push(
      stateFact(
        'MONTHLY_READINESS_STATUS',
        projection.readiness.status === 'INCOMPLETE' ? 'INCOMPLETE' : 'CURRENT',
        'fact_monthly_readiness',
        monthSource,
        projection.readiness.status,
      ),
    );
  }

  for (const [index, blocker] of blockers.slice(0, MONTHLY_DETAIL_FACT_LIMIT).entries()) {
    const blockerSource = monthlyBlockerSource(blocker, request.period, sourceRecord);
    sources.set(blockerSource.reference, blockerSource);
    facts.push(
      stateFact(
        'SUBMISSION_BLOCKER',
        'INCOMPLETE',
        `fact_submission_blocker_${index + 1}`,
        blockerSource,
        blocker.code,
      ),
    );
  }

  const limitations: InsightLimitation[] = [];
  if (!projection.readiness.monthEnded) {
    limitations.push(
      limitation('MONTH_NOT_ENDED', true, 'limitation_month_not_ended', [monthSource]),
    );
  }
  if (projection.readiness.status === null) {
    limitations.push(
      limitation('SUBMISSION_NOT_AVAILABLE_IN_CURRENT_STATE', true, 'limitation_submission_state', [
        monthSource,
      ]),
    );
  }
  if (blockers.length > MONTHLY_DETAIL_FACT_LIMIT) {
    limitations.push(
      limitation('SUBMISSION_BLOCKER_DETAILS_LIMITED', true, 'limitation_submission_detail_limit', [
        monthSource,
      ]),
    );
  }
  const sourceValues = [...sources.values()];
  const actions: InsightNativeAction[] = [
    action(
      'OPEN_MONTHLY_REVIEW',
      'MONTHLY_REVIEW',
      'action_monthly_review',
      [monthSource],
      request.period,
    ),
  ];
  if (sourceValues.some(({ kind }) => kind === 'DAILY_TIME_RECORD')) {
    actions.push(
      action('OPEN_TIME_RECORDS', 'MY_TIME', 'action_monthly_time', [monthSource], request.period),
    );
  }
  if (sourceValues.some(({ kind }) => kind === 'PERSONAL_REQUEST')) {
    actions.push(
      action(
        'OPEN_MY_REQUESTS',
        'MY_REQUESTS',
        'action_monthly_requests',
        [monthSource],
        request.period,
      ),
    );
  }

  return Object.freeze({
    actions,
    facts,
    freshnessBoundaries: [
      freshness(
        'CALCULATED_THROUGH',
        currentLocalDate < projection.monthEnd ? currentLocalDate : projection.monthEnd,
        monthSource,
      ),
    ],
    limitations,
    sources: sourceValues,
  });
}

export function createTodayExplanationPayload(
  request: TodayExplanationInsightRequest,
  today: TodayAttendance,
): InsightNativePayload {
  const todaySource = source(
    'source_today_attendance',
    'TODAY_ATTENDANCE',
    'TODAY',
    request.period,
  );
  const ledgerSource = source(
    'source_today_balance',
    'TIME_ACCOUNT_LEDGER',
    'MY_BALANCES',
    request.period,
  );
  const facts: InsightFact[] = [
    stateFact(
      'TODAY_ATTENDANCE_STATE',
      'CURRENT',
      'fact_today_attendance_state',
      todaySource,
      today.attendance.state,
    ),
    stateFact(
      'TODAY_CALCULATION_STATUS',
      today.calculation.status === 'INCOMPLETE' ? 'INCOMPLETE' : 'PROVISIONAL',
      'fact_today_calculation_status',
      todaySource,
      today.calculation.status,
    ),
    minuteFact(
      'POSTED_BALANCE_MINUTES',
      'POSTED',
      'fact_today_posted_balance',
      ledgerSource,
      today.postedFlexBalanceMinutes,
    ),
  ];
  const provisional = today.calculation.provisional;
  if (provisional !== null) {
    const values = [
      ['TODAY_SCHEDULED_MINUTES', provisional.calculationSources.scheduledMinutes],
      ['TODAY_EXPECTED_MINUTES', provisional.expectedMinutesToday],
      ['TODAY_WORKED_MINUTES', provisional.calculationSources.workedMinutesToday],
      ['TODAY_BREAK_MINUTES', provisional.calculationSources.breakMinutesToday],
      ['TODAY_ABSENCE_CREDIT_MINUTES', provisional.calculationSources.absenceCreditMinutes],
      [
        'TODAY_ABSENCE_EXPECTED_REDUCTION_MINUTES',
        provisional.calculationSources.absenceExpectedReductionMinutes,
      ],
      [
        'TODAY_HOLIDAY_EXPECTED_REDUCTION_MINUTES',
        provisional.calculationSources.holidayExpectedReductionMinutes,
      ],
      [
        'TODAY_APPROVED_CORRECTION_MINUTES',
        provisional.calculationSources.approvedCorrectionMinutes,
      ],
      [
        'TODAY_OTHER_APPROVED_ADJUSTMENT_MINUTES',
        provisional.calculationSources.otherApprovedAdjustmentMinutes,
      ],
      ['TODAY_CREDITED_MINUTES', provisional.creditedMinutesToday],
      ['TODAY_DIFFERENCE_MINUTES', provisional.provisionalDifferenceMinutes],
    ] as const;
    for (const [index, [code, value]] of values.entries()) {
      facts.push(
        minuteFact(code, 'PROVISIONAL', `fact_today_minutes_${index + 1}`, todaySource, value),
      );
    }
  }
  if (today.attendance.activeElapsedMinutes !== null) {
    facts.push(
      minuteFact(
        'TODAY_ACTIVE_ELAPSED_MINUTES',
        'CURRENT',
        'fact_today_active_elapsed',
        todaySource,
        today.attendance.activeElapsedMinutes,
      ),
    );
  }
  if (today.calculation.remainingExpectedMinutes !== null) {
    facts.push(
      minuteFact(
        'TODAY_REMAINING_EXPECTED_MINUTES',
        'PROVISIONAL',
        'fact_today_remaining_expected',
        todaySource,
        today.calculation.remainingExpectedMinutes,
      ),
    );
  }
  if (today.calculation.estimatedFinishAt !== null) {
    facts.push(
      Object.freeze({
        code: 'TODAY_ESTIMATED_FINISH_AT',
        qualifiers: ['PROVISIONAL' as const],
        reference: 'fact_today_estimated_finish',
        sourceReferences: [todaySource.reference],
        value: Object.freeze({
          kind: 'INSTANT' as const,
          value: today.calculation.estimatedFinishAt,
        }),
      }),
    );
  }
  for (const [index, item] of today.calculation.attentionItems.entries()) {
    facts.push(
      stateFact(
        'TODAY_ATTENTION',
        item.blocksSubmission ? 'INCOMPLETE' : 'CURRENT',
        `fact_today_attention_${index + 1}`,
        item.source === 'POSTED_FLEX_BALANCE' ? ledgerSource : todaySource,
        item.message.code,
      ),
    );
  }

  const limitations: InsightLimitation[] = [];
  if (today.calculation.status === 'INCOMPLETE') {
    limitations.push(
      limitation('TODAY_CALCULATION_INCOMPLETE', true, 'limitation_today_incomplete', [
        todaySource,
      ]),
    );
  } else {
    limitations.push(
      limitation('TODAY_VALUES_PROVISIONAL', true, 'limitation_today_provisional', [todaySource]),
    );
  }
  if (today.timelineTruncated) {
    limitations.push(
      limitation('TODAY_TIMELINE_TRUNCATED', true, 'limitation_today_timeline', [todaySource]),
    );
  }

  const actions = new Map<string, InsightNativeAction>();
  actions.set(
    'TODAY',
    action('OPEN_TODAY', 'TODAY', 'action_today', [todaySource], request.period),
  );
  actions.set(
    'MY_BALANCES',
    action('OPEN_BALANCE_HISTORY', 'MY_BALANCES', 'action_today_balance', [ledgerSource]),
  );
  for (const item of today.calculation.attentionItems) {
    const destination = insightDestination(item.recovery.destination);
    if (destination === null || actions.has(destination)) continue;
    actions.set(
      destination,
      action(
        `OPEN_${destination}`,
        destination,
        `action_today_${destination.toLowerCase()}`,
        [item.source === 'POSTED_FLEX_BALANCE' ? ledgerSource : todaySource],
        request.period,
      ),
    );
  }

  return Object.freeze({
    actions: [...actions.values()],
    facts,
    freshnessBoundaries: [
      freshness('CALCULATED_THROUGH', today.localDate, todaySource),
      freshness('POSTED_THROUGH', addLocalDateDays(localDate(today.localDate), -1), ledgerSource),
    ],
    limitations,
    sources: [todaySource, ledgerSource],
  });
}

function createUnavailableSubmissionPayload(
  request: SubmissionBlockersInsightRequest,
  currentLocalDate: LocalDate,
): InsightNativePayload {
  const monthSource = source(
    'source_monthly_period',
    'MONTHLY_PERIOD',
    'MONTHLY_REVIEW',
    request.period,
  );
  return Object.freeze({
    actions: [
      action(
        'OPEN_MONTHLY_REVIEW',
        'MONTHLY_REVIEW',
        'action_monthly_review',
        [monthSource],
        request.period,
      ),
    ],
    facts: [
      unavailableFact('SUBMISSION_BLOCKERS_AVAILABLE', 'fact_submission_unavailable', monthSource),
    ],
    freshnessBoundaries: [freshness('CALCULATED_THROUGH', currentLocalDate, monthSource)],
    limitations: [
      limitation('MONTHLY_PERIOD_NOT_AVAILABLE', true, 'limitation_monthly_period_unavailable', [
        monthSource,
      ]),
    ],
    sources: [monthSource],
  });
}

function createUnavailableTodayPayload(currentLocalDate: LocalDate): InsightNativePayload {
  const todaySource = source(
    'source_today_attendance',
    'TODAY_ATTENDANCE',
    'TODAY',
    Object.freeze({ date: currentLocalDate, kind: 'DATE' as const }),
  );
  return Object.freeze({
    actions: [
      action(
        'OPEN_TODAY',
        'TODAY',
        'action_today',
        [todaySource],
        Object.freeze({ date: currentLocalDate, kind: 'DATE' as const }),
      ),
    ],
    facts: [unavailableFact('TODAY_EXPLANATION_AVAILABLE', 'fact_today_unavailable', todaySource)],
    freshnessBoundaries: [freshness('CALCULATED_THROUGH', currentLocalDate, todaySource)],
    limitations: [
      limitation('REQUESTED_DATE_IS_NOT_TODAY', true, 'limitation_requested_date_not_today', [
        todaySource,
      ]),
    ],
    sources: [todaySource],
  });
}

function monthlyBlockerSource(
  blocker: MonthlyPeriod['attention']['blockers'][number],
  monthPeriod: SubmissionBlockersInsightRequest['period'],
  sourceRecord: Pick<MonthlyPeriodProjectionSourceRecord, 'sourceBlockers'>,
): InsightSource {
  const personalRequest = sourceRecord.sourceBlockers.some(
    ({ code, localDate }) => code === blocker.code && localDate === blocker.localDate,
  );
  if (personalRequest) {
    return source('source_monthly_requests', 'PERSONAL_REQUEST', 'MY_REQUESTS', monthPeriod);
  }
  if (blocker.localDate !== null) {
    return source(`source_daily_${blocker.localDate}`, 'DAILY_TIME_RECORD', 'MY_TIME', {
      date: blocker.localDate,
      kind: 'DATE' as const,
    });
  }
  return source('source_monthly_period', 'MONTHLY_PERIOD', 'MONTHLY_REVIEW', monthPeriod);
}

function groupLeaveAccounts(entries: readonly LeaveEntitlementEntryRecord[]) {
  const grouped = new Map<string, { entries: LeaveEntitlementEntryRecord[]; name: string }>();
  for (const entry of entries) {
    const key = String(entry.absenceTypeId);
    const account = grouped.get(key) ?? { entries: [], name: entry.absenceTypeName };
    if (account.name !== entry.absenceTypeName) throw internalError();
    account.entries.push(entry);
    grouped.set(key, account);
  }
  return [...grouped.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(({ entries: accountEntries, name }) =>
      Object.freeze({ entries: Object.freeze(accountEntries), name }),
    );
}

function calculatePostedLedger(entries: readonly TimeAccountLedgerEntry[]) {
  const first = entries[0];
  const result = calculateTimeAccountLedger({
    entries,
    openingBalanceMinutes: ZERO_MINUTES,
    organizationId: first?.organizationId ?? EMPTY_ORGANIZATION_ID,
    subjectEmployeeId: first?.subjectEmployeeId ?? EMPTY_EMPLOYEE_ID,
  });
  if (!result.ok) throw internalError();
  return result.value;
}

function source(
  reference: string,
  kind: InsightSource['kind'],
  destination: InsightSource['destination'],
  period: InsightPeriod,
): InsightSource {
  return Object.freeze({ destination, kind, period, reference });
}

function minuteFact(
  code: string,
  qualifier: InsightFactQualifier,
  reference: string,
  factSource: InsightSource,
  value: number,
): InsightFact {
  return Object.freeze({
    code,
    qualifiers: [qualifier],
    reference,
    sourceReferences: [factSource.reference],
    value: Object.freeze({ kind: 'MINUTES' as const, value: signedMinutes(value) }),
  });
}

function countFact(
  code: string,
  qualifier: InsightFactQualifier,
  reference: string,
  factSource: InsightSource,
  value: number,
): InsightFact {
  if (!Number.isSafeInteger(value) || value < 0) throw internalError();
  return Object.freeze({
    code,
    qualifiers: [qualifier],
    reference,
    sourceReferences: [factSource.reference],
    value: Object.freeze({ kind: 'COUNT' as const, value }),
  });
}

function booleanFact(
  code: string,
  qualifier: InsightFactQualifier,
  reference: string,
  factSource: InsightSource,
  value: boolean,
): InsightFact {
  return Object.freeze({
    code,
    qualifiers: [qualifier],
    reference,
    sourceReferences: [factSource.reference],
    value: Object.freeze({ kind: 'BOOLEAN' as const, value }),
  });
}

function stateFact(
  code: string,
  qualifier: InsightFactQualifier,
  reference: string,
  factSource: InsightSource,
  value: string,
): InsightFact {
  return Object.freeze({
    code,
    qualifiers: [qualifier],
    reference,
    sourceReferences: [factSource.reference],
    value: Object.freeze({ kind: 'STATE' as const, value }),
  });
}

function unavailableFact(code: string, reference: string, factSource: InsightSource): InsightFact {
  return Object.freeze({
    code,
    qualifiers: ['UNAVAILABLE' as const],
    reference,
    sourceReferences: [factSource.reference],
    value: null,
  });
}

function limitation(
  code: string,
  material: boolean,
  reference: string,
  sources: readonly InsightSource[],
): InsightLimitation {
  return Object.freeze({
    code,
    material,
    reference,
    sourceReferences: sources.map(({ reference: sourceReference }) => sourceReference),
  });
}

function freshness(
  kind: InsightFreshnessBoundary['kind'],
  localDate: string,
  factSource: InsightSource,
): InsightFreshnessBoundary {
  return Object.freeze({
    kind,
    localDate,
    sourceReferences: [factSource.reference],
  });
}

function action(
  code: string,
  destination: InsightNativeAction['destination'],
  reference: string,
  sources: readonly InsightSource[],
  period?: InsightPeriod,
): InsightNativeAction {
  return Object.freeze({
    code,
    destination,
    ...(period === undefined ? {} : { period }),
    reference,
    sourceReferences: sources.map(({ reference: sourceReference }) => sourceReference),
  });
}

function insightDestination(
  destination: TodayAttendance['calculation']['attentionItems'][number]['recovery']['destination'],
): InsightNativeAction['destination'] | null {
  switch (destination) {
    case 'MY_BALANCES':
      return 'MY_BALANCES';
    case 'MY_REQUESTS':
      return 'MY_REQUESTS';
    case 'MY_TIME':
      return 'MY_TIME';
    case 'TODAY_CALCULATION':
      return 'TODAY';
  }
  return null;
}

function sumMinutes(values: readonly number[]): SignedMinutes {
  return signedMinutes(values.reduce((total, value) => total + value, 0));
}

function addMinutes(left: number, right: number): SignedMinutes {
  return signedMinutes(left + right);
}

function signedMinutes(value: number): SignedMinutes {
  const parsed = parseSignedMinutes(value);
  if (!parsed.ok) throw internalError();
  return parsed.value;
}

function localDate(value: string): LocalDate {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw internalError();
  return parsed.value;
}

function domainId<Entity extends string>(value: string) {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new Error('Static Insight identifier must be valid.');
  return parsed.value;
}

function internalError(): WorkLedgerApiError {
  return new WorkLedgerApiError({ code: 'INTERNAL_ERROR', statusCode: 503 });
}
