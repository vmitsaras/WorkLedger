import {
  createAbsenceTypeVersion,
  createLocalDateRange,
  mvpAbsenceTypePolicies,
  parseDomainId,
  parseLocalDate,
  resolveEffectiveAbsenceTypeVersion,
  type AbsenceTypeCode,
  type AbsenceTypePolicyInput,
  type DomainError,
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

function id(value: string) {
  return expectSuccess(parseDomainId<'AbsenceTypeVersion'>(value));
}

function date(value: string) {
  return expectSuccess(parseLocalDate(value));
}

function range(validFrom: string, validTo: string | null = null) {
  return expectSuccess(
    createLocalDateRange(date(validFrom), validTo === null ? null : date(validTo)),
  );
}

function policy(code: AbsenceTypeCode, overrides: Partial<AbsenceTypePolicyInput> = {}) {
  return { ...mvpAbsenceTypePolicies[code], ...overrides };
}

function version(
  code: AbsenceTypeCode,
  overrides: Partial<AbsenceTypePolicyInput> = {},
  effectiveRange = range('2026-01-01'),
) {
  return createAbsenceTypeVersion(
    id(`absence-${code.toLowerCase()}-${effectiveRange.validFrom}`),
    code,
    `${code} absence`,
    effectiveRange,
    true,
    policy(code, overrides),
  );
}

test('provides frozen MVP defaults for vacation, sickness, unpaid leave, and other absence', () => {
  expect(mvpAbsenceTypePolicies.VACATION).toMatchObject({
    entitlementAccountCategory: 'VACATION',
    pendingReservationBehavior: 'RESERVE_PENDING',
    requestNoteMode: 'OPTIONAL',
    timeTreatment: 'CREDIT_COVERED_EXPECTATION',
    workflow: 'APPROVAL_REQUIRED',
  });
  expect(mvpAbsenceTypePolicies.SICKNESS).toMatchObject({
    entitlementAccountCategory: null,
    maximumRetrospectiveCalendarDays: 7,
    pendingReservationBehavior: 'NONE',
    requestNoteMode: 'DISABLED',
    timeTreatment: 'CREDIT_COVERED_EXPECTATION',
    workflow: 'REPORT_AND_ACKNOWLEDGE',
  });
  expect(mvpAbsenceTypePolicies.UNPAID.timeTreatment).toBe('REDUCE_COVERED_EXPECTATION');
  expect(mvpAbsenceTypePolicies.OTHER.timeTreatment).toBe('NO_TIME_EFFECT');
  expect(Object.isFrozen(mvpAbsenceTypePolicies)).toBe(true);
  expect(Object.isFrozen(mvpAbsenceTypePolicies.VACATION.allowedCoverageUnits)).toBe(true);
});

test('creates a bounded effective-dated policy version and resolves adjacent versions by date', () => {
  const first = expectSuccess(version('VACATION', {}, range('2026-01-01', '2026-07-01')));
  const second = expectSuccess(version('VACATION', {}, range('2026-07-01')));

  expect(
    expectSuccess(
      resolveEffectiveAbsenceTypeVersion([second, first], 'VACATION', date('2026-06-30')),
    ).id,
  ).toBe(first.id);
  expect(
    expectSuccess(
      resolveEffectiveAbsenceTypeVersion([first, second], 'VACATION', date('2026-07-01')),
    ).id,
  ).toBe(second.id);
});

test('rejects invalid or overlapping effective policy configurations instead of picking by order', () => {
  const first = expectSuccess(version('UNPAID', {}, range('2026-01-01', '2026-07-01')));
  const overlap = expectSuccess(version('UNPAID', {}, range('2026-06-01')));

  expectFailureCode(
    resolveEffectiveAbsenceTypeVersion([first, overlap], 'UNPAID', date('2026-06-15')),
    'POLICY_CONFIGURATION_INVALID',
  );
  expectFailureCode(
    resolveEffectiveAbsenceTypeVersion([first], 'UNPAID', date('2027-01-01')),
    'POLICY_CONFIGURATION_INVALID',
  );
});

test('returns an inactive-policy error only when exactly one inactive version applies', () => {
  const inactive = expectSuccess(
    createAbsenceTypeVersion(
      id('absence-unpaid-inactive'),
      'UNPAID',
      'Unpaid leave',
      range('2026-01-01'),
      false,
      policy('UNPAID'),
    ),
  );

  expectFailureCode(
    resolveEffectiveAbsenceTypeVersion([inactive], 'UNPAID', date('2026-02-01')),
    'ABSENCE_POLICY_INACTIVE',
  );
});

test.each([
  ['empty coverage selection', 'OTHER', { allowedCoverageUnits: [] }],
  ['duplicate coverage selection', 'OTHER', { allowedCoverageUnits: ['FULL_DAY', 'FULL_DAY'] }],
  [
    'reservation without an entitlement account',
    'OTHER',
    { pendingReservationBehavior: 'RESERVE_PENDING' },
  ],
  [
    'entitlement on a report-and-acknowledge workflow',
    'OTHER',
    { entitlementAccountCategory: 'OTHER', workflow: 'REPORT_AND_ACKNOWLEDGE' },
  ],
  ['sickness note mode enabled', 'SICKNESS', { requestNoteMode: 'OPTIONAL' }],
  ['sickness entitlement account', 'SICKNESS', { entitlementAccountCategory: 'SICKNESS' }],
  ['out-of-range retrospective timing', 'SICKNESS', { maximumRetrospectiveCalendarDays: 366 }],
] as const)('rejects %s', (_description, code, overrides) => {
  expectFailureCode(version(code, overrides), 'POLICY_CONFIGURATION_INVALID');
});

test('accepts an entitlement-backed other policy only with approval-required workflow', () => {
  const entitlementBackedOther = version('OTHER', {
    entitlementAccountCategory: 'PERSONAL_LEAVE',
    pendingReservationBehavior: 'RESERVE_PENDING',
  });

  expectSuccess(entitlementBackedOther);
});
