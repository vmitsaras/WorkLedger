import {
  calculateTimeAccountLedger,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseSignedMinutes,
  timeAccountEntryTypes,
  type DomainError,
  type Result,
  type TimeAccountLedgerEntry,
  type TimeAccountLedgerError,
  type TimeAccountLedgerInput,
} from '../src/index.js';

function expectSuccess<T, E extends DomainError>(result: Result<T, E>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`Expected success, received ${result.error.code}.`);
  return result.value;
}

function expectFailureCode<T, E extends DomainError>(result: Result<T, E>, code: E['code']): void {
  expect(result).toEqual({ error: { code }, ok: false });
}

function id<Entity extends string>(value: string) {
  return expectSuccess(parseDomainId<Entity>(value));
}

function date(value: string) {
  return expectSuccess(parseLocalDate(value));
}

function instant(value: string) {
  return expectSuccess(parseInstant(value));
}

function minutes(value: number) {
  return expectSuccess(parseSignedMinutes(value));
}

function entry(
  entryId: string,
  sourceKey: string,
  amountMinutes: number,
  entryType: TimeAccountLedgerEntry['entryType'] = 'DAILY_DELTA',
): TimeAccountLedgerEntry {
  return Object.freeze({
    actor: Object.freeze({ kind: 'SYSTEM', systemProcess: id<'SystemProcess'>('daily-posting') }),
    amountMinutes: minutes(amountMinutes),
    effectiveDate: date('2026-02-03'),
    entryId: id<'TimeAccountLedgerEntry'>(entryId),
    entryType,
    explanationCode: id<'TimeAccountExplanationCode'>(`${entryType.toLowerCase()}-posted`),
    organizationId: id<'Organization'>('organization-1'),
    recordedAt: instant('2026-02-04T08:00:00Z'),
    sourceKey: id<'TimeAccountLedgerSource'>(sourceKey),
    subjectEmployeeId: id<'Employee'>('employee-1'),
  });
}

function input(entries: readonly TimeAccountLedgerEntry[] = []): TimeAccountLedgerInput {
  return {
    entries,
    openingBalanceMinutes: minutes(600),
    organizationId: id<'Organization'>('organization-1'),
    subjectEmployeeId: id<'Employee'>('employee-1'),
  };
}

test('explains an opening balance and ordered daily, recalculation, and adjustment entries', () => {
  const totals = expectSuccess(
    calculateTimeAccountLedger(
      input([
        entry('entry-1', 'source-1', 40, 'DAILY_DELTA'),
        entry('entry-2', 'source-2', -10, 'DAILY_RECALCULATION_DELTA'),
        entry('entry-3', 'source-3', 13, 'POST_LOCK_ADJUSTMENT'),
        entry('entry-4', 'source-4', -5, 'MANUAL_ADMINISTRATIVE_ADJUSTMENT'),
      ]),
    ),
  );

  expect(totals).toEqual({
    closingBalanceMinutes: 638,
    entryExplanations: [
      expect.objectContaining({
        amountMinutes: 40,
        balanceAfterMinutes: 640,
        entryType: 'DAILY_DELTA',
        sourceKey: 'source-1',
      }),
      expect.objectContaining({
        amountMinutes: -10,
        balanceAfterMinutes: 630,
        entryType: 'DAILY_RECALCULATION_DELTA',
        sourceKey: 'source-2',
      }),
      expect.objectContaining({
        amountMinutes: 13,
        balanceAfterMinutes: 643,
        entryType: 'POST_LOCK_ADJUSTMENT',
        sourceKey: 'source-3',
      }),
      expect.objectContaining({
        amountMinutes: -5,
        balanceAfterMinutes: 638,
        entryType: 'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
        sourceKey: 'source-4',
      }),
    ],
    entryTotalMinutes: 38,
    openingBalanceMinutes: 600,
  });
  expect(Object.isFrozen(totals)).toBe(true);
  expect(Object.isFrozen(totals.entryExplanations)).toBe(true);
  expect(Object.isFrozen(totals.entryExplanations[0])).toBe(true);
});

test('keeps a zero-minute base daily posting as an explicit explained source', () => {
  const totals = expectSuccess(
    calculateTimeAccountLedger(input([entry('entry-0', 'source-0', 0)])),
  );

  expect(totals.closingBalanceMinutes).toBe(600);
  expect(totals.entryTotalMinutes).toBe(0);
  expect(totals.entryExplanations).toEqual([
    expect.objectContaining({
      amountMinutes: 0,
      balanceAfterMinutes: 600,
      entryType: 'DAILY_DELTA',
    }),
  ]);
});

test.each([
  [
    input([entry('entry-1', 'source-1', 40), entry('entry-1', 'source-2', -10)]),
    'TIME_ACCOUNT_LEDGER_DUPLICATE_ENTRY',
  ],
  [
    input([entry('entry-1', 'source-1', 40), entry('entry-2', 'source-1', -10)]),
    'TIME_ACCOUNT_LEDGER_DUPLICATE_SOURCE',
  ],
  [
    {
      ...input([
        Object.freeze({
          ...entry('entry-1', 'source-1', 40),
          subjectEmployeeId: id<'Employee'>('employee-2'),
        }),
      ]),
    },
    'TIME_ACCOUNT_LEDGER_SCOPE_MISMATCH',
  ],
] as const satisfies readonly [TimeAccountLedgerInput, TimeAccountLedgerError['code']][])(
  'returns a stable error for invalid ledger inputs',
  (ledgerInput, code) => {
    expectFailureCode(calculateTimeAccountLedger(ledgerInput), code);
  },
);

test('exports the current bounded entry-type contract as immutable values', () => {
  expect(timeAccountEntryTypes).toEqual([
    'OPENING_BALANCE',
    'DAILY_DELTA',
    'DAILY_RECALCULATION_DELTA',
    'POST_LOCK_ADJUSTMENT',
    'MANUAL_ADMINISTRATIVE_ADJUSTMENT',
  ]);
  expect(Object.isFrozen(timeAccountEntryTypes)).toBe(true);
});
