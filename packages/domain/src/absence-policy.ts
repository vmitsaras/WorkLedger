import { type AbsenceTimeTreatment, absenceTimeTreatments } from './daily-absence-effects.js';
import { localDateRangeContains, type LocalDateRange } from './shared/date-range.js';
import { type DomainId } from './shared/identifiers.js';
import { failure, success, type DomainError, type Result } from './shared/result.js';
import { type LocalDate } from './shared/temporal.js';

export const absenceTypeCodes = ['VACATION', 'SICKNESS', 'UNPAID', 'OTHER'] as const;
export const absenceWorkflows = ['APPROVAL_REQUIRED', 'REPORT_AND_ACKNOWLEDGE'] as const;
export const absenceCoverageUnits = ['FULL_DAY', 'HALF_DAY', 'MINUTES'] as const;
export const absenceRequestNoteModes = ['DISABLED', 'OPTIONAL', 'REQUIRED'] as const;
export const pendingReservationBehaviors = ['NONE', 'RESERVE_PENDING'] as const;
export const absenceAvailabilityStates = ['UNAVAILABLE'] as const;

export type AbsenceTypeCode = (typeof absenceTypeCodes)[number];
export type AbsenceWorkflow = (typeof absenceWorkflows)[number];
export type AbsenceCoverageUnit = (typeof absenceCoverageUnits)[number];
export type AbsenceRequestNoteMode = (typeof absenceRequestNoteModes)[number];
export type PendingReservationBehavior = (typeof pendingReservationBehaviors)[number];
export type AbsenceAvailabilityState = (typeof absenceAvailabilityStates)[number];

export type AbsenceTypePolicy = Readonly<{
  allowedCoverageUnits: readonly AbsenceCoverageUnit[];
  availabilityState: AbsenceAvailabilityState;
  entitlementAccountCategory: string | null;
  maximumRetrospectiveCalendarDays: number | null;
  minimumLeadCalendarDays: number;
  pendingReservationBehavior: PendingReservationBehavior;
  requestNoteMode: AbsenceRequestNoteMode;
  timeTreatment: AbsenceTimeTreatment;
  workflow: AbsenceWorkflow;
}>;

export type AbsenceTypePolicyInput = Readonly<{
  allowedCoverageUnits: unknown;
  availabilityState: unknown;
  entitlementAccountCategory: unknown;
  maximumRetrospectiveCalendarDays: unknown;
  minimumLeadCalendarDays: unknown;
  pendingReservationBehavior: unknown;
  requestNoteMode: unknown;
  timeTreatment: unknown;
  workflow: unknown;
}>;

export type AbsenceTypeVersion = Readonly<{
  active: boolean;
  code: AbsenceTypeCode;
  effectiveRange: LocalDateRange;
  id: DomainId<'AbsenceTypeVersion'>;
  name: string;
  policy: AbsenceTypePolicy;
}>;

export type InvalidAbsenceTypePolicyError = DomainError<'POLICY_CONFIGURATION_INVALID'>;
export type AbsencePolicyInactiveError = DomainError<'ABSENCE_POLICY_INACTIVE'>;
export type AbsencePolicyResolutionError =
  InvalidAbsenceTypePolicyError | AbsencePolicyInactiveError;

const POLICY_CONFIGURATION_INVALID = Object.freeze({
  code: 'POLICY_CONFIGURATION_INVALID',
} as const);
const ABSENCE_POLICY_INACTIVE = Object.freeze({ code: 'ABSENCE_POLICY_INACTIVE' } as const);
const MAXIMUM_POLICY_TIMING_DAYS = 365;

export const mvpAbsenceTypePolicies: Readonly<Record<AbsenceTypeCode, AbsenceTypePolicy>> =
  Object.freeze({
    VACATION: Object.freeze({
      allowedCoverageUnits: Object.freeze(['FULL_DAY', 'HALF_DAY', 'MINUTES'] as const),
      availabilityState: 'UNAVAILABLE',
      entitlementAccountCategory: 'VACATION',
      maximumRetrospectiveCalendarDays: null,
      minimumLeadCalendarDays: 0,
      pendingReservationBehavior: 'RESERVE_PENDING',
      requestNoteMode: 'OPTIONAL',
      timeTreatment: 'CREDIT_COVERED_EXPECTATION',
      workflow: 'APPROVAL_REQUIRED',
    }),
    SICKNESS: Object.freeze({
      allowedCoverageUnits: Object.freeze(['FULL_DAY', 'HALF_DAY', 'MINUTES'] as const),
      availabilityState: 'UNAVAILABLE',
      entitlementAccountCategory: null,
      maximumRetrospectiveCalendarDays: 7,
      minimumLeadCalendarDays: 0,
      pendingReservationBehavior: 'NONE',
      requestNoteMode: 'DISABLED',
      timeTreatment: 'CREDIT_COVERED_EXPECTATION',
      workflow: 'REPORT_AND_ACKNOWLEDGE',
    }),
    UNPAID: Object.freeze({
      allowedCoverageUnits: Object.freeze(['FULL_DAY', 'HALF_DAY', 'MINUTES'] as const),
      availabilityState: 'UNAVAILABLE',
      entitlementAccountCategory: null,
      maximumRetrospectiveCalendarDays: null,
      minimumLeadCalendarDays: 0,
      pendingReservationBehavior: 'NONE',
      requestNoteMode: 'OPTIONAL',
      timeTreatment: 'REDUCE_COVERED_EXPECTATION',
      workflow: 'APPROVAL_REQUIRED',
    }),
    OTHER: Object.freeze({
      allowedCoverageUnits: Object.freeze(['FULL_DAY', 'HALF_DAY', 'MINUTES'] as const),
      availabilityState: 'UNAVAILABLE',
      entitlementAccountCategory: null,
      maximumRetrospectiveCalendarDays: null,
      minimumLeadCalendarDays: 0,
      pendingReservationBehavior: 'NONE',
      requestNoteMode: 'OPTIONAL',
      timeTreatment: 'NO_TIME_EFFECT',
      workflow: 'APPROVAL_REQUIRED',
    }),
  });

/**
 * Validates one bounded, effective-dated absence-type version. It intentionally does not create
 * requests, entitlement entries, absence effects, or a configurable workflow graph.
 */
export function createAbsenceTypeVersion(
  id: DomainId<'AbsenceTypeVersion'>,
  code: unknown,
  name: unknown,
  effectiveRange: LocalDateRange,
  active: unknown,
  policyInput: AbsenceTypePolicyInput,
): Result<AbsenceTypeVersion, InvalidAbsenceTypePolicyError> {
  if (!isMember(absenceTypeCodes, code) || !isValidName(name) || typeof active !== 'boolean') {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  const policy = parsePolicy(code, policyInput);
  if (policy === null) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  return success(
    Object.freeze({
      active,
      code,
      effectiveRange,
      id,
      name: name.trim(),
      policy,
    }),
  );
}

/** Resolves exactly one active version for a type and local date; gaps and overlaps are invalid. */
export function resolveEffectiveAbsenceTypeVersion(
  versions: readonly AbsenceTypeVersion[],
  code: AbsenceTypeCode,
  localDate: LocalDate,
): Result<AbsenceTypeVersion, AbsencePolicyResolutionError> {
  const matches = versions.filter(
    (version) => version.code === code && localDateRangeContains(version.effectiveRange, localDate),
  );

  if (matches.length !== 1) {
    return failure(POLICY_CONFIGURATION_INVALID);
  }

  const version = matches[0];
  if (version === undefined || !version.active) {
    return failure(ABSENCE_POLICY_INACTIVE);
  }

  return success(version);
}

function parsePolicy(
  code: AbsenceTypeCode,
  input: AbsenceTypePolicyInput,
): AbsenceTypePolicy | null {
  const allowedCoverageUnits = parseCoverageUnits(input.allowedCoverageUnits);
  if (
    allowedCoverageUnits === null ||
    !isMember(absenceWorkflows, input.workflow) ||
    !isMember(absenceRequestNoteModes, input.requestNoteMode) ||
    !isMember(pendingReservationBehaviors, input.pendingReservationBehavior) ||
    !isMember(absenceTimeTreatments, input.timeTreatment) ||
    !isMember(absenceAvailabilityStates, input.availabilityState) ||
    !isValidEntitlementAccountCategory(input.entitlementAccountCategory) ||
    !isValidMinimumLeadCalendarDays(input.minimumLeadCalendarDays) ||
    !isValidMaximumRetrospectiveCalendarDays(input.maximumRetrospectiveCalendarDays)
  ) {
    return null;
  }

  const entitlementAccountCategory = input.entitlementAccountCategory;
  const workflow = input.workflow;
  const pendingReservationBehavior = input.pendingReservationBehavior;
  const requestNoteMode = input.requestNoteMode;

  if (
    (entitlementAccountCategory !== null && workflow !== 'APPROVAL_REQUIRED') ||
    (pendingReservationBehavior === 'RESERVE_PENDING' &&
      (entitlementAccountCategory === null || workflow !== 'APPROVAL_REQUIRED')) ||
    (code === 'SICKNESS' &&
      (workflow !== 'REPORT_AND_ACKNOWLEDGE' ||
        requestNoteMode !== 'DISABLED' ||
        entitlementAccountCategory !== null ||
        pendingReservationBehavior !== 'NONE'))
  ) {
    return null;
  }

  return Object.freeze({
    allowedCoverageUnits,
    availabilityState: input.availabilityState,
    entitlementAccountCategory,
    maximumRetrospectiveCalendarDays: input.maximumRetrospectiveCalendarDays,
    minimumLeadCalendarDays: input.minimumLeadCalendarDays,
    pendingReservationBehavior,
    requestNoteMode,
    timeTreatment: input.timeTreatment,
    workflow,
  });
}

function parseCoverageUnits(value: unknown): readonly AbsenceCoverageUnit[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const units: AbsenceCoverageUnit[] = [];
  for (const item of value) {
    if (!isMember(absenceCoverageUnits, item) || units.includes(item)) {
      return null;
    }
    units.push(item);
  }

  return Object.freeze(units);
}

function isValidName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 160;
}

function isValidEntitlementAccountCategory(value: unknown): value is string | null {
  return (
    value === null || (typeof value === 'string' && value.trim().length >= 1 && value.length <= 64)
  );
}

function isValidMinimumLeadCalendarDays(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAXIMUM_POLICY_TIMING_DAYS
  );
}

function isValidMaximumRetrospectiveCalendarDays(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= MAXIMUM_POLICY_TIMING_DAYS)
  );
}

function isMember<const Value extends string>(
  values: readonly Value[],
  value: unknown,
): value is Value {
  return typeof value === 'string' && values.includes(value as Value);
}
