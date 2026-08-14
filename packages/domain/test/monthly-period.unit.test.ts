import {
  calculateMonthlyPeriodProjection,
  monthlySnapshotSchemaVersion,
  parseDomainId,
  parseLocalDate,
  parseNonNegativeMinutes,
  parseSignedMinutes,
  validateMonthlyPeriodSubmission,
  type MonthlyPeriodDailyInput,
} from '../src/index.js';

test('derives a ready, reconciled ended month with exact totals and stable snapshot identity', () => {
  const result = calculateMonthlyPeriodProjection({
    coveredDates: [date('2026-07-30'), date('2026-07-31')],
    currentLocalDate: date('2026-08-01'),
    dailyResults: [
      daily('2026-07-30', '47000000-0000-7000-8000-000000000001', 480, 510, 30, [
        'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
      ]),
      daily('2026-07-31', '47000000-0000-7000-8000-000000000002', 480, 465, -15),
    ],
    ledgerClosingBalanceMinutes: signed(615),
    ledgerOpeningBalanceMinutes: signed(600),
    monthEnd: date('2026-07-31'),
    monthStart: date('2026-07-01'),
    periodId: id<'MonthlyPeriod'>('50000000-0000-7000-8000-000000000001'),
    periodVersion: 2,
    sourceBlockers: [],
    sourceFingerprint: 'a'.repeat(64),
    status: 'OPEN',
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value).toMatchObject({
    attention: {
      blockers: [],
      warnings: [
        {
          code: 'FLEX_POSITIVE_THRESHOLD_EXCEEDED',
          localDate: '2026-07-30',
          recordId: '47000000-0000-7000-8000-000000000001',
        },
      ],
    },
    completeDateCount: 2,
    coveredDateCount: 2,
    monthEnded: true,
    readiness: 'READY_FOR_SUBMISSION',
    snapshotVersion: {
      schemaVersion: monthlySnapshotSchemaVersion,
      sourceFingerprint: 'a'.repeat(64),
    },
    totals: {
      absenceCreditMinutes: 0,
      adjustmentMinutes: 0,
      balanceMinutes: 15,
      breakMinutes: 0,
      creditedMinutes: 975,
      expectedMinutes: 960,
      ledgerClosingBalanceMinutes: 615,
      ledgerOpeningBalanceMinutes: 600,
      ledgerPeriodDeltaMinutes: 15,
      workedMinutes: 975,
    },
  });
  expect(Object.isFrozen(result.value)).toBe(true);
  expect(Object.isFrozen(result.value.rows)).toBe(true);
});

test('keeps missing, incomplete, unresolved, and ledger-mismatched dates out of readiness', () => {
  const incomplete = {
    ...daily('2026-07-30', '47000000-0000-7000-8000-000000000003', 480, 0, -480),
    blockers: ['ATTENDANCE_INCOMPLETE'] as const,
    calculationStatus: 'INCOMPLETE' as const,
    postedMinutes: signed(0),
  };
  const result = calculateMonthlyPeriodProjection({
    coveredDates: [date('2026-07-29'), date('2026-07-30'), date('2026-07-31')],
    currentLocalDate: date('2026-08-01'),
    dailyResults: [
      incomplete,
      {
        ...daily('2026-07-31', '47000000-0000-7000-8000-000000000004', 480, 510, 30),
        postedMinutes: signed(0),
      },
    ],
    ledgerClosingBalanceMinutes: signed(600),
    ledgerOpeningBalanceMinutes: signed(600),
    monthEnd: date('2026-07-31'),
    monthStart: date('2026-07-01'),
    periodId: id<'MonthlyPeriod'>('50000000-0000-7000-8000-000000000002'),
    periodVersion: 1,
    sourceBlockers: [
      { code: 'CORRECTION_UNRESOLVED', localDate: date('2026-07-31') },
      { code: 'ABSENCE_APPROVAL_PENDING', localDate: date('2026-07-29') },
    ],
    sourceFingerprint: 'b'.repeat(64),
    status: 'CHANGES_REQUESTED',
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.readiness).toBe('INCOMPLETE');
  expect(result.value.completeDateCount).toBe(1);
  expect(result.value.rows.map(({ status }) => status)).toEqual([
    'MISSING',
    'INCOMPLETE',
    'COMPLETE',
  ]);
  expect(result.value.rows[0]).toMatchObject({
    balanceMinutes: null,
    localDate: '2026-07-29',
    recordId: null,
  });
  expect(result.value.rows[1]).toMatchObject({ balanceMinutes: null, expectedMinutes: null });
  expect(result.value.attention.blockers).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: 'ATTENDANCE_INCOMPLETE', localDate: '2026-07-29' }),
      expect.objectContaining({ code: 'ATTENDANCE_INCOMPLETE', localDate: '2026-07-30' }),
      expect.objectContaining({ code: 'CORRECTION_UNRESOLVED', localDate: '2026-07-31' }),
      expect.objectContaining({ code: 'ABSENCE_APPROVAL_PENDING', localDate: '2026-07-29' }),
      expect.objectContaining({ code: 'LEDGER_SOURCE_MISMATCH', localDate: '2026-07-31' }),
      expect.objectContaining({ code: 'LEDGER_SOURCE_MISMATCH', localDate: null }),
    ]),
  );
});

test('does not assign open-style readiness to a submitted period', () => {
  const result = calculateMonthlyPeriodProjection({
    coveredDates: [date('2026-07-31')],
    currentLocalDate: date('2026-08-01'),
    dailyResults: [daily('2026-07-31', '47000000-0000-7000-8000-000000000005', 480, 480, 0)],
    ledgerClosingBalanceMinutes: signed(600),
    ledgerOpeningBalanceMinutes: signed(600),
    monthEnd: date('2026-07-31'),
    monthStart: date('2026-07-01'),
    periodId: id<'MonthlyPeriod'>('50000000-0000-7000-8000-000000000003'),
    periodVersion: 3,
    sourceBlockers: [],
    sourceFingerprint: 'c'.repeat(64),
    status: 'SUBMITTED',
  });

  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.readiness).toBeNull();
});

test('submits only a ready current version with the exact acknowledged source fingerprint', () => {
  const projectionResult = calculateMonthlyPeriodProjection({
    coveredDates: [date('2026-07-31')],
    currentLocalDate: date('2026-08-01'),
    dailyResults: [
      daily('2026-07-31', '47000000-0000-7000-8000-000000000006', 480, 480, 0, ['WORK_ON_HOLIDAY']),
    ],
    ledgerClosingBalanceMinutes: signed(600),
    ledgerOpeningBalanceMinutes: signed(600),
    monthEnd: date('2026-07-31'),
    monthStart: date('2026-07-01'),
    periodId: id<'MonthlyPeriod'>('50000000-0000-7000-8000-000000000004'),
    periodVersion: 3,
    sourceBlockers: [],
    sourceFingerprint: 'd'.repeat(64),
    status: 'CHANGES_REQUESTED',
  });
  expect(projectionResult.ok).toBe(true);
  if (!projectionResult.ok) return;

  expect(
    validateMonthlyPeriodSubmission({
      acknowledgedSourceFingerprint: 'd'.repeat(64),
      currentStatus: 'CHANGES_REQUESTED',
      currentVersion: 3,
      expectedPeriodVersion: 3,
      projection: projectionResult.value,
    }),
  ).toEqual({
    ok: true,
    value: {
      nextStatus: 'SUBMITTED',
      nextVersion: 4,
      submittedSourceFingerprint: 'd'.repeat(64),
    },
  });

  expect(
    validateMonthlyPeriodSubmission({
      acknowledgedSourceFingerprint: 'e'.repeat(64),
      currentStatus: 'CHANGES_REQUESTED',
      currentVersion: 3,
      expectedPeriodVersion: 3,
      projection: projectionResult.value,
    }),
  ).toEqual({ ok: false, error: { code: 'PERIOD_WARNING_ACKNOWLEDGEMENT_REQUIRED' } });
  expect(
    validateMonthlyPeriodSubmission({
      acknowledgedSourceFingerprint: 'd'.repeat(64),
      currentStatus: 'CHANGES_REQUESTED',
      currentVersion: 3,
      expectedPeriodVersion: 2,
      projection: projectionResult.value,
    }),
  ).toEqual({ ok: false, error: { code: 'PERIOD_VERSION_CONFLICT' } });
});

test('rejects blocked and invalid monthly submission states without a transition', () => {
  const projectionResult = calculateMonthlyPeriodProjection({
    coveredDates: [date('2026-07-31')],
    currentLocalDate: date('2026-08-01'),
    dailyResults: [
      {
        ...daily('2026-07-31', '47000000-0000-7000-8000-000000000007', 480, 480, 0),
        basePosted: false,
      },
    ],
    ledgerClosingBalanceMinutes: signed(600),
    ledgerOpeningBalanceMinutes: signed(600),
    monthEnd: date('2026-07-31'),
    monthStart: date('2026-07-01'),
    periodId: id<'MonthlyPeriod'>('50000000-0000-7000-8000-000000000005'),
    periodVersion: 1,
    sourceBlockers: [],
    sourceFingerprint: 'f'.repeat(64),
    status: 'OPEN',
  });
  expect(projectionResult.ok).toBe(true);
  if (!projectionResult.ok) return;

  expect(
    validateMonthlyPeriodSubmission({
      acknowledgedSourceFingerprint: 'f'.repeat(64),
      currentStatus: 'OPEN',
      currentVersion: 1,
      expectedPeriodVersion: 1,
      projection: projectionResult.value,
    }),
  ).toEqual({ ok: false, error: { code: 'PERIOD_LEDGER_MISMATCH' } });

  for (const [status, code] of [
    ['SUBMITTED', 'PERIOD_ALREADY_SUBMITTED'],
    ['APPROVED', 'PERIOD_STATE_CONFLICT'],
    ['LOCKED', 'PERIOD_LOCKED'],
  ] as const) {
    expect(
      validateMonthlyPeriodSubmission({
        acknowledgedSourceFingerprint: 'f'.repeat(64),
        currentStatus: status,
        currentVersion: 1,
        expectedPeriodVersion: 1,
        projection: projectionResult.value,
      }),
    ).toEqual({ ok: false, error: { code } });
  }
});

function daily(
  localDate: string,
  projectionId: string,
  expectedMinutes: number,
  workedMinutes: number,
  balanceMinutes: number,
  warnings: MonthlyPeriodDailyInput['warnings'] = [],
): MonthlyPeriodDailyInput {
  return Object.freeze({
    absenceCreditMinutes: nonNegative(0),
    adjustmentMinutes: signed(0),
    balanceMinutes: signed(balanceMinutes),
    basePosted: true,
    blockers: [],
    breakMinutes: nonNegative(0),
    calculationStatus: 'COMPLETE',
    creditedMinutes: nonNegative(workedMinutes),
    engineVersion: 'engine-v1',
    expectedMinutes: nonNegative(expectedMinutes),
    localDate: date(localDate),
    postedMinutes: signed(balanceMinutes),
    projectionId: id<'DailyProjection'>(projectionId),
    projectionVersion: 1,
    sourceFingerprint: projectionId.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
    warnings,
    workedMinutes: nonNegative(workedMinutes),
  });
}

function id<T extends string>(value: string) {
  const parsed = parseDomainId<T>(value);
  if (!parsed.ok) throw new Error(`Invalid test ID: ${value}`);
  return parsed.value;
}

function date(value: string) {
  const parsed = parseLocalDate(value);
  if (!parsed.ok) throw new Error(`Invalid test date: ${value}`);
  return parsed.value;
}

function nonNegative(value: number) {
  const parsed = parseNonNegativeMinutes(value);
  if (!parsed.ok) throw new Error(`Invalid test minutes: ${value.toString()}`);
  return parsed.value;
}

function signed(value: number) {
  const parsed = parseSignedMinutes(value);
  if (!parsed.ok) throw new Error(`Invalid test minutes: ${value.toString()}`);
  return parsed.value;
}
