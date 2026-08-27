import type {
  BalanceChangeInsightRequest,
  InsightFact,
  LeaveProjectionInsightRequest,
  SubmissionBlockersInsightRequest,
  TodayExplanationInsightRequest,
} from '@workledger/contracts/insights';
import { insightNativePayloadSchema } from '@workledger/contracts/insights';
import type { MonthlyPeriod } from '@workledger/contracts';
import {
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseSignedMinutes,
  type TimeAccountLedgerEntry,
} from '@workledger/domain';
import type { DailyProjectionRecord, LeaveEntitlementEntryRecord } from '@workledger/database';
import { COHERENT_TODAY_ATTENDANCE } from '@workledger/test-utils';

import {
  createBalanceChangePayload,
  createLeaveProjectionPayload,
  createSubmissionBlockersPayload,
  createTodayExplanationPayload,
} from '../src/insights/employee-insight-handlers.js';

const organizationId = domainId<'Organization'>('10000000-0000-4000-8000-000000000001');
const employeeId = domainId<'Employee'>('10000000-0000-4000-8000-000000000002');
const actorAccountId = domainId<'Account'>('10000000-0000-4000-8000-000000000003');

const balanceRequest: BalanceChangeInsightRequest = {
  kind: 'balance-change',
  period: { endDate: '2026-08-31', kind: 'DATE_RANGE', startDate: '2026-08-01' },
  workspace: 'EMPLOYEE',
};
const leaveRequest: LeaveProjectionInsightRequest = {
  kind: 'leave-projection',
  period: { date: '2026-08-31', kind: 'DATE' },
  workspace: 'EMPLOYEE',
};
const submissionRequest: SubmissionBlockersInsightRequest = {
  kind: 'submission-blockers',
  period: { kind: 'MONTH', monthStart: '2026-08-01' },
  workspace: 'EMPLOYEE',
};
const todayRequest: TodayExplanationInsightRequest = {
  kind: 'today-explanation',
  period: { date: COHERENT_TODAY_ATTENDANCE.localDate, kind: 'DATE' },
  workspace: 'EMPLOYEE',
};

test('separates posted balance change from eligible projections and incomplete dates', () => {
  const postedProjectionId = domainId<'DailyProjection'>('20000000-0000-4000-8000-000000000001');
  const unpostedProjectionId = domainId<'DailyProjection'>('20000000-0000-4000-8000-000000000002');
  const incompleteProjectionId = domainId<'DailyProjection'>(
    '20000000-0000-4000-8000-000000000003',
  );
  const ledgerEntries = [
    timeEntry('2026-01-01', 600, 'OPENING_BALANCE', '30000000-0000-4000-8000-000000000001'),
    timeEntry('2026-08-01', 60, 'DAILY_DELTA', '30000000-0000-4000-8000-000000000002'),
    timeEntry('2026-08-02', -15, 'DAILY_DELTA', postedProjectionId),
  ];
  const projections = [
    dailyProjection(postedProjectionId, '2026-08-02', 'COMPLETE', -15),
    dailyProjection(unpostedProjectionId, '2026-08-03', 'COMPLETE', 30),
    dailyProjection(incompleteProjectionId, '2026-08-04', 'INCOMPLETE', -480),
  ];

  const payload = insightNativePayloadSchema.parse(
    createBalanceChangePayload(balanceRequest, ledgerEntries, projections),
  );

  expect(minuteValue(payload.facts, 'BALANCE_OPENING_MINUTES', 'POSTED')).toBe(600);
  expect(minuteValue(payload.facts, 'BALANCE_CHANGE_MINUTES', 'POSTED')).toBe(45);
  expect(minuteValue(payload.facts, 'BALANCE_CLOSING_MINUTES', 'POSTED')).toBe(645);
  expect(minuteValue(payload.facts, 'BALANCE_CHANGE_MINUTES', 'PROJECTED')).toBe(75);
  expect(countValue(payload.facts, 'BALANCE_INCOMPLETE_DATE_COUNT')).toBe(1);
  expect(payload.limitations.map(({ code }) => code)).toEqual([
    'INCOMPLETE_DATES_EXCLUDED_FROM_PROJECTION',
  ]);
  expect(payload.freshnessBoundaries).toEqual([
    {
      kind: 'POSTED_THROUGH',
      localDate: '2026-08-31',
      sourceReferences: ['source_balance_ledger'],
    },
    {
      kind: 'CALCULATED_THROUGH',
      localDate: '2026-08-31',
      sourceReferences: ['source_balance_daily_records'],
    },
  ]);
});

test('keeps each configured leave account separate at the requested effective date', () => {
  const vacationTypeId = domainId<'AbsenceTypeVersion'>('40000000-0000-4000-8000-000000000001');
  const compTimeTypeId = domainId<'AbsenceTypeVersion'>('40000000-0000-4000-8000-000000000002');
  const entries = [
    leaveEntry(vacationTypeId, 'Vacation', 'ALLOCATION', 4_800, '2026-01-01', 1),
    leaveEntry(vacationTypeId, 'Vacation', 'PENDING_RESERVATION', -720, '2026-08-15', 2),
    leaveEntry(compTimeTypeId, 'Comp time', 'ALLOCATION', 300, '2026-07-01', 3),
  ];

  const payload = insightNativePayloadSchema.parse(
    createLeaveProjectionPayload(leaveRequest, entries),
  );

  expect(payload.sources.flatMap(({ label }) => (label === undefined ? [] : [label]))).toEqual([
    'Comp time',
    'Vacation',
  ]);
  expect(accountMinuteValues(payload.facts, 'source_leave_account_1')).toEqual({
    available: 300,
    projected: 300,
    reserved: 0,
  });
  expect(accountMinuteValues(payload.facts, 'source_leave_account_2')).toEqual({
    available: 4_800,
    projected: 4_080,
    reserved: 720,
  });
  expect(payload.limitations).toEqual([]);

  const unavailable = insightNativePayloadSchema.parse(
    createLeaveProjectionPayload(leaveRequest, []),
  );
  expect(unavailable.facts).toEqual([
    {
      code: 'LEAVE_PROJECTION_AVAILABLE',
      qualifiers: ['UNAVAILABLE'],
      reference: 'fact_leave_unavailable',
      sourceReferences: ['source_leave_ledger'],
      value: null,
    },
  ]);
});

test('reports exact monthly blockers with daily and request sources', () => {
  const projection = monthlyProjection();
  const payload = insightNativePayloadSchema.parse(
    createSubmissionBlockersPayload(
      submissionRequest,
      projection,
      {
        sourceBlockers: [
          {
            code: 'ABSENCE_APPROVAL_PENDING',
            localDate: localDate('2026-08-12'),
            sourceId: 'protected-request-id',
            sourceVersion: 2,
          },
        ],
      },
      localDate('2026-09-02'),
    ),
  );

  expect(countValue(payload.facts, 'SUBMISSION_BLOCKER_COUNT')).toBe(3);
  expect(
    payload.facts
      .filter(({ code }) => code === 'SUBMISSION_BLOCKER')
      .map(({ value }) => (value?.kind === 'STATE' ? value.value : null)),
  ).toEqual(['ABSENCE_APPROVAL_PENDING', 'SCHEDULE_NOT_ASSIGNED', 'LEDGER_SOURCE_MISMATCH']);
  expect(payload.sources.map(({ kind }) => kind)).toEqual([
    'MONTHLY_PERIOD',
    'PERSONAL_REQUEST',
    'DAILY_TIME_RECORD',
  ]);
  expect(JSON.stringify(payload)).not.toContain('protected-request-id');
});

test('preserves Today provisional and posted values as distinct native facts', () => {
  const payload = insightNativePayloadSchema.parse(
    createTodayExplanationPayload(todayRequest, COHERENT_TODAY_ATTENDANCE),
  );

  expect(stateValue(payload.facts, 'TODAY_ATTENDANCE_STATE')).toBe('WORKING');
  expect(minuteValue(payload.facts, 'POSTED_BALANCE_MINUTES', 'POSTED')).toBe(380);
  expect(minuteValue(payload.facts, 'TODAY_WORKED_MINUTES', 'PROVISIONAL')).toBe(195);
  expect(minuteValue(payload.facts, 'TODAY_DIFFERENCE_MINUTES', 'PROVISIONAL')).toBe(-285);
  expect(payload.limitations.map(({ code }) => code)).toEqual(['TODAY_VALUES_PROVISIONAL']);
  expect(payload.freshnessBoundaries).toEqual([
    {
      kind: 'CALCULATED_THROUGH',
      localDate: '2026-08-11',
      sourceReferences: ['source_today_attendance'],
    },
    {
      kind: 'POSTED_THROUGH',
      localDate: '2026-08-10',
      sourceReferences: ['source_today_balance'],
    },
  ]);
});

function monthlyProjection(): MonthlyPeriod {
  return {
    approvedRecord: null,
    availableActions: [],
    attention: {
      blockers: [
        { code: 'ABSENCE_APPROVAL_PENDING', localDate: '2026-08-12', recordId: null },
        {
          code: 'SCHEDULE_NOT_ASSIGNED',
          localDate: '2026-08-13',
          recordId: 'daily-record-1',
        },
        { code: 'LEDGER_SOURCE_MISMATCH', localDate: null, recordId: null },
      ],
      warnings: [],
    },
    employeeDisplayName: 'Employee',
    id: 'monthly-period-1',
    monthEnd: '2026-08-31',
    monthStart: '2026-08-01',
    postLockView: null,
    readiness: {
      completeDateCount: 20,
      coveredDateCount: 21,
      monthEnded: true,
      status: 'INCOMPLETE',
    },
    reviewHistory: [],
    rows: [],
    snapshotVersion: { schemaVersion: 1, sourceFingerprint: 'a'.repeat(64) },
    timeZone: 'Europe/Berlin',
    totals: {
      absenceCreditMinutes: 0,
      adjustmentMinutes: 0,
      balanceMinutes: 45,
      breakMinutes: 300,
      creditedMinutes: 9_645,
      expectedMinutes: 9_600,
      ledgerClosingBalanceMinutes: 645,
      ledgerOpeningBalanceMinutes: 600,
      ledgerPeriodDeltaMinutes: 45,
      workedMinutes: 9_645,
    },
    workflow: {
      approvedAt: null,
      lockedAt: null,
      periodVersion: 1,
      status: 'OPEN',
      submittedAt: null,
    },
  };
}

function timeEntry(
  effectiveDate: string,
  amountMinutes: number,
  entryType: TimeAccountLedgerEntry['entryType'],
  sourceKey: string,
): TimeAccountLedgerEntry {
  return {
    actor: { accountId: actorAccountId, kind: 'ACCOUNT' },
    amountMinutes: signedMinutes(amountMinutes),
    effectiveDate: localDate(effectiveDate),
    entryId: domainId<'TimeAccountLedgerEntry'>(crypto.randomUUID()),
    entryType,
    explanationCode: domainId<'TimeAccountExplanationCode'>('50000000-0000-4000-8000-000000000001'),
    organizationId,
    recordedAt: instant(`${effectiveDate}T18:00:00Z`),
    sourceKey: domainId<'TimeAccountLedgerSource'>(sourceKey),
    subjectEmployeeId: employeeId,
  };
}

function dailyProjection(
  id: DailyProjectionRecord['id'],
  dateValue: string,
  calculationStatus: DailyProjectionRecord['calculationStatus'],
  balanceMinutes: number,
): DailyProjectionRecord {
  return {
    absenceCreditMinutes: 0,
    adjustmentMinutes: 0,
    balanceMinutes,
    breakMinutes: 0,
    calculatedAt: instant(`${dateValue}T18:00:00Z`),
    calculationStatus,
    creditedMinutes: Math.max(0, 480 + balanceMinutes),
    employeeId,
    engineVersion: 'test',
    expectedMinutes: 480,
    id,
    localDate: localDate(dateValue),
    organizationId,
    projectionVersion: 1,
    sourceFingerprint: 'b'.repeat(64),
    sourceReferences: {},
    warningCodes: [],
    workedMinutes: Math.max(0, 480 + balanceMinutes),
  };
}

function leaveEntry(
  absenceTypeId: LeaveEntitlementEntryRecord['absenceTypeId'],
  absenceTypeName: string,
  entryType: LeaveEntitlementEntryRecord['entryType'],
  minutes: number,
  effectiveOn: string,
  sequence: number,
): LeaveEntitlementEntryRecord {
  return {
    absenceTypeId,
    absenceTypeName,
    effectiveOn: localDate(effectiveOn),
    entryId: domainId<'LeaveEntitlementEntry'>(
      `60000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    entryType,
    minutes: signedMinutes(minutes),
    organizationId,
    postedAt: instant(`2026-08-${sequence.toString().padStart(2, '0')}T08:00:00Z`),
    sourceId: domainId<'LeaveEntitlementSource'>(
      `70000000-0000-4000-8000-${sequence.toString().padStart(12, '0')}`,
    ),
    subjectEmployeeId: employeeId,
  };
}

function accountMinuteValues(facts: readonly InsightFact[], sourceReference: string) {
  const matching = facts.filter(({ sourceReferences }) =>
    sourceReferences.includes(sourceReference),
  );
  return {
    available: minuteValue(matching, 'LEAVE_AVAILABLE_MINUTES', 'PROJECTED'),
    projected: minuteValue(matching, 'LEAVE_PROJECTED_REMAINING_MINUTES', 'PROJECTED'),
    reserved: minuteValue(matching, 'LEAVE_RESERVED_MINUTES', 'RESERVED'),
  };
}

function minuteValue(
  facts: readonly InsightFact[],
  code: string,
  qualifier: InsightFact['qualifiers'][number],
) {
  const fact = facts.find(
    (candidate) => candidate.code === code && candidate.qualifiers.includes(qualifier),
  );
  if (fact?.value?.kind !== 'MINUTES') throw new Error(`Expected ${code} minute fact.`);
  return fact.value.value;
}

function countValue(facts: readonly InsightFact[], code: string) {
  const fact = facts.find((candidate) => candidate.code === code);
  if (fact?.value?.kind !== 'COUNT') throw new Error(`Expected ${code} count fact.`);
  return fact.value.value;
}

function stateValue(facts: readonly InsightFact[], code: string) {
  const fact = facts.find((candidate) => candidate.code === code);
  if (fact?.value?.kind !== 'STATE') throw new Error(`Expected ${code} state fact.`);
  return fact.value.value;
}

function domainId<Entity extends string>(value: string) {
  const parsed = parseDomainId<Entity>(value);
  if (!parsed.ok) throw new Error('Expected valid domain identifier.');
  return parsed.value;
}

function instant(value: string) {
  const parsed = parseInstant(value);
  if (!parsed.ok) throw new Error('Expected valid instant.');
  return parsed.value;
}

function localDate(value: string) {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw new Error('Expected valid local date.');
  return parsed.value;
}

function signedMinutes(value: number) {
  const parsed = parseSignedMinutes(value);
  if (!parsed.ok) throw new Error('Expected valid signed minutes.');
  return parsed.value;
}
