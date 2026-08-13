import {
  calculateLeaveEntitlementLedger,
  parseDomainId,
  parseInstant,
  parseLocalDate,
  parseSignedMinutes,
  type DomainError,
  type LeaveEntitlementEntryType,
  type Result,
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

function entry(
  entryType: LeaveEntitlementEntryType,
  minutes: number,
  sourceSuffix: string,
  overrides: Partial<Parameters<typeof calculateLeaveEntitlementLedger>[0]['entries'][number]> = {},
) {
  return {
    absenceTypeId: id<'AbsenceTypeVersion'>('absence-vacation-v1'),
    effectiveOn: expectSuccess(parseLocalDate('2026-02-03')),
    entryId: id<'LeaveEntitlementEntry'>(`leave-entry-${entryType}-${sourceSuffix}`),
    entryType,
    minutes: expectSuccess(parseSignedMinutes(minutes)),
    organizationId: id<'Organization'>('organization-northstar'),
    postedAt: expectSuccess(parseInstant('2026-02-03T12:00:00Z')),
    sourceId: id<'LeaveEntitlementSource'>(`leave-source-${sourceSuffix}`),
    subjectEmployeeId: id<'Employee'>('employee-emma'),
    ...overrides,
  };
}

function calculate(entries: readonly ReturnType<typeof entry>[]) {
  return calculateLeaveEntitlementLedger({
    absenceTypeId: id<'AbsenceTypeVersion'>('absence-vacation-v1'),
    entries,
    organizationId: id<'Organization'>('organization-northstar'),
    subjectEmployeeId: id<'Employee'>('employee-emma'),
  });
}

test('derives available, reserved, and projected balances from a reservation-to-approval sequence', () => {
  const totals = expectSuccess(
    calculate([
      entry('ALLOCATION', 4_800, 'allocation'),
      entry('PENDING_RESERVATION', -960, 'request-v1'),
      entry('RESERVATION_RELEASE', 960, 'request-v1'),
      entry('APPROVED_DEDUCTION', -960, 'request-v1'),
    ]),
  );

  expect(totals).toMatchObject({
    availableMinutes: 3_840,
    projectedRemainingMinutes: 3_840,
    reservedMinutes: 0,
  });
  expect(totals.entryExplanations[1]).toMatchObject({
    availableAfterMinutes: 4_800,
    projectedAfterMinutes: 3_840,
    reservedAfterMinutes: 960,
  });
});

test('keeps active reservations separate from availability and permits negative projected balance', () => {
  const totals = expectSuccess(
    calculate([entry('ALLOCATION', 240, 'allocation'), entry('PENDING_RESERVATION', -480, 'v1')]),
  );

  expect(totals).toMatchObject({
    availableMinutes: 240,
    projectedRemainingMinutes: -240,
    reservedMinutes: 480,
  });
});

test('applies cancellation restoration only to final availability', () => {
  const totals = expectSuccess(
    calculate([
      entry('ALLOCATION', 960, 'allocation'),
      entry('APPROVED_DEDUCTION', -960, 'approval'),
      entry('CANCELLATION_RESTORATION', 240, 'cancellation'),
    ]),
  );

  expect(totals).toMatchObject({
    availableMinutes: 240,
    projectedRemainingMinutes: 240,
    reservedMinutes: 0,
  });
});

test.each([
  ['PENDING_RESERVATION', 240],
  ['RESERVATION_RELEASE', -240],
  ['APPROVED_DEDUCTION', 240],
  ['CANCELLATION_RESTORATION', -240],
  ['MANUAL_ADJUSTMENT', 0],
] as const)('rejects an invalid %s sign', (entryType, minutes) => {
  expectFailureCode(
    calculate([entry(entryType, minutes, 'invalid')]),
    'LEAVE_ENTITLEMENT_LEDGER_ENTRY_INVALID',
  );
});

test('rejects duplicate entry IDs and duplicate source transitions', () => {
  const first = entry('ALLOCATION', 480, 'allocation');
  expectFailureCode(calculate([first, { ...first }]), 'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_ENTRY');
  expectFailureCode(
    calculate([
      entry('PENDING_RESERVATION', -480, 'request-v1'),
      entry('PENDING_RESERVATION', -480, 'request-v1', {
        entryId: id<'LeaveEntitlementEntry'>('leave-entry-distinct'),
      }),
    ]),
    'LEAVE_ENTITLEMENT_LEDGER_DUPLICATE_SOURCE',
  );
});

test('rejects an entry from another employee, organization, or entitlement account', () => {
  expectFailureCode(
    calculate([
      entry('ALLOCATION', 480, 'other-employee', {
        subjectEmployeeId: id<'Employee'>('employee-other'),
      }),
    ]),
    'LEAVE_ENTITLEMENT_LEDGER_SCOPE_MISMATCH',
  );
});
